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

// Estado global para el tipo de transacción (Ingreso o Gasto)
let tipo = "ingreso";

// Variable global para la instancia del gráfico de Chart.js
let transaccionChart = null;

// Maneja el cambio de estado de autenticación del usuario
auth.onAuthStateChanged(user => {
  if (user) {
    // Si el usuario está logueado:
    // Ocultar contenedor de login, mostrar contenedor de la app
    loginContainer.classList.add("oculto");
    loginContainer.classList.remove("visible"); // Asegurar que no esté visible
    appContainer.classList.remove("oculto");
    appContainer.classList.add("visible");      // Asegurar que esté visible

    cargarDatos(); // Cargar los datos de transacciones del usuario
    errorLogin.textContent = ""; // Limpiar cualquier mensaje de error previo
  } else {
    // Si no hay usuario logueado:
    // Ocultar contenedor de la app, mostrar contenedor de login
    appContainer.classList.add("oculto");
    appContainer.classList.remove("visible"); // Asegurar que no esté visible
    loginContainer.classList.remove("oculto");
    loginContainer.classList.add("visible");      // Asegurar que esté visible

    limpiarCampos(); // Limpiar campos de la app
    errorLogin.textContent = "";
  }
});

// Función para iniciar sesión
function login() {
  errorLogin.textContent = ""; // Limpiar errores anteriores
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // Validación básica de campos
  if (!email || !password) {
    errorLogin.textContent = "Por favor, ingresa tu correo electrónico y contraseña.";
    return;
  }

  // Intenta iniciar sesión con Firebase Authentication
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      // Si tiene éxito, onAuthStateChanged se encargará de cambiar la vista
      errorLogin.textContent = "";
    })
    .catch(e => {
      // Si falla, muestra el mensaje de error
      errorLogin.textContent = e.message;
    });
}

// Función para registrar un nuevo usuario
function register() {
  errorLogin.textContent = ""; // Limpiar errores anteriores
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // Validación básica de campos
  if (!email || !password) {
    errorLogin.textContent = "Por favor, ingresa tu correo electrónico y contraseña.";
    return;
  }
  // Firebase Authentication requiere contraseñas de al menos 6 caracteres
  if (password.length < 6) {
      errorLogin.textContent = "La contraseña debe tener al menos 6 caracteres.";
      return;
  }

  // Intenta crear un nuevo usuario con Firebase Authentication
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      // Si tiene éxito, onAuthStateChanged se encargará de cambiar la vista
      errorLogin.textContent = "";
    })
    .catch(e => {
      // Si falla, muestra el mensaje de error
      errorLogin.textContent = e.message;
    });
}

// Función para cerrar sesión
function logout() {
  auth.signOut()
    .then(() => {
      // Al cerrar sesión, onAuthStateChanged detectará el cambio y mostrará la vista de login.
      // Asegúrate de que los campos de la app estén limpios si el usuario regresa.
      limpiarCampos();
    })
    .catch(e => {
      console.error("Error al cerrar sesión:", e);
      // Puedes mostrar un mensaje de error al usuario si es necesario.
    });
}

// Función para cambiar entre tipo de transacción (Ingreso/Gasto)
function toggleTipo() {
  if (tipo === "ingreso") {
    tipo = "gasto"; // Cambiar estado a Gasto
    tipoToggleBtn.textContent = "Gasto";
    tipoToggleBtn.classList.remove("tipo-ingreso");
    tipoToggleBtn.classList.add("tipo-gasto");

    // Cambiar el borde del input de monto para reflejar el tipo (gasto es rojo)
    montoInput.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--danger-color');
    // montoInput.style.boxShadow = "0 0 10px rgba(220, 53, 69, 0.35)"; // Se puede añadir si se quiere color persistente en focus
  } else {
    tipo = "ingreso"; // Cambiar estado a Ingreso
    tipoToggleBtn.textContent = "Ingreso";
    tipoToggleBtn.classList.remove("tipo-gasto");
    tipoToggleBtn.classList.add("tipo-ingreso");

    // Cambiar el borde del input de monto para reflejar el tipo (ingreso es verde)
    montoInput.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
    // montoInput.style.boxShadow = "0 0 10px rgba(40, 167, 69, 0.35)";
  }
}

// Función para agregar una nueva transacción
function agregarTransaccion() {
  errorTransaccion.textContent = ""; // Limpiar errores anteriores
  const descripcion = descripcionInput.value.trim();
  const monto = parseFloat(montoInput.value);
  const categoria = categoriaSelect.value;

  // Validaciones
  if (!descripcion) {
    errorTransaccion.textContent = "La descripción no puede estar vacía.";
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    errorTransaccion.textContent = "Por favor, ingresa un monto válido y positivo.";
    return;
  }

  // Verificar si el usuario está autenticado
  const user = auth.currentUser;
  if (!user) {
    errorTransaccion.textContent = "Debes iniciar sesión para agregar transacciones.";
    return;
  }

  // Crear el objeto de la transacción
  const transaccion = {
    descripcion,
    monto,
    tipo,
    categoria,
    fecha: new Date().toISOString() // Guardar la fecha de la transacción
  };

  // Guardar la transacción en Firestore bajo la colección del usuario actual
  db.collection("usuarios").doc(user.uid).collection("movimientos").add(transaccion)
    .then(() => {
      limpiarCampos(); // Limpiar los campos del formulario después de agregar
      // La lista de transacciones y el gráfico se actualizarán automáticamente
      // gracias al listener 'onSnapshot'.
    })
    .catch(e => {
      // Mostrar error si la transacción no se puede guardar
      errorTransaccion.textContent = "Error al guardar la transacción: " + e.message;
    });
}

// Función para cargar y renderizar todas las transacciones del usuario
function cargarDatos() {
  const user = auth.currentUser;
  if (!user) return; // Si no hay usuario, no se hace nada

  // Escucha en tiempo real de los movimientos del usuario en Firestore
  db.collection("usuarios").doc(user.uid).collection("movimientos").orderBy("fecha", "desc").onSnapshot(snapshot => {
    lista.innerHTML = ""; // Limpiar la lista de transacciones antes de renderizar de nuevo
    let totalIngresos = 0;
    let totalGastos = 0;

    // Prepara datos para el gráfico: gastos por categoría
    const gastosPorCategoria = {};
    const categoriasSelectOptions = categoriaSelect.children; // Obtener todas las opciones del select
    // Inicializa el contador para cada categoría a 0
    Array.from(categoriasSelectOptions).forEach(option => {
        gastosPorCategoria[option.value] = 0;
    });

    // Itera sobre cada documento (transacción) en el snapshot
    snapshot.forEach(doc => {
      const t = doc.data(); // Datos de la transacción
      const li = document.createElement("li"); // Crear elemento de lista (li)
      li.className = "movimiento-item"; // Aplicar clase para estilos visuales

      // Crear el contenido del texto, coloreando el monto según el tipo
      const valorClase = t.tipo === "ingreso" ? "ingreso-val" : "gasto-val";
      const textoHTML = `${t.descripcion} - <span class="${valorClase}">$${t.monto.toFixed(2)}</span>`;
      const spanTexto = document.createElement("span");
      spanTexto.className = "movimiento-text";
      spanTexto.innerHTML = textoHTML; // Usar innerHTML para que se interprete el <span>

      // Crear el botón de eliminar para cada transacción
      const btnEliminar = document.createElement("button");
      btnEliminar.className = "eliminar-btn"; // Clase para el estilo del botón eliminar
      btnEliminar.textContent = "×"; // Icono 'x'
      btnEliminar.title = "Eliminar movimiento"; // Tooltip
      btnEliminar.onclick = () => { // Acción al hacer clic en el botón de eliminar
        // Pregunta confirmación antes de borrar
        if (confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
          db.collection("usuarios").doc(user.uid).collection("movimientos").doc(doc.id).delete()
            .then(() => console.log("Movimiento eliminado exitosamente"))
            .catch(error => console.error("Error al eliminar movimiento:", error));
        }
      };

      li.appendChild(spanTexto); // Añadir el texto al elemento li
      li.appendChild(btnEliminar); // Añadir el botón eliminar al elemento li
      lista.appendChild(li); // Añadir el elemento li a la lista ul

      // Acumular los totales de ingresos y gastos
      if (t.tipo === "ingreso") {
        totalIngresos += t.monto;
      } else {
        totalGastos += t.monto;
        // Si es un gasto, acumularlo por categoría para el gráfico
        if (gastosPorCategoria[t.categoria] !== undefined) {
            gastosPorCategoria[t.categoria] += t.monto;
        } else {
            // Esto maneja casos donde una categoría pueda no estar inicializada (aunque el select lo previene)
            gastosPorCategoria[t.categoria] = t.monto;
        }
      }
    });

    // Calcular el balance final
    const balance = totalIngresos - totalGastos;

    // Actualizar los elementos del DOM con los totales calculados
    balanceElem.textContent = `$${balance.toFixed(2)}`;
    balanceDetElem.textContent = `$${balance.toFixed(2)}`;
    totalIngresosElem.textContent = `$${totalIngresos.toFixed(2)}`;
    totalGastosElem.textContent = `$${totalGastos.toFixed(2)}`;

    // --- Configuración y Actualización del Gráfico de Gastos ---
    // Filtrar solo las categorías que tienen gastos mayores a 0
    const labels = Object.keys(gastosPorCategoria).filter(cat => gastosPorCategoria[cat] > 0);
    const values = labels.map(cat => gastosPorCategoria[cat]);

    // Colores predefinidos para las porciones del gráfico. Se usarán cíclicamente si hay más categorías.
    const defaultColors = [
      'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)', 'rgba(255, 129, 132, 0.7)', 'rgba(153, 202, 255, 0.7)',
      'rgba(255, 239, 86, 0.7)'
    ];
    const borderColors = defaultColors.map(color => color.replace('0.7', '1')); // Colores opacos para bordes

    // Mapear colores a las etiquetas y valores, repitiendo si hay más de los colores definidos
    const datasetColors = labels.map((_, index) => defaultColors[index % defaultColors.length]);
    const datasetBorderColors = labels.map((_, index) => borderColors[index % borderColors.length]);

    const ctx = document.getElementById('transaccionChart'); // Obtener el contexto del canvas

    // Si ya existe un gráfico anterior, destruirlo para evitar sobreposición y re-renderizar
    if (transaccionChart) {
      transaccionChart.destroy();
    }

    // Solo crear el gráfico si hay datos (etiquetas con gastos) para mostrar
    if (labels.length > 0) {
        // Crear una nueva instancia del gráfico
        transaccionChart = new Chart(ctx, {
            type: 'pie', // Tipo de gráfico: pastel (ideal para distribuciones)
            data: {
                labels: labels, // Las categorías con gastos
                datasets: [{
                    label: 'Cantidad Gastada', // Etiqueta para el tooltip
                    data: values, // Los montos correspondientes a cada categoría
                    backgroundColor: datasetColors, // Colores de las secciones del pastel
                    borderColor: datasetBorderColors, // Colores de los bordes de las secciones
                    borderWidth: 1 // Grosor del borde
                }]
            },
            options: {
                responsive: true, // El gráfico se adapta al tamaño de su contenedor
                maintainAspectRatio: false, // Permite que la altura sea definida por el CSS
                plugins: {
                    legend: {
                        position: 'right', // Posiciona la leyenda a la derecha del gráfico
                    },
                    title: {
                        display: false, // El título se maneja con el <h2>
                    },
                    tooltip: {
                        callbacks: {
                            // Formatear el valor en el tooltip como moneda
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.raw !== null) {
                                    // Usar Intl.NumberFormat para formato de moneda localizado (ej: español, euros o moneda local)
                                    // Cambia 'es-ES' y 'EUR' según tu preferencia de idioma y moneda.
                                    // Si el símbolo de la moneda no se muestra correctamente, usa 'USD' o '+currencySymbol' en la formateación.
                                    // Asegúrate de reemplazar 'XXX' con un código de moneda válido si es necesario, o usa formato genérico.
                                    label += new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(context.raw);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Si no hay gastos, asegurarnos de que no haya gráfico o mostrar un mensaje.
        // La destrucción del gráfico anterior y la condición `if (labels.length > 0)` evitan crear un gráfico vacío.
        // El div de contenedor para el gráfico está ahí, pero vacío de canvas si no hay datos.
    }
  });
}

// Función para limpiar todos los campos del formulario de transacción y resetear estado
function limpiarCampos() {
  descripcionInput.value = "";
  montoInput.value = "";
  categoriaSelect.value = "General";

  // Restablecer el tipo de transacción a "Ingreso"
  tipo = "ingreso";
  tipoToggleBtn.textContent = "Ingreso";
  tipoToggleBtn.classList.remove("tipo-gasto");
  tipoToggleBtn.classList.add("tipo-ingreso");

  // Restablecer el estilo del input de monto a su estado por defecto
  montoInput.style.borderColor = "";
  // montoInput.style.boxShadow = ""; // La gestión del focus se hace vía CSS `:focus`

  // Limpiar cualquier mensaje de error en la sección de transacciones
  errorTransaccion.textContent = "";

  // Limpiar campos de login también por si se regresa a esa vista
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
}
