(()=>{
  if(location.pathname!=='/operador/configuracoes')return;
  if(window.__tgaOperatorSettingsV2)return;window.__tgaOperatorSettingsV2=true;

  const app=document.getElementById('app'),view=window.__tgaOperatorView,user=window.__tgaCurrentOperator;
  if(!app||!view||!user){location.replace('/operador');return}
  const esc=view.esc;
  const req=(url,options={})=>view.requestJSON(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options},12000);

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
  const fmtDate=d=>d?String(d).slice(0,10):'';
  const calcAge=birth=>{
    if(!birth)return null;
    const d=new Date(birth+'T12:00:00');if(Number.isNaN(d.getTime()))return null;
    const n=new Date();let age=n.getFullYear()-d.getFullYear(),md=n.getMonth()-d.getMonth();
    if(md<0||(md===0&&n.getDate()<d.getDate()))age--;
    return age;
  };

  view.shell(user);
  app.innerHTML='<section class="ofdPage vgSettingsV2Page">'+view.tabs('settings')+
    '<section class="vgSettingsV2Content"><div class="vgSettingsV1Loading">CARREGANDO CONFIGURAÇÕES...</div></section></section>';
  view.enhanceOperatorSidebar();
  try{window.__tgaSyncVanguard?.()}catch{}

  async function load(){
    const box=app.querySelector('.vgSettingsV2Content');if(!box)return;
    try{
      const d=await req('/api/operator-profile?action=settings&t='+Date.now());
      const u=d.user||user,birth=fmtDate(u.birth_date),age=birth?calcAge(birth):(u.age??null),isMinor=age!==null&&Number(age)<18;
      const guardianId=String(d.guardian?.id||u.guardian_operator_id||'');
      window.__tgaCurrentOperator={...window.__tgaCurrentOperator,...u};

      box.innerHTML=
        '<section class="vgSettingsConsole">'+
          '<header class="vgSettingsConsoleHead">'+
            '<div><div class="eyebrow">CREDENCIAIS, SEGURANÇA & TUTORIA LEGAL</div><h2>CONFIGURAÇÕES DA CONTA — @'+esc(u.nickname||'OPERADOR')+'</h2>'+
            '<p>Atualize seus dados, segurança de acesso e responsável legal quando necessário.</p></div>'+
          '</header>'+
          '<form id="vgSettingsUnified">'+
            '<section class="vgMinorProtocol">'+
              '<div class="vgMinorCopy"><span class="vgMinorIcon">♙</span><div><b>PROTOCOLO DE MENOR DE IDADE — DESIGNAÇÃO DE TUTOR EM CAMPO</b>'+
              '<p>Jogadores menores de 18 anos devem obrigatoriamente selecionar um Operador Adulto ativo da equipe para responder como Tutor Tático e Legal durante as missões.</p></div></div>'+
              '<label class="vgMinorCheck"><input id="vgMinorFlag" type="checkbox" '+(isMinor?'checked':'')+' disabled><span>SOU MENOR DE IDADE<br>(&lt; 18 ANOS)</span></label>'+
              '<div id="vgTutorSelect" class="vgTutorSelect '+(isMinor?'show':'')+'"><label><span>OPERADOR RESPONSÁVEL / TUTOR</span><select name="guardian_operator_id" '+(isMinor?'required':'')+'><option value="">Selecionar responsável</option>'+
                (d.guardianOptions||[]).map(o=>'<option value="'+esc(o.id)+'" '+(String(o.id)===guardianId?'selected':'')+'>@'+esc(o.nickname)+' — '+esc(o.rank||'Operador')+'</option>').join('')+
              '</select></label></div>'+
            '</section>'+
            '<div class="vgSettingsTwin">'+
              '<section class="vgSettingsPane">'+
                '<h3>✉ CADASTRO DE E-MAIL E IDENTIFICAÇÃO</h3>'+
                '<label><span>CALLSIGN (CODINOME DE OPERADOR)</span><input name="nickname_display" value="'+esc(u.nickname||'')+'" readonly></label>'+
                '<label><span>NOME COMPLETO</span><input name="name" value="'+esc(u.name||'')+'" required></label>'+
                '<label><span>E-MAIL OFICIAL CADASTRADO</span><input name="email" type="email" value="'+esc(u.email||'')+'"></label>'+
                '<label><span>TELEFONE / WHATSAPP DE EMERGÊNCIA</span><input name="emergency_phone" value="'+esc(u.emergency_phone||'')+'" placeholder="(00) 00000-0000"></label>'+
                '<div class="vgSettingsTwo">'+
                  '<label><span>DATA DE NASCIMENTO</span><input id="vgNewBirth" name="birth_date" type="date" value="'+esc(birth)+'"></label>'+
                  '<label><span>TIPO SANGUÍNEO</span><input name="blood_type" value="'+esc(u.blood_type||'')+'" placeholder="Ex.: O+"></label>'+
                '</div>'+
                '<div class="vgSettingsTwo">'+
                  '<label><span>ANOS NO AIRSOFT</span><input name="airsoft_years" type="number" min="0" step=".5" value="'+(u.airsoft_years??'')+'"></label>'+
                  '<label><span>ESTILO DE JOGO</span><input name="play_style" value="'+esc(u.play_style||'')+'" placeholder="Ex.: Assault"></label>'+
                '</div>'+
              '</section>'+
              '<section class="vgSettingsPane security">'+
                '<h3>♙ ALTERAÇÃO DE SENHA E DADOS TÁTICOS</h3>'+
                '<label><span>SENHA ATUAL (OBRIGATÓRIA SOMENTE PARA TROCAR A SENHA)</span><input name="current_password" type="password" autocomplete="current-password"></label>'+
                '<label><span>NOVA SENHA DE ACESSO (DEIXE EM BRANCO PARA MANTER)</span><input name="new_password" type="password" minlength="8" autocomplete="new-password"></label>'+
                '<label><span>CONFIRMAR NOVA SENHA</span><input name="confirm_password" type="password" minlength="8" autocomplete="new-password"></label>'+
                '<div class="vgSettingsTwo">'+
                  '<label><span>CLASSE / FUNÇÃO DE COMBATE</span><input name="function" value="'+esc(String(u.function||'').replace(/,$/,''))+'" placeholder="Ex.: Assault"></label>'+
                  '<label><span>FARDAMENTO PADRÃO</span><input name="uniform_standard" value="'+esc(u.uniform_standard||'')+'" placeholder="Ex.: Multicam"></label>'+
                '</div>'+
                '<label><span>BIOGRAFIA TÁTICA / ESPECIALIDADES</span><textarea name="bio">'+esc(u.bio||'')+'</textarea></label>'+
                '<label><span>RESUMO DE EQUIPAMENTOS</span><textarea name="equipment_summary">'+esc(u.equipment_summary||'')+'</textarea></label>'+
              '</section>'+
            '</div>'+
            '<section class="vgSettingsBottom">'+
              '<div class="vgSettingsPhotoCompact"><img src="'+esc(u.photo_url||'/logo.webp')+'" alt="Foto do operador"><div><b>FOTO DO OPERADOR</b><small>Usada no perfil, listas e missões.</small><input id="vgNewPhoto" type="file" accept="image/*"></div></div>'+
              '<label class="vgPublicProfile"><input name="public_profile" type="checkbox" '+(u.public_profile!==false?'checked':'')+'><span>PERFIL VISÍVEL PARA VISITANTES</span></label>'+
              '<button class="goldbtn vgSaveAll" type="submit">⚙ SALVAR CONFIGURAÇÕES, SENHA E TUTORIA</button>'+
            '</section>'+
          '</form>'+
        '</section>'+
        ((d.responsibleFor||[]).length?'<section class="ofdCard vgSettingsResponsibleCard"><div class="eyebrow">TUTORIA ATIVA</div><h2>Operadores sob sua responsabilidade</h2><div class="vgSettingsResponsible">'+
          d.responsibleFor.map(o=>'<a href="/operador/equipe?operator='+encodeURIComponent(o.id)+'"><img src="'+esc(o.photo_url||'/logo.webp')+'" alt=""><span><b>@'+esc(o.nickname)+'</b><small>'+esc(o.rank||'Operador')+'</small></span><strong>VER PERFIL</strong></a>').join('')+
        '</div></section>':'');

      const form=document.getElementById('vgSettingsUnified'),birthEl=document.getElementById('vgNewBirth'),tutor=document.getElementById('vgTutorSelect'),minorFlag=document.getElementById('vgMinorFlag');
      const syncMinor=()=>{
        const a=calcAge(birthEl.value),m=a!==null&&a<18;
        minorFlag.checked=m;tutor.classList.toggle('show',m);
        const select=tutor.querySelector('select');if(select)select.required=m;
      };
      birthEl.onchange=syncMinor;syncMinor();

      form.onsubmit=async e=>{
        e.preventDefault();
        const btn=e.submitter,old=btn.textContent,fd=new FormData(form),newPass=String(fd.get('new_password')||''),confirm=String(fd.get('confirm_password')||''),current=String(fd.get('current_password')||'');
        if(newPass!==confirm)return alert('A confirmação da nova senha não confere.');
        if(newPass&&!current)return alert('Informe a senha atual para definir uma nova senha.');
        btn.disabled=true;btn.textContent='SALVANDO...';
        try{
          const profile={
            name:String(fd.get('name')||''),email:String(fd.get('email')||''),birth_date:String(fd.get('birth_date')||''),
            age:'',blood_type:String(fd.get('blood_type')||''),airsoft_years:String(fd.get('airsoft_years')||''),
            play_style:String(fd.get('play_style')||''),function:String(fd.get('function')||''),bio:String(fd.get('bio')||''),
            equipment_summary:String(fd.get('equipment_summary')||''),emergency_phone:String(fd.get('emergency_phone')||''),
            uniform_standard:String(fd.get('uniform_standard')||''),guardian_operator_id:String(fd.get('guardian_operator_id')||''),
            public_profile:form.elements.public_profile.checked
          };
          await req('/api/operator-profile?action=save-profile',{method:'POST',body:JSON.stringify(profile)});

          const photo=document.getElementById('vgNewPhoto').files[0];
          if(photo)await req('/api/media?action=upload-photo',{method:'POST',body:JSON.stringify({image_data:await compress(photo)})});

          if(newPass){
            await req('/api/index.js?action=update-login-settings',{method:'POST',body:JSON.stringify({
              name:profile.name,nickname:u.nickname,email:profile.email,current_password:current,new_password:newPass
            })});
          }
          alert('Configurações salvas.');
          if(photo)location.reload();else await load();
        }catch(err){alert(err.message)}
        finally{btn.disabled=false;btn.textContent=old}
      };

      try{window.__tgaSyncVanguard?.()}catch{}
    }catch(e){box.innerHTML='<div class="vgSettingsV1Error">'+esc(e.message)+'</div>'}
    finally{view.routeReady()}
  }
  load();
})();