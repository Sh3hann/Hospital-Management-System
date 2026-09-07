// ─── STAFF PAGE ──────────────────────────────────────
window.Pages = window.Pages || {};
Pages.staff = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner();

  try {
    const [{ data: employees, total }, depts] = await Promise.all([
      api.get('/staff/employees'),
      api.get('/staff/departments')
    ]);

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Staff Management</h2><p>${total} active employees</p></div>
      <div class="page-header-actions">
        <button class="btn btn-outline" onclick="showStaffTab('attendance')">Mark Attendance</button>
        <button class="btn btn-primary" onclick="openAddEmployee()">+ Add Employee</button>
      </div>
    </div>

    <!-- Department Overview -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
      ${depts.map(d => `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px;display:flex;align-items:center;gap:10px">
        <div class="stat-icon primary" style="width:36px;height:36px;font-size:14px">🏥</div>
        <div>
          <div class="font-semibold" style="font-size:13px">${d.name}</div>
          <div class="text-xs text-muted">${d.doctor_count || 0} doctors</div>
        </div>
      </div>`).join('')}
    </div>

    <div class="tab-nav">
      <button class="tab-btn active" onclick="showStaffTab('employees')">Employees</button>
      <button class="tab-btn" onclick="showStaffTab('attendance')">Attendance</button>
      <button class="tab-btn" onclick="showStaffTab('leave')">Leave Requests</button>
      <button class="tab-btn" onclick="showStaffTab('departments')">Departments</button>
    </div>

    <!-- EMPLOYEES -->
    <div id="staff-employees" class="tab-panel active">
      <div class="card">
        <div class="filter-bar">
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input class="form-input search-input" id="staff-search" placeholder="Search employees..." oninput="filterEmployees(this.value)" />
          </div>
          <select class="form-select" id="staff-dept-filter" onchange="filterEmployees()" style="max-width:170px">
            <option value="">All Departments</option>
            ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Phone</th><th>Join Date</th><th>Actions</th></tr></thead>
            <tbody id="staff-tbody">
              ${employees.map(e => renderEmployeeRow(e)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ATTENDANCE -->
    <div id="staff-attendance" class="tab-panel">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Mark Attendance — ${formatDate(new Date().toISOString())}</div>
        </div>
        <div id="attendance-form-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Role</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead>
            <tbody>
              ${employees.map(e => `
              <tr>
                <td><div class="font-semibold">${e.name}</div></td>
                <td><span class="badge badge-neutral">${e.role}</span></td>
                <td>
                  <select class="form-select" id="att-status-${e.id}" style="max-width:120px">
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">On Leave</option>
                    <option value="half-day">Half Day</option>
                  </select>
                </td>
                <td><input class="form-input" type="time" id="att-in-${e.id}" style="max-width:110px" /></td>
                <td><input class="form-input" type="time" id="att-out-${e.id}" style="max-width:110px" /></td>
              </tr>`).join('')}
            </tbody>
          </table>
          <div style="margin-top:16px;display:flex;justify-content:flex-end">
            <button class="btn btn-primary" onclick="submitBulkAttendance(${JSON.stringify(employees.map(e=>e.id))})">Save Attendance</button>
          </div>
        </div>
      </div>
    </div>

    <!-- LEAVE REQUESTS -->
    <div id="staff-leave" class="tab-panel">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Leave Requests</div>
          <button class="btn btn-outline btn-sm" onclick="openLeaveRequest(${JSON.stringify(employees.map(e=>({id:e.id,name:e.name})))})">+ New Request</button>
        </div>
        <div id="leave-list"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- DEPARTMENTS -->
    <div id="staff-departments" class="tab-panel">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Departments</div>
          <button class="btn btn-primary btn-sm" onclick="openAddDepartment()">+ Add Dept</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Department</th><th>Description</th><th>Doctors</th></tr></thead>
            <tbody>
              ${depts.map(d => `
              <tr>
                <td class="font-semibold">${d.name}</td>
                <td class="text-muted">${d.description||'—'}</td>
                <td><span class="badge badge-primary">${d.doctor_count||0} doctors</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

    window._allEmployees = employees;
    loadLeaveRequests();
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error</div><p>${e.message}</p></div>`;
  }
};

function renderEmployeeRow(e) {
  return `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="avatar">${(e.name||'E')[0]}</div>
        <div>
          <div class="font-semibold">${e.name}</div>
          <div class="text-xs text-muted">${e.email||''}</div>
        </div>
      </div>
    </td>
    <td><span class="badge badge-neutral">${e.role}</span></td>
    <td>${e.department_name||'—'}</td>
    <td>${e.phone||'—'}</td>
    <td>${formatDate(e.join_date)}</td>
    <td>
      <div class="table-actions">
        <button class="btn btn-outline btn-sm" onclick="openEditEmployee(${e.id})">Edit</button>
      </div>
    </td>
  </tr>`;
}

function showStaffTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`staff-${name}`)?.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.getAttribute('onclick').includes(name)) b.classList.add('active');
  });
}

function filterEmployees(search = '') {
  const s = (search || document.getElementById('staff-search')?.value || '').toLowerCase();
  const deptFilter = document.getElementById('staff-dept-filter')?.value;
  const filtered = (window._allEmployees || []).filter(e => {
    const ms = !s || e.name.toLowerCase().includes(s) || (e.role||'').toLowerCase().includes(s);
    const md = !deptFilter || e.department_id == deptFilter;
    return ms && md;
  });
  const tbody = document.getElementById('staff-tbody');
  if (tbody) tbody.innerHTML = filtered.length ? filtered.map(e => renderEmployeeRow(e)).join('') : emptyState('👤', 'No employees found');
}

async function loadLeaveRequests() {
  const el = document.getElementById('leave-list');
  if (!el) return;
  try {
    const { pending_leaves } = await api.get('/reports/staff');
    el.innerHTML = !pending_leaves.length ? emptyState('✅', 'No pending leave requests') :
    `<table><thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${pending_leaves.map(l => `
      <tr>
        <td>${l.employee_name}</td>
        <td>${l.leave_type}</td>
        <td>${formatDate(l.start_date)}</td>
        <td>${formatDate(l.end_date)}</td>
        <td class="truncate" style="max-width:150px">${l.reason||'—'}</td>
        <td>${statusBadge(l.status)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-success btn-sm" onclick="updateLeave(${l.id},'approved')">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="updateLeave(${l.id},'rejected')">Reject</button>
          </div>
        </td>
      </tr>`).join('')}</tbody></table>`;
  } catch(e) { el.innerHTML = emptyState('⚠️', 'Failed to load'); }
}

async function submitBulkAttendance(employeeIds) {
  const today = todayStr();
  let success = 0;
  for (const id of employeeIds) {
    const statusEl = document.getElementById(`att-status-${id}`);
    const inEl = document.getElementById(`att-in-${id}`);
    const outEl = document.getElementById(`att-out-${id}`);
    if (!statusEl) continue;
    try {
      await api.post('/staff/attendance', {
        employee_id: id, date: today,
        status: statusEl.value,
        check_in: inEl?.value || null,
        check_out: outEl?.value || null
      });
      success++;
    } catch(e) {}
  }
  toast('success', `Attendance saved for ${success} employees`);
}

function openAddEmployee() {
  api.get('/staff/departments').then(depts => {
    Modal.open('Add Employee', buildEmployeeForm(null, depts),
      `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="submitEmployeeForm()">Add Employee</button>`
    );
  });
}

async function openEditEmployee(id) {
  Modal.open('Edit Employee', loadingSpinner());
  const [emp, depts] = await Promise.all([api.get(`/staff/employees/${id}`), api.get('/staff/departments').catch(()=>[])]);
  Modal.open(`Edit — ${emp.name}`, buildEmployeeForm(emp, depts),
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitEmployeeForm(${id})">Save Changes</button>`
  );
}

function buildEmployeeForm(e, depts) {
  return `<form id="emp-form">
  <div class="form-row">
    <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" name="name" value="${e?.name||''}" required /></div>
    <div class="form-group"><label class="form-label">Role *</label>
      <select class="form-select" name="role" required>
        <option value="">Select role</option>
        ${['Receptionist','Nurse','Lab Technician','Pharmacist','Accountant','Security','Cleaner','IT Staff','Admin'].map(r => `<option ${e?.role===r?'selected':''}>${r}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Department</label>
      <select class="form-select" name="department_id">
        <option value="">None</option>
        ${depts.map(d => `<option value="${d.id}" ${e?.department_id==d.id?'selected':''}>${d.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Gender</label>
      <select class="form-select" name="gender">
        <option value="">Select</option>
        <option ${e?.gender==='Male'?'selected':''}>Male</option>
        <option ${e?.gender==='Female'?'selected':''}>Female</option>
        <option ${e?.gender==='Other'?'selected':''}>Other</option>
      </select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Phone</label><input class="form-input" name="phone" value="${e?.phone||''}" /></div>
    <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" value="${e?.email||''}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Date of Birth</label><input class="form-input" type="date" name="dob" value="${e?.dob||''}" /></div>
    <div class="form-group"><label class="form-label">Join Date</label><input class="form-input" type="date" name="join_date" value="${e?.join_date||''}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Salary (LKR)</label><input class="form-input" type="number" name="salary" value="${e?.salary||0}" min="0" /></div>
    <div class="form-group"><label class="form-label">Address</label><input class="form-input" name="address" value="${e?.address||''}" /></div>
  </div>
  </form>`;
}

async function submitEmployeeForm(id = null) {
  const form = document.getElementById('emp-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    if (id) { await api.put(`/staff/employees/${id}`, data); toast('success', 'Employee updated'); }
    else { await api.post('/staff/employees', data); toast('success', 'Employee added'); }
    Modal.close();
    Pages.staff();
  } catch(e) { toast('error', 'Failed', e.message); }
}

function openLeaveRequest(employees) {
  Modal.open('New Leave Request',
    `<form id="leave-form">
      <div class="form-group"><label class="form-label">Employee *</label>
        <select class="form-select" name="employee_id" required>
          <option value="">Select employee</option>
          ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Leave Type</label>
          <select class="form-select" name="leave_type">
            <option value="annual">Annual</option><option value="sick">Sick</option>
            <option value="emergency">Emergency</option><option value="maternity">Maternity</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">From *</label><input class="form-input" type="date" name="start_date" required /></div>
        <div class="form-group"><label class="form-label">To *</label><input class="form-input" type="date" name="end_date" required /></div>
      </div>
      <div class="form-group"><label class="form-label">Reason</label><textarea class="form-textarea" name="reason"></textarea></div>
    </form>`,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitLeaveRequest()">Submit Request</button>`
  );
}

async function submitLeaveRequest() {
  const form = document.getElementById('leave-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await api.post('/staff/leave', data);
    toast('success', 'Leave request submitted');
    Modal.close();
    loadLeaveRequests();
  } catch(e) { toast('error', 'Failed', e.message); }
}

async function updateLeave(id, status) {
  try {
    await api.put(`/staff/leave/${id}`, { status });
    toast('success', `Leave ${status}`);
    loadLeaveRequests();
  } catch(e) { toast('error', 'Failed', e.message); }
}

function openAddDepartment() {
  Modal.open('Add Department',
    `<form id="dept-form">
      <div class="form-group"><label class="form-label">Name *</label><input class="form-input" name="name" required /></div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" name="description"></textarea></div>
    </form>`,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitDeptForm()">Add Department</button>`
  );
}

async function submitDeptForm() {
  const form = document.getElementById('dept-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await api.post('/staff/departments', data);
    toast('success', 'Department added');
    Modal.close();
    Pages.staff();
  } catch(e) { toast('error', 'Failed', e.message); }
}
