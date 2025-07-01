// Datos desde localStorage o inicial nuevos
let participantes = JSON.parse(localStorage.getItem('pts')) || [];
let fase = localStorage.getItem('fase') || 'inscripcion';
let partidosRR = JSON.parse(localStorage.getItem('prr')) || [];
let rrJugados = parseInt(localStorage.getItem('rrj')) || 0;
let knockout = JSON.parse(localStorage.getItem('kn')) || {};
let clasificados = JSON.parse(localStorage.getItem('cls')) || [];

// Guardar todo
function guardar() {
  localStorage.setItem('pts', JSON.stringify(participantes));
  localStorage.setItem('fase', fase);
  localStorage.setItem('prr', JSON.stringify(partidosRR));
  localStorage.setItem('rrj', rrJugados);
  localStorage.setItem('kn', JSON.stringify(knockout));
  localStorage.setItem('cls', JSON.stringify(clasificados));
}

// Helpers
function ordenarTabla() {
  participantes.sort((a, b) => b.puntos - a.puntos);
}
function renderInscripcion() {
  const area = document.getElementById('listaParticipantes');
  area.textContent = participantes.map((p,i)=>`${i+1}. ${p.nombre}`).join('\n');
  document.getElementById('iniciarRRBtn').disabled = participantes.length < 2;
}
function crearPartidosRR() {
  partidosRR = [];
  for (let i=0;i<participantes.length;i++)
    for (let j=i+1;j<participantes.length;j++)
      partidosRR.push({p1:i,p2:j, jugado:false, ganador:null});
  rrJugados = 0;
}
function renderRR() {
  const list = document.getElementById('partidosList');
  list.innerHTML = '';
  partidosRR.forEach((m, idx) => {
    const div = document.createElement('div');
    div.className='match';
    const n1 = participantes[m.p1].nombre;
    const n2 = participantes[m.p2].nombre;
    div.innerHTML = `
      ${n1} vs ${n2}
      <button ${m.jugado?'disabled':''} data-idx="${idx}" data-win="p1">Gana ${n1}</button>
      <button ${m.jugado?'disabled':''} data-idx="${idx}" data-win="p2">Gana ${n2}</button>
    `;
    list.appendChild(div);
  });
  document.querySelectorAll('#partidosList button').forEach(btn=>{
    btn.onclick = ()=>{
      const idx = btn.dataset.idx, win = btn.dataset.win;
      if (win==='p1') {
        participantes[partidosRR[idx].p1].victorias +=1;
        participantes[partidosRR[idx].p1].puntos +=2;
        participantes[partidosRR[idx].p2].derrotas+=1;
        participantes[partidosRR[idx].p2].puntos +=1;
      } else {
        participantes[partidosRR[idx].p2].victorias++;
        participantes[partidosRR[idx].p2].puntos+=2;
        participantes[partidosRR[idx].p1].derrotas++;
        participantes[partidosRR[idx].p1].puntos+=1;
      }
      partidosRR[idx].jugado = true;
      rrJugados++;
      renderRR();
      renderTabla();
      if (rrJugados === partidosRR.length) {
        document.getElementById('iniciarKnockoutBtn').disabled=false;
        alert('Fase de grupos completada');
      }
      guardar();
    };
  });
}
function renderTabla() {
  ordenarTabla();
  const tbody = document.querySelector('#tablaPosiciones tbody');
  tbody.innerHTML = '';
  participantes.forEach((p,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${p.nombre}</td><td>${p.puntos}</td><td>${p.victorias}</td><td>${p.derrotas}</td>`;
    tbody.appendChild(tr);
  });
}
function iniciarRR() {
  fase='round-robin';
  crearPartidosRR();
  document.querySelector('[data-tab="round-robin"]').disabled=false;
  abrirTab('round-robin');
  renderRR(); renderTabla();
  guardar();
}
function generarKnockout() {
  fase='knockout';
  ordenarTabla();
  const n = participantes.length;
  let size=1;
  while(size*2<=n) size*=2;
  clasificados = participantes.slice(0,size);
  knockout = {};
  let seeds=[...Array(size).keys()].map(i=>i);
  let round=1;
  let cur=seeds;
  while(cur.length>1) {
    knockout[round]=[];
    const next=[];
    for(let i=0;i<cur.length;i+=2){
      knockout[round].push({p1:clasificados[cur[i]].nombre, p2:clasificados[cur[i+1]].nombre, ganador:null});
      next.push(`winner${round}_${i/2}`);
    }
    round++;
    cur = next;
  }
  document.querySelector('[data-tab="bracket"]').disabled=false;
  abrirTab('bracket');
  guardar();
  renderBracket();
}
function renderBracket() {
  const canvas = document.getElementById('bracketCanvas');
  const ctx = canvas.getContext('2d');
  const rounds = Object.keys(knockout).length;
  const width = canvas.width = rounds * 250 + 200;
  const height = canvas.height = clasificados.length * 80;
  ctx.clearRect(0,0,width,height);
  let roundIdx=0;
  for(const r in knockout){
    const games = knockout[r];
    games.forEach((g,i)=>{
      const x = roundIdx * 250 + 50;
      const y = i * 160 + 60;
      ctx.strokeStyle='#ccc'; ctx.fillStyle='#fff';
      ctx.lineWidth=2;
      ctx.roundRect(x,y,180,50,8);
      ctx.stroke();
      ctx.fill();
      ctx.fillStyle='#212121';
      ctx.font='14px Segoe UI';
      ctx.fillText(g.p1 + ' vs ' + g.p2, x+10, y+30);
      if (!g.ganador){
        // botón virtual
        canvas.addEventListener('click', function handler(ev){
          if(ev.x >= x && ev.x<=x+180 && ev.y>=y && ev.y<=y+50){
            const win = prompt(`¿Ganador: "${g.p1}" o "${g.p2}"?`);
            if(win === g.p1 || win === g.p2){
              g.ganador = win;
              // avanzar lógica sencilla
              renderBracket();
              guardar();
            }
            canvas.removeEventListener('click', handler);
          }
        });
      } else {
        ctx.fillStyle='#4caf50';
        ctx.font='bold 16px Segoe UI';
        ctx.fillText('🏆 ' + g.ganador, x+10, y+30);
      }
    });
    roundIdx++;
  }
}

// Tab logic
function abrirTab(id){
  document.querySelectorAll('.tab-button').forEach(btn=>btn.classList.toggle('active', btn.dataset.tab===id));
  document.querySelectorAll('.tab').forEach(sec=>sec.classList.toggle('active', sec.id===id));
  guardar();
}

// Eventos
document.getElementById('agregarBtn').onclick = ()=>{
  const name = document.getElementById('nombreInput').value.trim();
  if(!name) return;
  if(participantes.some(p=>p.nombre.toLowerCase()===name.toLowerCase())){
    alert('Nombre duplicado');
    return;
  }
  participantes.push({nombre:name,puntos:0,victorias:0,derrotas:0});
  document.getElementById('nombreInput').value='';
  renderInscripcion(); guardar();
};
document.getElementById('iniciarRRBtn').onclick = iniciarRR;
document.getElementById('iniciarKnockoutBtn').onclick = generarKnockout;

document.querySelectorAll('.tab-button').forEach(btn=>{
  btn.onclick = ()=>{
    if(!btn.disabled) abrirTab(btn.dataset.tab);
  };
});

// Inicial
renderInscripcion();
if(fase!=='inscripcion'){
  document.querySelector(`[data-tab="${fase}"]`).disabled=false;
  abrirTab(fase);
  if(fase==='round-robin'){
    renderRR(); renderTabla();
    document.getElementById('iniciarKnockoutBtn').disabled = rrJugados !== partidosRR.length;
  }
  if(fase==='knockout'){
    renderBracket();
  }
}
