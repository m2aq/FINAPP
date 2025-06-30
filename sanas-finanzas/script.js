const firebaseConfig = {
  apiKey: "AIzaSyAvReIBNYy-RQ67hyTEPwTX-4lnvhlo8T0",
  authDomain: "sanas-finanzas-450a6.firebaseapp.com",
  projectId: "sanas-finanzas-450a6",
  storageBucket: "sanas-finanzas-450a6.appspot.com",
  messagingSenderId: "585032859960",
  appId: "1:585032859960:web:1d7594cf4c3d58214e01cd",
  measurementId: "G-BWNH2QJTTB"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Referencias a Elementos del DOM ---
const loginContainer = document.getElementById("login-container");
const appContainer = document.getElementById("app-container");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorLogin = document.getElementById("error-login");
const descripcionInput = document.getElementById("descripcion");
const montoInput = document.getElementById("monto");
const categoriaSelect = document.getElementById("categoria");
const tipoToggleBtn = document.getElementById("tipoToggleBtn");
const errorTransaccion = document.getElementById("error-transaccion");
const lista = document.getElementById("lista");
const listaVaciaMsg = document.getElementById("lista-vacia-msg");
const balanceElem = document.getElementById("balance");
const balanceDetElem = document.getElementById("balance-det");
const totalIngresosElem = document.getElementById("total-ingresos");
const totalGastosElem = document.getElementById("total-gastos");

let tipo = "ingreso"; // Estado actual: "ingreso" o "gasto"
let unsubscribeFirestore = null; // Para gestionar el listener de Firestore

// ---- Inicialización y Estado del Usuario ----
auth.onAuthStateChanged(user => {
  if (user) {
    // Usuario está autenticado: Mostrar la aplicación principal
    loginContainer.classList.add("oculto");
    appContainer.classList.remove("oculto");
    limpiarCamposTransaccion(); // Limpiar el formulario por si se re-abre la app

    // Si ya existía un listener (raro pero posible), asegurarse de limpiarlo antes de crear uno nuevo
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
    // Cargar datos e iniciar el listener en tiempo real
    unsubscribeFirestore = cargarDatos();

    errorLogin.textContent = ""; // Limpiar cualquier mensaje de error previo
  } else {
    // Usuario no autenticado: Mostrar la pantalla de login
    loginContainer.classList.remove("oculto");
    appContainer.classList.add("oculto");
    limpiarCamposTransaccion(); // Limpiar el formulario al cerrar sesión

    // Resetear los valores de la app si se cierra sesión
    lista.innerHTML = "";
    listaVaciaMsg.classList.add("oculto");
    balanceElem.textContent = "$0";
    balanceDetElem.textContent = "$0";
    totalIngresosElem.textContent = "$0";
    totalGastosElem.textContent = "$0";

    // Detener el listener de Firestore si existe, para evitar fugas de memoria
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
    errorLogin.textContent = ""; // Limpiar errores
  }
});

// ---- Funciones de Autenticación ----
function login() {
  errorLogin.textContent = ""; // Limpiar mensaje de error anterior
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    errorLogin.textContent = "Por favor, ingresa correo electrónico y contraseña.";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .catch(e => {
      // Mostrar el mensaje de error específico de Firebase
      errorLogin.textContent = e.message;
    });
}

function register() {
  errorLogin.textContent = ""; // Limpiar mensaje de error anterior
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    errorLogin.textContent = "Por favor, ingresa correo electrónico y contraseña.";
    return;
  }
  // Validación simple de longitud de contraseña
  if (password.length < 6) {
      errorLogin.textContent = "La contraseña debe tener al menos 6 caracteres.";
      return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .catch(e => {
      // Mostrar el mensaje de error específico de Firebase
      errorLogin.textContent = e.message;
    });
}

function logout() {
  auth.signOut(); // Cierra la sesión del usuario
}

// ---- Manejo de la Interfaz de Transacción ----
function toggleTipo() {
  if (tipo === "ingreso") {
    // Cambiar a Gasto
    tipo = "gasto";
    tipoToggleBtn.textContent = "Gasto";
    tipoToggleBtn.classList.remove("tipo-ingreso");
    tipoToggleBtn.classList.add("tipo-gasto");
    // Actualizar clases CSS en el input de monto para cambio visual
    montoInput.classList.add("color-gasto");
    montoInput.classList.remove("color-ingreso");
  } else {
    // Cambiar a Ingreso
    tipo = "ingreso";
    tipoToggleBtn.textContent = "Ingreso";
    tipoToggleBtn.classList.remove("tipo-gasto");
    tipoToggleBtn.classList.add("tipo-ingreso");
    // Restaurar clases CSS en el input de monto
    montoInput.classList.add("color-ingreso");
    montoInput.classList.remove("color-gasto");
  }
}

function agregarTransaccion() {
  errorTransaccion.textContent = ""; // Limpiar error previo
  const descripcion = descripcionInput.value.trim();
  const monto = Number(montoInput.value); // Convertir a número
  const categoria = categoriaSelect.value;
  const user = auth.currentUser;

  // --- Validación de Campos ---
  if (!user) {
    errorTransaccion.textContent = "Error: Debes iniciar sesión para agregar movimientos.";
    return;
  }
  if (!descripcion) {
    errorTransaccion.textContent = "La descripción no puede estar vacía.";
    descripcionInput.focus(); // Poner foco en el campo
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    errorTransaccion.textContent = "El monto debe ser un número positivo.";
    montoInput.focus(); // Poner foco en el campo
    return;
  }
  if (!categoria) { // Aunque tengamos default, buena práctica validar
      errorTransaccion.textContent = "Por favor, selecciona una categoría.";
      return;
  }

  // --- Creación del Objeto Transacción ---
  const transaccion = {
    descripcion,
    monto,
    tipo,
    categoria,
    fecha: new Date().toISOString() // Fecha actual en formato ISO String (UTC)
  };

  // --- Guardar en Firestore ---
  db.collection("usuarios").doc(user.uid).collection("movimientos").add(transaccion)
    .then(() => {
      limpiarCamposTransaccion(); // Limpiar el formulario si la adición fue exitosa
      console.log("Transacción agregada correctamente.");
      // El listener de Firestore se actualiza automáticamente, no es necesario llamar a cargarDatos() aquí.
    })
    .catch(e => {
      errorTransaccion.textContent = `Error al guardar: ${e.message}`;
      console.error("Error al agregar transacción:", e);
    });
}

// Limpia los campos del formulario de transacción y resetea el estado visual
function limpiarCamposTransaccion() {
  descripcionInput.value = "";
  montoInput.value = "";
  categoriaSelect.value = "General"; // Volver a la opción por defecto
  errorTransaccion.textContent = ""; // Limpiar mensajes de error

  // Resetear el botón y el estado del tipo
  if (tipo !== "ingreso") {
    toggleTipo(); // Si estaba en 'gasto', esto lo revertirá a 'ingreso' y aplicará estilos correctos
  } else {
    // Si ya estaba en 'ingreso', solo asegurar que los estilos visuales del monto sean correctos
    montoInput.classList.add("color-ingreso");
    montoInput.classList.remove("color-gasto");
  }
}


// ---- Cargar y Mostrar Transacciones (con listener en tiempo real) ----
function cargarDatos() {
  const user = auth.currentUser;
  if (!user) {
      console.warn("cargarDatos llamado sin usuario logueado.");
      return null; // Si no hay usuario, no hay listener.
  }

  // Referencia a la colección de movimientos del usuario
  const movementsCollectionRef = db.collection("usuarios").doc(user.uid).collection("movimientos");

  // Query para obtener transacciones ordenadas por fecha (las más recientes primero)
  const q = movementsCollectionRef.orderBy("fecha", "desc");

  // Establecer el listener que se actualizará automáticamente con cambios en la BD
  const unsubscribe = q.onSnapshot(snapshot => {
    lista.innerHTML = ""; // Vaciar la lista antes de redibujar
    let ingresos = 0;
    let gastos = 0;

    if (snapshot.empty) {
      // Si no hay transacciones, mostrar el mensaje indicativo
      listaVaciaMsg.classList.remove("oculto");
    } else {
      // Si hay transacciones, ocultar el mensaje "lista vacía"
      listaVaciaMsg.classList.add("oculto");

      // Procesar cada transacción en el snapshot
      snapshot.forEach(doc => {
        const t = doc.data(); // Obtener los datos de la transacción

        // --- Creación del Elemento LI para la lista ---
        const li = document.createElement("li");
        li.className = `movimiento-item movimiento-item-${t.tipo}`; // Clase base y clase por tipo (ingreso/gasto)
        li.setAttribute('data-id', doc.id); // Guardar el ID del documento, útil para swipe/delete

        // Formatear la fecha para mostrarla
        const fechaFormateada = new Date(t.fecha).toLocaleDateString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).replace(/\//g, '-'); // Formato DD-MM-YYYY

        // Determinar el símbolo (+/-) y el color para el monto
        const symbol = t.tipo === "ingreso" ? "+" : "-";
        const signColor = t.tipo === "ingreso" ? "#28a745" : "#dc3545";

        // Estructura HTML para el contenido del item de la lista
        li.innerHTML = `
          <div class="movimiento-content">
            <span class="fecha-movimiento">${fechaFormateada}</span>
            <span style="color:${signColor}; font-weight:bold;">${symbol}</span>
            <span class="monto-movimiento">$${t.monto.toFixed(2)}</span>
            (<span class="categoria-movimiento">${t.categoria}</span>)
          </div>
          <button class="eliminar-btn" title="Eliminar movimiento" data-id="${doc.id}">×</button>
        `;
        
        // --- Listener para el botón de eliminar ---
        const deleteButton = li.querySelector('.eliminar-btn');
        deleteButton.onclick = () => {
          // Pedir confirmación al usuario antes de borrar
          if (confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
            movementsCollectionRef.doc(doc.id).delete() // Llamada a Firestore para eliminar
              .then(() => {
                console.log(`Movimiento ${doc.id} eliminado correctamente.`);
                // La actualización se maneja automáticamente por onSnapshot
              })
              .catch(err => {
                console.error("Error al eliminar movimiento:", err);
                alert("Hubo un error al intentar eliminar el movimiento. Revisa la consola."); // Notificar al usuario
              });
          }
        };

        lista.appendChild(li); // Añadir el elemento LI creado a la lista UL

        // Acumular los totales para el resumen
        if (t.tipo === "ingreso") {
          ingresos += t.monto;
        } else {
          gastos += t.monto;
        }
      }); // Fin del forEach (iteración sobre snapshot.docs)

      // --- Actualizar los elementos del DOM con los totales calculados ---
      const balance = ingresos - gastos;
      balanceElem.textContent = `$${balance.toFixed(2)}`; // Balance principal
      balanceDetElem.textContent = `$${balance.toFixed(2)}`; // Balance en el resumen
      totalIngresosElem.textContent = `$${ingresos.toFixed(2)}`;
      totalGastosElem.textContent = `$${gastos.toFixed(2)}`;

    } // Fin del else (snapshot.empty)

  }, error => { // Manejo de errores para el listener de Firestore
    console.error("Error al obtener datos de Firestore:", error);
    errorTransaccion.textContent = "Error al cargar los movimientos."; // Mostrar un mensaje de error general al usuario
  });

  return unsubscribe; // Devolver la función para que podamos desuscribir el listener si es necesario (ej. al cerrar sesión)
}

// Nota: La funcionalidad de "swipe to delete" completa (deslizar para revelar el botón)
// requiere lógica adicional de manejo de eventos táctiles en el script.js.
// La estructura actual (con el botón de borrar siempre visible) está implementada.
// Si deseas la lógica de swipe, se requerirían más pasos en script.js y estilos.css.
