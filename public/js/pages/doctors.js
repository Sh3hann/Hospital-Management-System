// ─── DOCTORS PAGE ────────────────────────────────────
window.Pages = window.Pages || {};
Pages.doctors = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner();

  try {
    const [doctors, depts] = await Promise.all([
      api.get('/doctors'),
      api.get('/staff/departments')
    ]);

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Doctors</h2><p>${doctors.length} doctors on staff</p></div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openAddDoctor()">+ Add Doctor</button>
      </div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-input search-input" id="doc-search" placeholder="Search doctors..." oninput="filterDoctors(this.value)" />
        </div>
        <select class="form-select" id="doc-dept-filter" onchange="filterDoctors()" style="max-width:180px">
          <option value="">All Departments</option>
          ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
      </div>

      <div id="doctors-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding-top:4px">
        ${doctors.map(d => renderDoctorCard(d)).join('')}
      </div>
    </div>`;

    window._allDoctors = doctors;
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading doctors</div><p>${e.message}</p></div>`;
  }
};

function renderDoctorCard(d) {
  return `
  <div class="card" style="cursor:pointer;transition:all 0.2s" onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div class="avatar" style="width:48px;height:48px;font-size:18px;border-radius:14px">${(d.name||'D')[0]}</div>
      <div>
        <div class="font-semibold" style="font-size:14px">${d.name}</div>
        <div class="text-sm text-muted">${d.specialization}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span class="text-muted">Department</span>
        <span>${d.department_name || '—'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span class="text-muted">Experience</span>
        <span>${d.experience_years || 0} years</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span class="text-muted">Consultation Fee</span>
        <span class="text-success font-semibold">${currency(d.consultation_fee)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span class="text-muted">Pending Appts</span>
        <span class="badge badge-primary">${d.pending_appointments || 0}</span>
      </div>
    </div>
    <div style="display:flex;gap:6px">
      <button class="btn btn-outline btn-sm" style="flex:1" onclick="viewDoctorDetail(${d.id})">View</button>
      <button class="btn btn-ghost btn-sm" style="flex:1" onclick="openEditDoctor(${d.id})">Edit</button>
    </div>
  </div>`;
}

function filterDoctors(search = '') {
  const deptFilter = document.getElementById('doc-dept-filter')?.value;
  const s = (search || document.getElementById('doc-search')?.value || '').toLowerCase();
  const filtered = (window._allDoctors || []).filter(d => {
    const matchSearch = !s || d.name.toLowerCase().includes(s) || d.specialization.toLowerCase().includes(s);
    const matchDept = !deptFilter || d.department_id == deptFilter;
    return matchSearch && matchDept;
  });
  const grid = document.getElementById('doctors-grid');
  if (grid) grid.innerHTML = filtered.length ? filtered.map(d => renderDoctorCard(d)).join('') : emptyState('🩺', 'No doctors found');
}

async function viewDoctorDetail(id) {
  Modal.open('Doctor Details', loadingSpinner(), '', 'lg');
  try {
    const d = await api.get(`/doctors/${id}`);
    const sched = d.schedule || {};
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const body = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="avatar" style="width:56px;height:56px;font-size:22px;border-radius:16px">${(d.name||'D')[3]}</div>
      <div>
        <h3 style="font-size:18px;font-weight:700">${d.name}</h3>
        <p class="text-muted">${d.specialization} · ${d.department_name || '—'}</p>
        <p class="text-sm" style="margin-top:4px">${d.qualification || ''}</p>
      </div>
    </div>
    <div class="detail-grid mb-4">
      <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${d.phone || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${d.email || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Experience</div><div class="detail-value">${d.experience_years || 0} years</div></div>
      <div class="detail-item"><div class="detail-label">Consultation Fee</div><div class="detail-value text-success font-bold">${currency(d.consultation_fee)}</div></div>
    </div>
    <div class="form-section-title">Weekly Schedule</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px">
      ${days.map(day => `
      <div style="text-align:center;padding:8px 4px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border)">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${day.slice(0,3)}</div>
        <div style="font-size:10px;color:${sched[day]?'var(--success)':'var(--text-faint)'}">${sched[day] || 'Off'}</div>
      </div>`).join('')}
    </div>
    <div class="form-section-title">Today's Appointments</div>
    ${!d.todays_appointments?.length ? emptyState('📅', 'No appointments today', '') : `
    <table><thead><tr><th>Time</th><th>Patient</th><th>Type</th><th>Status</th></tr></thead>
    <tbody>${d.todays_appointments.map(a => `
      <tr>
        <td>${formatTime(a.appointment_time)}</td>
        <td>${a.first_name} ${a.last_name}<br><span class="text-xs text-muted">${a.mrn}</span></td>
        <td>${capitalize(a.type)}</td>
        <td>${statusBadge(a.status)}</td>
      </tr>`).join('')}</tbody></table>`}`;

    Modal.open(`Dr. ${d.name}`, body,
      `<button class="btn btn-outline" onclick="Modal.close()">Close</button>
       <button class="btn btn-primary" onclick="openEditDoctor(${d.id})">Edit Doctor</button>`,
      'lg'
    );
  } catch(e) { toast('error', 'Failed to load doctor', e.message); }
}

async function openAddDoctor() {
  const depts = await api.get('/staff/departments').catch(() => []);
  const body = buildDoctorForm(null, depts);
  Modal.open('Add Doctor', body,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitDoctorForm()">Add Doctor</button>`
  );
}

async function openEditDoctor(id) {
  Modal.open('Edit Doctor', loadingSpinner());
  try {
    const [d, depts] = await Promise.all([api.get(`/doctors/${id}`), api.get('/staff/departments').catch(()=>[])]);
    Modal.open(`Edit — ${d.name}`, buildDoctorForm(d, depts),
      `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="submitDoctorForm(${d.id})">Save Changes</button>`
    );
  } catch(e) { toast('error', 'Failed to load', e.message); Modal.close(); }
}

function buildDoctorForm(d, depts) {
  const sched = (d && typeof d.schedule === 'object') ? d.schedule : {};
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  return `<form id="doctor-form">
  <div class="form-row">
    <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" name="name" value="${d?.name||''}" required /></div>
    <div class="form-group"><label class="form-label">Specialization *</label><input class="form-input" name="specialization" value="${d?.specialization||''}" required /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Department</label>
      <select class="form-select" name="department_id">
        <option value="">None</option>
        ${depts.map(dept => `<option value="${dept.id}" ${d?.department_id==dept.id?'selected':''}>${dept.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Qualification</label><input class="form-input" name="qualification" value="${d?.qualification||''}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Phone</label><input class="form-input" name="phone" value="${d?.phone||''}" /></div>
    <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" value="${d?.email||''}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Experience (years)</label><input class="form-input" type="number" name="experience_years" value="${d?.experience_years||0}" min="0" /></div>
    <div class="form-group"><label class="form-label">Consultation Fee (LKR)</label><input class="form-input" type="number" name="consultation_fee" value="${d?.consultation_fee||0}" min="0" step="0.01" /></div>
  </div>
  <div class="form-section-title">Weekly Schedule (HH:MM-HH:MM or leave blank for off)</div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
    ${days.map(day => `
    <div class="form-group">
      <label class="form-label">${day.slice(0,3)}</label>
      <input class="form-input" name="schedule_${day}" value="${sched[day]||''}" placeholder="09:00-17:00" style="font-size:11px;padding:6px 8px" />
    </div>`).join('')}
  </div>
  </form>`;
}

async function submitDoctorForm(id = null) {
  const form = document.getElementById('doctor-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  const schedule = {};
  ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].forEach(day => {
    schedule[day] = data[`schedule_${day}`] || '';
    delete data[`schedule_${day}`];
  });
  data.schedule = schedule;

  try {
    if (id) { await api.put(`/doctors/${id}`, data); toast('success', 'Doctor updated'); }
    else { await api.post('/doctors', data); toast('success', 'Doctor added'); }
    Modal.close();
    Pages.doctors();
  } catch(e) { toast('error', 'Failed to save', e.message); }
}
