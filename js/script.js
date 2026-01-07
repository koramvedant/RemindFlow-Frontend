// ================== Pages ================== //

// 1️⃣ Landing Page
const landingPage = `
  <header class="header">
    <div class="container">
      <h1 class="logo">RemindMe</h1>
      <nav class="nav">
        <a href="#" id="toLoginHeader">Login</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="container hero-content">
      <h2>Never Miss a Payment or Reminder Again</h2>
      <p>Centralized space to manage invoices, reminders, and notifications efficiently.</p>
      <button id="startBtn" class="btn btn-primary">Get Started</button>
    </div>
  </section>
`;

// 2️⃣ Login Page
const loginPage = `
  <div class="login-container">
    <h2>Login</h2>
    <div class="input-group">
      <label>Email</label>
      <input type="email" placeholder="Enter your email" id="email"/>
    </div>
    <div class="input-group">
      <label>Password</label>
      <input type="password" placeholder="Enter your password" id="password"/>
    </div>
    <button id="loginBtn">Login</button>
    <p style="text-align:center; margin-top:12px;">
      Don't have an account? <a href="#" id="toLanding">Go Back</a>
    </p>
  </div>
`;

// 3️⃣ Dashboard Page (placeholder)
const dashboardPage = `
  <div class="dashboard-container">
    <header class="header">
      <div class="container">
        <h1 class="logo">RemindMe</h1>
        <nav class="nav">
          <a href="#" id="logoutBtn">Logout</a>
        </nav>
      </div>
    </header>
    <main class="container" style="padding: 40px 0;">
      <h2>Welcome to your Dashboard!</h2>
      <p>This is where you will see your reminders, invoices, and analytics.</p>
    </main>
  </div>
`;

// ================== Functions ================== //

// Render a page inside #app
function renderPage(pageHTML) {
  document.getElementById('app').innerHTML = pageHTML;
}

// ================== Initial Load ================== //
renderPage(landingPage);

// ================== Event Delegation ================== //
document.addEventListener('click', (e) => {
  // From Landing → Login
  if (e.target.id === 'startBtn' || e.target.id === 'toLoginHeader') {
    renderPage(loginPage);
  }

  // From Login → Dashboard (fake login)
  if (e.target.id === 'loginBtn') {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (email && password) {
      renderPage(dashboardPage);
    } else {
      alert('Please enter email and password');
    }
  }

  // From Login → Landing
  if (e.target.id === 'toLanding') {
    renderPage(landingPage);
  }

  // From Dashboard → Logout → Landing
  if (e.target.id === 'logoutBtn') {
    renderPage(landingPage);
  }
});
