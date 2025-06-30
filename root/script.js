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

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.classList.add("oculto");
    appContainer.classList.remove("oculto");
    cargarDatos();
  } else {
    loginContainer.classList.remove("oculto");
    appContainer.classList.add("oculto");
  }
});

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password).catch(alert);
}

function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password).catch(alert);
}

function logout() {
  auth.signOut();
}

function agregarTransaccion() {
  const descripcion = document.getElementById("descripcion").value;
  const monto = parseFloat(document.getElementById("monto").value);
  const tipo = document.getElementById("tipo").value;
  const categoria = document.getElementById("categoria").value;
  const fecha = new Date().toISOString();

  const user = auth.currentUser;
  if (!user) return;

  db.collection("usuarios").doc(user.uid).collection("movimientos").add({
    descripcion, monto, tipo, categoria, fecha
  }).then(() => {
    cargarDatos();
  });
}

function cargarDatos() {
  const user = auth.currentUser;
  if (!user) return;

  const lista = document.getElementById("lista");
  const balanceElem = document.getElementById("balance");
  lista.innerHTML = "";
  let total = 0;

  db.collection("usuarios").doc(user.uid).collection("movimientos")
    .orderBy("fecha", "desc")
    .get().then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        const li = document.createElement("li");
        li.textContent = `${d.fecha.slice(0,10)} - ${d.tipo.toUpperCase()}: ${d.descripcion} [$${d.monto}] (${d.categoria})`;
        lista.appendChild(li);
        total += d.tipo === "ingreso" ? d.monto : -d.monto;
      });
      balanceElem.textContent = `$${total.toFixed(2)}`;
    });
}