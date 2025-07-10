document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Credenciales quemadas para la demostración
        const validEmail = 'a@a.aaa';
        const validPassword = 'aaaaaa';

        if (email === validEmail && password === validPassword) {
            // Simular almacenamiento de sesión
            localStorage.setItem('isLoggedIn', 'true');
            // Redirigir a la página principal
            window.location.href = 'index.html';
        } else {
            errorMessage.textContent = 'Correo o contraseña incorrectos.';
            // Limpiar el mensaje de error después de 3 segundos
            setTimeout(() => {
                errorMessage.textContent = '';
            }, 3000);
        }
    });
});