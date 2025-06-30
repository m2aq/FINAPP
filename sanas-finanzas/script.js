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

// Referencia al mensaje de lista vacía
const listaVaciaMsg = document.getElementById("lista-vacia-msg");

let tipo = "ingreso";
let unsubscribeFirestore = null; // Variable para guardar la función de unsubscribe del listener de Firestore

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.classList.add("oculto");
    appContainer.classList.remove("oculto");
    // Llamar a cargarDatos para iniciar la suscripción a los cambios
    if (unsubscribeFirestore) { // Si hubiera un listener anterior, desuscribir
      unsubscribeFirestore();
    }
    unsubscribeFirestore = cargarDatos(); // Guardar la nueva función de unsubscribe
    errorLogin.textContent = ""; // Limpiar errores si hay un re-login
  } else {
    loginContainer.classList.remove("oculto");
    appContainer.classList.add("oculto");
    limpiarCampos(); // Limpiar campos de transacción si se cierra sesión
    errorLogin.textContent = ""; // Limpiar errores
    // Limpiar la lista al desloguearse también, en caso de que hubiera datos cargados
    lista.innerHTML = "";
    listaVaciaMsg.classList.add("oculto"); // Ocultar el mensaje de lista vacía
    balanceElem.textContent = "$0";
    balanceDetElem.textContent = "$0";
    totalIngresosElem.textContent = "$0";
    totalGastosElem.textContent = "$0";

    if (unsubscribeFirestore) { // Detener el listener si el usuario cierra sesión
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
  }
});

function login() {
  errorLogin.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) {
    errorLogin.textContent = "Ingresa correo y contraseña.";
    return;
  }
  auth.signInWithEmailAndPassword(email, password)
    .catch(e => errorLogin.textContent = e.message);
}

function register() {
  errorLogin.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) {
    errorLogin.textContent = "Ingresa correo y contraseña.";
    return;
  }
  // Añadir validación simple para contraseña (mínimo 6 caracteres)
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

function toggleTipo() {
  if (tipo === "ingreso") {
    tipo = "gasto";
    tipoToggleBtn.textContent = "Gasto";
    tipoToggleBtn.classList.remove("tipo-ingreso");
    tipoToggleBtn.classList.add("tipo-gasto");
    // Actualizar estilos del input de monto
    montoInput.style.borderColor = "#dc3545";
    montoInput.style.boxShadow = "0 0 6px #dc3545aa";
  } else {
    tipo = "ingreso";
    tipoToggleBtn.textContent = "Ingreso";
    tipoToggleBtn.classList.remove("tipo-gasto");
    tipoToggleBtn.classList.add("tipo-ingreso");
    // Resetear estilos del input de monto para volver al color de enfoque por defecto si el usuario retorna a ingreso
    // Esto hace que cuando se vuelve a 'Ingreso', el campo monto retome un estilo neutral (o verde si se configura)
    montoInput.style.borderColor = "#28a745"; // Se puede poner el color principal de la app
    montoInput.style.boxShadow = "0 0 6px #28a745aa";
  }
}

function agregarTransaccion() {
  errorTransaccion.textContent = "";
  const descripcion = descripcionInput.value.trim();
  // Usar Number() en lugar de parseFloat() para la conversión del monto
  const monto = Number(montoInput.value);
  const categoria = categoriaSelect.value;

  if (!descripcion) {
    errorTransaccion.textContent = "Agrega una descripción.";
    return;
  }
  // Validación para monto: no ser NaN, ser mayor que 0
  if (isNaN(monto) || monto <= 0) {
    errorTransaccion.textContent = "Monto inválido. Debe ser un número positivo.";
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    errorTransaccion.textContent = "No estás autenticado. Por favor, inicia sesión.";
    // Opcional: redirigir a login o mostrar mensaje más persistente
    return;
  }

  const transaccion = {
    descripcion,
    monto,
    tipo,
    categoria,
    fecha: new Date().toISOString() // Fecha actual en formato ISO
  };

  // Añadir la transacción a Firestore
  db.collection("usuarios").doc(user.uid).collection("movimientos").add(transaccion)
    .then(() => {
      limpiarCampos(); // Limpiar campos después de agregar
      // onSnapshot en cargarDatos() se actualiza automáticamente, no se necesita llamar a cargarDatos() aquí.
    })
    .catch(e => errorTransaccion.textContent = "Error al guardar: " + e.message);
}

// La función para cargar datos y manejar las actualizaciones en tiempo real.
// Retorna la función `unsubscribe` del listener de Firestore.
function cargarDatos() {
  const user = auth.currentUser;
  if (!user) {
      // Si no hay usuario logueado, no hacer nada
      return null; // Devolver null si no hay usuario para que unsubscribeFirestore sepa que no hay listener activo
  }

  const movementsCollection = db.collection("usuarios").doc(user.uid).collection("movimientos");

  // Usar orderBy directamente en la colección (método de la API Compat)
  const orderedMovementsQuery = movementsCollection.orderBy("fecha", "desc");

  // Establecer el listener onSnapshot
  const unsubscribe = orderedMovementsQuery.onSnapshot(snapshot => {
    lista.innerHTML = ""; // Limpia la lista en CADA actualización del snapshot
    let ingresos = 0;
    let gastos = 0;

    if (snapshot.empty) {
      listaVaciaMsg.classList.remove("oculto"); // Mostrar mensaje si no hay docs
    } else {
      listaVaciaMsg.classList.add("oculto"); // Ocultar mensaje si hay docs

      snapshot.forEach(doc => {
        const t = doc.data(); // Datos de la transacción
        const li = document.createElement("li");
        // Añadir clase para diferenciar ingresos/gastos y para estilos
        li.className = `movimiento-item movimiento-item-${t.tipo}`;

        // Formatear fecha
        const fechaFormateada = new Date(t.fecha).toLocaleDateString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).replace(/\//g, '-'); // Formato DD-MM-YYYY

        const symbol = t.tipo === "ingreso" ? "+" : "-";
        // Usar colores para el símbolo, según el tipo
        const signColor = t.tipo === "ingreso" ? "#28a745" : "#dc3545";

        // Crear el span para el texto del movimiento con detalles formateados
        const spanTexto = document.createElement("span");
        spanTexto.className = "movimiento-text";
        spanTexto.innerHTML = `
            <span class="fecha-movimiento">${fechaFormateada}</span>
            <span style="color:${signColor}; font-weight:bold;">${symbol}</span>
            <span class="monto-movimiento">$${t.monto.toFixed(2)}</span>
            (<span class="categoria-movimiento">${t.categoria}</span>)
        `;

        // Crear el botón de eliminar
        const btnEliminar = document.createElement("button");
        btnEliminar.className = "eliminar-btn";
        btnEliminar.textContent = "×"; // Símbolo de "x"
        btnEliminar.title = "Eliminar movimiento";
        btnEliminar.onclick = () => {
          // Mensaje de confirmación antes de eliminar
          if (confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
            // Para eliminar, usamos el método delete() directamente en el documento
            movementsCollection.doc(doc.id).delete()
              .then(() => {
                console.log("Movimiento eliminado exitosamente.");
                // La actualización de la lista se maneja automáticamente por onSnapshot.
              })
              .catch(err => {
                console.error("Error al eliminar el movimiento:", err);
                // Podrías mostrar un mensaje de error al usuario aquí si lo deseas
              });
          }
        };

        // Añadir los elementos al LI
        li.appendChild(spanTexto);
        li.appendChild(btnEliminar);
        // Añadir el LI a la lista UL
        lista.appendChild(li);

        // Acumular los totales
        if (t.tipo === "ingreso") {
          ingresos += t.monto;
        } else {
          gastos += t.monto;
        }
      }); // Fin del forEach
    } // Fin del else (snapshot.empty)

    // Actualizar los elementos del DOM con los totales calculados
    const balance = ingresos - gastos;
    balanceElem.textContent = `$${balance.toFixed(2)}`;
    balanceDetElem.textContent = `$${balance.toFixed(2)}`; // Balance general
    totalIngresosElem.textContent = `$${ingresos.toFixed(2)}`;
    totalGastosElem.textContent = `$${gastos.toFixed(2)}`;

  }, error => { // Manejo de errores en el listener onSnapshot
      console.error("Error fetching data:", error);
      errorTransaccion.textContent = "Error al cargar los datos."; // Mostrar error de carga
  });

  return unsubscribe; // Devolver la función de unsubscribe
}

function limpiarCampos() {
  descripcionInput.value = "";
  montoInput.value = "";
  categoriaSelect.value = "General";
  errorTransaccion.textContent = "";

  // Resetear estilos en línea aplicados por toggleTipo al monto
  montoInput.style.borderColor = ""; // Vuelve al estilo por defecto del CSS general
  montoInput.style.boxShadow = "";

  // Asegurarse de que el botón y el estado interno 'tipo' vuelvan a Ingreso
  if (tipo !== "ingreso") {
    tipo = "ingreso";
    tipoToggleBtn.textContent = "Ingreso";
    tipoToggleBtn.classList.remove("tipo-gasto");
    tipoToggleBtn.classList.add("tipo-ingreso");
  }
}
