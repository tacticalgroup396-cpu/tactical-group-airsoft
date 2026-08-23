(()=>{
  const p=(location.pathname.replace(/\/+$/,'')||'/');
  if(p!=='/comandante/jogos')return;

  function addCss(){
    if(document.getElementById('tgaCreateFixV2Css'))return;
    const s=document.createElement('style');
    s.id='tgaCreateFixV2Css';
    s.textContent=`
      .tgaDeadlineV2{grid-column:1/-1;padding:16px;border:1px solid #d9a326;border-radius:15px;background:linear-gradient(145deg,rgba(217,163,38,.14),rgba(20,20,15,.94));margin:10px 0}
      .tgaDeadlineV2 .title{color:#e1a923;font-weight:800;letter-spacing:.08em;font-size:.86rem}
      .tgaDeadlineV2 h3{margin:4px 0 5px}.tgaDeadlineV2 p{margin:0 0 12px;opacity:.82}
      .tgaDeadlineV2Fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .tgaDeadlineV2 label{display:flex;flex-direction:column;gap:5px;font-weight:700}.tgaDeadlineV2 label span{color:#d9a326}.tgaDeadlineV2 input{width:100%}
      .tgaRoundsDayNote{grid-column:1/-1;padding:11px 12px;border:1px dashed #5b4b22;border-radius:11px;background:#12130f;margin:2px 0 8px}
      @media(max-width:620px){.tgaDeadlineV2Fields{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function ensureSubmit(form){
    const btn=[...form.querySelectorAll('button')].find(b=>/publicar jogo/i.test(b.textContent||''))||form.querySelector('button[type="submit"]');
    if(btn){btn.setAttribute('type','submit');btn.disabled=false}
  }

  function removeOldDeadlinePieces(form){
    form.querySelector('.deadlineEditHint')?.remove();
    const old=form.querySelector('#tgaDeadlineBlock');
    if(old&&!old.matches('#tgaDeadlineV2'))old.remove();
  }

  function ensureDeadline(form){
    if(form.querySelector('#tgaDeadlineV2'))return;
    const oldDate=form.querySelector('[name="rsvp_deadline_date"]');
    const oldTime=form.querySelector('[name="rsvp_deadline_time"]');
    const dateValue=oldDate?.value||'';
    const timeValue=oldTime?.value||'';
    if(oldDate){const w=oldDate.closest('label')||oldDate;w.remove()}
    if(oldTime){const w=oldTime.closest('label')||oldTime;w.remove()}

    const block=document.createElement('div');
    block.id='tgaDeadlineV2';
    block.className='tgaDeadlineV2';
    block.innerHTML=`<div class="title">PRAZO DA LISTA</div><h3>LISTA DE PRESENÇA EXPIRA EM</h3><p>Nesta data e hora a lista fecha automaticamente. Quem continuar em <b>Não respondeu</b> recebe a penalidade de Elo configurada para o jogo.</p><div class="tgaDeadlineV2Fields"><label><span>Data de expiração</span><input type="date" name="rsvp_deadline_date" value="${dateValue}" required></label><label><span>Hora de expiração</span><input type="time" name="rsvp_deadline_time" value="${timeValue}" required></label></div>`;
    const mission=form.querySelector('#tgaMissionCreate');
    mission?form.insertBefore(block,mission):form.appendChild(block);
  }

  function moveRoundsToGameDay(form){
    const mission=form.querySelector('#tgaMissionCreate');if(!mission)return;
    const input=mission.querySelector('[name="total_rounds"]');
    if(input){input.closest('label')?.remove()}
    const head=mission.querySelector('.tgaMissionHead p');
    if(head)head.textContent='Configure missão e regras de Elo. A quantidade de partidas será definida no Centro de Operações, no dia do jogo.';
    const grid=mission.querySelector('.tgaMissionGrid');
    if(grid&&!grid.querySelector('.tgaRoundsDayNote')){
      const note=document.createElement('div');note.className='tgaRoundsDayNote';note.innerHTML='<b>Quantidade de partidas:</b> definir no Centro de Operações quando o jogo começar.';grid.insertBefore(note,grid.firstChild);
    }
  }

  function fix(){
    const form=document.getElementById('gameForm');if(!form)return;
    removeOldDeadlinePieces(form);ensureSubmit(form);ensureDeadline(form);moveRoundsToGameDay(form);
  }

  addCss();
  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fix()})};
  schedule();setTimeout(schedule,250);setTimeout(schedule,900);setTimeout(schedule,1800);
  const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
})();
