// Configuración Firebase (usa tu propia configuración)
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

const btnIngreso = document.getElementById('btnIngreso');
const btnGasto = document.getElementById('btnGasto');
const montoInput = document.getElementById('monto');
const descripcionInput = document.getElementById('descripcion');
const categoriaSelect = document.getElementById('categoria');
const errorTransaccion = document.getElementById('error-transaccion');
const lista = document.getElementById('lista');

const totalIngresosEl = document.getElementById('total-ingresos');
const totalGastosEl = document.getElementById('total-gastos');

let tipo = 'ingreso'; // por defecto
let transacciones = [];
let editandoId = null;

// Botones ingreso/gasto: alternar estado y colores
btnIngreso.onclick = () => {
  tipo = 'ingreso';
  btnIngreso.classList.remove('inactivo');
  btnGasto.classList.add('inactivo');
  montoInput.style.borderColor = '#28a745';
  montoInput.style.boxShadow = '0 0 6px #28a745aa';
};

btnGasto.onclick = () => {
  tipo = 'gasto';
  btnGasto.classList.remove('inactivo');
  btnIngreso.classList.add('inactivo');
  montoInput.style.borderColor = '#dc3545';
  montoInput.style.boxShadow = '0 0 6px #dc3545aa';
};

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

    const botonesDiv = document.createElement('div');
    botonesDiv.className = 'movimiento-botones';

    const btnEditar = document.createElement('button');
    btnEditar.className = 'editar-btn';
    btnEditar.textContent = '✏️';
    btnEditar.title = 'Editar';
    btnEditar.onclick = () => editarTransaccion(tx.id);

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'eliminar-btn';
    btnEliminar.textContent = '❌';
    btnEliminar.title = 'Eliminar';
    btnEliminar.onclick = () => eliminarTransaccion(tx.id);

    botonesDiv.appendChild(btnEditar);
    botonesDiv.appendChild(btnEliminar);

    li.appendChild(texto);
    li.appendChild(botonesDiv);

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

  // Actualiza balance grande y color
  const balanceGrande = document.getElementById('balance-grande');
  balanceGrande.textContent = formatearMoneda(balance);
  balanceGrande.style.color = balance >= 0 ? '#28a745' : '#dc3545';
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
    } else {
      await db.collection('usuarios').doc(uid)
        .collection('transacciones').add(transaccion);
    }

    descripcionInput.value = '';
    montoInput.value = '';
    categoriaSelect.value = 'General';
    tipo = 'ingreso';
    btnIngreso.classList.remove('inactivo');
    btnGasto.classList.add('inactivo');
    montoInput.style.borderColor = '#28a745';
    montoInput.style.boxShadow = '0 0 6px #28a745aa';

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

  if (tipo === 'ingreso') {
    btnIngreso.classList.remove('inactivo');
    btnGasto.classList.add('inactivo');
    montoInput.style.borderColor = '#28a745';
    montoInput.style.boxShadow = '0 0 6px #28a745aa';
  } else {
    btnGasto.classList.remove('inactivo');
    btnIngreso.classList.add('inactivo');
    montoInput.style.borderColor = '#dc3545';
    montoInput.style.boxShadow = '0 0 6px #dc3545aa';
  }

  editandoId = id;
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
