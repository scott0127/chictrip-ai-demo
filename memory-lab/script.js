(() => {
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const views = [
    {name:'我的視角',zoom:1,origin:'50% 50%'},
    {name:'小宇的視角',zoom:1.85,origin:'12% 74%'},
    {name:'阿晴的視角',zoom:1.7,origin:'62% 96%'}
  ];
  let current=0,poetry=false,tilt=true,seen=new Set(),swapTimer,toastTimer,trigger;
  const uploads=new Map();
  try{seen=new Set(JSON.parse(localStorage.getItem('chictrip-memory-lab-seen')||'[]').filter(x=>['light','ticket'].includes(x)));}catch{}
  function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
  function updateSeen(){document.querySelectorAll('[data-memory]').forEach(b=>{b.classList.toggle('seen',seen.has(b.dataset.memory));b.querySelector('span').textContent=seen.has(b.dataset.memory)?'✓':'＋';});$('collected').textContent=`${seen.size} / 2 已打開`;try{localStorage.setItem('chictrip-memory-lab-seen',JSON.stringify([...seen]));}catch{}}
  function resetTilt(){$('print').style.setProperty('--rx','0deg');$('print').style.setProperty('--ry','0deg');}
  function mode(value){poetry=value;$('print').classList.toggle('poetry',value);$('original').setAttribute('aria-pressed',!value);$('poetry').setAttribute('aria-pressed',value);$('hotspots').inert=value;$('photo-label').textContent=views[current].name+(value?' · 攝影詩頁':' · 原照片');$('hint').textContent=value?'把那一晚，收成一張作品。':uploads.has(current)?'本機照片僅供預覽；對應的 AI 作品尚未生成。':current===0?'輕移游標，或拖動照片。點 ＋ 打開小回憶。':'示範不同取景。換上旅伴照片，就能看見不同記憶。';resetTilt();}
  function select(index){clearTimeout(swapTimer);current=index;mode(false);document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.view)===index));$('view-count').textContent=`0${index+1} / 03`;$('photo').classList.add('switching');swapTimer=setTimeout(()=>{const v=views[index];$('photo').src=uploads.get(index)||'assets/osaka.jpg';$('photo').alt=uploads.has(index)?`${v.name}，本機選擇的照片`:`${v.name}，同張通天閣照片的示範取景`;$('print').style.setProperty('--zoom',uploads.has(index)?1:v.zoom);$('print').style.setProperty('--origin',v.origin);$('print').classList.toggle('detail-view',index!==0||uploads.has(index));$('reset').hidden=!uploads.has(index);$('poetry').disabled=uploads.has(index);$('poetry').title=uploads.has(index)?'本機照片尚未生成 AI 作品':'';$('photo').classList.remove('switching');},reduced.matches?0:120);}
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>select(Number(b.dataset.view)));
  $('original').onclick=()=>mode(false);$('poetry').onclick=()=>{if(!uploads.has(current))mode(true);};
  $('tilt').onclick=()=>{tilt=!tilt;$('tilt').textContent=`空間感 ${tilt?'開':'關'}`;$('tilt').setAttribute('aria-pressed',tilt);resetTilt();};
  $('space').addEventListener('pointermove',e=>{if(!tilt||poetry||reduced.matches||(e.pointerType==='touch'&&!e.buttons))return;const r=$('space').getBoundingClientRect();$('print').style.setProperty('--rx',`${-(e.clientY-r.top-r.height/2)/r.height*4}deg`);$('print').style.setProperty('--ry',`${(e.clientX-r.left-r.width/2)/r.width*5}deg`);});
  $('space').addEventListener('pointerleave',resetTilt);$('space').addEventListener('pointerup',resetTilt);
  function open(content,button){trigger=button;$('detail-content').innerHTML=content;$('detail').showModal();}
  const content={light:`<div class="eyebrow">A LITTLE MEMORY · 01</div><h2 id="dialog-title">抬頭，剛好是藍色。</h2><img class="detail-photo" src="assets/osaka.jpg" alt="通天閣藍色燈光，實景照片細節"><p>本來只想拍一張，最後每個人都停下來了。</p><p class="demo-note">示範回憶短句 · 裁切自同一張實景照</p>`,ticket:`<div class="eyebrow">A LITTLE MEMORY · 02</div><h2 id="dialog-title">再晚一點回去吧。</h2><div class="ticket-card"><small>OSAKA · ONE MORE MOMENT</small><h3>新世界 → 難波</h3><p>一起散步，慢一站也沒關係。</p><hr><small>04.06 / 20:42</small><p>我 · 小宇 · 阿晴</p></div><p>口袋裡的一張小票，也能是回憶的入口。</p><p class="demo-note">模擬紀念票卡，非真實車票或時刻表。</p>`};
  document.querySelectorAll('[data-memory]').forEach(b=>b.onclick=()=>{seen.add(b.dataset.memory);updateSeen();open(content[b.dataset.memory],b);});
  $('close').onclick=()=>$('detail').close();$('detail').addEventListener('click',e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();}});$('detail').addEventListener('close',()=>trigger?.focus());
  $('about').onclick=()=>open(`<div class="eyebrow">CHICTRIP MEMORY LAB</div><h2 id="dialog-title">一站回憶，小小實驗。</h2><p>這是獨立測試頁，原本地圖與所有分頁保持不變。</p><p>示範使用同一張公開照片的三種取景，旅伴、日期、短句及票卡皆為模擬。可以在各視角換成本機照片；圖片僅留在目前瀏覽器分頁，重新整理便清除。</p><p>「空間感」是照片平面的輕微透視互動，尚未做人物或建築深度分層。攝影詩頁沿用預先生成的 AI 插畫，未串接即時生成服務，所以換上本機照片後會停用詩頁。</p><p>設計參考：Apple 照片探索、Polarsteps 旅程記錄，以及可探索的回憶物件。</p>`,$('about'));
  $('upload').onclick=()=>$('file').click();$('file').onchange=()=>{const file=$('file').files[0];if(!file)return;if(!file.type.startsWith('image/')){notify('請選擇照片檔案');return;}if(file.size>20*1024*1024){notify('請選擇 20 MB 以下的照片');return;}const index=current,url=URL.createObjectURL(file),probe=new Image();probe.onload=()=>{if(uploads.has(index))URL.revokeObjectURL(uploads.get(index));uploads.set(index,url);if(current===index)select(index);notify('照片只在本機預覽，沒有上傳');};probe.onerror=()=>{URL.revokeObjectURL(url);notify('無法讀取這張照片，請使用 JPG、PNG 或 WebP');};probe.src=url;$('file').value='';};
  $('reset').onclick=()=>{if(uploads.has(current))URL.revokeObjectURL(uploads.get(current));uploads.delete(current);select(current);};
  window.addEventListener('pagehide',()=>uploads.forEach(url=>URL.revokeObjectURL(url)));reduced.addEventListener('change',resetTilt);updateSeen();
})();
