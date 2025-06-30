// Configuración Firebase (pon aquí tu propia configuración)
const firebaseConfig = {
  apiKey: "AIzaSyAvReIBNYy-RQ67hyTEPwTX-4lnvhlo8T0",
  authDomain: "sanas-finanzas-450a6.firebaseapp.com",
  projectId: "sanas-finanzas-450a6",
  storageBucket: "sanas-finanzas-450a6.appspot.com",
  messagingSenderId: "585032859960",
  appId: "1:585032859960:web:1d7594cf4c3d58214e01cd"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorLogin = document.getElementById('error-login');

const tipoToggleBtn = document.getElementById('tipoToggleBtn');
const descripcionInput = document.getElementById('descripcion');
const montoInput = document.getElementById('monto');
const categoriaSelect = document.getElementById('categoria');
const errorTransaccion = document.getElementById('error-transaccion');
const lista = document.getElementById('lista');

const totalIngresosEl = document.getElementById('total-ingresos');
const totalGastosEl = document.getElementById('total-gastos');

let tipo = 'ingreso'; // ingreso o gasto
let transacciones = [];
let editandoId = null;

function toggleTipo() {
  if (tipo === 'ingreso') {
    tipo = 'gasto';
    tipoToggleBtn.textContent = 'Gasto';
    tipoToggleBtn.classList.remove('tipo-ingreso');
    tipoToggleBtn.classList.add('tipo-gasto');
  } else {
    tipo = 'ingreso';
    tipoToggleBtn.textContent = 'Ingreso';
    tipoToggleBtn.classList.remove('tipo-gasto');
    tipoToggleBtn.classList.add('tipo-ingreso');
  }
}

function formatearMoneda(num) {
  return num.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  });
}

function mostrarTransacciones() {
  lista.innerHTML = '';
  transacciones.forEach(tx => {
    const li = document.createElement('li');
    li.className = 'movimiento-item';

    const texto = document.createElement('div');
    texto.className = 'movimiento-text';
    texto.textContent = `[${tx.categoria}] ${tx.descripcion} - ${formatearMoneda(tx.monto)} (${tx.tipo})`;

    const btnEditar = document.createElement('button');
    btnEditar.className = 'eliminar-btn';
    btnEditar.style.color = '#17a2b8';
    btnEditar.textContent = '✏️';
    btnEditar.title = 'Editar';
    btnEditar.onclick = () => editarTransaccion(tx.id);

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'eliminar-btn';
    btnEliminar.textContent = '❌';
    btnEliminar.title = 'Eliminar';
    btnEliminar.onclick = () => eliminarTransaccion(tx.id);

    li.appendChild(texto);
    li.appendChild(btnEditar);
    li.appendChild(btnEliminar);

    lista.appendChild(li);
  });
  actualizarResumen();
}

function actualizarResumen() {
  const ingresos = transacciones
    .filter(tx => tx.tipo === 'ingreso')
    .reduce((acc, tx) => acc + tx.monto, 0);
  const gastos = transacciones
    .filter(tx => tx.tipo === 'gasto')
    .reduce((acc, tx) => acc + tx.monto, 0);
  const balance = ingresos - gastos;

  totalIngresosEl.textContent = formatearMoneda(ingresos);
  totalGastosEl.textContent = formatearMoneda(gastos);

  const balanceGrande = document.getElementById('balance-grande');
  balanceGrande.textContent = formatearMoneda(balance);

  if (balance >= 0) {
    balanceGrande.style.color = '#28a745';
  } else {
    balanceGrande.style.color = '#dc3545';
  }
}

async function agregarTransaccion() {
  errorTransaccion.textContent = '';

  const descripcion = descripcionInput.value.trim();
  const monto = parseFloat(montoInput.value);
  const categoria = categoriaSelect.value;

  if (!descripcion || isNaN(monto) || monto <= 0) {
    errorTransaccion.textContent = 'Por favor ingresa descripción y monto válido.';
    return;
  }

  const uid = auth.currentUser.uid;
  const transaccion = {
    descripcion,
    monto,
    categoria,
    tipo,
    fecha: new Date()
  };

  try {
    if (editandoId) {
      await db.collection('usuarios').doc(uid)
        .collection('transacciones').doc(editandoId).update(transaccion);
      editandoId = null;
      tipoToggleBtn.disabled = false;
    } else {
      await db.collection('usuarios').doc(uid)
        .collection('transacciones').add(transaccion);
    }

    descripcionInput.value = '';
    montoInput.value = '';
    categoriaSelect.value = 'General';
    tipo = 'ingreso';
    tipoToggleBtn.textContent = 'Ingreso';
    tipoToggleBtn.classList.remove('tipo-gasto');
    tipoToggleBtn.classList.add('tipo-ingreso');
  } catch (error) {
    errorTransaccion.textContent = 'Error guardando datos: ' + error.message;
  }
}

function cargarTransacciones() {
  const uid = auth.currentUser.uid;
  db.collection('usuarios').doc(uid)
    .collection('transacciones')
    .orderBy('fecha', 'desc')
    .onSnapshot(snapshot => {
      transacciones = [];
      snapshot.forEach(doc => {
        transacciones.push({ id: doc.id, ...doc.data() });
      });
      mostrarTransacciones();
    });
}

function editarTransaccion(id) {
  const tx = transacciones.find(t => t.id === id);
  if (!tx) return;

  descripcionInput.value = tx.descripcion;
  montoInput.value = tx.monto;
  categoriaSelect.value = tx.categoria;
  tipo = tx.tipo;

  tipoToggleBtn.textContent = tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
  tipoToggleBtn.classList.toggle('tipo-ingreso', tipo === 'ingreso');
  tipoToggleBtn.classList.toggle('tipo-gasto', tipo === 'gasto');

  editandoId = id;
  tipoToggleBtn.disabled = true;
}

async function eliminarTransaccion(id) {
  if (!confirm('¿Eliminar esta transacción?')) return;

  const uid = auth.currentUser.uid;
  try {
    await db.collection('usuarios').doc(uid)
      .collection('transacciones').doc(id).delete();
  } catch (error) {
    alert('Error al eliminar: ' + error.message);
  }
}

async function login() {
  errorLogin.textContent = '';
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    errorLogin.textContent = 'Ingresa correo y contraseña.';
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    errorLogin.textContent = error.message;
  }
}

async function register() {
  errorLogin.textContent = '';
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    errorLogin.textContent = 'Ingresa correo y contraseña.';
    return;
  }

  try {
    await auth.createUserWithEmailAndPassword(email, password);
  } catch (error) {
    errorLogin.textContent = error.message;
  }
}

async function logout() {
  await auth.signOut();
}

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.classList.add('oculto');
    appContainer.classList.remove('oculto');
    cargarTransacciones();
  } else {
    loginContainer.classList.remove('oculto');
    appContainer.classList.add('oculto');
    transacciones = [];
    mostrarTransacciones();
  }
});
