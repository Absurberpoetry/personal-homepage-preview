/* 单一 RAF 同步 Matter 固定步与 Pixi 绘制，DOM 仅保留记录编辑及读屏内容。 */
document.addEventListener('DOMContentLoaded', () => {
  const stream = document.getElementById('noteDisplay');
  if (!stream) return;
  const C = window.TextPhysicsCore;
  const { Body, Composite, Sleeping } = window.Matter;
  const host = document.createElement('div'); host.className = 'text-physics-layer';
  const accessibility = document.createElement('ul'); accessibility.className = 'text-physics-accessibility';
  accessibility.setAttribute('aria-label', '拖出的文字');
  document.body.append(host, accessibility);
  let renderer;
  try { renderer = window.createPhysicsTextRenderer(host); }
  catch (error) {
    host.remove(); accessibility.remove();
    document.getElementById('noteStatus').textContent = '文字拖拽需要浏览器启用 WebGL。';
    window.PageBoot?.register('文字画布', Promise.reject(error));
    console.error(error); return;
  }
  const canvas = renderer.canvas;
  window.PageBoot?.register('文字画布', Promise.resolve().then(() => { renderer.warmup(); }));
  canvas.dataset.renderer = renderer.type;
  const viewport = () => ({ width: document.documentElement.clientWidth, height: window.innerHeight });
  const world = C.createWorld(viewport().width, viewport().height);
  const items = [];
  let drag = null, hover = null, selected = null, raf = 0, lastTime = 0, accumulator = 0;
  let dirty = true, redraw = true, suppressUntil = 0, observed = new Set(), pointer = null;
  const stats = { frames: 0, rasterizations: 0, lastPhysicsMs: 0, lastRenderMs: 0, discardedTimeMs: 0 };
  const invalidate = () => { dirty = true; redraw = true; wake(); };
  const ro = new ResizeObserver(invalidate), solidStyles = new MutationObserver(invalidate);
  function readLayout() {
    if (!dirty) return;
    dirty = false;
    const elements = [...document.querySelectorAll('[data-physics-solid]')];
    const targets = new Set();
    for (const el of elements) {
      targets.add(el);
      if (el.parentElement) targets.add(el.parentElement);
      if (el.parentElement?.parentElement) targets.add(el.parentElement.parentElement);
    }
    for (const el of observed) if (!targets.has(el)) ro.unobserve(el);
    for (const el of targets) if (!observed.has(el)) ro.observe(el);
    observed = targets; solidStyles.disconnect();
    const rectangles = [];
    for (const el of elements) {
      solidStyles.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
      if (el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden') rectangles.push(el.getBoundingClientRect());
    }
    const { width, height } = viewport();
    if (width !== world.width || height !== world.height) {
      renderer.resize(width, height);
      // A new floor must not appear through/beyond an old sleeping body. Move
      // existing shapes inside first, before rebuilding the boundary colliders.
      for (const item of items) {
        const b = item.body;
        Body.setPosition(b, { x: b.position.x * width / world.width, y: b.position.y * height / world.height });
        const dx = b.bounds.min.x < 0 ? -b.bounds.min.x : Math.min(0, width - b.bounds.max.x);
        const dy = b.bounds.min.y < 0 ? -b.bounds.min.y : Math.min(0, height - b.bounds.max.y);
        Body.translate(b, { x: dx, y: dy });
        Object.assign(item.previous, { x: b.position.x, y: b.position.y, angle: b.angle });
      }
    }
    C.setSolids(world, rectangles, width, height);
  }
  function paint(item, x = item.body.position.x, y = item.body.position.y, angle = item.body.angle) {
    if (x === item.draw.x && y === item.draw.y && angle === item.draw.angle) return;
    item.draw.x = x; item.draw.y = y; item.draw.angle = angle;
    renderer.paint(item.view, x, y, angle); redraw = true;
  }
  function localPoint(item, x, y) {
    const p = item.draw, c = Math.cos(p.angle), s = Math.sin(p.angle);
    const dx = x - p.x, dy = y - p.y;
    return { x: c * dx + s * dy, y: -s * dx + c * dy };
  }
  function hitTest(x, y) {
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i], point = localPoint(item, x, y);
      if (item.lines.some(r => point.x >= r.x && point.x <= r.x + r.width && point.y >= r.y && point.y <= r.y + r.height)) return item;
    }
    return null;
  }
  function setHover(item) {
    if (hover === item) return;
    hover = item;
    updateCursor();
    wake();
  }
  function updateCursor() {
    const events = drag?.active || hover ? 'auto' : 'none';
    const cursor = drag?.active ? 'grabbing' : 'grab';
    if (canvas.style.pointerEvents !== events) canvas.style.pointerEvents = events;
    if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
  }
  function create(row) {
    const index = Number(row.dataset.index);
    const data = renderer.capture(row);
    const body = C.createTextBody(world, data.rectangles);
    const cx = body.position.x - data.left, cy = body.position.y - data.top;
    const label = document.createElement('li'); label.textContent = data.text;
    accessibility.appendChild(label);
    const item = { body, text: data.text, fontSize: data.font.size, width: data.width, height: data.height,
      sourceW: data.sourceW, sourceH: data.sourceH, sourceCX: body.position.x - data.sourceLeft, sourceCY: body.position.y - data.sourceTop,
      cx, cy, label, view: renderer.add(data, cx, cy),
      lines: data.rectangles.map(r => ({ x: r.left - body.position.x, y: r.top - body.position.y, width: r.width, height: r.height })),
      previous: { x: body.position.x, y: body.position.y, angle: 0 }, draw: { x: NaN, y: NaN, angle: NaN } };
    items.push(item); stats.rasterizations++;
    row.remove();
    stream.dispatchEvent(new CustomEvent('note-drag-out', { detail: { index } }));
    paint(item); return item;
  }
  function targetFromGrab() {
    const body = drag.item.body, c = Math.cos(body.angle), s = Math.sin(body.angle);
    return { x: drag.x - (c * drag.grab.x - s * drag.grab.y), y: drag.y - (s * drag.grab.x + c * drag.grab.y) };
  }
  function frame(now) {
    raf = 0; readLayout();
    const elapsed = Math.max(0, now - lastTime);
    lastTime = now;
    if (drag?.item) C.moveHeld(world, drag.item.body, targetFromGrab());
    const running = items.some(item => !item.body.isStatic && !item.body.isSleeping);
    accumulator = running ? accumulator + Math.min(elapsed, 50) : 0;
    if (elapsed > 50 && running) stats.discardedTimeMs += elapsed - 50;
    const physicsStart = performance.now();
    while (accumulator >= C.FIXED) {
      let fast = false;
      for (const item of items) {
        const b = item.body, p = item.previous;
        p.x = b.position.x; p.y = b.position.y; p.angle = b.angle;
        if (!b.isSleeping && !b.isStatic && b.speed > 18) fast = true;
      }
      if (fast) { C.update(world, C.FIXED / 2); C.update(world, C.FIXED / 2); }
      else C.update(world);
      accumulator -= C.FIXED;
    }
    stats.lastPhysicsMs = performance.now() - physicsStart;
    const alpha = Math.min(1, accumulator / C.FIXED);
    if (!drag && pointer) {
      hover = hitTest(pointer.x, pointer.y);
      updateCursor();
    }
    let animating = false;
    for (const item of items) {
      const b = item.body, p = item.previous;
      if (drag?.item === item || b.isSleeping) paint(item);
      else paint(item, p.x + (b.position.x - p.x) * alpha, p.y + (b.position.y - p.y) * alpha, p.angle + (b.angle - p.angle) * alpha);
      const before = item.view.alpha;
      animating = renderer.highlight(item.view, hover === item || drag?.item === item ? 0.45 : 0, Math.min(elapsed, 50)) || animating;
      if (before !== item.view.alpha) redraw = true;
    }
    if (redraw) {
      const t = performance.now(); renderer.render(); stats.lastRenderMs = performance.now() - t;
      stats.frames++; redraw = false;
    }
    if (!document.hidden && (drag?.active || animating || items.some(item => !item.body.isStatic && !item.body.isSleeping))) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!raf && !document.hidden) { lastTime = performance.now(); accumulator = 0; raf = requestAnimationFrame(frame); }
  }
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    pointer = event.pointerType === 'touch' ? null : { x: event.clientX, y: event.clientY };
    const item = hitTest(event.clientX, event.clientY);
    const row = event.target.closest('.note-stream-row');
    if (!item && row?.dataset.typing) return;
    if (!row && !item) return;
    readLayout();
    const rect = row?.getBoundingClientRect();
    drag = { pointer: event.pointerId, row, item, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY,
      active: !!item, ratioX: rect ? (event.clientX - rect.left) / rect.width : 0,
      ratioY: rect ? (event.clientY - rect.top) / rect.height : 0,
      samples: [{ x: event.clientX, y: event.clientY, time: performance.now() }] };
    if (item) {
      event.preventDefault(); event.stopImmediatePropagation();
      drag.grab = localPoint(item, drag.x, drag.y);
      // Start from the visible interpolated pose so re-grabbing never jumps ahead.
      Body.setPosition(item.body, { x: item.draw.x, y: item.draw.y }); Body.setAngle(item.body, item.draw.angle);
      Body.setStatic(item.body, true); selected = item;
      canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
      updateCursor(); wake();
    } else stream.setPointerCapture(event.pointerId);
  }, true);
  document.addEventListener('pointermove', event => {
    pointer = event.pointerType === 'touch' ? null : { x: event.clientX, y: event.clientY };
    if (!drag) { setHover(hitTest(event.clientX, event.clientY)); return; }
    if (event.pointerId !== drag.pointer) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 7) return;
    event.preventDefault();
    if (!drag.item) {
      drag.item = create(drag.row);
      drag.grab = { x: drag.ratioX * drag.item.sourceW - drag.item.sourceCX, y: drag.ratioY * drag.item.sourceH - drag.item.sourceCY };
      drag.active = true; selected = drag.item;
      Body.setStatic(drag.item.body, true);
      updateCursor();
      canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
    }
    const now = performance.now(); suppressUntil = now + 400;
    const coalesced = event.getCoalescedEvents?.();
    for (const point of coalesced?.length ? coalesced : [event]) {
      drag.samples.push({ x: point.clientX, y: point.clientY, time: now - Math.max(0, event.timeStamp - point.timeStamp) });
    }
    drag.samples = drag.samples.filter(p => now - p.time < 120);
    C.moveHeld(world, drag.item.body, targetFromGrab()); paint(drag.item);
    wake();
  }, { capture: true, passive: false });
  function release(event, cancel = false) {
    if (!drag || (event && event.pointerId !== drag.pointer)) return;
    const held = drag;
    if (held.item) {
      readLayout(); C.moveHeld(world, held.item.body, targetFromGrab());
      C.throwBody(held.item.body, cancel ? { vx: 0, vy: 0 } : C.releaseVelocity(held.samples, performance.now()), held.grab);
      Object.assign(held.item.previous, { x: held.item.body.position.x, y: held.item.body.position.y, angle: held.item.body.angle });
      suppressUntil = performance.now() + 400;
    }
    drag = null;
    for (const el of [stream, canvas]) if (el.hasPointerCapture(held.pointer)) el.releasePointerCapture(held.pointer);
    updateCursor();
    wake();
  }
  document.addEventListener('pointerup', event => release(event), true);
  document.addEventListener('pointercancel', event => release(event, true), true);
  canvas.addEventListener('lostpointercapture', event => release(event, true));
  stream.addEventListener('click', event => { if (performance.now() < suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  stream.addEventListener('touchend', event => { if (performance.now() < suppressUntil) event.stopImmediatePropagation(); }, true);
  function remove(item) {
    if (!item) return;
    if (drag?.item === item) release(null, true);
    Composite.remove(world.engine.world, item.body); items.splice(items.indexOf(item), 1);
    item.label.remove(); renderer.remove(item.view);
    if (hover === item) setHover(null);
    if (selected === item) selected = null;
    items.forEach(item => Sleeping.set(item.body, false)); redraw = true; wake();
  }
  document.addEventListener('dblclick', event => {
    const item = hitTest(event.clientX, event.clientY);
    if (item) { event.preventDefault(); event.stopImmediatePropagation(); remove(item); }
  }, true);
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(selected || hover); }
  });
  stream.addEventListener('note-physics-reset', () => { release(null, true); [...items].forEach(remove); });
  window.addEventListener('resize', invalidate);
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('screen-layout-change', invalidate);
  window.addEventListener('blur', () => release(null, true));
  window.addEventListener('pagehide', () => release(null, true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(null, true); else invalidate(); });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); release(null, true); });
  canvas.addEventListener('webglcontextrestored', () => { redraw = true; wake(); });
  new MutationObserver(records => {
    const solid = node => node.nodeType === 1 && (node.matches('[data-physics-solid]') || node.querySelector('[data-physics-solid]'));
    if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(solid))) invalidate();
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-physics-solid'] });
  // Read-only diagnostics for browser checks; no source notes or storage are mutated.
  window.TextPhysics = { inspect: () => ({ renderer: renderer.type, driver: renderer.driver, stats: { ...stats }, dragging: !!drag?.active,
    items: items.map(item => ({ text: item.text, fontSize: item.fontSize, width: item.width, height: item.height,
      x: item.body.position.x, y: item.body.position.y, angle: item.body.angle, sleeping: item.body.isSleeping,
      cx: item.cx, cy: item.cy, draw: { ...item.draw }, lines: item.lines.map(r => ({ ...r })), highlight: item.view.alpha,
      bounds: {
        min: { x: Math.min(...item.body.vertices.map(v => v.x)), y: Math.min(...item.body.vertices.map(v => v.y)) },
        max: { x: Math.max(...item.body.vertices.map(v => v.x)), y: Math.max(...item.body.vertices.map(v => v.y)) }
      } })) }) };
  readLayout(); wake();
  (window.PageBoot?.ready || Promise.resolve()).then(invalidate);
});
