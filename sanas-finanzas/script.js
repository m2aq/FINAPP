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

const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const balanceElem = document.getElementById('balance');
const lista = document.getElementById('lista');
const ctx = document.getElementById('grafico').getContext('2d');

let chart;

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.classList.add('oculto');
    appContainer.classList.remove('oculto');
    cargarDatos();
  } else {
    loginContainer.classList.remove('oculto');
    appContainer.classList.add('oculto');
  }
});

function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  auth.signInWithEmailAndPassword(email, password).catch(alert);
}

function register() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  auth.createUserWithEmailAndPassword(email, password).catch(alert);
}

function logout() {
  auth.signOut();
}

function agregarTransaccion() {
  const descripcion = document.getElementById('descripcion').value.trim();
  const monto = parseFloat(document.getElementById('monto').value);
  const tipo = document.getElementById('tipo').value;
  const categoria = document.getElementById('categoria').value;
  const fecha = new Date();

  if (!descripcion || isNaN(monto)) {
    alert('Por favor, completa la descripción y un monto válido.');
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  db.collection('usuarios').doc(user.uid).collection('movimientos').add({
    descripcion,
    monto,
    tipo,
    categoria,
    fecha: fecha.toISOString()
  }).then(() => {
    cargarDatos();
    document.getElementById('descripcion').value = '';
    document.getElementById('monto').value = '';
  }).catch(err => alert('Error al agregar transacción: ' + err.message));
}

function cargarDatos() {
  const user = auth.currentUser;
  if (!user) return;

  lista.innerHTML = '';
  let total = 0;
  const ingresosPorMes = {};
  const gastosPorMes = {};

  db.collection('usuarios').doc(user.uid).collection('movimientos')
    .orderBy('fecha', 'desc')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        const fecha = new Date(d.fecha);
        const mesKey = fecha.getFullYear() + '-' + (fecha.getMonth() + 1);

        // Lista de transacciones
        const li = document.createElement('li');
        li.textContent = `${fecha.toISOString().slice(0,10)} - ${d.tipo.toUpperCase()}: ${d.descripcion} [$${d.monto}] (${d.categoria})`;
        lista.appendChild(li);

        // Suma total para balance
        total += d.tipo === 'ingreso' ? d.monto : -d.monto;

        // Agregar a resumen mensual
        if (d.tipo === 'ingreso') {
          ingresosPorMes[mesKey] = (ingresosPorMes[mesKey] || 0) + d.monto;
        } else {
          gastosPorMes[mesKey] = (gastosPorMes[mesKey] || 0) + d.monto;
        }
      });

      balanceElem.textContent = `$${total.toFixed(2)}`;
      actualizarGrafico(ingresosPorMes, gastosPorMes);
    }).catch(err => alert('Error al cargar datos: ' + err.message));
}

function actualizarGrafico(ingresos, gastos) {
  const meses = Array.from(new Set([...Object.keys(ingresos), ...Object.keys(gastos)])).sort();
  const ingresosData = meses.map(m => ingresos[m] || 0);
  const gastosData = meses.map(m => gastos[m] || 0);

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        {
          label: 'Ingresos',
          data: ingresosData,
          backgroundColor: 'rgba(40, 167, 69, 0.7)'
        },
        {
          label: 'Gastos',
          data: gastosData,
          backgroundColor: 'rgba(220, 53, 69, 0.7)'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
