// ─── ADMISSIONS / INPATIENT PAGE ──────────────────────
window.Pages = window.Pages || {};
Pages.admissions = async function(page = 1, status = 'admitted') {
  const content = document.getElementById('page-content');
  if (page === 1) content.innerHTML = loadingSpinner('Loading ward admissions...');

  try {
    const [{ data: admissions, total }, stats] = await Promise.all([
      api.get(`/admissions?page=${page}&limit=15&status=${status}`),
      api.get('/admissions/stats/summary')
    ]);

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Inpatient & Admissions</h2>
        <p>Manage hospital bed allocations, ward care, inpatient & outpatient admissions</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openAdmitPatient()">+ Admit Patient</button>
      </div>
    </div>

    <!-- STATS -->
    <div class="stats-grid mb-4" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card warning">
        <div class="stat-icon warning">${RBAC.icon('bed')}</div>
        <div class="stat-info">
          <div class="stat-value">${stats.total_admitted || 0}</div>
          <div class="stat-label">Currently Admitted</div>
        </div>
      </div>
      <div class="stat-card primary">
        <div class="stat-icon primary">${RBAC.icon('users')}</div>
        <div class="stat-info">
          <div class="stat-value">${stats.inpatients || 0}</div>
          <div class="stat-label">Inpatients</div>
        </div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon cyan">${RBAC.icon('activity')}</div>
        <div class="stat-info">
          <div class="stat-value">${stats.emergency || 0}</div>
          <div class="stat-label">Emergency</div>
        </div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon success">${RBAC.icon('user-check')}</div>
        <div class="stat-info">
          <div class="stat-value">${stats.total_discharged || 0}</div>
          <div class="stat-label">Total Discharged</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <div class="tab-nav" style="border:none;margin:0">
          <button class="tab-btn ${status === 'admitted' ? 'active' : ''}" onclick="Pages.admissions(1, 'admitted')">Currently Admitted</button>
          <button class="tab-btn ${status === 'discharged' ? 'active' : ''}" onclick="Pages.admissions(1, 'discharged')">Discharged</button>
          <button class="tab-btn ${status === 'all' ? 'active' : ''}" onclick="Pages.admissions(1, 'all')">All Records</button>
        </div>
      </div>

      <div class="table-wrap">
        ${admissions.length === 0 ? emptyState('🛏️', 'No admission records', 'No patients currently match this filter') :
        `<table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Ward / Bed</th>
              <th>Type</th>
              <th>Doctor</th>
              <th>Admitted Date</th>
              <th>Diagnosis</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${admissions.map(a => `
            <tr>
              <td>
                <div class="font-semibold">${a.first_name} ${a.last_name}</div>
                <div class="text-xs text-muted">${a.mrn} · ${a.gender}</div>
              </td>
              <td>
                <div class="font-semibold text-primary">${a.ward || 'General Ward'}</div>
                <div class="text-xs text-muted">Bed: ${a.bed_number || 'Unassigned'}</div>
              </td>
              <td><span class="badge badge-info">${a.admission_type.toUpperCase()}</span></td>
              <td>${a.doctor_name ? `Dr. ${a.doctor_name}` : '<span class="text-muted">Unassigned</span>'}</td>
              <td>${formatDateTime(a.admission_date)}</td>
              <td class="truncate" style="max-width:160px">${a.diagnosis || '—'}</td>
              <td>${statusBadge(a.status)}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-outline btn-sm" onclick="viewAdmission(${a.id})">Details</button>
                  ${a.status === 'admitted' ? `<button class="btn btn-success btn-sm" onclick="openDischargeModal(${a.id})">Discharge</button>` : ''}
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
      <div id="admissions-pagination"></div>
    </div>`;

    renderPagination(document.getElementById('admissions-pagination'), page, total, 15, `(p) => Pages.admissions(p, '${status}')`);
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error</div><p>${e.message}</p></div>`;
  }
};

async function openAdmitPatient() {
  const [patients, doctors] = await Promise.all([
    api.get('/patients?limit=200').then(r => r.data || r).catch(() => []),
    api.get('/doctors').catch(() => [])
  ]);

  const body = `
  <form id="admit-form">
    <div class="form-group"><label class="form-label">Patient *</label>
      <select class="form-select" name="patient_id" required>
        <option value="">Select patient...</option>
        ${patients.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name} (${p.mrn})</option>`).join('')}
      </select>
    </div>
    <div class="form-row mt-3">
      <div class="form-group"><label class="form-label">Attending Doctor</label>
        <select class="form-select" name="doctor_id">
          <option value="">Assign later</option>
          ${doctors.map(d => `<option value="${d.id}">${d.name} — ${d.specialization}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Admission Type *</label>
        <select class="form-select" name="admission_type" required>
          <option value="inpatient">Inpatient (Standard)</option>
          <option value="emergency">Emergency Ward</option>
          <option value="outpatient">Outpatient Observation</option>
        </select>
      </div>
    </div>
    <div class="form-row mt-3">
      <div class="form-group"><label class="form-label">Ward / Unit</label>
        <input class="form-input" name="ward" placeholder="e.g. ICU, General Ward B, Pediatrics" />
      </div>
      <div class="form-group"><label class="form-label">Bed Number</label>
        <input class="form-input" name="bed_number" placeholder="e.g. B-102" />
      </div>
    </div>
    <div class="form-group mt-3"><label class="form-label">Initial Diagnosis</label>
      <textarea class="form-textarea" name="diagnosis" placeholder="Primary reason for admission..."></textarea>
    </div>
    <div class="form-group mt-3"><label class="form-label">Admission Notes</label>
      <textarea class="form-textarea" name="notes" placeholder="Special care requirements, diet, nursing instructions..."></textarea>
    </div>
  </form>`;

  Modal.open('Admit Patient to Ward', body,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitAdmitForm()">Confirm Admission</button>`
  );
}

async function submitAdmitForm() {
  const form = document.getElementById('admit-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    await api.post('/admissions', data);
    toast('success', 'Patient admitted successfully');
    Modal.close();
    Pages.admissions();
  } catch(e) {
    toast('error', 'Failed to admit patient', e.message);
  }
}

async function viewAdmission(id) {
  Modal.open('Admission Details', loadingSpinner());
  try {
    const a = await api.get(`/admissions/${id}`);
    const body = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <h3 style="font-size:18px;font-weight:700">${a.first_name} ${a.last_name}</h3>
        <p class="text-muted text-xs">MRN: ${a.mrn} · ${a.gender} · DOB: ${formatDate(a.dob)}</p>
      </div>
      <div>${statusBadge(a.status)}</div>
    </div>

    <div class="detail-grid mb-4">
      <div class="detail-item"><div class="detail-label">Ward</div><div class="detail-value font-semibold text-primary">${a.ward || 'General'}</div></div>
      <div class="detail-item"><div class="detail-label">Bed Number</div><div class="detail-value font-semibold">${a.bed_number || 'Unassigned'}</div></div>
      <div class="detail-item"><div class="detail-label">Admission Type</div><div class="detail-value">${a.admission_type.toUpperCase()}</div></div>
      <div class="detail-item"><div class="detail-label">Attending Doctor</div><div class="detail-value">${a.doctor_name ? `Dr. ${a.doctor_name}` : 'Unassigned'}</div></div>
      <div class="detail-item"><div class="detail-label">Admitted Date</div><div class="detail-value">${formatDateTime(a.admission_date)}</div></div>
      <div class="detail-item"><div class="detail-label">Discharge Date</div><div class="detail-value">${a.discharge_date ? formatDateTime(a.discharge_date) : 'Still Admitted'}</div></div>
    </div>

    <div class="form-section-title">Clinical Notes</div>
    <div style="background:var(--surface-2);padding:12px;border-radius:8px;margin-bottom:12px">
      <div class="detail-label">Diagnosis</div>
      <div class="text-sm font-semibold">${a.diagnosis || 'None recorded'}</div>
    </div>
    ${a.notes ? `
    <div style="background:var(--surface-2);padding:12px;border-radius:8px;margin-bottom:12px">
      <div class="detail-label">Admission Notes</div>
      <div class="text-sm">${a.notes}</div>
    </div>` : ''}

    ${a.discharge_notes ? `
    <div class="alert success" style="margin-top:12px">
      <div>
        <div class="font-semibold">Discharge Summary</div>
        <div>${a.discharge_notes}</div>
      </div>
    </div>` : ''}`;

    Modal.open(`Admission — ${a.first_name} ${a.last_name}`, body,
      `<button class="btn btn-outline" onclick="Modal.close()">Close</button>
       ${a.status === 'admitted' ? `<button class="btn btn-success" onclick="openDischargeModal(${a.id})">Process Discharge</button>` : ''}`
    );
  } catch(e) {
    toast('error', 'Error loading admission', e.message);
  }
}

function openDischargeModal(id) {
  Modal.open('Process Patient Discharge',
    `<form id="discharge-form">
      <div class="form-group"><label class="form-label">Final Discharge Diagnosis</label>
        <textarea class="form-textarea" name="discharge_diagnosis" placeholder="Final diagnosis at discharge..."></textarea>
      </div>
      <div class="form-group mt-3"><label class="form-label">Discharge Summary & Instructions *</label>
        <textarea class="form-textarea" name="discharge_notes" required placeholder="Home care instructions, prescribed medication on discharge, follow-up advice..."></textarea>
      </div>
    </form>`,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-success" onclick="submitDischarge(${id})">Confirm Discharge</button>`
  );
}

async function submitDischarge(id) {
  const form = document.getElementById('discharge-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    await api.put(`/admissions/${id}/discharge`, data);
    toast('success', 'Patient discharged');
    Modal.close();
    Pages.admissions();
  } catch(e) {
    toast('error', 'Discharge failed', e.message);
  }
}
