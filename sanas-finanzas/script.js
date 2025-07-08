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
const tipoToggleBtn = document.getElementById("tipoToggleBtn");
const descripcionInput = document.getElementById("descripcion");
const montoInput = document.getElementById("monto");
const categoriaSelect = document.getElementById("categoria");
const lista = document.getElementById("lista");
const balanceElem = document.getElementById("balance");
const balanceDetElem = document.getElementById("balance-det");
const totalIngresosElem = document.getElementById("total-ingresos");
const totalGastosElem = document.getElementById("total-gastos");
const versionInfoElements = document.querySelectorAll('.version-info'); // Selector para todos los elementos de versión

// Estado global para el tipo de transacción (Ingreso o Gasto)
let tipo = "ingreso";

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

// --- Manejo de Estados de la Aplicación ---

// Cambia entre la vista de Login y la vista de la App
function toggleAppViews(showApp) {
  if (showApp) {
    loginContainer.classList.add("oculto");
    loginContainer.classList.remove("visible");
    appContainer.classList.remove("oculto");
    appContainer.classList.add("visible");
    errorLogin.textContent = ""; // Limpia cualquier mensaje de login
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
    // Si el usuario está logueado, muestra la app
    toggleAppViews(true);
    cargarDatos(); // Carga los datos de transacciones
  } else {
    // Si no hay usuario, muestra la vista de login
    toggleAppViews(false);
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
    .then(() => { /* onAuthStateChanged se encargará del resto */ })
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
    .then(() => { /* onAuthStateChanged se encargará del resto */ })
    .catch(e => {
      errorLogin.textContent = e.message;
    });
}

function logout() {
  auth.signOut()
    .then(() => {
      // Al cerrar sesión, toggleAppViews se llamará vía onAuthStateChanged
    })
    .catch(e => console.error("Error al cerrar sesión:", e));
}

// --- Funciones de la App ---

// Cambia entre el tipo de transacción: Ingreso / Gasto
function toggleTipo() {
  if (tipo === "ingreso") {
    tipo = "gasto";
    tipoToggleBtn.textContent = "Gasto";
    tipoToggleBtn.classList.remove("tipo-ingreso");
    tipoToggleBtn.classList.add("tipo-gasto");
    montoInput.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--danger-color');
  } else {
    tipo = "ingreso";
    tipoToggleBtn.textContent = "Ingreso";
    tipoToggleBtn.classList.remove("tipo-gasto");
    tipoToggleBtn.classList.add("tipo-ingreso");
    montoInput.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
  }
}

// Agrega una nueva transacción a la base de datos
function agregarTransaccion() {
  errorTransaccion.textContent = "";
  const descripcion = descripcionInput.value.trim();
  const monto = parseFloat(montoInput.value);
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

  const transaccion = {
    descripcion,
    monto,
    tipo,
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

  // Escucha cambios en tiempo real en la colección de movimientos del usuario
  db.collection("usuarios").doc(user.uid).collection("movimientos").orderBy("fecha", "desc").onSnapshot(snapshot => {
    lista.innerHTML = ""; // Limpia la lista existente antes de renderizar de nuevo
    let totalIngresos = 0;
    let totalGastos = 0;
    const gastosPorCategoria = {}; // Objeto para almacenar gastos por categoría

    // Inicializa el contador para cada categoría del select
    Array.from(categoriaSelect.children).forEach(option => {
        gastosPorCategoria[option.value] = 0;
    });

    snapshot.forEach(doc => {
      const t = doc.data();
      const li = document.createElement("li");
      li.className = "movimiento-item";

      // Prepara el texto de la transacción con colores para ingreso/gasto y formato de moneda
      const valorClase = t.tipo === "ingreso" ? "ingreso-val" : "gasto-val";
      // Aplica formato de moneda al monto directamente en el span
      const montoFormateado = formatCurrency(t.monto);
      const textoHTML = `${t.descripcion} - <span class="${valorClase}">${montoFormateado}</span>`;
      const spanTexto = document.createElement("span");
      spanTexto.className = "movimiento-text";
      spanTexto.innerHTML = textoHTML; // Usa innerHTML para renderizar el span con la clase

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
    balanceElem.textContent = formatCurrency(balance);
    balanceDetElem.textContent = formatCurrency(balance);
    totalIngresosElem.textContent = formatCurrency(totalIngresos);
    totalGastosElem.textContent = formatCurrency(totalGastos);

    // --- Aplicación de Colores al Balance Principal ---
    balanceElem.classList.remove("balance-positivo", "balance-negativo"); // Elimina clases anteriores
    if (balance > 0) {
        balanceElem.classList.add("balance-positivo"); // Añade clase para color verde
    } else if (balance < 0) {
        balanceElem.classList.add("balance-negativo"); // Añade clase para color rojo
    }

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

    // Destruye el gráfico anterior si existe
    if (transaccionChart) {
      transaccionChart.destroy();
    }

    // Crea el nuevo gráfico si hay datos para mostrar
    if (labels.length > 0) {
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
                    // Formato de moneda para tooltip del gráfico
                    label += formatCurrency(context.raw);
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

  // Resetea el tipo a Ingreso
  tipo = "ingreso";
  tipoToggleBtn.textContent = "Ingreso";
  tipoToggleBtn.classList.remove("tipo-gasto");
  tipoToggleBtn.classList.add("tipo-ingreso");
  montoInput.style.borderColor = ""; // Restaura el borde por defecto

  errorTransaccion.textContent = ""; // Limpia mensajes de error
}

// Limpia los campos de login
function limpiarCamposLogin() {
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
}

// --- Inicialización de Versión ---
document.addEventListener('DOMContentLoaded', () => {
    const version = "2.0.2"; // <-- ÚLTIMA VERSIÓN

    versionInfoElements.forEach(el => {
        el.textContent = `Version ${version}`;
    });

    // La lógica de onAuthStateChanged ya está fuera para que se ejecute una vez al cargar.
    // No es necesario llamar `toggleAppViews` aquí explícitamente si `onAuthStateChanged` lo maneja.
});
