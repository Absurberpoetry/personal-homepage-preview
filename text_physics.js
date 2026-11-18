/* Matter.js 0.20.0 的 DOM 适配器。物理坐标使用视口CSS像素，速度接口使用px/s。 */
(function () {
  const M = typeof module !== 'undefined' && module.exports ? require('./matter-0.20.0.min.js') : window.Matter;
  const { Engine, Bodies, Body, Composite, Sleeping, Query } = M;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const FIXED = 1000 / 120;
  function createWorld(width, height) {
    const engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
    engine.gravity.y = 1; engine.gravity.scale = 0.00128;
    const world = { engine, width, height, solids: [], walls: [] };
    setSolids(world, [], width, height);
    return world;
  }
  function setSolids(world, rectangles, width = world.width, height = world.height) {
    const visible = rectangles.filter(r => r.width > 0 && r.height > 0);
    const geometry = [width, height, ...visible.flatMap(r => [r.left, r.top, r.width, r.height])];
    // Preserve static body IDs and warm contact caches when geometry did not move.
    // Rebuilding walls woke resting text whenever unrelated UI particles changed.
    if (world.geometry?.length === geometry.length && geometry.every((value, index) => Math.abs(value - world.geometry[index]) < 0.05)) return false;
    world.geometry = geometry;
    const engine = world.engine;
    for (const body of [...world.solids, ...world.walls]) Composite.remove(engine.world, body);
    world.width = width; world.height = height;
    const options = { isStatic: true, friction: 0.65, restitution: 0.35, slop: 0.03 };
    world.walls = [
      Bodies.rectangle(width / 2, height + 128, width + 512, 256, options),
      Bodies.rectangle(width / 2, -128, width + 512, 256, options),
      Bodies.rectangle(-128, height / 2, 256, height + 512, options),
      Bodies.rectangle(width + 128, height / 2, 256, height + 512, options)
    ];
    world.solids = visible.map(r =>
      Bodies.rectangle(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, options));
    Composite.add(engine.world, [...world.walls, ...world.solids]);
    Composite.allBodies(engine.world).filter(b => !b.isStatic).forEach(b => Sleeping.set(b, false));
    return true;
  }
  function createBody(world, x, y, width, height) {
    const body = Bodies.rectangle(x, y, width, height, {
      restitution: 0.38, friction: 0.55, frictionStatic: 0.8, frictionAir: 0.006,
      density: 0.001, sleepThreshold: 45, slop: 0.03
    });
    Composite.add(world.engine.world, body);
    return body;
  }
  function createTextBody(world, rectangles) {
    const options = { restitution: 0.38, friction: 0.55, frictionStatic: 0.8, frictionAir: 0.006, density: 0.001, sleepThreshold: 45, slop: 0.03 };
    const parts = rectangles.map(r => Bodies.rectangle(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, options));
    const body = parts.length === 1 ? parts[0] : Body.create({ ...options, parts });
    Composite.add(world.engine.world, body);
    return body;
  }
  function releaseVelocity(samples, now) {
    const recent = samples.filter(p => now - p.time <= 100);
    if (recent.length < 2 || now - recent.at(-1).time > 65) return { vx: 0, vy: 0 };
    const first = recent[0], last = recent.at(-1), dt = (last.time - first.time) / 1000;
    if (dt < 0.012) return { vx: 0, vy: 0 };
    return { vx: clamp((last.x - first.x) / dt, -1800, 1800), vy: clamp((last.y - first.y) / dt, -1800, 1800) };
  }
  function throwBody(body, velocity, localGrab) {
    Body.setStatic(body, false);
    Sleeping.set(body, false);
    const c = Math.cos(body.angle), s = Math.sin(body.angle);
    const rx = c * localGrab.x - s * localGrab.y, ry = s * localGrab.x + c * localGrab.y;
    const spin = clamp((rx * velocity.vy - ry * velocity.vx) / Math.max(body.inertia / body.mass, 100) * 0.55, -7, 7);
    Body.setVelocity(body, { x: velocity.vx / 60, y: velocity.vy / 60 });
    Body.setAngularVelocity(body, spin / 60);
  }
  const partsOf = body => body.parts.length > 1 ? body.parts.slice(1) : [body];
  // Swept SAT computes the first contact over the whole translation, instead of
  // hundreds of 4px steps and repeated collision queries on every pointer event.
  function sweep(part, box, dx, dy) {
    let enter = -Infinity, exit = Infinity, normal = null;
    for (const axis of [...part.axes, ...box.axes]) {
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (const v of part.vertices) { const p = v.x * axis.x + v.y * axis.y; aMin = Math.min(aMin, p); aMax = Math.max(aMax, p); }
      for (const v of box.vertices) { const p = v.x * axis.x + v.y * axis.y; bMin = Math.min(bMin, p); bMax = Math.max(bMax, p); }
      const velocity = dx * axis.x + dy * axis.y;
      if (Math.abs(velocity) < 1e-8) { if (aMax <= bMin + 0.001 || bMax <= aMin + 0.001) return null; continue; }
      const near = (velocity > 0 ? bMin - aMax : bMax - aMin) / velocity;
      const far = (velocity > 0 ? bMax - aMin : bMin - aMax) / velocity;
      if (near > enter) { enter = near; normal = axis; }
      exit = Math.min(exit, far);
      if (enter > exit) return null;
    }
    return enter >= -0.00001 && enter <= 1 && exit >= 0 && normal ? { time: Math.max(0, enter), normal } : null;
  }
  function moveHeld(world, body, target) {
    let dx = target.x - body.position.x, dy = target.y - body.position.y;
    const others = Composite.allBodies(world.engine.world).filter(other => other !== body);
    const staticBodies = others.filter(b => b.isStatic);
    const parts = partsOf(body);
    // Resolve an initial overlap (e.g. a component moved under an existing word).
    for (let pass = 0; pass < 3; pass++) {
      for (const part of parts) for (const collision of Query.collides(part, staticBodies)) {
        const sign = collision.parentA === body ? 1 : -1;
        Body.translate(body, { x: collision.penetration.x * sign, y: collision.penetration.y * sign });
      }
    }
    dx = target.x - body.position.x; dy = target.y - body.position.y;
    for (let pass = 0; pass < 3 && Math.abs(dx) + Math.abs(dy) > 0.001; pass++) {
      let hit = null;
      for (const part of parts) for (const box of staticBodies) {
        const candidate = sweep(part, box, dx, dy);
        if (candidate && (!hit || candidate.time < hit.time)) hit = candidate;
      }
      if (!hit) { Body.translate(body, { x: dx, y: dy }); break; }
      const t = Math.max(0, hit.time - 0.00001);
      Body.translate(body, { x: dx * t, y: dy * t });
      dx *= 1 - t; dy *= 1 - t;
      const dot = dx * hit.normal.x + dy * hit.normal.y;
      dx -= dot * hit.normal.x; dy -= dot * hit.normal.y;
    }
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
    // Sleeping neighbours must wake when a held word touches them.
    for (const part of parts) Query.collides(part, others.filter(b => !b.isStatic)).forEach(c => {
      Sleeping.set(c.parentA === body ? c.parentB : c.parentA, false);
    });
  }
  function update(world, dt = FIXED) {
    Engine.update(world.engine, dt);
    // Thin, short words can otherwise pick up >30rad/s from a corner strike,
    // appearing to skip frames even when rendering is fast. Dissipate that excess.
    for (const b of Composite.allBodies(world.engine.world)) {
      if (!b.isStatic && !b.isSleeping && Math.abs(b.angularVelocity) > 0.15) Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.15);
      if (b.isStatic) continue;
      // Dense piles can enter sleep with a few pixels of unresolved penetration.
      // Enforce the viewport on actual vertices, not velocity-expanded AABBs.
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (const v of b.vertices) { left = Math.min(left, v.x); right = Math.max(right, v.x); top = Math.min(top, v.y); bottom = Math.max(bottom, v.y); }
      const dx = left < 0 ? -left : right > world.width ? world.width - right : 0;
      const dy = top < 0 ? -top : bottom > world.height ? world.height - bottom : 0;
      if (Math.abs(dx) + Math.abs(dy) > 0.05) {
        Body.translate(b, { x: dx, y: dy });
        if (!b.isSleeping) Body.setVelocity(b, {
          x: dx && b.velocity.x * dx < 0 ? -b.velocity.x * 0.38 : b.velocity.x,
          y: dy && b.velocity.y * dy < 0 ? -b.velocity.y * 0.38 : b.velocity.y
        });
      }
    }
  }
  const api = { createWorld, setSolids, createBody, createTextBody, throwBody, releaseVelocity, moveHeld, update, FIXED };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.TextPhysicsCore = api;
})();
