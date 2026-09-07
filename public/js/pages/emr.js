// ─── EMR (ELECTRONIC MEDICAL RECORDS) PAGE ───────────
window.Pages = window.Pages || {};
Pages.emr = async function(page = 1) {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner('Loading medical records...');

  try {
    const resData = await api.get(`/medical-records?page=${page}&limit=15`);
    const records = Array.isArray(resData) ? resData : (resData.data || []);

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Medical Records (EMR)</h2>
        <p>Electronic medical records, diagnosis history & treatment plans</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openCreateRecord()">+ New Record</button>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        ${records.length === 0 ? emptyState('📋', 'No medical records found', 'No EMR records entered yet.') :
        `<table>
          <thead><tr>
            <th>Date</th><th>Patient</th><th>Doctor</th><th>Diagnosis</th><th>Prescription</th><th>Follow-up</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${records.map(r => `
            <tr>
              <td>${formatDate(r.visit_date)}</td>
              <td>
                <div class="font-semibold">${r.first_name} ${r.last_name}</div>
                <div class="text-xs text-muted">${r.mrn}</div>
              </td>
              <td>
                <div>${r.doctor_name || 'Dr. Assigned'}</div>
                <div class="text-xs text-muted">${r.specialization || ''}</div>
              </td>
              <td class="truncate" style="max-width:180px">${r.diagnosis || '—'}</td>
              <td class="truncate" style="max-width:160px">${r.prescription ? r.prescription : '—'}</td>
              <td>${r.follow_up_date ? `<span class="badge badge-warning">${formatDate(r.follow_up_date)}</span>` : '—'}</td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="viewRecord(${r.id})">View Record</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
    </div>`;
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading records</div><p>${e.message}</p></div>`;
  }
};

async function openCreateRecord() {
  const [patients, doctors] = await Promise.all([
    api.get('/patients?limit=200').then(r => r.data || r).catch(() => []),
    api.get('/doctors').catch(() => [])
  ]);

  const body = `
  <form id="record-form">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Patient *</label>
        <select class="form-select" name="patient_id" required>
          <option value="">Select patient...</option>
          ${patients.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name} (${p.mrn})</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Attending Doctor *</label>
        <select class="form-select" name="doctor_id" required>
          <option value="">Select doctor...</option>
          ${doctors.map(d => `<option value="${d.id}">${d.name} — ${d.specialization}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="form-section-title mt-3">Vital Signs</div>
    <div class="form-row-3">
      <div class="form-group"><label class="form-label">Blood Pressure</label><input class="form-input" name="bp" placeholder="120/80 mmHg" /></div>
      <div class="form-group"><label class="form-label">Pulse (bpm)</label><input class="form-input" name="pulse" placeholder="72" /></div>
      <div class="form-group"><label class="form-label">Temperature (°F)</label><input class="form-input" name="temp" placeholder="98.6" /></div>
    </div>
    <div class="form-row-3 mt-2">
      <div class="form-group"><label class="form-label">Weight (kg)</label><input class="form-input" name="weight" placeholder="70" /></div>
      <div class="form-group"><label class="form-label">Height (cm)</label><input class="form-input" name="height" placeholder="175" /></div>
      <div class="form-group"><label class="form-label">SpO2 (%)</label><input class="form-input" name="spo2" placeholder="98" /></div>
    </div>

    <div class="form-group mt-3"><label class="form-label">Chief Complaint *</label>
      <textarea class="form-textarea" name="chief_complaint" required placeholder="Patient reported symptoms..."></textarea>
    </div>
    <div class="form-group mt-3"><label class="form-label">Diagnosis *</label>
      <textarea class="form-textarea" name="diagnosis" required placeholder="Primary medical diagnosis..."></textarea>
    </div>
    <div class="form-group mt-3"><label class="form-label">Treatment Plan</label>
      <textarea class="form-textarea" name="treatment_plan" placeholder="Prescribed treatment, therapy or procedures..."></textarea>
    </div>
    <div class="form-group mt-3"><label class="form-label">Prescription Details</label>
      <textarea class="form-textarea" name="prescription" placeholder="Medications, dosage and frequency..."></textarea>
    </div>
    <div class="form-row mt-3">
      <div class="form-group"><label class="form-label">Follow-up Date</label><input class="form-input" type="date" name="follow_up_date" /></div>
    </div>
  </form>`;

  Modal.open('New Medical Record (EMR)', body,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitRecordForm()">Save Record</button>`
  );
}

async function submitRecordForm() {
  const form = document.getElementById('record-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const raw = Object.fromEntries(new FormData(form).entries());

  const data = {
    patient_id: raw.patient_id,
    doctor_id: raw.doctor_id,
    chief_complaint: raw.chief_complaint,
    diagnosis: raw.diagnosis,
    treatment_plan: raw.treatment_plan,
    prescription: raw.prescription,
    follow_up_date: raw.follow_up_date || null,
    vitals: JSON.stringify({
      bp: raw.bp, pulse: raw.pulse, temp: raw.temp,
      weight: raw.weight, height: raw.height, spo2: raw.spo2
    })
  };

  try {
    await api.post('/medical-records', data);
    toast('success', 'Medical record created');
    Modal.close();
    Pages.emr();
  } catch(e) {
    toast('error', 'Failed to save record', e.message);
  }
}

async function viewRecord(id) {
  Modal.open('Medical Record Details', loadingSpinner());
  try {
    const r = await api.get(`/medical-records/${id}`);
    const v = r.vitals || {};

    const body = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <h3 style="font-size:18px;font-weight:700">${r.first_name} ${r.last_name}</h3>
        <p class="text-muted text-xs">MRN: ${r.mrn} · DOB: ${formatDate(r.dob)} · Blood: ${r.blood_type || 'N/A'}</p>
      </div>
      <div class="text-right">
        <div class="font-semibold text-primary">Dr. ${r.doctor_name}</div>
        <div class="text-xs text-muted">${r.specialization}</div>
        <div class="text-xs text-faint">${formatDate(r.visit_date)}</div>
      </div>
    </div>

    <div class="form-section-title">Vitals</div>
    <div class="vitals-grid mb-3">
      <div class="vital-item"><div class="vital-value">${v.bp || '—'}</div><div class="vital-label">BP</div></div>
      <div class="vital-item"><div class="vital-value">${v.pulse ? v.pulse + ' bpm' : '—'}</div><div class="vital-label">Pulse</div></div>
      <div class="vital-item"><div class="vital-value">${v.temp ? v.temp + ' °F' : '—'}</div><div class="vital-label">Temp</div></div>
      <div class="vital-item"><div class="vital-value">${v.weight ? v.weight + ' kg' : '—'}</div><div class="vital-label">Weight</div></div>
      <div class="vital-item"><div class="vital-value">${v.spo2 ? v.spo2 + ' %' : '—'}</div><div class="vital-label">SpO2</div></div>
    </div>

    <div class="form-section-title mt-3">Clinical Evaluation</div>
    <div style="background:var(--surface-2);padding:12px;border-radius:8px;margin-bottom:10px">
      <div class="detail-label">Chief Complaint</div>
      <div class="text-sm">${r.chief_complaint || '—'}</div>
    </div>
    <div style="background:var(--surface-2);padding:12px;border-radius:8px;margin-bottom:10px">
      <div class="detail-label">Diagnosis</div>
      <div class="text-sm font-semibold">${r.diagnosis || '—'}</div>
    </div>
    <div style="background:var(--surface-2);padding:12px;border-radius:8px;margin-bottom:10px">
      <div class="detail-label">Treatment Plan</div>
      <div class="text-sm">${r.treatment_plan || '—'}</div>
    </div>
    <div style="background:var(--surface-2);padding:12px;border-radius:8px">
      <div class="detail-label">Prescription</div>
      <div class="text-sm font-semibold text-primary">${r.prescription || 'None'}</div>
    </div>`;

    Modal.open(`EMR Record — ${r.first_name} ${r.last_name}`, body,
      `<button class="btn btn-outline" onclick="Modal.close()">Close</button>`
    );
  } catch(e) {
    toast('error', 'Error loading record', e.message);
  }
}
