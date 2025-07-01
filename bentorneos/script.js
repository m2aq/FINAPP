// --- CLASE PARTICIPANTE (JavaScript equivalente) ---
class Participante {
    constructor(nombre) {
        this.nombre = nombre;
        this.puntos = 0;
        this.victorias = 0;
        this.derrotas = 0;
    }
    // No necesitamos __repr__ aquí, directamente usamos this.nombre
}

// --- ESTADO GLOBAL DE LA APLICACIÓN (usando st.session_state en Streamlit, aquí variables JS) ---
let participantes = [];
let faseActual = "inscripcion"; // "inscripcion", "round_robin", "knockout"
let partidosRoundRobin = [];
let partidosRoundRobinJugados = 0;
let rondasBracket = {}; // { 1: [{p1, p2, ganador: null}, ...], 2: [...], ... }
let posicionesBracket = {}; // { "ronda_partido": {x, y, width, height}, ... }
let idPartidosJugados = new Set(); // Para deshabilitar botones de partidos ya jugados

// --- ELEMENTOS DEL DOM ---
const sectionInscripcion = document.getElementById('inscripcion-section');
const sectionRoundRobin = document.getElementById('round-robin-section');
const sectionBracket = document.getElementById('bracket-section');

const inputNombre = document.getElementById('nombreParticipante');
const btnAgregar = document.getElementById('btnAgregarParticipante');
const listaParticipantesUL = document.getElementById('listaParticipantes');
const btnIniciarRR = document.getElementById('btnIniciarRoundRobin');
const btnNuevoTorneo = document.getElementById('btnNuevoTorneo');

const partidosRRDiv = document.getElementById('partidosRoundRobin');
const tablaPosicionesBody = document.querySelector('#tablaPosiciones tbody');
const btnIniciarBracket = document.getElementById('btnIniciarBracket');

const bracketDisplayDiv = document.getElementById('bracketDisplay');
const campeonDisplayH3 = document.getElementById('campeonDisplay');

// --- FUNCIONES DE INICIALIZACIÓN Y RESETEEO ---
function inicializarEstado() {
    participantes = [];
    faseActual = "inscripcion";
    partidosRoundRobin = [];
    partidosRoundRobinJugados = 0;
    rondasBracket = {};
    posicionesBracket = {};
    idPartidosJugados.clear();
    actualizarUI();
}

function actualizarUI() {
    // Ocultar/mostrar secciones según la fase actual
    sectionInscripcion.classList.toggle('hidden', faseActual !== 'inscripcion');
    sectionRoundRobin.classList.toggle('hidden', faseActual !== 'round_robin');
    sectionBracket.classList.toggle('hidden', faseActual !== 'knockout');

    // Actualizar elementos específicos
    actualizarListaParticipantes();
    btnIniciarRR.disabled = participantes.length < 2;

    if (faseActual === 'round_robin') {
        mostrarPartidosRoundRobin();
        actualizarTablaPosiciones();
        btnIniciarBracket.disabled = !todosLosPartidosRRJugados();
    }
    if (faseActual === 'knockout') {
        generarYMostrarBracket();
    }
}

// --- FASE 1: INSCRIPCIÓN ---
function agregarParticipante() {
    const nombre = inputNombre.value.trim();
    if (!nombre) return;

    // Verificar duplicados (case-insensitive)
    if (participantes.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
        alert(`El participante '${nombre}' ya está inscrito.`);
        return;
    }

    const nuevoParticipante = new Participante(nombre);
    participantes.push(nuevoParticipante);
    inputNombre.value = ''; // Limpiar campo
    actualizarListaParticipantes();
    btnIniciarRR.disabled = participantes.length < 2;
}

function actualizarListaParticipantes() {
    listaParticipantesUL.innerHTML = ''; // Limpiar lista
    participantes.forEach((p, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${p.nombre}`;
        listaParticipantesUL.appendChild(li);
    });
}

// --- FASE 2: ROUND ROBIN ---
function iniciarRoundRobin() {
    if (participantes.length < 2) return;
    faseActual = "round_robin";

    // Generar todos los emparejamientos posibles
    partidosRoundRobin = [];
    for (let i = 0; i < participantes.length; i++) {
        for (let j = i + 1; j < participantes.length; j++) {
            partidosRoundRobin.push({ p1: participantes[i], p2: participantes[j], resultado: null, id: `${i}-${j}` });
        }
    }
    partidosRoundRobinJugados = 0; // Reiniciar contador
    idPartidosJugados.clear();
    actualizarUI();
}

function mostrarPartidosRoundRobin() {
    partidosRRDiv.innerHTML = ''; // Limpiar
    partidosRoundRobin.forEach((partido, index) => {
        const divMatch = document.createElement('div');
        divMatch.innerHTML = `
            <span>${partido.p1.nombre} vs ${partido.p2.nombre}</span>
            <div>
                <button class="btn-ganador" data-match-id="${partido.id}" data-ganador="${partido.p1.nombre}">Gana ${partido.p1.nombre}</button>
                <button class="btn-ganador" data-match-id="${partido.id}" data-ganador="${partido.p2.nombre}">Gana ${partido.p2.nombre}</button>
            </div>
        `;
        // Deshabilitar botones si el partido ya se jugó
        if (idPartidosJugados.has(partido.id)) {
            divMatch.querySelectorAll('.btn-ganador').forEach(btn => btn.disabled = true);
        }
        partidosRRDiv.appendChild(divMatch);
    });
}

function registrarVictoriaRR(matchId, ganadorNombre) {
    if (idPartidosJugados.has(matchId)) return; // Ya se registró este partido

    const partido = partidosRoundRobin.find(p => p.id === matchId);
    const perdedor = partido.p1.nombre === ganadorNombre ? partido.p2 : partido.p1;
    const ganador = partido.p1.nombre === ganadorNombre ? partido.p1 : partido.p2;

    ganador.victorias++;
    ganador.puntos += 2;
    perdedor.derrotas++;
    perdedor.puntos += 1;

    partido.resultado = ganadorNombre; // Guardar resultado
    partidosRoundRobinJugados++;
    idPartidosJugados.add(matchId); // Marcar partido como jugado

    actualizarTablaPosiciones();
    btnIniciarBracket.disabled = !todosLosPartidosRRJugados();

    // Deshabilitar los botones del partido que acaba de ser jugado
    document.querySelectorAll(`.btn-ganador[data-match-id="${matchId}"]`).forEach(btn => btn.disabled = true);
}

function todosLosPartidosRRJugados() {
    return partidosRoundRobinJugados === partidosRoundRobin.length;
}

function actualizarTablaPosiciones() {
    // Ordenar participantes por puntos (descendente), luego por victorias, luego por derrotas
    participantes.sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        if (b.victorias !== a.victorias) return b.victorias - a.victorias;
        return a.derrotas - b.derrotas; // Menos derrotas es mejor
    });

    tablaPosicionesBody.innerHTML = ''; // Limpiar
    participantes.forEach((p, index) => {
        const fila = tablaPosicionesBody.insertRow();
        fila.insertCell(0).textContent = index + 1;
        fila.insertCell(1).textContent = p.nombre;
        fila.insertCell(2).textContent = p.puntos;
        fila.insertCell(3).textContent = p.victorias;
        fila.insertCell(4).textContent = p.derrotas;
    });
}

// --- FASE 3: KNOCKOUT ---
function iniciarBracket() {
    if (!todosLosPartidosRRJugados()) return;

    // 1. Seleccionar clasificados (ej: top N, donde N es potencia de 2 más cercana o igual)
    let numClasificados = 2;
    while (numClasificados * 2 <= participantes.length) {
        numClasificados *= 2;
    }
    // Si numClasificados es < 2, no se puede hacer bracket (ej: 1 participante)
    if (numClasificados < 2) {
        alert("Se necesitan al menos 2 participantes para la fase de eliminatorias.");
        return;
    }

    // Tomar los N clasificados de la tabla de posiciones (ya ordenados)
    const clasificados = participantes.slice(0, numClasificados);
    
    // Generar bracket de forma aleatoria o seeding (aquí un seeding simple)
    // Para simplificar, asumimos que clasificados ya están ordenados por merito (Puntos, etc.)
    // Una semilla simple (1 vs N, 2 vs N-1) requeriría más lógica para mapear nombres
    // Aquí simulamos un bracket para 8 personas como ejemplo:
    // Orden de enfrentamientos: (P1 vs P8), (P4 vs P5), (P2 vs P7), (P3 vs P6)

    rondasBracket = {};
    let rondaActualParticipantes = [...clasificados]; // Copia de los participantes que inician el bracket
    let numRonda = 1;
    
    // Mapeo para las rondas iniciales (seeds)
    // Si tenemos N participantes, generamos el orden de enfrentamientos
    const numPartidosEnRonda = rondaActualParticipantes.length / 2;
    const ronda1ParticipantesOrdered = [];
    const totalClasificados = rondaActualParticipantes.length;

    // Lógica básica para armar las parejas (ej. si 8 participantes, P1 vs P8, P2 vs P7, etc.)
    for(let i = 0; i < numPartidosEnRonda; i++){
        // Aquí el 'seeding' podría ser más complejo. Para empezar, emparejamos
        // Participante[i] con Participante[totalClasificados - 1 - i]
        // O más simple, emparejamiento directo: [0,1], [2,3], [4,5], [6,7]
        ronda1ParticipantesOrdered.push({p1: rondaActualParticipantes[i*2], p2: rondaActualParticipantes[i*2 + 1], resultado: null, id: `r${numRonda}_p${i}`});
    }
    rondasBracket[numRonda] = ronda1ParticipantesOrdered;

    // Lógica para generar rondas subsiguientes (octavos -> cuartos -> semis -> final)
    let siguienteRondaParticipantes = []; // Aquí irán los ganadores que avanzan
    while (rondaActualParticipantes.length > 1) {
        siguienteRondaParticipantes = [];
        const currentRoundMatches = rondasBracket[numRonda];
        
        currentRoundMatches.forEach((partido, index) => {
            // Simula un "placeholder" para los ganadores que se irán asignando
            if(index % 2 === 0){ // Creamos parejas para la siguiente ronda
                let p1_next = partido.resultado ? new Participante(partido.resultado) : 'placeholder';
                let p2_next = '';

                // Si hay otro partido en esta ronda, obtener su ganador para emparejarlo
                if (index + 1 < currentRoundMatches.length && currentRoundMatches[index+1].resultado) {
                    p2_next = currentRoundMatches[index+1].resultado ? new Participante(currentRoundMatches[index+1].resultado) : 'placeholder';
                } else {
                    p2_next = 'placeholder'; // Si el segundo partido no está definido/terminado
                }

                if(p1_next !== 'placeholder' || p2_next !== 'placeholder'){ // Si hay algo para formar la siguiente ronda
                   siguienteRondaParticipantes.push({p1: p1_next, p2: p2_next, resultado: null, id: `r${numRonda+1}_p${index/2}`});
                }
            }
        });

        if(siguienteRondaParticipantes.length > 0) {
            numRonda++;
            rondasBracket[numRonda] = siguienteRondaParticipantes;
            rondaActualParticipantes = siguienteRondaParticipantes.map(p => p.resultado ? new Participante(p.resultado) : 'placeholder'); // Solo avanzan los que ya ganaron
        } else {
             break; // Si no hay nadie que avance, terminamos
        }
    }

    faseActual = "knockout";
    actualizarUI();
}

function generarYMostrarBracket() {
    bracketDisplayDiv.innerHTML = ''; // Limpiar
    campeonDisplayH3.textContent = ''; // Limpiar campeón

    if (Object.keys(rondasBracket).length === 0) {
        bracketDisplayDiv.innerHTML = '<p>Aún no hay partidos definidos para el bracket.</p>';
        return;
    }

    // Opción 1: Usar MermaidJS (requiere parsear el bracket a formato Mermaid)
    const mermaidString = generarMermaidBracket();
    if (mermaidString) {
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.textContent = mermaidString;
        bracketDisplayDiv.appendChild(mermaidDiv);
        mermaid.init(undefined, bracketDiv); // Re-renderizar Mermaid
    } else {
        bracketDisplayDiv.innerHTML = '<p>Error al generar el código del bracket.</p>';
    }
    
    // Opción 2: Dibujo personalizado con Canvas o SVG (mucho más complejo)
    // Esto implicaría calcular posiciones para cada caja de partido,
    // dibujar rectángulos y líneas, añadir botones para declarar ganador.
    // Requiere mucho más código JS.

    // Mostrar ganador final si existe
    const ultimaRonda = Math.max(...Object.keys(rondasBracket).map(Number));
    if (rondasBracket[ultimaRonda] && rondasBracket[ultimaRonda].length === 1) {
        const finalMatch = rondasBracket[ultimaRonda][0];
        if (finalMatch.resultado) {
            campeonDisplayH3.textContent = `🏆 ¡El Campeón es: ${finalMatch.resultado}! 🏆`;
        } else {
            campeonDisplayH3.textContent = `Final por definir...`;
        }
    }
}

// Función auxiliar para generar el código Mermaid
function generarMermaidBracket() {
    let code = "graph TD;\n";
    let nodeIdCounter = 0;
    let matchNodeIds = {}; // Mapea ID interno del partido a un ID de nodo Mermaid

    // Añadir nodos de partidos y generar enlaces entre rondas
    for (const rondaKey in rondasBracket) {
        const ronda = rondasBracket[rondaKey];
        const roundNum = parseInt(rondaKey);
        
        // Crear los nodos para los participantes de la ronda
        ronda.forEach((partido, index) => {
            const matchId = partido.id;
            const nodeMidId = `match_${nodeIdCounter++}`; // ID único para el nodo de partido (ganador intermedio)
            matchNodeIds[matchId] = nodeMidId;

            let labelP1 = '???';
            if (partido.p1 && partido.p1 !== 'placeholder') {
                labelP1 = typeof partido.p1 === 'object' ? partido.p1.nombre : partido.p1;
            }
            
            let labelP2 = '???';
            if (partido.p2 && partido.p2 !== 'placeholder') {
                 labelP2 = typeof partido.p2 === 'object' ? partido.p2.nombre : partido.p2;
            }

            if (partido.resultado) {
                 // Partido decidido: Mostrar resultado y la linea con cursor default
                 const ganadorActual = typeof partido.resultado === 'object' ? partido.resultado.nombre : partido.resultado;
                 code += `    ${nodeMidId}["${labelP1} vs ${labelP2}<br><small>Ganador: ${ganadorActual}</small>"]:::decided -->${partido.resultado ? ganadorActual : ''}\n`; // Nota: Mermaid no puede directamente renderizar input de texto aquí, solo mostraremos el ganador si lo tenemos.
                 // La asignación de ganador al siguiente partido es lógica pura, no se ve en Mermaid sin interactividad

            } else {
                // Partido por decidir: Mostrar cómo declarar ganador
                code += `    ${nodeMidId}[${labelP1} vs ${labelP2}<br><span style="color: red;">▼</span>]:::undecided\n`;
            }
        });
    }

    // Crear enlaces entre rondas (aquí es donde la lógica de Mermaid es más tricky)
    // La forma más simple de mostrar bracket en Mermaid es así: A --> C; B --> C; C --> D; E --> D
    // Necesitamos un nodo por partido, que conecte con los partidos de la siguiente ronda.

    let currentNodeIdsPerRound = {}; // Guardamos los IDs de los nodos generados para esta ronda

    for (const rondaKey in rondasBracket) {
        const ronda = rondasBracket[rondaKey];
        const roundNum = parseInt(rondaKey);
        const numMatchesInRound = ronda.length;
        const nodeIdsThisRound = [];

        for(let i = 0; i < numMatchesInRound; i++){
            const matchId = ronda[i].id; // ID original del partido
            let labelP1 = '???';
            if (ronda[i].p1 && ronda[i].p1 !== 'placeholder') labelP1 = typeof ronda[i].p1 === 'object' ? ronda[i].p1.nombre : ronda[i].p1;
            let labelP2 = '???';
            if (ronda[i].p2 && ronda[i].p2 !== 'placeholder') labelP2 = typeof ronda[i].p2 === 'object' ? ronda[i].p2.nombre : ronda[i].p2;

            // Creamos un ID único para cada "caja" de partido en Mermaid
            const mermaidNodeId = `match_${roundNum}_${i}`;
            nodeIdsThisRound.push(mermaidNodeId);

            // Definir el contenido del nodo
            let nodeContent = `${labelP1} vs ${labelP2}`;
            
            if(ronda[i].resultado) { // Partido decidido
                 const ganador = typeof ronda[i].resultado === 'object' ? ronda[i].resultado.nombre : ronda[i].resultado;
                 nodeContent = `${labelP1} vs ${labelP2}<br><small>Ganador: ${ganador}</small>`;
                 code += `    ${mermaidNodeId}["${nodeContent}"]:::decided\n`; // Nodo decidido
            } else { // Partido por decidir
                 // Añadir placeholder visual si no hay nombres aún
                 if(labelP1 === '???' && labelP2 === '???') nodeContent = 'vs';
                 code += `    ${mermaidNodeId}[${nodeContent}<br><span style="color: #555; font-size: 0.8em;">(Click para definir)</span>]:::undecided\n`; // Nodo por decidir
                 // IMPORTANTE: Para hacer clic y definir ganador, necesitarías JavaScript
                 // que capture el evento y actualice el bracket/estado. Esto Mermaid por sí solo no lo hace.
            }
        }
        // Guardar los IDs de los nodos generados para esta ronda
        currentNodeIdsPerRound[roundNum] = nodeIdsThisRound;
    }
    
    // Conectar las rondas
    for(let r = 1; r < Object.keys(rondasBracket).length; r++) {
        const currentRoundNodes = currentNodeIdsPerRound[r];
        const nextRoundNodes = currentNodeIdsPerRound[r+1];

        if (!currentRoundNodes || !nextRoundNodes) continue;

        for(let i = 0; i < nextRoundNodes.length; i++){
            const node1PrevRound = currentRoundNodes[i*2];
            const node2PrevRound = currentRoundNodes[i*2+1];
            const nodeNextRound = nextRoundIds[i];

            if(node1PrevRound) code += `    ${node1PrevRound} --> ${nodeNextRound};\n`;
            if(node2PrevRound) code += `    ${node2PrevRound} --> ${nodeNextRound};\n`;
        }
    }

    // Definir clases para estilos en Mermaid (opcional)
    code += "    classDef decided fill:#e8f5e9,stroke:#4CAF50,stroke-width:2px;\n";
    code += "    classDef undecided fill:#ffffff,stroke:#e0e0e0,stroke-width:1px;\n";

    return code;
}


// --- MANEJO DE EVENTOS ---
btnAgregar.addEventListener('click', agregarParticipante);
// Permitir agregar con Enter
inputNombre.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        agregarParticipante();
    }
});

btnIniciarRR.addEventListener('click', iniciarRoundRobin);
btnNuevoTorneo.addEventListener('click', inicializarEstado);
btnIniciarBracket.addEventListener('click', iniciarBracket);

// Listener para los botones de registrar victoria del Round Robin
// Usamos delegación de eventos para botones que se crean dinámicamente
partidosRRDiv.addEventListener('click', function(event) {
    const target = event.target;
    if (target.classList.contains('btn-ganador')) {
        const matchId = target.dataset.matchId;
        const ganadorNombre = target.dataset.ganador;
        registrarVictoriaRR(matchId, ganadorNombre);
    }
});


// --- EJECUCIÓN INICIAL ---
document.addEventListener('DOMContentLoaded', () => {
    // Intentar cargar un estado previo o inicializar
    // Por simplicidad, inicializamos siempre para este ejemplo.
    inicializarEstado();
    // Llama a esto si deseas iniciar el torneo directamente con 4 participantes de prueba
    // participantes.push(new Participante("Alice"), new Participante("Bob"), new Participante("Charlie"), new Participante("David"));
    // faseActual = "inscripcion";
    // actualizarUI();
});
