(() => {
  const params=new URLSearchParams(location.search);
  if(!params.has('mobile')&&!matchMedia('(max-width:800px)').matches)return;
  document.documentElement.classList.add('mobile-mode');
  document.getElementById('apply').textContent='儲存這份草案';
  document.getElementById('step-3').innerHTML='<span>3</span>預覽，喜歡再儲存';
  document.querySelector('#saved-dialog h2').textContent='我的行程草案';
  document.addEventListener('click',event=>{
    const id=event.target.closest('button')?.id;
    if(!['apply','saved-open'].includes(id))return;
    const note=document.querySelector('#saved-content .saved-notice');if(note)note.textContent=note.textContent.includes('還沒有')?'尚無已儲存草案；生成後按「儲存這份草案」即可。':'草案已獨立儲存於本機，可從手機行程的「已儲存」查看。';
    if(id!=='apply')return;
    document.getElementById('draft-state').textContent='已儲存';
    document.getElementById('toast').textContent='已儲存草案，可從手機行程的「已儲存」查看。';
  });
  const back=document.createElement('a');back.href='../mobile-trip/index.html#trip';back.className='mobile-back';back.setAttribute('aria-label','返回手機行程');back.textContent='‹';document.querySelector('.app-header').prepend(back);
  const assistant=document.querySelector('.assistant-panel');assistant.id='mobile-assistant';document.querySelector('.map-panel').id='mobile-map-panel';
  document.getElementById('map').after(document.getElementById('place-popover'));
  const nav=document.createElement('nav');nav.className='mobile-step-nav';nav.setAttribute('aria-label','排程步驟');nav.innerHTML='<a href="#mobile-map-panel">1 圈選區域 ↑</a><a href="#mobile-assistant">2 說說你的偏好 ↓</a>';document.body.append(nav);
  document.querySelectorAll('.mobile-step-nav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector(a.hash).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});}));
  assistant.style.scrollMarginTop='80px';document.querySelector('.map-panel').style.scrollMarginTop='80px';
  if(params.get('inspiration')==='east')document.querySelector('[data-area="east"]').click();
})();
