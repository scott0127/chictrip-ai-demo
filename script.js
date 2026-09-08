(() => {
  'use strict';

  const pages = ['overview', 'demo', 'flow', 'business', 'winwin', 'smart-deal', 'data-back', 'social-trip'];
  const labels = ['概念', '行程 Demo', '轉換流程', '商業模式', '雙方收益', '買剛剛好', '流量變旅金', '靈感成行'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let currentPage = '';
  let animationVersion = 0;
  let pageTimers = [];
  let flowStep = 0;
  let flowPlaying = false;
  let flowTimer;
  let flowStartTimer;



  function later(callback, delay) {
    pageTimers.push(window.setTimeout(callback, reducedMotion.matches ? 0 : delay));
  }

  function countUp(element, end, duration = 1050) {
    const version = animationVersion;
    const start = performance.now();
    element.textContent = '0';
    if (reducedMotion.matches) { element.textContent = end; return; }
    function tick(now) {
      if (version !== animationVersion) return;
      const progress = Math.min((now - start) / duration, 1);
      element.textContent = Math.round(end * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function showPage(id, moveFocus = true) {
    const index = pages.indexOf(id);
    if (index < 0 || id === currentPage) return;
    pageTimers.forEach(clearTimeout);
    pageTimers = [];
    animationVersion++;
    pauseFlow();
    window.TripMap.pause();
    window.OtherIdeas?.pause();
    currentPage = id;
    $$('.page').forEach((page) => {
      page.hidden = page.id !== id;
      page.classList.remove('entering');
    });
    const active = document.getElementById(id);
    active.classList.add('entering');
    $$('.main-nav a').forEach((link, i) => {
      link.classList.toggle('active', i === index);
      if (i === index) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('#page-current').textContent = String(index + 1).padStart(2, '0');
    $('#page-caption').textContent = labels[index];
    $('#previous-page').disabled = index === 0;
    $('#next-page').disabled = index === pages.length - 1;
    document.title = `${labels[index]} · 旅伴組隊省`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (moveFocus) active.querySelector('h1').focus({ preventScroll: true });
    if (id === 'overview') {
      $$('[data-count]').forEach((element) => countUp(element, Number(element.dataset.count)));
      $$('.hero-avatar').forEach((avatar, i) => {
        avatar.classList.remove('arrive');
        avatar.style.animationDelay = `${i * 140}ms`;
        avatar.classList.add('arrive');
      });
    }
    if (id === 'demo') requestAnimationFrame(() => window.TripMap.refresh());
    if (id === 'flow') { resetFlow(); flowStartTimer = window.setTimeout(playFlow, reducedMotion.matches ? 0 : 350); }
    if (id === 'business') animateBusiness();
    if (id === 'winwin') animateWinWin();
    window.OtherIdeas?.onPage(id);
  }

  function navigate(index) {
    if (index >= 0 && index < pages.length) location.hash = pages[index];
  }

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    showPage(pages.includes(id) ? id : 'overview');
  });
  $('#previous-page').addEventListener('click', () => navigate(pages.indexOf(currentPage) - 1));
  $('#next-page').addEventListener('click', () => navigate(pages.indexOf(currentPage) + 1));
  $('.skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    document.getElementById(currentPage).querySelector('h1').focus();
  });
  document.addEventListener('keydown', (event) => {
    if (document.querySelector('dialog[open]')) return;
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.closest('[role="tablist"], #trip-map')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(pages.indexOf(currentPage) + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });

  function setDay(day) {
    $$('.day-tabs button').forEach((button) => {
      const selected = Number(button.dataset.day) === day;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    $('#day-plan').setAttribute('aria-labelledby', day < 0 ? 'day-tab-all' : `day-tab-${day}`);
    window.TripMap.setDay(day);
  }
  $$('.day-tabs button').forEach((button, index, buttons) => {
    button.addEventListener('click', () => setDay(Number(button.dataset.day)));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? 5 : (index + (event.key === 'ArrowRight' ? 1 : 5)) % 6;
      setDay(Number(buttons[target].dataset.day));
      buttons[target].focus();
    });
  });
  document.addEventListener('trip-select-day', (event) => setDay(event.detail));

  $('#reset-demo').addEventListener('click', () => {
    window.GroupDeal.reset();
    window.TripMap.reset();
    setDay(0);
  });

  const flowInsights = [
    '準備好，從 Scott 的一份行程開始。',
    '行前意圖：Scott 已經決定去東京，接下來就是一起出發的人。',
    '自由共編：任何朋友都能加入同一份行程，與 eSIM 購買資格分開。',
    '使用理由：不只為了優惠，旅伴開始一起加景點、查看每日行程。',
    '自選購買：只有有效 eSIM 訂單累計 2／3／4 人福利；這個示例剛好 4 人購買。',
    '成效彙總：1 位原用戶 + 3 位新用戶，旅行結束後再驗證留存。'
  ];
  function renderFlow() {
    $$('.flow-nodes li').forEach((node, i) => {
      node.classList.toggle('lit', i < flowStep);
      node.classList.toggle('current', i === flowStep - 1);
    });
    $('#flow-counter').textContent = `${String(flowStep).padStart(2, '0')} / 05`;
    $('#flow-insight').textContent = flowInsights[flowStep];
    $('#next-flow').disabled = flowStep === 5;
    $('#play-flow').textContent = flowPlaying ? '暫停播放 Ⅱ' : flowStep === 5 ? '重播流程 ↺' : flowStep > 0 ? '繼續播放 ▷' : '播放流程 ▷';
  }
  function pauseFlow() { clearTimeout(flowStartTimer); clearTimeout(flowTimer); flowPlaying = false; renderFlow(); }
  function resetFlow() { clearTimeout(flowStartTimer); clearTimeout(flowTimer); flowStep = 0; flowPlaying = false; renderFlow(); }
  function advanceFlow() {
    if (flowStep >= 5) return;
    flowStep++;
    if (flowStep === 5) flowPlaying = false;
    renderFlow();
    if (flowPlaying) flowTimer = window.setTimeout(advanceFlow, 1050);
  }
  function playFlow() {
    clearTimeout(flowStartTimer);
    if (flowPlaying) { pauseFlow(); return; }
    if (flowStep === 5) resetFlow();
    if (reducedMotion.matches) { flowStep = 5; flowPlaying = false; renderFlow(); return; }
    flowPlaying = true;
    advanceFlow();
  }
  $('#play-flow').addEventListener('click', playFlow);
  $('#next-flow').addEventListener('click', () => { pauseFlow(); advanceFlow(); });

  function animateBusiness() {
    const comparison = $('.business-grid');
    comparison.querySelectorAll('.business-bar').forEach((bar) => { bar.style.transition = 'none'; });
    comparison.classList.remove('animated');
    void comparison.offsetWidth;
    comparison.querySelectorAll('.business-bar').forEach((bar) => { bar.style.transition = ''; });
    comparison.classList.add('animated');
    $$('[data-business-count]').forEach((element) => countUp(element, Number(element.dataset.businessCount)));
  }
  $('#replay-business').addEventListener('click', () => { animationVersion++; animateBusiness(); });

  function animateWinWin() {
    $$('[data-win]').forEach((element) => element.classList.remove('revealed'));
    for (let i = 0; i < 3; i++) later(() => $$(`[data-win="${i}"]`).forEach((element) => element.classList.add('revealed')), 200 + i * 650);
  }
  $('#replay-winwin').addEventListener('click', () => {
    pageTimers.forEach(clearTimeout);
    pageTimers = [];
    animateWinWin();
  });

  setDay(0);
  const initialPage = location.hash.slice(1);
  showPage(pages.includes(initialPage) ? initialPage : 'overview', false);
})();
