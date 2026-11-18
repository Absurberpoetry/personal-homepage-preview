// 极简 Canvas 背景动效演示器（支持全屏自适应，预留给未来挂载丰富粒子/动画/SVG/WebGL 动效）
class StageCanvas {
  constructor(canvasId, type = "dots") {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.type = type;
    this.points = [];
    this.mouse = { x: -1000, y: -1000 };

    this.resize();
    this.initPoints();
    this.bindEvents();
    this.loop();
  }

  resize() {
    this.width = this.canvas.parentElement.clientWidth;
    this.height = this.canvas.parentElement.clientHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  initPoints() {
    this.points = [];
    const count = Math.floor((this.width * this.height) / 25000);
    for (let i = 0; i < count; i++) {
      this.points.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
      });
    }
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.resize();
      this.initPoints();
    });

    window.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
  }

  loop() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 渲染轻量灵动的交互式网点，示意未来全屏动效的无限可能性
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > this.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.height) p.vy *= -1;

      // 与鼠标位置轻微互动
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = dist < 120 ? "rgba(99, 102, 241, 0.45)" : "rgba(203, 213, 225, 0.5)";
      this.ctx.fill();

      // 相邻点连线
      for (let j = i + 1; j < this.points.length; j++) {
        const p2 = this.points[j];
        const d = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (d < 90) {
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(226, 232, 240, ${1 - d / 90})`;
          this.ctx.lineWidth = 0.8;
          this.ctx.stroke();
        }
      }
    }

    requestAnimationFrame(() => this.loop());
  }
}

function initHeroAtmosphere() {
  const canvas = document.getElementById("hero-canvas");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0, height = 0, dpr = 1, raf = 0, last = 0;
  const motes = Array.from({ length: 34 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.9 + Math.random() * 1.4,
    vx: (Math.random() - 0.5) * 0.008,
    vy: -0.004 - Math.random() * 0.01,
    alpha: 0.08 + Math.random() * 0.22,
    phase: Math.random() * Math.PI * 2,
    cool: i % 3 !== 0
  }));

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    width = parent.clientWidth || window.innerWidth;
    height = parent.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    raf = 0;
    if (!width || !height) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    ctx.clearRect(0, 0, width, height);

    for (const m of motes) {
      if (!reducedMotion.matches) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -0.03) { m.y = 1.03; m.x = Math.random(); }
        if (m.x < -0.03) m.x = 1.03;
        else if (m.x > 1.03) m.x = -0.03;
      }
      const pulse = 0.65 + 0.35 * Math.sin(now * 0.0008 + m.phase);
      ctx.fillStyle = m.cool
        ? `rgba(162, 218, 245, ${(m.alpha * pulse).toFixed(3)})`
        : `rgba(218, 224, 236, ${(m.alpha * 0.8 * pulse).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(m.x * width, m.y * height, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!document.hidden && !reducedMotion.matches) {
      raf = requestAnimationFrame(draw);
    }
  }

  function sync() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (!document.hidden) raf = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", () => { resize(); if (reducedMotion.matches) draw(performance.now()); });
  document.addEventListener("visibilitychange", sync);
  reducedMotion.addEventListener("change", sync);
  sync();
}

document.addEventListener("DOMContentLoaded", () => {
  // 首屏深夜微尘粒子氛围（轻量独立于 SVG 子树）
  initHeroAtmosphere();

  // 详情弹窗逻辑
  const modal = document.getElementById("detail-modal");
  const modalClose = document.getElementById("modal-close");
  const modalTitle = document.getElementById("modal-title");
  const modalDesc = document.getElementById("modal-desc");
  const expandButtons = document.querySelectorAll(".btn-fullscreen-expand");

  expandButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".topic-stage");
      const customTitle = btn.dataset.modalTitle;
      const customDesc = btn.dataset.modalDesc;
      const title = section ? section.querySelector(".topic-title")?.textContent : "专栏详情";
      modalTitle.textContent = customTitle || `${title} - 深度长文展开`;
      modalDesc.textContent = customDesc || "此处为点击展开后的全屏专属详情层。后续可无拘无束地放入长篇专栏、完整设定、画廊或视频/3D 交互。";
      modal.classList.remove("hidden");
    });
  });

  const closeModal = () => modal.classList.add("hidden");
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  // 自设角色猫咪的 JS 交互逻辑控制器（眨眼、视差倾斜、眼神追踪、点击互动）
  initCatInteractiveAvatar();
  // 洞洞板矩形屏幕内容接口（支持视频、GIF/图片壁纸、自定义 Canvas/DOM）
  initPegboardScreen();
  initScreenFlyouts();
  // TOPIC 01 Fate1 线条原画随鼠标滚轮推进展开动画
  initTopicLineartScroll();
});

function initScreenFlyouts() {
  const stage = document.getElementById("characterStage");
  const layer = document.getElementById("screenFlyouts");
  if (!stage || !layer) return;

  const symbols = ["01", "&lt;/&gt;", "♪", "♫", "{}", "<>"].map(value => {
    const template = document.createElement("template");
    template.innerHTML = value;
    return template.content.textContent || value;
  });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let timer = null;

  function spawn() {
    if (document.hidden || reducedMotion.matches) return;
    const screens = [
      stage.querySelector(".office-straight-monitor"),
      stage.querySelector(".secondary-monitor")
    ].filter(Boolean);
    if (!screens.length) return;

    const screen = screens[Math.floor(Math.random() * screens.length)];
    const stageRect = stage.getBoundingClientRect();
    const screenRect = screen.getBoundingClientRect();
    const scale = stageRect.width / stage.offsetWidth || 1;
    // 从屏幕内容区域的中间附近飞出，而不是从屏幕边缘冒出。
    const x = (screenRect.left - stageRect.left) / scale + screenRect.width / scale * (0.38 + Math.random() * 0.24);
    const y = (screenRect.top - stageRect.top) / scale + screenRect.height / scale * (0.42 + Math.random() * 0.16);
    const fly = document.createElement("span");
    fly.className = "screen-flyout";
    fly.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    fly.style.left = `${x}px`;
    fly.style.top = `${y}px`;
    fly.style.setProperty("--fly-x", `${(Math.random() - 0.5) * 32}px`);
    fly.style.setProperty("--fly-y", `${-28 - Math.random() * 34}px`);
    fly.style.setProperty("--fly-rotate", `${(Math.random() - 0.5) * 18}deg`);
    layer.appendChild(fly);
    fly.addEventListener("animationend", () => fly.remove(), { once: true });
  }

  function schedule() {
    clearTimeout(timer);
    if (document.hidden || reducedMotion.matches) return;
    timer = setTimeout(() => {
      // 偶尔一次一枚，避免变成持续粒子流。
      spawn();
      schedule();
    }, 2000 + Math.random() * 3000);
  }

  document.addEventListener("visibilitychange", schedule);
  reducedMotion.addEventListener("change", schedule);
  window.addEventListener("screen-layout-change", schedule);
  schedule();
}

function initPegboardScreen() {
  const slot = document.getElementById("pegboardScreen");
  if (!slot) return;

  let cleanup = null;

  function clearMedia() {
    if (typeof cleanup === "function") {
      cleanup();
      cleanup = null;
    }
    slot.replaceChildren();
  }

  function setMedia(source, options = {}) {
    clearMedia();
    if (!source) return null;

    if (typeof source === "function") {
      const canvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;
      const width = slot.clientWidth || 124;
      const height = slot.clientHeight || 74;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      slot.appendChild(canvas);
      cleanup = source(canvas, ctx, { width, height }) || null;
      return canvas;
    }

    if (source instanceof HTMLElement) {
      slot.appendChild(source);
      return source;
    }

    const config = typeof source === "string" ? { ...options, src: source } : { ...options, ...source };
    if (!config.src) return null;

    const isVideo = config.type === "video" || (!config.type && /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(config.src));
    let mediaEl;

    if (isVideo) {
      const video = document.createElement("video");
      video.src = config.src;
      video.autoplay = config.autoplay ?? true;
      video.loop = config.loop ?? true;
      video.muted = config.muted ?? true;
      video.playsInline = true;
      if (config.poster) video.poster = config.poster;
      const onVisibility = () => {
        if (document.hidden) video.pause();
        else if (video.autoplay) video.play().catch(() => {});
      };
      document.addEventListener("visibilitychange", onVisibility);
      cleanup = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
      mediaEl = video;
    } else {
      const img = document.createElement("img");
      img.src = config.src;
      img.alt = config.alt ?? "";
      mediaEl = img;
    }

    if (config.fit) mediaEl.style.objectFit = config.fit;
    if (config.opacity != null) mediaEl.style.opacity = String(config.opacity);
    slot.appendChild(mediaEl);
    return mediaEl;
  }

  window.setPegboardScreenMedia = setMedia;
  window.PegboardScreen = { element: slot, set: setMedia, clear: clearMedia };

  // 若未手写子元素且预填了 data-src，则自动挂载对应视频或壁纸
  if (!slot.children.length && slot.dataset.src) {
    setMedia(slot.dataset.src, { type: slot.dataset.type || undefined });
  }
}

// 自设猫咪办公敲键盘循环与场景控制器（按照图2构图与手绘线条风格）
function initCatInteractiveAvatar() {
  const deskContainer = document.getElementById("characterStage");
  const keyboardKeys = document.querySelectorAll(".office-straight-keyboard .kb-k");

  if (!deskContainer) return;

  // 有待输入句子时与文字同步；句库耗尽后继续敲击动画，每轮休息2.5秒。
  const restDuration = 2500;
  const paused = new Set(['loading']);
  if (document.hidden) paused.add('hidden');
  let phase = 'idle', timer, keyFlashInterval, deadline = 0, remaining = 0, duration = 0;
  function stopKeys() {
    clearInterval(keyFlashInterval); keyFlashInterval = null;
    keyboardKeys.forEach(key => key.classList.remove('k-active'));
  }
  function startKeys() {
    stopKeys();
    keyFlashInterval = setInterval(() => {
      if (keyboardKeys.length) keyboardKeys[Math.floor(Math.random() * keyboardKeys.length)].classList.add('k-active');
      setTimeout(() => keyboardKeys.forEach(key => key.classList.remove('k-active')), 90);
    }, 160);
  }
  function arm(ms) { remaining = ms; deadline = performance.now() + ms; timer = setTimeout(advance, ms); }
  function advance() {
    if (paused.size) return;
    if (phase === 'typing') {
      window.NoteStream?.finishTyping();
      deskContainer.classList.remove('is-typing'); stopKeys();
      phase = 'rest'; duration = restDuration; arm(duration);
      window.dispatchEvent(new Event('desk-typing-end'));
    } else {
      const task = window.NoteStream?.beginTyping();
      duration = task?.duration || 1600;
      phase = 'typing'; deskContainer.classList.add('is-typing'); startKeys(); arm(duration);
      window.dispatchEvent(new CustomEvent('desk-typing-start', { detail: { duration, hasSentence: !!task } }));
    }
  }
  window.DeskTyping = {
    pause(reason) {
      if (!paused.size) { remaining = Math.max(0, deadline - performance.now()); clearTimeout(timer); stopKeys(); window.NoteStream?.pause(); }
      paused.add(reason); deskContainer.style.setProperty('--hand-play-state', 'paused');
    },
    resume(reason) {
      paused.delete(reason);
      if (paused.size) return;
      deskContainer.style.setProperty('--hand-play-state', 'running');
      window.NoteStream?.resume();
      if (phase === 'idle') advance();
      else { if (phase === 'typing') startKeys(); arm(remaining); }
    },
    restart() {
      clearTimeout(timer); stopKeys(); deskContainer.classList.remove('is-typing');
      window.NoteStream?.cancelTyping(); phase = 'idle';
      if (!paused.size) advance();
    },
    inspect: () => ({ phase, duration, restDuration, paused: [...paused] })
  };
  document.addEventListener('visibilitychange', () => document.hidden ? window.DeskTyping.pause('hidden') : window.DeskTyping.resume('hidden'));
  (window.PageBoot?.ready || Promise.resolve()).then(() => window.DeskTyping.resume('loading'));

  // 慢眨眼独立于打字节奏，每 5–8 秒一次。
  const eyeLayer = document.querySelector('.character-eyes');
  const eyeContext = eyeLayer?.getContext('2d');
  const eyes = [];
  const eyeResources = [];
  const blinkAtlas = new Image();
  let blinkFrames = [];
  blinkAtlas.src = 'character/blink_atlas.png';
  const atlasReady = (window.PageBoot?.imageReady(blinkAtlas) || new Promise(resolve => { blinkAtlas.onload = resolve; })).then(async () => {
    if (typeof createImageBitmap !== 'function') return;
    try { blinkFrames = await Promise.all(Array.from({ length: 65 }, (_, i) => createImageBitmap(blinkAtlas,
      i % 7 * 550, Math.floor(i / 7) * 320, 550, 320))); } catch (_) { /* 图集本身仍可直接绘制。 */ }
  });
  window.PageBoot?.register('眨眼动画', atlasReady);
  // 左右眼分别按用户确认的鼻侧端定义闭合斜度。
  for (const spec of [
    { side: 'left', x: 185, y: 425, w: 230, h: 190, outer: 215, inner: 12, a: 121, b: 17 },
    { side: 'right', x: 505, y: 375, w: 190, h: 165, outer: 175, inner: 16, a: 45, b: 13 }
  ]) {
    const images = {};
    for (const [name, file] of [['image', 'blink_eye'], ['lid', 'eyelid'], ['interior', 'eye_interior']]) {
      const image = new Image();
      images[name] = image;
      image.onload = () => {
        if (Object.values(images).length === 3 && Object.values(images).every(img => img.complete && img.naturalWidth)) {
          eyes.push({ ...spec, ...images });
          drawEyes(0);
        }
      };
      image.src = `character/${file}_${spec.side}.png`;
      if (window.PageBoot) eyeResources.push(window.PageBoot.imageReady(image));
    }
  }
  window.PageBoot?.register('眼睛图层', Promise.all(eyeResources));
  function drawEyeColumns(closed) {
    if (!eyeContext) return;
    eyeContext.clearRect(0, 0, 900, 980);
    for (const eye of eyes) {
      if (closed === 0) {
        eyeContext.drawImage(eye.image, eye.x, eye.y);
        continue;
      }
      // 先收拢彩色眼部和下眼眶，再覆盖保持原粗细的上眼眶。
      const tangentX = eye.w - 27;
      const tangentY = eye.b - eye.a;
      const tangentLength = Math.hypot(tangentX, tangentY);
      const normalX = -tangentY / tangentLength;
      const normalY = tangentX / tangentLength;
      for (const part of ['interior', 'lid']) {
      const scale = part === 'lid' ? 1 : Math.max(0.015, 1 - closed);
      eyeContext.globalAlpha = part === 'lid' ? 1 : Math.min(1, (1 - closed) * 5);
      for (let x = 0; x < eye.w; x++) {
        const fraction = Math.max(0, Math.min(1, (x - eye.outer) / (eye.inner - eye.outer)));
        const t = Math.max(0, Math.min(1, (x - 12) / (eye.w - 27)));
        const upper = eye.a + (eye.b - eye.a) * t - 5 * Math.sin(t * Math.PI);
        // 左眼：保持原眼眶形状，沿中段切线的向下法线移动至眼部中间。
        // 右眼：外端明确向下14px，内端向下42px，闭合全程不允许向上移动。
        const drop = closed * (eye.side === 'left' ? normalY * 48 : 14 + fraction * 28);
        const arcX = eye.side === 'left'
          ? closed * normalX * 48
          : fraction * 3 * Math.sin(closed * Math.PI);
        const targetTop = upper + drop;
        eyeContext.save();
        eyeContext.beginPath();
        eyeContext.rect(eye.x + x + arcX, eye.y - 10, 1.1, eye.h + 70);
        eyeContext.clip();
        eyeContext.translate(eye.x + arcX, eye.y + targetTop - upper * scale);
        eyeContext.scale(1, scale);
        eyeContext.drawImage(eye[part], 0, 0);
        eyeContext.restore();
      }
      }
    }
    eyeContext.globalAlpha = 1;
  }
  function drawEyes(closed) {
    if (!eyeContext) return;
    if (!closed || !blinkAtlas.complete || !blinkAtlas.naturalWidth) { drawEyeColumns(closed); return; }
    // 65个闭合程度采样来自上方同一原图分列算法。
    const index = Math.max(0, Math.min(64, Math.round(closed * 64)));
    eyeContext.clearRect(0, 0, 900, 980);
    if (blinkFrames[index]) eyeContext.drawImage(blinkFrames[index], 165, 350);
    else eyeContext.drawImage(blinkAtlas, index % 7 * 550, Math.floor(index / 7) * 320, 550, 320, 165, 350, 550, 320);
  }
  function blink() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / 600);
      const p = t < 0.42 ? t / 0.42 : t < 0.58 ? 1 : (1 - t) / 0.42;
      drawEyes(p * p * (3 - 2 * p));
      if (t < 1) requestAnimationFrame(frame);
      else drawEyes(0);
    }
    requestAnimationFrame(frame);
  }
  function scheduleBlink() {
    setTimeout(() => {
      if (document.hidden) { scheduleBlink(); return; }
      blink();
      setTimeout(() => {
        scheduleBlink();
      }, 600);
    }, 5000 + Math.random() * 3000);
  }
  (window.PageBoot?.ready || Promise.resolve()).then(scheduleBlink);
}

// TOPIC 01 Fate1 线条原画：固定大小、无光晕、随页面纵向滚动从脸部向头发逐笔出现
function initTopicLineartScroll() {
  const section = document.getElementById("section-topic-1");
  const stage = document.getElementById("fateLineartStage");
  const canvas = document.getElementById("fateLineartCanvas");
  if (!section || !stage || !canvas) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => (im.decode ? im.decode().then(() => resolve(im), () => resolve(im)) : resolve(im));
      im.onerror = () => reject(new Error(`无法加载 ${src}`));
      im.src = src;
    });
  }

  let assetsReady = false;
  let drawProgress = () => {};
  let renderMode = "pending";

  const inlineAssets = window.FATE_LINEART_ASSETS || {};
  const readyPromise = Promise.all([
    loadImg(inlineAssets.line || "Fate1_lineart_transparent.png"),
    loadImg(inlineAssets.stroke || "Fate1_stroke_map.png")
  ]).then(([lineImg, orderImg]) => {
    const W = lineImg.naturalWidth || 1200;
    const H = lineImg.naturalHeight || 675;
    canvas.width = W;
    canvas.height = H;
    canvas.dataset.lineSrc = lineImg.src;

    function initWebGL() {
      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true
      });
      if (!gl) return null;
      const vsSrc = `
        attribute vec2 a_pos;
        varying vec2 v_uv;
        void main() {
          v_uv = a_pos * 0.5 + 0.5;
          gl_Position = vec4(a_pos, 0.0, 1.0);
        }
      `;
      const fsSrc = `
        precision mediump float;
        uniform sampler2D u_line;
        uniform sampler2D u_order;
        uniform float u_progress;
        varying vec2 v_uv;
        void main() {
          vec4 line = texture2D(u_line, v_uv);
          if (line.a <= 0.002) discard;
          float ord = texture2D(u_order, v_uv).r;
          float reveal = smoothstep(ord - 0.024, ord + 0.024, u_progress);
          gl_FragColor = line * reveal;
        }
      `;
      function compile(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        return sh;
      }
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      function makeTex(unit, img, premultiply) {
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        return tex;
      }
      makeTex(0, lineImg, true);
      makeTex(1, orderImg, false);
      gl.uniform1i(gl.getUniformLocation(prog, "u_line"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "u_order"), 1);
      const uProgLoc = gl.getUniformLocation(prog, "u_progress");

      renderMode = "webgl";
      return (uProg) => {
        gl.viewport(0, 0, W, H);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uProgLoc, uProg);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
    }

    function initCanvas2D() {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const tmp = document.createElement("canvas");
      tmp.width = W;
      tmp.height = H;
      const tctx = tmp.getContext("2d");
      tctx.drawImage(lineImg, 0, 0, W, H);
      const lineBytes = tctx.getImageData(0, 0, W, H).data;
      tctx.clearRect(0, 0, W, H);
      tctx.drawImage(orderImg, 0, 0, W, H);
      const ordBytes = tctx.getImageData(0, 0, W, H).data;
      const outImg = ctx.createImageData(W, H);
      const outData = outImg.data;
      for (let i = 0; i < lineBytes.length; i += 4) {
        outData[i] = lineBytes[i];
        outData[i + 1] = lineBytes[i + 1];
        outData[i + 2] = lineBytes[i + 2];
      }
      renderMode = "canvas2d";
      return (uProg) => {
        const edge = 0.024;
        const loEdge = -edge;
        const span = 2 * edge;
        for (let i = 0; i < lineBytes.length; i += 4) {
          const a = lineBytes[i + 3];
          if (a === 0) { outData[i + 3] = 0; continue; }
          const ord = ordBytes[i] / 255;
          let t = (uProg - (ord + loEdge)) / span;
          if (t <= 0) { outData[i + 3] = 0; continue; }
          if (t >= 1) { outData[i + 3] = a; continue; }
          t = t * t * (3 - 2 * t);
          outData[i + 3] = Math.round(a * t);
        }
        ctx.putImageData(outImg, 0, 0);
      };
    }

    let drawFn = null;
    try {
      drawFn = initWebGL();
    } catch (_) {
      drawFn = null;
    }
    if (!drawFn) {
      try {
        drawFn = initCanvas2D();
      } catch (_) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          renderMode = "fallback2d";
          drawFn = (uProg) => {
            ctx.clearRect(0, 0, W, H);
            ctx.globalAlpha = Math.max(0, Math.min(1, uProg));
            ctx.drawImage(lineImg, 0, 0, W, H);
          };
        }
      }
    }
    if (drawFn) drawProgress = drawFn;
    assetsReady = true;
    applyProgress(currentP);
  }).catch((err) => {
    renderMode = "error";
    console.error("Fate1 线条绘制初始化失败:", err);
  });

  if (window.PageBoot && !window.PageBoot.complete) {
    try {
      window.PageBoot.register("线条插画", readyPromise);
    } catch (_) {
      // PageBoot 已密封时忽略注册
    }
  }

  const fskPosterCtrl = initFskPosterZone({
    reducedMotion
  });

  let targetP = 0;
  let currentP = 0;
  let rafId = 0;
  let lastFrameTime = 0;
  let lastUProg = -999;

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function applyProgress(p) {
    // 匀速线性映射：-0.03（完全空白） -> 1.02（全部笔触完整呈现），接近终点立即收齐并发起海报转变
    const clampedP = clamp01(p);
    const uProg = -0.03 + clampedP * 1.05;
    lastUProg = uProg;
    if (assetsReady) drawProgress(uProg);
    if (fskPosterCtrl) {
      fskPosterCtrl.syncWithLineart({
        assetsReady,
        targetP,
        currentP,
        reduced: reducedMotion.matches
      });
    }
  }

  function computeTarget() {
    if (reducedMotion.matches) return 1;
    const vh = window.innerHeight || document.documentElement.clientHeight || 900;
    const stageRect = stage.getBoundingClientRect();
    const restTop = Math.max(16, (vh - stageRect.height) * 0.5);
    const startTop = Math.max(restTop + 160, vh * 0.84);
    const endTop = restTop + vh * 0.02;
    return clamp01((startTop - stageRect.top) / Math.max(140, startTop - endTop));
  }

  function tick(now) {
    rafId = 0;
    const dt = lastFrameTime ? Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000)) : 1 / 60;
    lastFrameTime = now;

    const diff = targetP - currentP;
    const snapEps = targetP >= 0.98 ? 0.015 : 0.002;
    if (Math.abs(diff) <= snapEps) {
      currentP = targetP;
      lastFrameTime = 0;
      applyProgress(currentP);
      return;
    }
    const factor = 1 - Math.exp(-13.5 * dt);
    currentP += diff * factor;
    if (targetP >= 0.985 && currentP >= 0.985) {
      currentP = 1;
      lastFrameTime = 0;
      applyProgress(currentP);
      return;
    }
    applyProgress(currentP);
    rafId = requestAnimationFrame(tick);
  }

  function sync(immediate = false) {
    targetP = computeTarget();
    if (immediate || reducedMotion.matches) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      lastFrameTime = 0;
      currentP = targetP;
      applyProgress(currentP);
      return;
    }
    if (!rafId) {
      lastFrameTime = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  window.FateLineartScroll = {
    inspect: () => ({
      targetP: Number(targetP.toFixed(3)),
      currentP: Number(currentP.toFixed(3)),
      progress: Number(lastUProg.toFixed(3)),
      mode: renderMode,
      ready: assetsReady
    }),
    sync
  };

  window.addEventListener("scroll", () => sync(false), { passive: true });
  document.addEventListener("scroll", () => sync(false), { passive: true });
  window.addEventListener("resize", () => sync(true), { passive: true });
  reducedMotion.addEventListener("change", () => sync(true));
  window.addEventListener("page-ready", () => sync(true));
  sync(true);
}

/**
 * Topic 01 FSK 介绍入口海报区控制器
 * 1) 滚动至入口定位（currentP >= 0.992 && targetP >= 0.985）时触发瞬间变色一闪
 * 2) 中央 Fate1 线条画瞬间转化为全彩潮流海报舞台，四周组件与视觉动效协同登场
 * 3) 支持指针 3D 视差光泽、环境碎屑漂浮、闪变重播与向上回滚复位
 */
function initFskPosterZone({ reducedMotion }) {
  const section = document.getElementById("section-topic-1");
  const artStage = document.getElementById("fskHeroArtStage");
  const popartImg = document.getElementById("fatePopartImg");
  const flashVeil = document.getElementById("fskFlashVeil");
  const fxCanvas = document.getElementById("fateTopicFxCanvas");
  const replayBtn = document.getElementById("fskReplayFlashBtn");
  const enkiduBanner = document.getElementById("fskEnkiduBanner");

  if (!section || !artStage) return null;

  if (popartImg) {
    const popartReady = (
      window.PageBoot && typeof window.PageBoot.imageReady === "function"
        ? window.PageBoot.imageReady(popartImg)
        : new Promise((resolve) => {
            if (popartImg.complete) resolve();
            else {
              popartImg.addEventListener("load", resolve, { once: true });
              popartImg.addEventListener("error", resolve, { once: true });
            }
          })
    ).then(() => (typeof popartImg.decode === "function" ? popartImg.decode().catch(() => {}) : undefined));

    if (window.PageBoot && !window.PageBoot.complete) {
      try {
        window.PageBoot.register("海报双色图层", popartReady);
      } catch (_) {
        // PageBoot 已密封时忽略注册
      }
    }
  }

  let state = "lineart"; // "lineart" | "poster"
  let animPhase = "idle"; // "idle" | "anticipation" | "slam" | "settled"
  let anticTimer = 0;
  let slamTimer = 0;
  let flashTimer = 0;
  let waitReadyTimer = 0;
  let rafId = 0;
  let lastTs = 0;

  const fxCtx = fxCanvas ? fxCanvas.getContext("2d") : null;
  let fxW = 0;
  let fxH = 0;
  let fxDpr = 1;

  const PALETTE = ["#070c0a", "#1ea853", "#070c0a"];

  const fx = {
    burstStart: 0,
    burstActive: false,
    sparks: [],
    motes: Array.from({ length: 28 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00018,
      vy: -0.00010 - Math.random() * 0.00024,
      size: 2.2 + Math.random() * 4.2,
      rot: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.002,
      alpha: 0.24 + Math.random() * 0.45,
      color: PALETTE[i % PALETTE.length],
    })),
  };

  function resizeFx() {
    if (!fxCanvas) return;
    const rect = section.getBoundingClientRect();
    fxDpr = Math.min(window.devicePixelRatio || 1, 2);
    fxW = Math.max(1, Math.floor(rect.width));
    fxH = Math.max(1, Math.floor(rect.height));
    fxCanvas.width = Math.floor(fxW * fxDpr);
    fxCanvas.height = Math.floor(fxH * fxDpr);
    fxCtx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
  }

  function spawnBurst(now) {
    fx.burstStart = now;
    fx.burstActive = true;
    fx.sparks = Array.from({ length: 34 }, (_, i) => {
      const ang = (Math.PI * 2 * i) / 34 + (Math.random() - 0.5) * 0.22;
      const spd = 2.6 + Math.random() * 6.8;
      return {
        x: fxW * 0.5,
        y: fxH * 0.49,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 3 + Math.random() * 5,
        life: 0,
        maxLife: 420 + Math.random() * 340,
        color: PALETTE[i % PALETTE.length],
      };
    });
  }

  function tickFx(ts) {
    if (!fxCtx) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.max(0, Math.min(34, ts - lastTs));
    lastTs = ts;

    fxCtx.clearRect(0, 0, fxW, fxH);

    // 变色一闪瞬间的全舞台斜切冲击波与 Enkidu 粒子爆破
    if (fx.burstActive) {
      const elapsed = Math.max(0, ts - fx.burstStart);
      const p = Math.min(1, elapsed / 680);
      const easeOut = 1 - Math.pow(1 - p, 3);
      const cx = fxW * 0.5;
      const cy = fxH * 0.49;

      // 双色同心扩展光环
      const maxR = Math.max(fxW, fxH) * 0.54;
      const r1 = maxR * easeOut;
      const a1 = (1 - p) * 0.72;
      fxCtx.save();
      fxCtx.strokeStyle = `rgba(7, 12, 10, ${a1.toFixed(3)})`;
      fxCtx.lineWidth = 4 * (1 - p) + 1;
      fxCtx.beginPath();
      fxCtx.arc(cx, cy, r1, 0, Math.PI * 2);
      fxCtx.stroke();

      const r2 = maxR * Math.min(1, easeOut * 1.18);
      const a2 = (1 - p) * 0.52;
      fxCtx.strokeStyle = `rgba(30, 168, 83, ${a2.toFixed(3)})`;
      fxCtx.lineWidth = 2.5 * (1 - p) + 0.5;
      fxCtx.beginPath();
      fxCtx.arc(cx, cy, r2, 0, Math.PI * 2);
      fxCtx.stroke();
      fxCtx.restore();

      // 爆裂几何碎屑
      for (const sp of fx.sparks) {
        sp.life += dt;
        const lp = Math.min(1, sp.life / sp.maxLife);
        if (lp >= 1) continue;
        sp.x += sp.vx * (dt / 16);
        sp.y += sp.vy * (dt / 16);
        sp.vx *= 0.962;
        sp.vy *= 0.962;
        fxCtx.save();
        fxCtx.globalAlpha = (1 - lp) * 0.92;
        fxCtx.fillStyle = sp.color;
        fxCtx.translate(sp.x, sp.y);
        fxCtx.rotate(lp * 2.4);
        fxCtx.fillRect(-sp.size * 0.5, -sp.size * 0.5, sp.size, sp.size * 0.65);
        fxCtx.restore();
      }

      if (p >= 1) {
        fx.burstActive = false;
      }
    }

    // Poster 态常驻环境：低耗漂浮巴比伦棱角碎屑
    if (state === "poster" && !reducedMotion.matches) {
      for (const m of fx.motes) {
        m.x = (m.x + m.vx * dt + 1) % 1;
        m.y = (m.y + m.vy * dt + 1) % 1;
        m.rot += m.vRot * dt;
        fxCtx.save();
        fxCtx.globalAlpha = m.alpha;
        fxCtx.fillStyle = m.color;
        fxCtx.translate(m.x * fxW, m.y * fxH);
        fxCtx.rotate(m.rot);
        fxCtx.fillRect(-m.size * 0.5, -m.size * 0.5, m.size, m.size * 0.72);
        fxCtx.restore();
      }
    }

    if (state === "poster" || fx.burstActive) {
      rafId = window.requestAnimationFrame(tickFx);
    } else {
      rafId = 0;
      fxCtx.clearRect(0, 0, fxW, fxH);
    }
  }

  function ensureFxLoop() {
    if (rafId || !fxCtx) return;
    lastTs = 0;
    rafId = window.requestAnimationFrame(tickFx);
  }

  function clearTimers() {
    if (anticTimer) { window.clearTimeout(anticTimer); anticTimer = 0; }
    if (slamTimer) { window.clearTimeout(slamTimer); slamTimer = 0; }
    if (flashTimer) { window.clearTimeout(flashTimer); flashTimer = 0; }
    if (waitReadyTimer) { window.clearTimeout(waitReadyTimer); waitReadyTimer = 0; }
  }

  function setPhase(nextPhase) {
    animPhase = nextPhase;
    section.dataset.animPhase = nextPhase;
  }

  // motion-web 物理曲线 + 伪3D 故障线条与自制故障图形控制器
  const SWEEP_DURATION_MS = 1040;
  const SWEEP_LUT = (() => {
    // 缓入 -> 柔和减速 -> 短暂巡航 -> 加速至 0.50 -> 柔和长尾缓冲减速至 0 末速度停靠
    const evalVel = (u) => {
      if (u <= 0.22) {
        const s = u / 0.22;
        const h = s * s * (3 - 2 * s);
        return 1.12 + (0.54 - 1.12) * h;
      }
      if (u <= 0.34) return 0.54;
      if (u <= 0.50) {
        const s = (u - 0.34) / 0.16;
        const h = s * s * (3 - 2 * s);
        return 0.54 + (1.15 - 0.54) * h;
      }
      const s = Math.min(1, (u - 0.50) / 0.50);
      return 1.15 * Math.pow(1 - s, 1.45);
    };
    const N = 160;
    const pos = new Float32Array(N + 1);
    const vel = new Float32Array(N + 1);
    let acc = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      vel[i] = evalVel(u);
      if (i > 0) acc += 0.5 * (vel[i - 1] + vel[i]) / N;
      pos[i] = acc;
    }
    const total = pos[N] || 1;
    for (let i = 0; i <= N; i++) {
      pos[i] /= total;
      vel[i] /= total;
    }
    pos[0] = 0;
    pos[N] = 1;
    return {
      N,
      sample(t) {
        const u = Math.max(0, Math.min(1, t));
        const f = u * N;
        const i0 = Math.min(N - 1, Math.floor(f));
        const frac = f - i0;
        return {
          p: pos[i0] + (pos[i0 + 1] - pos[i0]) * frac,
          v: vel[i0] + (vel[i0 + 1] - vel[i0]) * frac
        };
      }
    };
  })();

  // 更少、更粗的反色故障线条（第2拍 ~37.5% 约2.5倍脸部主带）+ 各种自制反色故障图形 + 平行四边形故障融入 + 末几帧绿黑频闪保留
  const BEAT_FRAMES = [
    // Beat 0: 2条不等粗反色带 + 右上24°斜切菱形碎片故障图形
    {
      uMin: 0.00,
      beatType: "invert",
      slashSnapVw: 0,
      slashGlitch: false,
      bands: [
        { y: 7.0,  h: 16.0, z: 0, dx: 26,  sc: 1.11, ox: 26, mode: "invert" },
        { y: 78.0, h: 8.5,  z: 1, dx: -20, sc: 1.05, ox: 76, mode: "invert" }
      ],
      shapes: [
        {
          id: "slant-shard-tr",
          poly: "polygon(64% 11%, 88% 11%, 79% 46%, 55% 46%)",
          z: 0, dx: 34, dy: -8, sc: 1.14, ox: 72, oy: 28, mode: "invert"
        }
      ]
    },
    // Beat 1: 上眼部厚带+紧邻暗灰副带 + 左侧阶梯折角故障图形 + 平行四边形微故障跳动
    {
      uMin: 0.13,
      beatType: "invert",
      slashSnapVw: -0.95,
      slashGlitch: true,
      bands: [
        { y: 24.0,  h: 18.0, z: 0, dx: -32, sc: 1.14, ox: 48, mode: "invert" },
        { y: 42.36, h: 4.2,  z: 2, dx: 12,  sc: 0.975, ox: 52, mode: "invert" }
      ],
      shapes: [
        {
          id: "stepped-lwing-tl",
          poly: "polygon(5% 22%, 29% 22%, 33% 31%, 33% 54%, 11% 54%, 5% 44%)",
          z: 1, dx: 24, dy: 6, sc: 1.11, ox: 20, oy: 38, mode: "invert"
        }
      ]
    },
    // Beat 2: 2.5倍超大脸部反色主故障线条 (~37.5% 高，直击人物面部) + 右下折角菱形故障图形
    {
      uMin: 0.26,
      beatType: "invert",
      slashSnapVw: 0.85,
      slashGlitch: true,
      bands: [
        { y: 22.0, h: 37.5, z: 0, dx: -36, sc: 1.15, ox: 50, mode: "invert" }
      ],
      shapes: [
        {
          id: "chevron-diamond-br",
          poly: "polygon(57% 60%, 84% 60%, 89% 69%, 80% 82%, 52% 82%, 55% 70%)",
          z: 2, dx: 28, dy: 4, sc: 1.13, ox: 70, oy: 71, mode: "invert"
        }
      ]
    },
    // Beat 3: 中下大跨度粗带 + 右侧斜刃平行四边形故障图形（与扫入平行四边形交叠）
    {
      uMin: 0.41,
      beatType: "invert",
      slashSnapVw: -0.75,
      slashGlitch: true,
      bands: [
        { y: 50.0,  h: 21.0, z: 1, dx: 28,  sc: 1.09, ox: 54, mode: "invert" },
        { y: 45.4,  h: 4.2,  z: 0, dx: -26, sc: 1.13, ox: 46, mode: "invert" }
      ],
      shapes: [
        {
          id: "blade-prism-right",
          poly: "polygon(52% 8%, 74% 8%, 62% 48%, 40% 48%)",
          z: 0, dx: -34, dy: -6, sc: 1.15, ox: 58, oy: 28, mode: "invert"
        }
      ]
    },
    // Beat 4: 绿前最后一拍纯反色（上下两粗带 + 左中切角八边形故障图形）
    {
      uMin: 0.54,
      beatType: "invert",
      slashSnapVw: 0,
      slashGlitch: false,
      bands: [
        { y: 8.5,  h: 17.5, z: 0, dx: -28, sc: 1.11, ox: 28, mode: "invert" },
        { y: 76.0, h: 15.0, z: 2, dx: 18,  sc: 0.98, ox: 78, mode: "invert" }
      ],
      shapes: [
        {
          id: "octa-shoulder-left",
          poly: "polygon(15% 46%, 43% 46%, 46% 54%, 42% 68%, 18% 68%, 13% 58%)",
          z: 0, dx: 32, dy: 8, sc: 1.14, ox: 30, oy: 57, mode: "invert"
        }
      ]
    },
    // Beat 5..8: 动画最后几帧才出现绿色故障线条，频率交替 + 已绿区域持久保留直到变成完整海报
    {
      uMin: 0.65,
      beatType: "green",
      slashSnapVw: 0.55,
      slashGlitch: true,
      bands: [
        { y: 23.0, h: 20.5, z: 0, dx: -30, sc: 1.14, ox: 50, mode: "green" },
        { y: 73.0, h: 15.5, z: 1, dx: 22,  sc: 1.06, ox: 78, mode: "green" }
      ],
      shapes: []
    },
    {
      uMin: 0.75,
      beatType: "invert",
      slashSnapVw: -0.5,
      slashGlitch: true,
      bands: [
        { y: 5.0,  h: 17.0, z: 0, dx: 28,  sc: 1.12, ox: 25, mode: "invert" },
        { y: 52.0, h: 10.0, z: 1, dx: -24, sc: 1.06, ox: 52, mode: "invert" }
      ],
      shapes: [
        {
          id: "notch-stamp-tr",
          poly: "polygon(67% 4%, 93% 4%, 93% 21%, 74% 21%, 67% 14%)",
          z: 0, dx: -26, dy: 6, sc: 1.13, ox: 82, oy: 12, mode: "invert"
        }
      ]
    },
    {
      uMin: 0.84,
      beatType: "green",
      slashSnapVw: 0,
      slashGlitch: false,
      bands: [
        { y: 0.0,  h: 23.0, z: 1, dx: 16,  sc: 1.06, ox: 36, mode: "green" },
        { y: 43.5, h: 20.5, z: 0, dx: -24, sc: 1.11, ox: 50, mode: "green" },
        { y: 88.5, h: 11.5, z: 0, dx: 18,  sc: 1.08, ox: 80, mode: "green" }
      ],
      shapes: []
    },
    {
      uMin: 0.93,
      beatType: "mixed-final",
      slashSnapVw: 0,
      slashGlitch: false,
      bands: [
        { y: 64.0, h: 9.2, z: 0, dx: -18, sc: 1.08, ox: 52, mode: "green" },
        { y: 66.8, h: 2.8, z: 0, dx: 24,  sc: 1.10, ox: 48, mode: "invert" }
      ],
      shapes: []
    }
  ];

  // 绿色故障线条出现后对应区域持久保留绿色，并逐帧扩张直到铺满整个海报
  const GREEN_LOCK_STAGES = [
    { minStep: 5, y: 23.0, h: 20.6 },
    { minStep: 5, y: 73.0, h: 15.6 },
    { minStep: 7, y: 0.0,  h: 23.1 },
    { minStep: 7, y: 43.5, h: 20.6 },
    { minStep: 7, y: 88.4, h: 11.7 },
    { minStep: 8, y: 64.0, h: 9.2 }
  ];

  const glitchHost = {
    overlay: null,
    greenAccum: null,
    greenLockPool: [],
    bandPool: [],
    shapePool: [],
    raf: 0,
    progress: 0,
    lastStep: -1,
    lastSecH: 0,
    pinned: false
  };

  function ensureGlitchOverlay() {
    if (glitchHost.overlay) return glitchHost.bandPool;
    const overlay = document.createElement("div");
    overlay.className = "fsk-glitch-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const blocksSrc = section.querySelector(".fsk-popart-blocks");
    const stageSrc = section.querySelector(".stage-overlay.topic-fate-overlay");
    const marqueesSrc = section.querySelectorAll(".fsk-marquee-strip");
    const lineCanvas = document.getElementById("fateLineartCanvas");
    const lineSrc =
      (lineCanvas && lineCanvas.dataset.lineSrc) ||
      (window.FATE_LINEART_ASSETS && window.FATE_LINEART_ASSETS.line) ||
      "Fate1_lineart_transparent.png";

    const sanitizeClone = (node) => {
      if (!node) return null;
      const clone = node.cloneNode(true);
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      clone.querySelectorAll("button, a").forEach((el) => {
        el.setAttribute("tabindex", "-1");
        el.setAttribute("aria-hidden", "true");
      });
      const oldCanvas = clone.querySelector(".fate-lineart-canvas");
      if (oldCanvas) {
        const img = document.createElement("img");
        img.className = "fate-lineart-canvas fsk-glitch-lineart";
        img.alt = "";
        img.decoding = "sync";
        img.src = lineSrc;
        oldCanvas.replaceWith(img);
      }
      return clone;
    };

    const tplStage = document.createElement("div");
    tplStage.className = "fsk-glitch-stage";
    if (blocksSrc) tplStage.appendChild(sanitizeClone(blocksSrc));
    marqueesSrc.forEach((m) => tplStage.appendChild(sanitizeClone(m)));
    if (stageSrc) tplStage.appendChild(sanitizeClone(stageSrc));

    // 持久保留已变绿区域的积木层（位于活跃故障条带之下、原始线条底景之上）
    const greenAccum = document.createElement("div");
    greenAccum.className = "fsk-green-accum";
    for (let i = 0; i < GREEN_LOCK_STAGES.length; i++) {
      const lockBand = document.createElement("div");
      lockBand.className = "fsk-green-lock-band";
      lockBand.style.display = "none";

      const lockAnchor = document.createElement("div");
      lockAnchor.className = "fsk-glitch-anchor";
      const lockStage = tplStage.cloneNode(true);
      lockStage.dataset.mode = "green";
      lockStage.dataset.z = "1";
      lockAnchor.appendChild(lockStage);
      lockBand.appendChild(lockAnchor);
      greenAccum.appendChild(lockBand);
      glitchHost.greenLockPool.push({ band: lockBand, anchor: lockAnchor, stageClone: lockStage });
    }
    overlay.appendChild(greenAccum);
    glitchHost.greenAccum = greenAccum;

    for (let i = 0; i < 4; i++) {
      const band = document.createElement("div");
      band.className = "fsk-glitch-band";
      band.style.display = "none";

      const anchor = document.createElement("div");
      anchor.className = "fsk-glitch-anchor";
      const stageClone = tplStage.cloneNode(true);
      anchor.appendChild(stageClone);
      band.appendChild(anchor);
      overlay.appendChild(band);
      glitchHost.bandPool.push({ band, anchor, stageClone });
    }

    // 自制几何多边形故障图形槽位（外包层负责 drop-shadow 伪3D景深，内层 clip-path polygon + 内容错位放大）
    for (let i = 0; i < 2; i++) {
      const wrap = document.createElement("div");
      wrap.className = "fsk-glitch-shape-wrap";
      wrap.style.display = "none";

      const shape = document.createElement("div");
      shape.className = "fsk-glitch-shape";
      const stageClone = tplStage.cloneNode(true);
      shape.appendChild(stageClone);
      wrap.appendChild(shape);
      overlay.appendChild(wrap);
      glitchHost.shapePool.push({ wrap, shape, stageClone });
    }

    section.appendChild(overlay);
    glitchHost.overlay = overlay;
    return glitchHost.bandPool;
  }

  function stopGlitchRaf() {
    if (glitchHost.raf) {
      cancelAnimationFrame(glitchHost.raf);
      glitchHost.raf = 0;
    }
  }

  function clearGlitchOverlay() {
    stopGlitchRaf();
    glitchHost.lastStep = -1;
    glitchHost.lastSecH = 0;
    glitchHost.progress = 0;
    if (glitchHost.overlay) glitchHost.overlay.style.display = "none";
    glitchHost.greenLockPool.forEach(({ band }) => { band.style.display = "none"; });
    glitchHost.bandPool.forEach(({ band }) => { band.style.display = "none"; });
    glitchHost.shapePool.forEach(({ wrap }) => { wrap.style.display = "none"; });
    delete section.dataset.slashGlitch;
    section.style.removeProperty("--fsk-slash-dx");
    section.style.removeProperty("--fsk-slash-left-dx");
    section.style.removeProperty("--fsk-slash-left-op");
    section.style.removeProperty("--fsk-slash-lean");
  }

  function resolveBeatStep(u) {
    let idx = 0;
    for (let i = 0; i < BEAT_FRAMES.length; i++) {
      if (u >= BEAT_FRAMES[i].uMin) idx = i;
    }
    return idx;
  }

  function applyGlitchFrame(t) {
    const u = Math.max(0, Math.min(1, t));
    glitchHost.progress = u;
    ensureGlitchOverlay();
    glitchHost.overlay.style.display = "block";

    const stepIdx = resolveBeatStep(u);
    const beat = BEAT_FRAMES[stepIdx];

    // 平行四边形柔和物理位移 + 长尾指数减速缓冲 + 故障节拍微跳动与残影融入
    const { p, v } = SWEEP_LUT.sample(u);
    const tailAtten = u > 0.58 ? Math.max(0, (0.76 - u) / 0.18) : 1;
    const snapVw = (beat.slashSnapVw || 0) * tailAtten;
    const dxVw = (-88 * (1 - p) + snapVw).toFixed(3) + "vw";
    const leftDxVw = (-28 * (1 - p) + snapVw * 0.45).toFixed(3) + "vw";
    const leftOp = Math.min(1, p / 0.14).toFixed(3);
    const leanBlend = u > 0.60 ? Math.max(0, (0.78 - u) / 0.18) : 1;
    const leanDeg = (Math.max(-0.5, Math.min(0.5, (v - 0.82) * 0.55)) * leanBlend).toFixed(3) + "deg";
    section.style.setProperty("--fsk-slash-dx", dxVw);
    section.style.setProperty("--fsk-slash-left-dx", leftDxVw);
    section.style.setProperty("--fsk-slash-left-op", leftOp);
    section.style.setProperty("--fsk-slash-lean", leanDeg);
    if (beat.slashGlitch && u < 0.84) {
      section.dataset.slashGlitch = "1";
    } else {
      delete section.dataset.slashGlitch;
    }

    const secH = section.clientHeight || window.innerHeight || 900;
    if (stepIdx !== glitchHost.lastStep || glitchHost.lastSecH !== secH) {
      glitchHost.lastStep = stepIdx;
      glitchHost.lastSecH = secH;

      // 1) 更新持久保留的绿色海报区域
      for (let g = 0; g < GREEN_LOCK_STAGES.length; g++) {
        const lockCfg = GREEN_LOCK_STAGES[g];
        const lockItem = glitchHost.greenLockPool[g];
        if (stepIdx >= lockCfg.minStep) {
          const topPx = (lockCfg.y * 0.01 * secH).toFixed(2);
          lockItem.band.style.display = "block";
          lockItem.band.style.top = `${lockCfg.y}%`;
          lockItem.band.style.height = `${lockCfg.h}%`;
          lockItem.anchor.style.height = `${secH}px`;
          lockItem.anchor.style.transform = `translate3d(0, -${topPx}px, 0)`;
        } else {
          lockItem.band.style.display = "none";
        }
      }

      // 2) 更新横向故障线条（更少、更粗，第2拍 ~2.5倍脸部大宽带）
      const activeList = beat.bands || [];
      for (let i = 0; i < glitchHost.bandPool.length; i++) {
        const item = glitchHost.bandPool[i];
        if (i < activeList.length) {
          const slot = activeList[i];
          const midPx = ((slot.y + slot.h * 0.5) * 0.01 * secH).toFixed(2);
          const topPx = (slot.y * 0.01 * secH).toFixed(2);

          item.band.style.display = "block";
          item.band.style.top = `${slot.y}%`;
          item.band.style.height = `${slot.h}%`;
          item.band.dataset.mode = slot.mode;
          item.band.dataset.z = String(slot.z);

          item.anchor.style.height = `${secH}px`;
          item.anchor.style.transform = `translate3d(0, -${topPx}px, 0)`;
          item.stageClone.dataset.mode = slot.mode;
          item.stageClone.dataset.z = String(slot.z);
          item.stageClone.style.transformOrigin = `${slot.ox}% ${midPx}px`;
          item.stageClone.style.transform = `translate3d(${slot.dx}px, 0, 0) scale(${slot.sc})`;
        } else {
          item.band.style.display = "none";
        }
      }

      // 3) 更新自制反色故障图形（多边形剪切 + 内容同步错位放大 + 伪3D景深）
      const shapeList = beat.shapes || [];
      for (let s = 0; s < glitchHost.shapePool.length; s++) {
        const item = glitchHost.shapePool[s];
        if (s < shapeList.length) {
          const cfg = shapeList[s];
          item.wrap.style.display = "block";
          item.wrap.dataset.z = String(cfg.z);
          item.wrap.dataset.shape = cfg.id;
          item.shape.style.clipPath = cfg.poly;
          item.shape.dataset.mode = cfg.mode;
          item.shape.dataset.z = String(cfg.z);
          item.stageClone.dataset.mode = cfg.mode;
          item.stageClone.dataset.z = String(cfg.z);
          item.stageClone.style.transformOrigin = `${cfg.ox}% ${cfg.oy}%`;
          item.stageClone.style.transform = `translate3d(${cfg.dx}px, ${cfg.dy || 0}px, 0) scale(${cfg.sc})`;
        } else {
          item.wrap.style.display = "none";
        }
      }
    }
  }

  function settlePosterImmediate() {
    clearGlitchOverlay();
    glitchHost.pinned = false;
    glitchHost.progress = 1;
    state = "poster";
    section.dataset.posterState = "poster";
    setPhase("settled");
    if (enkiduBanner) enkiduBanner.setAttribute("aria-hidden", "false");
    fx.burstActive = false;
    resizeFx();
    ensureFxLoop();
  }

  function seekGlitch(t) {
    if (t === null || typeof t !== "number") {
      glitchHost.pinned = false;
      return null;
    }
    const clamped = Math.max(0, Math.min(1, t));
    clearTimers();
    stopGlitchRaf();
    if (clamped >= 1) {
      settlePosterImmediate();
    } else {
      glitchHost.pinned = true;
      state = "lineart";
      section.dataset.posterState = "lineart";
      setPhase("invert-flash");
      glitchHost.lastStep = -1;
      applyGlitchFrame(clamped);
    }
    const stepIdx = clamped >= 1 ? BEAT_FRAMES.length : resolveBeatStep(clamped);
    const activeLocks = clamped >= 1
      ? [{ top: "0%", height: "100%" }]
      : glitchHost.greenLockPool
          .filter((g) => g.band.style.display !== "none")
          .map((g) => ({ top: g.band.style.top, height: g.band.style.height }));
    return {
      phase: animPhase,
      posterState: section.dataset.posterState,
      progress: Number(clamped.toFixed(3)),
      stepIdx,
      beatType: clamped >= 1 ? "settled" : BEAT_FRAMES[stepIdx].beatType,
      slashDxVw: section.style.getPropertyValue("--fsk-slash-dx"),
      lockedGreenZones: activeLocks,
      lockedGreenPct: Number(activeLocks.reduce((sum, x) => sum + parseFloat(x.height || "0"), 0).toFixed(1)),
      activeBands: glitchHost.bandPool.filter((b) => b.band.style.display !== "none").map((b) => ({
        top: b.band.style.top,
        height: b.band.style.height,
        mode: b.band.dataset.mode,
        z: Number(b.band.dataset.z)
      })),
      activeShapes: glitchHost.shapePool.filter((s) => s.wrap.style.display !== "none").map((s) => ({
        id: s.wrap.dataset.shape,
        mode: s.shape.dataset.mode,
        z: Number(s.wrap.dataset.z)
      })),
      slashGlitch: Boolean(section.dataset.slashGlitch)
    };
  }

  function trigger({ skipAnticipation = false } = {}) {
    if (animPhase === "invert-flash" && !skipAnticipation && glitchHost.raf) return;
    clearTimers();
    stopGlitchRaf();
    glitchHost.pinned = false;

    if (reducedMotion.matches || skipAnticipation) {
      settlePosterImmediate();
      return;
    }

    // 第 1 阶段 (0~860ms)：低加速度平行四边形左->右扫入 + 伪3D反色/绿黑交替故障线条，到达终位同时完成海报转变
    glitchHost.lastStep = -1;
    setPhase("invert-flash");
    const t0 = performance.now();
    const stepSweep = (now) => {
      if (glitchHost.pinned || animPhase !== "invert-flash") {
        glitchHost.raf = 0;
        return;
      }
      const u = Math.min(1, (now - t0) / SWEEP_DURATION_MS);
      applyGlitchFrame(u);
      if (u >= 1) {
        glitchHost.raf = 0;
        settlePosterImmediate();
        return;
      }
      glitchHost.raf = requestAnimationFrame(stepSweep);
    };
    applyGlitchFrame(0);
    glitchHost.raf = requestAnimationFrame(stepSweep);
  }

  function reset() {
    clearTimers();
    clearGlitchOverlay();
    glitchHost.pinned = false;
    state = "lineart";
    section.dataset.posterState = "lineart";
    setPhase("idle");
    if (enkiduBanner) enkiduBanner.setAttribute("aria-hidden", "true");
    section.style.setProperty("--fsk-px", "50%");
    section.style.setProperty("--fsk-py", "50%");
    if (flashVeil) flashVeil.classList.remove("is-flashing");
    fx.burstActive = false;
  }

  function replay() {
    reset();
    void section.offsetWidth;
    trigger({ skipAnticipation: false });
  }

  function syncWithLineart({ assetsReady, targetP, currentP }) {
    if (!assetsReady) return;
    if (state === "lineart" && animPhase === "idle" && currentP >= 0.985 && targetP >= 0.98) {
      if (popartImg && !popartImg.complete) {
        if (!waitReadyTimer) {
          waitReadyTimer = window.setTimeout(() => {
            waitReadyTimer = 0;
            if (state === "lineart" && animPhase === "idle") trigger();
          }, 16);
        }
        return;
      }
      trigger();
    } else if ((state === "poster" || animPhase === "invert-flash") && targetP < 0.88) {
      reset();
    }
  }

  // 指针光学棱镜扫光追踪（背景位置固定不动，不产生倾斜晃动）
  section.addEventListener("pointermove", (e) => {
    if (state !== "poster" || animPhase !== "settled" || reducedMotion.matches) return;
    const rect = section.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    section.style.setProperty("--fsk-px", px.toFixed(2) + "%");
    section.style.setProperty("--fsk-py", py.toFixed(2) + "%");
  });

  section.addEventListener("pointerleave", () => {
    section.style.setProperty("--fsk-px", "50%");
    section.style.setProperty("--fsk-py", "50%");
  });

  if (replayBtn) {
    replayBtn.addEventListener("click", () => replay());
  }

  window.addEventListener("resize", resizeFx, { passive: true });
  resizeFx();

  window.FskPosterZone = {
    inspect: () => ({
      state,
      animPhase,
      posterStateAttr: section.dataset.posterState,
      popartComplete: Boolean(popartImg && popartImg.complete && popartImg.naturalWidth > 0),
    }),
    seek: seekGlitch,
    trigger,
    replay,
    reset,
  };

  return { syncWithLineart, trigger, replay, reset };
}
