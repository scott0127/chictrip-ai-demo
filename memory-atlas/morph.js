/* Preserve the source photograph while it settles into a two-part editorial print. */
(() => {
  const $=id=>document.getElementById(id),root=$('memory-scene'),stage=$('memory-morph');
  const photo=$('morph-photo'),paper=$('morph-paper'),art=$('morph-art'),wash=$('morph-wash');
  const slider=$('morph-progress'),replay=$('morph-replay'),label=$('morph-label');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),cache=new Map();
  let version=0,raf=0,progress=0,ready=false,active=false,source=null,isSticker=false,bounds={w:0,h:0};
  const clamp=x=>Math.min(1,Math.max(0,x)),ease=x=>x*x*(3-2*x),mix=(a,b,t)=>a+(b-a)*t;
  function load(src){if(!cache.has(src))cache.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{cache.delete(src);reject(Error(src));};img.src=src;}));return cache.get(src);}
  function rect(el,x,y,w,h){el.style.transform=`translate(${x}px,${y}px)`;el.style.width=w+'px';el.style.height=h+'px';}
  function draw(value){
    progress=clamp(value);if(!ready||!source)return;
    const {w,h}=bounds,mobile=w<650,p=ease(progress),ratio=source.naturalWidth/source.naturalHeight;
    const ph=Math.min(h-(mobile?284:134),570,(w-36)/.75),pw=ph*.75,px=mobile?(w-pw)/2:w*.71-pw/2,py=mobile?107:54;
    // The original stays intact (contain); a soft photographic mat fills the top half.
    const startScale=Math.min(w/source.naturalWidth,h/source.naturalHeight),sw=source.naturalWidth*startScale,sh=source.naturalHeight*startScale;
    const endScale=Math.min(pw/source.naturalWidth,ph/2/source.naturalHeight),ew=source.naturalWidth*endScale,eh=source.naturalHeight*endScale;
    rect(paper,px,py,pw,ph);rect(wash,px,py,pw,ph/2);
    rect(photo,mix((w-sw)*(mobile?.5:.78),px+(pw-ew)/2,p),mix((h-sh)/2,py+(ph/2-eh)/2,p),mix(sw,ew,p),mix(sh,eh,p));
    rect($('morph-art-wrap'),px,py+ph/2+18*(1-p),pw,ph/2);
    if(isSticker){const size=ph*.34;art.hidden=true;const tile=$('morph-sticker');tile.hidden=false;tile.style.width=size+'px';tile.style.height=size+'px';tile.style.transform=`translate(${(pw-size)/2}px,${(ph/2-size)/2}px)`;}else{art.hidden=false;$('morph-sticker').hidden=true;art.style.width='100%';art.style.height='100%';art.style.transform='none';}
    paper.style.opacity=ease(clamp(progress*1.8));wash.style.opacity=p;
    $('morph-art-wrap').style.opacity=ease(clamp((progress-.18)/.82));art.style.filter=`blur(${(1-p)*5}px)`;
    root.style.setProperty('--morph-progress',p);root.classList.toggle('morph-art-view',progress>.15);
    root.querySelector('.scene-memory').inert=mobile&&progress>.15;$('scene-souvenirs').inert=progress>.15;
    slider.value=Math.round(progress*100);slider.setAttribute('aria-valuetext',progress===0?'原照片':progress===1?'攝影詩頁作品':`轉場 ${Math.round(progress*100)}%`);
    label.textContent=progress===0?'原照片':progress===1?(isSticker?'回憶詩頁 · AI 貼紙':'攝影詩頁 · AI 作品'):'讓這一刻，慢慢變成作品';
  }
  function stop(){cancelAnimationFrame(raf);raf=0;}
  function play(){stop();if(!ready)return;draw(0);if(reduced.matches){draw(1);return;}let last=0,elapsed=0;
    function tick(now){if(!active||document.hidden)return;if(last)elapsed+=Math.min(now-last,80);last=now;draw(clamp((elapsed-1700)/4600));if(progress<1)raf=requestAnimationFrame(tick);else raf=0;}
    raf=requestAnimationFrame(tick);
  }
  function hide(){version++;stop();active=false;ready=false;stage.hidden=true;root.classList.remove('has-morph','morph-art-view');root.style.setProperty('--morph-progress',0);$('morph-controls').hidden=true;root.querySelector('.scene-memory').inert=false;$('scene-souvenirs').inert=false;}
  async function show(info){hide();const token=version;active=true;$('morph-controls').hidden=false;slider.disabled=true;replay.disabled=true;label.textContent='正在準備這一頁回憶…';
    try{const [original,illustration]=await Promise.all([load(info.src),load(info.id===2?'assets/interest-stickers.png':`assets/scenes/ai/${info.id}.png`)]);if(token!==version||!active)return;isSticker=info.id===2;
      source=original;photo.src=original.src;photo.alt='原照片';art.src=illustration.src;art.alt='由這張照片生成的攝影詩頁插畫';wash.style.backgroundImage=`url("${info.src}")`;ready=true;bounds={w:root.clientWidth,h:root.clientHeight};stage.hidden=false;root.classList.add('has-morph');slider.disabled=false;replay.disabled=false;
      if(reduced.matches)draw(0);else play();
      const next=window.MEMORY_SCENES[info.id+1];if(next&&next.id!==2)load(`assets/scenes/ai/${next.id}.png`).catch(()=>{});
    }catch{if(token!==version)return;label.textContent='作品暫時無法載入，先留住原照片';}
  }
  slider.addEventListener('input',()=>{window.dispatchEvent(new Event('memory:pause'));stop();draw(Number(slider.value)/100);});
  replay.onclick=()=>{window.dispatchEvent(new Event('memory:pause'));if(reduced.matches)draw(progress===1?0:1);else play();};
  new ResizeObserver(()=>{bounds={w:root.clientWidth,h:root.clientHeight};if(active)draw(progress);}).observe(root);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',hide);
  window.MemoryMorph={show,hide};
})();
