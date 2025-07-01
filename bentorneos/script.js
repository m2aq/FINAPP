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

// Estructura para el bracket: { numeroRonda: [ { id: "r1_p0", p1: objORPlaceholder, p2: objORPlaceholder, resultado: objGanadorORNull }, ... ], ... }
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
        generarYMostrarBracket(); // Dibuja el bracket de eliminatorias.
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

    partido.resultado = ganadorNombre; // Guarda quién ganó el partido.
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

    // Genera la estructura inicial del bracket (primera ronda).
    rondasBracket = {}; // Limpia la estructura del bracket.
    let rondaActual = 1;
    // Usamos los objetos Participante directamente para representar a los jugadores.
    let participantesEnRonda = clasificados;

    let ronda1Matches = [];
    for(let i = 0; i < participantesEnRonda.length / 2; i++){
        ronda1Matches.push({
            id: `r${rondaActual}_p${i}`, // ID interno del partido (ej: 'r1_p0')
            p1: participantesEnRonda[i*2], // Jugador 1
            p2: participantesEnRonda[i*2 + 1], // Jugador 2
            resultado: null // Guarda el OBJETO ganador o null si no se ha jugado
        });
    }
    rondasBracket[rondaActual] = ronda1Matches; // Guarda la primera ronda.

    // Genera las siguientes rondas del bracket hasta llegar a la final.
    while(participantesEnRonda.length > 1) {
        const matchesAnterior = rondasBracket[rondaActual]; // Partidos de la ronda actual.
        const ganadoresRondaAnterior = []; // Participantes que avanzan a la siguiente ronda.

        // Determina los jugadores para la siguiente ronda (los ganadores de la ronda actual).
        for (const partido of matchesAnterior) {
            if (partido.resultado && typeof partido.resultado === 'object') {
                 ganadoresRondaAnterior.push(partido.resultado); // Avanza el ganador como objeto Participante.
            } else {
                 // Si el partido no tiene un ganador definido (objeto), usa un placeholder.
                 // Esto podría ocurrir si el bracket tiene 'bye' o aún no se han jugado los partidos.
                 ganadoresRondaAnterior.push('placeholder');
            }
        }

        // Si no hay suficientes participantes para la siguiente ronda, termina.
        if (ganadoresRondaAnterior.length < 2) break;

        participantesEnRonda = ganadoresRondaAnterior; // Los jugadores para la siguiente ronda son los ganadores.
        rondaActual++;
        let siguienteRondaMatches = [];
        for(let i = 0; i < participantesEnRonda.length / 2; i++){
             siguienteRondaMatches.push({
                id: `r${rondaActual}_p${i}`, // Nuevo ID interno para el partido de la siguiente ronda.
                p1: participantesEnRonda[i*2],
                p2: participantesEnRonda[i*2 + 1],
                resultado: null // Inicialmente null para los partidos no jugados.
            });
        }
        rondasBracket[rondaActual] = siguienteRondaMatches; // Guarda la nueva ronda.
    }

    faseActual = "knockout"; // Cambia la fase a knockout.
    actualizarUI(); // Actualiza la interfaz para mostrar el bracket.
}

// Genera el código en formato Mermaid para visualizar el bracket.
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
            } else if (partido.p1 === 'placeholder') {
                labelP1 = '(Bye/Placeholder)'; // Si es un placeholder.
            }

            let labelP2 = '---';
            if (partido.p2 && partido.p2 !== 'placeholder' && typeof partido.p2 === 'object') {
                labelP2 = partido.p2.nombre;
            } else if (partido.p2 === 'placeholder') {
                labelP2 = '(Bye/Placeholder)';
            }

            let nodeContent = `${labelP1} vs ${labelP2}`; // Contenido base del nodo.

            if (partido.resultado && typeof partido.resultado === 'object') { // Si el partido tiene un ganador definido (como objeto Participante).
                nodeContent = `${partido.resultado.nombre} (Winner)`;
                // Define el nodo como "decided" (con estilo verde).
                code += `    ${mermaidNodeId}["${nodeContent}"]:::decided;\n`;
            } else { // Si el partido está pendiente.
                 if (labelP1 === '---' && labelP2 === '---') nodeContent = 'Final Match'; // Caso especial para la final.
                 else if (labelP1 === '(Bye/Placeholder)' && labelP2 === '(Bye/Placeholder)') nodeContent = 'Empty Slot'; // Slot vacío.

                 // Define el nodo como "undecided" (con estilo gris/blanco).
                 // Nota: Mermaid no permite añadir callbacks JS directamente a los nodos para interactividad simple como botones.
                 code += `    ${mermaidNodeId}[${nodeContent}<br><small>(Pending)</small>]:::undecided;\n`;
            }
        }
        
        // Conecta los nodos de la ronda ANTERIOR con los nodos de la ronda ACTUAL.
        // El nodo 'i' de la ronda actual se conecta con los nodos 'i*2' y 'i*2+1' de la ronda anterior.
        if (prevRoundMermaidNodeIds.length > 0) { // Solo si no es la primera ronda (ya que la primera ronda no tiene nodos de los que conectarse en nuestro modelo).
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
    
    // Define las clases CSS para los estilos de los nodos de Mermaid (ya definido en style.css, pero esto asegura la referencia en el código).
    code += "    classDef decided fill:#e8f5e9,stroke:#4CAF50,stroke-width:1.5px;\n";
    code += "    classDef undecided fill:#ffffff,stroke:#ccc,stroke-width:1px;\n";
    
    return code; // Retorna el código completo de Mermaid.
}

// Renderiza el bracket en el div `bracketDisplay`.
function generarYMostrarBracket() {
    bracketDisplayDiv.innerHTML = ''; // Limpia el contenido previo del div.
    campeonDisplayH3.textContent = ''; // Limpia el texto del campeón.

    // Si no hay datos de bracket, muestra un mensaje.
    if (Object.keys(rondasBracket).length === 0) {
        bracketDisplayDiv.innerHTML = '<p>Generando bracket...</p>';
        return;
    }

    const mermaidString = generarMermaidBracket(); // Obtiene el código Mermaid.
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
                 // El primer argumento es el ID del elemento contenedor donde se renderizará.
                 // El segundo es el código Mermaid. La callback se ejecuta al terminar.
                 mermaid.render(uniqueMermaidContainerId, mermaidString, function(svgCode, renderFn){
                    // svgCode contiene el código SVG generado. Lo insertamos en nuestro div.
                    // Si usas una versión reciente de Mermaid, `renderFn` podría ser más útil,
                    // pero insertar `svgCode` directamente suele funcionar.
                    const renderedSvg = renderFn(); // Obtiene el SVG como string.
                    mermaidDiv.innerHTML = renderedSvg; // Inserta el SVG dentro del div.

                    // Manejar scroll si el bracket es demasiado ancho.
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

// Configura todos los listeners de eventos para los elementos interactivos.
function setupEventListeners() {
    // Botón de Agregar Participante.
    btnAgregar.addEventListener('click', agregarParticipante);
    // Permite añadir participante al presionar Enter en el campo de nombre.
    inputNombre.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            agregarParticipante();
        }
    });

    // Botón "Nuevo Torneo" para reiniciar todo.
    btnNuevoTorneo.addEventListener('click', inicializarEstado);

    // Botón para iniciar la Fase de Grupos.
    btnIniciarRR.addEventListener('click', iniciarRoundRobin);

    // Botón para iniciar el Bracket de Eliminatorias.
    btnIniciarBracket.addEventListener('click', iniciarBracket);

    // Delegación de eventos para los botones de resultado de los partidos del Round Robin.
    // Esto es necesario porque los botones se crean dinámicamente.
    partidosRRDiv.addEventListener('click', function(event) {
        const target = event.target;
        // Verifica si el clic fue en un botón con la clase 'btn-ganador' y si no está deshabilitado.
        if (target.classList.contains('btn-ganador') && !target.disabled) {
            const matchId = target.dataset.matchId; // Obtiene el ID del partido desde el atributo data-.
            const ganadorNombre = target.dataset.ganador; // Obtiene el nombre del ganador.
            registrarVictoriaRR(matchId, ganadorNombre); // Llama a la función para registrar la victoria.
        }
    });
}

// Inicializa el estado de la aplicación a su estado por defecto.
function inicializarEstado() {
    participantes = []; // Vacía la lista de participantes.
    faseActual = "inscripcion"; // Vuelve a la fase de inscripción.
    partidosRoundRobin = []; // Reinicia los partidos de RR.
    idPartidosJugadosRR.clear(); // Limpia los partidos jugados de RR.
    rondasBracket = {}; // Limpia la estructura del bracket.
    
    // Limpia las áreas de visualización del bracket.
    bracketDisplayDiv.innerHTML = '';
    campeonDisplayH3.textContent = '';

    // Opcional: Si quieres un modo de test rápido, descomenta esto para añadir participantes de ejemplo:
    /*
    participantes.push(new Participante("Alice"));
    participantes.push(new Participante("Bob"));
    participantes.push(new Participante("Charlie"));
    participantes.push(new Participante("David"));
    participantes.push(new Participante("Eve"));
    participantes.push(new Participante("Frank"));
    participantes.push(new Participante("Grace"));
    participantes.push(new Participante("Heidi"));
    faseActual = "inscripcion"; // Asegúrate de que está en inscripción si añades participantes
    */

    actualizarUI(); // Asegura que la UI se muestre correctamente en el estado inicial.
}

// --- EJECUCIÓN INICIAL ---
// Se ejecuta cuando el documento HTML está completamente cargado y parseado.
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners(); // Configura todos los listeners de eventos al inicio.
    inicializarEstado(); // Carga el estado inicial de la aplicación.
});
