document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const createAccountLink = document.getElementById('create-account-link');

    // Get Firebase Auth instance
    const auth = firebase.auth();

    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in, redirect to dashboard
            window.location.href = 'index.html';
        }
    });

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Sign in with Firebase
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in successfully
                // No need to set localStorage, onAuthStateChanged will handle redirect
                console.log('User signed in:', userCredential.user.email);
            })
            .catch((error) => {
                // Handle errors
                let message = '';
                switch (error.code) {
                    case 'auth/invalid-email':
                        message = 'El formato del correo electrónico es inválido.';
                        break;
                    case 'auth/user-disabled':
                        message = 'El usuario ha sido deshabilitado.';
                        break;
                    case 'auth/user-not-found':
                        message = 'No existe un usuario con este correo electrónico.';
                        break;
                    case 'auth/wrong-password':
                        message = 'La contraseña es incorrecta.';
                        break;
                    default:
                        message = 'Error de autenticación. Por favor, inténtalo de nuevo.';
                        break;
                }
                errorMessage.textContent = message;
                setTimeout(() => {
                    errorMessage.textContent = '';
                }, 5000);
            });
    });

    createAccountLink.addEventListener('click', function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            errorMessage.textContent = 'Por favor, ingresa un correo y contraseña para crear una cuenta.';
            setTimeout(() => {
                errorMessage.textContent = '';
            }, 5000);
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('User created:', userCredential.user.email);
                alert('Cuenta creada exitosamente. ¡Ahora puedes iniciar sesión!');
                // Optionally, sign in the user directly or redirect
            })
            .catch((error) => {
                let message = '';
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        message = 'El correo electrónico ya está en uso.';
                        break;
                    case 'auth/invalid-email':
                        message = 'El formato del correo electrónico es inválido.';
                        break;
                    case 'auth/weak-password':
                        message = 'La contraseña debe tener al menos 6 caracteres.';
                        break;
                    default:
                        message = 'Error al crear la cuenta. Por favor, inténtalo de nuevo.';
                        break;
                }
                errorMessage.textContent = message;
                setTimeout(() => {
                    errorMessage.textContent = '';
                }, 5000);
            });
    });

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sanas-finanzas/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});