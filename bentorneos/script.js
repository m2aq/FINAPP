let participantes = [];
let partidos = [];
let knockoutRounds = [];
let fase = 'inscripcion';

function agregarParticipante() {
  const input = document.getElementById('nombre');
  const nombre = input.value.trim();
  if (!nombre) return;
  if (participantes.find(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
    alert('Nombre ya inscrito');
    return;
  }
  participantes.push({ nombre, puntos: 0, victorias: 0, derrotas: 0 });
  input.value = '';
  renderParticipantes();
  guardar();
}

function renderParticipantes() {
  const lista = document.getElementById('lista');
  lista.innerHTML = '';
  participantes.forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${p.nombre}`;
    lista.appendChild(li);
  });
  document.getElementById('btnIniciarRR').disabled = participantes.length < 2;
}

function iniciarRoundRobin() {
  fase = 'grupos';
  partidos = [];
  for (let i = 0; i < participantes.length; i++) {
    for (let j = i + 1; j < participantes.length; j++) {
      partidos.push({ p1: participantes[i], p2: participantes[j], resultado: null });
    }
  }
  abrirTab('grupos');
  renderPartidos();
  renderTabla();
  guardar();
}

function renderPartidos() {
  const cont = document.getElementById('partidos');
  cont.innerHTML = '';
  partidos.forEach((m, i) => {
    const div = document.createElement('div');
    div.className = 'partido';
    const txt = document.createElement('span');
    txt.textContent = `${m.p1.nombre} vs ${m.p2.nombre}`;
    const btn1 = document.createElement('button');
    btn1.textContent = `Gana ${m.p1.nombre}`;
    btn1.onclick = () => registrarResultado(i, m.p1, m.p2);
    const btn2 = document.createElement('button');
    btn2.textContent = `Gana ${m.p2.nombre}`;
    btn2.onclick = () => registrarResultado(i, m.p2, m.p1);
    if (m.resultado) {
      btn1.disabled = true;
      btn2.disabled = true;
      txt.textContent += ` → Ganador: ${m.resultado.nombre}`;
    }
    div.appendChild(txt);
    div.appendChild(btn1);
    div.appendChild(btn2);
    cont.appendChild(div);
  });
}

function registrarResultado(index, ganador, perdedor) {
  partidos[index].resultado = ganador;
  ganador.victorias++;
  ganador.puntos += 2;
  perdedor.derrotas++;
  perdedor.puntos += 1;
  renderPartidos();
  renderTabla();
  if (partidos.every(p => p.resultado)) {
    document.getElementById('btnIniciarBracket').disabled = false;
  }
  guardar();
}

function renderTabla() {
  const tabla = document.getElementById('tabla');
  tabla.innerHTML = '';
  const th = document.createElement('tr');
  ['#', 'Nombre', 'Puntos', 'V', 'D'].forEach(t => {
    const td = document.createElement('th');
    td.textContent = t;
    th.appendChild(td);
  });
  tabla.appendChild(th);
  participantes
    .slice()
    .sort((a, b) => b.puntos - a.puntos)
    .forEach((p, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${p.nombre}</td><td>${p.puntos}</td><td>${p.victorias}</td><td>${p.derrotas}</td>`;
      tabla.appendChild(tr);
    });
}

function generarKnockout() {
  fase = 'bracket';
  ordenar();
  const n = participantes.length;
  let size = 1;
  while (size * 2 <= n) size *= 2;
  const cls = participantes.slice(0, size);

  // Primera ronda con emparejamientos 1 vs último, 2 vs penúltimo...
  const primeraRonda = [];
  for (let i = 0; i < size / 2; i++) {
    primeraRonda.push({
      p1: cls[i].nombre,
      p2: cls[size - 1 - i].nombre,
      ganador: null
    });
  }
  knockoutRounds = [primeraRonda];

  // Rondas siguientes vacías
  let partidos = primeraRonda.length;
  while (partidos > 1) {
    const siguienteRonda = [];
    for (let i = 0; i < partidos / 2; i++) {
      siguienteRonda.push({
        p1: null,
        p2: null,
        ganador: null
      });
    }
    knockoutRounds.push(siguienteRonda);
    partidos = siguienteRonda.length;
  }

  document.querySelector('[data-tab="bracket"]').disabled = false;
  abrirTab('bracket');
  renderBracket();
  guardar();
}

function renderBracket() {
  const cont = document.getElementById('bracket');
  cont.innerHTML = '';
  knockoutRounds.forEach((ronda, i) => {
    const col = document.createElement('div');
    col.className = 'ronda';
    ronda.forEach((m, j) => {
      const div = document.createElement('div');
      div.className = 'match';
      const name = `${m.p1 || '—'} vs ${m.p2 || '—'}${m.ganador ? ` → 🏆${m.ganador}` : ''}`;
      const txt = document.createElement('span');
      txt.textContent = name;
      div.appendChild(txt);
      if (!m.ganador && m.p1 && m.p2) {
        const b1 = document.createElement('button');
        const b2 = document.createElement('button');
        b1.textContent = m.p1;
        b2.textContent = m.p2;
        b1.onclick = () => declararGanador(i, j, m.p1);
        b2.onclick = () => declararGanador(i, j, m.p2);
        div.appendChild(b1);
        div.appendChild(b2);
      }
      col.appendChild(div);
    });
    cont.appendChild(col);
  });
}

function declararGanador(rondaIndex, matchIndex, win) {
  const match = knockoutRounds[rondaIndex][matchIndex];
  match.ganador = win;

  const siguienteRonda = rondaIndex + 1;
  if (knockoutRounds[siguienteRonda]) {
    const idx = Math.floor(matchIndex / 2);
    const nmatch = knockoutRounds[siguienteRonda][idx];
    if (!nmatch.p1) nmatch.p1 = win;
    else nmatch.p2 = win;
  }

  renderBracket();
  guardar();
}

function ordenar() {
  participantes.sort((a, b) => b.puntos - a.puntos);
}

function abrirTab(id) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('activa'));
  document.getElementById(id).classList.add('activa');
}

function guardar() {
  localStorage.setItem('torneo', JSON.stringify({ participantes, partidos, knockoutRounds, fase }));
}

function cargar() {
  const data = localStorage.getItem('torneo');
  if (!data) return;
  try {
    const t = JSON.parse(data);
    if (!t || !Array.isArray(t.participantes)) return;
    participantes = t.participantes;
    partidos = t.partidos || [];
    knockoutRounds = t.knockoutRounds || [];
    fase = t.fase || 'inscripcion';
    renderParticipantes();
    if (fase === 'grupos') {
      abrirTab('grupos');
      renderPartidos();
      renderTabla();
    } else if (fase === 'bracket') {
      abrirTab('bracket');
      renderBracket();
    }
  } catch {}
}

function nuevoTorneo() {
  if (!confirm('¿Seguro que deseas reiniciar el torneo?')) return;
  participantes = [];
  partidos = [];
  knockoutRounds = [];
  fase = 'inscripcion';
  abrirTab('inscripcion');
  renderParticipantes();
  guardar();
}

cargar();
