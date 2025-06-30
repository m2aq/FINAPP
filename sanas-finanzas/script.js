// Configuración Firebase (pon tus datos aquí)
const firebaseConfig = {
  apiKey: "tu_apiKey",
  authDomain: "tu_authDomain.firebaseapp.com",
  projectId: "tu_projectId",
  storageBucket: "tu_storageBucket.appspot.com",
  messagingSenderId: "tu_messagingSenderId",
  appId: "tu_appId"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Obtener elementos DOM
const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const errorLogin = document.getElementById('errorLogin');

// Función para iniciar sesión (debe estar global)
function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  errorLogin.textContent = '';

  if (!email || !password) {
    errorLogin.textContent = 'Por favor, completa correo y contraseña.';
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      emailInput.value = '';
      passwordInput.value = '';
      errorLogin.textContent = '';
    })
    .catch(error => {
      errorLogin.textContent = 'Error: ' + error.message;
    });
}

// Función para registrar nuevo usuario (global)
function register() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  errorLogin.textContent = '';

  if (!email || !password) {
    errorLogin.textContent = 'Por favor, completa correo y contraseña.';
    return;
  }
  if (password.length < 6) {
    errorLogin.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      emailInput.value = '';
      passwordInput.value = '';
      errorLogin.textContent = '';
    })
    .catch(error => {
      errorLogin.textContent = 'Error: ' + error.message;
    });
}

// Función para cerrar sesión (global)
function logout() {
  auth.signOut()
    .then(() => {
      errorLogin.textContent = '';
    })
    .catch(error => {
      errorLogin.textContent = 'Error: ' + error.message;
    });
}

// Escuchar estado de autenticación
auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.classList.add('oculto');
    appContainer.classList.remove('oculto');
  } else {
    loginContainer.classList.remove('oculto');
    appContainer.classList.add('oculto');
  }
});
