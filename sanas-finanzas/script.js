const firebaseConfig = {
  apiKey: "AIzaSyAvReIBNYy-RQ67hyTEPwTX-4lnvhlo8T0",
  authDomain: "sanas-finanzas-450a6.firebaseapp.com",
  projectId: "sanas-finanzas-450a6",
  storageBucket: "sanas-finanzas-450a6.appspot.com",
  messagingSenderId: "585032859960",
  appId: "1:585032859960:web:1d7594cf4c3d58214e01cd"
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
const totalIngresosElem = document.getElementById("total-ingresos");
const totalGastosElem = document.getElementById("total-gastos");

let tipo = "ingreso";
let movimientoEditandoId = null;

const formatDinero = n => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.classList.add("oculto");
    appContainer.classList.remove("oculto");
    cargarDatos();
  } else {
    loginContainer.classList.remove("oculto");
    appContainer.classList.add("oculto");
    limpiarCampos();
  }
});

function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth.signInWithEmailAndPassword(email, password).catch(e => errorLogin.textContent = e.message);
}

function register() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth.createUserWithEmailAndPassword(email, password).catch(e => errorLogin.textContent = e.message);
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
    montoInput.style.borderColor = "#dc3545";
  } else {
    tipo = "ingreso";
    tipoToggleBtn.textContent = "Ingreso";
    tipoToggleBtn.classList.remove("tipo-gasto");
    tipoToggleBtn.classList.add("tipo-ingreso");
    montoInput.style.borderColor = "#28a745";
  }
}

function agregarTransaccion() {
  const descripcion = descripcionInput.value.trim();
  const monto = parseFloat(montoInput.value);
  const categoria = categoriaSelect.value;
  const user = auth.currentUser;
  if (!descripcion || isNaN(monto) || monto <= 0 || !user) {
    errorTransaccion.textContent = "Datos inválidos.";
    return;
  }

  const transaccion = { descripcion, monto, tipo, categoria, fecha: new Date().toISOString() };
  const ref = db.collection("usuarios").doc(user.uid).collection("movimientos");

  if (movimientoEditandoId) {
    ref.doc(movimientoEditandoId).update(transaccion).then(() => {
      limpiarCampos();
      cargarDatos();
      movimientoEditandoId = null;
      document.querySelector("button[onclick='agregarTransaccion()']").textContent = "Agregar";
    });
  } else {
    ref.add(transaccion).then(() => {
      limpiarCampos();
      cargarDatos();
    });
  }
}

function cargarDatos() {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("usuarios").doc(user.uid).collection("movimientos").orderBy("fecha", "desc").onSnapshot(snapshot => {
    lista.innerHTML = "";
    let ingresos = 0, gastos = 0;

    snapshot.forEach(doc => {
      const t = doc.data();
      const li = document.createElement("li");
      li.className = "movimiento-item";

      const texto = `${t.descripcion} - ${formatDinero(t.monto)} (${t.categoria})`;
      const spanTexto = document.createElement("span");
      spanTexto.className = "movimiento-text";
      spanTexto.textContent = texto;

      const btnEditar = document.createElement("button");
      btnEditar.className = "boton-burbuja boton-editar";
      btnEditar.textContent = "✏️";
      btnEditar.onclick = () => {
        descripcionInput.value = t.descripcion;
        montoInput.value = t.monto;
        categoriaSelect.value = t.categoria;
        tipo = t.tipo;
        tipoToggleBtn.textContent = tipo === "gasto" ? "Gasto" : "Ingreso";
        tipoToggleBtn.className = tipo === "gasto" ? "tipo-gasto" : "tipo-ingreso";
        movimientoEditandoId = doc.id;
        document.querySelector("button[onclick='agregarTransaccion()']").textContent = "Actualizar";
      };

      const btnEliminar = document.createElement("button");
      btnEliminar.className = "boton-burbuja boton-eliminar";
      btnEliminar.textContent = "✖";
      btnEliminar.onclick = () => {
        if (confirm("¿Eliminar este movimiento?")) {
          db.collection("usuarios").doc(user.uid).collection("movimientos").doc(doc.id).delete();
        }
      };

      li.appendChild(spanTexto);
      li.appendChild(btnEditar);
      li.appendChild(btnEliminar);
      lista.appendChild(li);

      t.tipo === "ingreso" ? ingresos += t.monto : gastos += t.monto;
    });

    const balance = ingresos - gastos;
    balanceElem.textContent = formatDinero(balance);
    balanceElem.className = balance >= 0 ? "balance-positivo" : "balance-negativo";
    totalIngresosElem.textContent = formatDinero(ingresos);
    totalGastosElem.textContent = formatDinero(gastos);
  });
}

function limpiarCampos() {
  descripcionInput.value = "";
  montoInput.value = "";
  categoriaSelect.value = "General";
  tipo = "ingreso";
  tipoToggleBtn.textContent = "Ingreso";
  tipoToggleBtn.className = "tipo-ingreso";
  movimientoEditandoId = null;
}
