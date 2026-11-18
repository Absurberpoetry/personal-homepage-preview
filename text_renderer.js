/* 浮动文字只在脱离时栅格化一次；运动期间只更新GPU精灵的矩阵和高亮透明度。 */
(function () {
  function capture(row) {
    const style = getComputedStyle(row);
    const font = { size: parseFloat(style.fontSize), weight: style.fontWeight, family: style.fontFamily,
      spacing: style.letterSpacing, color: style.color };
    row.getAnimations().forEach(animation => animation.cancel());
    row.style.transition = 'none'; row.style.scale = '1'; row.style.transform = 'none';
    const rect = row.getBoundingClientRect();
    const node = row.firstChild;
    const range = document.createRange();
    const lineHeight = parseFloat(style.lineHeight);
    const lines = [];
    const segments = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(row.textContent)].map(s => ({ text: s.segment, index: s.index }))
      : Array.from(row.textContent).reduce((result, text) => { result.push({ text, index: result.length ? result.at(-1).index + result.at(-1).text.length : 0 }); return result; }, []);
    for (const segment of segments) {
      range.setStart(node, segment.index); range.setEnd(node, segment.index + segment.text.length);
      const r = range.getBoundingClientRect();
      if (r.width < 0.01) continue; // collapsed whitespace / zero width characters
      let line = lines.find(line => Math.abs(line.cy - (r.top + r.height / 2)) < lineHeight * 0.5);
      if (!line) {
        line = { text: '', left: r.left, top: r.top, right: r.right, bottom: r.bottom, cy: r.top + r.height / 2 };
        lines.push(line);
      }
      line.text += segment.text;
      line.left = Math.min(line.left, r.left); line.top = Math.min(line.top, r.top);
      line.right = Math.max(line.right, r.right); line.bottom = Math.max(line.bottom, r.bottom);
    }
    const left = Math.min(...lines.map(l => l.left)) - 0.5;
    const top = Math.min(...lines.map(l => l.top)) - 0.5;
    const width = Math.max(...lines.map(l => l.right)) - left + 0.5;
    const height = Math.max(...lines.map(l => l.bottom)) - top + 0.5;
    const rectangles = lines.map(l => ({ left: l.left - 0.5, top: l.top - 0.5, width: l.right - l.left + 1, height: l.bottom - l.top + 1 }));
    return { text: row.textContent, font, left, top, width, height, lines, rectangles,
      sourceW: row.offsetWidth, sourceH: row.offsetHeight, sourceLeft: rect.left, sourceTop: rect.top };
  }
  function rasterize(data, highlight, resolution) {
    const padding = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((data.width + padding * 2) * resolution);
    canvas.height = Math.ceil((data.height + padding * 2) * resolution);
    const ctx = canvas.getContext('2d');
    ctx.scale(resolution, resolution);
    ctx.font = `${data.font.weight} ${data.font.size}px ${data.font.family}`;
    ctx.fontKerning = 'normal';
    if ('letterSpacing' in ctx) ctx.letterSpacing = data.font.spacing;
    ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    for (const line of data.lines) {
      const text = line.text.replace(/\s+/g, ' ');
      const metrics = ctx.measureText(text);
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      ctx.save();
      ctx.translate(line.left - data.left + padding, line.top - data.top + padding);
      // Match the DOM fragment's measured size even with mixed CJK fallback fonts.
      const sx = (line.right - line.left) / Math.max(1, metrics.width);
      const sy = (line.bottom - line.top) / Math.max(1, ascent + descent);
      ctx.scale(sx, sy);
      ctx.strokeStyle = highlight ? '#c9eaf0' : '#000000';
      ctx.lineWidth = highlight ? 0.4 : 0.7;
      ctx.strokeText(text, 0, ascent);
      if (!highlight) { ctx.fillStyle = data.font.color; ctx.fillText(text, 0, ascent); }
      ctx.restore();
    }
    return canvas;
  }
  window.createPhysicsTextRenderer = function (host) {
    const P = window.PIXI;
    const resolution = Math.min(2, window.devicePixelRatio || 1);
    const textureResolution = Math.max(2, resolution);
    const app = new P.Application({ width: document.documentElement.clientWidth, height: window.innerHeight,
      // Text textures are already supersampled. Full-screen MSAA adds bandwidth
      // and stalls on integrated/software GPUs without improving these sprites.
      resolution, autoDensity: true, backgroundAlpha: 0, antialias: false, autoStart: false,
      sharedTicker: false, powerPreference: 'high-performance' });
    app.stop();
    app.stage.eventMode = 'none';
    const canvas = app.view;
    canvas.className = 'text-physics-canvas'; canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '拖动的文字画布，Delete移除当前文字，刷新恢复');
    host.appendChild(canvas);
    const gl = app.renderer.gl;
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      canvas, capture,
      driver: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
      type: app.renderer.type === P.RENDERER_TYPE.WEBGL ? 'WebGL' : 'Canvas',
      add(data, cx, cy) {
        const container = new P.Container();
        const normalTexture = new P.Texture(P.BaseTexture.from(rasterize(data, false, textureResolution), { resolution: textureResolution }));
        const glowTexture = new P.Texture(P.BaseTexture.from(rasterize(data, true, textureResolution), { resolution: textureResolution }));
        const normal = new P.Sprite(normalTexture), glow = new P.Sprite(glowTexture);
        normal.position.set(-2, -2); glow.position.set(-2, -2); glow.alpha = 0;
        container.addChild(normal, glow); container.pivot.set(cx, cy);
        app.stage.addChild(container);
        return { container, glow, alpha: 0, normalTexture, glowTexture };
      },
      paint(view, x, y, angle) { view.container.position.set(x, y); view.container.rotation = angle; },
      highlight(view, target, dt) {
        const alpha = view.alpha + (target - view.alpha) * (1 - Math.exp(-dt / 55));
        view.alpha = Math.abs(alpha - target) < 0.002 ? target : alpha;
        view.glow.alpha = view.alpha;
        return view.alpha !== target;
      },
      remove(view) { view.container.destroy({ children: true }); view.normalTexture.destroy(true); view.glowTexture.destroy(true); },
      resize(width, height) { app.renderer.resize(width, height); },
      warmup() {
        const pixel = new P.Sprite(P.Texture.WHITE); pixel.width = pixel.height = 2;
        app.stage.addChild(pixel); app.renderer.render(app.stage);
        pixel.destroy(); app.renderer.render(app.stage);
      },
      render() { app.renderer.render(app.stage); }
    };
  };
})();
