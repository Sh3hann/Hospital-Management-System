// ─── REPORTS PAGE ────────────────────────────────────
window.Pages = window.Pages || {};
Pages.reports = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner();

  const to = todayStr();
  const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  try {
    const [dashboard, patients, appointments, revenue, pharmacy, lab, staff] = await Promise.all([
      api.get('/reports/dashboard'),
      api.get(`/reports/patients?from=${from}&to=${to}`),
      api.get(`/reports/appointments?from=${from}&to=${to}`),
      api.get(`/reports/revenue?from=${from}&to=${to}`),
      api.get('/reports/pharmacy'),
      api.get(`/reports/lab?from=${from}&to=${to}`),
      api.get('/reports/staff')
    ]);

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Reports & Analytics</h2><p>Comprehensive hospital insights</p></div>
      <div class="page-header-actions">
        <input class="form-input" type="date" id="report-from" value="${from}" onchange="refreshReports()" style="max-width:150px" />
        <span class="text-muted">to</span>
        <input class="form-input" type="date" id="report-to" value="${to}" onchange="refreshReports()" style="max-width:150px" />
        <button class="btn btn-outline" onclick="window.print()">🖨 Print</button>
      </div>
    </div>

    <!-- KPI SUMMARY -->
    <div class="stats-grid mb-5">
      <div class="stat-card primary"><div class="stat-icon primary">👥</div><div class="stat-info"><div class="stat-value">${dashboard.stats.total_patients}</div><div class="stat-label">Total Patients</div><div class="stat-change up">+${dashboard.stats.new_patients_month} this month</div></div></div>
      <div class="stat-card success"><div class="stat-icon success">💰</div><div class="stat-info"><div class="stat-value">${currency(revenue.summary?.total_revenue||0)}</div><div class="stat-label">Revenue (30 days)</div><div class="stat-change">${revenue.summary?.transactions||0} transactions</div></div></div>
      <div class="stat-card cyan"><div class="stat-icon cyan">📅</div><div class="stat-info"><div class="stat-value">${appointments.daily?.reduce((s,d)=>s+(d.total||0),0)||0}</div><div class="stat-label">Appointments (30 days)</div></div></div>
      <div class="stat-card warning"><div class="stat-icon warning">💸</div><div class="stat-info"><div class="stat-value">${currency(revenue.outstanding?.amount||0)}</div><div class="stat-label">Outstanding Bills</div><div class="stat-change">${revenue.outstanding?.count||0} bills pending</div></div></div>
    </div>

    <div class="tab-nav" id="report-tabs">
      <button class="tab-btn active" onclick="showReportTab('overview')">Overview</button>
      <button class="tab-btn" onclick="showReportTab('patients-rep')">Patients</button>
      <button class="tab-btn" onclick="showReportTab('appointments-rep')">Appointments</button>
      <button class="tab-btn" onclick="showReportTab('revenue-rep')">Revenue</button>
      <button class="tab-btn" onclick="showReportTab('pharmacy-rep')">Pharmacy</button>
      <button class="tab-btn" onclick="showReportTab('lab-rep')">Lab</button>
      <button class="tab-btn" onclick="showReportTab('staff-rep')">Staff</button>
    </div>

    <!-- OVERVIEW -->
    <div id="report-overview" class="tab-panel active">
      <div class="grid-2 mb-4">
        <!-- Revenue chart -->
        <div class="card">
          <div class="card-header"><div class="card-title">Daily Revenue (Last 30 Days)</div></div>
          <div id="rep-revenue-chart" style="height:200px"></div>
        </div>
        <!-- Appointment trend -->
        <div class="card">
          <div class="card-header"><div class="card-title">Daily Appointments</div></div>
          <div id="rep-appt-chart" style="height:200px"></div>
        </div>
      </div>
      <div class="grid-2">
        <!-- Gender breakdown -->
        <div class="card">
          <div class="card-header"><div class="card-title">Patient Gender Distribution</div></div>
          <div id="rep-gender-donut" style="min-height:160px;padding:10px 0"></div>
        </div>
        <!-- Payment methods -->
        <div class="card">
          <div class="card-header"><div class="card-title">Revenue by Payment Method</div></div>
          <div id="rep-payment-donut" style="min-height:160px;padding:10px 0"></div>
        </div>
      </div>
    </div>

    <!-- PATIENTS -->
    <div id="report-patients-rep" class="tab-panel">
      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header"><div class="card-title">Daily Registrations</div></div>
          <div id="rep-patient-reg-chart" style="height:200px"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Blood Type Distribution</div></div>
          <div id="rep-blood-donut" style="min-height:160px;padding:10px 0"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Top Diagnoses</div></div>
        ${!patients.top_diagnoses?.length ? emptyState('📋','No diagnosis data') :
        `<table><thead><tr><th>#</th><th>Diagnosis</th><th>Count</th><th>Frequency</th></tr></thead>
        <tbody>${patients.top_diagnoses.map((d,i) => `
          <tr>
            <td class="text-muted">${i+1}</td>
            <td>${d.diagnosis}</td>
            <td>${d.count}</td>
            <td><div class="progress-bar" style="width:150px"><div class="progress-fill primary" style="width:${(d.count/patients.top_diagnoses[0].count)*100}%"></div></div></td>
          </tr>`).join('')}</tbody></table>`}
      </div>
    </div>

    <!-- APPOINTMENTS -->
    <div id="report-appointments-rep" class="tab-panel">
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">Appointments by Doctor</div></div>
        ${!appointments.by_doctor?.length ? emptyState('📅','No data') :
        `<table><thead><tr><th>Doctor</th><th>Specialization</th><th>Total</th><th>Completed</th><th>Completion Rate</th></tr></thead>
        <tbody>${appointments.by_doctor.map(d => `
          <tr>
            <td class="font-semibold">${d.doctor_name}</td>
            <td>${d.specialization}</td>
            <td>${d.total}</td>
            <td class="text-success">${d.completed}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="progress-bar" style="width:100px"><div class="progress-fill success" style="width:${d.total>0?(d.completed/d.total*100):0}%"></div></div>
                <span class="text-sm">${d.total>0?Math.round(d.completed/d.total*100):0}%</span>
              </div>
            </td>
          </tr>`).join('')}</tbody></table>`}
      </div>
    </div>

    <!-- REVENUE -->
    <div id="report-revenue-rep" class="tab-panel">
      <div class="stats-grid mb-4" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card success"><div class="stat-icon success">💰</div><div class="stat-info"><div class="stat-value">${currency(revenue.summary?.total_revenue||0)}</div><div class="stat-label">Total Collected</div></div></div>
        <div class="stat-card danger"><div class="stat-icon danger">💸</div><div class="stat-info"><div class="stat-value">${currency(revenue.outstanding?.amount||0)}</div><div class="stat-label">Outstanding</div></div></div>
        <div class="stat-card primary"><div class="stat-icon primary">🧾</div><div class="stat-info"><div class="stat-value">${revenue.summary?.transactions||0}</div><div class="stat-label">Transactions</div></div></div>
      </div>
      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header"><div class="card-title">Payment Methods</div></div>
          ${!revenue.by_method?.length ? emptyState('💳','No data') :
          `<table><thead><tr><th>Method</th><th>Transactions</th><th>Total</th></tr></thead>
          <tbody>${revenue.by_method.map(m => `
            <tr><td>${capitalize(m.method)}</td><td>${m.count}</td><td class="text-success font-semibold">${currency(m.total)}</td></tr>`).join('')}</tbody></table>`}
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Revenue by Service</div></div>
          <div id="rep-revenue-category-donut" style="min-height:160px;padding:10px 0"></div>
        </div>
      </div>
    </div>

    <!-- PHARMACY -->
    <div id="report-pharmacy-rep" class="tab-panel">
      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header"><div class="card-title">⚠️ Low Stock (${pharmacy.low_stock?.length||0})</div></div>
          ${!pharmacy.low_stock?.length ? emptyState('✅','All well-stocked') :
          `<table><thead><tr><th>Medicine</th><th>Stock</th><th>Reorder Level</th></tr></thead>
          <tbody>${pharmacy.low_stock.slice(0,10).map(m => `
            <tr><td>${m.name}</td>
            <td><span class="text-${m.stock_qty===0?'danger':'warning'} font-bold">${m.stock_qty}</span></td>
            <td>${m.reorder_level}</td></tr>`).join('')}</tbody></table>`}
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">🚨 Expiring Soon (${pharmacy.expiring?.length||0})</div></div>
          ${!pharmacy.expiring?.length ? emptyState('✅','No expiry issues') :
          `<table><thead><tr><th>Medicine</th><th>Expiry</th><th>Stock</th></tr></thead>
          <tbody>${pharmacy.expiring.slice(0,10).map(m => `
            <tr><td>${m.name}</td>
            <td><span class="badge badge-danger">${formatDate(m.expiry_date)}</span></td>
            <td>${m.stock_qty}</td></tr>`).join('')}</tbody></table>`}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Stock by Category</div></div>
        <div id="rep-pharmacy-chart" style="height:200px"></div>
      </div>
    </div>

    <!-- LAB -->
    <div id="report-lab-rep" class="tab-panel">
      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header"><div class="card-title">Tests by Category</div></div>
          <div id="rep-lab-donut" style="min-height:160px;padding:10px 0"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Top Tests Ordered</div></div>
          ${!lab.top_tests?.length ? emptyState('🔬','No data') :
          `<table><thead><tr><th>Test Name</th><th>Count</th></tr></thead>
          <tbody>${lab.top_tests.map(t => `<tr><td>${t.test_name}</td><td><span class="badge badge-primary">${t.count}</span></td></tr>`).join('')}</tbody></table>`}
        </div>
      </div>
    </div>

    <!-- STAFF -->
    <div id="report-staff-rep" class="tab-panel">
      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header"><div class="card-title">Staff by Department</div></div>
          <div id="rep-staff-donut" style="min-height:160px;padding:10px 0"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Today's Attendance</div></div>
          ${!staff.today_attendance?.length ? emptyState('📅','No attendance records') :
          `<table><thead><tr><th>Employee</th><th>Role</th><th>Status</th><th>Check In</th></tr></thead>
          <tbody>${staff.today_attendance.map(a => `
            <tr><td>${a.employee_name}</td><td>${a.role}</td><td>${statusBadge(a.status)}</td><td>${a.check_in||'—'}</td></tr>`).join('')}</tbody></table>`}
        </div>
      </div>
    </div>`;

    // Render charts
    renderBarChart(document.getElementById('rep-revenue-chart'), revenue.daily?.slice(-14).map(d=>({...d,date:d.date?.slice(5)})), 'revenue', 'date', 'success');
    renderBarChart(document.getElementById('rep-appt-chart'), appointments.daily?.slice(-14).map(d=>({...d,date:d.date?.slice(5)})), 'total', 'date', 'primary');
    renderBarChart(document.getElementById('rep-patient-reg-chart'), patients.registrations?.slice(-14).map(d=>({...d,date:d.date?.slice(5)})), 'count', 'date', 'cyan');

    renderDonut(document.getElementById('rep-gender-donut'), patients.gender_breakdown?.map(g=>({label:g.gender||'Unknown',value:g.count})), ['#6366f1','#22d3ee','#f59e0b']);
    renderDonut(document.getElementById('rep-payment-donut'), revenue.by_method?.map(m=>({label:capitalize(m.method),value:Math.round(m.total)})), ['#10b981','#6366f1','#22d3ee','#f59e0b']);
    renderDonut(document.getElementById('rep-blood-donut'), patients.blood_type_breakdown?.map(b=>({label:b.blood_type,value:b.count})), ['#ef4444','#f59e0b','#6366f1','#10b981','#22d3ee','#3b82f6','#8b5cf6','#ec4899']);
    renderDonut(document.getElementById('rep-lab-donut'), lab.by_category?.map(c=>({label:c.test_category||'Other',value:c.count})), ['#6366f1','#10b981','#f59e0b','#22d3ee','#ef4444','#3b82f6']);
    renderDonut(document.getElementById('rep-staff-donut'), staff.by_department?.map(d=>({label:d.department||'Other',value:d.count})), ['#6366f1','#10b981','#f59e0b','#22d3ee','#ef4444']);
    renderDonut(document.getElementById('rep-revenue-category-donut'), (revenue.by_category||[]).filter(c=>c.category&&c.total).map(c=>({label:capitalize(c.category),value:Math.round(c.total)})), ['#6366f1','#10b981','#f59e0b','#22d3ee']);
    renderBarChart(document.getElementById('rep-pharmacy-chart'), pharmacy.by_category?.map(c=>({...c,cat:c.category?.slice(0,8)||'Other'})), 'total_stock', 'cat', 'cyan');

  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading reports</div><p>${e.message}</p></div>`;
  }
};

function showReportTab(name) {
  document.querySelectorAll('#report-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`report-${name}`)?.classList.add('active');
  document.querySelectorAll('#report-tabs .tab-btn').forEach(b => {
    if (b.getAttribute('onclick').includes(name)) b.classList.add('active');
  });
}

function refreshReports() {
  const from = document.getElementById('report-from')?.value;
  const to = document.getElementById('report-to')?.value;
  if (from && to) Pages.reports();
}
