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
let partidosRoundRobin = []; // Lista de partidos para la fase de grupos.
let idPartidosJugadosRR = new Set(); // Conjunto para rastrear los IDs de los partidos de RR ya jugados.

// Estado específico para la fase de Knockout (Eliminatorias)
let knockoutState = {
    currentRound: 1,         // Ronda actual (ej: 1 para Octavos, 2 para Cuartos, etc.)
    matches: [],             // Lista de partidos de la ronda actual: [{ id, p1, p2, resultado: string | null, completed: boolean }, ...]
    roundCompleted: false    // Bandera para indicar si todos los partidos de la ronda actual están completados.
};
let winnersFromPreviousRound = []; // Almacena los ganadores para generar la siguiente ronda.
let finalChampion = null;           // Almacena el ganador final del torneo.

// --- Constante para Placeholder ---
// Representa a un jugador "pendiente" o un espacio vacío en un bracket.
const PLACEHOLDER_PARTICIPANT = { nombre: "(Pending)", puntos: 0, victorias: 0, derrotas: 0 };

// --- ELEMENTOS DEL DOM ---
// Referencias a los elementos principales de la interfaz.
const sectionInscripcion = document.getElementById('inscripcion-section');
const sectionRoundRobin = document.getElementById('round-robin-section');
const sectionBracket = document.getElementById('bracket-section'); // Sección general para la fase KO

// Controles de Inscripción
const inputNombre = document.getElementById('nombreParticipante');
const btnAgregar = document.getElementById('btnAgregarParticipante');
const listaParticipantesUL = document.getElementById('listaParticipantes');
const btnIniciarRR = document.getElementById('btnIniciarRoundRobin');

// Botón de control global
const btnNuevoTorneo = document.getElementById('btnNuevoTorneo');

// Controles de Fase de Grupos (Round Robin)
const partidosRRDiv = document.getElementById('partidosRoundRobin');
const tablaPosicionesBody = document.querySelector('#tablaPosiciones tbody');
const btnIniciarBracket = document.getElementById('btnIniciarBracket');

// Controles de Fase Knockout (Modificado)
// Bracket display will now be a list of matches, not a Mermaid graph.
const matchesContainerKO = document.createElement('div'); // Create a container for KO matches list. We'll append it to bracket-section.
matchesContainerKO.id = 'knockoutMatchesList';
// It will be added to the DOM within sectionBracket in inicializarEstado if it doesn't exist.

const bracketControlsSection = document.getElementById('bracket-controls-section'); // Section title/wrapper for KO controls
const pendingBracketMatchesDiv = document.getElementById('pendingBracketMatches'); // The container within controls section

const campeonDisplayH3 = document.getElementById('campeonDisplay'); // Display for the final winner.


// --- FUNCIONES AUXILIARES DE UI ---

// Actualiza la visibilidad de las secciones y el estado de los botones según la fase actual.
function actualizarUI() {
    sectionInscripcion.classList.toggle('hidden', faseActual !== 'inscripcion');
    sectionRoundRobin.classList.toggle('hidden', faseActual !== 'round_robin');
    sectionBracket.classList.toggle('hidden', faseActual !== 'knockout');

    // Asegura que el botón "Iniciar Fase de Grupos" esté habilitado solo si hay al menos 2 participantes.
    btnIniciarRR.disabled = participantes.length < 2;

    // Renderiza el contenido específico para la fase actual.
    if (faseActual === 'inscripcion') {
        actualizarListaParticipantes(); // Muestra la lista de participantes inscritos.
    } else if (faseActual === 'round_robin') {
        mostrarPartidosRoundRobin(); // Muestra los partidos de RR.
        actualizarTablaPosiciones(); // Actualiza la tabla de clasificación.
        // Habilita el botón "Iniciar Bracket" solo si todos los partidos de RR han finalizado.
        btnIniciarBracket.disabled = !todosLosPartidosRRJugados();
    } else if (faseActual === 'knockout') {
        displayKnockoutMatches(); // Muestra los partidos de eliminatorias de la ronda actual.
        // Configura el botón "Start Next Round" si es necesario.
        checkAndDisplayNextRoundButton();
        // Muestra u oculta la sección de controles según si hay partidos pendientes o el torneo ha terminado.
        document.getElementById('bracket-controls-section').classList.toggle('hidden', !(knockoutState.matches.length > 0 && !knockoutState.roundCompleted) && !finalChampion);
    }
}

// Actualiza la lista visual de participantes inscritos en la fase de inscripción.
function actualizarListaParticipantes() {
    listaParticipantesUL.innerHTML = ''; // Limpia la lista actual.
    if (participantes.length === 0) {
        listaParticipantesUL.innerHTML = '<li>No hay participantes inscritos todavía.</li>';
        return;
    }
    // Inserta cada participante como un elemento de lista.
    participantes.forEach((p, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${p.nombre}`;
        listaParticipantesUL.appendChild(li);
    });
}

// Verifica si todos los partidos de la Fase de Grupos (Round Robin) han sido jugados.
function todosLosPartidosRRJugados() {
    return idPartidosJugadosRR.size === partidosRoundRobin.length;
}

// --- FASE 1: INSCRIPCIÓN ---

// Agrega un nuevo participante a la lista.
function agregarParticipante() {
    const nombre = inputNombre.value.trim(); // Obtiene el valor del input y remueve espacios en blanco.
    if (!nombre) { // Si el nombre está vacío, muestra alerta y sale.
        alert("Por favor, introduce un nombre para el participante.");
        return;
    }
    // Valida que el nombre no esté duplicado (ignorando mayúsculas/minúsculas).
    if (participantes.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
        alert(`El participante '${nombre}' ya está inscrito.`);
        return;
    }
    const nuevoParticipante = new Participante(nombre); // Crea la instancia del nuevo participante.
    participantes.push(nuevoParticipante); // Añade el nuevo participante al array global.
    inputNombre.value = ''; // Limpia el campo de entrada.
    actualizarUI(); // Actualiza la interfaz para mostrar los cambios.
}

// --- FASE 2: ROUND ROBIN ---

// Inicia la Fase de Grupos (todos contra todos).
function iniciarRoundRobin() {
    if (participantes.length < 2) return; // Requiere al menos 2 participantes.
    faseActual = "round_robin"; // Cambia la fase actual.
    partidosRoundRobin = []; // Reinicia la lista de partidos de RR.
    idPartidosJugadosRR.clear(); // Limpia el conjunto de IDs de partidos jugados.

    // Genera todos los emparejamientos únicos (combinaciones) de participantes.
    for (let i = 0; i < participantes.length; i++) {
        for (let j = i + 1; j < participantes.length; j++) {
            partidosRoundRobin.push({
                id: `${i}-${j}`, // ID único para el partido (ej: "0-1").
                p1: participantes[i], // Participante 1.
                p2: participantes[j], // Participante 2.
                resultado: null // Guarda el nombre del ganador, o null si no se ha jugado.
            });
        }
    }
    actualizarUI(); // Actualiza la interfaz para mostrar la fase de grupos.
}

// Renderiza los partidos de la Fase de Grupos en el HTML.
function mostrarPartidosRoundRobin() {
    partidosRRDiv.innerHTML = ''; // Limpia el contenido actual para redibujar.
    partidosRoundRobin.forEach(partido => {
        const divMatch = document.createElement('div');
        // Verifica si el partido ya fue jugado para deshabilitar los botones de resultado.
        const isMatchPlayed = idPartidosJugadosRR.has(partido.id);

        // Estructura HTML para cada partido con botones para registrar la victoria.
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

// Registra la victoria de un participante en un partido del Round Robin.
function registrarVictoriaRR(matchId, ganadorNombre) {
    // Si el partido ya se jugó, no hace nada.
    if (idPartidosJugadosRR.has(matchId)) return;

    const partido = partidosRoundRobin.find(p => p.id === matchId);
    if (!partido) {
        console.error(`Partido RR con ID ${matchId} no encontrado.`);
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

    // Actualiza las estadísticas del ganador y perdedor.
    ganador.victorias++;
    ganador.puntos += 2; // 2 puntos por victoria
    perdedor.derrotas++;
    perdedor.puntos += 1; // 1 punto por derrota

    partido.resultado = ganadorNombre; // Guarda el nombre del ganador.
    idPartidosJugadosRR.add(matchId); // Marca el partido como jugado.

    actualizarUI(); // Actualiza la interfaz para mostrar los cambios.
}

// Actualiza la tabla de posiciones en el HTML.
function actualizarTablaPosiciones() {
    // Ordena los participantes: por puntos (mayor a menor), luego por victorias, luego por derrotas (menor es mejor).
    participantes.sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        if (b.victorias !== a.victorias) return b.victorias - a.victorias;
        return a.derrotas - b.derrotas;
    });

    tablaPosicionesBody.innerHTML = ''; // Limpia el cuerpo de la tabla anterior.
    // Inserta cada participante ordenado en la tabla.
    participantes.forEach((p, index) => {
        const fila = tablaPosicionesBody.insertRow();
        fila.insertCell(0).textContent = index + 1; // Posición.
        fila.insertCell(1).textContent = p.nombre;  // Nombre.
        fila.insertCell(2).textContent = p.puntos;   // Puntos.
        fila.insertCell(3).textContent = p.victorias;// Victorias.
        fila.insertCell(4).textContent = p.derrotas; // Derrotas.
    });
}

// --- FASE 3: KNOCKOUT (Eliminatorias) ---

// Inicializa la fase de eliminatorias, calcula clasificados y prepara la primera ronda de partidos.
function iniciarBracket() {
    if (!todosLosPartidosRRJugados()) { // Validar que la fase anterior esté completa.
        alert("Debes completar todos los partidos de la Fase de Grupos primero.");
        return;
    }

    // Determina el número de participantes para el bracket (potencia de 2 más cercana o igual al número de participantes).
    let numParticipantesBracket = 2;
    while (numParticipantesBracket * 2 <= participantes.length) {
        numParticipantesBracket *= 2;
    }
    if (numParticipantesBracket < 2) { // No se puede formar bracket si hay menos de 2 participantes.
        alert("No hay suficientes participantes para crear un bracket de eliminatorias.");
        return;
    }

    // Obtiene los participantes clasificados (ordenados por su desempeño en RR).
    const clasificados = participantes.slice(0, numParticipantesBracket);
    
    faseActual = "knockout"; // Cambia la fase actual a knockout.
    finalChampion = null; // Reinicia el campeón final.
    
    // Inicializa el estado para la fase de knockout.
    knockoutState = {
        currentRound: 1,
        matches: [], // Partidos de la ronda actual.
        roundCompleted: false
    };
    winnersFromPreviousRound = []; // Reinicia la lista de ganadores para la siguiente ronda.

    // Genera los partidos para la Ronda 1 del bracket.
    let round1Matches = [];
    for(let i = 0; i < clasificados.length / 2; i++){
        round1Matches.push({
            id: `k_r1_p${i}`, // ID único para el partido de knockout (ej: "k_r1_p0").
            p1: clasificados[i*2], // Primer jugador (objeto Participante).
            p2: clasificados[i*2 + 1], // Segundo jugador (objeto Participante).
            resultado: null,      // Nombre del ganador, o null si no se ha jugado.
            completed: false      // Bandera para saber si el partido ya se jugó.
        });
    }
    knockoutState.matches = round1Matches; // Guarda los partidos de la Ronda 1 en el estado.
    
    actualizarUI(); // Actualiza la interfaz para mostrar la fase de knockout.
}

// Muestra los partidos de la ronda actual de eliminatorias y los controles.
function displayKnockoutMatches() {
    // Obtenemos el contenedor donde se listarán los partidos de knockout.
    let matchesContainer = document.getElementById('knockoutMatchesList');
    // Si el contenedor no existe (primera vez que se muestra esta fase o después de reset), lo creamos.
    if (!matchesContainer) {
        matchesContainer = document.createElement('div');
        matchesContainer.id = 'knockoutMatchesList';
        // Añadimos este contenedor al inicio de la sección 'bracket-section'.
        // Se asume que 'bracket-section' ya existe en index.html.
        const bracketSection = document.getElementById('bracket-section');
        if (bracketSection) bracketSection.prepend(matchesContainer);
    }
    matchesContainer.innerHTML = ''; // Limpia el contenido anterior.

    // Si el torneo ha terminado (hay un campeón final), muestra el campeón.
    if (finalChampion) {
         document.getElementById('campeonDisplay').textContent = `🏆 ¡El Campeón es: ${finalChampion.nombre}! 🏆`;
         // Oculta la sección de controles si el torneo ya terminó.
         document.getElementById('bracket-controls-section').classList.add('hidden');
         return; // Salimos si el torneo ha terminado.
    }

    // Verifica si todos los partidos de la ronda actual están completados.
    const allMatchesInCurrentRoundCompleted = knockoutState.matches.every(m => m.completed);
    knockoutState.roundCompleted = allMatchesInCurrentRoundCompleted;
    
    // Verifica si debemos mostrar el botón "Iniciar Siguiente Ronda".
    // Se muestra si la ronda actual está completa Y hay ganadores para formar la siguiente ronda.
    const showNextRoundButton = knockoutState.roundCompleted && winnersFromPreviousRound.length > 0 && !finalChampion;
    
    let nextRoundButtonElement = document.getElementById('btnNextKnockoutRound'); // Busca el botón existente.

    // Si debemos mostrar el botón y no existe, lo creamos y añadimos.
    if (showNextRoundButton && !nextRoundButtonElement) {
        nextRoundButtonElement = document.createElement('button');
        nextRoundButtonElement.id = 'btnNextKnockoutRound';
        nextRoundButtonElement.textContent = `▶ Iniciar Ronda ${knockoutState.currentRound + 1}`;
        // nextRoundButtonElement.className = 'Accent.TButton'; // Si quieres darle el mismo estilo de botón que los otros Accent.TButton
        nextRoundButtonElement.style.marginTop = '20px'; // Espacio visual
        document.getElementById('bracket-section').appendChild(nextRoundButtonElement); // Añade el botón a la sección del bracket.
        
        // Añade el listener para avanzar a la siguiente ronda.
        nextRoundButtonElement.addEventListener('click', () => {
            generateNextKnockoutRound();
        });
    } else if (!showNextRoundButton && nextRoundButtonElement) {
        // Si no debemos mostrar el botón pero existe, lo removemos.
        nextRoundButtonElement.remove();
    }

    // Renderiza cada partido de la ronda actual.
    knockoutState.matches.forEach(match => {
        const matchDiv = document.createElement('div');
        // Obtiene nombres de jugadores, usando '(Pending)' si el jugador no está definido.
        const p1Name = (match.p1 && match.p1 !== 'placeholder' && typeof match.p1 === 'object') ? match.p1.nombre : '(Pending)';
        const p2Name = (match.p2 && match.p2 !== 'placeholder' && typeof match.p2 === 'object') ? match.p2.nombre : '(Pending)';

        let contentHTML = '';

        if (match.completed) { // Si el partido ya se jugó (tiene resultado).
            const winnerName = match.resultado || '(Draw/Unresolved)'; // Muestra el ganador o un placeholder.
            contentHTML = `
                <span>${p1Name} vs ${p2Name}</span>
                <div>
                    <strong>Winner: ${winnerName}</strong>
                </div>
            `;
        } else { // Si el partido está pendiente.
            // Crea las opciones para el select, solo para jugadores válidos (no placeholders).
            const option1 = p1Name !== '(Pending)' ? `<option value="${p1Name}">${p1Name}</option>` : '';
            const option2 = p2Name !== '(Pending)' ? `<option value="${p2Name}">${p2Name}</option>` : '';

            // Estructura HTML con el select para elegir ganador y el botón "Registrar".
            contentHTML = `
                <span>${p1Name} vs ${p2Name}</span>
                <div>
                    <select class="select-winner" data-match-id="${match.id}">
                        <option value="">-- Select Winner --</option>
                        ${option1}
                        ${option2}
                    </select>
                    <button class="btn-register-winner" data-match-id="${match.id}" disabled>Register</button>
                </div>
            `;
        }
        
        matchDiv.innerHTML = contentHTML; // Inserta el HTML generado en el div del partido.
        matchesContainer.appendChild(matchDiv); // Añade el div del partido al contenedor principal de KO matches.
    });
    
    // Muestra la sección de controles (con la lista de partidos pendientes) si hay partidos por jugar o si la ronda acaba de completarse
    // y se espera la acción del usuario para la siguiente ronda.
    const showControls = (knockoutState.matches.length > 0 && !finalChampion);
    document.getElementById('bracket-controls-section').classList.toggle('hidden', !showControls);

}

// Registra la victoria de un participante en un partido de eliminatoria.
function registrarVictoriaKnockout(matchId, ganadorNombre) {
    // Busca el partido en el estado actual.
    const match = knockoutState.matches.find(m => m.id === matchId);
    if (!match || match.completed) return; // Si no se encuentra o ya está completado, salimos.

    // Busca el objeto Participante del ganador. Es importante tener el objeto para la propagación.
    const winner = participantes.find(p => p.nombre === ganadorNombre); // Busca entre todos los participantes (no solo los clasificados) por si acaso.

    // Actualiza el estado del partido.
    match.resultado = ganadorNombre; // Guarda el nombre del ganador.
    match.completed = true;          // Marca el partido como completado.

    // Si el ganador es un participante válido (no un placeholder), lo añade a la lista de ganadores de la ronda.
    if(winner && winner !== PLACEHOLDER_PARTICIPANT) {
        winnersFromPreviousRound.push(winner);
    } else if (ganadorNombre === "(Pending)") { // Si se marca un placeholder como ganador (ej. 'bye' automatico)
         winnersFromPreviousRound.push(PLACEHOLDER_PARTICIPANT); // Propaga el placeholder
    }
    
    // `actualizarUI()` se llama al final de `handlePendingKnockoutMatchRegistration` si se registra con éxito.
    // Eso se encargará de redibujar los partidos y de evaluar si se debe mostrar el botón "Start Next Round".
}

// Genera los partidos de la siguiente ronda de eliminatorias basándose en los ganadores de la ronda anterior.
function generateNextKnockoutRound() {
    // Validaciones: la ronda anterior debe estar completa y debe haber ganadores.
    if (!knockoutState.roundCompleted || winnersFromPreviousRound.length === 0) {
        console.log("No se puede generar la siguiente ronda: ronda anterior no completada o no hay ganadores.");
        return;
    }

    // --- Comprobación de Fin de Torneo ---
    // Si solo queda 1 ganador, ¡hemos terminado!
    if (winnersFromPreviousRound.length === 1) {
        finalChampion = winnersFromPreviousRound[0]; // El único ganador es el campeón.
        knockoutState.matches = []; // No hay más partidos.
        knockoutState.currentRound = 'Finished'; // Marca el torneo como finalizado.
        knockoutState.roundCompleted = true; // Indica que la última ronda (implícita) está completada.
        actualizarUI(); // Muestra el campeón final.
        return;
    }
    
    // Manejo de casos inesperados (menos de 2 ganadores pero no 1)
    if (winnersFromPreviousRound.length < 2) {
         console.error("Error: Menos de 2 ganadores generados para la siguiente ronda.");
         // Si hay un solo ganador válido, podríamos considerarlo campeón aquí también.
         if (winnersFromPreviousRound.length === 1) finalChampion = winnersFromPreviousRound[0];
         knockoutState.matches = [];
         knockoutState.currentRound = 'Finished';
         knockoutState.roundCompleted = true;
         actualizarUI();
         return;
    }

    // --- Preparación para la Nueva Ronda ---
    knockoutState.currentRound++; // Avanza al número de la siguiente ronda.
    knockoutState.roundCompleted = false; // La nueva ronda no está completada aún.
    const nextRoundMatches = []; // Lista para los partidos de la nueva ronda.
    
    // Genera los partidos emparejando los ganadores de la ronda anterior.
    // El emparejamiento es: ganador[0] vs ganador[1], ganador[2] vs ganador[3], etc.
    for(let i = 0; i < winnersFromPreviousRound.length / 2; i++) {
        nextRoundMatches.push({
            id: `k_r${knockoutState.currentRound}_p${i}`, // Nuevo ID para el partido.
            p1: winnersFromPreviousRound[i*2],       // Primer jugador (puede ser objeto Participante o placeholder).
            p2: winnersFromPreviousRound[i*2 + 1],     // Segundo jugador.
            resultado: null,                        // Resultado aún no definido.
            completed: false                        // Partido no completado.
        });
    }
    
    knockoutState.matches = nextRoundMatches; // Guarda los partidos de la nueva ronda.
    winnersFromPreviousRound = []; // Limpia la lista de ganadores para la próxima ronda.

    actualizarUI(); // Actualiza la interfaz para mostrar la nueva ronda.
}

// Maneja la acción de registrar un ganador desde los controles de partidos pendientes del bracket.
function handlePendingKnockoutMatchRegistration() {
    // Obtiene el elemento <select> y el botón "Register" del partido.
    const selectElement = event.target.closest('div').querySelector('.select-winner');
    const btnRegister = event.target.closest('button.btn-register-winner');

    // Verifica que los elementos existan y que el botón no esté deshabilitado.
    if (!selectElement || !btnRegister || btnRegister.disabled) return;

    const matchId = btnRegister.dataset.matchId; // Obtiene el ID del partido del botón.
    const winnerNombre = selectElement.value; // Obtiene el nombre del ganador seleccionado en el <select>.

    if (winnerNombre) { // Si se ha seleccionado un ganador.
        registrarVictoriaKnockout(matchId, winnerNombre); // Llama a la función para registrar la victoria.
    } else {
        alert("Por favor, selecciona un ganador antes de registrar."); // Alerta si no se seleccionó ganador.
    }
}

// Función auxiliar para verificar y mostrar el botón "Start Next Round".
function checkAndDisplayNextRoundButton() {
    // Busca el botón en el DOM.
    let nextRoundButtonElement = document.getElementById('btnNextKnockoutRound');
    
    // Determina si debemos mostrar el botón:
    // - La ronda actual debe estar completada.
    // - Debe haber al menos 2 ganadores listos para la siguiente ronda (o 1 si es el campeón).
    // - El torneo no debe haber terminado ya.
    const showNextRoundButton = knockoutState.roundCompleted &&
                                winnersFromPreviousRound.length > 0 &&
                                !finalChampion;

    if (showNextRoundButton && !nextRoundButtonElement) {
        // Si debemos mostrarlo y no existe, crearlo.
        nextRoundButtonElement = document.createElement('button');
        nextRoundButtonElement.id = 'btnNextKnockoutRound';
        nextRoundButtonElement.textContent = `▶ Iniciar Ronda ${knockoutState.currentRound + 1}`;
        nextRoundButtonElement.className = 'Accent.TButton'; // Estilo similar a otros botones principales.
        nextRoundButtonElement.style.marginTop = '20px';
        document.getElementById('bracket-section').appendChild(nextRoundButtonElement); // Añadir a la sección del bracket.
        
        // Añadir listener para avanzar a la siguiente ronda.
        nextRoundButtonElement.addEventListener('click', generateNextKnockoutRound);
    } else if (!showNextRoundButton && nextRoundButtonElement) {
        // Si no debemos mostrarlo y ya existe, removerlo.
        nextRoundButtonElement.remove();
    }
}


// --- CONFIGURACIÓN DE LISTENERS DE EVENTOS ---
function setupEventListeners() {
    // Listeners para la Fase de Inscripción.
    btnAgregar.addEventListener('click', agregarParticipante);
    // Permite añadir participante al presionar 'Enter' en el campo de nombre.
    inputNombre.addEventListener('keypress', function(event) { if (event.key === 'Enter') agregarParticipante(); });

    // Listener para el botón "Nuevo Torneo" (reinicia todo).
    btnNuevoTorneo.addEventListener('click', inicializarEstado);

    // Listeners para la Fase de Grupos (Round Robin).
    btnIniciarRR.addEventListener('click', iniciarRoundRobin);
    // Delegación de eventos para los botones de registro de victorias del RR.
    partidosRRDiv.addEventListener('click', function(event) {
        const target = event.target;
        // Si el click fue en un botón 'btn-ganador' y no está deshabilitado.
        if (target.classList.contains('btn-ganador') && !target.disabled) {
            const matchId = target.dataset.matchId; // Obtiene el ID del partido desde el data attribute.
            const ganadorNombre = target.dataset.ganador; // Obtiene el nombre del ganador.
            registrarVictoriaRR(matchId, ganadorNombre); // Registra la victoria.
        }
    });
    
    // Listeners específicos para la Fase de Knockout.
    btnIniciarBracket.addEventListener('click', iniciarBracket);

    // Delegación de eventos para los controles de partidos pendientes del Bracket (KO).
    // El contenedor `knockoutMatchesList` contendrá los partidos de KO.
    // Verificamos que el contenedor exista antes de añadir el listener.
    const koMatchesContainer = document.getElementById('knockoutMatchesList');
    if (koMatchesContainer) {
        // Listener para clics en los botones "Register" de cada partido pendiente.
        koMatchesContainer.addEventListener('click', function(event) {
            if (event.target.classList.contains('btn-register-winner')) {
                handlePendingKnockoutMatchRegistration(); // Maneja el registro.
            }
        });
        // Listener para cambios en los selects (para habilitar/deshabilitar el botón "Register").
        koMatchesContainer.addEventListener('change', function(event) {
            if (event.target.classList.contains('select-winner')) {
                const select = event.target;
                // Encuentra el botón "Register" asociado a este select (el siguiente elemento sibling).
                const button = select.nextElementSibling;
                if(button && button.classList.contains('btn-register-winner')){
                    // Habilita el botón si se ha seleccionado un valor válido (no el placeholder "--").
                    button.disabled = (select.value === "");
                }
            }
        });
    }
}

// Inicializa el estado de la aplicación a su configuración por defecto.
function inicializarEstado() {
    participantes = []; // Vacía la lista de participantes.
    faseActual = "inscripcion"; // Restaura a la fase de inscripción.
    partidosRoundRobin = []; // Reinicia partidos de RR.
    idPartidosJugadosRR.clear(); // Limpia IDs de partidos jugados de RR.
    
    // Reinicia el estado de la fase de Knockout.
    knockoutState = { currentRound: 1, matches: [], roundCompleted: false };
    winnersFromPreviousRound = []; // Vacía lista de ganadores.
    finalChampion = null;           // Reinicia campeón final.
    
    // Limpia las áreas de visualización específicas del bracket.
    const koMatchesContainer = document.getElementById('knockoutMatchesList');
    if (koMatchesContainer) koMatchesContainer.innerHTML = ''; // Limpia el contenedor de partidos KO.
    document.getElementById('bracket-section').classList.add('hidden'); // Oculta la sección principal del bracket.
    document.getElementById('bracket-controls-section').classList.add('hidden'); // Oculta los controles de KO.
    document.getElementById('campeonDisplay').textContent = ''; // Limpia el display del campeón.

    // Remueve el botón "Start Next Round" si existe.
    const nextRoundBtn = document.getElementById('btnNextKnockoutRound');
    if(nextRoundBtn) nextRoundBtn.remove();
    
    // Restablece elementos de la Fase de Grupos para claridad.
    document.getElementById('partidosRoundRobin').innerHTML = '';
    document.getElementById('tablaPosiciones tbody').innerHTML = '<tr><td colspan="5">Generando tabla...</td></tr>';

    // Restablece la interfaz de inscripción.
    listaParticipantesUL.innerHTML = '<li>No hay participantes inscritos todavía.</li>';
    inputNombre.value = '';
    btnIniciarRR.disabled = true; // Asegura que esté deshabilitado al inicio.
    
    // Asegura que la lista de participantes muestre el mensaje de "sin inscritos" si la lista está vacía.
    if(participantes.length === 0) actualizarListaParticipantes();

    // Si el contenedor de partidos KO no existía antes, lo creamos ahora dentro de la sección bracket.
    if (!document.getElementById('knockoutMatchesList')) {
        const newContainer = document.createElement('div');
        newContainer.id = 'knockoutMatchesList';
        const bracketSection = document.getElementById('bracket-section');
        if(bracketSection) bracketSection.prepend(newContainer); // Añade al principio de la sección bracket.
    }

    actualizarUI(); // Asegura que la UI refleje correctamente el estado de inscripción.
}


// --- EJECUCIÓN PRINCIPAL ---
// El evento DOMContentLoaded se dispara cuando el HTML ha sido completamente cargado y parseado.
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners(); // Configura todos los listeners de eventos al cargar la página.
    inicializarEstado(); // Carga el estado inicial de la aplicación.
});
