// Authentication handler for login.html
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const authAlert = document.getElementById('authAlert');
  const btnQuickDemo = document.getElementById('btnQuickDemo');

  function showAlert(message, type = 'danger') {
    authAlert.className = `alert alert-${type} d-block`;
    authAlert.innerHTML = message;
    authAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    authAlert.className = 'alert d-none';
    authAlert.innerHTML = '';
  }

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          showAlert(data.error || 'Failed to sign in. Please verify credentials.');
          return;
        }

        showAlert('Sign-in successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 600);
      } catch (err) {
        console.error('Login error:', err);
        showAlert('Network error connecting to the server. Is the application running?');
      }
    });
  }

  // Handle Registration Submission
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const full_name = document.getElementById('regFullName').value.trim();
      const username = document.getElementById('regUsername').value.trim();
      const password = document.getElementById('regPassword').value;

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name, username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          showAlert(data.error || 'Failed to create account.');
          return;
        }

        showAlert('Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 600);
      } catch (err) {
        console.error('Registration error:', err);
        showAlert('Network error connecting to the server.');
      }
    });
  }

  // Quick Demo Account Helper (College Presentation)
  if (btnQuickDemo) {
    btnQuickDemo.addEventListener('click', async () => {
      hideAlert();
      btnQuickDemo.disabled = true;
      btnQuickDemo.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Preparing demo...';

      const demoUser = {
        username: 'student',
        full_name: 'Student Demo User',
        password: 'password123'
      };

      try {
        // Try to log in first
        let loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: demoUser.username, password: demoUser.password })
        });

        // If not found, register it
        if (!loginRes.ok) {
          await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(demoUser)
          });

          loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: demoUser.username, password: demoUser.password })
          });
        }

        if (loginRes.ok) {
          showAlert('Signed into demo account! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 500);
        } else {
          showAlert('Could not sign in with demo account. Please try registering manually.');
          btnQuickDemo.disabled = false;
          btnQuickDemo.innerHTML = '<i class="bi bi-lightning-charge-fill text-warning me-1"></i> Quick Demo Sign-in';
        }
      } catch (err) {
        console.error('Demo login error:', err);
        showAlert('Connection error. Please ensure the server is running.');
        btnQuickDemo.disabled = false;
        btnQuickDemo.innerHTML = '<i class="bi bi-lightning-charge-fill text-warning me-1"></i> Quick Demo Sign-in';
      }
    });
  }
});
