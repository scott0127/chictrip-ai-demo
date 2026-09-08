(() => {
  'use strict';

  const pageIds = ['smart-deal', 'data-back', 'social-trip'];
  const pages = pageIds.map(id => document.getElementById(id)).filter(Boolean);
  if (pages.length !== pageIds.length) return;

  const $ = id => document.getElementById(id);
  const timers = new Set();
  const animations = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activePage = null;
  const state = { habit: 'daily', safety: 'ready', redeemed: false, place: 'asakusa', step: 0, organizing: false };

  const habits = {
    light: { estimate: 0.7, quota: 1, price: 249, note: '以地圖、即時訊息為主，示範保留基本流量餘裕。' },
    daily: { estimate: 1.4, quota: 2, price: 299, note: '以導航、傳照片及一般社群使用，示範預留流量空間。' },
    heavy: { estimate: 3.2, quota: 5, price: 399, note: '以影片與熱點分享較多的情境，示範提高每日流量。' }
  };
  const places = {
    asakusa: {
      title: '東京的第一天，慢慢逛淺草。',
      text: '早上去淺草寺，穿過仲見世商店街吃點心，再沿著隅田公園散步。想和朋友一起，把這條路線放進東京 5 日遊。',
      tags: '#東京 #淺草 #朋友旅行',
      stops: '淺草寺 → 仲見世商店街 → 隅田公園',
      intent: '日本 · 東京 5 日 · 朋友同行 · 導航與照片分享',
      cardTitle: '東京 5 日遊｜淺草散步日'
    },
    shibuya: {
      title: '想和朋友逛一整天的澀谷。',
      text: '先逛澀谷十字路口與周邊店家，再到宮下公園休息，傍晚看看 SHIBUYA SKY。把東京 5 日遊留一天給逛街和拍照。',
      tags: '#東京 #澀谷 #逛街拍照',
      stops: '澀谷十字路口 → 宮下公園 → SHIBUYA SKY',
      intent: '日本 · 東京 5 日 · 朋友同行 · 導航與社群分享',
      cardTitle: '東京 5 日遊｜澀谷逛街日'
    }
  };

  function schedule(fn, delay) {
    const timer = window.setTimeout(() => { timers.delete(timer); fn(); }, delay);
    timers.add(timer);
    return timer;
  }

  function formatNumber(value, decimals = 0) {
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function numberTo(element, target, decimals = 0) {
    if (!element) return;
    const existing = animations.get(element);
    if (existing) cancelAnimationFrame(existing.frame);
    animations.delete(element);
    if (reducedMotion.matches) { element.textContent = formatNumber(target, decimals); return; }
    const start = Number(element.textContent.replace(/,/g, '')) || 0;
    const started = performance.now();
    const record = { frame: 0, target, decimals };
    const frame = now => {
      const progress = Math.min((now - started) / 650, 1);
      const value = start + (target - start) * (1 - Math.pow(1 - progress, 3));
      element.textContent = formatNumber(decimals ? value : Math.round(value), decimals);
      if (progress < 1) record.frame = requestAnimationFrame(frame);
      else animations.delete(element);
    };
    record.frame = requestAnimationFrame(frame);
    animations.set(element, record);
  }

  function pause() {
    timers.forEach(clearTimeout);
    timers.clear();
    animations.forEach((record, element) => {
      cancelAnimationFrame(record.frame);
      element.textContent = formatNumber(record.target, record.decimals);
    });
    animations.clear();
    state.organizing = false;
    updateOrganizeButton();
  }

  function replayBusiness(page) {
    const panel = page.querySelector('[data-idea-panel="business"]');
    const bars = [...panel.querySelectorAll('.idea-business-fill')];
    bars.forEach(bar => { bar.style.transition = 'none'; });
    panel.classList.remove('idea-business-active');
    panel.querySelectorAll('[data-idea-count]').forEach(element => {
      element.textContent = '0';
      numberTo(element, Number(element.dataset.ideaCount));
    });
    const steps = Array.from(panel.querySelectorAll('[data-idea-business-step]'));
    steps.forEach(step => step.classList.remove('idea-revealed'));
    void panel.offsetWidth;
    bars.forEach(bar => { bar.style.transition = ''; });
    panel.classList.add('idea-business-active');
    steps.forEach((step, index) => schedule(() => step.classList.add('idea-revealed'), reducedMotion.matches ? 0 : index * 550));
  }

  function showView(page, view) {
    pause();
    page.querySelectorAll('[data-idea-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ideaView === view)));
    page.querySelectorAll('[data-idea-panel]').forEach(panel => { panel.hidden = panel.dataset.ideaPanel !== view; });
    page.classList.remove('idea-page-entering');
    void page.offsetWidth;
    page.classList.add('idea-page-entering');
    if (view === 'business') replayBusiness(page);
  }

  pages.forEach(page => {
    page.querySelectorAll('[data-idea-view]').forEach(button => button.addEventListener('click', () => showView(page, button.dataset.ideaView)));
    page.querySelectorAll('[data-idea-replay]').forEach(button => button.addEventListener('click', () => { pause(); replayBusiness(page); }));
  });

  function renderSafety() {
    const shortage = $('smart-shortage');
    const claim = $('smart-claim');
    shortage.hidden = state.safety !== 'ready';
    claim.hidden = state.safety !== 'shortage';
    $('smart-reset').hidden = state.safety === 'ready';
    $('smart-safety-status').textContent = {
      ready: '用量不夠時，還有一次補充機會。',
      shortage: '已模擬流量不足，可領取一次 500MB 補充。',
      claimed: '已領取 500MB 安心包。此體驗已使用一次補充資格。'
    }[state.safety];
  }

  function selectHabit(habit) {
    const selected = habits[habit];
    if (!selected || habit === state.habit) return;
    state.habit = habit;
    state.safety = 'ready';
    $('smart-deal').querySelectorAll('[data-habit]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.habit === habit)));
    numberTo($('smart-estimate'), selected.estimate, 1);
    numberTo($('smart-plan-quota'), selected.quota);
    numberTo($('smart-price'), selected.price);
    numberTo($('smart-saving'), 499 - selected.price);
    $('smart-plan-name').textContent = `日本 ${selected.quota}GB／日 · 5 日`;
    $('smart-habit-note').textContent = selected.note;
    renderSafety();
  }

  $('smart-deal').querySelectorAll('[data-habit]').forEach(button => button.addEventListener('click', () => selectHabit(button.dataset.habit)));
  $('smart-shortage').addEventListener('click', () => {
    if (state.safety !== 'ready') return;
    state.safety = 'shortage';
    renderSafety();
    $('smart-claim').focus();
  });
  $('smart-claim').addEventListener('click', () => {
    if (state.safety !== 'shortage') return;
    state.safety = 'claimed';
    renderSafety();
    $('smart-reset').focus();
  });
  $('smart-reset').addEventListener('click', () => {
    state.safety = 'ready';
    renderSafety();
    $('smart-shortage').focus();
  });

  function usageValues() {
    const usedTenths = Math.max(0, Math.min(100, Math.round(Number($('data-usage').value) * 10)));
    const leftTenths = 100 - usedTenths;
    return { used: usedTenths / 10, left: leftTenths / 10, coins: Math.min(60, Math.floor(leftTenths * 16 / 10)) };
  }

  function updateUsage(animate = true) {
    const { used, left, coins } = usageValues();
    $('data-used').textContent = used.toFixed(1);
    $('data-used-legend').textContent = used.toFixed(1);
    $('data-left-legend').textContent = left.toFixed(1);
    $('data-used-bar').style.width = `${used * 10}%`;
    $('data-usage').setAttribute('aria-valuetext', `已使用 ${used.toFixed(1)} GB，剩餘 ${left.toFixed(1)} GB`);
    if (animate) { numberTo($('data-left'), left, 1); numberTo($('data-coins'), coins); }
    else { $('data-left').textContent = left.toFixed(1); $('data-coins').textContent = String(coins); }
    $('data-usage').disabled = state.redeemed;
    $('data-redeem').disabled = state.redeemed || coins === 0;
    $('data-redeem').textContent = state.redeemed ? `已兌換 ${coins} chicCoin ✓` : `兌換 ${coins} chicCoin →`;
    $('data-reset').hidden = !state.redeemed;
    $('data-status').textContent = state.redeemed
      ? `模擬 ${coins} chicCoin 已存入下趟旅金，有效 90 天，本次不可重複兌換。`
      : coins === 0 ? '本方案流量已用完，目前沒有可兌換的剩餘流量。' : '可抵下次符合資格的消費，不可現金提領；模擬有效期 90 天。';
  }

  $('data-usage').addEventListener('input', () => { if (!state.redeemed) updateUsage(); });
  $('data-redeem').addEventListener('click', () => {
    if (state.redeemed || usageValues().coins === 0) return;
    state.redeemed = true;
    updateUsage();
    $('data-reset').focus();
  });
  $('data-reset').addEventListener('click', () => {
    state.redeemed = false;
    updateUsage();
    $('data-usage').focus();
  });

  function updateOrganizeButton() {
    const button = $('social-organize');
    if (!button) return;
    button.disabled = state.organizing;
    button.textContent = state.organizing ? '正在整理…' : state.step === 3 ? '重新整理行程 ↺' : state.step > 0 ? '繼續整理行程 →' : '整理成行程 →';
  }

  function renderSocialSteps() {
    $('social-trip').querySelectorAll('[data-social-step]').forEach(step => step.classList.toggle('idea-revealed', Number(step.dataset.socialStep) <= state.step));
    $('social-progress-label').textContent = `${state.step} / 3`;
    $('social-share').disabled = state.step < 3;
    $('social-process-status').textContent = [
      '選一則靈感，看看它如何連到下一步。',
      '景點已整理，接著把旅行需求補齊。',
      '旅遊意圖已確認，連到網路與旅伴入口。',
      '從靈感到準備，現在可以產生分享卡。'
    ][state.step];
  }

  function selectPlace(place) {
    if (!places[place] || state.place === place) return;
    pause();
    state.place = place;
    state.step = 0;
    const content = places[place];
    $('social-trip').querySelectorAll('[data-social-place]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.socialPlace === place)));
    $('social-source-title').textContent = content.title;
    $('social-source-text').textContent = content.text;
    $('social-source-tag').textContent = content.tags;
    $('social-stops').textContent = content.stops;
    $('social-intent').textContent = content.intent;
    $('social-share-card').hidden = true;
    $('social-copy-status').textContent = '';
    renderSocialSteps();
    updateOrganizeButton();
  }

  function organizeNext() {
    if (!state.organizing) return;
    state.step = Math.min(state.step + 1, 3);
    renderSocialSteps();
    if (state.step < 3) schedule(organizeNext, reducedMotion.matches ? 0 : 650);
    else { state.organizing = false; updateOrganizeButton(); }
  }

  $('social-trip').querySelectorAll('[data-social-place]').forEach(button => button.addEventListener('click', () => selectPlace(button.dataset.socialPlace)));
  $('social-organize').addEventListener('click', () => {
    if (state.organizing) return;
    if (state.step === 3) { state.step = 0; $('social-share-card').hidden = true; }
    state.organizing = true;
    renderSocialSteps();
    updateOrganizeButton();
    schedule(organizeNext, reducedMotion.matches ? 0 : 350);
  });
  $('social-share').addEventListener('click', () => {
    if (state.step < 3) return;
    const content = places[state.place];
    $('social-share-text').value = `${content.cardTitle}\n一日路線：${content.stops}\n旅行準備：日本 5 日 eSIM，依使用習慣挑選。\n旅伴邀請：一起加入去趣共編，把想去的地方加進來！\n概念 Demo · Mock 行程；不包含真實共編邀請連結。`;
    $('social-share-card').hidden = false;
    $('social-copy-status').textContent = '';
    $('social-share-card').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
    $('social-share-text').focus({ preventScroll: true });
  });
  $('social-copy').addEventListener('click', async () => {
    const field = $('social-share-text');
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(field.value); copied = true; }
    } catch (_) { /* Offline browsers may require a manual copy. */ }
    if (!copied) {
      field.focus();
      field.select();
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    }
    $('social-copy-status').textContent = copied ? '已複製，可自行貼到聊天或筆記。' : '已選取文字，請按 Ctrl+C 或 ⌘C 複製。';
  });

  function onPage(id) {
    pause();
    activePage = pageIds.includes(id) ? $(id) : null;
    if (!activePage) return;
    activePage.classList.remove('idea-page-entering');
    void activePage.offsetWidth;
    activePage.classList.add('idea-page-entering');
    if (!activePage.querySelector('[data-idea-panel="business"]').hidden) replayBusiness(activePage);
  }

  window.OtherIdeas = { onPage, pause };
  updateUsage(false);
  renderSafety();
  renderSocialSteps();
  updateOrganizeButton();
})();
