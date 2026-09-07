// ─── LABORATORY PAGE ─────────────────────────────────
window.Pages = window.Pages || {};
Pages.lab = async function(page = 1) {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner();

  try {
    const [{ data: tests, total }, stats] = await Promise.all([
      api.get(`/lab?page=${page}&limit=15`),
      api.get('/lab/stats/summary')
    ]);

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Laboratory</h2><p>Manage lab tests and results</p></div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openRequestTest()">+ Request Test</button>
      </div>
    </div>

    <!-- STATS -->
    <div class="stats-grid mb-5" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card primary"><div class="stat-icon primary">🔬</div><div class="stat-info"><div class="stat-value">${stats.total||0}</div><div class="stat-label">Total Tests</div></div></div>
      <div class="stat-card warning"><div class="stat-icon warning">⏳</div><div class="stat-info"><div class="stat-value">${stats.requested||0}</div><div class="stat-label">Requested</div></div></div>
      <div class="stat-card cyan"><div class="stat-icon cyan">🧪</div><div class="stat-info"><div class="stat-value">${stats.in_progress||0}</div><div class="stat-label">In Progress</div></div></div>
      <div class="stat-card success"><div class="stat-icon success">✅</div><div class="stat-info"><div class="stat-value">${stats.completed||0}</div><div class="stat-label">Completed</div></div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Test Requests</div>
        <div style="display:flex;gap:8px">
          <select class="form-select" id="lab-status-filter" onchange="filterLabTests()" style="max-width:140px">
            <option value="">All Status</option>
            <option>requested</option><option>in-progress</option><option>completed</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        ${tests.length === 0 ? emptyState('🔬', 'No lab tests') :
        `<table>
          <thead><tr>
            <th>Date</th><th>Patient</th><th>Doctor</th><th>Test</th><th>Category</th><th>Priority</th><th>Status</th><th>Charge</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${tests.map(t => `
            <tr>
              <td>${formatDate(t.requested_at)}</td>
              <td>
                <div class="font-semibold">${t.first_name} ${t.last_name}</div>
                <div class="text-xs text-muted">${t.mrn}</div>
              </td>
              <td>${t.doctor_name}</td>
              <td class="font-semibold">${t.test_name}</td>
              <td>${t.test_category || '—'}</td>
              <td>${t.priority === 'urgent' ? '<span class="badge badge-danger">URGENT</span>' : '<span class="badge badge-neutral">Normal</span>'}</td>
              <td>${statusBadge(t.status)}</td>
              <td>${currency(t.charge)}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-outline btn-sm" onclick="viewLabTest(${t.id})">View</button>
                  ${t.status !== 'completed' ? `<button class="btn btn-primary btn-sm" onclick="openUpdateTest(${t.id})">Update</button>` : ''}
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
      <div id="lab-pagination"></div>
    </div>`;

    renderPagination(document.getElementById('lab-pagination'), page, total, 15, `(p) => Pages.lab(p)`);
    window._labTests = tests;
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error</div><p>${e.message}</p></div>`;
  }
};

function filterLabTests() {
  const status = document.getElementById('lab-status-filter')?.value;
  const params = status ? `?status=${status}` : '';
  api.get(`/lab${params}`).then(r => {
    const tbody = document.querySelector('.card table tbody');
    if (!tbody) return;
    const tests = r.data || [];
    tbody.innerHTML = tests.map(t => `
      <tr>
        <td>${formatDate(t.requested_at)}</td>
        <td><div>${t.first_name} ${t.last_name}</div><div class="text-xs text-muted">${t.mrn}</div></td>
        <td>${t.doctor_name}</td>
        <td class="font-semibold">${t.test_name}</td>
        <td>${t.test_category||'—'}</td>
        <td>${t.priority==='urgent'?'<span class="badge badge-danger">URGENT</span>':'<span class="badge badge-neutral">Normal</span>'}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${currency(t.charge)}</td>
        <td><div class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="viewLabTest(${t.id})">View</button>
          ${t.status!=='completed'?`<button class="btn btn-primary btn-sm" onclick="openUpdateTest(${t.id})">Update</button>`:''}
        </div></td>
      </tr>`).join('');
  });
}

async function viewLabTest(id) {
  Modal.open('Lab Test Details', loadingSpinner());
  try {
    const t = await api.get(`/lab/${id}`);
    const body = `
    <div class="detail-grid mb-4">
      <div class="detail-item"><div class="detail-label">Patient</div><div class="detail-value">${t.first_name} ${t.last_name} (${t.mrn})</div></div>
      <div class="detail-item"><div class="detail-label">Requested By</div><div class="detail-value">Dr. ${t.doctor_name}</div></div>
      <div class="detail-item"><div class="detail-label">Test Name</div><div class="detail-value font-semibold">${t.test_name}</div></div>
      <div class="detail-item"><div class="detail-label">Category</div><div class="detail-value">${t.test_category||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Priority</div><div class="detail-value">${t.priority === 'urgent' ? '<span class="badge badge-danger">URGENT</span>' : '<span class="badge badge-neutral">Normal</span>'}</div></div>
      <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(t.status)}</div></div>
      <div class="detail-item"><div class="detail-label">Requested</div><div class="detail-value">${formatDateTime(t.requested_at)}</div></div>
      <div class="detail-item"><div class="detail-label">Completed</div><div class="detail-value">${t.completed_at ? formatDateTime(t.completed_at) : '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Charge</div><div class="detail-value text-success font-bold">${currency(t.charge)}</div></div>
    </div>
    ${t.result ? `
    <div class="form-section-title">Results</div>
    <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px">
      <div class="font-semibold mb-2">${t.result}</div>
      ${t.reference_range ? `<div class="text-sm text-muted">Reference: ${t.reference_range}</div>` : ''}
      ${t.remarks ? `<div class="alert info mt-2" style="margin-top:8px">${t.remarks}</div>` : ''}
    </div>` : `<div class="alert warning">⏳ Results pending</div>`}`;

    Modal.open(`Lab Test — ${t.test_name}`, body,
      `<button class="btn btn-outline" onclick="Modal.close()">Close</button>
       ${t.status !== 'completed' ? `<button class="btn btn-primary" onclick="openUpdateTest(${t.id})">Enter Results</button>` : ''}`,
    );
  } catch(e) { toast('error', 'Error', e.message); }
}

async function openRequestTest() {
  const [patients, doctors] = await Promise.all([
    api.get('/patients?limit=200').then(r => r.data || r),
    api.get('/doctors')
  ]);
  const body = `<form id="lab-form">
    <div class="form-group"><label class="form-label">Patient *</label>
      <select class="form-select" name="patient_id" required>
        <option value="">Select patient</option>
        ${patients.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name} (${p.mrn})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Requesting Doctor *</label>
      <select class="form-select" name="doctor_id" required>
        <option value="">Select doctor</option>
        ${doctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Test Name *</label><input class="form-input" name="test_name" required placeholder="e.g. CBC, Lipid Profile" /></div>
      <div class="form-group"><label class="form-label">Category</label>
        <select class="form-select" name="test_category">
          <option value="">Select</option>
          <option>Hematology</option><option>Biochemistry</option><option>Microbiology</option>
          <option>Radiology</option><option>Cardiology</option><option>Pathology</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Priority</label>
        <select class="form-select" name="priority">
          <option value="normal">Normal</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Charge (LKR)</label><input class="form-input" type="number" name="charge" step="0.01" min="0" value="0" /></div>
    </div>
  </form>`;

  Modal.open('Request Lab Test', body,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitLabRequest()">Request Test</button>`
  );
}

async function submitLabRequest() {
  const form = document.getElementById('lab-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await api.post('/lab', data);
    toast('success', 'Lab test requested');
    Modal.close();
    Pages.lab();
  } catch(e) { toast('error', 'Failed', e.message); }
}

async function openUpdateTest(id) {
  const t = await api.get(`/lab/${id}`).catch(() => null);
  if (!t) return;
  const body = `<form id="lab-update-form">
    <div class="form-group"><label class="form-label">Status</label>
      <select class="form-select" name="status">
        <option ${t.status==='requested'?'selected':''}>requested</option>
        <option ${t.status==='in-progress'?'selected':''}>in-progress</option>
        <option ${t.status==='completed'?'selected':''}>completed</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Sample Collected At</label>
      <input class="form-input" type="datetime-local" name="sample_collected_at" value="${t.sample_collected_at||''}" />
    </div>
    <div class="form-group"><label class="form-label">Result</label>
      <textarea class="form-textarea" name="result" rows="4" placeholder="Enter test results...">${t.result||''}</textarea>
    </div>
    <div class="form-group"><label class="form-label">Reference Range</label>
      <input class="form-input" name="reference_range" value="${t.reference_range||''}" placeholder="e.g. WBC: 4.5-11.0 K/µL" />
    </div>
    <div class="form-group"><label class="form-label">Remarks</label>
      <textarea class="form-textarea" name="remarks">${t.remarks||''}</textarea>
    </div>
  </form>`;

  Modal.open(`Update — ${t.test_name}`, body,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitLabUpdate(${id})">Save Results</button>`
  );
}

async function submitLabUpdate(id) {
  const form = document.getElementById('lab-update-form');
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await api.put(`/lab/${id}`, data);
    toast('success', 'Results saved');
    Modal.close();
    Pages.lab();
  } catch(e) { toast('error', 'Failed', e.message); }
}
