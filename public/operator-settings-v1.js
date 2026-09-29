(()=>{
  if(location.pathname!=='/operador/configuracoes')return;
  if(window.__tgaOperatorSettingsV1)return;window.__tgaOperatorSettingsV1=true;

  const app=document.getElementById('app'),view=window.__tgaOperatorView,user=window.__tgaCurrentOperator;
  if(!app||!view||!user){location.replace('/operador');return}
  const esc=view.esc;
  const req=async(url,options={})=>view.requestJSON(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options},12000);

  async function compress(file){
    if(!file?.size)return'';
    if(file.size>5_000_000)throw new Error('Use uma foto de até 5 MB.');
    const src=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(file)});
    const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
    const scale=Math.min(1,1400/Math.max(img.width,img.height)),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
    c.getContext('2d',{alpha:false}).drawImage(img,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.8);
  }

  const minor=u=>u?.age!==null&&u?.age!==undefined&&u?.age!==''&&Number(u.age)<18;
  const fmtDate=d=>d?String(d).slice(0,10):'';

  view.shell(user);
  app.innerHTML='<section class="ofdPage vgSettingsV1Page">'+view.hero(user)+view.tabs('settings')+
    '<section class="vgSettingsV1Content"><div class="vgSettingsV1Loading">CARREGANDO CONFIGURAÇÕES...</div></section></section>';
  view.enhanceOperatorSidebar();
  try{window.__tgaSyncVanguard?.()}catch{}

  async function load(){
    const box=app.querySelector('.vgSettingsV1Content');if(!box)return;
    try{
      const d=await req('/api/operator-profile?action=settings&t='+Date.now());
      const u=d.user||user,birth=fmtDate(u.birth_date),isMinor=minor(u),guardianId=String(d.guardian?.id||u.guardian_operator_id||'');
      window.__tgaCurrentOperator={...window.__tgaCurrentOperator,...u};
      box.innerHTML=
        '<section class="ofdCard vgSettingsCard">'+
          '<div class="eyebrow">PERFIL DO OPERADOR</div><h2>Dados pessoais</h2>'+
          '<form id="vgSettingsProfile" class="vgSettingsGrid">'+
            '<label><span>NOME</span><input name="name" value="'+esc(u.name||'')+'" required></label>'+
            '<label><span>E-MAIL</span><input name="email" type="email" value="'+esc(u.email||'')+'"></label>'+
            '<label><span>DATA DE NASCIMENTO</span><input id="vgSettingsBirth" name="birth_date" type="date" value="'+esc(birth)+'"></label>'+
            '<label><span>IDADE</span><input id="vgSettingsAge" name="age" type="number" min="0" max="120" value="'+(u.age??'')+'" '+(birth?'readonly':'')+'></label>'+
            '<label><span>TIPO SANGUÍNEO</span><input name="blood_type" value="'+esc(u.blood_type||'')+'" placeholder="Ex.: O+"></label>'+
            '<label><span>ANOS NO AIRSOFT</span><input name="airsoft_years" type="number" min="0" step=".5" value="'+(u.airsoft_years??'')+'"></label>'+
            '<label><span>ESTILO DE JOGO</span><input name="play_style" value="'+esc(u.play_style||'')+'" placeholder="Ex.: Assault"></label>'+
            '<label><span>FUNÇÃO NA EQUIPE</span><input name="function" value="'+esc(String(u.function||'').replace(/,$/,''))+'"></label>'+
            '<label class="wide"><span>BIO</span><textarea name="bio" placeholder="Conte um pouco sobre sua função e experiência.">'+esc(u.bio||'')+'</textarea></label>'+
            '<label class="wide"><span>RESUMO DOS EQUIPAMENTOS</span><textarea name="equipment_summary" placeholder="Resumo do seu loadout e equipamentos.">'+esc(u.equipment_summary||'')+'</textarea></label>'+
            '<div id="vgSettingsGuardianBox" class="vgSettingsGuardian wide" '+(isMinor?'':'hidden')+'><div class="eyebrow">RESPONSÁVEL / TUTOR</div><label><span>OPERADOR RESPONSÁVEL</span><select name="guardian_operator_id" id="vgSettingsGuardian"><option value="">Selecionar responsável</option>'+
              (d.guardianOptions||[]).map(o=>'<option value="'+esc(o.id)+'" '+(String(o.id)===guardianId?'selected':'')+'>@'+esc(o.nickname)+' — '+esc(o.rank||'Operador')+'</option>').join('')+
            '</select></label></div>'+
            '<label class="wide vgSettingsCheck"><span><input name="public_profile" type="checkbox" '+(u.public_profile!==false?'checked':'')+'> Exibir meu perfil para visitantes</span></label>'+
            '<button class="goldbtn wide" type="submit">SALVAR INFORMAÇÕES</button>'+
          '</form>'+
        '</section>'+
        '<section class="ofdCard vgSettingsCard">'+
          '<div class="eyebrow">IDENTIFICAÇÃO VISUAL</div><h2>Foto do operador</h2>'+
          '<div class="vgSettingsPhotoRow"><div class="vgSettingsCurrentPhoto">'+
            (u.photo_url?'<img src="'+esc(u.photo_url)+'" alt="Foto de perfil">':'<img src="/logo.webp" alt="Operador">')+
          '</div><div><p class="muted">Atualize a foto usada no seu perfil e no efetivo da equipe.</p><input id="vgSettingsPhoto" type="file" accept="image/*"><button id="vgSettingsSavePhoto" class="goldbtn" type="button">SALVAR FOTO</button></div></div>'+
        '</section>'+
        ((d.responsibleFor||[]).length?'<section class="ofdCard vgSettingsCard"><div class="eyebrow">TUTORIA</div><h2>Operadores sob sua responsabilidade</h2><div class="vgSettingsResponsible">'+
          d.responsibleFor.map(o=>'<a href="/operador/equipe?operator='+encodeURIComponent(o.id)+'"><img src="'+esc(o.photo_url||'/logo.webp')+'" alt=""><span><b>@'+esc(o.nickname)+'</b><small>'+esc(o.rank||'Operador')+'</small></span><strong>VER PERFIL</strong></a>').join('')+
        '</div></section>':'')+
        '<section class="ofdCard vgSettingsCard">'+
          '<div class="eyebrow">SEGURANÇA DA CONTA</div><h2>Acesso e senha</h2>'+
          '<form id="vgSettingsAccess" class="vgSettingsGrid">'+
            '<label><span>NOME</span><input name="name" value="'+esc(u.name||'')+'" required></label>'+
            '<label><span>APELIDO</span><input name="nickname" value="'+esc(u.nickname||'')+'" required></label>'+
            '<label class="wide"><span>E-MAIL</span><input name="email" type="email" value="'+esc(u.email||'')+'"></label>'+
            '<label><span>SENHA ATUAL *</span><input name="current_password" type="password" required autocomplete="current-password"></label>'+
            '<label><span>NOVA SENHA</span><input name="new_password" type="password" minlength="8" autocomplete="new-password" placeholder="Mínimo de 8 caracteres"></label>'+
            '<button class="goldbtn wide" type="submit">SALVAR ACESSO E SENHA</button>'+
          '</form>'+
        '</section>'+
        '<section class="ofdCard vgSettingsGearLink"><div><div class="eyebrow">ARSENAL</div><h2>Equipamentos, AEG & Fotos</h2><p class="muted">O inventário agora fica em uma página própria para evitar duplicação nas configurações.</p></div><a class="goldbtn" href="/operador/equipamentos">ABRIR INVENTÁRIO</a></section>';

      const birthEl=document.getElementById('vgSettingsBirth'),ageEl=document.getElementById('vgSettingsAge'),guardianBox=document.getElementById('vgSettingsGuardianBox'),guardian=document.getElementById('vgSettingsGuardian');
      const syncAge=()=>{
        let age=ageEl.value===''?NaN:Number(ageEl.value);
        if(birthEl.value){
          const dt=new Date(birthEl.value+'T12:00:00'),now=new Date();
          age=now.getFullYear()-dt.getFullYear();
          const md=now.getMonth()-dt.getMonth();
          if(md<0||(md===0&&now.getDate()<dt.getDate()))age--;
          ageEl.value=age;ageEl.readOnly=true;
        }else ageEl.readOnly=false;
        const m=Number.isFinite(age)&&age<18;
        guardianBox.hidden=!m;if(guardian)guardian.required=m;
      };
      birthEl.onchange=syncAge;ageEl.oninput=syncAge;syncAge();

      document.getElementById('vgSettingsProfile').onsubmit=async e=>{
        e.preventDefault();const btn=e.submitter,old=btn.textContent;btn.disabled=true;btn.textContent='SALVANDO...';
        try{
          const data=Object.fromEntries(new FormData(e.target));data.public_profile=e.target.elements.public_profile.checked;
          await req('/api/operator-profile?action=save-profile',{method:'POST',body:JSON.stringify(data)});
          alert('Informações salvas.');await load();try{window.__tgaSyncVanguard?.()}catch{}
        }catch(err){alert(err.message)}finally{btn.disabled=false;btn.textContent=old}
      };
      document.getElementById('vgSettingsSavePhoto').onclick=async()=>{
        const input=document.getElementById('vgSettingsPhoto'),file=input.files[0];if(!file)return alert('Selecione uma foto.');
        const btn=document.getElementById('vgSettingsSavePhoto'),old=btn.textContent;btn.disabled=true;btn.textContent='SALVANDO...';
        try{
          await req('/api/media?action=upload-photo',{method:'POST',body:JSON.stringify({image_data:await compress(file)})});
          alert('Foto atualizada.');location.reload();
        }catch(err){alert(err.message)}finally{btn.disabled=false;btn.textContent=old}
      };
      document.getElementById('vgSettingsAccess').onsubmit=async e=>{
        e.preventDefault();const btn=e.submitter,old=btn.textContent;btn.disabled=true;btn.textContent='SALVANDO...';
        try{
          const data=Object.fromEntries(new FormData(e.target));
          await req('/api/index.js?action=update-login-settings',{method:'POST',body:JSON.stringify(data)});
          alert('Acesso atualizado.');
          if(data.nickname)window.__tgaCurrentOperator={...window.__tgaCurrentOperator,nickname:String(data.nickname).toUpperCase(),name:data.name,email:data.email};
          try{window.__tgaSyncVanguard?.()}catch{}
          e.target.elements.current_password.value='';e.target.elements.new_password.value='';
        }catch(err){alert(err.message)}finally{btn.disabled=false;btn.textContent=old}
      };

      try{window.__tgaSyncVanguard?.()}catch{}
    }catch(e){box.innerHTML='<div class="vgSettingsV1Error">'+esc(e.message)+'</div>'}
    finally{view.routeReady()}
  }

  load();
})();