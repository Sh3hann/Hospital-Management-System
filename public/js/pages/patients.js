// ─── PATIENTS PAGE ────────────────────────────────────
window.Pages = window.Pages || {};
Pages.patients = async function(page = 1, search = '') {
  const content = document.getElementById('page-content');
  if (page === 1) content.innerHTML = loadingSpinner();

  try {
    const params = new URLSearchParams({ page, limit: 15, ...(search ? { search } : {}) });
    const { data: patients, total } = await api.get(`/patients?${params}`);

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Patients</h2>
        <p>${total} total patients registered</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" id="add-patient-btn" onclick="openAddPatient()">+ Register Patient</button>
      </div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-input search-input" id="patient-search" type="text"
            placeholder="Search by name, MRN, or phone..."
            value="${search}"
            oninput="debouncePatientSearch(this.value)" />
        </div>
      </div>

      <div class="table-wrap">
        ${patients.length === 0
          ? emptyState('👥', 'No patients found', search ? 'Try a different search term' : 'Register your first patient')
          : `<table>
            <thead><tr>
              <th>MRN</th><th>Patient</th><th>Age/Gender</th><th>Blood Type</th>
              <th>Phone</th><th>Appointments</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${patients.map(p => `
              <tr>
                <td><span class="badge badge-neutral">${p.mrn}</span></td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div class="avatar">${(p.first_name||'P')[0]}</div>
                    <div>
                      <div class="font-semibold">${p.first_name} ${p.last_name}</div>
                      <div class="text-xs text-muted">${p.email || 'No email'}</div>
                    </div>
                  </div>
                </td>
                <td>${calcAge(p.dob)} · ${p.gender || '—'}</td>
                <td>${p.blood_type ? `<span class="badge badge-danger">${p.blood_type}</span>` : '—'}</td>
                <td>${p.phone || '—'}</td>
                <td><span class="badge badge-primary">${p.appointment_count || 0} appts</span></td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-outline btn-sm" onclick="viewPatient(${p.id})">View</button>
                    <button class="btn btn-ghost btn-sm" onclick="openEditPatient(${p.id})">Edit</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>`}
      </div>
      <div id="pagination"></div>
    </div>`;

    const pagEl = document.getElementById('pagination');
    if (pagEl) {
      renderPagination(pagEl, page, total, 15, `(p) => Pages.patients(p, '${search}')`);
    }
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading patients</div><p class="empty-desc">${e.message}</p></div>`;
  }
};

// Debounce search
let patientSearchTimer;
function debouncePatientSearch(val) {
  clearTimeout(patientSearchTimer);
  patientSearchTimer = setTimeout(() => Pages.patients(1, val), 350);
}

// View patient detail
async function viewPatient(id) {
  Modal.open('Patient Details', loadingSpinner(), '', 'lg');
  try {
    const p = await api.get(`/patients/${id}`);
    const bodyHtml = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <div class="avatar" style="width:52px;height:52px;font-size:20px;border-radius:14px">${(p.first_name||'P')[0]}</div>
      <div>
        <h3 style="font-size:18px;font-weight:700">${p.first_name} ${p.last_name}</h3>
        <div style="display:flex;gap:8px;margin-top:4px">
          <span class="badge badge-neutral">${p.mrn}</span>
          ${p.blood_type ? `<span class="badge badge-danger">${p.blood_type}</span>` : ''}
          ${p.gender ? `<span class="badge badge-info">${p.gender}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="tab-nav" id="patient-tabs">
      <button class="tab-btn active" onclick="switchPatientTab('info')">Info</button>
      <button class="tab-btn" onclick="switchPatientTab('appointments')">Appointments (${p.appointments?.length || 0})</button>
      <button class="tab-btn" onclick="switchPatientTab('records')">Medical Records (${p.records?.length || 0})</button>
      <button class="tab-btn" onclick="switchPatientTab('labs')">Lab Tests (${p.labs?.length || 0})</button>
      <button class="tab-btn" onclick="switchPatientTab('documents')">Documents (${p.documents?.length || 0})</button>
      <button class="tab-btn" onclick="switchPatientTab('billing')">Bills (${p.bills?.length || 0})</button>
    </div>

    <div id="patient-tab-info" class="tab-panel active">
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Date of Birth</div><div class="detail-value">${formatDate(p.dob)} (${calcAge(p.dob)})</div></div>
        <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${p.phone || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${p.email || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Address</div><div class="detail-value">${p.address || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Emergency Contact</div><div class="detail-value">${p.emergency_contact_name || '—'} · ${p.emergency_contact_phone || ''}</div></div>
        <div class="detail-item"><div class="detail-label">Insurance</div><div class="detail-value">${p.insurance_provider || '—'} ${p.insurance_number ? `(${p.insurance_number})` : ''}</div></div>
        <div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Allergies</div><div class="detail-value">${p.allergies ? `<span class="badge badge-danger">⚠️ ${p.allergies}</span>` : 'None known'}</div></div>
        ${p.notes ? `<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Notes</div><div class="detail-value">${p.notes}</div></div>` : ''}
      </div>
    </div>

    <div id="patient-tab-appointments" class="tab-panel">
      ${!p.appointments?.length ? emptyState('📅', 'No appointments') : `
      <table><thead><tr><th>Date</th><th>Doctor</th><th>Type</th><th>Status</th></tr></thead>
      <tbody>${p.appointments.map(a => `
        <tr>
          <td>${formatDate(a.appointment_date)} ${formatTime(a.appointment_time)}</td>
          <td>${a.doctor_name}<br><span class="text-xs text-muted">${a.specialization}</span></td>
          <td>${capitalize(a.type)}</td>
          <td>${statusBadge(a.status)}</td>
        </tr>`).join('')}</tbody></table>`}
    </div>

    <div id="patient-tab-records" class="tab-panel">
      ${!p.records?.length ? emptyState('📋', 'No medical records') : `
      <div class="timeline">
        ${p.records.map(r => `
        <div class="timeline-item">
          <div class="timeline-dot">📋</div>
          <div class="timeline-content">
            <div class="timeline-date">${formatDateTime(r.visit_date)} · Dr. ${r.doctor_name}</div>
            <div class="timeline-title">${r.diagnosis || 'No diagnosis'}</div>
            <div class="timeline-body">${r.prescription ? `💊 ${r.prescription}` : ''}</div>
          </div>
        </div>`).join('')}
      </div>`}
    </div>

    <div id="patient-tab-labs" class="tab-panel">
      ${!p.labs?.length ? emptyState('🔬', 'No laboratory tests requested') : `
      <table><thead><tr><th>Test</th><th>Category</th><th>Doctor</th><th>Status</th><th>Result</th></tr></thead>
      <tbody>${p.labs.map(l => `
        <tr>
          <td class="font-semibold">${l.test_name}</td>
          <td><span class="badge badge-neutral">${l.test_category || 'General'}</span></td>
          <td>${l.doctor_name || '—'}</td>
          <td>${statusBadge(l.status)}</td>
          <td>${l.result ? `<span class="text-success font-semibold">${l.result}</span>` : '<span class="text-muted">—</span>'}</td>
        </tr>`).join('')}</tbody></table>`}
    </div>

    <div id="patient-tab-documents" class="tab-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="font-semibold" style="font-size:13px">Medical Documents & Uploads</div>
        <button class="btn btn-primary btn-sm" onclick="openUploadDocument(${p.id})">+ Upload Document</button>
      </div>
      ${!p.documents?.length ? emptyState('📁', 'No documents uploaded', 'Upload medical reports, scan images or lab results') : `
      <table><thead><tr><th>Document</th><th>Category</th><th>File</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>${p.documents.map(d => `
        <tr>
          <td><div class="font-semibold">📄 ${d.title}</div></td>
          <td><span class="badge badge-neutral">${capitalize(d.category || 'General')}</span></td>
          <td class="text-xs text-muted">${d.file_name} (${d.file_size || 'N/A'})</td>
          <td>${formatDate(d.created_at)}</td>
          <td><button class="btn btn-outline btn-sm" onclick="toast('info', 'Document', '${d.title} ready for review')">View</button></td>
        </tr>`).join('')}</tbody></table>`}
    </div>

    <div id="patient-tab-billing" class="tab-panel">
      ${!p.bills?.length ? emptyState('💳', 'No billing records') : `
      <table><thead><tr><th>Date</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead>
      <tbody>${p.bills.map(b => `
        <tr>
          <td>${formatDate(b.created_at)}</td>
          <td>${currency(b.total)}</td>
          <td>${currency(b.paid_amount || 0)}</td>
          <td>${statusBadge(b.status)}</td>
        </tr>`).join('')}</tbody></table>`}
    </div>`;

    Modal.open(`Patient — ${p.first_name} ${p.last_name}`, bodyHtml,
      `<button class="btn btn-outline" onclick="Modal.close()">Close</button>
       <button class="btn btn-ghost" onclick="openEditPatient(${p.id})">Edit Patient</button>
       <button class="btn btn-primary" onclick="openBookAppointmentForPatient(${p.id})">Book Appointment</button>`,
      'lg'
    );
  } catch(e) {
    Modal.open('Error', `<p>${e.message}</p>`);
  }
}

function switchPatientTab(name) {
  document.querySelectorAll('#modal-body .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#modal-body .tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`patient-tab-${name}`);
  if (panel) panel.classList.add('active');
  document.querySelectorAll('#modal-body .tab-btn').forEach(b => {
    if (b.getAttribute('onclick') === `switchPatientTab('${name}')`) b.classList.add('active');
  });
}

function openUploadDocument(patientId) {
  Modal.open('Upload Patient Document',
    `<form id="upload-doc-form">
      <div class="form-group">
        <label class="form-label">Document Title *</label>
        <input class="form-input" name="title" placeholder="e.g. Blood Test Report, MRI Scan" required />
      </div>
      <div class="form-group mt-3">
        <label class="form-label">Category</label>
        <select class="form-select" name="category">
          <option value="lab_report">Lab Report</option>
          <option value="radiology_scan">Radiology / Scan</option>
          <option value="referral_letter">Referral Letter</option>
          <option value="prescription_scan">Prescription Scan</option>
          <option value="insurance_doc">Insurance Document</option>
          <option value="other">Other Document</option>
        </select>
      </div>
      <div class="form-group mt-3">
        <label class="form-label">Select File *</label>
        <input class="form-input" type="file" id="doc-file-input" required />
      </div>
      <div class="form-group mt-3">
        <label class="form-label">Notes / Description</label>
        <textarea class="form-textarea" name="notes" placeholder="Optional notes..."></textarea>
      </div>
    </form>`,
    `<button class="btn btn-outline" onclick="viewPatient(${patientId})">Cancel</button>
     <button class="btn btn-primary" onclick="submitUploadDocument(${patientId})">Upload Document</button>`
  );
}

async function submitUploadDocument(patientId) {
  const form = document.getElementById('upload-doc-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const fileInput = document.getElementById('doc-file-input');
  const file = fileInput?.files?.[0];
  const title = form.elements['title'].value.trim();
  const category = form.elements['category'].value;

  const payload = {
    title,
    category,
    file_name: file ? file.name : 'document.pdf',
    file_size: file ? `${(file.size / 1024).toFixed(1)} KB` : '150 KB',
    file_data: ''
  };

  try {
    await api.post(`/patients/${patientId}/documents`, payload);
    toast('success', 'Document Uploaded', `${title} saved successfully`);
    viewPatient(patientId);
  } catch(e) {
    toast('error', 'Upload Failed', e.message);
  }
}

// Open add patient form
function openAddPatient() {
  const body = `
  <form id="patient-form">
    <div class="form-section">
      <div class="form-section-title">Personal Information</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">First Name *</label><input class="form-input" name="first_name" required /></div>
        <div class="form-group"><label class="form-label">Last Name *</label><input class="form-input" name="last_name" required /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Date of Birth</label><input class="form-input" type="date" name="dob" /></div>
        <div class="form-group"><label class="form-label">Gender</label>
          <select class="form-select" name="gender"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Blood Type</label>
          <select class="form-select" name="blood_type"><option value="">Unknown</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select>
        </div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" name="phone" placeholder="+1-555-0000" /></div>
      </div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" /></div>
      <div class="form-group"><label class="form-label">Address</label><textarea class="form-textarea" name="address" rows="2"></textarea></div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Emergency Contact</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Contact Name</label><input class="form-input" name="emergency_contact_name" /></div>
        <div class="form-group"><label class="form-label">Contact Phone</label><input class="form-input" name="emergency_contact_phone" /></div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Insurance & Medical</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Insurance Provider</label><input class="form-input" name="insurance_provider" /></div>
        <div class="form-group"><label class="form-label">Insurance Number</label><input class="form-input" name="insurance_number" /></div>
      </div>
      <div class="form-group"><label class="form-label">Allergies</label><input class="form-input" name="allergies" placeholder="e.g. Penicillin, Aspirin" /></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" name="notes" rows="2"></textarea></div>
    </div>
  </form>`;

  Modal.open('Register New Patient', body,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitPatientForm()">Register Patient</button>`
  );
}

async function openEditPatient(id) {
  Modal.open('Edit Patient', loadingSpinner());
  try {
    const p = await api.get(`/patients/${id}`);
    const body = `
    <form id="patient-form">
      <input type="hidden" name="id" value="${p.id}" />
      <div class="form-row">
        <div class="form-group"><label class="form-label">First Name *</label><input class="form-input" name="first_name" value="${p.first_name||''}" required /></div>
        <div class="form-group"><label class="form-label">Last Name *</label><input class="form-input" name="last_name" value="${p.last_name||''}" required /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Date of Birth</label><input class="form-input" type="date" name="dob" value="${p.dob||''}" /></div>
        <div class="form-group"><label class="form-label">Gender</label>
          <select class="form-select" name="gender">
            <option value="">Select</option>
            <option ${p.gender==='Male'?'selected':''}>Male</option>
            <option ${p.gender==='Female'?'selected':''}>Female</option>
            <option ${p.gender==='Other'?'selected':''}>Other</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Blood Type</label>
          <select class="form-select" name="blood_type">
            <option value="">Unknown</option>
            ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => `<option ${p.blood_type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" name="phone" value="${p.phone||''}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" value="${p.email||''}" /></div>
      <div class="form-group"><label class="form-label">Address</label><textarea class="form-textarea" name="address" rows="2">${p.address||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Emergency Contact</label><input class="form-input" name="emergency_contact_name" value="${p.emergency_contact_name||''}" /></div>
        <div class="form-group"><label class="form-label">Contact Phone</label><input class="form-input" name="emergency_contact_phone" value="${p.emergency_contact_phone||''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Insurance Provider</label><input class="form-input" name="insurance_provider" value="${p.insurance_provider||''}" /></div>
        <div class="form-group"><label class="form-label">Insurance Number</label><input class="form-input" name="insurance_number" value="${p.insurance_number||''}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Allergies</label><input class="form-input" name="allergies" value="${p.allergies||''}" /></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" name="notes">${p.notes||''}</textarea></div>
    </form>`;

    Modal.open(`Edit Patient — ${p.first_name} ${p.last_name}`, body,
      `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="submitPatientForm(${p.id})">Save Changes</button>`
    );
  } catch(e) {
    toast('error', 'Failed to load patient', e.message);
    Modal.close();
  }
}

async function submitPatientForm(id = null) {
  const form = document.getElementById('patient-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  delete data.id;

  try {
    if (id) {
      await api.put(`/patients/${id}`, data);
      toast('success', 'Patient updated successfully');
    } else {
      await api.post('/patients', data);
      toast('success', 'Patient registered', 'New patient has been added to the system');
    }
    Modal.close();
    Pages.patients();
  } catch(e) {
    toast('error', 'Failed to save patient', e.message);
  }
}

function openBookAppointmentForPatient(patientId) {
  Modal.close();
  setTimeout(() => { App.navigate('appointments'); setTimeout(() => openBookAppointment(patientId), 300); }, 200);
}
