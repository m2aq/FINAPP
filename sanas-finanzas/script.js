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

let tipo = "ingreso";

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.classList.add("oculto");
    appContainer.classList.remove("oculto");
    cargarDatos();
    errorLogin.textContent = "";
  } else {
    loginContainer.classList.remove("oculto");
    appContainer.classList.add("oculto");
    limpiarCampos();
    errorLogin.textContent = "";
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
    montoInput.style.borderColor = "#dc3545";
    montoInput.style.boxShadow = "0 0 6px #dc3545aa";
  } else {
    tipo = "ingreso";
    tipoToggleBtn.textContent = "Ingreso";
    tipoToggleBtn.classList.remove("tipo-gasto");
    tipoToggleBtn.classList.add("tipo-ingreso");
    montoInput.style.borderColor = "#28a745";
    montoInput.style.boxShadow = "0 0 6px #28a745aa";
  }
}

function agregarTransaccion() {
  errorTransaccion.textContent = "";
  const descripcion = descripcionInput.value.trim();
  const monto = parseFloat(montoInput.value);
  const categoria = categoriaSelect.value;

  if (!descripcion) {
    errorTransaccion.textContent = "Agrega una descripción.";
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    errorTransaccion.textContent = "Monto inválido.";
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    errorTransaccion.textContent = "No estás autenticado.";
    return;
  }

  const transaccion = {
    descripcion,
    monto,
    tipo,
    categoria,
    fecha: new Date().toISOString()
  };

  db.collection("usuarios").doc(user.uid).collection("movimientos").add(transaccion)
    .then(() => {
      limpiarCampos();
      cargarDatos();
    })
    .catch(e => errorTransaccion.textContent = "Error al guardar: " + e.message);
}

function cargarDatos() {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("usuarios").doc(user.uid).collection("movimientos").orderBy("fecha", "desc").onSnapshot(snapshot => {
    lista.innerHTML = "";
    let ingresos = 0;
    let gastos = 0;

    snapshot.forEach(doc => {
      const t = doc.data();
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
        if (confirm("¿Eliminar este movimiento?")) {
          db.collection("usuarios").doc(user.uid).collection("movimientos").doc(doc.id).delete();
        }
      };

      li.appendChild(spanTexto);
      li.appendChild(btnEliminar);
      lista.appendChild(li);

      if (t.tipo === "ingreso") ingresos += t.monto;
      else gastos += t.monto;
    });

    const balance = ingresos - gastos;
    balanceElem.textContent = `$${balance.toFixed(2)}`;
    balanceDetElem.textContent = `$${balance.toFixed(2)}`;
    totalIngresosElem.textContent = `$${ingresos.toFixed(2)}`;
    totalGastosElem.textContent = `$${gastos.toFixed(2)}`;
  });
}

function limpiarCampos() {
  descripcionInput.value = "";
  montoInput.value = "";
  categoriaSelect.value = "General";
  errorTransaccion.textContent = "";
  montoInput.style.borderColor = "";
  montoInput.style.boxShadow = "";
  tipo = "ingreso";
  tipoToggleBtn.textContent = "Ingreso";
  tipoToggleBtn.classList.remove("tipo-gasto");
  tipoToggleBtn.classList.add("tipo-ingreso");
}
