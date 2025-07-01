// --- CLASE PARTICIPANTE ---
class Participante {
    constructor(nombre) {
        this.nombre = nombre;
        this.puntos = 0;
        this.victorias = 0;
        this.derrotas = 0;
    }
}

// --- ESTADO GLOBAL ---
let participantes = [];
let faseActual = "inscripcion"; // "inscripcion", "round_robin", "knockout"
let partidosRoundRobin = []; // Formato: [{id: "0-1", p1: objParticipante1, p2: objParticipante2, resultado: "nombreGanador"}, ...]
let idPartidosJugadosRR = new Set(); // Guarda los IDs de partidos jugados en RR para deshabilitarlos

let rondasBracket = {}; // { 1: [{id: "r1_p0", p1: obj, p2: obj, resultado: objGanador}], ... }
// Las interacciones dentro del bracket (si se implementan) requerirán una gestión más compleja.

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

// --- FUNCIONES AUXILIARES DE UI ---

// Actualiza la visibilidad de las secciones y el estado de los botones principales
function actualizarUI() {
    sectionInscripcion.classList.toggle('hidden', faseActual !== 'inscripcion');
    sectionRoundRobin.classList.toggle('hidden', faseActual !== 'round_robin');
    sectionBracket.classList.toggle('hidden', faseActual !== 'knockout');

    // Actualizar el botón de iniciar Round Robin
    btnIniciarRR.disabled = participantes.length < 2;

    // Renderizar contenido específico de la fase actual
    if (faseActual === 'inscripcion') {
        actualizarListaParticipantes();
    } else if (faseActual === 'round_robin') {
        mostrarPartidosRoundRobin(); // Dibuja los partidos y setea estado de botones
        actualizarTablaPosiciones(); // Dibuja la tabla
        btnIniciarBracket.disabled = !todosLosPartidosRRJugados(); // Habilita si todos los partidos de RR están jugados
    } else if (faseActual === 'knockout') {
        generarYMostrarBracket(); // Dibuja el bracket
    }
}

function actualizarListaParticipantes() {
    listaParticipantesUL.innerHTML = ''; // Limpiar la lista anterior
    participantes.forEach((p, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${p.nombre}`;
        listaParticipantesUL.appendChild(li);
    });
}

function todosLosPartidosRRJugados() {
    return idPartidosJugadosRR.size === partidosRoundRobin.length;
}

// --- FASE 1: INSCRIPCIÓN ---
function agregarParticipante() {
    const nombre = inputNombre.value.trim();
    if (!nombre) {
        alert("Por favor, introduce un nombre para el participante.");
        return;
    }

    // Validar duplicados (insensible a mayúsculas/minúsculas)
    if (participantes.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
        alert(`El participante '${nombre}' ya está inscrito.`);
        return;
    }

    const nuevoParticipante = new Participante(nombre);
    participantes.push(nuevoParticipante);

    inputNombre.value = ''; // Limpiar campo de entrada
    actualizarUI(); // Llama a la función principal para redibujar UI (y actualizar lista/botones)
}

// --- FASE 2: ROUND ROBIN ---
function iniciarRoundRobin() {
    if (participantes.length < 2) return;

    faseActual = "round_robin";
    partidosRoundRobin = [];
    idPartidosJugadosRR.clear(); // Resetear partidos jugados

    // Generar todos los emparejamientos únicos (combinaciones)
    for (let i = 0; i < participantes.length; i++) {
        for (let j = i + 1; j < participantes.length; j++) {
            partidosRoundRobin.push({
                id: `${i}-${j}`, // Identificador único del partido
                p1: participantes[i],
                p2: participantes[j],
                resultado: null // Quién ganó ('nombreGanador' o null)
            });
        }
    }
    actualizarUI();
}

function mostrarPartidosRoundRobin() {
    partidosRRDiv.innerHTML = ''; // Limpiar contenido actual para redibujar

    partidosRoundRobin.forEach(partido => {
        const divMatch = document.createElement('div');
        const isMatchPlayed = idPartidosJugadosRR.has(partido.id);

        divMatch.innerHTML = `
            <span>${partido.p1.nombre} vs ${partido.p2.nombre}</span>
            <div>
                <button class="btn-ganador" data-match-id="${partido.id}" data-ganador="${partido.p1.nombre}" ${isMatchPlayed ? 'disabled' : ''}>Gana ${partido.p1.nombre}</button>
                <button class="btn-ganador" data-match-id="${partido.id}" data-ganador="${partido.p2.nombre}" ${isMatchPlayed ? 'disabled' : ''}>Gana ${partido.p2.nombre}</button>
            </div>
        `;
        partidosRRDiv.appendChild(divMatch);
    });
}

function registrarVictoriaRR(matchId, ganadorNombre) {
    if (idPartidosJugadosRR.has(matchId)) {
        // Si el partido ya se jugó, no hacemos nada.
        console.log(`Partido ${matchId} ya jugado.`);
        return;
    }

    const partido = partidosRoundRobin.find(p => p.id === matchId);
    if (!partido) {
        console.error(`Partido con ID ${matchId} no encontrado.`);
        return;
    }

    // Identificar ganador y perdedor como objetos Participante
    let ganador, perdedor;
    if (partido.p1.nombre === ganadorNombre) {
        ganador = partido.p1;
        perdedor = partido.p2;
    } else {
        ganador = partido.p2;
        perdedor = partido.p1;
    }

    // Actualizar estadísticas
    ganador.victorias++;
    ganador.puntos += 2;
    perdedor.derrotas++;
    perdedor.puntos += 1;

    partido.resultado = ganadorNombre; // Guardar quién ganó
    idPartidosJugadosRR.add(matchId); // Marcar el partido como jugado

    // Volver a renderizar la sección para actualizar el estado de los botones
    // y la tabla de posiciones.
    actualizarUI();
}

function actualizarTablaPosiciones() {
    // Ordenar participantes: Por puntos (mayor a menor), luego victorias, luego derrotas
    participantes.sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        if (b.victorias !== a.victorias) return b.victorias - a.victorias;
        return a.derrotas - b.derrotas;
    });

    tablaPosicionesBody.innerHTML = ''; // Limpiar tabla anterior
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
    if (!todosLosPartidosRRJugados()) {
        alert("Debes completar todos los partidos de la Fase de Grupos primero.");
        return;
    }

    // 1. Determinar el número de participantes para el bracket (potencia de 2)
    let numParticipantesBracket = 2;
    while (numParticipantesBracket * 2 <= participantes.length) {
        numParticipantesBracket *= 2;
    }
    if (numParticipantesBracket < 2) {
        alert("No hay suficientes participantes para crear un bracket de eliminatorias.");
        return;
    }

    // Seleccionar los clasificados según la tabla de posiciones
    const clasificados = participantes.slice(0, numParticipantesBracket);

    // Generar la estructura del bracket (simple seeding/emparejamiento)
    rondasBracket = {};
    let currentRoundMatches = [];
    for(let i = 0; i < clasificados.length / 2; i++){
        currentRoundMatches.push({
            id: `r1_p${i}`,
            p1: clasificados[i*2],
            p2: clasificados[i*2 + 1],
            resultado: null // Aquí se almacenará el ganador
        });
    }
    rondasBracket[1] = currentRoundMatches;

    // Lógica para generar las rondas siguientes (simulación de avanzadilla)
    let roundNum = 1;
    while(rondasBracket[roundNum].length > 1) {
        let nextRoundMatches = [];
        const prevRound = rondasBracket[roundNum];
        const prevRoundLength = prevRound.length;

        for(let i = 0; i < prevRoundLength / 2; i++){
            nextRoundMatches.push({
                id: `r${roundNum + 1}_p${i}`,
                p1: null, // Placeholder para el ganador del partido 1 de la ronda anterior
                p2: null, // Placeholder para el ganador del partido 2 de la ronda anterior
                resultado: null // Para la final, se guardará el campeón
            });
        }
        if (nextRoundMatches.length > 0) {
            rondasBracket[roundNum + 1] = nextRoundMatches;
        }
        roundNum++;
    }

    faseActual = "knockout";
    actualizarUI();
}


function generarYMostrarBracket() {
    // NOTA: Implementar la visualización interactiva de un bracket es complejo.
    // Aquí usamos MermaidJS como una forma de visualizarlo estáticamente.
    // Hacer que los "ganadores" se puedan elegir y actualicen dinámicamente
    // requeriría mucho más JS para manejar eventos en elementos Mermaid o usar
    // directamente Canvas/SVG.

    bracketDisplayDiv.innerHTML = ''; // Limpiar contenedor
    campeonDisplayH3.textContent = ''; // Limpiar campeon

    if (Object.keys(rondasBracket).length === 0) {
        bracketDisplayDiv.innerHTML = '<p>Generando bracket...</p>';
        return;
    }

    const mermaidString = generarMermaidBracket();
    if (mermaidString) {
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        // El texto del bracket, incluyendo nodos para seleccionar ganador
        // En Mermaid puro, no podemos poner botones clickables directamente para esto.
        // Pondremos texto indicando qué hacer.
        mermaidDiv.textContent = mermaidString;

        bracketDisplayDiv.appendChild(mermaidDiv);

        // Renderizar el código Mermaid
        try {
            mermaid.run({ nodes: [mermaidDiv] }); // Inicializar Mermaid en este div específico
        } catch (e) {
            console.error("Error al renderizar Mermaid:", e);
            bracketDisplayDiv.innerHTML = '<p>Error al cargar el diagrama del bracket.</p>';
        }
    } else {
        bracketDisplayDiv.innerHTML = '<p>Error al generar el código del bracket.</p>';
    }

    // Mostrar ganador final si está definido
    const ultimaRondaNum = Math.max(...Object.keys(rondasBracket).map(Number));
    if (rondasBracket[ultimaRondaNum] && rondasBracket[ultimaRondaNum].length === 1) {
        const finalMatch = rondasBracket[ultimaRondaNum][0];
        if (finalMatch.resultado) {
            campeonDisplayH3.textContent = `🏆 ¡El Campeón es: ${finalMatch.resultado.nombre}! 🏆`;
        } else {
            campeonDisplayH3.textContent = `La Final está por definir...`;
        }
    }
}

// Genera el código en formato Mermaid para el bracket
function generarMermaidBracket() {
    let code = "graph TD;\n";
    let matchNodeMap = {}; // Mapa para obtener el ID de nodo Mermaid dado el ID interno del partido

    // 1. Definir los nodos de cada partido y sus conexiones
    let nodeIdCounter = 0;
    for (const rondaKey in rondasBracket) {
        const ronda = rondasBracket[rondaKey];
        const roundNum = parseInt(rondaKey);
        const roundNodeIds = [];

        for (let i = 0; i < ronda.length; i++) {
            const partido = ronda[i];
            const mermaidNodeId = `match_${roundNum}_${i}`; // ID único para el nodo Mermaid
            matchNodeMap[partido.id] = mermaidNodeId;
            roundNodeIds.push(mermaidNodeId);

            let labelP1 = 'Por definir';
            if (partido.p1 && partido.p1 !== 'placeholder' && typeof partido.p1 === 'object') labelP1 = partido.p1.nombre;
            else if (typeof partido.p1 === 'string') labelP1 = partido.p1; // Para placeholders literales si los hubiera

            let labelP2 = 'Por definir';
            if (partido.p2 && partido.p2 !== 'placeholder' && typeof partido.p2 === 'object') labelP2 = partido.p2.nombre;
            else if (typeof partido.p2 === 'string') labelP2 = partido.p2;

            let nodeContent = `${labelP1} vs ${labelP2}`;

            if (partido.resultado && typeof partido.resultado === 'object') { // Si el partido tiene un ganador definido
                nodeContent = `${partido.resultado.nombre} (Ganador)`;
                // Mermaid no soporta directamente el estilo interactivo "botón para elegir" fácilmente aquí.
                // Se mostrará como un nodo ganado.
                code += `    ${mermaidNodeId}["${nodeContent}"]:::decided;\n`;
            } else {
                 // Partido pendiente
                 nodeContent += "<br/><small style='color: #888;'> </small>"; // Espacio
                 // Si no hay participantes, que sea "vs"
                 if (labelP1 === 'Por definir' && labelP2 === 'Por definir') nodeContent = 'vs';
                 code += `    ${mermaidNodeId}[${nodeContent}]:::undecided;\n`;
                 // Aquí iría lógica JS para hacer esto clickeable, pero es complejo con Mermaid
            }
        }
    }

    // 2. Establecer las conexiones entre rondas
    let lastRoundNodeIds = [];
    for (const rondaKey in rondasBracket) {
        const roundNum = parseInt(rondaKey);
        const currentRoundNodeIds = [];

        rondasBracket[roundNum].forEach((partido, i) => {
            currentRoundNodeIds.push(matchNodeMap[partido.id]);

            if (roundNum === 1) { // Si es la primera ronda, conectamos directamente con los participantes iniciales (implícito en la definición del nodo)
                 // La estructura de nodos ya incluye p1 y p2.
            } else { // Para rondas subsecuentes, conectamos los ganadores de la ronda anterior
                const matchIdPrev1 = `r${roundNum-1}_p${i*2}`; // Partido previo 1
                const matchIdPrev2 = `r${roundNum-1}_p${i*2+1}`; // Partido previo 2
                const targetNodeId = matchNodeMap[partido.id];

                if (lastRoundNodeIds.length > 0) { // Si existen nodos de la ronda anterior
                    if (matchNodeMap[matchIdPrev1]) code += `    ${matchNodeMap[matchIdPrev1]} --> ${targetNodeId};\n`;
                    if (matchNodeMap[matchIdPrev2]) code += `    ${matchNodeMap[matchIdPrev2]} --> ${targetNodeId};\n`;
                }
            }
        });
        lastRoundNodeIds = currentRoundNodeIds; // Actualizar para la siguiente iteración
    }
    
    // Conectar al ganador final si existe
    const ultimaRondaNum = Math.max(...Object.keys(rondasBracket).map(Number));
    if (rondasBracket[ultimaRondaNum] && rondasBracket[ultimaRondaNum].length === 1 && rondasBracket[ultimaRondaNum][0].resultado) {
        const finalMatchId = rondasBracket[ultimaRondaNum][0].id;
        const championNodeId = `champion_${nodeIdCounter++}`;
        code += `    ${matchNodeMap[finalMatchId]} --> ${championNodeId}["🏆 Campeón"];\n`;
    }

    // Definir clases CSS para Mermaid
    code += "    classDef decided fill:#d4efdf,stroke:#1d8129,stroke-width:2px;\n";
    code += "    classDef undecided fill:#ffffff,stroke:#ccc;\n";
    return code;
}

// --- MANEJO DE EVENTOS ---
function setupEventListeners() {
    // Botón de Agregar Participante
    btnAgregar.addEventListener('click', agregarParticipante);
    inputNombre.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            agregarParticipante();
        }
    });

    // Botón Nuevo Torneo
    btnNuevoTorneo.addEventListener('click', inicializarEstado);

    // Botón Iniciar Round Robin
    btnIniciarRR.addEventListener('click', iniciarRoundRobin);

    // Botón Iniciar Bracket
    btnIniciarBracket.addEventListener('click', iniciarBracket);

    // Delegación de eventos para los botones de resultado del Round Robin
    partidosRRDiv.addEventListener('click', function(event) {
        const target = event.target;
        // Verificar si el clic fue en un botón de 'ganador' y que no esté deshabilitado
        if (target.classList.contains('btn-ganador') && !target.disabled) {
            const matchId = target.dataset.matchId;
            const ganadorNombre = target.dataset.ganador;
            registrarVictoriaRR(matchId, ganadorNombre);
        }
    });
}

// --- LÓGICA DE INICIALIZACIÓN ---
function inicializarEstado() {
    participantes = [];
    faseActual = "inscripcion";
    partidosRoundRobin = [];
    idPartidosJugadosRR.clear();
    rondasBracket = {};
    // Limpiar la visualización del bracket
    bracketDisplayDiv.innerHTML = '';
    campeonDisplayH3.textContent = '';
    
    // Volver a añadir los participantes de ejemplo si se quiere testing rápido
    // participantes.push(new Participante("Alice"), new Participante("Bob"), new Participante("Charlie"), new Participante("David"));
    // faseActual = "inscripcion"; // Para volver a inscripción después de resetear

    actualizarUI(); // Asegura que la UI esté en el estado correcto (inscripción)
}


document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners(); // Configura todos los listeners de eventos
    inicializarEstado(); // Carga el estado inicial de la aplicación
});
