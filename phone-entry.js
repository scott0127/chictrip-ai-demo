(() => {
  const desktop = new URLSearchParams(location.search).has('desktop');
  if(matchMedia('(max-width:800px)').matches && !desktop){
    const target = ['#business','#flow','#winwin'].includes(location.hash)?'#proposal':['#smart-deal','#data-back'].includes(location.hash)?'#esim':location.hash==='#social-trip'?'#memory':'#trip';
    location.replace('mobile-trip/index.html'+target);
    return;
  }
  const link=document.createElement('a');link.href='mobile-trip/index.html';link.textContent='手機版 ↗';link.style.cssText='position:fixed;bottom:16px;left:16px;z-index:50;background:#009fe8;color:white;border-radius:22px;padding:12px 18px;font:13px sans-serif;box-shadow:0 3px 12px #19354120';document.body.append(link);
})();
