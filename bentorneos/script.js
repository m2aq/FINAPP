// --- CLASE PARTICIPANTE ---
// Representa a cada jugador o equipo en el torneo.
class Participante {
    constructor(nombre) {
        this.nombre = nombre;
        this.puntos = 0;
        this.victorias = 0;
        this.derrotas = 0;
    }
}

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let participantes = []; // Array de objetos Participante
let faseActual = "inscripcion"; // Estado actual del torneo: "inscripcion", "round_robin", "knockout"
let partidosRoundRobin = []; // Lista de partidos para la fase de grupos. Formato: [{id: "0-1", p1: objP1, p2: objP2, resultado: "nombreGanador"}, ...]
let idPartidosJugadosRR = new Set(); // Conjunto para rastrear los IDs de los partidos de RR ya jugados y deshabilitarlos.

// Estructura para el bracket: { numeroRonda: [ { id: "rN_pM", p1: objORString, p2: objORString, resultado: objWinnerORNull }, ... ], ... }
// donde p1/p2 pueden ser objetos Participante o strings como 'placeholder'.
let rondasBracket = {};

// --- ELEMENTOS DEL DOM ---
// Obtenemos referencias a los elementos HTML clave para poder manipularlos.
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

const bracketDisplayDiv = document.getElementById('bracketDisplay'); // Div donde se renderizará el SVG de Mermaid
const bracketControlsSection = document.getElementById('bracket-controls-section'); // NUEVO: Sección para controles del bracket
const pendingBracketMatchesDiv = document.getElementById('pendingBracketMatches'); // NUEVO: Contenedor para los partidos pendientes
const campeonDisplayH3 = document.getElementById('campeonDisplay'); // Elemento para mostrar al campeón

// --- FUNCIONES AUXILIARES DE UI ---

// Función principal para actualizar la visibilidad de secciones y el estado de botones.
function actualizarUI() {
    // Muestra u oculta las secciones según la fase actual del torneo.
    sectionInscripcion.classList.toggle('hidden', faseActual !== 'inscripcion');
    sectionRoundRobin.classList.toggle('hidden', faseActual !== 'round_robin');
    sectionBracket.classList.toggle('hidden', faseActual !== 'knockout');

    // Actualiza el estado del botón de inicio de la Fase de Grupos.
    btnIniciarRR.disabled = participantes.length < 2;

    // Renderiza el contenido específico de la fase actual.
    if (faseActual === 'inscripcion') {
        actualizarListaParticipantes(); // Muestra la lista de inscritos.
    } else if (faseActual === 'round_robin') {
        mostrarPartidosRoundRobin(); // Dibuja los partidos de la fase de grupos.
        actualizarTablaPosiciones(); // Actualiza la tabla de clasificación.
        // Habilita el botón para iniciar el bracket si todos los partidos de RR han terminado.
        btnIniciarBracket.disabled = !todosLosPartidosRRJugados();
    } else if (faseActual === 'knockout') {
        generarYMostrarBracket(); // Dibuja el bracket estático Y los controles de partidos pendientes.
    }
}

// Actualiza la lista visual de participantes inscritos.
function actualizarListaParticipantes() {
    listaParticipantesUL.innerHTML = ''; // Limpia la lista existente.
    if (participantes.length === 0) {
        listaParticipantesUL.innerHTML = '<li>No hay participantes inscritos todavía.</li>';
        return;
    }
    participantes.forEach((p, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${p.nombre}`;
        listaParticipantesUL.appendChild(li);
    });
}

// Verifica si todos los partidos de la Fase de Grupos han sido jugados.
function todosLosPartidosRRJugados() {
    // Compara la cantidad de partidos jugados con el total de partidos generados.
    return idPartidosJugadosRR.size === partidosRoundRobin.length;
}

// --- FASE 1: INSCRIPCIÓN ---

// Añade un nuevo participante a la lista.
function agregarParticipante() {
    const nombre = inputNombre.value.trim(); // Obtiene el nombre del input y quita espacios.
    if (!nombre) {
        alert("Por favor, introduce un nombre para el participante.");
        return;
    }

    // Valida que el nombre no esté duplicado (insensible a mayúsculas/minúsculas).
    if (participantes.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
        alert(`El participante '${nombre}' ya está inscrito.`);
        return;
    }

    const nuevoParticipante = new Participante(nombre); // Crea una nueva instancia de Participante.
    participantes.push(nuevoParticipante); // Añade el nuevo participante al array global.

    inputNombre.value = ''; // Limpia el campo de texto.
    actualizarUI(); // Vuelve a dibujar la UI para mostrar la lista actualizada y habilitar botones si es necesario.
}

// --- FASE 2: ROUND ROBIN ---

// Inicia la Fase de Grupos (Round Robin).
function iniciarRoundRobin() {
    if (participantes.length < 2) return; // No se puede iniciar si hay menos de 2 participantes.

    faseActual = "round_robin"; // Cambia la fase del torneo.
    partidosRoundRobin = []; // Reinicia la lista de partidos.
    idPartidosJugadosRR.clear(); // Limpia el conjunto de partidos jugados.

    // Genera todos los emparejamientos únicos posibles entre los participantes.
    for (let i = 0; i < participantes.length; i++) {
        for (let j = i + 1; j < participantes.length; j++) {
            partidosRoundRobin.push({
                id: `${i}-${j}`, // Identificador único para el partido (ej: "0-1").
                p1: participantes[i], // Primer participante.
                p2: participantes[j], // Segundo participante.
                resultado: null // Guarda el nombre del ganador, o null si no se ha jugado.
            });
        }
    }
    actualizarUI(); // Actualiza la interfaz para mostrar la fase de grupos.
}

// Renderiza los partidos de la Fase de Grupos en el HTML.
function mostrarPartidosRoundRobin() {
    partidosRRDiv.innerHTML = ''; // Limpia el contenido actual antes de redibujar.

    partidosRoundRobin.forEach(partido => {
        const divMatch = document.createElement('div');
        // Verifica si el partido ya fue jugado para deshabilitar los botones.
        const isMatchPlayed = idPartidosJugadosRR.has(partido.id);

        divMatch.innerHTML = `
            <span>${partido.p1.nombre} vs ${partido.p2.nombre}</span>
            <div>
                <button class="btn-ganador" data-match-id="${partido.id}" data-ganador="${partido.p1.nombre}" ${isMatchPlayed ? 'disabled' : ''}>Gana ${partido.p1.nombre}</button>
                <button class="btn-ganador" data-match-id="${partido.id}" data-ganador="${partido.p2.nombre}" ${isMatchPlayed ? 'disabled' : ''}>Gana ${partido.p2.nombre}</button>
            </div>
        `;
        partidosRRDiv.appendChild(divMatch); // Añade el div del partido al contenedor.
    });
}

// Registra la victoria de un jugador en un partido del Round Robin.
function registrarVictoriaRR(matchId, ganadorNombre) {
    // Si el partido ya se jugó, no hacer nada.
    if (idPartidosJugadosRR.has(matchId)) {
        console.log(`Partido ${matchId} ya jugado.`);
        return;
    }

    const partido = partidosRoundRobin.find(p => p.id === matchId);
    if (!partido) {
        console.error(`Partido con ID ${matchId} no encontrado.`);
        return;
    }

    // Identifica los objetos Participante para ganador y perdedor.
    let ganador, perdedor;
    if (partido.p1.nombre === ganadorNombre) {
        ganador = partido.p1;
        perdedor = partido.p2;
    } else {
        ganador = partido.p2;
        perdedor = partido.p1;
    }

    // Actualiza las estadísticas (puntos, victorias, derrotas).
    ganador.victorias++;
    ganador.puntos += 2; // 2 puntos por victoria
    perdedor.derrotas++;
    perdedor.puntos += 1; // 1 punto por derrota

    partido.resultado = ganadorNombre; // Guarda el nombre del ganador.
    idPartidosJugadosRR.add(matchId); // Marca el partido como jugado.

    // Actualiza la UI para reflejar los cambios (tabla de posiciones y estado de botones).
    actualizarUI();
}

// Actualiza la tabla de posiciones en el HTML.
function actualizarTablaPosiciones() {
    // Ordena los participantes: por puntos (desc), luego por victorias (desc), luego por derrotas (asc).
    participantes.sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        if (b.victorias !== a.victorias) return b.victorias - a.victorias;
        return a.derrotas - b.derrotas;
    });

    tablaPosicionesBody.innerHTML = ''; // Limpia el cuerpo de la tabla anterior.
    participantes.forEach((p, index) => {
        const fila = tablaPosicionesBody.insertRow(); // Crea una nueva fila.
        fila.insertCell(0).textContent = index + 1; // Posición.
        fila.insertCell(1).textContent = p.nombre;  // Nombre.
        fila.insertCell(2).textContent = p.puntos;   // Puntos.
        fila.insertCell(3).textContent = p.victorias;// Victorias.
        fila.insertCell(4).textContent = p.derrotas; // Derrotas.
    });
}

// --- FASE 3: KNOCKOUT ---

// Inicia la Fase de Eliminatorias (Bracket).
function iniciarBracket() {
    // Asegura que todos los partidos de la fase de grupos estén completos.
    if (!todosLosPartidosRRJugados()) {
        alert("Debes completar todos los partidos de la Fase de Grupos primero.");
        return;
    }

    // Determina el número de participantes para el bracket (debe ser potencia de 2).
    let numParticipantesBracket = 2;
    while (numParticipantesBracket * 2 <= participantes.length) {
        numParticipantesBracket *= 2;
    }
    // Si no hay suficientes participantes para formar un bracket (ej: menos de 2).
    if (numParticipantesBracket < 2) {
        alert("No hay suficientes participantes para crear un bracket de eliminatorias.");
        return;
    }

    // Selecciona a los clasificados según el orden de la tabla de posiciones.
    const clasificados = participantes.slice(0, numParticipantesBracket);

    // Genera la estructura del bracket, incluyendo placeholders para los futuros partidos.
    rondasBracket = {}; // Limpia la estructura del bracket.
    let rondaActual = 1;
    // Usamos los objetos Participante directamente para los jugadores iniciales.
    let participantsForNextRound = clasificados;

    // Genera la estructura ronda por ronda hasta que solo quede un "partido" (el campeón).
    while(participantsForNextRound.length >= 2){
        let currentRoundMatches = [];
        // Crea los partidos para la ronda actual.
        for(let i = 0; i < participantsForNextRound.length / 2; i++){
            currentRoundMatches.push({
                id: `r${rondaActual}_p${i}`, // ID interno del partido (ej: "r1_p0").
                p1: participantsForNextRound[i*2], // Jugador 1.
                p2: participantsForNextRound[i*2 + 1], // Jugador 2.
                resultado: null // Resultado será el objeto Participante ganador, o null.
            });
        }
        rondasBracket[rondaActual] = currentRoundMatches; // Guarda la ronda actual.
        
        // Prepara los participantes (placeholders) para la siguiente ronda.
        // Si un partido no tiene ganador aún, sus "participantes" en la siguiente ronda serán null/placeholder.
        participantsForNextRound = [];
        for(let i = 0; i < currentRoundMatches.length; i++){
             // Se añaden nulls como placeholders para los partidos de la siguiente ronda.
             participantsForNextRound.push(null);
        }
        rondaActual++;
        // Si no hay nadie para la siguiente ronda, salimos.
        if(participantsForNextRound.length === 0) break;
    }

    faseActual = "knockout"; // Cambia la fase a knockout.
    actualizarUI(); // Actualiza la interfaz para mostrar el bracket y los controles.
}

// Genera el código en formato Mermaid para la visualización estática del bracket.
function generarMermaidBracket() {
    let code = "graph TD;\n"; // Inicio del gráfico en Mermaid.
    let matchNodeMap = {}; // Mapa para relacionar IDs internos de partidos con IDs de nodos Mermaid.
    let prevRoundMermaidNodeIds = []; // Almacena los IDs de los nodos Mermaid de la ronda anterior.

    // Itera por cada ronda del bracket para definir los nodos.
    for (const rondaKey in rondasBracket) {
        const ronda = rondasBracket[rondaKey]; // Array de partidos de la ronda actual.
        const roundNum = parseInt(rondaKey); // Número de la ronda (ej: 1, 2, ...).
        const currentRoundMermaidNodeIds = []; // Almacena los IDs Mermaid para la ronda actual.

        // Crea un nodo Mermaid para cada partido de la ronda.
        for (let i = 0; i < ronda.length; i++) {
            const partido = ronda[i];
            // Crea un ID Mermaid consistente y único para cada nodo (ej: "match_1_0").
            const mermaidNodeId = `match_${roundNum}_${i}`;
            matchNodeMap[partido.id] = mermaidNodeId; // Mapea el ID interno al ID Mermaid.
            currentRoundMermaidNodeIds.push(mermaidNodeId);

            // Prepara las etiquetas para los participantes del partido.
            let labelP1 = '---'; // Placeholder por defecto.
            if (partido.p1 && partido.p1 !== 'placeholder' && typeof partido.p1 === 'object') {
                labelP1 = partido.p1.nombre; // Nombre del participante.
            } else if (partido.p1 === 'placeholder' || partido.p1 === null) { // Maneja tanto 'placeholder' como null
                labelP1 = '(Pending)';
            }

            let labelP2 = '---';
            if (partido.p2 && partido.p2 !== 'placeholder' && typeof partido.p2 === 'object') {
                labelP2 = partido.p2.nombre;
            } else if (partido.p2 === 'placeholder' || partido.p2 === null) {
                labelP2 = '(Pending)';
            }

            let nodeContent = `${labelP1} vs ${labelP2}`;

            if (partido.resultado && typeof partido.resultado === 'object') { // Si el partido tiene un ganador definido (como objeto Participante).
                nodeContent = `${partido.resultado.nombre} (Winner)`;
                // Define el nodo como "decided" (con estilo verde).
                code += `    ${mermaidNodeId}["${nodeContent}"]:::decided;\n`;
            } else { // Si el partido está pendiente.
                 if (labelP1 === '(Pending)' && labelP2 === '(Pending)') nodeContent = 'Next Match'; // Para cuando ambos son pendientes.
                 // Define el nodo como "undecided" (con estilo gris/blanco).
                 code += `    ${mermaidNodeId}[${nodeContent}]:::undecided;\n`;
            }
        }
        
        // Conecta los nodos de la ronda ANTERIOR con los nodos de la ronda ACTUAL.
        // El nodo 'i' de la ronda actual se conecta con los nodos 'i*2' y 'i*2+1' de la ronda anterior.
        if (prevRoundMermaidNodeIds.length > 0) {
            for (let i = 0; i < currentRoundMermaidNodeIds.length; i++) {
                const targetNode = currentRoundMermaidNodeIds[i]; // El nodo en la ronda ACTUAL que recibe la conexión.

                const sourceNode1 = prevRoundMermaidNodeIds[i * 2];     // Primer nodo de la ronda ANTERIOR que apunta a targetNode.
                const sourceNode2 = prevRoundMermaidNodeIds[i * 2 + 1]; // Segundo nodo de la ronda ANTERIOR que apunta a targetNode.

                // Añade las flechas de conexión en el código Mermaid.
                if (sourceNode1) code += `    ${sourceNode1} --> ${targetNode};\n`;
                if (sourceNode2) code += `    ${sourceNode2} --> ${targetNode};\n`;
            }
        }
        prevRoundMermaidNodeIds = currentRoundMermaidNodeIds; // Actualiza la lista de nodos de la ronda anterior para la siguiente iteración.
    }

    // Conecta al campeón si está definido (el último partido de la última ronda tiene un resultado).
    const ultimaRondaNum = Math.max(...Object.keys(rondasBracket).map(Number));
    if (rondasBracket[ultimaRondaNum] && rondasBracket[ultimaRondaNum].length === 1) {
        const finalMatch = rondasBracket[ultimaRondaNum][0];
        if (finalMatch.resultado && typeof finalMatch.resultado === 'object') {
            const finalMatchId = finalMatch.id;
            // Asegura que el nodo del último partido existe antes de intentar conectarlo.
            if (matchNodeMap[finalMatchId]) {
                 // Define un nodo final llamado "CHAMPION".
                 code += `    ${matchNodeMap[finalMatchId]} --> CHAMPION["🏆 Campeón"];\n`;
            }
        }
    }
    
    // Define las clases CSS para los estilos de los nodos de Mermaid (las clases están definidas en style.css).
    code += "    classDef decided fill:#e8f5e9,stroke:#4CAF50,stroke-width:1.5px;\n";
    code += "    classDef undecided fill:#ffffff,stroke:#ccc,stroke-width:1px;\n";
    
    return code; // Retorna el código completo de Mermaid.
}

// Renderiza el bracket estático y muestra los controles para los partidos pendientes.
function generarYMostrarBracket() {
    bracketDisplayDiv.innerHTML = ''; // Limpia el área del bracket.
    campeonDisplayH3.textContent = ''; // Limpia el texto del campeón.
    
    // Verifica si hay partidos pendientes en el bracket (resultado es null).
    let hayPartidosPendientes = false;
    for (const rondaKey in rondasBracket) {
        if (rondasBracket[rondaKey].some(partido => partido.resultado === null)) {
            hayPartidosPendientes = true;
            break;
        }
    }
    
    // Muestra u oculta la sección de controles del bracket según si hay partidos pendientes.
    bracketControlsSection.classList.toggle('hidden', !hayPartidosPendientes);
    // Si hay partidos pendientes, muestra la lista con sus controles.
    if (hayPartidosPendientes) {
         displayPendingBracketMatches();
    }

    // Genera y renderiza el diagrama de Mermaid.
    const mermaidString = generarMermaidBracket();
    if (mermaidString) {
        const mermaidDiv = document.createElement('div');
        // Crea un ID único para este contenedor de SVG, esencial para que `mermaid.render` funcione correctamente.
        const uniqueMermaidContainerId = "mermaid-render-" + Math.random().toString(36).substr(2, 9);
        mermaidDiv.id = uniqueMermaidContainerId;
        // Añade este div temporalmente al DOM para que Mermaid pueda renderizar dentro de él.
        bracketDisplayDiv.appendChild(mermaidDiv);

        try {
            // Verifica que la librería Mermaid esté cargada.
            if (typeof mermaid !== 'undefined') {
                 // Usa `mermaid.render` para procesar el código Mermaid y obtener el SVG.
                 mermaid.render(uniqueMermaidContainerId, mermaidString, function(svgCode, renderFn){
                    // svgCode contiene el código SVG generado. Lo insertamos en nuestro div.
                    const renderedSvg = renderFn(); // Obtiene el SVG como string.
                    mermaidDiv.innerHTML = renderedSvg; // Inserta el SVG dentro del div.

                    // Habilitar scroll si el bracket es más ancho que el contenedor.
                    bracketDisplayDiv.style.overflowX = 'auto';
                 });
            } else {
                console.error("La librería Mermaid no está disponible.");
                 bracketDisplayDiv.innerHTML = '<p>Error: La librería Mermaid no se cargó correctamente.</p>';
            }
        } catch (e) {
            console.error("Error al renderizar el diagrama Mermaid:", e);
            bracketDisplayDiv.innerHTML = '<p>Error al cargar el diagrama del bracket.</p>';
        }
    } else {
        bracketDisplayDiv.innerHTML = '<p>Error al generar el código del bracket.</p>';
    }

    // Muestra al campeón si ya se ha determinado.
    const ultimaRondaNum = Math.max(...Object.keys(rondasBracket).map(Number)); // Encuentra el número de la última ronda.
    if (rondasBracket[ultimaRondaNum] && rondasBracket[ultimaRondaNum].length === 1) { // Si solo hay un partido en la última ronda.
        const finalMatch = rondasBracket[ultimaRondaNum][0];
        if (finalMatch.resultado && typeof finalMatch.resultado === 'object') { // Si el partido final tiene un ganador definido.
            campeonDisplayH3.textContent = `🏆 ¡El Campeón es: ${finalMatch.resultado.nombre}! 🏆`;
        } else {
            campeonDisplayH3.textContent = `La Final está por definir...`; // Mensaje si la final aún no se ha jugado.
        }
    }
}

// Muestra la lista de partidos pendientes del bracket con controles para seleccionar ganador.
function displayPendingBracketMatches() {
    pendingBracketMatchesDiv.innerHTML = ''; // Limpia la lista anterior.
    
    // Itera sobre todas las rondas y partidos para encontrar los que no tienen resultado.
    for (const rondaKey in rondasBracket) {
        const ronda = rondasBracket[rondaKey];
        const roundNum = parseInt(rondaKey);
        
        ronda.forEach((partido, index) => {
            // Solo procesa partidos que aún no tienen resultado (resultado es null).
            if (partido.resultado === null) {
                const matchId = partido.id; // ID interno del partido (ej: "r1_p0").
                
                // Obtiene los nombres de los participantes, manejando placeholders.
                let labelP1 = partido.p1 ? (typeof partido.p1 === 'object' ? partido.p1.nombre : partido.p1) : '(Pending)';
                let labelP2 = partido.p2 ? (typeof partido.p2 === 'object' ? partido.p2.nombre : partido.p2) : '(Pending)';
                
                // Si son 'placeholder' o 'null', se convierten a '(Pending)'.
                if (labelP1 === '---' || labelP1 === 'placeholder' || labelP1 === null) labelP1 = '(Pending)';
                if (labelP2 === '---' || labelP2 === 'placeholder' || labelP2 === null) labelP2 = '(Pending)';

                // Crea las opciones para el select, solo si el participante no es un placeholder.
                const option1 = labelP1 !== '(Pending)' ? `<option value="${labelP1}">${labelP1}</option>` : '';
                const option2 = labelP2 !== '(Pending)' ? `<option value="${labelP2}">${labelP2}</option>` : '';
                
                // Crea el elemento HTML para mostrar el partido pendiente y sus controles.
                const matchDiv = document.createElement('div');
                matchDiv.innerHTML = `
                    <span>${labelP1} vs ${labelP2} (Ronda ${roundNum})</span>
                    <div>
                        <select class="select-winner" data-match-id="${matchId}">
                            <option value="">-- Selecciona Ganador --</option>
                            ${option1}
                            ${option2}
                        </select>
                        <button class="btn-register-winner" data-match-id="${matchId}" disabled>Registrar</button>
                    </div>
                `;
                pendingBracketMatchesDiv.appendChild(matchDiv); // Añade el div del partido a la lista.
            }
        });
    }
    // Si después de revisar todas las rondas, no hay partidos pendientes (ej: torneo ya finalizado),
    // se oculta la sección de controles.
    if(pendingBracketMatchesDiv.innerHTML === '') {
        bracketControlsSection.classList.add('hidden');
    }
}

// Registra el ganador de un partido del bracket a través de los controles pendientes.
function registerBracketWinner(matchId, winnerNombre) {
    // Busca el partido en la estructura de datos del bracket.
    let partidoEncontrado = null;
    let rondaDelPartido = -1;
    for (const rondaKey in rondasBracket) {
        const partido = rondasBracket[rondaKey].find(p => p.id === matchId);
        if (partido) {
            partidoEncontrado = partido;
            rondaDelPartido = parseInt(rondaKey);
            break;
        }
    }

    // Si no se encuentra el partido o no hay ganador seleccionado, salir.
    if (!partidoEncontrado || !winnerNombre) return;

    // Busca el objeto Participante correspondiente al nombre del ganador.
    // Esto es crucial para poder propagar el objeto Participante ganador a la siguiente ronda.
    const ganadorParticipante = participantes.find(p => p.nombre === winnerNombre);

    // Actualiza el resultado del partido en la estructura de datos del bracket.
    // Guarda el objeto Participante si se encontró, de lo contrario guarda el nombre (manejo de placeholders).
    partidoEncontrado.resultado = ganadorParticipante || winnerNombre;

    // --- Propagación del resultado a la siguiente ronda ---
    // Si este no es el último partido del torneo...
    const siguienteRondaNum = rondaDelPartido + 1;
    if (rondasBracket[siguienteRondaNum]) {
        const partidosSiguienteRonda = rondasBracket[siguienteRondaNum];
        
        // Determina el índice del partido en la siguiente ronda que recibe a este ganador.
        // Esto depende de la posición del partido actual (si p1 o p2 alimentó la siguiente ronda).
        // El ID del partido es "r{Ronda}_p{IndiceEnRonda}". El índice determina qué jugador (p1 o p2) actualizar.
        const matchIndexInCurrentRound = parseInt(partidoEncontrado.id.split('_p')[1]); // Ej: 'p0' -> 0, 'p1' -> 1
        
        // El partido en la siguiente ronda que recibe a este ganador es el que tiene índice `floor(matchIndexInCurrentRound / 2)`.
        const indexInNextRoundMatch = Math.floor(matchIndexInCurrentRound / 2);
        
        // Determina si el ganador va en la posición `p1` o `p2` del partido siguiente.
        // Si `matchIndexInCurrentRound` es par (0, 2, 4...), es el `p1` del partido siguiente.
        // Si es impar (1, 3, 5...), es el `p2` del partido siguiente.
        const affectsP1 = (matchIndexInCurrentRound % 2 === 0);

        if (partidosSiguienteRonda[indexInNextRoundMatch]) { // Verifica que el partido siguiente exista.
            if (affectsP1) {
                partidosSiguienteRonda[indexInNextRoundMatch].p1 = ganadorParticipante; // Actualiza p1.
            } else {
                partidosSiguienteRonda[indexInNextRoundMatch].p2 = ganadorParticipante; // Actualiza p2.
            }
        }
    }
    // --- Fin de la Propagación ---

    actualizarUI(); // Vuelve a dibujar todo para reflejar el resultado y actualizar la lista de pendientes/bracket.
}

// Maneja la acción de registrar un ganador desde los controles pendientes (select + botón).
function handlePendingBracketMatchRegistration() {
    // Obtiene el select y el botón asociados al evento.
    const selectElement = event.target.closest('div').querySelector('.select-winner');
    const btnRegister = event.target.closest('button.btn-register-winner');

    // Si no se encuentran los elementos o el botón está deshabilitado, salir.
    if (!selectElement || !btnRegister || btnRegister.disabled) return;

    const matchId = btnRegister.dataset.matchId; // Obtiene el ID del partido del botón.
    const winnerNombre = selectElement.value; // Obtiene el nombre del ganador seleccionado.

    // Si se ha seleccionado un ganador, registrarlo.
    if (winnerNombre) {
        registerBracketWinner(matchId, winnerNombre);
    } else {
        alert("Por favor, selecciona un ganador antes de registrar.");
    }
}

// Configura todos los listeners de eventos para los elementos interactivos de la página.
function setupEventListeners() {
    // Botón de Agregar Participante.
    btnAgregar.addEventListener('click', agregarParticipante);
    // Permite añadir participante al presionar Enter en el campo de nombre.
    inputNombre.addEventListener('keypress', function(event) { if (event.key === 'Enter') agregarParticipante(); });

    // Botón "Nuevo Torneo" para reiniciar todo.
    btnNuevoTorneo.addEventListener('click', inicializarEstado);

    // Botón para iniciar la Fase de Grupos.
    btnIniciarRR.addEventListener('click', iniciarRoundRobin);

    // Botón para iniciar el Bracket de Eliminatorias.
    btnIniciarBracket.addEventListener('click', iniciarBracket);

    // Delegación de eventos para los botones de resultado de los partidos del Round Robin.
    partidosRRDiv.addEventListener('click', function(event) {
        const target = event.target;
        // Verifica si el clic fue en un botón de 'ganador' y si no está deshabilitado.
        if (target.classList.contains('btn-ganador') && !target.disabled) {
            const matchId = target.dataset.matchId; // Obtiene el ID del partido desde el atributo data-.
            const ganadorNombre = target.dataset.ganador; // Obtiene el nombre del ganador.
            registrarVictoriaRR(matchId, ganadorNombre); // Llama a la función para registrar la victoria.
        }
    });
    
    // Delegación de eventos para los controles de partidos pendientes del Bracket.
    // Captura clics en los botones "Registrar".
    pendingBracketMatchesDiv.addEventListener('click', function(event) {
        // Verifica si el clic fue en un botón con la clase 'btn-register-winner'.
        if (event.target.classList.contains('btn-register-winner')) {
            handlePendingBracketMatchRegistration(); // Maneja el registro del ganador.
        }
    });
    // Captura cambios en los selects (ej: para habilitar el botón "Registrar" cuando se selecciona un ganador).
    pendingBracketMatchesDiv.addEventListener('change', function(event){
         // Verifica si el cambio ocurrió en un select con la clase 'select-winner'.
         if(event.target.classList.contains('select-winner')){
              const select = event.target;
              // Encuentra el botón "Registrar" asociado a este select (el siguiente elemento sibling).
              const button = select.nextElementSibling;
              if(button && button.classList.contains('btn-register-winner')){
                   // Habilita el botón si se seleccionó un valor (no el placeholder "--").
                   button.disabled = (select.value === "");
              }
         }
    });

}

// Inicializa el estado de la aplicación a su estado por defecto (fase de inscripción).
function inicializarEstado() {
    participantes = []; // Vacía la lista de participantes.
    faseActual = "inscripcion"; // Vuelve a la fase de inscripción.
    partidosRoundRobin = []; // Reinicia los partidos de RR.
    idPartidosJugadosRR.clear(); // Limpia los IDs de partidos jugados de RR.
    rondasBracket = {}; // Limpia la estructura del bracket.
    
    // Limpia las áreas de visualización del bracket y el campeón.
    bracketDisplayDiv.innerHTML = '';
    campeonDisplayH3.textContent = '';
    // Oculta la sección de controles del bracket al iniciar o reiniciar.
    bracketControlsSection.classList.add('hidden');

    // Opcional: Añadir participantes de ejemplo para testing rápido.
    /*
    participantes.push(new Participante("Alice"));
    participantes.push(new Participante("Bob"));
    participantes.push(new Participante("Charlie"));
    participantes.push(new Participante("David"));
    participantes.push(new Participante("Eve"));
    participantes.push(new Participante("Frank"));
    participantes.push(new Participante("Grace"));
    participantes.push(new Participante("Heidi"));
    faseActual = "inscripcion"; // Asegurarse de que esté en inscripción
    */

    actualizarUI(); // Asegura que la UI se muestre correctamente en el estado inicial.
}

// --- EJECUCIÓN INICIAL ---
// El evento DOMContentLoaded asegura que el script se ejecute solo después de que el HTML
// ha sido completamente cargado y parseado por el navegador.
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners(); // Configura todos los listeners de eventos necesarios.
    inicializarEstado(); // Carga el estado inicial de la aplicación al empezar.
});
