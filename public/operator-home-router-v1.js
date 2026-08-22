(()=>{
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/operador')return;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init={})=>{
    try{
      const raw=typeof input==='string'?input:input?.url;if(!raw)return nativeFetch(input,init);
      const u=new URL(raw,location.origin),method=String(init?.method||'GET').toUpperCase();
      if(method==='GET'&&(u.pathname==='/api/operator-dashboard'||u.pathname==='/api/operator-dashboard.js')&&(u.searchParams.get('action')||'dashboard')==='dashboard')return nativeFetch('/api/operator-home-fast',{...init,cache:'no-store',credentials:'same-origin'});
      return nativeFetch(input,init)
    }catch{return nativeFetch(input,init)}
  }
})();
