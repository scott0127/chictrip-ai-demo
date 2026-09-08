(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const styles={
    sticker:{title:'把風景，收藏成一張卡。',short:'收藏貼紙卡',number:'01',format:'橫式 3:2',description:'一幅手作風景，六枚屬於這趟旅行的貼紙。',alt:'富士山咖啡風景手作插畫與六枚旅行貼紙'},
    editorial:{title:'一半風景，一半詩',short:'攝影詩頁',number:'02',format:'直式 3:4',description:'把真實留在上半頁，把感受畫成下半頁。',alt:'上半攝影、下半留白手繪插畫的富士山詩頁'},
    ticket:{title:'留一張，回到那個傍晚。',short:'藍調旅行票根',number:'03',format:'直式 3:4',description:'雙色孔版印刷，留住富士山下的一點暖光。',alt:'藍色孔版印刷風格富士山旅行票根'}
  };
  const requested=new URLSearchParams(location.search).get('style');
  let selected=Object.hasOwn(styles,requested)?requested:'editorial';
  let localUrl='',draft=null,opener=null;
  const src=style=>'assets/memory/fuji-'+style+'.png';
  const publicUrl=style=>'https://scott0127.github.io/chictrip-ai-demo/mobile-trip/index.html?memory=fuji&style='+style+'#memory';
  const notify=t=>window.ChicMemoryAccess.notify(t);
  function showStyle(style){
    selected=style;const art=styles[style];
    $('memory-art').src=src(style);$('memory-art').alt=art.alt;
    $('art-title').textContent=art.title;$('art-number').textContent=art.number+' / 03';
    $('art-format').textContent=art.format;$('art-description').textContent=art.description;
    $('download-memory').href=src(style);$('download-memory').download='fuji-'+style+'.png';
    document.querySelectorAll('[data-memory-style]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.memoryStyle===style));
  }
  document.querySelectorAll('[data-memory-style]').forEach(b=>b.onclick=()=>showStyle(b.dataset.memoryStyle));
  $('memory-zoom').onclick=()=>{$('lightbox-art').src=src(selected);$('lightbox-art').alt=styles[selected].alt;$('art-lightbox').showModal();};
  $('close-art').onclick=()=>$('art-lightbox').close();
  $('photo-input').onchange=e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024){notify('請選擇 20MB 以內的 JPG、PNG 或 WebP');e.target.value='';return;}
    const candidate=URL.createObjectURL(file),probe=new Image();
    probe.onload=()=>{if(localUrl)URL.revokeObjectURL(localUrl);localUrl=candidate;$('local-photo-preview').src=localUrl;$('local-photo-name').textContent=file.name;$('local-photo').hidden=false;$('photo-status').textContent='照片已選好，僅在本機預覽。上方仍是富士山示範作品。';};
    probe.onerror=()=>{URL.revokeObjectURL(candidate);notify('無法讀取這張照片，請換一張。');};probe.src=candidate;
  };
  $('remove-local-photo').onclick=()=>{if(localUrl)URL.revokeObjectURL(localUrl);localUrl='';$('local-photo-preview').removeAttribute('src');$('photo-input').value='';$('local-photo').hidden=true;$('photo-status').textContent='照片僅在本機預覽，不會上傳。';};
  $('create-memory').onclick=()=>{
    if(!window.ChicMemoryAccess.isEligible()){location.hash='esim';notify('購買示範 eSIM 後解鎖創作，作品預覽免費。');return;}
    $('memory-result').textContent=localUrl?'照片與「'+styles[selected].short+'」風格已就緒。正式版會以你的照片生成；此原型可先分享上方的富士山示範作品。':'已解鎖創作流程。選一張自己的照片與風格，或先分享上方的富士山示範作品。';
    notify(localUrl?'照片與風格已準備完成；尚未呼叫生圖 AI。':'已解鎖，接著選擇你的旅行照片。');
  };
  function readEditor(){draft.text=$('thread-text').value;draft.link=$('thread-link').checked;}
  function syncEditor(){
    $('thread-art').src=src(draft.style);$('thread-art').alt=styles[draft.style].alt;
    $('thread-attachment').hidden=!draft.image;$('restore-thread-art').hidden=draft.image;
    $('thread-link-card').hidden=!draft.link;
    $('thread-count').textContent=draft.text.length+' / 500';
    $('publish-thread').disabled=!(draft.text.trim()||draft.image||draft.link);
    $('thread-text').style.height='auto';
    $('thread-text').style.height=Math.min(250,Math.max(90,$('thread-text').scrollHeight))+'px';
  }
  function openComposer(){
    opener=document.activeElement;
    if(!draft)draft={style:selected,text:'那天在富士山下，天色慢慢變藍。\n把旅行裡捨不得忘記的一刻，留成一張回憶。\n\n你會選哪一種風格？ #旅行回憶 #富士山',image:true,link:false};
    if(draft.style!==selected){draft.style=selected;draft.image=true;}
    $('thread-text').value=draft.text;$('thread-link').checked=draft.link;
    $('thread-editor').hidden=false;$('thread-published').hidden=true;
    $('composer-title').textContent='新串文';$('save-thread').hidden=false;
    $('cancel-thread').textContent='取消';$('threads-composer').showModal();syncEditor();
  }
  function closeComposer(){if(!$('thread-editor').hidden)readEditor();$('threads-composer').close();opener?.focus();}
  $('share-threads').onclick=openComposer;
  $('cancel-thread').onclick=closeComposer;
  $('save-thread').onclick=()=>{readEditor();closeComposer();notify('草稿已保留在此頁，重新開啟可繼續編輯。');};
  $('threads-composer').addEventListener('cancel',e=>{e.preventDefault();closeComposer();});
  $('thread-text').oninput=()=>{readEditor();syncEditor();};
  $('thread-link').onchange=()=>{readEditor();syncEditor();};
  $('remove-thread-art').onclick=()=>{draft.image=false;syncEditor();};
  $('restore-thread-art').onclick=()=>{draft.image=true;syncEditor();};
  $('publish-thread').onclick=()=>{
    readEditor();if(!(draft.text.trim()||draft.image||draft.link))return;
    $('published-text').textContent=draft.text;$('published-art').src=src(draft.style);$('published-art').hidden=!draft.image;
    $('published-link').href=publicUrl(draft.style);$('published-link').hidden=!draft.link;
    $('post-download').href=src(draft.style);$('post-download').download='fuji-'+draft.style+'.png';$('post-download').hidden=!draft.image;
    $('thread-editor').hidden=true;$('thread-published').hidden=false;$('composer-title').textContent='貼文預覽';$('cancel-thread').textContent='完成';$('save-thread').hidden=true;$('thread-feedback').textContent='圖片可另行下載；不會自動傳送到社群。';
    $('threads-composer').scrollTop=0;$('edit-thread').focus({preventScroll:true});
  };
  $('edit-thread').onclick=()=>{$('thread-editor').hidden=false;$('thread-published').hidden=true;$('composer-title').textContent='新串文';$('cancel-thread').textContent='取消';$('save-thread').hidden=false;$('threads-composer').scrollTop=0;$('thread-text').focus({preventScroll:true});};
  $('copy-thread').onclick=async()=>{
    const text=draft.text+(draft.link?'\n\n'+publicUrl(draft.style):'');
    try{if(!navigator.clipboard)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);$('thread-feedback').textContent='串文已複製；圖片可另外下載。';}
    catch{$('thread-feedback').textContent='瀏覽器未允許複製，請長按上方文字手動複製。';const range=document.createRange();range.selectNodeContents($('published-text'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
  };
  showStyle(selected);
})();
