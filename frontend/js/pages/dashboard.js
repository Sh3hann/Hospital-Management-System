// ─── ROLE-TAILORED DASHBOARDS ─────────────────────────
window.Pages = window.Pages || {};

Pages.dashboard = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner('Loading dashboard...');

  const role = App.user?.role || 'admin';
  const roleName = RBAC.getRoleDisplay(role);

  try {
    const data = await api.get('/reports/dashboard');
    const { stats, recent_appointments, revenue_chart, appointment_breakdown } = data;

    // Build role-tailored view
    let roleDashboardHtml = '';

    if (role === 'admin') {
      roleDashboardHtml = renderAdminDashboard(stats, recent_appointments, revenue_chart, appointment_breakdown);
    } else if (role === 'doctor') {
      roleDashboardHtml = renderDoctorDashboard(stats, recent_appointments);
    } else if (role === 'nurse') {
      roleDashboardHtml = renderNurseDashboard(stats, recent_appointments);
    } else if (role === 'receptionist') {
      roleDashboardHtml = renderReceptionistDashboard(stats, recent_appointments);
    } else if (role === 'lab_staff') {
      roleDashboardHtml = renderLabStaffDashboard(stats);
    } else if (role === 'pharmacist') {
      roleDashboardHtml = renderPharmacistDashboard(stats);
    } else if (role === 'accountant') {
      roleDashboardHtml = renderAccountantDashboard(stats, revenue_chart);
    } else if (role === 'patient') {
      roleDashboardHtml = renderPatientDashboard(stats);
    } else {
      roleDashboardHtml = renderAdminDashboard(stats, recent_appointments, revenue_chart, appointment_breakdown);
    }

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>${roleName} Dashboard</h2>
        <p>Welcome back, ${App.user?.full_name || 'Staff Member'} — ${formatDate(new Date().toISOString())}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" onclick="Pages.dashboard()">${RBAC.icon('activity')} Refresh</button>
      </div>
    </div>

    ${roleDashboardHtml}`;

    // Render charts if elements exist
    const revEl = document.getElementById('revenue-chart');
    if (revEl && revenue_chart) {
      renderBarChart(revEl, revenue_chart.map(d => ({ ...d, date: d.date.slice(5) })), 'revenue', 'date', 'success');
    }

    const donutEl = document.getElementById('appt-donut');
    if (donutEl && appointment_breakdown) {
      const breakdown = ['scheduled','completed','in-progress','cancelled'].map(s => ({
        label: capitalize(s),
        value: (appointment_breakdown.find(b => b.status === s) || {}).count || 0
      })).filter(d => d.value > 0);
      renderDonut(donutEl, breakdown, ['#6366f1','#10b981','#f59e0b','#ef4444']);
    }

  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Failed to load dashboard</div><p class="empty-desc">${e.message}</p></div>`;
  }
};

// 1. ADMIN DASHBOARD
function renderAdminDashboard(stats, appts, revenue, breakdown) {
  return `
  <div class="stats-grid mb-4">
    <div class="stat-card primary">
      <div class="stat-icon primary">${RBAC.icon('users')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.total_patients}</div>
        <div class="stat-label">Total Patients</div>
      </div>
    </div>
    <div class="stat-card cyan">
      <div class="stat-icon cyan">${RBAC.icon('calendar')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.today_appointments}</div>
        <div class="stat-label">Today's Appointments</div>
      </div>
    </div>
    <div class="stat-card success">
      <div class="stat-icon success">${RBAC.icon('credit-card')}</div>
      <div class="stat-info">
        <div class="stat-value">${currency(stats.month_revenue)}</div>
        <div class="stat-label">Monthly Revenue</div>
      </div>
    </div>
    <div class="stat-card warning">
      <div class="stat-icon warning">${RBAC.icon('flask')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.pending_lab}</div>
        <div class="stat-label">Pending Lab Tests</div>
      </div>
    </div>
  </div>

  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><div class="card-title">Daily Revenue (Last 7 Days)</div></div>
      <div id="revenue-chart" style="height:200px;display:flex;align-items:stretch"></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Today's Appointment Status</div></div>
      <div id="appt-donut" style="min-height:160px;display:flex;align-items:center;justify-content:center"></div>
    </div>
  </div>`;
}

// 2. DOCTOR DASHBOARD
function renderDoctorDashboard(stats, appts) {
  return `
  <div class="stats-grid mb-4" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card primary">
      <div class="stat-icon primary">${RBAC.icon('calendar')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.today_appointments}</div>
        <div class="stat-label">Scheduled Patients Today</div>
      </div>
    </div>
    <div class="stat-card warning">
      <div class="stat-icon warning">${RBAC.icon('file-text')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.scheduled_today}</div>
        <div class="stat-label">Awaiting Consultation</div>
      </div>
    </div>
    <div class="stat-card success">
      <div class="stat-icon success">${RBAC.icon('user-check')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.completed_today}</div>
        <div class="stat-label">Completed Consultations</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="card-title">Today's Patient Schedule</div>
      <button class="btn btn-primary btn-sm" onclick="App.navigate('emr')">+ New Medical Record</button>
    </div>
    <div class="table-wrap">
      ${!appts?.length ? emptyState('📅', 'No appointments scheduled today') : `
      <table>
        <thead><tr><th>Time</th><th>Patient</th><th>Type</th><th>Chief Complaint</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${appts.map(a => `
          <tr>
            <td class="font-semibold text-primary">${formatTime(a.appointment_time)}</td>
            <td><div>${a.first_name} ${a.last_name}</div><div class="text-xs text-muted">MRN: ${a.mrn}</div></td>
            <td>${capitalize(a.type)}</td>
            <td>${a.chief_complaint || '—'}</td>
            <td>${statusBadge(a.status)}</td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="App.navigate('emr');setTimeout(()=>openCreateRecord(),300)">Examine</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>
  </div>`;
}

// 3. NURSE DASHBOARD
function renderNurseDashboard(stats, appts) {
  return `
  <div class="stats-grid mb-4" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card primary">
      <div class="stat-icon primary">${RBAC.icon('users')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.today_appointments}</div>
        <div class="stat-label">Today's Outpatients</div>
      </div>
    </div>
    <div class="stat-card warning">
      <div class="stat-icon warning">${RBAC.icon('bed')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.pending_lab}</div>
        <div class="stat-label">Pending Lab Samples</div>
      </div>
    </div>
    <div class="stat-card cyan">
      <div class="stat-icon cyan">${RBAC.icon('activity')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.total_patients}</div>
        <div class="stat-label">Registered Patients</div>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-header"><div class="card-title">Quick Nursing Tasks</div></div>
      <div class="quick-actions">
        <div class="quick-action" onclick="App.navigate('patients');setTimeout(()=>openAddPatient(),300)">
          <div class="quick-action-icon">${RBAC.icon('users')}</div>
          <div class="quick-action-label">Register Patient</div>
        </div>
        <div class="quick-action" onclick="App.navigate('emr');setTimeout(()=>openCreateRecord(),300)">
          <div class="quick-action-icon">${RBAC.icon('activity')}</div>
          <div class="quick-action-label">Record Vitals</div>
        </div>
        <div class="quick-action" onclick="App.navigate('admissions')">
          <div class="quick-action-icon">${RBAC.icon('bed')}</div>
          <div class="quick-action-label">Ward Beds</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Patient Queue</div></div>
      ${!appts?.length ? emptyState('📋', 'Queue empty') : `
      <table>
        <thead><tr><th>Patient</th><th>Time</th><th>Status</th></tr></thead>
        <tbody>${appts.slice(0,5).map(a => `
          <tr>
            <td>${a.first_name} ${a.last_name}</td>
            <td>${formatTime(a.appointment_time)}</td>
            <td>${statusBadge(a.status)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>
  </div>`;
}

// 4. RECEPTIONIST DASHBOARD
function renderReceptionistDashboard(stats, appts) {
  return `
  <div class="stats-grid mb-4">
    <div class="stat-card primary">
      <div class="stat-icon primary">${RBAC.icon('users')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.total_patients}</div>
        <div class="stat-label">Total Patients</div>
      </div>
    </div>
    <div class="stat-card cyan">
      <div class="stat-icon cyan">${RBAC.icon('calendar')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.today_appointments}</div>
        <div class="stat-label">Today's Appointments</div>
      </div>
    </div>
    <div class="stat-card success">
      <div class="stat-icon success">${RBAC.icon('user-check')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.completed_today}</div>
        <div class="stat-label">Checked In / Done</div>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-header">
        <div class="card-title">Front Desk Quick Actions</div>
      </div>
      <div class="quick-actions">
        <div class="quick-action" onclick="App.navigate('patients');setTimeout(()=>openAddPatient(),300)">
          <div class="quick-action-icon">${RBAC.icon('users')}</div>
          <div class="quick-action-label">Register Patient</div>
        </div>
        <div class="quick-action" onclick="App.navigate('appointments');setTimeout(()=>openBookAppointment(),300)">
          <div class="quick-action-icon">${RBAC.icon('calendar')}</div>
          <div class="quick-action-label">Book Appointment</div>
        </div>
        <div class="quick-action" onclick="App.navigate('billing');setTimeout(()=>openCreateBill(),300)">
          <div class="quick-action-icon">${RBAC.icon('credit-card')}</div>
          <div class="quick-action-label">Counter Bill</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Today's Appointments</div></div>
      <div class="table-wrap">
        ${!appts?.length ? emptyState('📅', 'No appointments today') : `
        <table>
          <thead><tr><th>Patient</th><th>Doctor</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>${appts.map(a => `
            <tr>
              <td>${a.first_name} ${a.last_name}</td>
              <td>Dr. ${a.doctor_name || 'Unassigned'}</td>
              <td>${formatTime(a.appointment_time)}</td>
              <td>${statusBadge(a.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
    </div>
  </div>`;
}

// 5. LAB STAFF DASHBOARD
function renderLabStaffDashboard(stats) {
  return `
  <div class="stats-grid mb-4" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card warning">
      <div class="stat-icon warning">${RBAC.icon('flask')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.pending_lab}</div>
        <div class="stat-label">Pending Lab Requests</div>
      </div>
    </div>
    <div class="stat-card primary">
      <div class="stat-icon primary">${RBAC.icon('activity')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.today_appointments}</div>
        <div class="stat-label">Tests Conducted Today</div>
      </div>
    </div>
    <div class="stat-card success">
      <div class="stat-icon success">${RBAC.icon('user-check')}</div>
      <div class="stat-info">
        <div class="stat-value">Active</div>
        <div class="stat-label">Laboratory Service</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="card-title">Lab Test Queue</div>
      <button class="btn btn-primary" onclick="App.navigate('lab')">Go to Laboratory Console</button>
    </div>
    ${emptyState('🔬', 'Manage Laboratory Tests', 'Click above to view requested tests, collect samples and upload results.')}
  </div>`;
}

// 6. PHARMACIST DASHBOARD
function renderPharmacistDashboard(stats) {
  return `
  <div class="stats-grid mb-4" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card danger">
      <div class="stat-icon danger">${RBAC.icon('package')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.pending_prescriptions}</div>
        <div class="stat-label">Pending Prescriptions</div>
      </div>
    </div>
    <div class="stat-card warning">
      <div class="stat-icon warning">${RBAC.icon('package')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.low_stock_medicines}</div>
        <div class="stat-label">Low Stock Alerts</div>
      </div>
    </div>
    <div class="stat-card danger">
      <div class="stat-icon danger">${RBAC.icon('calendar')}</div>
      <div class="stat-info">
        <div class="stat-value">${stats.expiring_medicines}</div>
        <div class="stat-label">Medicines Expiring Soon</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="card-title">Pharmacy Management</div>
      <button class="btn btn-primary" onclick="App.navigate('pharmacy')">Open Dispensary Console</button>
    </div>
    ${emptyState('💊', 'Dispensary & Stock Control', 'Process prescriptions, manage drug inventory and handle reorder alerts.')}
  </div>`;
}

// 7. ACCOUNTANT DASHBOARD
function renderAccountantDashboard(stats, revenue) {
  return `
  <div class="stats-grid mb-4" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card success">
      <div class="stat-icon success">${RBAC.icon('credit-card')}</div>
      <div class="stat-info">
        <div class="stat-value">${currency(stats.month_revenue)}</div>
        <div class="stat-label">This Month Collection</div>
      </div>
    </div>
    <div class="stat-card primary">
      <div class="stat-icon primary">${RBAC.icon('credit-card')}</div>
      <div class="stat-info">
        <div class="stat-value">${currency(stats.today_revenue)}</div>
        <div class="stat-label">Today's Receipts</div>
      </div>
    </div>
    <div class="stat-card danger">
      <div class="stat-icon danger">${RBAC.icon('file-text')}</div>
      <div class="stat-info">
        <div class="stat-value">${currency(stats.pending_bills_amount)}</div>
        <div class="stat-label">Outstanding Invoices (${stats.pending_bills_count})</div>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-header"><div class="card-title">Daily Revenue Trend</div></div>
      <div id="revenue-chart" style="height:200px;display:flex;align-items:stretch"></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Financial Actions</div></div>
      <div class="quick-actions">
        <div class="quick-action" onclick="App.navigate('billing');setTimeout(()=>openCreateBill(),300)">
          <div class="quick-action-icon">${RBAC.icon('credit-card')}</div>
          <div class="quick-action-label">Generate Invoice</div>
        </div>
        <div class="quick-action" onclick="App.navigate('reports')">
          <div class="quick-action-icon">${RBAC.icon('bar-chart-2')}</div>
          <div class="quick-action-label">Financial Reports</div>
        </div>
      </div>
    </div>
  </div>`;
}

// 8. PATIENT DASHBOARD
function renderPatientDashboard(stats) {
  return `
  <div class="stats-grid mb-4" style="grid-template-columns:repeat(4,1fr)">
    <div class="stat-card primary">
      <div class="stat-icon primary">${RBAC.icon('calendar')}</div>
      <div class="stat-info">
        <div class="stat-value">1</div>
        <div class="stat-label">Upcoming Appointment</div>
      </div>
    </div>
    <div class="stat-card success">
      <div class="stat-icon success">${RBAC.icon('file-text')}</div>
      <div class="stat-info">
        <div class="stat-value">3</div>
        <div class="stat-label">Health Records</div>
      </div>
    </div>
    <div class="stat-card cyan">
      <div class="stat-icon cyan">${RBAC.icon('flask')}</div>
      <div class="stat-info">
        <div class="stat-value">2</div>
        <div class="stat-label">Lab Reports</div>
      </div>
    </div>
    <div class="stat-card warning">
      <div class="stat-icon warning">${RBAC.icon('credit-card')}</div>
      <div class="stat-info">
        <div class="stat-value">LKR 0.00</div>
        <div class="stat-label">Balance Due</div>
      </div>
    </div>
  </div>

  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <div class="card-title">My Health Quick Links</div>
      </div>
      <div class="quick-actions">
        <div class="quick-action" onclick="App.navigate('appointments');setTimeout(()=>openBookAppointment(),300)">
          <div class="quick-action-icon">${RBAC.icon('calendar')}</div>
          <div class="quick-action-label">Book Doctor Visit</div>
        </div>
        <div class="quick-action" onclick="App.navigate('emr')">
          <div class="quick-action-icon">${RBAC.icon('file-text')}</div>
          <div class="quick-action-label">View My Records</div>
        </div>
        <div class="quick-action" onclick="App.navigate('lab')">
          <div class="quick-action-icon">${RBAC.icon('flask')}</div>
          <div class="quick-action-label">My Test Results</div>
        </div>
        <div class="quick-action" onclick="App.navigate('billing')">
          <div class="quick-action-icon">${RBAC.icon('credit-card')}</div>
          <div class="quick-action-label">My Invoices</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">My Next Appointment</div>
        <button class="btn btn-primary btn-sm" onclick="App.navigate('appointments')">View All</button>
      </div>
      <div style="background:var(--primary-bg);border:1px solid rgba(79,70,229,0.2);padding:16px;border-radius:12px;display:flex;align-items:center;gap:16px">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">
          ${RBAC.icon('calendar')}
        </div>
        <div style="flex:1">
          <div class="font-bold" style="font-size:15px">Consultation with Dr. Kamal Perera</div>
          <div class="text-xs text-muted" style="margin-top:2px">General Medicine · Main Clinic Room 204</div>
          <div class="text-sm font-semibold text-primary" style="margin-top:4px">Tomorrow at 10:30 AM</div>
        </div>
        <span class="badge badge-success">CONFIRMED</span>
      </div>
    </div>
  </div>`;
}
