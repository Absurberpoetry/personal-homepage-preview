document.addEventListener('DOMContentLoaded', () => {
  const stage = document.getElementById('characterStage');
  if (!stage) return;
  const light = stage.querySelector('.dual-screen-light');
  const screens = [stage.querySelector('.office-straight-monitor'), stage.querySelector('.secondary-monitor')];
  light.replaceChildren();
  const pools = screens.map(() => {
    const beam = document.createElement('div');
    beam.className = 'night-screen-spill';
    light.appendChild(beam);
    return beam;
  });
  function update() {
    const bounds = stage.getBoundingClientRect();
    const scale = bounds.width / stage.offsetWidth;
    screens.forEach((screen, index) => {
      if (!screen) return;
      const rect = screen.getBoundingClientRect();
      const x = (rect.left - bounds.left) / scale;
      const y = (rect.top - bounds.top) / scale;
      const h = rect.height / scale;
      Object.assign(pools[index].style, {
        left: `${x - 115}px`, top: `${y + h * 0.1}px`,
        width: '140px', height: `${h * 0.8}px`
      });
    });
  }
  window.addEventListener('screen-layout-change', update);
  window.addEventListener('resize', update);
  update();
  // 模拟屏幕内容切换：每次随机选择目标色温/亮度，平滑过渡且不固定循环。
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palettes = ['174 217 255', '146 220 242', '196 204 255', '213 233 248', '157 194 239'];
  let timer;
  const random = (min, max) => min + Math.random() * (max - min);
  function changeScreenContent() {
    clearTimeout(timer);
    const duration = random(1600, 3600);
    stage.style.setProperty('--screen-change-time', `${duration.toFixed(0)}ms`);
    const color = palettes[Math.floor(Math.random() * palettes.length)];
    // 不在整个场景根节点动画化继承变量（该子树有数千个SVG面/线）。
    for (const target of [light, stage.querySelector('.character-rig'), stage.querySelector('.screen-flyouts')]) {
      target?.style.setProperty('--screen-rgb', color);
    }
    stage.style.setProperty('--character-exposure', random(0.63, 0.84).toFixed(3));
    stage.style.setProperty('--face-reflection', random(0.22, 0.45).toFixed(3));
    pools.forEach((pool, index) => {
      pool.style.opacity = random(index ? 0.45 : 0.6, 1).toFixed(3);
    });
    if (!reducedMotion.matches && !document.hidden) {
      timer = setTimeout(changeScreenContent, duration + random(800, 2800));
    }
  }
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden) changeScreenContent();
  });
  reducedMotion.addEventListener('change', changeScreenContent);
  changeScreenContent();
});
