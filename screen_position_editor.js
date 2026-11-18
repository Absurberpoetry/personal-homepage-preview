document.addEventListener('DOMContentLoaded', () => {
  const stage = document.getElementById('characterStage');
  const main = document.getElementById('deskMonitor');
  const secondary = document.querySelector('.secondary-monitor');
  const keyboard = document.getElementById('deskKeyboard');
  const chair = document.querySelector('.ergonomic-chair');
  if (!stage || !main || !secondary || !keyboard || !chair) return;
  const mouse = document.getElementById('deskMouse');
  const screens = { main, secondary, keyboard, chair, ...(mouse ? { mouse } : {}) };
  const storageKey = 'portfolio-screen-positions-v1';
  const defaults = () => ({ main: { x: 0, y: 0 }, secondary: { x: 0, y: 0 }, keyboard: { x: 0, y: 0 }, chair: { x: 0, y: 0 }, mouse: { x: 0, y: 0 } });
  let positions = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    for (const id of Object.keys(screens)) {
      if (Number.isFinite(saved?.[id]?.x) && Number.isFinite(saved?.[id]?.y)) positions[id] = saved[id];
    }
  } catch (_) { /* 本地存储不可用时仍支持本次拖动。 */ }
  function apply() {
    for (const [id, screen] of Object.entries(screens)) {
      screen.style.translate = `${positions[id].x}px ${positions[id].y}px`;
    }
    window.dispatchEvent(new Event('screen-layout-change'));
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(positions)); } catch (_) {}
  }
  apply();
  const tools = document.createElement('div');
  tools.className = 'screen-editor-tools';
  tools.innerHTML = '<button type="button" aria-pressed="false">调整工位位置</button><button type="button" hidden>导出位置</button><button type="button" hidden>重置位置</button><span hidden>拖动屏幕、键盘、鼠标或椅子露出的部分 · 方向键微调，Shift 加速</span>';
  // 工具栏放在场景外，保持文字及按钮正常大小。
  // 工位位置编辑器保留内部能力，但不在主页显示调整按钮。
  const [toggle, download, reset] = tools.querySelectorAll('button');
  const hint = tools.querySelector('span');
  let enabled = false;
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    stage.classList.toggle('editing-screens', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? '完成调整' : '调整工位位置';
    download.hidden = reset.hidden = hint.hidden = !enabled;
    for (const screen of Object.values(screens)) screen.tabIndex = enabled ? 0 : -1;
  });
  for (const [id, screen] of Object.entries(screens)) {
    screen.setAttribute('aria-label', `${{main: '主屏', secondary: '副屏', keyboard: '键盘', chair: '工学椅', mouse: '鼠标'}[id]}，调整模式下可拖动`);
    screen.addEventListener('dragstart', event => event.preventDefault());
    let drag = null;
    screen.addEventListener('pointerdown', event => {
      if (!enabled || event.button !== 0) return;
      event.preventDefault();
      screen.focus();
      screen.setPointerCapture(event.pointerId);
      // 场景本身有缩放：屏幕坐标差换算为场景布局像素。
      // 椅子位于人物容器内，还需计入人物自身的0.72缩放。
      const parent = id === 'chair' ? document.getElementById('catWorker') : stage;
      const scale = parent.getBoundingClientRect().width / parent.offsetWidth;
      drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY,
        initial: { ...positions[id] }, scale };
    });
    screen.addEventListener('pointermove', event => {
      if (!drag || drag.pointer !== event.pointerId) return;
      positions[id] = {
        x: drag.initial.x + (event.clientX - drag.x) / drag.scale,
        y: drag.initial.y + (event.clientY - drag.y) / drag.scale
      };
      apply();
    });
    function finish() { if (drag) { drag = null; save(); } }
    screen.addEventListener('pointerup', finish);
    screen.addEventListener('pointercancel', finish);
    screen.addEventListener('lostpointercapture', finish);
    screen.addEventListener('keydown', event => {
      if (!enabled) return;
      const step = event.shiftKey ? 10 : 1;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!delta) return;
      event.preventDefault();
      positions[id].x += delta[0]; positions[id].y += delta[1];
      apply(); save();
    });
  }
  reset.addEventListener('click', () => {
    positions = defaults();
    apply(); save();
  });
  download.addEventListener('click', () => {
    const data = { version: 1, units: 'scene-px', positions,
      stage: { width: stage.offsetWidth, height: stage.offsetHeight } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'screen_positions.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
});
