// Configuración de Firebase
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

// Obtiene las referencias de los servicios de Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Referencias a elementos del DOM
const loginContainer = document.getElementById("login-container");
const appContainer = document.getElementById("app-container");
const errorLogin = document.getElementById("error-login");
const errorTransaccion = document.getElementById("error-transaccion");
// El tipoToggleBtn se eliminará y se reemplazará por dos botones, así que no necesitamos su referencia aquí.
const descripcionInput = document.getElementById("descripcion");
const montoInput = document.getElementById("monto");
const categoriaSelect = document.getElementById("categoria");
const lista = document.getElementById("lista");
const balanceElem = document.getElementById("balance");
const balanceDetElem = document.getElementById("balance-det"); // Balance en el resumen
const totalIngresosElem = document.getElementById("total-ingresos");
const totalGastosElem = document.getElementById("total-gastos");
const versionInfoElements = document.querySelectorAll('.version-info'); // Selector para todos los elementos de versión

// Estado global para el tipo de transacción (Ingreso o Gasto). Inicialmente se setea en HTML.
// let tipo = "ingreso"; // Se inicializará al cargar el DOM y dependerá del botón seleccionado.

// Variable global para la instancia del gráfico de Chart.js
let transaccionChart = null;

// --- Formateo de Moneda ---
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '$0.00'; // Valor por defecto para entradas inválidas
    }
    // Utiliza Intl.NumberFormat para formatear según locale español 'es-ES'
    // 'es-ES' usa '.' para miles y ',' para decimales, que es el formato deseado.
    const formatted = value.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true // Asegura los separadores de miles y decimales correctos
    });
    // Añade el símbolo de dólar al principio
    return `$${formatted}`;
}

// --- Utilidades de Scroll ---
function scrollToTopSmoothly() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // Hace el scroll suave y animado
    });
}

// --- Manejo de Estados de la Aplicación ---

// Cambia entre la vista de Login y la vista de la App
function toggleAppViews(showApp) {
  if (showApp) {
    loginContainer.classList.add("oculto");
    loginContainer.classList.remove("visible");
    appContainer.classList.remove("oculto");
    appContainer.classList.add("visible");
    errorLogin.textContent = ""; // Limpia cualquier mensaje de login
    scrollToTopSmoothly(); // Asegura que la vista suba al tope al mostrarse la app
  } else {
    appContainer.classList.add("oculto");
    appContainer.classList.remove("visible");
    loginContainer.classList.remove("oculto");
    loginContainer.classList.add("visible");
    limpiarCamposApp(); // Limpia los campos de la app antes de volver al login
    limpiarCamposLogin(); // Limpia campos de login
    errorLogin.textContent = "";
  }
}

// Escucha el cambio de estado de autenticación del usuario
auth.onAuthStateChanged(user => {
  if (user) {
    toggleAppViews(true); // Muestra la app si el usuario está logueado
    cargarDatos(); // Carga los datos de transacciones
  } else {
    toggleAppViews(false); // Muestra el login si no hay usuario
  }
});

// --- Funciones de Autenticación ---

function login() {
  errorLogin.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    errorLogin.textContent = "Por favor, ingresa tu correo electrónico y contraseña.";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => { /* onAuthStateChanged se encargará de cambiar la vista */ })
    .catch(e => {
      errorLogin.textContent = e.message;
    });
}

function register() {
  errorLogin.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    errorLogin.textContent = "Por favor, ingresa tu correo electrónico y contraseña.";
    return;
  }
  if (password.length < 6) {
      errorLogin.textContent = "La contraseña debe tener al menos 6 caracteres.";
      return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => { /* onAuthStateChanged se encargará de cambiar la vista */ })
    .catch(e => {
      errorLogin.textContent = e.message;
    });
}

function logout() {
  auth.signOut()
    .then(() => {
      // onAuthStateChanged se encargará de mostrar la vista de login.
    })
    .catch(e => console.error("Error al cerrar sesión:", e));
}

// --- Funciones de la App ---

// Establece el tipo de transacción y actualiza el estilo del botón
function setTransactionType(type) {
    // Actualiza la variable global 'tipo'
    globalTipo = type; // Se declara globalmente más abajo

    // Actualiza los estilos de los botones "Ingreso" y "Gasto"
    const btnIngreso = document.getElementById('btn-tipo-ingreso');
    const btnGasto = document.getElementById('btn-tipo-gasto');

    btnIngreso.classList.remove('activo');
    btnGasto.classList.remove('activo');

    if (type === "ingreso") {
        btnIngreso.classList.add('activo');
        // Cambiar color del borde del input de monto a verde para "ingreso"
        montoInput.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
    } else {
        btnGasto.classList.add('activo');
        // Cambiar color del borde del input de monto a rojo para "gasto"
        montoInput.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--danger-color');
    }
}


// Agrega una nueva transacción a la base de datos
function agregarTransaccion() {
  errorTransaccion.textContent = "";
  const descripcion = descripcionInput.value.trim();
  const monto = parseFloat(montoInput.value); // Mantenemos parseFloat normal, el formato se aplica al mostrar
  const categoria = categoriaSelect.value;

  if (!descripcion) {
    errorTransaccion.textContent = "La descripción no puede estar vacía.";
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    errorTransaccion.textContent = "Por favor, ingresa un monto válido y positivo.";
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    errorTransaccion.textContent = "Debes iniciar sesión para agregar transacciones.";
    return;
  }

  // Asegurarse de que globalTipo esté definida antes de usarla
  if (typeof globalTipo === 'undefined' || (globalTipo !== "ingreso" && globalTipo !== "gasto")) {
      // Si no está definida o es inválida, por defecto setear a 'ingreso'
      setTransactionType("ingreso"); // Inicializa o resetea si no estuviera
  }

  const transaccion = {
    descripcion,
    monto, // Se guarda el número puro en la BD
    tipo: globalTipo, // Usar la variable global para el tipo de transacción
    categoria,
    fecha: new Date().toISOString() // Guarda la fecha actual como string ISO
  };

  db.collection("usuarios").doc(user.uid).collection("movimientos").add(transaccion)
    .then(() => {
      limpiarCamposApp(); // Limpia los campos del formulario después de agregar
    })
    .catch(e => {
      errorTransaccion.textContent = "Error al guardar la transacción: " + e.message;
    });
}

// Carga los datos de las transacciones del usuario y actualiza la interfaz
function cargarDatos() {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("usuarios").doc(user.uid).collection("movimientos").orderBy("fecha", "desc").onSnapshot(snapshot => {
    lista.innerHTML = "";
    let totalIngresos = 0;
    let totalGastos = 0;
    const gastosPorCategoria = {};

    Array.from(categoriaSelect.children).forEach(option => {
        gastosPorCategoria[option.value] = 0;
    });

    snapshot.forEach(doc => {
      const t = doc.data();
      const li = document.createElement("li");
      li.className = "movimiento-item";

      // Prepara el texto de la transacción, formateando el monto y aplicando colores
      const valorClase = t.tipo === "ingreso" ? "ingreso-val" : "gasto-val";
      const montoFormateado = formatCurrency(t.monto); // Aplica formato de moneda
      const textoHTML = `${t.descripcion} - <span class="${valorClase}">${montoFormateado}</span>`;
      const spanTexto = document.createElement("span");
      spanTexto.className = "movimiento-text";
      spanTexto.innerHTML = textoHTML;

      // Crea el botón de eliminar
      const btnEliminar = document.createElement("button");
      btnEliminar.className = "eliminar-btn";
      btnEliminar.textContent = "×";
      btnEliminar.title = "Eliminar movimiento";
      btnEliminar.onclick = () => {
        if (confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
          db.collection("usuarios").doc(user.uid).collection("movimientos").doc(doc.id).delete()
            .then(() => console.log("Movimiento eliminado"))
            .catch(error => console.error("Error al eliminar:", error));
        }
      };

      li.appendChild(spanTexto);
      li.appendChild(btnEliminar);
      lista.appendChild(li);

      // Acumula totales y datos para el gráfico
      if (t.tipo === "ingreso") {
        totalIngresos += t.monto;
      } else {
        totalGastos += t.monto;
        if (gastosPorCategoria[t.categoria] !== undefined) {
            gastosPorCategoria[t.categoria] += t.monto;
        }
      }
    });

    // Calcula y actualiza los totales con formato de moneda
    const balance = totalIngresos - totalGastos;
    balanceElem.textContent = formatCurrency(balance); // Balance principal
    balanceDetElem.textContent = formatCurrency(balance); // Balance en el resumen

    totalIngresosElem.textContent = formatCurrency(totalIngresos);
    totalGastosElem.textContent = formatCurrency(totalGastos);

    // --- Aplicación de Colores al Balance y Totales del Resumen ---
    // Limpia clases anteriores en todos los elementos que podrían tenerlas
    balanceElem.classList.remove("balance-positivo", "balance-negativo");
    balanceDetElem.classList.remove("balance-positivo", "balance-negativo");
    totalIngresosElem.classList.remove("resumen-valor-ingreso", "resumen-valor-gasto"); // Clean up for clarity
    totalGastosElem.classList.remove("resumen-valor-ingreso", "resumen-valor-gasto");   // Clean up for clarity

    // Balance Principal (h1 #balance)
    if (balance > 0) {
        balanceElem.classList.add("balance-positivo");
    } else if (balance < 0) {
        balanceElem.classList.add("balance-negativo");
    }

    // Balance en el resumen (balanceDetElem)
    if (balance > 0) {
        balanceDetElem.classList.add("balance-positivo");
    } else if (balance < 0) {
        balanceDetElem.classList.add("balance-negativo");
    }

    // Ingresos en el resumen
    totalIngresosElem.classList.add("resumen-valor-ingreso"); // Asume siempre ingreso positivo

    // Gastos en el resumen
    totalGastosElem.classList.add("resumen-valor-gasto"); // Asume siempre gasto positivo


    // --- Actualiza el Gráfico ---
    const labels = Object.keys(gastosPorCategoria).filter(cat => gastosPorCategoria[cat] > 0);
    const values = labels.map(cat => gastosPorCategoria[cat]);

    const defaultColors = [
      'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)'
    ];
    const borderColors = defaultColors.map(color => color.replace('0.7', '1'));

    const datasetColors = labels.map((_, index) => defaultColors[index % defaultColors.length]);
    const datasetBorderColors = labels.map((_, index) => borderColors[index % borderColors.length]);

    const ctx = document.getElementById('transaccionChart');

    if (transaccionChart) {
      transaccionChart.destroy(); // Destruye el gráfico anterior
    }

    if (labels.length > 0) { // Crea el gráfico solo si hay datos
      transaccionChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            label: 'Cantidad Gastada',
            data: values,
            backgroundColor: datasetColors,
            borderColor: datasetBorderColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' },
            title: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.label || '';
                  if (label) label += ': ';
                  if (context.raw !== null) {
                    label += formatCurrency(context.raw); // Usa el formato de moneda para el tooltip
                  }
                  return label;
                }
              }
            }
          }
        }
      });
    }
  });
}

// Limpia los campos del formulario de transacción y resetea el tipo
function limpiarCamposApp() {
  descripcionInput.value = "";
  montoInput.value = "";
  categoriaSelect.value = "General";

  // Restablece el tipo y los estilos de los botones de tipo al default ("Ingreso")
  setTransactionType("ingreso"); // Llama a la función que maneja la lógica y el estilo

  errorTransaccion.textContent = ""; // Limpia mensajes de error
}

// Limpia los campos de login
function limpiarCamposLogin() {
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
}

// --- Inicialización y Configuración Inicial ---
// Declarar la variable global para el tipo de transacción al inicio
let globalTipo = "ingreso";

document.addEventListener('DOMContentLoaded', () => {
    // Configura el tipo de transacción inicial al cargar el DOM
    // Si no hay usuario logueado, esta llamada no afecta nada ya que las vistas están ocultas.
    // Cuando la app se carga (tras login), este seteo inicial tendrá el valor correcto.
    setTransactionType(globalTipo); // Asegura que el estado inicial del tipo sea correcto al cargar.

    const version = "2.0.4"; // <-- ACTUALIZADO A LA VERSIÓN CORRECTA

    versionInfoElements.forEach(el => {
        el.textContent = `Version ${version}`;
    });
});
