(() => {
  'use strict';
  const $=id=>document.getElementById(id),trip=window.ATLAS_TRIP,stops=trip.stops,cities=trip.cities;
  const cityOf=id=>cities.find(c=>c.id===id),icon=name=>'assets/icons/'+name+'.svg';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const state={mode:'all',index:-1,phase:'idle',elapsed:0,playing:false,speed:1,three:true,seen:new Set(),gallery:'osaka',art:null};
  let map=null,ready=false,frame=0,last=0,routeFrame=0,arrivalTimer=0,errorTimer=0,vehicleMarker=null;
  const stopMarkers=[],cityMarkers=[];
  const fc=features=>({type:'FeatureCollection',features});
  const feature=(type,coordinates,properties={})=>({type:'Feature',properties,geometry:{type,coordinates}});
  const empty=()=>fc([]);
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const mix=(a,b,t)=>a+(b-a)*t;
  const legFrom=i=>i?stops[i-1]:trip.origin;
  const selectedStops=()=>state.mode==='all'?stops:stops.filter(s=>s.city===state.mode);

  function flightArc(from,to){
    const midpoint=[(from[0]+to[0])/2,(from[1]+to[1])/2+Math.max(1.4,Math.abs(to[0]-from[0])*.15)];
    return Array.from({length:81},(_,i)=>{const t=i/80,u=1-t;return [u*u*from[0]+2*u*t*midpoint[0]+t*t*to[0],u*u*from[1]+2*u*t*midpoint[1]+t*t*to[1]];});
  }
  const paths=stops.map((s,i)=>s.vehicle==='plane'?flightArc(legFrom(i).at,s.at):[legFrom(i).at,...(s.via||[]),s.at]);
  const distances=paths.map(path=>{const out=[0];for(let i=1;i<path.length;i++){const cos=Math.cos(path[i][1]*Math.PI/180);out.push(out[i-1]+Math.hypot((path[i][0]-path[i-1][0])*cos,path[i][1]-path[i-1][1]));}return out;});
  function pointAlong(i,t){const path=paths[i],lens=distances[i],d=t*lens.at(-1);let j=1;while(j<lens.length-1&&lens[j]<d)j++;const u=clamp((d-lens[j-1])/(lens[j]-lens[j-1]||1),0,1);return {point:[mix(path[j-1][0],path[j][0],u),mix(path[j-1][1],path[j][1],u)],segment:j};}
  function artStyle(el,id){const n=id%9;el.style.setProperty('--sx',(n%3)*50+'%');el.style.setProperty('--sy',Math.floor(n/3)*50+'%');el.classList.toggle('interest-art',id>=9);}
  function formatDate(s){return '2026.'+s.date+' · '+s.time;}

  function buildControls(){
    $('timeline').innerHTML=stops.map((s,i)=>`<button data-stop="${i}" style="--city:${cityOf(s.city).color}" class="${stops[i+1]?.vehicle==='plane'?'flight-gap':''}" aria-label="回顧 ${s.name}，${s.date}"><span class="timeline-dot"></span><small>${s.short}</small></button>`).join('');
    $('collection-tabs').innerHTML=cities.map(c=>`<button data-gallery="${c.id}" aria-pressed="${c.id===state.gallery}">${c.name}</button>`).join('');
    renderGallery();
  }
  function renderGallery(){
    const arts=trip.stickers.filter(a=>stops[a.stop].city===state.gallery);
    $('sticker-grid').innerHTML=arts.map(a=>`<button data-art="${a.id}" class="${state.seen.has(a.stop)?'is-seen':''} ${a.id===state.art?'is-current':''}" aria-label="查看 ${a.name} 回憶貼紙"><span class="sticker ${a.id>=9?'interest-art':''}" style="--sx:${a.id%3*50}%;--sy:${Math.floor(a.id%9/3)*50}%"></span><small>${a.name}</small><span class="sticker-tag">${a.tag}</span></button>`).join('');
    document.querySelectorAll('[data-gallery]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.gallery===state.gallery));
    const count=trip.stickers.filter(a=>state.seen.has(a.stop)).length;
    $('collection-count').textContent='已回顧 '+count+' / '+trip.stickers.length;
  }
  function refreshUI(){
    const s=stops[state.index],list=selectedStops();
    $('play-label').textContent=state.playing?'暫停回憶':state.phase==='done'?'再次回顧':state.phase==='idle'?(state.mode==='all'?'播放總回憶':'播放城市回憶'):'繼續回憶';
    $('play-icon').src=icon(state.playing?'pause':'play');
    $('speed').textContent=state.speed+'×';$('speed').setAttribute('aria-label','播放速度 '+state.speed+' 倍');
    $('dimension').setAttribute('aria-pressed',state.three);
    document.querySelectorAll('[data-city]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.city===state.mode));
    document.querySelectorAll('[data-stop]').forEach(b=>{const i=+b.dataset.stop;b.hidden=state.mode!=='all'&&stops[i].city!==state.mode;b.classList.toggle('is-seen',state.seen.has(i));b.classList.toggle('is-current',state.index===i);b.setAttribute('aria-current',state.index===i?'step':'false');});
    $('progress-caption').textContent=list.filter(x=>state.seen.has(x.id)).length+' / '+list.length+' 段回憶';
    if(s){const from=legFrom(state.index),city=cityOf(s.city);$('transport-icon').firstElementChild.src=icon(s.vehicle);$('journey-leg').textContent=(state.phase==='arrival'||state.phase==='done')?s.name:(s.vehicle==='plane'?(state.index?cityOf(from.city).name:from.name)+' → '+city.name:from.short+' → '+s.short);$('journey-phase').textContent=state.phase==='done'?'回憶播放完成':state.phase==='arrival'?'抵達 · '+s.mode:(s.vehicle==='plane'?'跨境回憶 · ':'沿途回顧 · ')+s.mode;}
    renderGallery();refreshPins();
  }
  function showMoment(s,art=s.art){
    state.art=art;state.gallery=s.city;
    const collectible=trip.stickers[art],city=cityOf(s.city);
    artStyle($('moment-sticker'),art);$('moment-sticker').style.animation='none';void $('moment-sticker').offsetWidth;$('moment-sticker').style.animation='';
    $('moment-date').textContent=formatDate(s);$('moment-city').textContent=city.name+' · '+collectible.tag;
    $('moment-kicker').textContent=city.english+' / MEMORY '+String(s.id+1).padStart(2,'0');
    $('moment-title').textContent=collectible.name;$('moment-story').textContent=s.story;
    $('moment-stamp').textContent='回憶已點亮';$('moment-transport').innerHTML=`<img src="${icon(s.vehicle)}" alt="">${s.mode}`;
    $('moment-with').textContent=s.with;$('moment-note').textContent=s.note||'';$('moment-note').hidden=!s.note;
    $('moment-location').textContent=s.name;
  }
  function showArrival(s){
    clearTimeout(arrivalTimer);artStyle($('arrival-sticker'),s.art);$('arrival-pop').hidden=false;
    $('arrival-pop').style.animation='none';void $('arrival-pop').offsetWidth;$('arrival-pop').style.animation='';
    arrivalTimer=setTimeout(()=>$('arrival-pop').hidden=true,2200/state.speed);
  }
  function updateHighlights(){
    if(!ready)return;
    const seen=[...state.seen];map.setFilter('memory-visited',['in',['get','step'],['literal',seen.length?seen:[-1]]]);
    map.getSource('memory-lights').setData(fc(seen.map(i=>feature('Point',stops[i].at,{color:cityOf(stops[i].city).color}))));
    const polygons=seen.map(i=>{const [x,y]=stops[i].at,dx=.0015,dy=.0012;return [[[x-dx,y-dy],[x+dx,y-dy],[x+dx,y+dy],[x-dx,y+dy],[x-dx,y-dy]]];});
    if(map.getLayer('memory-buildings'))map.setPaintProperty('memory-buildings','fill-extrusion-color',polygons.length?['case',['within',{type:'MultiPolygon',coordinates:polygons}],'#e2b44d','#c1cfce']:'#c1cfce');
  }
  function refreshPins(){
    if(!map)return;const regional=map.getZoom()<9.5;
    cityMarkers.forEach(({marker,city})=>{marker.getElement().hidden=!regional;const n=stops.filter(s=>s.city===city.id&&state.seen.has(s.id)).length;marker.getElement().querySelector('small').textContent=n+' / 4 段回憶';});
    stopMarkers.forEach(({marker,stop})=>{const el=marker.getElement();el.hidden=regional||(state.mode!=='all'&&stop.city!==state.mode);el.classList.toggle('is-seen',state.seen.has(stop.id));el.classList.toggle('is-current',state.index===stop.id);el.querySelector('.pin-label').hidden=state.index!==stop.id;});
  }
  function fitRoute(i,duration=1300){
    if(!ready)return;const bounds=new maplibregl.LngLatBounds();paths[i].forEach(p=>bounds.extend(p));
    map.fitBounds(bounds,{padding:{top:125,bottom:70,left:65,right:65},maxZoom:stops[i].vehicle==='plane'?5.7:14.3,pitch:stops[i].vehicle==='plane'?0:(state.three?42:0),bearing:0,duration:reduced.matches?0:duration/state.speed});
    $('map-mode').textContent=stops[i].vehicle==='plane'?'FLIGHT MEMORY':'ON THE WAY';
    $('map-title').textContent=stops[i].vehicle==='plane'?((i?cityOf(stops[i-1].city).name:trip.origin.name)+' → '+cityOf(stops[i].city).name):cityOf(stops[i].city).name+'・沿途回顧';
    $('map-instruction').textContent='路線與交通工具為回憶示意';
  }
  function closeView(s,duration=1400){
    if(ready)map.easeTo({center:s.at,zoom:s.zoom,pitch:state.three?55:0,bearing:cityOf(s.city).bearing,padding:{top:55,bottom:0,left:0,right:0},duration:reduced.matches?0:duration/state.speed});
    $('map-mode').textContent=cityOf(s.city).english+' / '+s.date;
    $('map-title').textContent=s.name;$('map-instruction').textContent='亮起的地方，收著你這次的回憶。';
  }
  function overview(city='all',duration=1500){
    if(!ready)return;
    const bounds=new maplibregl.LngLatBounds();(city==='all'?[trip.origin,...cities]:stops.filter(s=>s.city===city)).forEach(p=>bounds.extend(p.at));
    map.fitBounds(bounds,{padding:{top:140,bottom:65,left:50,right:80},maxZoom:city==='all'?5:13.5,pitch:city==='all'?0:(state.three?45:0),bearing:city==='all'?0:cityOf(city).bearing,duration:reduced.matches?0:duration});
    $('map-mode').textContent=city==='all'?'ALL MEMORIES':cityOf(city).english+' / CITY MEMORIES';
    $('map-title').textContent=city==='all'?'日本・韓國・香港':cityOf(city).name+'，我的四段回憶';
    $('map-instruction').textContent=city==='all'?'播放回憶，或點一座城市開始探索。':'點節點或貼紙，近看你走過的街廓。';
  }
  function moveVehicle(t){
    if(!ready||state.index<0)return;const s=stops[state.index],route=paths[state.index],result=pointAlong(state.index,t);
    vehicleMarker.setLngLat(result.point);vehicleMarker.getElement().hidden=false;
    map.getSource('memory-progress').setData(fc([feature('LineString',[...route.slice(0,result.segment),result.point],{color:cityOf(s.city).color})]));
    if(s.vehicle==='plane'){const a=map.project(result.point),b=map.project(pointAlong(state.index,Math.min(1,t+.01)).point);vehicleMarker.getElement().querySelector('img').style.transform=`rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+45}deg)`;}
  }
  function beginLeg(i){
    state.index=i;state.phase='depart';state.elapsed=0;state.art=stops[i].art;state.gallery=stops[i].city;
    $('arrival-pop').hidden=true;fitRoute(i);showMoment(stops[i]);$('moment-stamp').textContent='前往這段回憶';
    if(ready){const el=vehicleMarker.getElement();el.classList.toggle('flight',stops[i].vehicle==='plane');el.querySelector('img').src=icon(stops[i].vehicle);el.querySelector('img').style.transform='';el.querySelector('small').textContent=stops[i].mode;moveVehicle(0);}
    refreshUI();
  }
  function arrive(){
    const s=stops[state.index];state.seen.add(s.id);state.phase='arrival';state.elapsed=0;
    if(ready){vehicleMarker.getElement().hidden=true;map.getSource('memory-progress').setData(empty());}
    showMoment(s);showArrival(s);updateHighlights();refreshUI();
    const node=$('timeline').querySelector(`[data-stop="${s.id}"]`);if(node)$('timeline').scrollTo({left:node.offsetLeft-$('timeline').offsetLeft-$('timeline').clientWidth/2+node.clientWidth/2,behavior:reduced.matches?'instant':'smooth'});
  }
  function advance(){
    const list=selectedStops(),next=list.find(s=>s.id>state.index);
    if(next){beginLeg(next.id);return;}
    state.phase='done';state.playing=false;cancelAnimationFrame(frame);$('arrival-pop').hidden=true;refreshUI();
    $('map-mode').textContent='MEMORIES, KEPT';$('map-instruction').textContent='回憶都在這裡，點一枚貼紙再看一次。';
  }
  function tick(now){
    if(!state.playing)return;
    const dt=Math.min(80,now-last);last=now;state.elapsed+=dt*state.speed;
    if(state.phase==='depart'&&state.elapsed>=(reduced.matches?100:1450)){state.phase='travel';state.elapsed=0;refreshUI();}
    else if(state.phase==='travel'){
      const duration=reduced.matches?600:(stops[state.index].vehicle==='plane'?4600:3600),t=Math.min(1,state.elapsed/duration);
      if(now-routeFrame>32||t===1){moveVehicle(t);routeFrame=now;}
      if(t===1){state.phase='zoom';state.elapsed=0;closeView(stops[state.index]);if(ready)vehicleMarker.getElement().hidden=true;}
    }else if(state.phase==='zoom'&&state.elapsed>=(reduced.matches?100:1450))arrive();
    else if(state.phase==='arrival'&&state.elapsed>=(reduced.matches?1600:2300))advance();
    if(state.playing)frame=requestAnimationFrame(tick);
  }
  function play(){
    if(state.playing){pause();return;}
    if(state.phase==='done'){reset(false);}
    if(state.phase==='idle')beginLeg(selectedStops()[0].id);
    else if(state.phase==='depart')fitRoute(state.index,Math.max(100,1450-state.elapsed));
    else if(state.phase==='zoom')closeView(stops[state.index],Math.max(100,1450-state.elapsed));
    state.playing=true;last=performance.now();refreshUI();frame=requestAnimationFrame(tick);
  }
  function pause(){state.playing=false;cancelAnimationFrame(frame);if(map)map.stop();refreshUI();}
  function reset(start=true){
    pause();state.index=-1;state.phase='idle';state.elapsed=0;state.art=null;state.seen.clear();
    if(ready){vehicleMarker.getElement().hidden=true;map.getSource('memory-progress').setData(empty());}
    updateHighlights();refreshUI();if(start)play();
  }
  function selectCity(id){
    pause();state.mode=id;state.phase='idle';state.index=-1;state.elapsed=0;$('arrival-pop').hidden=true;
    if(ready){vehicleMarker.getElement().hidden=true;map.getSource('memory-progress').setData(empty());}
    if(id!=='all'){state.gallery=id;const s=stops.find(s=>s.city===id);showMoment(s);$('moment-stamp').textContent='選一站回顧';}
    $('journey-phase').textContent=id==='all'?'準備出發 · 飛機':cityOf(id).name+'・城市回憶';
    $('journey-leg').textContent=id==='all'?'台北 → 大阪':'4 段旅程 · 6 枚貼紙';
    overview(id);refreshUI();
  }
  function jump(i,art=stops[i].art){
    pause();state.index=i;state.phase='arrival';state.elapsed=0;
    if(state.mode!=='all'&&state.mode!==stops[i].city)state.mode=stops[i].city;
    state.seen.add(i);if(ready){vehicleMarker.getElement().hidden=true;map.getSource('memory-progress').setData(empty());}
    showMoment(stops[i],art);closeView(stops[i]);updateHighlights();refreshUI();showArrival({...stops[i],art});
  }
  function initMap(){
    if(!window.maplibregl){showNoMap();return;}
    const style=structuredClone(window.ATLAS_STYLE);
    style.sources['fallback-land']={type:'geojson',data:window.ATLAS_LAND,attribution:'<a href="https://www.naturalearthdata.com/">Natural Earth</a>'};
    style.layers.splice(1,0,{id:'fallback-land',type:'fill',source:'fallback-land',paint:{'fill-color':'#f1f1e9','fill-outline-color':'#cddbd9'}});
    try{map=new maplibregl.Map({container:'map',style,center:[125.0,30.1],zoom:3.5,pitch:0,attributionControl:false,localIdeographFontFamily:'sans-serif',maxZoom:18,minZoom:2,renderWorldCopies:false});}
    catch{showNoMap();return;}
    map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
    map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
    map.on('error',e=>{if(e.error?.message?.includes('AJAXError')||e.sourceId||/fetch|network|Failed|HTTP/i.test(e.error?.message||'')){$('map-error').hidden=false;$('map-status').textContent='概略地圖 · 街道底圖待連線';}else console.error(e.error);});
    map.once('style.load',()=>{
      addMapLayers();addMarkers();ready=true;overview(state.mode,0);refreshUI();updateHighlights();
      $('map-status').textContent='MapLibre · 正在載入街道';
      if(state.index>=0){closeView(stops[state.index],0);if(state.phase==='travel')moveVehicle(state.elapsed/4600);}
    });
    map.on('sourcedata',e=>{if(e.sourceId==='openmaptiles'&&e.sourceDataType==='content'){$('map-error').hidden=true;$('map-status').textContent='MapLibre · 建築與街道圖資';clearTimeout(errorTimer);}});
    map.on('zoom',refreshPins);map.on('dragstart',e=>{if(e.originalEvent&&state.playing)pause();});map.on('rotatestart',e=>{if(e.originalEvent&&state.playing)pause();});
    errorTimer=setTimeout(()=>{if(!map.isSourceLoaded('openmaptiles')){$('map-error').hidden=false;$('map-status').textContent='概略地圖 · 街道底圖待連線';}},18000);
  }
  function addMapLayers(){
    if(map.getSource('memory-routes'))return;
    const firstLabel=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
    map.addLayer({id:'memory-buildings',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:14,filter:['!=',['get','hide_3d'],true],paint:{'fill-extrusion-color':'#c1cfce','fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,15,['coalesce',['get','render_height'],12]],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.87}},firstLabel);
    map.setLight({anchor:'viewport',color:'#fff4d8',intensity:.4,position:[1.5,200,38]});
    map.addSource('memory-routes',{type:'geojson',data:fc(paths.map((p,i)=>feature('LineString',p,{step:i,flight:stops[i].vehicle==='plane',color:cityOf(stops[i].city).color})))});
    map.addSource('memory-progress',{type:'geojson',data:empty()});map.addSource('memory-lights',{type:'geojson',data:empty()});
    map.addLayer({id:'memory-route-local',type:'line',source:'memory-routes',filter:['==',['get','flight'],false],minzoom:9,paint:{'line-color':['get','color'],'line-opacity':.27,'line-width':2.5},layout:{'line-cap':'round','line-join':'round'}});
    map.addLayer({id:'memory-route-flight',type:'line',source:'memory-routes',filter:['==',['get','flight'],true],maxzoom:10,paint:{'line-color':'#5797ad','line-opacity':.6,'line-width':2,'line-dasharray':[2,3]}});
    map.addLayer({id:'memory-visited',type:'line',source:'memory-routes',filter:['==',['get','step'],-1],paint:{'line-color':['get','color'],'line-opacity':['interpolate',['linear'],['zoom'],9,.7,11,['case',['get','flight'],0,.7]],'line-width':3},layout:{'line-cap':'round','line-join':'round'}});
    map.addLayer({id:'memory-glow',type:'circle',source:'memory-lights',minzoom:10,paint:{'circle-radius':38,'circle-color':'#ffcb54','circle-opacity':.4,'circle-blur':.85}});
    map.addLayer({id:'memory-progress-halo',type:'line',source:'memory-progress',paint:{'line-color':'#ffffff','line-width':7,'line-opacity':.75},layout:{'line-cap':'round','line-join':'round'}});
    map.addLayer({id:'memory-progress-line',type:'line',source:'memory-progress',paint:{'line-color':['get','color'],'line-width':3.5},layout:{'line-cap':'round','line-join':'round'}});
  }
  function addMarkers(){
    cities.forEach((city,i)=>{const el=document.createElement('button');el.className='city-pin';el.style.setProperty('--city',city.color);el.setAttribute('aria-label','探索'+city.name+'的回憶');el.innerHTML=`<span class="city-code">${['JP','KR','HK'][i]}</span><span><strong>${city.name}</strong><small>0 / 4 段回憶</small></span>`;el.onclick=()=>selectCity(city.id);const marker=new maplibregl.Marker({element:el,anchor:'bottom',offset:[0,-7]}).setLngLat(city.at).addTo(map);cityMarkers.push({city,marker});});
    stops.forEach(s=>{const el=document.createElement('button');el.className='stop-pin';el.style.setProperty('--city',cityOf(s.city).color);el.setAttribute('aria-label','回顧'+s.name);el.innerHTML=`<span>${s.id%4+1}</span><b class="pin-label" hidden>${s.short}</b>`;el.onclick=()=>jump(s.id);const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(s.at).addTo(map);stopMarkers.push({stop:s,marker});});
    const vehicle=document.createElement('div');vehicle.className='vehicle-marker flight';vehicle.hidden=true;vehicle.setAttribute('aria-hidden','true');vehicle.innerHTML=`<div class="vehicle-orb"><img src="${icon('plane')}" alt=""></div><small>飛機</small>`;vehicleMarker=new maplibregl.Marker({element:vehicle,anchor:'center'}).setLngLat(trip.origin.at).addTo(map);
  }
  function showNoMap(){$('map-error').hidden=false;$('map-error').querySelector('strong').textContent='此裝置無法顯示立體地圖';$('map-error').querySelector('p').textContent='可繼續播放旅程與回顧貼紙，或換支援 WebGL 的瀏覽器。';$('map-status').textContent='貼紙回顧模式 · 地圖暫不可用';$('dimension').disabled=true;$('recenter').disabled=true;}
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.city)selectCity(b.dataset.city);else if(b.dataset.gallery){state.gallery=b.dataset.gallery;renderGallery();}else if(b.dataset.stop!==undefined)jump(+b.dataset.stop);else if(b.dataset.art!==undefined){const art=trip.stickers[+b.dataset.art];jump(art.stop,art.id);}});
  $('play').onclick=play;$('replay').onclick=()=>reset(true);
  $('next').onclick=()=>{const running=state.playing;pause();const next=selectedStops().find(s=>s.id>state.index);if(next){jump(next.id);if(running)play();}else{state.phase='done';refreshUI();}};
  $('speed').onclick=()=>{state.speed=state.speed===1?2:1;refreshUI();};
  $('dimension').onclick=()=>{state.three=!state.three;if(ready){map.setLayoutProperty('memory-buildings','visibility',state.three?'visible':'none');map.easeTo({pitch:state.three?(map.getZoom()>10?55:0):0,duration:reduced.matches?0:600});}refreshUI();};
  $('recenter').onclick=()=>{if(state.index>=0){if(['depart','travel'].includes(state.phase))fitRoute(state.index);else closeView(stops[state.index]);}else overview(state.mode);};
  $('retry-map').onclick=()=>location.reload();
  $('about').onclick=()=>{pause();$('info-dialog').showModal();};$('info-close').onclick=()=>$('info-dialog').close();
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.playing)pause();});
  reduced.addEventListener('change',()=>{if(state.playing)pause();});
  window.addEventListener('pagehide',e=>{pause();clearTimeout(arrivalTimer);clearTimeout(errorTimer);if(!e.persisted&&map){map.remove();map=null;ready=false;}});
  buildControls();refreshUI();initMap();
})();

