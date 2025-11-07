(function(){
  const $=s=>document.querySelector(s);
  const drop=$('#drop'), fileInput=$('#fileInput'), progressWrap=$('#progressWrap'), progressBar=$('#progressBar'), meta=$('#meta'), errorBox=$('#error'), title=$('#title');

  let settings={ QuestionLabel:'Upload your file', Accept:'.pdf,.png,.jpg,.jpeg', MaxFileSizeMB:'100', Endpoint:'', Required:'true' };
  let uploadedValue=null;

  function resize(){ if(window.JFCustomWidget?.requestFrameResize){ JFCustomWidget.requestFrameResize({height:document.body.scrollHeight}); } }
  function showError(m){ errorBox.textContent=m||''; errorBox.style.display=m?'block':'none'; resize(); }
  function setProgress(p){ progressWrap.hidden=false; progressBar.style.width=`${Math.max(0,Math.min(100,p))}%`; }
  function formatBytes(b){ if(!b)return'0 B'; const k=1024,s=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(k)); return (b/Math.pow(k,i)).toFixed(2)+' '+s[i]; }

  function validate(file){
    const max=(Number(settings.MaxFileSizeMB)||100)*1024*1024;
    if(file.size>max) throw new Error(`File exceeds ${settings.MaxFileSizeMB} MB`);
    const acc=(settings.Accept||'').trim(); if(acc && acc!=='*'){ const allowed=acc.split(',').map(s=>s.trim().toLowerCase()); const ext='.'+(file.name.split('.').pop()||'').toLowerCase(); const mime=(file.type||'').toLowerCase(); if(!(allowed.includes(ext)||allowed.includes(mime))) throw new Error(`Allowed types: ${acc}`); }
  }

  async function handleFile(file){
    showError(''); meta.textContent=`${file.name} · ${file.type||'unknown'} · ${formatBytes(file.size)}`; resize();
    try{
      validate(file); setProgress(5);
      const value=await upload(settings.Endpoint,file,p=>setProgress(5+p*0.9));
      uploadedValue=JSON.stringify(value); setProgress(100); resize();
    }catch(e){ uploadedValue=null; setProgress(0); progressWrap.hidden=true; showError(e.message||String(e)); }
  }

  function xhrUpload(url,form,onProgress){
    return new Promise((res,rej)=>{ const x=new XMLHttpRequest(); x.open('POST',url); x.upload.onprogress=e=>{ if(e.lengthComputable && onProgress) onProgress((e.loaded/e.total)*100); }; x.onload=()=> (x.status>=200&&x.status<300)?res(x.responseText):rej(new Error(`HTTP ${x.status}`)); x.onerror=()=>rej(new Error('Network error')); x.send(form); });
  }

  async function upload(endpoint,file,onProgress){
    if(!endpoint) throw new Error('Upload endpoint missing. Set Endpoint in widget settings.');
    const form=new FormData(); form.append('file',file,file.name); form.append('meta',JSON.stringify({source:'jotform-widget',ts:Date.now()}));
    const raw=await xhrUpload(endpoint,form,onProgress); let out; try{ out=JSON.parse(raw);}catch{ throw new Error('Invalid server response'); }
    if(!out?.ok) throw new Error(out?.error||'Upload failed');
    return { name:out.name||file.name, size:out.size||file.size, type:out.mime||file.type, storage:'Drive', fileId:out.id, url:out.url };
  }

  drop.addEventListener('click',()=>fileInput.click());
  drop.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' ') fileInput.click(); });
  drop.addEventListener('dragover',e=>e.preventDefault());
  drop.addEventListener('drop',e=>{ e.preventDefault(); const f=e.dataTransfer?.files?.[0]; if(f) handleFile(f); });
  fileInput.addEventListener('change',e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); });

  JFCustomWidget.subscribe('ready',function(){
    try{
      ['QuestionLabel','Accept','MaxFileSizeMB','Endpoint','Required'].forEach(k=>{ const v=JFCustomWidget.getWidgetSetting(k); if(v) settings[k]=v; });
      title.textContent=settings.QuestionLabel||'Upload your file';
      if(settings.Accept) fileInput.setAttribute('accept',settings.Accept);
    }catch(_){}
    resize();
  });

  JFCustomWidget.subscribe('submit',function(){
    const must=String(settings.Required||'true').toLowerCase()==='true';
    const ok=!!uploadedValue || !must;
    JFCustomWidget.sendSubmit({ valid: ok, value: uploadedValue || '' });
    if(!ok) showError('Please upload a file.');
  });
})();
