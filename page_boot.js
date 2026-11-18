/* 在其他脚本之前提供启动屏障；素材解码/字体/WebGL就绪后统一开始场景。 */
(function () {
  let resolveReady, sealed = false, failed = false, total = 0, complete = 0;
  const jobs = [], started = performance.now();
  const ready = new Promise(resolve => { resolveReady = resolve; });
  function progress(label) {
    const ratio = total ? complete / total : 0;
    const bar = document.getElementById('loadingProgress');
    if (bar) bar.style.transform = `scaleX(${ratio})`;
    const count = document.getElementById('loadingCount');
    if (count) count.textContent = `${Math.floor(ratio * 100)}%`;
    const status = document.getElementById('loadingStatus');
    if (status && !failed) status.textContent = complete === total ? '准备进入你的空间' : label;
  }
  function register(label, promise) {
    if (sealed) throw new Error('PageBoot: resource registered after boot sealed');
    total++;
    const job = Promise.resolve(promise).then(() => { complete++; progress(label); }, error => {
      failed = true;
      const status = document.getElementById('loadingStatus');
      if (status) status.textContent = `「${label}」未能准备好，请重试`;
      document.getElementById('retryLoading')?.removeAttribute('hidden');
      console.error('Page resource failed:', label, error);
    });
    jobs.push(job); progress(label);
    return job;
  }
  function imageReady(image) {
    return new Promise((resolve, reject) => {
      const decode = () => {
        if (!image.naturalWidth) { reject(new Error('Image unavailable: ' + image.src)); return; }
        (image.decode ? image.decode() : Promise.resolve()).then(resolve, reject);
      };
      if (image.complete) decode();
      else { image.addEventListener('load', decode, { once: true }); image.addEventListener('error', reject, { once: true }); }
    });
  }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function fontsReady() {
    const links = [...document.querySelectorAll('[data-font-styles]')];
    let sentences = '';
    try { const saved = JSON.parse(localStorage.getItem('portfolio-note-stream-v2')); if (Array.isArray(saved)) sentences = saved.join('').slice(0, 4096); } catch (_) {}
    let timeout;
    const loaded = Promise.all(links.map(link => new Promise(resolve => {
      if (link.media === 'all' || link.sheet || link.dataset.failed) resolve();
      else { link.addEventListener('load', resolve, { once: true }); link.addEventListener('error', resolve, { once: true }); }
    }))).then(() => Promise.all([
      document.fonts.load('500 24px "Nunito"', 'Keep moving' + sentences),
      document.fonts.load('400 24px "ZCOOL KuaiLe"', '这是一句随手写下的话' + sentences),
      document.fonts.load('400 16px "Noto Sans SC"', '添加编辑保存取消句库')
    ]));
    try {
      const ok = await Promise.race([loaded.then(() => true), new Promise(resolve => { timeout = setTimeout(() => resolve(false), 6000); })]);
      if (!ok) links.forEach(link => link.remove()); // 稳定使用后备字形，不让迟到字体再改变布局。
    } catch (_) { links.forEach(link => link.remove()); }
    finally { clearTimeout(timeout); }
  }
  window.PageBoot = { ready, register, imageReady };
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('retryLoading')?.addEventListener('click', () => location.reload());
    document.querySelectorAll('#characterStage img').forEach(image => register('角色素材', imageReady(image)));
    const mask = new Image(); mask.src = 'character/body.png';
    register('角色反光', imageReady(mask));
    register('字体', fontsReady());
    // DOMContentLoaded的其他初始化器需要先有机会注册自己的异步资源。
    setTimeout(async () => {
      sealed = true;
      await Promise.all(jobs);
      if (failed) return;
      await delay(Math.max(0, 650 - (performance.now() - started)));
      progress('准备进入你的空间');
      document.documentElement.classList.remove('page-loading');
      const content = document.querySelector('.viewport-scroller');
      if (content) content.inert = false;
      const loader = document.getElementById('pageLoader');
      loader?.classList.add('is-complete');
      await delay(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280);
      if (loader) loader.hidden = true;
      window.PageBoot.complete = true;
      resolveReady();
      window.dispatchEvent(new Event('page-ready'));
    }, 0);
  });
})();
