(()=>{
  const p=(location.pathname.replace(/\/+$/,'')||'/');
  if(p!=='/comandante/jogos')return;

  function addCss(){
    if(document.getElementById('tgaDeadlineBlockCss'))return;
    const s=document.createElement('style');
    s.id='tgaDeadlineBlockCss';
    s.textContent=`
      .tgaDeadlineBlock{grid-column:1/-1;padding:16px;border:1px solid #d9a326;border-radius:15px;background:linear-gradient(145deg,rgba(217,163,38,.14),rgba(20,20,15,.92));margin:4px 0 8px}
      .tgaDeadlineTitle{color:#e1a923;font-weight:800;letter-spacing:.08em;font-size:.88rem;margin-bottom:4px}
      .tgaDeadlineBlock h3{margin:0 0 5px}.tgaDeadlineBlock p{margin:0 0 12px;opacity:.82}
      .tgaDeadlineFields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .tgaDeadlineFields label{display:flex;flex-direction:column;gap:5px;font-weight:700}.tgaDeadlineFields label>span{color:#d9a326}
      .tgaDeadlineFields input{width:100%}
      @media(max-width:620px){.tgaDeadlineFields{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function enhance(){
    const form=document.getElementById('gameForm');
    if(!form||form.querySelector('#tgaDeadlineBlock'))return;
    const date=form.querySelector('[name="rsvp_deadline_date"]');
    const time=form.querySelector('[name="rsvp_deadline_time"]');
    if(!date||!time)return;

    const dateWrap=date.closest('.tgaFieldLabel')||date.parentElement;
    const timeWrap=time.closest('.tgaFieldLabel')||time.parentElement;
    const block=document.createElement('div');
    block.id='tgaDeadlineBlock';
    block.className='tgaDeadlineBlock';
    block.innerHTML=`<div class="tgaDeadlineTitle">PRAZO DA LISTA</div><h3>LISTA DE PRESENÇA EXPIRA EM</h3><p>Na data e hora abaixo a lista fecha automaticamente. Operadores que ainda estiverem em <b>Não respondeu</b> recebem a perda de Elo definida para este jogo.</p><div class="tgaDeadlineFields"></div>`;
    const fields=block.querySelector('.tgaDeadlineFields');

    if(dateWrap?.classList?.contains('tgaFieldLabel')){
      const span=dateWrap.querySelector(':scope > span');if(span)span.textContent='Data de expiração';
      fields.appendChild(dateWrap);
    }else{
      const l=document.createElement('label');l.innerHTML='<span>Data de expiração</span>';l.appendChild(date);fields.appendChild(l);
    }
    if(timeWrap?.classList?.contains('tgaFieldLabel')){
      const span=timeWrap.querySelector(':scope > span');if(span)span.textContent='Hora de expiração';
      fields.appendChild(timeWrap);
    }else{
      const l=document.createElement('label');l.innerHTML='<span>Hora de expiração</span>';l.appendChild(time);fields.appendChild(l);
    }

    const mission=form.querySelector('#tgaMissionCreate');
    if(mission)form.insertBefore(block,mission);
    else{
      const submit=[...form.querySelectorAll('button')].find(b=>/publicar jogo/i.test(b.textContent||''))||form.querySelector('button[type="submit"]');
      submit?form.insertBefore(block,submit):form.appendChild(block);
    }
  }

  addCss();
  let scheduled=false;
  const run=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})};
  run();setTimeout(run,250);setTimeout(run,900);setTimeout(run,1800);
  const app=document.getElementById('app');
  if(app)new MutationObserver(run).observe(app,{childList:true,subtree:true});
})();