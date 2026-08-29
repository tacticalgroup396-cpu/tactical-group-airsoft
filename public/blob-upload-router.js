(()=>{
  if(window.__tgaBlobRouter)return;window.__tgaBlobRouter=true;
  const original=window.fetch.bind(window);
  const mediaActions=new Set(['upload-photo','add-gallery','delete-gallery','equipment','delete-equipment','finish-game']);
  window.fetch=(input,init)=>{
    try{
      const raw=typeof input==='string'?input:input?.url;
      if(raw){
        const u=new URL(raw,location.href),action=u.searchParams.get('action')||'';
        const mainApi=(u.pathname==='/api/index.js'||u.pathname==='/api/index');
        if(u.origin===location.origin&&mainApi&&mediaActions.has(action)){
          return original(`/api/media?action=${encodeURIComponent(action)}`,init);
        }
        if(u.origin===location.origin&&(u.pathname==='/api/mission'||u.pathname==='/api/mission.js')&&action==='save'){
          let payload=null;
          try{payload=typeof init?.body==='string'?JSON.parse(init.body):null}catch{}
          const hasPhoto=!!String(payload?.mission_photo||'');
          if(!hasPhoto)return original(input,init);
          return (async()=>{
            const mediaResponse=await original('/api/media?action=mission-save',init);
            if(!mediaResponse.ok)return mediaResponse;
            const directPayload={...payload,mission_photo:''};
            return original('/api/mission?action=save',{...init,body:JSON.stringify(directPayload)});
          })();
        }
      }
    }catch(e){console.warn('blob router',e)}
    return original(input,init);
  };
})();