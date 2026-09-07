// ─── MAIN SPA ROUTER, PORTALS & APP SHELL ─────────────

const App = {
  user: null,
  currentPage: null,

  init() {
    // Check auth status
    const token = api.getToken();
    if (token) {
      const userStr = localStorage.getItem('hms_user');
      if (userStr) {
        try { this.user = JSON.parse(userStr); } catch(e) {}
      }
    }

    // Routing listeners for hash changes and browser back/forward buttons
    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('popstate', () => this.route());

    if (token && !this.user) {
      this.verifyToken();
    } else {
      this.route();
    }
  },

  async verifyToken() {
    try {
      const user = await api.get('/auth/me');
      this.user = user;
      localStorage.setItem('hms_user', JSON.stringify(user));
      this.route();
    } catch (e) {
      api.clearToken();
      this.user = null;
      this.showPortalSelector();
    }
  },

  // 1. RENDER 4 LOGIN PORTALS SELECTOR WITH VIDEO BG
  showPortalSelector() {
    if (window.location.hash !== '#portals') {
      window.location.hash = 'portals';
    }
    const root = document.getElementById('app-root');
    root.innerHTML = `
    <div class="portal-screen">
      <div class="portal-video-wrap">
        <video class="portal-video" autoplay muted loop playsinline>
          <source src="https://videos.pexels.com/video-files/7578808/7578808-hd_1920_1080_30fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/3195394/3195394-hd_1280_720_25fps.mp4" type="video/mp4" />
        </video>
        <div class="portal-video-overlay"></div>
      </div>

      <div class="portal-header">
        <div class="portal-logo-wrap">
          <div class="portal-logo-icon">+</div>
          <div>
            <div class="portal-logo-title">MediCare Hospital</div>
            <div class="portal-logo-sub">Enterprise Healthcare Management System</div>
          </div>
        </div>
      </div>

      <div class="portal-container">
        <div class="portal-title-area">
          <h1>Select Access Portal</h1>
          <p>Choose your department portal to sign in to your role dashboard</p>
        </div>

        <div class="portal-cards-grid">
          ${Object.values(RBAC.PORTALS).map(p => `
          <div class="portal-card" onclick="App.showPortalLogin('${p.id}')">
            <div class="portal-card-badge" style="background:${p.color}">${p.badge}</div>
            <div class="portal-card-icon" style="background:${p.gradient}">
              ${RBAC.icon(p.icon, 'portal-svg')}
            </div>
            <div class="portal-card-name">${p.name}</div>
            <div class="portal-card-sub">${p.subtitle}</div>
            <div class="portal-card-desc">${p.description}</div>
            <div class="portal-card-roles">
              ${p.roles.map(r => `<span class="portal-role-tag">${RBAC.getRoleDisplay(r)}</span>`).join('')}
            </div>
            <div class="portal-card-btn" style="color:${p.color}">
              <span>Enter Portal</span>
              <span class="portal-arrow">→</span>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  },

  // 2. RENDER SELECTED PORTAL LOGIN FORM WITH VIDEO BG & BACK BUTTON
  showPortalLogin(portalId) {
    if (window.location.hash !== `#login-${portalId}`) {
      window.location.hash = `login-${portalId}`;
    }
    const portal = RBAC.PORTALS[portalId] || RBAC.PORTALS.admin;
    const root = document.getElementById('app-root');

    root.innerHTML = `
    <div class="portal-login-screen">
      <div class="portal-video-wrap">
        <video class="portal-video" autoplay muted loop playsinline>
          <source src="https://videos.pexels.com/video-files/7578808/7578808-hd_1920_1080_30fps.mp4" type="video/mp4" />
        </video>
        <div class="portal-video-overlay"></div>
      </div>

      <div class="portal-login-card">
        <!-- BACK BUTTON TO PORTAL SELECTOR -->
        <button class="btn btn-outline btn-sm portal-back-btn" onclick="App.showPortalSelector()" style="margin-bottom:20px">
          ← Back to All Portals
        </button>

        <div class="portal-login-header">
          <div class="portal-login-icon" style="background:${portal.gradient}">
            ${RBAC.icon(portal.icon)}
          </div>
          <div>
            <h2>${portal.name}</h2>
            <p>${portal.subtitle}</p>
          </div>
        </div>

        <div class="divider"></div>

        <form id="login-form" onsubmit="App.handleLogin(event, '${portalId}')">
          <div class="form-group">
            <label class="form-label" for="login-username">Username</label>
            <div class="input-icon-wrap">
              ${RBAC.icon('users', 'input-icon')}
              <input class="form-input input-with-icon" type="text" id="login-username" placeholder="Enter your authorized username" required autocomplete="username" />
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label" for="login-password">Password</label>
            <div class="input-icon-wrap">
              ${RBAC.icon('lock', 'input-icon')}
              <input class="form-input input-with-icon" type="password" id="login-password" placeholder="Enter your secure password" required autocomplete="current-password" />
            </div>
          </div>

          <div id="login-error" class="login-error hidden mt-3" style="background:var(--danger-bg);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:12.5px;font-weight:500;border:1px solid rgba(220,38,38,0.2)"></div>

          <button type="submit" class="btn btn-primary btn-full btn-lg mt-4" id="login-btn" style="background:${portal.gradient}">
            <span>Sign In to ${portal.name}</span>
            <span class="btn-arrow">→</span>
          </button>
        </form>
      </div>
    </div>`;
  },

  async handleLogin(e, portalId) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    errEl.classList.add('hidden');
    btn.textContent = 'Authenticating...';
    btn.disabled = true;

    try {
      const res = await api.post('/auth/login', { username, password });

      // Enforce portal matching: restrict users logging into wrong portal
      const targetPortal = RBAC.PORTALS[portalId];
      if (targetPortal && !targetPortal.roles.includes(res.user.role)) {
        const correctPortalId = RBAC.getPortalForRole(res.user.role);
        const correctPortal = RBAC.PORTALS[correctPortalId];
        throw new Error(`Access Restricted: ${RBAC.getRoleDisplay(res.user.role)} accounts must sign in via the ${correctPortal.name}.`);
      }

      api.setToken(res.token);
      this.user = res.user;
      localStorage.setItem('hms_user', JSON.stringify(res.user));
      window.location.hash = 'dashboard';
      this.showAppShell();
    } catch (err) {
      errEl.textContent = err.message || 'Invalid username or password';
      errEl.classList.remove('hidden');
      btn.textContent = `Sign In to ${RBAC.PORTALS[portalId]?.name || 'Portal'}`;
      btn.disabled = false;
    }
  },

  // 3. RENDER DYNAMIC ROLE-BASED APP SHELL
  showAppShell() {
    const role = this.user.role || 'admin';
    const roleName = RBAC.getRoleDisplay(role);
    const navConfig = RBAC.getNav(role);
    const portal = RBAC.PORTALS[RBAC.getPortalForRole(role)];

    const root = document.getElementById('app-root');
    root.innerHTML = `
    <div class="app">
      <!-- SIDEBAR -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo" style="background:${portal.gradient}">
            <span class="sidebar-plus">+</span>
          </div>
          <div class="sidebar-brand">
            <span class="brand-name">MediCare Hospital</span>
            <span class="brand-tag" style="color:${portal.color}">${portal.name.split(' ')[0]}</span>
          </div>
          <button class="sidebar-toggle" id="sidebar-toggle" onclick="App.toggleSidebar()">☰</button>
        </div>

        <nav class="sidebar-nav">
          ${navConfig.map(group => `
          <div class="nav-group">
            <span class="nav-group-label">${group.group}</span>
            ${group.items.map(item => `
            <a href="#${item.id}" class="nav-item" data-page="${item.id}" id="nav-${item.id}">
              ${RBAC.icon(item.icon, 'nav-icon')}
              <span class="nav-label">${item.label}</span>
            </a>`).join('')}
          </div>`).join('')}
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar user-avatar-outline" style="background:${portal.gradient};color:#ffffff">${RBAC.getRoleAvatar(role, 20)}</div>
            <div class="user-details">
              <div class="user-name">${this.user.full_name || this.user.username}</div>
              <div class="user-role">${roleName}</div>
            </div>
          </div>
          <button class="btn-logout" onclick="App.logout()" title="Logout / Switch Portal">⏻</button>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="main-content">
        <header class="topbar">
          <div class="topbar-left">
            <button class="topbar-menu-btn" onclick="App.toggleSidebar()">☰</button>
            <div class="topbar-breadcrumb" id="page-title">Dashboard</div>
          </div>
          <div class="topbar-right">
            <button class="btn btn-ghost btn-sm" onclick="App.logout()" title="Switch Access Portal">
              ← Switch Portal
            </button>
            <div class="topbar-time" id="topbar-time"></div>
            <div class="topbar-user" onclick="App.navigate('profile')">
              <div class="topbar-avatar topbar-avatar-outline" style="background:${portal.gradient};color:#ffffff">${RBAC.getRoleAvatar(role, 18)}</div>
              <span id="topbar-username">${this.user.full_name || this.user.username}</span>
              <span class="badge badge-primary" style="background:${portal.color}15;color:${portal.color};border-color:${portal.color}30">${roleName}</span>
            </div>
          </div>
        </header>

        <div class="page-content" id="page-content"></div>
      </main>
    </div>

    <!-- MODAL CONTAINER -->
    <div class="modal-overlay hidden" id="modal-overlay">
      <div class="modal" id="modal">
        <div class="modal-header">
          <h3 class="modal-title" id="modal-title">Modal</h3>
          <button class="modal-close" onclick="Modal.close()">✕</button>
        </div>
        <div class="modal-body" id="modal-body"></div>
        <div class="modal-footer" id="modal-footer"></div>
      </div>
    </div>

    <!-- TOAST CONTAINER -->
    <div class="toast-container" id="toast-container"></div>`;

    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.startSessionTimer();

    this.route();
  },

  logout() {
    confirmAction('Sign Out / Switch Portal', 'Are you sure you want to log out and return to portal selection?', async () => {
      try { await api.post('/auth/logout'); } catch(e) {}
      api.clearToken();
      this.user = null;
      this.showPortalSelector();
    });
  },

  route() {
    const rawHash = window.location.hash.replace('#', '') || '';

    // If on portal selector screen hash
    if (rawHash === 'portals' || (!this.user && !rawHash.startsWith('login-'))) {
      if (!document.querySelector('.portal-screen')) {
        this.showPortalSelector();
      }
      return;
    }

    // If on portal login screen hash
    if (rawHash.startsWith('login-')) {
      const pId = rawHash.replace('login-', '');
      if (!document.querySelector('.portal-login-screen')) {
        this.showPortalLogin(pId);
      }
      return;
    }

    // If logged out trying to access app page
    if (!this.user) {
      this.showPortalSelector();
      return;
    }

    // Ensure App Shell is mounted
    if (!document.getElementById('page-content')) {
      this.showAppShell();
      return;
    }

    const hash = rawHash || 'dashboard';
    const role = this.user.role || 'admin';

    // Verify RBAC access
    if (!RBAC.canAccess(role, hash)) {
      toast('warning', 'Access Restricted', `Your role (${RBAC.getRoleDisplay(role)}) does not have permission to view that module.`);
      window.location.hash = '#dashboard';
      return;
    }

    const pages = {
      dashboard:   { label: 'Dashboard', fn: () => Pages.dashboard() },
      patients:    { label: 'Patients Directory', fn: () => Pages.patients() },
      doctors:     { label: 'Doctor Management', fn: () => Pages.doctors() },
      appointments:{ label: 'Appointments', fn: () => Pages.appointments() },
      emr:         { label: 'Electronic Medical Records', fn: () => Pages.emr() },
      admissions:  { label: 'Inpatient & Admissions', fn: () => Pages.admissions() },
      lab:         { label: 'Laboratory Services', fn: () => Pages.lab() },
      pharmacy:    { label: 'Pharmacy & Dispensary', fn: () => Pages.pharmacy() },
      billing:     { label: 'Billing & Invoicing', fn: () => Pages.billing() },
      staff:       { label: 'Staff Management', fn: () => Pages.staff() },
      users:       { label: 'User Management', fn: () => Pages.users() },
      reports:     { label: 'Reports & Analytics', fn: () => Pages.reports() },
      profile:     { label: 'User Profile & Security', fn: () => this.renderProfilePage() }
    };

    const target = pages[hash] || pages['dashboard'];
    document.getElementById('page-title').textContent = target.label;
    this.currentPage = hash;

    // Update active nav link
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === hash);
    });

    const content = document.getElementById('page-content');
    content.innerHTML = loadingSpinner();
    try {
      target.fn();
    } catch(e) {
      content.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading page</div><p>${e.message}</p></div>`;
    }
  },

  renderProfilePage() {
    const content = document.getElementById('page-content');
    const u = this.user;
    const portal = RBAC.PORTALS[RBAC.getPortalForRole(u.role)] || RBAC.PORTALS.admin;
    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>My Account Profile</h2>
        <p>Manage your login security and personal account information</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">User Information</div></div>
        <div style="display:flex;align-items:center;gap:18px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
          <div style="width:68px;height:68px;border-radius:50%;background:${portal.gradient};display:flex;align-items:center;justify-content:center;color:#ffffff;box-shadow:var(--shadow-sm)">
            ${RBAC.getRoleAvatar(u.role, 32)}
          </div>
          <div>
            <h3 style="margin:0;font-size:18px">${u.full_name || u.username}</h3>
            <span class="badge badge-primary" style="margin-top:4px">${RBAC.getRoleDisplay(u.role)}</span>
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Full Name</div><div class="detail-value font-semibold">${u.full_name || '—'}</div></div>
          <div class="detail-item"><div class="detail-label">Username</div><div class="detail-value"><code>${u.username}</code></div></div>
          <div class="detail-item"><div class="detail-label">System Role</div><div class="detail-value"><span class="badge badge-primary">${RBAC.getRoleDisplay(u.role)}</span></div></div>
          <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${u.email || '—'}</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Change Password</div></div>
        <form id="change-pass-form" onsubmit="App.handleChangePassword(event)">
          <div class="form-group">
            <label class="form-label">Current Password *</label>
            <input class="form-input" type="password" name="current_password" required />
          </div>
          <div class="form-group mt-3">
            <label class="form-label">New Password *</label>
            <input class="form-input" type="password" name="new_password" required minlength="6" />
          </div>
          <button type="submit" class="btn btn-primary mt-4">Update Password</button>
        </form>
      </div>
    </div>`;
  },

  async handleChangePassword(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.put('/users/change-password', data);
      toast('success', 'Password updated successfully');
      e.target.reset();
    } catch(err) {
      toast('error', 'Failed to update password', err.message);
    }
  },

  navigate(page) {
    window.location.hash = page;
  },

  toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
  },

  updateClock() {
    const el = document.getElementById('topbar-time');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    }
  },

  // ─── SESSION TIMEOUT (30 min inactivity) ────────────
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,
  _sessionTimer: null,
  _sessionWarningShown: false,

  startSessionTimer() {
    this.resetSessionTimer();
    const events = ['mousemove','keydown','click','scroll','touchstart'];
    events.forEach(e => document.addEventListener(e, () => this.resetSessionTimer(), { passive: true }));
  },

  resetSessionTimer() {
    if (!this.user) return;
    clearTimeout(this._sessionTimer);
    this._sessionWarningShown = false;
    this._sessionTimer = setTimeout(() => this._handleSessionExpiry(), this.SESSION_TIMEOUT_MS);
  },

  _handleSessionExpiry() {
    if (!this.user) return;
    toast('warning', 'Session Expired', 'You have been logged out due to inactivity.');
    setTimeout(() => {
      api.clearToken();
      this.user = null;
      this.showPortalSelector();
    }, 2000);
  }
};

// Launch
document.addEventListener('DOMContentLoaded', () => App.init());
