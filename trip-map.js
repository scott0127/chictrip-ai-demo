(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const days = [
    { area: '淺草・晴空塔', english: 'ASAKUSA / TOKYO', stops: [
      { name: '淺草寺', short: '淺草寺', at: [139.79665,35.71476], stay: '停留 90 分鐘', note: '雷門、仲見世通與老街散步' },
      { name: '隅田公園', short: '隅田公園', at: [139.8025,35.71325], stay: '停留 45 分鐘', note: '沿著隅田川散步，看晴空塔' },
      { name: '東京晴空塔', short: '晴空塔', at: [139.8107,35.71006], stay: '停留 120 分鐘', note: '展望台與東京晴空街道晚餐' }
    ] },
    { area: '原宿・澀谷', english: 'HARAJUKU / SHIBUYA', stops: [
      { name: '明治神宮', short: '明治神宮', at: [139.6993,35.6764], stay: '停留 90 分鐘', note: '穿過參道，享受早晨的綠意' },
      { name: '原宿・竹下通', short: '原宿', at: [139.7032,35.6714], stay: '停留 120 分鐘', note: '逛選物店，找一間午後咖啡店' },
      { name: '澀谷十字路口', short: '澀谷', at: [139.7005,35.6595], stay: '停留 90 分鐘', note: '旅伴集合，一起吃晚餐' }
    ] },
    { area: '舞濱・迪士尼', english: 'MAIHAMA / TOKYO BAY', stops: [
      { name: '舞濱站', short: '舞濱站', at: [139.8835,35.6361], stay: '停留 15 分鐘', note: '旅伴集合，一起步行入園' },
      { name: '東京迪士尼樂園', short: '迪士尼', at: [139.8804,35.6329], stay: '停留 8 小時', note: '遊樂設施、遊行與拍照時光' },
      { name: '伊克斯皮兒莉', short: '伊克斯皮兒莉', at: [139.885,35.6341], stay: '停留 60 分鐘', note: '晚餐與伴手禮，分享今日照片' }
    ] },
    { area: '新宿散步', english: 'SHINJUKU / TOKYO', stops: [
      { name: '新宿御苑', short: '新宿御苑', at: [139.7100,35.6852], stay: '停留 90 分鐘', note: '放慢腳步，在庭園裡散步' },
      { name: '伊勢丹新宿店', short: '新宿商圈', at: [139.7045,35.6916], stay: '停留 120 分鐘', note: '逛街購物，再一起集合' },
      { name: '東京都廳', short: '東京都廳', at: [139.6917,35.6896], stay: '停留 60 分鐘', note: '欣賞市景，為新宿散步收尾' }
    ] },
    { area: '上野・返程前', english: 'UENO / TOKYO', stops: [
      { name: '東京國立博物館', short: '上野博物館', at: [139.7765,35.7188], stay: '停留 90 分鐘', note: '上野公園與博物館的早晨' },
      { name: '阿美橫町', short: '阿美橫町', at: [139.7745,35.7103], stay: '停留 60 分鐘', note: '買伴手禮，吃最後一餐' },
      { name: '京成上野站', short: '京成上野站', at: [139.7738,35.71125], stay: '返程準備', note: '從這裡搭乘機場列車返程' }
    ] }
  ];
  days.forEach((day, dayIndex) => day.stops.forEach((stop, stopIndex) => { stop.uid = `${dayIndex}-${stopIndex}`; }));
  const dayColors = ['#326956','#416ba0','#ab7638','#80609b','#ae6265'];
  const dayTints = ['#edf4ef','#eef3f9','#f8f2e8','#f4eff8','#f9eff0'];
  const originalOrder = days.map(day => [...day.stops]);
  const schedules = [['10:00','12:00','14:00'],['10:00','13:00','17:00'],['08:30','09:00','18:00'],['10:00','13:00','17:00'],['09:30','12:00','14:00']];
  let selectedDay = 0, currentStop = 0, playing = false, editing = false;
  let camera = {x:0,y:0,w:100,h:100}, defaultCamera = null;
  let run = 0, frame, pauseTimer, fraction = 0, dragIndex = null, panStart = null;

  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const projection = ([lon,lat]) => ({x:(lon-139.67)*10000,y:(Math.log(Math.tan(Math.PI/4+35.755*Math.PI/360))-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)))*180/Math.PI*10000});
  const pathFor = (points, closed=false) => points.map((p,i) => { const v=projection(p); return `${i?'L':'M'}${v.x.toFixed(2)},${v.y.toFixed(2)}`; }).join('')+(closed?'Z':'');
  const strokePath = (d,color,width,extra='') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" ${extra}></path>`;
  const stops = () => days[selectedDay < 0 ? 0 : selectedDay].stops;
  const allEntries = () => days.flatMap((day,dayIndex)=>day.stops.map((stop,stopIndex)=>({stop,dayIndex,stopIndex})));
  const activeEntries = () => selectedDay < 0 ? allEntries() : days[selectedDay].stops.map((stop,stopIndex)=>({stop,dayIndex:selectedDay,stopIndex}));
  const dayLabel = entry => `第 ${entry.dayIndex+1} 天`;
  const ease = value => value*value*(3-2*value);
  const currentEntry = () => activeEntries()[currentStop];
  const dayStyle = day => `--day-color:${dayColors[day]};--day-tint:${dayTints[day]}`;

  function initBaseMap() {
    const data = window.TOKYO_MAP_DATA;
    if (!data) { $('#map-unavailable').hidden=false; return; }
    const park=data.parks.map(f=>pathFor(f.points,true)).join('');
    const water=data.water.filter(f=>f.closed).map(f=>pathFor(f.points,true)).join('');
    const rivers=data.water.filter(f=>!f.closed).map(f=>pathFor(f.points)).join('');
    const road=data.roads.filter(f=>!['tertiary','residential','unclassified'].includes(f.kind)).map(f=>pathFor(f.points)).join('');
    const local=data.roads.filter(f=>['tertiary','residential','unclassified'].includes(f.kind)).map(f=>pathFor(f.points)).join('');
    const major=data.roads.filter(f=>f.kind==='primary'||f.kind==='trunk').map(f=>pathFor(f.points)).join('');
    const rail=data.rail.map(f=>pathFor(f.points)).join('');
    $('#map-base').innerHTML=`<path d="${park}" fill="#dfe8d9"></path><path d="${water}" fill="#d8e5e8"></path>${strokePath(rivers,'#d8e5e8',9)}${strokePath(local,'#ffffff',1.25)}${strokePath(road,'#d9dbd1',5)}${strokePath(road,'#ffffff',3)}${strokePath(major,'#fff',4)}${strokePath(rail,'#bbc8c0',1.5,'stroke-dasharray="3 4"')}`;
  }
  function fitMap() {
    const rect=$('#trip-map').getBoundingClientRect(), aspect=(rect.width||650)/(rect.height||350);
    const p=activeEntries().map(entry=>projection(entry.stop.at)), xs=p.map(v=>v.x), ys=p.map(v=>v.y);
    const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
    let w=Math.max(Math.max(...xs)-Math.min(...xs),45)*(selectedDay<0?1.38:1.65);
    let h=Math.max(Math.max(...ys)-Math.min(...ys),40)*(selectedDay<0?1.55:1.85);
    if(w/h<aspect)w=h*aspect;else h=w/aspect;
    camera={x:cx-w/2,y:cy-h/2,w,h};defaultCamera={...camera};drawCamera();
  }
  function percent(at) {const p=projection(at);return {x:(p.x-camera.x)/camera.w*100,y:(p.y-camera.y)/camera.h*100};}
  function drawCamera() {
    $('#map-svg').setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.w} ${camera.h}`);
    const boxes=drawPins();drawTraveler();
    const labels=[['浅草',[139.791,35.711]],['墨田区',[139.814,35.715]],['台東区',[139.783,35.72]],['原宿',[139.708,35.674]],['渋谷区',[139.691,35.663]],['新宿',[139.703,35.698]],['上野',[139.779,35.713]],['舞浜',[139.875,35.636]],['千代田区',[139.753,35.689]],['東京',[139.769,35.681]]];
    $('#map-labels').innerHTML=labels.map(([label,at])=>{const p=percent(at);return p.x>6&&p.x<87&&p.y>14&&p.y<92?`<span class="map-place-label" style="left:${p.x}%;top:${p.y}%">${label}</span>`:'';}).join('');
    return boxes;
  }
  function routePinRectsOverlap(a,b,gap=0) {
    return a.x<b.x+b.w+gap && a.x+a.w+gap>b.x &&
      a.y<b.y+b.h+gap && a.y+a.h+gap>b.y;
  }

  // Liang–Barsky clipping against an expanded rectangle, including segment endpoints.
  function routePinSegmentHitsBox(a,b,box,padding=14) {
    const left=box.x-padding,right=box.x+box.w+padding;
    const top=box.y-padding,bottom=box.y+box.h+padding;
    if(Math.max(a.x,b.x)<left||Math.min(a.x,b.x)>right||Math.max(a.y,b.y)<top||Math.min(a.y,b.y)>bottom)return false;
    let enter=0,leave=1;
    for(const [start,delta,min,max] of [[a.x,b.x-a.x,left,right],[a.y,b.y-a.y,top,bottom]]) {
      if(Math.abs(delta)<1e-9){if(start<min||start>max)return false;continue;}
      let first=(min-start)/delta,last=(max-start)/delta;
      if(first>last)[first,last]=[last,first];
      enter=Math.max(enter,first);leave=Math.min(leave,last);
      if(enter>leave)return false;
    }
    return true;
  }

  function routePinDistanceToBox(point,box) {
    return Math.hypot(Math.max(box.x-point.x,0,point.x-box.x-box.w),Math.max(box.y-point.y,0,point.y-box.y-box.h));
  }

  function drawPins() {
    const map=$('#trip-map'),mapRect=map.getBoundingClientRect();
    const width=mapRect.width||650,height=mapRect.height||350;
    const pinWidth=width<500?104:112,pinHeight=44,gap=12,edge=10;
    const entries=activeEntries(),focused=document.activeElement?.dataset;
    const focusedSelector=focused?.anchor!==undefined?'[data-anchor="'+focused.anchor+'"]':focused?.pin!==undefined?'[data-pin="'+focused.pin+'"]':null;
    let hint=$('#map-detail-hint');
    if(!hint){hint=document.createElement('button');hint.id='map-detail-hint';hint.type='button';hint.addEventListener('click',()=>{if(defaultCamera&&camera.w<defaultCamera.w*.75)fitMap();else focusCurrentArea();});map.querySelector('.map-heading').append(hint);}
    hint.hidden=selectedDay>=0;
    const inDetail=defaultCamera&&camera.w<defaultCamera.w*.75;
    hint.textContent=inDetail?'返回總覽':'放大此區';
    hint.setAttribute('aria-label',inDetail?'返回五日完整路線總覽':'放大'+days[currentEntry().dayIndex].area+'景點區域');
    const anchors=entries.map(entry=>{const p=percent(entry.stop.at);return {x:p.x*width/100,y:p.y*height/100};});
    const segments=anchors.slice(1).map((point,index)=>[anchors[index],point]);
    const obstacles=['.map-heading','.map-zoom','.map-source'].map(selector=>{
      const element=map.querySelector(selector);if(!element)return null;
      const rect=element.getBoundingClientRect();
      return rect.width&&rect.height?{x:rect.left-mapRect.left,y:rect.top-mapRect.top,w:rect.width,h:rect.height}:null;
    }).filter(Boolean);
    const visible=point=>point.x>=10&&point.x<=width-10&&point.y>=10&&point.y<=height-24;
    const safe=box=>box.x>=edge&&box.y>=edge&&box.x+box.w<=width-edge&&box.y+box.h<=height-24&&
      obstacles.every(obstacle=>!routePinRectsOverlap(box,obstacle,6))&&
      segments.every(([a,b])=>!routePinSegmentHitsBox(a,b,box,12));
    const boxes=Array(entries.length).fill(null),leaders=Array(entries.length).fill(null);
    const endAt=(anchor,box)=>({x:Math.max(box.x,Math.min(anchor.x,box.x+box.w)),y:Math.max(box.y,Math.min(anchor.y,box.y+box.h))});
    // A label belongs to the closest coordinate, never to an available space elsewhere.
    // Selected labels get first choice; a crowded point remains selectable without a label.
    const order=[currentStop,...entries.map((_,index)=>index).filter(index=>index!==currentStop)];
    for(const index of order){
      const anchor=anchors[index];if(!visible(anchor))continue;
      const candidates=[];
      for(const clearance of [15,23,34,44]){
        for(let step=0;step<16;step++){
          const angle=-Math.PI/2+step*Math.PI/8,dx=Math.cos(angle),dy=Math.sin(angle);
          const radius=Math.min(Math.abs(dx)<.001?Infinity:pinWidth/2/Math.abs(dx),Math.abs(dy)<.001?Infinity:pinHeight/2/Math.abs(dy))+clearance;
          const box={x:anchor.x+dx*radius-pinWidth/2,y:anchor.y+dy*radius-pinHeight/2,w:pinWidth,h:pinHeight};
          const distance=routePinDistanceToBox(anchor,box);
          if(distance<14||distance>44.01||!safe(box))continue;
          if(anchors.some((other,j)=>j!==index&&routePinDistanceToBox(other,box)<distance+.5))continue;
          const end=endAt(anchor,box);
          if(boxes.some((other,j)=>other&&(routePinRectsOverlap(box,other,gap)||
            routePinDistanceToBox(anchor,other)<distance+.5||
            routePinDistanceToBox(anchors[j],box)<routePinDistanceToBox(anchors[j],other)+.5||
            routePinSegmentHitsBox(anchor,end,other,4)||
            routePinSegmentHitsBox(anchors[j],leaders[j],box,4))))continue;
          if(obstacles.some(obstacle=>routePinSegmentHitsBox(anchor,end,obstacle,3)))continue;
          candidates.push({box,end,score:distance+Math.hypot(box.x+pinWidth/2-anchor.x,box.y+pinHeight/2-anchor.y)*.12});
        }
      }
      candidates.sort((a,b)=>a.score-b.score);
      if(candidates[0]){boxes[index]=candidates[0].box;leaders[index]=candidates[0].end;}
    }
    const labelFor=(entry)=>escapeHTML(entry.stop.name)+'，'+dayLabel(entry)+'，第 '+(entry.stopIndex+1)+' 站';
    const labelHTML=entries.map((entry,index)=>{
      const box=boxes[index];if(!box)return '';
      return '<button class="map-pin '+(index===currentStop?'active ':'')+(index<currentStop?'visited':'')+'" data-pin="'+index+'" data-place-uid="'+entry.stop.uid+'" style="left:'+(box.x+box.w/2)+'px;top:'+(box.y+box.h/2)+'px;--pin-width:'+pinWidth+'px;'+dayStyle(entry.dayIndex)+'" aria-label="'+labelFor(entry)+'" '+(index===currentStop?'aria-current="location"':'')+'><b>'+escapeHTML(entry.stop.name)+'</b><small>'+dayLabel(entry)+'</small></button>';
    }).join('');
    const leaderHTML=leaders.map((end,index)=>end?
      '<line class="pin-leader '+(index===currentStop?'is-current':'')+'" data-leader="'+index+'" data-place-uid="'+entries[index].stop.uid+'" x1="'+anchors[index].x+'" y1="'+anchors[index].y+'" x2="'+end.x+'" y2="'+end.y+'" style="--day-color:'+dayColors[entries[index].dayIndex]+'"/>':'').join('');
    const anchorHTML=entries.map((entry,index)=>'<button class="map-anchor '+(index===currentStop?'active':'')+'" data-anchor="'+index+'" data-place-uid="'+entry.stop.uid+'" style="left:'+anchors[index].x+'px;top:'+anchors[index].y+'px;'+dayStyle(entry.dayIndex)+'" aria-label="定位 '+labelFor(entry)+'" title="'+escapeHTML(entry.stop.name)+' · '+dayLabel(entry)+'" '+(index===currentStop?'aria-current="location"':'')+' '+(!visible(anchors[index])?'hidden':'')+'><span></span></button>').join('');
    $('#map-pins').innerHTML='<svg class="pin-leaders" viewBox="0 0 '+width+' '+height+'" aria-hidden="true">'+leaderHTML+'</svg>'+labelHTML+anchorHTML;
    // The sidebar and progress rail already list all stops; do not add a second long list.
    $('#map-pin-overflow')?.remove();
    if(focusedSelector)$(focusedSelector)?.focus({preventScroll:true});
    return boxes;
  }

  function focusCurrentArea() {
    const entry=currentEntry(),dayEntries=days[entry.dayIndex].stops.map(stop=>projection(stop.at));
    const rect=$('#trip-map').getBoundingClientRect(),aspect=rect.width/rect.height;
    const xs=dayEntries.map(point=>point.x),ys=dayEntries.map(point=>point.y);
    let w=Math.max(Math.max(...xs)-Math.min(...xs),45)*1.9;
    let h=Math.max(Math.max(...ys)-Math.min(...ys),40)*2.1;
    if(w/h<aspect)w=h*aspect;else h=w/aspect;
    camera={x:(Math.min(...xs)+Math.max(...xs)-w)/2,y:(Math.min(...ys)+Math.max(...ys)-h)/2,w,h};
    let boxes=drawCamera();
    // Dense neighboring districts can still compete at day scale; finish on the selected point.
    for(let attempt=0;attempt<4&&!boxes[currentStop];attempt++){
      const point=projection(entry.stop.at);camera.w*=.8;camera.h*=.8;
      camera.x=point.x-camera.w/2;camera.y=point.y-camera.h/2;boxes=drawCamera();
    }
  }
  function drawRoutes() {
    const routeDays=selectedDay<0?days.map((day,index)=>({day,index})):[{day:days[selectedDay],index:selectedDay}];
    let html='';
    if(selectedDay<0)days.slice(0,-1).forEach((day,index)=>{
      const d=pathFor([day.stops.at(-1).at,days[index+1].stops[0].at]);
      html+=strokePath(d,'#87908a',1.5,'stroke-dasharray="4 7" opacity=".7"')+strokePath('',dayColors[index+1],2.8,`id="transition-progress-${index}" stroke-dasharray="4 7"`);
    });
    routeDays.forEach(({day,index})=>{
      const d=pathFor(day.stops.map(stop=>stop.at));
      html+=strokePath(d,'#fff',6,'opacity=".95"')+strokePath(d,dayColors[index],2.4,'opacity=".48"')+strokePath('',dayColors[index],4,`id="day-route-progress-${index}"`);
    });
    $('#map-routes').innerHTML=html;drawTraveler();
  }
  function drawTraveler() {
    const entries=activeEntries(),entry=entries[currentStop],next=entries[Math.min(currentStop+1,entries.length-1)];
    const progress=ease(fraction),at=entry.stop.at,to=next.stop.at;
    const position=[at[0]+(to[0]-at[0])*progress,at[1]+(to[1]-at[1])*progress],p=percent(position);
    const traveler=$('#map-traveler');traveler.style.left=`${p.x}%`;traveler.style.top=`${p.y}%`;
    traveler.style.setProperty('--day-color',dayColors[fraction>0?next.dayIndex:entry.dayIndex]);
    traveler.hidden=!playing&&fraction===0;
    const paths=Array.from({length:5},()=>[]),transitions=Array(4).fill('');
    for(let index=0;index<currentStop;index++){
      const a=entries[index],b=entries[index+1];
      if(a.dayIndex===b.dayIndex)paths[a.dayIndex].push(pathFor([a.stop.at,b.stop.at]));
      else transitions[a.dayIndex]=pathFor([a.stop.at,b.stop.at]);
    }
    if(fraction>0&&currentStop<entries.length-1){
      if(entry.dayIndex===next.dayIndex)paths[entry.dayIndex].push(pathFor([at,position]));
      else transitions[entry.dayIndex]=pathFor([at,position]);
    }
    paths.forEach((parts,index)=>$(`#day-route-progress-${index}`)?.setAttribute('d',parts.join('')));
    transitions.forEach((path,index)=>$(`#transition-progress-${index}`)?.setAttribute('d',path));
  }
  function renderLegend() {
    const legend=$('#day-legend');
    if(legend)legend.innerHTML=`<div class="day-color-keys">${days.map((day,index)=>`<button data-legend-day="${index}" class="day-color-key ${selectedDay===index?'selected':''}" style="${dayStyle(index)}" aria-label="查看第${index+1}天 ${day.area}" aria-pressed="${selectedDay===index}"><i></i><b>第 ${index+1} 天</b><span>${day.area.split('・')[0]}</span></button>`).join('')}</div><span class="day-legend-note"><i></i>日間轉場・非導航</span>`;
    $$('.trip-day-tabs [data-day]').forEach(tab=>{const day=Number(tab.dataset.day);tab.style.setProperty('--day-color',day<0?'#52695c':dayColors[day]);tab.style.setProperty('--day-tint',day<0?'#f0f4f1':dayTints[day]);});
    $('.trip-workspace').style.setProperty('--active-day-color',selectedDay<0?'#52695c':dayColors[selectedDay]);
    $('.trip-workspace').style.setProperty('--active-day-tint',selectedDay<0?'#f0f4f1':dayTints[selectedDay]);
  }
  function distance(a,b) {
    const r=Math.PI/180,x=(b[0]-a[0])*r*Math.cos((a[1]+b[1])*r/2),y=(b[1]-a[1])*r;return Math.hypot(x,y)*6371;
  }
  function renderList() {
    const list=$('#day-plan'),scrollTop=list.scrollTop;list.classList.toggle('is-overview',selectedDay<0);
    if(selectedDay<0){
      list.innerHTML=days.map((day,dayIndex)=>`<section class="overview-day-group" style="${dayStyle(dayIndex)}"><button class="day-overview-card" data-overview-day="${dayIndex}"><span>第 ${dayIndex+1} 天</span><div><strong>${day.area}</strong><small>10/${12+dayIndex} · 3 個景點</small></div><b>↗</b></button>${(dayIndex===currentEntry().dayIndex?day.stops:[]).map((stop,stopIndex)=>{const index=dayIndex*3+stopIndex;return `<button class="overview-stop ${index===currentStop?'selected':''} ${index<currentStop?'visited':''}" data-select-stop="${index}" aria-pressed="${index===currentStop}"><span>${stopIndex+1}</span><strong>${stop.name}</strong><small>${schedules[dayIndex][stopIndex]}</small></button>`;}).join('')}</section>`).join('');
    }else{
      list.innerHTML=stops().map((stop,index)=>{
        const leg=index<stops().length-1?distance(stop.at,stops()[index+1].at):0;
        const transit=leg>2?`電車約 ${Math.round(leg*3+8)} 分鐘`:`步行約 ${Math.max(4,Math.round(leg*15))} 分鐘`;
        return `<div class="stop-item ${index===currentStop?'selected':''} ${index<currentStop?'visited':''}" data-stop="${index}" draggable="${editing}" style="${dayStyle(selectedDay)}"><button class="stop-card" data-select-stop="${index}" aria-pressed="${index===currentStop}"><span class="stop-number">${index<currentStop?'✓':index+1}</span><span class="stop-card-copy"><time>第 ${selectedDay+1} 天 · ${schedules[selectedDay][index]}</time><strong>${stop.name}</strong><small>${stop.stay}</small></span></button><div class="reorder-controls"><button data-move="-1" data-index="${index}" aria-label="上移${stop.name}" ${index===0?'disabled':''}>↑</button><button data-move="1" data-index="${index}" aria-label="下移${stop.name}" ${index===stops().length-1?'disabled':''}>↓</button></div></div>${index<stops().length-1?`<div class="transport-leg"><span>↳</span>${transit} <small>· 模擬</small></div>`:''}`;
      }).join('');
    }
    list.scrollTop=scrollTop;
  }
  function keepCurrentVisible() {
    const rail=$('#journey-progress'),node=rail.querySelector('.current');
    if(node){const a=node.getBoundingClientRect(),b=rail.getBoundingClientRect();if(a.left<b.left||a.right>b.right)rail.scrollLeft+=a.left-b.left-(b.width-a.width)/2;}
    if(selectedDay<0){const list=$('#day-plan'),node=list.querySelector('.overview-stop.selected');if(node){const a=node.getBoundingClientRect(),b=list.getBoundingClientRect();if(a.top<b.top||a.bottom>b.bottom)list.scrollTop+=a.top-b.top-(b.height-a.height)/2;}}
  }
  function renderProgress() {
    const entries=activeEntries(),entry=entries[currentStop],next=entries[currentStop+1];
    const rail=$('#journey-progress'),scrollLeft=rail.scrollLeft;
    rail.classList.toggle('is-overview',selectedDay<0);
    rail.innerHTML=entries.map((item,index)=>`<button class="journey-stage ${index<currentStop?'complete':''} ${index===currentStop?'current':''} ${index>0&&entries[index-1].dayIndex!==item.dayIndex?'new-day':''}" data-progress-stop="${index}" style="${dayStyle(item.dayIndex)}" aria-label="預演${dayLabel(item)}的${escapeHTML(item.stop.name)}" ${index===currentStop?'aria-current="step"':''}><i class="journey-point" aria-hidden="true"></i><span class="journey-caption"><strong>${escapeHTML(item.stop.name)}</strong><small>${dayLabel(item)}</small></span></button>`).join('');
    rail.scrollLeft=scrollLeft;

    let status=`${entry.stop.name} · ${dayLabel(entry)} · ${currentStop+1} / ${entries.length} 站`;
    if(playing&&next)status=`${entry.dayIndex!==next.dayIndex?'日間轉場，前往':'前往'} ${next.stop.name} · ${dayLabel(next)} · ${currentStop+1} / ${entries.length} 站`;
    else if(!playing&&fraction>0)status=`已暫停 · ${status}`;
    else if(currentStop===entries.length-1)status=`已抵達終點 · ${status}`;
    $('#journey-status').textContent=status;
    $('#play-journey').disabled=false;
    $('#next-stop').disabled=currentStop===entries.length-1;
    const text=playing?'Ⅱ 暫停':currentStop===entries.length-1?'↺ 重播旅程':fraction>0||currentStop>0?'▷ 繼續旅程':selectedDay<0?'▷ 播放完整 5 日':'▷ 播放當日';
    $('#play-journey').textContent=text;
    $('#play-journey').setAttribute('aria-label',text.replace(/^[^\u4e00-\u9fff]+/,''));
    keepCurrentVisible();
  }
  const stopInsights = {
    '0-0': { highlights:['雷門','仲見世商店街'], range:[70,120], use:'拍雷門、傳旅伴合照' },
    '0-1': { highlights:['晴空塔眺景'], range:[35,70], use:'河岸導航、分享風景照' },
    '0-2': { highlights:['高空展望','東京全景'], range:[150,250], use:'拍城市全景、傳照片' },
    '1-0': { highlights:['神社綠地','參道散步'], range:[40,80], use:'查參道方向、傳集合訊息' },
    '1-1': { highlights:['潮流選物','可麗餅'], range:[100,180], use:'查店家、分享甜點照' },
    '1-2': { highlights:['十字路口街景','澀谷109'], range:[120,220], use:'拍街景、導航找旅伴' },
    '2-0': { highlights:['單軌電車','度假區總站'], range:[15,30], use:'查入園路線、傳集合訊息' },
    '2-1': { highlights:['遊行表演'], range:[500,900], use:'查園區資訊、分享遊園照' },
    '2-2': { highlights:['餐飲美食','購物商場'], range:[80,140], use:'查餐廳、分享晚餐照' },
    '3-0': { highlights:['庭園草地','新宿天際線'], range:[60,110], use:'拍庭園、查出口方向' },
    '3-1': { highlights:['地下美食','設計師品牌'], range:[100,180], use:'查樓層、傳購物清單' },
    '3-2': { highlights:['展望室','城市全景'], range:[40,80], use:'拍高空市景、傳照片' },
    '4-0': { highlights:['浮世繪','陶瓷與刀劍'], range:[50,90], use:'查展品資訊、傳集合訊息' },
    '4-1': { highlights:['市場小吃','商店街採買'], range:[70,130], use:'找店家、分享採買照' },
    '4-2': { highlights:['上野公園','不忍池'], range:[20,40], use:'查返程班次、傳抵達訊息' }
  };
  const stopPhotos = {
  "0-0": {
    "src": "assets/photos/sensoji.jpg",
    "alt": "淺草寺雷門入口實景",
    "source": "https://commons.wikimedia.org/wiki/File:Kaminarimon_at_Sens%C5%8Dji.jpg",
    "credit": "Christophe95 / Wikimedia Commons",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "objectPosition": "50% 50%"
  },
  "0-1": {
    "src": "assets/photos/sumida-park.png",
    "alt": "隅田公園河岸櫻花與橋梁實景",
    "source": "https://commons.wikimedia.org/wiki/File:Sumida_park.PNG",
    "credit": "Chihayasassas / Wikimedia Commons",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "objectPosition": "50% 50%"
  },
  "0-2": {
    "src": "assets/photos/tokyo-skytree.jpg",
    "alt": "東京晴空塔與城市實景",
    "source": "https://commons.wikimedia.org/wiki/File:2019_Tokyo_Skytree.jpg",
    "credit": "Kakidai / Wikimedia Commons",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "objectPosition": "50% 28%"
  },
  "1-0": {
    "src": "assets/photos/meiji-shrine.jpg",
    "alt": "明治神宮入口鳥居實景",
    "source": "https://commons.wikimedia.org/wiki/File:Meiji-jingu_torii.JPG",
    "credit": "Teddy Yoshida (Harajuku at English Wikipedia) / Wikimedia Commons",
    "license": "Public Domain / PD-link",
    "licenseUrl": "https://commons.wikimedia.org/wiki/Template:PD-link",
    "objectPosition": "50% 50%"
  },
  "1-1": {
    "src": "assets/photos/takeshita-street.jpg",
    "alt": "原宿竹下通入口實景",
    "source": "https://commons.wikimedia.org/wiki/File:Takeshita_Street.jpg",
    "credit": "Syced / Wikimedia Commons",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "objectPosition": "50% 35%"
  },
  "1-2": {
    "src": "assets/photos/shibuya-crossing.jpg",
    "alt": "澀谷十字路口街景",
    "source": "https://commons.wikimedia.org/wiki/File:View_of_Shibuya_Crossing.jpg",
    "credit": "Ewong17 / Wikimedia Commons",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "objectPosition": "50% 50%"
  },
  "2-0": {
    "src": "assets/photos/maihama-station.jpg",
    "alt": "舞濱站入口實景",
    "source": "https://commons.wikimedia.org/wiki/File:Maihama_Station_20120219-2.jpg",
    "credit": "掬茶 / Wikimedia Commons",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
    "objectPosition": "50% 50%"
  },
  "2-1": {
    "src": "assets/photos/tokyo-disneyland.jpg",
    "alt": "東京迪士尼樂園灰姑娘城堡實景",
    "source": "https://commons.wikimedia.org/wiki/File:Disneyland_Tokyo.jpg",
    "credit": "fortherock / Wikimedia Commons",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
    "objectPosition": "50% 50%"
  },
  "2-2": {
    "src": "assets/photos/ikspiari.jpg",
    "alt": "伊克斯皮兒莉入口實景",
    "source": "https://commons.wikimedia.org/wiki/File:Gate_of_the_Ikspiari.jpg",
    "credit": "掬茶 / Wikimedia Commons",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
    "objectPosition": "50% 50%"
  },
  "3-0": {
    "src": "assets/photos/shinjuku-gyoen.jpg",
    "alt": "新宿御苑日本庭園實景",
    "source": "https://commons.wikimedia.org/wiki/File:Shinjuku-Gyoen_Japan-garden.jpg",
    "credit": "MaedaAkihiko / Wikimedia Commons",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "objectPosition": "50% 50%"
  },
  "3-1": {
    "src": "assets/photos/isetan-shinjuku.jpg",
    "alt": "伊勢丹新宿店外觀實景",
    "source": "https://commons.wikimedia.org/wiki/File:Isetan_Shinjuku_2018.jpg",
    "credit": "Kakidai / Wikimedia Commons",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "objectPosition": "50% 50%"
  },
  "3-2": {
    "src": "assets/photos/tokyo-government.jpg",
    "alt": "東京都廳建築實景",
    "source": "https://commons.wikimedia.org/wiki/File:Tokyo_Metropolitan_Government_Building_2024.jpg",
    "credit": "Kakidai / Wikimedia Commons",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "objectPosition": "50% 50%"
  },
  "4-0": {
    "src": "assets/photos/tokyo-national-museum.jpg",
    "alt": "東京國立博物館入口與本館實景",
    "source": "https://commons.wikimedia.org/wiki/File:Tokyo_National_Museum.jpg",
    "credit": "Drivephotographer / Wikimedia Commons",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "objectPosition": "50% 70%"
  },
  "4-1": {
    "src": "assets/photos/ameyoko.jpg",
    "alt": "阿美橫町入口夜間實景",
    "source": "https://commons.wikimedia.org/wiki/File:Views_at_night_in_April_of_2019_around_the_Ueno_neighborhood_in_Tokyo_27.jpg",
    "credit": "Levi Clancy / Wikimedia Commons",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "objectPosition": "50% 50%"
  },
  "4-2": {
    "src": "assets/photos/keisei-ueno.jpg",
    "alt": "京成上野站入口實景",
    "source": "https://commons.wikimedia.org/wiki/File:Keisei_Ueno_station_20190616_143901.jpg",
    "credit": "筑紫太郎 at Japanese Wikipedia / Wikimedia Commons",
    "license": "CC BY 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "objectPosition": "50% 50%"
  }
};
  function hideInsight() {
    $('#stop-insight').hidden=true;
    $('#insight-empty').hidden=false;
  }
  function showInsight() {
    const entry=currentEntry(),insight=stopInsights[entry.stop.uid],photo=stopPhotos[entry.stop.uid],card=$('#stop-insight');
    if(!insight)return;
    card.style.setProperty('--day-color',dayColors[entry.dayIndex]);
    card.style.setProperty('--day-tint',dayTints[entry.dayIndex]);
    card.innerHTML=`<div class="insight-heading"><span class="insight-badge">${dayLabel(entry)}</span><h3>${escapeHTML(entry.stop.name)}</h3><button id="close-insight" aria-label="收起景點小卡">×</button></div><div class="insight-scene ${photo?'has-photo':''}">${photo?`<figure class="insight-photo"><img src="${photo.src}" alt="${escapeHTML(photo.alt)}" width="480" height="320" style="object-position:${photo.objectPosition}"><figcaption><a href="${photo.source}" target="_blank" rel="noopener" title="${escapeHTML(photo.credit)} · ${escapeHTML(photo.license)}" aria-label="照片來源：${escapeHTML(photo.credit)}，${escapeHTML(photo.license)}">實景照片 ↗</a></figcaption></figure>`:''}<div class="insight-scene-copy"><p class="insight-label">${entry.stop.uid==='4-2'?'車站周邊看點':'這站看點'}</p><div class="insight-highlights">${insight.highlights.map(place=>`<span>${escapeHTML(place)}</span>`).join('')}</div></div></div><div class="insight-estimate"><span>此站預估用量</span><div><strong>${insight.range[0]}–${insight.range[1]}</strong><small>MB / 人</small></div></div><p class="insight-basis">${entry.stop.stay.replace('停留 ','')} · ${insight.use}</p><p class="insight-mock">Mock 用量估算 · 非即時監測</p>`;
    card.hidden=false;
    $('#insight-empty').hidden=true;
    card.classList.remove('insight-arrive');
    void card.offsetWidth;
    card.classList.add('insight-arrive');
  }
  $('#stop-insight').addEventListener('click',event=>{
    if(!event.target.closest('#close-insight'))return;
    hideInsight();
    ($(`[data-pin="${currentStop}"]`)||$(`[data-anchor="${currentStop}"]`))?.focus({preventScroll:true});
  });
  $('.map-scene').addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!$('#stop-insight').hidden){
      event.preventDefault();event.stopPropagation();hideInsight();
      ($(`[data-pin="${currentStop}"]`)||$(`[data-anchor="${currentStop}"]`))?.focus({preventScroll:true});
    }
  });

  function stopPlayback(preserve=false) {
    run++;cancelAnimationFrame(frame);clearTimeout(pauseTimer);playing=false;if(!preserve)fraction=0;renderProgress();drawTraveler();
  }
  function selectStop(index) {
    if(index<0||index>=activeEntries().length)return;
    stopPlayback();currentStop=index;renderList();renderProgress();drawRoutes();const boxes=drawPins();
    if(!boxes[currentStop])focusCurrentArea();
    showInsight();
  }
  function setDay(value) {
    const day=Number(value);if(!Number.isInteger(day)||day< -1||day>=days.length)return;
    stopPlayback();selectedDay=day;currentStop=0;editing=false;
    $('.journey-list').classList.remove('is-editing');$('#toggle-order').setAttribute('aria-pressed','false');$('#toggle-order').textContent='調整順序';$('#toggle-order').disabled=day<0;
    $('#order-note').textContent=day<0?'點座標或景點名稱查看照片；密集景點會自動放大。':'點選景點定位；也可以調整當日順序。';
    $('#day-area').textContent=day<0?'東京 5 日完整旅程':days[day].area;$('#day-summary').textContent=day<0?'15 個景點':'3 個景點';$('#map-area').textContent=day<0?'TOKYO / 5 DAYS':days[day].english;
    $('#trip-map').classList.toggle('is-overview',day<0);
    $('.journey-list-title>span').textContent=day<0?'五日行程':'當日行程';
    hideInsight();
    $('.map-note').textContent='短引線對應景點座標；密集處點選可放大。路線為行程示意，非實際導航。';
    renderLegend();renderList();renderProgress();drawRoutes();fitMap();
  }
  function playSegment() {
    const entries=activeEntries();if(currentStop>=entries.length-1){playing=false;renderProgress();drawTraveler();return;}
    hideInsight();
    const version=run,start=performance.now(),startFraction=fraction,crossDay=entries[currentStop].dayIndex!==entries[currentStop+1].dayIndex;
    const duration=reduced.matches?0:(crossDay?2900:2200)*(1-startFraction);
    renderProgress();
    function tick(now){
      if(version!==run)return;
      fraction=duration===0?1:startFraction+(1-startFraction)*Math.min(1,(now-start)/duration);drawTraveler();
      if(fraction<1){frame=requestAnimationFrame(tick);return;}
      currentStop++;fraction=0;renderList();renderProgress();drawPins();drawTraveler();showInsight();
      if(currentStop===activeEntries().length-1){playing=false;renderProgress();drawTraveler();return;}
      $('#journey-status').textContent=`抵達 ${dayLabel(currentEntry())} ${currentEntry().stop.short} · ${currentStop+1} / ${activeEntries().length} 站`;
      pauseTimer=setTimeout(()=>{if(version===run&&playing)playSegment();},3000);
    }
    frame=requestAnimationFrame(tick);
  }
  function moveStop(from,to) {
    if(selectedDay<0||to<0||to>=stops().length)return;
    stopPlayback();const [item]=stops().splice(from,1);stops().splice(to,0,item);currentStop=to;
    renderList();renderProgress();drawRoutes();drawPins();showInsight();$('#order-note').textContent='順序與地圖連線已更新；點節點查看該站看點。';$(`[data-select-stop="${to}"]`)?.focus({preventScroll:true});
  }
  function nearestMapAnchor(event){
    const rect=$('#trip-map').getBoundingClientRect();let nearest=Infinity,index=0;
    activeEntries().forEach((entry,i)=>{const p=percent(entry.stop.at),distance=Math.hypot(event.clientX-rect.left-p.x*rect.width/100,event.clientY-rect.top-p.y*rect.height/100);if(distance<nearest){nearest=distance;index=i;}});
    return index;
  }
  $('#map-pins').addEventListener('click',event=>{
    const pin=event.target.closest('[data-pin]');if(pin){selectStop(Number(pin.dataset.pin));return;}
    const anchor=event.target.closest('[data-anchor]');if(!anchor)return;
    // Overlapping touch targets resolve to the nearest true coordinate, not DOM order.
    const index=event.detail>0?nearestMapAnchor(event):Number(anchor.dataset.anchor);
    selectStop(index);
    $(`[data-anchor="${index}"]`)?.focus({preventScroll:true});
  });
  function emphasizeMapPlace(index){
    $$('#map-pins [data-pin],#map-pins [data-anchor],#map-pins [data-leader]').forEach(element=>element.classList.toggle('is-emphasized',String(index)===(element.dataset.pin??element.dataset.anchor??element.dataset.leader)));
  }
  $('#map-pins').addEventListener('pointerover',event=>{const item=event.target.closest('[data-pin],[data-anchor]');if(item)emphasizeMapPlace(item.dataset.pin??item.dataset.anchor);});
  $('#map-pins').addEventListener('pointermove',event=>{if(event.target.closest('[data-anchor]'))emphasizeMapPlace(nearestMapAnchor(event));});
  $('#map-pins').addEventListener('pointerleave',()=>emphasizeMapPlace(null));
  $('#map-pins').addEventListener('focusin',event=>{const item=event.target.closest('[data-pin],[data-anchor]');if(item)emphasizeMapPlace(item.dataset.pin??item.dataset.anchor);});
  $('#map-pins').addEventListener('focusout',()=>emphasizeMapPlace(null));
  $('#day-legend')?.addEventListener('click',event=>{const day=event.target.closest('[data-legend-day]');if(day)document.dispatchEvent(new CustomEvent('trip-select-day',{detail:Number(day.dataset.legendDay)}));});
  $('#day-plan').addEventListener('click',event=>{
    const day=event.target.closest('[data-overview-day]');if(day){document.dispatchEvent(new CustomEvent('trip-select-day',{detail:Number(day.dataset.overviewDay)}));return;}
    const mover=event.target.closest('[data-move]');if(mover){moveStop(Number(mover.dataset.index),Number(mover.dataset.index)+Number(mover.dataset.move));return;}
    const item=event.target.closest('[data-select-stop]');if(item)selectStop(Number(item.dataset.selectStop));
  });
  $('#journey-progress').addEventListener('click',event=>{const item=event.target.closest('[data-progress-stop]');if(item)selectStop(Number(item.dataset.progressStop));});
  $('#play-journey').addEventListener('click',()=>{
    if(playing){stopPlayback(true);return;}
    if(currentStop===activeEntries().length-1)selectStop(0);
    fitMap();
    playing=true;renderProgress();
    if(fraction>0){playSegment();return;}
    showInsight();
    const version=run;
    $('#journey-status').textContent=`停靠 ${dayLabel(currentEntry())} ${currentEntry().stop.short} · ${currentStop+1} / ${activeEntries().length} 站`;
    pauseTimer=setTimeout(()=>{if(version===run&&playing)playSegment();},3000);
  });
  $('#next-stop').addEventListener('click',()=>{if(currentStop<activeEntries().length-1)selectStop(currentStop+1);});
  $('#toggle-order').addEventListener('click',()=>{if(selectedDay<0)return;editing=!editing;stopPlayback();$('.journey-list').classList.toggle('is-editing',editing);$('#toggle-order').setAttribute('aria-pressed',String(editing));$('#toggle-order').textContent=editing?'完成排序':'調整順序';$('#order-note').textContent=editing?'拖曳景點或用上下箭頭調整順序。':'點選景點，地圖同步定位。';renderList();});
  $('#day-plan').addEventListener('dragstart',event=>{if(!editing)return;const item=event.target.closest('[data-stop]');if(!item)return;dragIndex=Number(item.dataset.stop);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(dragIndex));item.classList.add('dragging');});
  $('#day-plan').addEventListener('dragover',event=>{if(editing)event.preventDefault();});
  $('#day-plan').addEventListener('drop',event=>{event.preventDefault();const item=event.target.closest('[data-stop]');if(editing&&item&&dragIndex!==null)moveStop(dragIndex,Number(item.dataset.stop));dragIndex=null;});
  $('#day-plan').addEventListener('dragend',()=>{$$('.dragging').forEach(element=>element.classList.remove('dragging'));dragIndex=null;});
  $('#toggle-map-view').addEventListener('click',()=>{const expanded=$('.route-workspace').classList.toggle('map-expanded');$('#toggle-map-view').textContent=expanded?'返回列表＋地圖':'查看地圖 ↗';$('#toggle-map-view').setAttribute('aria-pressed',String(expanded));fitMap();});
  function zoom(factor){if(!defaultCamera)return;const w=Math.max(Math.max(40,defaultCamera.w*.04),Math.min(defaultCamera.w*2.5,camera.w*factor)),h=w*camera.h/camera.w;camera={x:camera.x+(camera.w-w)/2,y:camera.y+(camera.h-h)/2,w,h};drawCamera();}
  $('#zoom-in').addEventListener('click',()=>zoom(.8));$('#zoom-out').addEventListener('click',()=>zoom(1.25));$('#fit-map').addEventListener('click',fitMap);
  $('#trip-map').addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.target.closest('button,a,#stop-insight'))return;panStart={x:event.clientX,y:event.clientY,camera:{...camera}};$('#trip-map').setPointerCapture(event.pointerId);$('#trip-map').classList.add('is-panning');});
  $('#trip-map').addEventListener('pointermove',event=>{if(!panStart)return;const rect=$('#trip-map').getBoundingClientRect();camera={...panStart.camera,x:panStart.camera.x-(event.clientX-panStart.x)/rect.width*camera.w,y:panStart.camera.y-(event.clientY-panStart.y)/rect.height*camera.h};drawCamera();});
  function stopPan(){panStart=null;$('#trip-map').classList.remove('is-panning');}
  $('#trip-map').addEventListener('pointerup',stopPan);$('#trip-map').addEventListener('pointercancel',stopPan);
  $('#trip-map').addEventListener('keydown',event=>{if(event.target!==$('#trip-map'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopPropagation();camera.x+=event.key==='ArrowRight'?camera.w*.12:event.key==='ArrowLeft'?-camera.w*.12:0;camera.y+=event.key==='ArrowDown'?camera.h*.12:event.key==='ArrowUp'?-camera.h*.12:0;drawCamera();}});
  new ResizeObserver(entries=>{if(entries[0].contentRect.width>0)fitMap();}).observe($('#trip-map'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback(true);});
  initBaseMap();
  window.TripMap={setDay,pause:()=>stopPlayback(true),refresh:fitMap,reset:()=>{stopPlayback();days.forEach((day,index)=>{day.stops=[...originalOrder[index]];});$('.route-workspace').classList.remove('map-expanded');$('#toggle-map-view').textContent='查看地圖 ↗';$('#toggle-map-view').setAttribute('aria-pressed','false');setDay(0);}};
})();

