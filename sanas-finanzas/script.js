const firebaseConfig = {
  apiKey: "AIzaSyAvReIBNYy-RQ67hyTEPwTX-4lnvhlo8T0",
  authDomain: "sanas-finanzas-450a6.firebaseapp.com",
  projectId: "sanas-finanzas-450a6",
  storageBucket: "sanas-finanzas-450a6.appspot.com",
  messagingSenderId: "585032859960",
  appId: "1:585032859960:web:1d7594cf4c3d58214e01cd",
  measurementId: "G-BWNH2QJTTB"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Obtener referencias a elementos del DOM
const loginContainer = document.getElementById("login-container");
const appContainer = document.getElementById("app-container");
const notificationElem = document.getElementById("notification"); // Único elemento para notificaciones
const tipoToggleBtn = document.getElementById("tipoToggleBtn");
const descripcionInput = document.getElementById("descripcion");
const montoInput = document.getElementById("monto");
const categoriaSelect = document.getElementById("categoria");
const lista = document.getElementById("lista");
const balanceElem = document.getElementById("balance");
const balanceDetElem = document.getElementById("balance-det");
const totalIngresosElem = document.getElementById("total-ingresos");
const totalGastosElem = document.getElementById("total-gastos");

let tipo = "ingreso"; // Variable para rastrear el tipo de transacción (ingreso/gasto)

// Escuchar cambios en el estado de autenticación del usuario
auth.onAuthStateChanged(user => {
  if (user) {
    // Si el usuario está logueado
    loginContainer.classList.add("oculto");
    appContainer.classList.remove("oculto");
    cargarDatos(); // Cargar los datos de transacciones
    mostrarNotificacion("", "ocultar"); // Ocultar cualquier notificación de error de login/previas
  } else {
    // Si el usuario no está logueado
    loginContainer.classList.remove("oculto");
    appContainer.classList.add("oculto");
    limpiarCampos(); // Limpiar campos del formulario
    mostrarNotificacion("", "ocultar"); // Ocultar cualquier notificación
  }
});

/**
 * Muestra una notificación al usuario.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - El tipo de notificación ('exito', 'error', 'ocultar').
 */
function mostrarNotificacion(message, type = "error") {
  if (!notificationElem) { // Verifica si el elemento de notificación existe
    console.error("Elemento de notificación no encontrado.");
    return;
  }
  notificationElem.textContent = message;
  notificationElem.className = "notification"; // Resetear clases
  if (type === "exito") {
    notificationElem.classList.add("exito");
    notificationElem.classList.remove("ocultar");
  } else if (type === "error") {
    notificationElem.classList.add("error");
    notificationElem.classList.remove("ocultar");
  } else if (type === "ocultar") {
    notificationElem.classList.add("ocultar");
  }

  // Ocultar la notificación automáticamente después de 3 segundos si no es para ocultar
  if (type !== "ocultar" && message !== "") {
    setTimeout(() => {
      notificationElem.classList.add("ocultar");
    }, 3000);
  }
}

// Función para iniciar sesión
function login() {
  mostrarNotificacion("", "ocultar"); // Limpiar notificaciones anteriores
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    mostrarNotificacion("Ingresa correo y contraseña.");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => mostrarNotificacion("Inicio de sesión exitoso.", "exito"))
    .catch(e => mostrarNotificacion("Error al iniciar sesión: " + e.message));
}

// Función para registrar un nuevo usuario
function register() {
  mostrarNotificacion("", "ocultar"); // Limpiar notificaciones anteriores
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    mostrarNotificacion("Ingresa correo y contraseña.");
    return;
  }
  if (password.length < 6) {
    mostrarNotificacion("La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => mostrarNotificacion("Registro exitoso. ¡Bienvenido!", "exito"))
    .catch(e => mostrarNotificacion("Error al registrar: " + e.message));
}

// Función para cerrar sesión
function logout() {
  auth.signOut()
    .then(() => mostrarNotificacion("Sesión cerrada.", "exito"))
    .catch(e => mostrarNotificacion("Error al cerrar sesión: " + e.message));
}

// Función para cambiar entre tipo "ingreso" y "gasto"
function toggleTipo() {
  if (tipo === "ingreso") {
    tipo = "gasto";
    tipoToggleBtn.textContent = "Gasto";
    tipoToggleBtn.classList.remove("tipo-ingreso");
    tipoToggleBtn.classList.add("tipo-gasto");
    montoInput.style.borderColor = "#e74c3c"; // Color del nuevo diseño para gasto
    montoInput.style.boxShadow = "0 0 6px #e74c3caa";
  } else {
    tipo = "ingreso";
    tipoToggleBtn.textContent = "Ingreso";
    tipoToggleBtn.classList.remove("tipo-gasto");
    tipoToggleBtn.classList.add("tipo-ingreso");
    montoInput.style.borderColor = "#2ecc71"; // Color del nuevo diseño para ingreso
    montoInput.style.boxShadow = "0 0 6px #2ecc71aa";
  }
}

// Función para agregar una nueva transacción
function agregarTransaccion() {
  mostrarNotificacion("", "ocultar"); // Limpiar notificaciones anteriores
  const descripcion = descripcionInput.value.trim();
  const monto = parseFloat(montoInput.value);
  const categoria = categoriaSelect.value;

  // Validaciones
  if (!descripcion) {
    mostrarNotificacion("Agrega una descripción para la transacción.");
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    mostrarNotificacion("Ingresa un monto válido y mayor a cero.");
    return;
  }
  if (!categoria) {
    mostrarNotificacion("Selecciona una categoría.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    mostrarNotificacion("No estás autenticado. Por favor, inicia sesión.");
    return;
  }

  const transaccion = {
    descripcion,
    monto,
    tipo,
    categoria,
    fecha: new Date().toISOString() // Guardar fecha en formato ISO
  };

  db.collection("usuarios").doc(user.uid).collection("movimientos").add(transaccion)
    .then(() => {
      mostrarNotificacion("Transacción agregada con éxito.", "exito");
      limpiarCampos();
      cargarDatos();
    })
    .catch(e => mostrarNotificacion("Error al guardar la transacción: " + e.message));
}

// Función para cargar y mostrar los datos de transacciones del usuario
function cargarDatos() {
  const user = auth.currentUser;
  if (!user) return; // No hacer nada si no hay usuario logueado

  // Escucha en tiempo real los cambios en la colección de movimientos
  db.collection("usuarios").doc(user.uid).collection("movimientos").orderBy("fecha", "desc").onSnapshot(snapshot => {
    lista.innerHTML = ""; // Limpiar la lista antes de volver a cargar
    let ingresos = 0;
    let gastos = 0;

    snapshot.forEach(doc => {
      const t = doc.data(); // Obtener los datos de la transacción
      const li = document.createElement("li");
      li.className = "movimiento-item";

      const texto = `${t.descripcion} - $${t.monto.toFixed(2)} (${t.categoria})`;
      const spanTexto = document.createElement("span");
      spanTexto.className = "movimiento-text";
      spanTexto.textContent = texto;

      const btnEliminar = document.createElement("button");
      btnEliminar.className = "eliminar-btn";
      btnEliminar.textContent = "×";
      btnEliminar.title = "Eliminar movimiento";
      btnEliminar.onclick = () => {
        if (confirm("¿Estás seguro de que quieres eliminar este movimiento?")) {
          db.collection("usuarios").doc(user.uid).collection("movimientos").doc(doc.id).delete()
            .then(() => mostrarNotificacion("Movimiento eliminado.", "exito"))
            .catch(e => mostrarNotificacion("Error al eliminar: " + e.message));
        }
      };

      li.appendChild(spanTexto);
      li.appendChild(btnEliminar);
      lista.appendChild(li);

      // Calcular ingresos y gastos totales
      if (t.tipo === "ingreso") ingresos += t.monto;
      else gastos += t.monto;
    });

    // Actualizar el balance y los totales en la interfaz
    const balance = ingresos - gastos;
    balanceElem.textContent = `$${balance.toFixed(2)}`;
    balanceDetElem.textContent = `$${balance.toFixed(2)}`;
    totalIngresosElem.textContent = `$${ingresos.toFixed(2)}`;
    totalGastosElem.textContent = `$${gastos.toFixed(2)}`;
  });
}

// Función para limpiar los campos del formulario
function limpiarCampos() {
  descripcionInput.value = "";
  montoInput.value = "";
  categoriaSelect.value = "General"; // Restablecer categoría por defecto
  mostrarNotificacion("", "ocultar"); // Ocultar notificaciones de transacción
  // Restablecer estilos de borde y sombra del monto
  montoInput.style.borderColor = "";
  montoInput.style.boxShadow = "";
  // Restablecer el tipo a "ingreso"
  tipo = "ingreso";
  tipoToggleBtn.textContent = "Ingreso";
  tipoToggleBtn.classList.remove("tipo-gasto");
  tipoToggleBtn.classList.add("tipo-ingreso");
}
