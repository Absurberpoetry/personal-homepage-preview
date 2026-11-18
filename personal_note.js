document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('noteDisplay'), form = document.getElementById('noteForm');
  const input = document.getElementById('noteBodyInput'), label = document.getElementById('noteInputLabel');
  const status = document.getElementById('noteStatus'), key = 'portfolio-note-stream-v2';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let entries = [], order = [], pending = [], offset = 0, mode = 'add', wheelDelta = 0, lastWheel = 0;
  let active = null, typeFrame = 0, typePaused = false;
  const extracted = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved)) entries = saved.filter(value => typeof value === 'string' && value.trim());
    else {
      const old = JSON.parse(localStorage.getItem('portfolio-personal-note-v1'));
      if (old) entries = [old.title, ...(old.body || '').split(/\r?\n/)].filter(value => typeof value === 'string' && value.trim());
    }
  } catch (_) { /* 存储不可用时仍支持本次编辑。 */ }
  pending = entries.map((_, index) => index);
  const available = () => order.filter(index => !extracted.has(index));
  function updateRow(row, index) {
    const typing = active?.index === index;
    const text = typing ? active.characters.slice(0, active.count).join('') : entries[index];
    row.textContent = text; row.dataset.text = text;
    if (typing) {
      row.dataset.typing = 'true';
      const caret = document.createElement('span'); caret.className = 'note-typing-caret'; caret.setAttribute('aria-hidden', 'true');
      row.appendChild(caret);
    } else delete row.dataset.typing;
  }
  function render(animate = true) {
    const list = available();
    offset = Math.max(0, Math.min(offset, Math.max(0, list.length - 2)));
    const existing = new Map([...display.querySelectorAll('.note-stream-row')].map(row => [Number(row.dataset.index), {
      row, rect: row.getBoundingClientRect(), size: parseFloat(getComputedStyle(row).fontSize)
    }]));
    if (!list.length) {
      const empty = document.createElement('p'); empty.className = 'note-empty';
      empty.textContent = entries.length ? (pending.length ? '下一句话，正要落在这里。' : '') : '添加一些句子，跟着键盘慢慢出现。';
      display.replaceChildren(empty); return;
    }
    const fragment = document.createDocumentFragment(), height = display.clientHeight || 720;
    list.slice(offset, offset + Math.ceil(height / 20)).forEach((index, position) => {
      const row = existing.get(index)?.row || document.createElement('p');
      row.className = `note-stream-row note-position-${position}`; row.dataset.index = index;
      row.style.marginLeft = '0px';
      if (position >= 3) row.style.fontSize = `${(20 + 19 * Math.exp(-0.2 * (position - 3))).toFixed(2)}px`;
      else row.style.removeProperty('font-size');
      updateRow(row, index); fragment.appendChild(row);
    });
    display.replaceChildren(fragment);
    let used = 4, full = false;
    for (const row of [...display.children]) {
      if (full || (used + row.offsetHeight > height - 14 && used > 4)) { full = true; row.remove(); }
      else used += row.offsetHeight + 3;
    }
    const rows = [...display.children], turn = Math.max(1, Math.round((rows.length - 1) * 0.6));
    let indent = 0;
    rows.forEach((row, position) => {
      if (position) indent += (position <= turn ? 1 : -1) * (innerWidth <= 600 ? 12 : 20) / (1 + position * 0.35);
      row.style.marginLeft = `${Math.max(0, indent).toFixed(2)}px`;
    });
    if (animate && !reducedMotion.matches) for (const row of rows) {
      const old = existing.get(Number(row.dataset.index));
      row.getAnimations().forEach(animation => animation.cancel());
      const rect = row.getBoundingClientRect(), size = parseFloat(getComputedStyle(row).fontSize);
      row.animate(old ? [
        { transform: `translate(${old.rect.left - rect.left}px,${old.rect.top - rect.top}px) scale(${old.size / size})` },
        { transform: 'translate(0,0) scale(1)' }
      ] : [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }
  function finishTyping() {
    cancelAnimationFrame(typeFrame); typeFrame = 0;
    if (!active) return;
    active = null; render(false);
  }
  function type(now) {
    typeFrame = 0;
    if (!active || typePaused) return;
    active.elapsed += Math.max(0, now - active.lastTime); active.lastTime = now;
    const progress = Math.min(1, active.elapsed / active.duration);
    const target = progress * active.weight;
    let count = active.count;
    while (count < active.marks.length && active.marks[count] <= target) count++;
    if (count !== active.count) {
      active.count = count;
      const row = display.querySelector(`[data-index="${active.index}"]`);
      if (row) {
        const prefix = active.characters.slice(0, count).join('');
        if (row.firstChild?.nodeType === Node.TEXT_NODE) row.firstChild.nodeValue = prefix;
        else row.insertBefore(document.createTextNode(prefix), row.firstChild);
        row.dataset.text = prefix;
      }
    }
    if (progress >= 1) finishTyping();
    else typeFrame = requestAnimationFrame(type);
  }
  function beginTyping() {
    if (!entries.length || !form.hidden) return null;
    finishTyping();
    // 开始输入即消耗该条记录；拖出、删除浮动文字或继续敲键盘都不会重新入队。
    if (!pending.length) return null;
    const index = pending.shift();
    const anchor = offset > 0 ? available()[offset] : null;
    order = [index, ...order.filter(value => value !== index)];
    if (anchor != null) offset = Math.max(0, available().indexOf(anchor));
    const characters = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(entries[index])].map(s => s.segment) : Array.from(entries[index]);
    let weight = 0;
    const marks = characters.map(c => { weight += /[，。！？；,.!?;…]/.test(c) ? 2.5 : /\s/.test(c) ? 0.6 : 1; return weight; });
    const duration = Math.max(1600, Math.min(14000, weight * 58 + 180));
    active = { index, characters, count: 0, marks, weight, duration, elapsed: 0, lastTime: performance.now() };
    render();
    if (!typePaused) typeFrame = requestAnimationFrame(type);
    return { duration };
  }
  window.NoteStream = {
    beginTyping, finishTyping,
    cancelTyping() { finishTyping(); },
    pause() { typePaused = true; cancelAnimationFrame(typeFrame); typeFrame = 0; },
    resume() { typePaused = false; if (active && !typeFrame) { active.lastTime = performance.now(); typeFrame = requestAnimationFrame(type); } },
    inspect: () => ({ entries: entries.length, shown: available().length, remaining: pending.length, typing: active ? { index: active.index, count: active.count, total: active.characters.length, duration: active.duration } : null })
  };
  function move(step) { offset += step; render(); }
  display.addEventListener('click', event => {
    const row = event.target.closest('.note-stream-row');
    if (!row || row.dataset.typing) return;
    offset = Math.max(0, available().indexOf(Number(row.dataset.index)) - 1); render();
  });
  display.addEventListener('wheel', event => {
    if (!order.length || event.ctrlKey) return;
    event.preventDefault();
    const now = performance.now(); if (now - lastWheel > 200) wheelDelta = 0; lastWheel = now;
    wheelDelta += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
    if (Math.abs(wheelDelta) >= 45) { move(Math.sign(wheelDelta)); wheelDelta = 0; }
  }, { passive: false });
  display.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') offset = 0; else if (event.key === 'End') offset = order.length;
    else offset += event.key === 'ArrowDown' ? 1 : -1;
    render();
  });
  let touchY;
  display.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  display.addEventListener('touchend', e => { const d = touchY - e.changedTouches[0].clientY; if (Math.abs(d) > 25) move(Math.sign(d)); });
  display.addEventListener('note-drag-out', event => {
    const index = Number(event.detail?.index);
    if (!Number.isInteger(index) || index < 0 || index >= entries.length || active?.index === index) return;
    extracted.add(index); render();
  });
  function open(next) {
    mode = next; window.DeskTyping?.pause('editor');
    input.value = next === 'edit' ? entries.join('\n') : '';
    label.textContent = next === 'edit' ? '编辑句库（每行一句，按此顺序逐条输入）' : '添加句子（每行一句，将在下一轮敲击中逐条输入）';
    form.hidden = false; display.hidden = true; status.textContent = ''; input.focus();
  }
  function close() { form.hidden = true; display.hidden = false; render(); window.DeskTyping?.resume('editor'); }
  window.addEventListener('resize', () => { if (!display.hidden) render(); });
  document.getElementById('addNote').addEventListener('click', () => open('add'));
  document.getElementById('editNote').addEventListener('click', () => open('edit'));
  document.getElementById('cancelNote').addEventListener('click', close);
  form.addEventListener('submit', event => {
    event.preventDefault(); finishTyping();
    const lines = input.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (mode === 'edit') {
      entries = lines;
      display.dispatchEvent(new Event('note-physics-reset'));
      extracted.clear(); order = []; pending = entries.map((_, index) => index); offset = 0;
    } else {
      entries = [...lines, ...entries];
      // 新句子优先输入，旧记录保留已显示/已拖出的状态，只移动内部索引。
      order = order.map(index => index + lines.length);
      pending = [...lines.map((_, index) => index), ...pending.map(index => index + lines.length)];
      const moved = [...extracted].map(index => index + lines.length);
      extracted.clear(); moved.forEach(index => extracted.add(index));
    }
    try { localStorage.setItem(key, JSON.stringify(entries)); status.textContent = '句库已保存 · 下一轮开始输入'; }
    catch (_) { status.textContent = '浏览器未能保存，请复制句库备份。'; }
    window.DeskTyping?.restart(); close();
  });
  render(false);
});
