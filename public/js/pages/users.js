// ─── USER MANAGEMENT PAGE ──────────────────────────────
window.Pages = window.Pages || {};
Pages.users = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner('Loading users...');

  try {
    const users = await api.get('/users');

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>User Management</h2>
        <p>Manage system access, user credentials and role assignments</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openAddUser()">+ Create User</button>
      </div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-input search-input" id="user-search" placeholder="Search by name, username or role..." oninput="filterUsers(this.value)" />
        </div>
        <select class="form-select" id="user-role-filter" onchange="filterUsers()" style="max-width:180px">
          <option value="">All Roles</option>
          <option value="admin">Administrator</option>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="receptionist">Receptionist</option>
          <option value="lab_staff">Lab Technician</option>
          <option value="pharmacist">Pharmacist</option>
          <option value="accountant">Accountant</option>
        </select>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            ${users.map(u => renderUserRow(u)).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

    window._allUsers = users;
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading users</div><p>${e.message}</p></div>`;
  }
};

function renderUserRow(u) {
  const roleDisplay = RBAC.getRoleDisplay(u.role);
  const isSelf = App.user && App.user.id === u.id;

  return `
  <tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="avatar" style="background:var(--primary)">${(u.full_name||'U')[0].toUpperCase()}</div>
        <div>
          <div class="font-semibold">${u.full_name} ${isSelf ? '<span class="badge badge-info" style="font-size:10px;margin-left:4px">You</span>' : ''}</div>
          <div class="text-xs text-muted">${u.email || 'No email'}</div>
        </div>
      </div>
    </td>
    <td><code style="font-size:12px;background:var(--surface-2);padding:2px 6px;border-radius:4px">${u.username}</code></td>
    <td><span class="badge badge-primary">${roleDisplay}</span></td>
    <td>${u.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
    <td class="text-xs text-muted">${formatDate(u.created_at)}</td>
    <td>
      <div class="table-actions">
        <button class="btn btn-outline btn-sm" onclick="openEditUser(${u.id})">Edit</button>
        ${!isSelf ? `<button class="btn btn-ghost btn-sm text-danger" onclick="toggleUserActive(${u.id}, ${u.is_active})">${u.is_active ? 'Deactivate' : 'Activate'}</button>` : ''}
      </div>
    </td>
  </tr>`;
}

function filterUsers(search = '') {
  const s = (search || document.getElementById('user-search')?.value || '').toLowerCase();
  const roleFilter = document.getElementById('user-role-filter')?.value;

  const filtered = (window._allUsers || []).filter(u => {
    const matchSearch = !s || u.full_name.toLowerCase().includes(s) || u.username.toLowerCase().includes(s) || u.role.toLowerCase().includes(s);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const tbody = document.getElementById('users-tbody');
  if (tbody) {
    tbody.innerHTML = filtered.length ? filtered.map(u => renderUserRow(u)).join('') : emptyState('👤', 'No users found');
  }
}

function openAddUser() {
  const body = `
  <form id="user-form">
    <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" name="full_name" required placeholder="e.g. Dr. Sarah Jenkins" /></div>
    <div class="form-row mt-3">
      <div class="form-group"><label class="form-label">Username *</label><input class="form-input" name="username" required placeholder="e.g. sjenkins" /></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" placeholder="sjenkins@hospital.com" /></div>
    </div>
    <div class="form-row mt-3">
      <div class="form-group"><label class="form-label">Password *</label><input class="form-input" type="password" name="password" required minlength="6" /></div>
      <div class="form-group"><label class="form-label">Role *</label>
        <select class="form-select" name="role" required>
          <option value="admin">Administrator</option>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="receptionist">Receptionist</option>
          <option value="lab_staff">Lab Technician</option>
          <option value="pharmacist">Pharmacist</option>
          <option value="accountant">Accountant</option>
        </select>
      </div>
    </div>
  </form>`;

  Modal.open('Create System User', body,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitUserForm()">Create User</button>`
  );
}

async function openEditUser(id) {
  Modal.open('Edit User', loadingSpinner());
  try {
    const user = await api.get(`/users/${id}`);
    const body = `
    <form id="user-form">
      <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" name="full_name" value="${user.full_name}" required /></div>
      <div class="form-row mt-3">
        <div class="form-group"><label class="form-label">Username</label><input class="form-input" value="${user.username}" disabled /></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" value="${user.email || ''}" /></div>
      </div>
      <div class="form-row mt-3">
        <div class="form-group"><label class="form-label">New Password (leave blank to keep)</label><input class="form-input" type="password" name="password" placeholder="••••••••" /></div>
        <div class="form-group"><label class="form-label">Role *</label>
          <select class="form-select" name="role" required>
            <option value="admin" ${user.role==='admin'?'selected':''}>Administrator</option>
            <option value="doctor" ${user.role==='doctor'?'selected':''}>Doctor</option>
            <option value="nurse" ${user.role==='nurse'?'selected':''}>Nurse</option>
            <option value="receptionist" ${user.role==='receptionist'?'selected':''}>Receptionist</option>
            <option value="lab_staff" ${user.role==='lab_staff'?'selected':''}>Lab Technician</option>
            <option value="pharmacist" ${user.role==='pharmacist'?'selected':''}>Pharmacist</option>
            <option value="accountant" ${user.role==='accountant'?'selected':''}>Accountant</option>
          </select>
        </div>
      </div>
    </form>`;

    Modal.open(`Edit User — ${user.full_name}`, body,
      `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="submitUserForm(${id})">Save Changes</button>`
    );
  } catch(e) {
    toast('error', 'Error loading user', e.message);
  }
}

async function submitUserForm(id = null) {
  const form = document.getElementById('user-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    if (id) {
      await api.put(`/users/${id}`, data);
      toast('success', 'User updated successfully');
    } else {
      await api.post('/users', data);
      toast('success', 'User created successfully');
    }
    Modal.close();
    Pages.users();
  } catch(e) {
    toast('error', 'Failed to save user', e.message);
  }
}

async function toggleUserActive(id, currentStatus) {
  const action = currentStatus ? 'deactivate' : 'activate';
  confirmAction('Toggle User Access', `Are you sure you want to ${action} this account?`, async () => {
    try {
      if (currentStatus) {
        await api.delete(`/users/${id}`);
      } else {
        await api.put(`/users/${id}`, { is_active: 1 });
      }
      toast('success', `User ${action}d`);
      Pages.users();
    } catch(e) {
      toast('error', 'Action failed', e.message);
    }
  });
}
