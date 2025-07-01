let participantes = JSON.parse(localStorage.getItem('pts')) || [];
let fase = localStorage.getItem('fase') || 'inscripcion';
let partidosRR = JSON.parse(localStorage.getItem('prr')) || [];
let rrJugados = parseInt(localStorage.getItem('rrj')) || 0;
let knockoutRounds = JSON.parse(localStorage.getItem('kn')) || [];

function guardar() {
  localStorage.setItem('pts', JSON.stringify(participantes));
  localStorage.setItem('fase', fase);
  localStorage.setItem('prr', JSON.stringify(partidosRR));
  localStorage.setItem('rrj', rrJugados);
  localStorage.setItem('kn', JSON.stringify(knockoutRounds));
}

function ordenar() {
  participantes.sort((a,b)=>b.puntos-a.puntos);
}

function renderInscripcion() {
  document.getElementById('listaParticipantes').textContent = participantes.map((p,i)=>`${i+1}. ${p.nombre}`).join('\n');
  document.getElementById('iniciarRRBtn').disabled = participantes.length < 2;
}

function crearRR() {
  partidosRR = [];
  participantes.forEach((_,i)=>{
    for(let j=i+1;j<participantes.length;j++){
      partidosRR.push({p1:i,p2:j, jugado:false});
    }
  });
  rrJugados = 0;
}

function renderRR() {
  const el = document.getElementById('partidosList');
  el.innerHTML = '';
  partidosRR.forEach((m,i)=>{
    const d = document.createElement('div');
    d.className='match';
    const n1=participantes[m.p1].nombre, n2=participantes[m.p2].nombre;
    d.innerHTML = `<span>${n1} vs ${n2}</span>
      <button ${m.jugado?'disabled':''} data-i="${i}" data-win="p1">Gana ${n1}</button>
      <button ${m.jugado?'disabled':''} data-i="${i}" data-win="p2">Gana ${n2}</button>`;
    el.appendChild(d);
  });
  el.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      const i = b.dataset.i, w=b.dataset.win;
      const m=partidosRR[i];
      const a = participantes[m[w==='p1'? 'p1':'p2']];
      const o = participantes[m[w==='p1'? 'p2':'p1']];
      a.victorias++; a.puntos+=2;
      o.derrotas++; o.puntos+=1;
      m.jugado=true; rrJugados++;
      renderRR(); renderTabla();
      if(rrJugados===partidosRR.length){
        document.getElementById('iniciarKnockoutBtn').disabled=false;
        alert('Grupos completos');
      }
      guardar();
    };
  });
}

function renderTabla() {
  ordenar();
  const tbody = document.querySelector('#tablaPosiciones tbody');
  tbody.innerHTML='';
  participantes.forEach((p,i)=>{
    tbody.innerHTML += `<tr><td>${i+1}</td><td>${p.nombre}</td><td>${p.puntos}</td><td>${p.victorias}</td><td>${p.derrotas}</td></tr>`;
  });
}

function iniciarRR() {
  fase='round-robin'; crearRR();
  document.querySelector('[data-tab="round-robin"]').disabled=false;
  abrirTab('round-robin');
  renderRR(); renderTabla(); guardar();
}

function generarKnockout() {
  fase='bracket'; ordenar();
  const n=participantes.length;
  let size=1; while(size*2<=n)size*=2;
  const cls = participantes.slice(0,size);
  knockoutRounds=[cls.map(p=>({p1:p.nombre, ganador:null}))];
  while(knockoutRounds[knockoutRounds.length-1].length>1) {
    knockoutRounds.push(knockoutRounds[knockoutRounds.length-1].map((m,i)=>(i%2===0)?{p1:null,ganador:null}:null).filter(Boolean));
  }
  document.querySelector('[data-tab="bracket"]').disabled=false;
  abrirTab('bracket'); renderBracket(); guardar();
}

function renderBracket() {
  const cont = document.getElementById('bracketContainer');
  cont.innerHTML='';
  knockoutRounds.forEach((round,ri)=>{
    const div = document.createElement('div');
    div.className='bracket-round';
    div.innerHTML = `<h3>Ronda ${ri+1}</h3>`;
    round.forEach((m,mi)=>{
      const matchDiv = document.createElement('div');
      matchDiv.className='bracket-match';
      const name = m.p1 + (m.ganador?` → 🏆${m.ganador}`:'');
      matchDiv.innerHTML = `<span>${name}</span>
        ${!m.ganador && round.length>1 ? `<button data-ri="${ri}" data-mi="${mi}">Declarar ganador</button>` : ''}`;
      div.appendChild(matchDiv);
    });
    cont.appendChild(div);
  });
  cont.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      const ri=b.dataset.ri, mi=b.dataset.mi;
      const m=knockoutRounds[ri][mi];
      const win = prompt(`Ganador: ${m.p1}`);
      if(win){
        m.ganador = win;
        if(knockoutRounds[ri+1]){
          const nmatch = knockoutRounds[ri+1][Math.floor(mi/2)];
          nmatch.p1 = win;
        }
        renderBracket(); guardar();
      }
    };
  });
}

function abrirTab(id){
  document.querySelectorAll('.tab-button').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  document.querySelectorAll('.tab').forEach(sec=>sec.classList.toggle('active', sec.id===id));
}

document.getElementById('agregarBtn').onclick=()=>{
  const name = document.getElementById('nombreInput').value.trim();
  if(!name) return;
  if(participantes.some(p=>p.nombre.toLowerCase()===name.toLowerCase())){
    alert('Duplicado'); return;
  }
  participantes.push({nombre:name,puntos:0,victorias:0,derrotas:0});
  document.getElementById('nombreInput').value='';
  renderInscripcion(); guardar();
};
document.getElementById('iniciarRRBtn').onclick=iniciarRR;
document.getElementById('iniciarKnockoutBtn').onclick=generarKnockout;
document.querySelectorAll('.tab-button').forEach(b=>b.onclick=()=>{ if(!b.disabled) abrirTab(b.dataset.tab); });

renderInscripcion();
if(fase!=='inscripcion'){
  document.querySelector(`[data-tab="${fase}"]`).disabled=false;
  abrirTab(fase);
  if(fase==='round-robin'){ renderRR(); renderTabla(); document.getElementById('iniciarKnockoutBtn').disabled = rrJugados<partidosRR.length; }
  else if(fase==='bracket'){ renderBracket(); }
}
