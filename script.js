window.API_BASE = window.API_BASE || ((window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' && window.location.port !== '3000') ? 'http://localhost:3000/api' : '/api');
document.addEventListener('DOMContentLoaded', () => {
    const toggleLink = document.getElementById('toggle-link');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('visible-submit');
    const actionInput = document.getElementById('action');
    const togglePrefix = document.getElementById('toggle-prefix');
    const messageDiv = document.getElementById('message');
    const form = document.getElementById('auth-form');

    let isLogin = true;

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        messageDiv.textContent = '';
        isLogin = !isLogin;

        if (isLogin) {
            formTitle.textContent = 'Sign in to your Lifeline account';
            submitBtn.textContent = 'Sign in';
            actionInput.value = 'login';
            togglePrefix.textContent = "Don't have an account? ";
            toggleLink.textContent = "Sign Up";
        } else {
            formTitle.textContent = 'Sign Up for a Lifeline account';
            submitBtn.textContent = 'Sign Up';
            actionInput.value = 'signup';
            togglePrefix.textContent = "Already have an account? ";
            toggleLink.textContent = "Sign in";
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.textContent = 'Processing...';
        messageDiv.style.color = '#fff';

        const loginId = document.getElementById('loginId').value.trim();
        const password = document.getElementById('password').value;
        const action = isLogin ? 'login' : 'signup';

        try {
            const response = await fetch(`${window.API_BASE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, loginId, password })
            });

            const result = await response.json();

            messageDiv.textContent = result.message;
            messageDiv.style.color = result.success ? '#90EE90' : '#FFB6C1';

            if (result.success) {
                // Store user detail
                localStorage.setItem('userEmail', loginId);

                // Redirect on both successful login and signup
                window.location.href = 'patientList.html';
            }
        } catch (error) {
            messageDiv.textContent = 'Could not connect to to the local backend. Make sure to run node server.js.';
            messageDiv.style.color = '#FFB6C1';
            console.error(error);
        }
    });
});