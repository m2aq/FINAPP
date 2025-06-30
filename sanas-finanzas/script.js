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

// Elementos del DOM
const loginContainer = document.getElementById("login-container");
const appContainer = document.getElementById("app-container");
const errorLogin = document.getElementById("error-login");
const errorTransaccion = document.getElementById("error-transaccion");
const tipoToggleBtn = document.getElementById("tipoToggleBtn");
const descripcionInput = document.getElementById("descripcion");
const montoInput = document.getElementById("monto");
const categoriaSelect = document.getElementById("categoria");
const lista = document.getElementById("lista");
const balanceElem = document.getElementById("balance");
const balanceDetElem = document.getElementById("balance-det");
const totalIngresosElem = document.getElementById("total-ingresos");
const totalGastosElem = document.getElementById("total-gastos");
const listaVaciaMsg = document.getElementById("lista-vacia-msg");
const btnAgregar = document.querySelector('.btn-agregar-transaccion'); // Referencia al botón de agregar

let tipo = "ingreso"; // Estado actual: "ingreso" o "gasto"
let unsubscribeFirestore = null; // Para guardar la función de unsubscribe del listener de Firestore

// ---- Manejo de Estado de Usuario ----
auth.onAuthStateChanged(user => {
  if (user) {
    // Usuario está logueado
    loginContainer.classList.add("oculto");
    appContainer.classList.remove("oculto");
    limpiarCamposTransaccion(); // Limpiar campos al entrar a la app
    if (unsubscribeFirestore) { // Si hubiera un listener anterior, asegurarse de desuscribir
      unsubscribeFirestore();
    }
    unsubscribeFirestore = cargarDatos(); // Cargar datos e iniciar listener
    errorLogin.textContent = ""; // Limpiar errores si se redirige de nuevo a la app
  } else {
    // No hay usuario logueado
    loginContainer.classList.remove("oculto");
    appContainer.classList.add("oculto");
    limpiarCamposTransaccion(); // Limpiar campos si se cierra sesion

    // Resetear visualización si se desloguea
    lista.innerHTML = "";
    listaVaciaMsg.classList.add("oculto");
    balanceElem.textContent = "$0";
    balanceDetElem.textContent = "$0";
    totalIngresosElem.textContent = "$0";
    totalGastosElem.textContent = "$0";

    if (unsubscribeFirestore) { // Detener el listener si el usuario cierra sesión
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
    errorLogin.textContent = ""; // Limpiar errores
  }
});

// ---- Autenticación ----
function login() {
  errorLogin.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) {
    errorLogin.textContent = "Por favor, ingresa correo electrónico y contraseña.";
    return;
  }
  auth.signInWithEmailAndPassword(email, password)
    .catch(e => errorLogin.textContent = e.message); // Muestra el mensaje de error de Firebase
}

function register() {
  errorLogin.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) {
    errorLogin.textContent = "Por favor, ingresa correo electrónico y contraseña.";
    return;
  }
  if (password.length < 6) {
      errorLogin.textContent = "La contraseña debe tener al menos 6 caracteres.";
      return;
  }
  auth.createUserWithEmailAndPassword(email, password)
    .catch(e => errorLogin.textContent = e.message);
}

function logout() {
  auth.signOut();
}

// ---- Interfaz de Transacción ----
function toggleTipo() {
  if (tipo === "ingreso") {
    tipo = "gasto";
    tipoToggleBtn.textContent = "Gasto";
    tipoToggleBtn.classList.remove("tipo-ingreso");
    tipoToggleBtn.classList.add("tipo-gasto");
    // Aplicar estilos visuales al campo monto para reflejar que es un gasto
    montoInput.classList.add("color-gasto");
    montoInput.classList.remove("color-ingreso");
  } else {
    tipo = "ingreso";
    tipoToggleBtn.textContent = "Ingreso";
    tipoToggleBtn.classList.remove("tipo-gasto");
    tipoToggleBtn.classList.add("tipo-ingreso");
    // Restaurar estilos visuales al campo monto para ingreso
    montoInput.classList.add("color-ingreso");
    montoInput.classList.remove("color-gasto");
  }
}

function agregarTransaccion() {
  errorTransaccion.textContent = ""; // Limpiar error previo
  const descripcion = descripcionInput.value.trim();
  const monto = Number(montoInput.value); // Usar Number() para mejor manejo de decimales
  const categoria = categoriaSelect.value;
  const user = auth.currentUser;

  // --- Validación de Campos ---
  if (!user) {
    errorTransaccion.textContent = "Debes estar autenticado para agregar movimientos.";
    return;
  }
  if (!descripcion) {
    errorTransaccion.textContent = "La descripción no puede estar vacía.";
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    errorTransaccion.textContent = "El monto debe ser un número positivo.";
    return;
  }
  if (!categoria) { // Aunque por defecto hay una opción, mejor validar
      errorTransaccion.textContent = "Selecciona una categoría.";
      return;
  }

  // --- Creación de Objeto Transacción ---
  const transaccion = {
    descripcion,
    monto,
    tipo,
    categoria,
    fecha: new Date().toISOString() // Guardar fecha en formato ISO UTC
  };

  // --- Guardar en Firestore ---
  db.collection("usuarios").doc(user.uid).collection("movimientos").add(transaccion)
    .then(() => {
      limpiarCamposTransaccion(); // Limpiar el formulario tras éxito
      // El listener en cargarDatos() se actualizará automáticamente, no es necesario llamar a cargarDatos() aquí.
      console.log("Transacción agregada exitosamente!");
    })
    .catch(e => {
        errorTransaccion.textContent = `Error al guardar: ${e.message}`;
        console.error("Error al agregar transacción: ", e);
    });
}

function limpiarCamposTransaccion() {
  descripcionInput.value = "";
  montoInput.value = "";
  categoriaSelect.value = "General"; // Volver a la categoría por defecto
  errorTransaccion.textContent = ""; // Limpiar mensajes de error

  // Resetear el tipo y el botón
  if (tipo !== "ingreso") { // Si estaba en gasto, volver a ingreso
    toggleTipo(); // Reutiliza la lógica de toggleTipo para resetear
  } else {
    // Si ya estaba en ingreso, solo asegurarse de que los estilos visuales del monto estén correctos
    montoInput.classList.add("color-ingreso");
    montoInput.classList.remove("color-gasto");
  }
}


// ---- Cargar y Mostrar Transacciones ----
function cargarDatos() {
  const user = auth.currentUser;
  if (!user) {
      return null; // No hay usuario, no hay listener activo.
  }

  // Referencia a la colección de movimientos del usuario actual
  const movementsCollectionRef = db.collection("usuarios").doc(user.uid).collection("movimientos");

  // Crear la query para obtener movimientos ordenados por fecha descendente
  const q = movementsCollectionRef.orderBy("fecha", "desc");

  // Configurar el listener que se ejecutará cada vez que haya cambios en la colección
  const unsubscribe = q.onSnapshot(snapshot => {
    lista.innerHTML = ""; // Limpiar la lista antes de renderizar de nuevo
    let ingresos = 0;
    let gastos = 0;

    if (snapshot.empty) {
      // Si la colección está vacía, mostrar el mensaje "lista vacía"
      listaVaciaMsg.classList.remove("oculto");
    } else {
      // Si hay transacciones, ocultar el mensaje "lista vacía"
      listaVaciaMsg.classList.add("oculto");

      snapshot.forEach(doc => { // Iterar sobre cada documento (transacción)
        const t = doc.data(); // Datos de la transacción

        // --- Creación del Elemento LI ---
        const li = document.createElement("li");
        li.className = `movimiento-item movimiento-item-${t.tipo}`; // Clase base + tipo
        li.setAttribute('data-id', doc.id); // Guardar el ID para posible eliminación/edición futura

        // Formatear fecha
        const fechaFormateada = new Date(t.fecha).toLocaleDateString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).replace(/\//g, '-'); // Formato DD-MM-YYYY

        // Determinar el símbolo y color del monto según el tipo
        const symbol = t.tipo === "ingreso" ? "+" : "-";
        const signColor = t.tipo === "ingreso" ? "#28a745" : "#dc3545"; // Colores de ingreso/gasto

        // Estructura HTML para el contenido de la transacción
        li.innerHTML = `
          <div class="movimiento-content" style="max-width: calc(100% - 70px);"> <!-- Limit width to leave space for delete btn -->
            <span class="fecha-movimiento">${fechaFormateada}</span>
            <span style="color:${signColor}; font-weight:bold;">${symbol}</span>
            <span class="monto-movimiento">$${t.monto.toFixed(2)}</span>
            (<span class="categoria-movimiento">${t.categoria}</span>)
          </div>
          <button class="eliminar-btn" title="Eliminar movimiento" data-id="${doc.id}">×</button>
        `;
        
        // Añadir listener para el botón de eliminar
        const deleteButton = li.querySelector('.eliminar-btn');
        deleteButton.onclick = () => {
          if (confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
            movementsCollectionRef.doc(doc.id).delete()
              .then(() => {
                console.log(`Movimiento ${doc.id} eliminado.`);
                // El onSnapshot se actualiza automáticamente
              })
              .catch(err => {
                console.error("Error al eliminar movimiento:", err);
                alert("Hubo un error al intentar eliminar el movimiento."); // Notificar al usuario
              });
          }
        };

        lista.appendChild(li); // Añadir el elemento LI completo a la lista UL

        // Acumular ingresos y gastos para los totales
        if (t.tipo === "ingreso") {
          ingresos += t.monto;
        } else {
          gastos += t.monto;
        }
      }); // Fin del forEach

      // --- Actualizar los elementos del DOM con los totales ---
      const balance = ingresos - gastos;
      balanceElem.textContent = `$${balance.toFixed(2)}`; // Balance principal
      balanceDetElem.textContent = `$${balance.toFixed(2)}`; // Balance detallado
      totalIngresosElem.textContent = `$${ingresos.toFixed(2)}`;
      totalGastosElem.textContent = `$${gastos.toFixed(2)}`;

    } // Fin del else (snapshot.empty)

  }, error => { // Manejo de errores para el listener de Firestore
    console.error("Error al obtener datos de Firestore:", error);
    errorTransaccion.textContent = "Error al cargar los movimientos.";
  });

  return unsubscribe; // Retorna la función para poder detener el listener más tarde
}

// --- Lógica para Swipe to Delete (Estructura Preparada) ---
// Esta es la lógica básica. Para una implementación completa,
// se necesitaría código adicional para el movimiento, transiciones,
// manejo de múltiples items swiped, etc.
// Las llamadas a los elementos 'eliminar-btn' y sus listeners ya están en cargarDatos().

// Se pueden añadir aquí las funciones para manejar touch events si se desea implementar la interactividad completa.
// Por ahora, solo los botones 'eliminar-btn' son visibles directamente.
