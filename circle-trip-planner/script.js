(() => {
  'use strict';
  const phonePalette = new URLSearchParams(location.search).has('mobile') || matchMedia('(max-width:800px)').matches;
  const $ = id => document.getElementById(id);
  const places = [
    {id:'museum',name:'東京國立博物館',short:'國立博物館',coord:[139.7765,35.7188],photo:'tokyo-national-museum.jpg',tags:['室內','文化'],minutes:100,side:'upper',description:'把時間留給展覽與收藏，適合喜歡文化的旅人。'},
    {id:'ameyoko',name:'阿美橫町',short:'阿美橫町',coord:[139.7746,35.7094],photo:'ameyoko.jpg',tags:['老街','甜點','購物'],minutes:70,side:'',description:'逛街巷、找小吃，留一點隨興探索的時間。'},
    {id:'sensoji',name:'淺草寺',short:'淺草寺',coord:[139.7966,35.7148],photo:'sensoji.jpg',tags:['老街','文化','甜點'],minutes:75,side:'upper',description:'從寺院到周邊街巷，慢慢感受淺草的老城氣氛。'},
    {id:'sumida',name:'隅田公園',short:'隅田公園',coord:[139.8014,35.7125],photo:'sumida-park.png',tags:['散步','景觀'],minutes:55,side:'',description:'河岸散步與拍照，適合在景點之間放慢步調。'},
    {id:'skytree',name:'東京晴空塔',short:'東京晴空塔',coord:[139.8107,35.7101],photo:'tokyo-skytree.jpg',tags:['室內','景觀','購物'],minutes:90,side:'right',description:'以室內觀景與商場活動為主；正式行程需確認票券與營業時間。'}
  ];
  const find = id => places.find(p => p.id === id);
  const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = {ids:[],polygon:[],mode:'draw',draft:null,previous:null,saved:null,dirty:false,busy:false,version:0,active:null};
  const map = $('map'), base = $('base-map'), overlay = $('overlay');
  let width=1,height=1,bounds={},drag=[],drawing=false,routeProgress=1,animation=0,toastTimer;
  const storageKey='chictrip-circle-planner-v1';
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ids:state.ids,polygon:state.polygon,draft:state.draft,saved:state.saved,dirty:state.dirty,preference:$('preference').value,pace:$('pace').value})); } catch {}
  }
  function notify(message) { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').classList.add('show'); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200); }
  function project([lon,lat]) { return [(lon-bounds.west)/(bounds.east-bounds.west)*width,(bounds.north-lat)/(bounds.north-bounds.south)*height]; }
  function unproject([x,y]) { return [bounds.west+x/width*(bounds.east-bounds.west),bounds.north-y/height*(bounds.north-bounds.south)]; }
  function path(ctx,points,close=false) { if(!points.length)return; ctx.beginPath(); points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});if(close)ctx.closePath(); }
  function resize() {
    width=map.clientWidth;height=map.clientHeight;
    const lonSpan=.071,latSpan=lonSpan*.812*height/width;
    bounds={west:139.792-lonSpan/2,east:139.792+lonSpan/2,north:35.713+latSpan/2,south:35.713-latSpan/2};
    const dpr=Math.min(devicePixelRatio||1,2);
    [base,overlay].forEach(c=>{c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);});
    drawBase();drawOverlay();renderMarkers();
  }
  function drawBase() {
    const ctx=base.getContext('2d'),data=window.TOKYO_MAP_DATA;ctx.clearRect(0,0,width,height);ctx.fillStyle='#eeeee6';ctx.fillRect(0,0,width,height);
    if(!data)return;
    ctx.fillStyle='#dae4d4';data.parks.forEach(f=>{path(ctx,f.points,true);ctx.fill();});
    ctx.fillStyle='#cee0e2';ctx.strokeStyle='#cee0e2';ctx.lineWidth=9;data.water.forEach(f=>{path(ctx,f.points,f.closed);f.closed?ctx.fill():ctx.stroke();});
    ctx.lineJoin='round';ctx.lineCap='round';
    const roads=data.roads.filter(f=>f.points.some(p=>p[0]>=bounds.west&&p[0]<=bounds.east&&p[1]>=bounds.south&&p[1]<=bounds.north));
    roads.forEach(f=>{path(ctx,f.points);ctx.strokeStyle='#daddd3';ctx.lineWidth=['motorway','trunk','primary'].includes(f.kind)?6:3;ctx.stroke();});
    roads.forEach(f=>{path(ctx,f.points);ctx.strokeStyle='#fffefa';ctx.lineWidth=['motorway','trunk','primary'].includes(f.kind)?4:1.7;ctx.stroke();});
    ctx.strokeStyle='#b6c2b4';ctx.lineWidth=1.3;ctx.setLineDash([4,5]);data.rail.forEach(f=>{path(ctx,f.points);ctx.stroke();});ctx.setLineDash([]);
  }
  function drawOverlay() {
    const ctx=overlay.getContext('2d');ctx.clearRect(0,0,width,height);
    if(state.polygon.length>2){path(ctx,state.polygon,true);ctx.fillStyle=(phonePalette?'#009fe819':'#32695619');ctx.fill();ctx.strokeStyle=(phonePalette?'#009fe8':'#326956');ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.stroke();ctx.setLineDash([]);}
    if(drag.length){ctx.beginPath();drag.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=(phonePalette?'#009fe8':'#326956');ctx.lineWidth=2.5;ctx.stroke();}
    if(state.draft&&!state.dirty){
      const coords=state.draft.stops.filter(s=>s.place).map(s=>project(find(s.place).coord));
      if(coords.length>1){ctx.beginPath();ctx.moveTo(...coords[0]);const segProgress=routeProgress*(coords.length-1);for(let i=1;i<coords.length;i++){const t=Math.min(1,Math.max(0,segProgress-(i-1)));if(!t)break;ctx.lineTo(coords[i-1][0]+(coords[i][0]-coords[i-1][0])*t,coords[i-1][1]+(coords[i][1]-coords[i-1][1])*t);}ctx.strokeStyle=(phonePalette?'#009fe8':'#326956');ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);}
    }
  }
  function animateRoute() {cancelAnimationFrame(animation);if(matchMedia('(prefers-reduced-motion: reduce)').matches){routeProgress=1;drawOverlay();return;}const start=performance.now();function frame(now){routeProgress=Math.min(1,(now-start)/1500);drawOverlay();if(routeProgress<1)animation=requestAnimationFrame(frame);}animation=requestAnimationFrame(frame);}
  function renderMarkers() {
    const order=state.draft&&!state.dirty?state.draft.stops.filter(s=>s.place).map(s=>s.place):[];
    $('markers').innerHTML=places.map((p,i)=>{const [x,y]=project(p.coord);return `<button class="pin ${p.side} ${state.ids.includes(p.id)?'selected':''} ${state.active===p.id?'active':''}" style="left:${x}px;top:${y}px" data-place="${p.id}" data-name="${p.short}" aria-label="查看${p.name}" tabindex="${state.mode==='draw'?-1:0}">${order.includes(p.id)?order.indexOf(p.id)+1:i+1}</button>`;}).join('');
    map.classList.toggle('drawing',state.mode==='draw');overlay.style.pointerEvents=state.mode==='draw'?'auto':'none';
    $('draw-mode').setAttribute('aria-pressed',state.mode==='draw');$('view-mode').setAttribute('aria-pressed',state.mode==='view');
  }
  function updateReady() {
    const hasText=$('preference').value.trim().length>0,hasPlaces=state.ids.length>=2;
    $('generate').disabled=state.busy||!hasPlaces||!hasText;
    $('generate').innerHTML=state.busy?'<span>正在安排⋯</span>':`<span>${state.draft?'依新偏好重新安排':'生成這一天的行程'}</span><span>→</span>`;
    $('form-message').classList.remove('error');
    $('form-message').textContent=!hasPlaces?'先在地圖選至少 2 個景點，再告訴我你的偏好。':!hasText?`已選 ${state.ids.length} 個景點。輸入一句話，或點下方偏好開始。`:state.dirty&&state.draft?'偏好或範圍已變更。重新安排後，就能套用新草案。':`已選 ${state.ids.length} 個景點，會依偏好挑選與排序。`;
    $('step-1').classList.toggle('active',!hasPlaces);$('step-2').classList.toggle('active',hasPlaces&&(!state.draft||state.dirty));$('step-3').classList.toggle('active',!!state.draft&&!state.dirty);
    $('apply').disabled=state.dirty||state.busy;
    $('draft-state').textContent=state.dirty?'待重新安排':'尚未套用';
  }
  function invalidate() {state.version++;state.busy=false;state.dirty=!!state.draft;$('loading').hidden=true;state.active=null;$('place-popover').hidden=true;updateReady();drawOverlay();renderMarkers();persist();}
  function renderSelection() {
    $('selection-title').textContent=state.ids.length?'這些地方，留在你的候選清單':'從一個想去的區域開始';$('selection-count').textContent=state.ids.length?`${state.ids.length} 個候選景點`:'尚未圈選';
    $('selected-places').innerHTML=state.ids.length?state.ids.map(id=>{const p=find(id);return `<button class="selected-card" data-remove="${id}" aria-label="移除${p.name}"><img src="assets/photos/${p.photo}" alt="${p.name}"><span class="remove" aria-hidden="true">×</span><strong>${p.name}</strong><small>${p.tags.join(' · ')}</small></button>`;}).join(''):'<p class="selection-empty">圈選後，在這裡確認景點。也可以用上方快捷範圍開始。</p>';
    updateReady();renderMarkers();drawOverlay();persist();
  }
  function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if(((yi>point[1])!==(yj>point[1]))&&(point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi))inside=!inside;}return inside;}
  function applyPolygon(poly){state.polygon=poly;state.ids=places.filter(p=>pointInPolygon(p.coord,poly)).map(p=>p.id);invalidate();renderSelection();$('map-hint').textContent=state.ids.length?`圈到 ${state.ids.length} 個景點 · 接著說說想怎麼玩`:'這一圈沒有示範景點，試著往有地名的地方圈';if(!state.ids.length)notify('範圍內沒有示範景點，請重新圈選或使用快捷範圍。');}
  function pointerPoint(event){const r=map.getBoundingClientRect();return [Math.max(0,Math.min(width,event.clientX-r.left)),Math.max(0,Math.min(height,event.clientY-r.top))];}
  overlay.addEventListener('pointerdown',event=>{if(state.mode!=='draw'||event.button!==0)return;event.preventDefault();drawing=true;drag=[pointerPoint(event)];overlay.setPointerCapture(event.pointerId);$('place-popover').hidden=true;});
  overlay.addEventListener('pointermove',event=>{if(!drawing)return;const p=pointerPoint(event),last=drag[drag.length-1];if(Math.hypot(p[0]-last[0],p[1]-last[1])>3){drag.push(p);drawOverlay();}});
  overlay.addEventListener('pointerup',()=>{if(!drawing)return;drawing=false;const poly=drag.map(unproject),valid=drag.length>5&&Math.abs(drag.reduce((a,p,i)=>{const q=drag[(i+1)%drag.length];return a+p[0]*q[1]-q[0]*p[1];},0))>1200;drag=[];if(valid)applyPolygon(poly);else{drawOverlay();notify('按住並繞著景點畫一圈；也可用「逐點選擇」。');}});
  overlay.addEventListener('pointercancel',()=>{drawing=false;drag=[];drawOverlay();});
  function preset(area){const b=area==='east'?[139.790,35.705,139.817,35.720]:[139.768,35.704,139.817,35.724];applyPolygon([[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]]);}
  function showPlace(id){const p=find(id);state.active=id;state.mode='view';renderMarkers();$('place-popover').hidden=false;$('place-popover').innerHTML=`<button id="close-place" aria-label="關閉景點資訊">×</button><img src="assets/photos/${p.photo}" alt="${p.name}"><strong>${p.name}</strong><small>${p.tags.join(' · ')}</small><p>${p.description}</p>`;}
  function parse(text){
    const defs=[['老街',/老街|街巷|歷史|寺|文化/],['甜點',/甜點|甜食|小吃|美食/],['咖啡',/咖啡|下午茶/],['室內',/室內|下雨|雨天|躲雨/],['購物',/購物|逛街|買東西/],['景觀',/景觀|風景|拍照|觀景/],['悠閒',/悠閒|慢慢|不要太趕|不趕|輕鬆|少走|放鬆/],['充實',/充實|多排|多逛|緊湊/]];
    const tags=[],avoid=[];
    defs.forEach(([tag,re])=>{if(re.test(text)){const no=new RegExp('(?:不要|不想|不喜歡|排除)\\s*(?:去|喝|吃|逛)?\\s*'+(tag==='咖啡'?'(?:咖啡|下午茶)':tag));(no.test(text)?avoid:tags).push(tag);}});
    return {tags,avoid};
  }
  function buildPlan(text){
    const prefs=parse(text),slow=prefs.tags.includes('悠閒')||(!prefs.tags.includes('充實')&&$('pace').value==='relaxed'),limit=slow?3:4;
    let candidates=state.ids.map(find).filter(p=>!prefs.avoid.some(tag=>p.tags.includes(tag)));
    if(prefs.tags.includes('室內'))candidates=candidates.filter(p=>p.tags.includes('室內'));
    candidates.sort((a,b)=>score(b)-score(a)||a.coord[0]-b.coord[0]);
    function score(p){return prefs.tags.filter(t=>p.tags.includes(t)).length*5-(p.tags.includes('交通')?3:0);}
    const chosen=candidates.slice(0,limit),ordered=[];
    if(chosen.length){chosen.sort((a,b)=>a.coord[0]-b.coord[0]);ordered.push(chosen.shift());while(chosen.length){const last=ordered[ordered.length-1];chosen.sort((a,b)=>distance(last,a)-distance(last,b));ordered.push(chosen.shift());}}
    if(!ordered.length)return {error:'圈選範圍內沒有符合這組偏好的示範景點。試試擴大到上野，或調整偏好。'};
    const stops=[];let time=9*60,lunch=false;
    function rest(name,minute,reason){stops.push({name,time:clock(time),minutes:minute,reason});time+=minute;}
    ordered.forEach((p,i)=>{
      let travel=0;if(i){const km=distance(ordered[i-1],p);travel=Math.ceil((km<1.3?km*1000/65:km/18*60+12)/5)*5;travel=Math.max(10,travel);time+=travel;}
      if(time>=11*60+30&&!lunch){rest('午餐與自由探索',60,'在上一站附近用餐，店家由你選擇。');lunch=true;}
      const matched=prefs.tags.filter(t=>p.tags.includes(t));const minutes=p.minutes+(slow?15:0);
      stops.push({place:p.id,name:p.name,time:clock(time),minutes,travel,reason:matched.length?`符合你的「${matched.join('、')}」偏好。`:p.description});time+=minutes;
    });
    if(prefs.tags.includes('咖啡')){if(!lunch&&time>=11*60){rest('午餐與自由探索',60,'先在附近用餐，保留自由選擇。');lunch=true;}if(time<14*60){rest('附近自由活動',14*60-time,'保留彈性，不為填滿時間增加景點。');}rest('下午咖啡休息',45,`在${ordered[ordered.length-1].name}附近找間喜歡的咖啡店；店家待選。`);}
    const understood=prefs.tags.length?`我讀到：${prefs.tags.join('、')}${prefs.avoid.length?'；避開 '+prefs.avoid.join('、'):''}。`:'這句偏好超出目前示範辨識範圍；先依圈選與步調產生基礎草案，可試試上方偏好按鈕。';
    const short=ordered.length<Math.min(limit,state.ids.length)?`範圍內僅 ${ordered.length} 處符合條件，不加入圈外景點。`:'';
    return {title:prefs.tags.includes('室內')?'雨天，也有好去處':slow?'把東京，慢慢逛完':'多看一點東京',stops,summary:[`${ordered.length} 個景點`,`${slow?'悠閒':'充實'}步調`,`09:00–${clock(time)}`],understood:understood+short,text,pace:$('pace').value};
  }
  function distance(a,b){return Math.hypot((a.coord[0]-b.coord[0])*90.3,(a.coord[1]-b.coord[1])*111);}
  function clock(min){return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(Math.round(min%60)).padStart(2,'0')}`;}
  function renderPlan(){
    $('preview').hidden=!state.draft;$('preview-empty').hidden=!!state.draft;
    if(!state.draft)return;const p=state.draft;
    $('preview-title').textContent=p.title;$('ai-understood').textContent=p.understood;$('plan-summary').innerHTML=p.summary.map(s=>`<span>${esc(s)}</span>`).join('');
    $('plan-list').innerHTML=p.stops.map((s,i)=>`<article class="plan-stop" style="animation-delay:${i*45}ms"><time class="stop-time">${s.time}</time><div class="stop-main">${s.place?`<button class="stop-link" data-place="${s.place}"><h4>${esc(s.name)} ↗</h4></button>`:`<h4>${esc(s.name)}</h4>`}<p>${esc(s.reason)}</p><small>${s.minutes} 分鐘${s.place?' · 停留估計':' · 彈性安排'}</small>${s.travel?`<span class="travel-gap">前一站交通約 ${s.travel} 分鐘 · Mock</span>`:''}</div></article>`).join('');
    $('undo').hidden=!state.previous;updateReady();renderMarkers();
  }
  function generate(){
    if($('generate').disabled)return;const text=$('preference').value.trim(),version=++state.version;
    state.busy=true;$('loading').hidden=false;$('preview-empty').hidden=true;updateReady();
    setTimeout(()=>{
      if(version!==state.version)return;state.busy=false;$('loading').hidden=true;const plan=buildPlan(text);
      if(plan.error){updateReady();$('form-message').textContent=plan.error;$('form-message').classList.add('error');$('preview-empty').hidden=!!state.draft;return;}
      state.previous=state.draft;state.draft=plan;state.dirty=false;state.active=plan.stops.find(s=>s.place)?.place;state.mode='view';renderPlan();animateRoute();persist();$('map-hint').textContent='草案已生成 · 點地圖節點，對照景點資訊';notify('行程草案已準備好，喜歡再套用。');
    },950);
  }
  function openPicker(){ $('picker').innerHTML=places.map(p=>`<label class="pick-row"><img src="assets/photos/${p.photo}" alt=""><div><strong>${p.name}</strong><small>${p.tags.join(' · ')}</small></div><input type="checkbox" value="${p.id}" ${state.ids.includes(p.id)?'checked':''} aria-label="選取${p.name}"></label>`).join('');$('pick-dialog').showModal(); }
  function showSaved(){ $('saved-content').innerHTML=state.saved?`<p class="saved-notice">已套用至本機示範行程。重新整理後仍可查看。</p>${state.saved.stops.map(s=>`<div class="saved-row"><time>${s.time}</time><strong>${esc(s.name)}</strong></div>`).join('')}`:'<p class="saved-notice">還沒有套用的行程。圈選、生成草案後，按「套用到第 1 天」即可。</p>';$('saved-dialog').showModal(); }
  $('preference').addEventListener('input',invalidate);$('pace').addEventListener('change',invalidate);$('generate').addEventListener('click',generate);
  $('picker').addEventListener('change',event=>{const id=event.target.value;if(!find(id))return;state.ids=event.target.checked?[...new Set([...state.ids,id])]:state.ids.filter(x=>x!==id);state.polygon=[];invalidate();renderSelection();});
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.area)preset(b.dataset.area);
    else if(b.dataset.prompt){const value=$('preference').value;$('preference').value=value?value+'，'+b.dataset.prompt:b.dataset.prompt;invalidate();}
    else if(b.dataset.refine){let value=$('preference').value;if(b.dataset.refine.includes('咖啡'))value=value.replace(/(?:不要|不想|不喜歡)喝?咖啡/g,'');$('preference').value=value+'，'+b.dataset.refine;invalidate();generate();}
    else if(b.dataset.place)showPlace(b.dataset.place);
    else if(b.dataset.remove){state.ids=state.ids.filter(id=>id!==b.dataset.remove);invalidate();renderSelection();}
    else if(b.dataset.close)$(b.dataset.close).close();
    else if(b.id==='draw-mode'||b.id==='view-mode'){state.mode=b.id==='draw-mode'?'draw':'view';$('place-popover').hidden=true;renderMarkers();$('map-hint').textContent=state.mode==='draw'?'按住並畫一圈，圈內景點會自動選取':'點選地名節點，查看景點照片';}
    else if(b.id==='clear-selection'){state.ids=[];state.polygon=[];state.mode='draw';invalidate();renderSelection();$('map-hint').textContent='按住並畫一圈，圈內景點會自動選取';}
    else if(b.id==='pick-open')openPicker();else if(b.id==='close-place')$('place-popover').hidden=true;
    else if(b.id==='saved-open')showSaved();
    else if(b.id==='apply'){state.saved=JSON.parse(JSON.stringify(state.draft));persist();$('saved-dot').classList.add('has-saved');$('draft-state').textContent='已套用';notify('已套用到第 1 天，並儲存在此瀏覽器。');showSaved();}
    else if(b.id==='undo'&&state.previous){const previous=state.previous;state.previous=state.draft;state.draft=previous;$('preference').value=previous.text;$('pace').value=previous.pace;state.dirty=false;state.ids=[...new Set([...state.ids,...previous.stops.filter(s=>s.place).map(s=>s.place)])];state.polygon=[];renderSelection();renderPlan();animateRoute();persist();notify('已回到上一份草案。');}
  });
  try {const saved=JSON.parse(localStorage.getItem(storageKey));if(saved){state.ids=(saved.ids||[]).filter(id=>find(id));state.polygon=saved.polygon||[];state.draft=saved.draft?.stops?.every(s=>!s.place||find(s.place))?saved.draft:null;state.saved=saved.saved?.stops?.every(s=>!s.place||find(s.place))?saved.saved:null;state.dirty=!!saved.dirty;$('preference').value=saved.preference||'';$('pace').value=saved.pace==='full'?'full':'relaxed';}}catch{}
  $('saved-dot').classList.toggle('has-saved',!!state.saved);new ResizeObserver(resize).observe(map);renderSelection();renderPlan();
})();
