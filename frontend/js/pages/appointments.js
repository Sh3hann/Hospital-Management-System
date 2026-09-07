// ─── APPOINTMENTS PAGE ────────────────────────────────
window.Pages = window.Pages || {};
let apptCurrentDate = new Date();

Pages.appointments = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner();

  try {
    const today = todayStr();
    const [todayAppts, calData] = await Promise.all([
      api.get(`/appointments/today`),
      api.get(`/appointments/calendar?year=${apptCurrentDate.getFullYear()}&month=${apptCurrentDate.getMonth()+1}`)
    ]);

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Appointments</h2><p>${todayAppts.length} appointments today</p></div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openBookAppointment()">+ Book Appointment</button>
      </div>
    </div>

    <div class="grid-2">
      <!-- Calendar -->
      <div class="card">
        <div class="card-header">
          <button class="btn btn-ghost btn-sm" onclick="changeCalMonth(-1)">‹</button>
          <div style="text-align:center">
            <div class="card-title">${apptCurrentDate.toLocaleString('en-US',{month:'long',year:'numeric'})}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="changeCalMonth(1)">›</button>
        </div>
        <div class="calendar-grid">
          ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="calendar-header">${d}</div>`).join('')}
          ${buildCalendarDays(apptCurrentDate, calData)}
        </div>
      </div>

      <!-- Today's Appointments -->
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">Today's Schedule</div><div class="card-subtitle">${formatDate(today)}</div></div>
          <div style="display:flex;gap:6px">
            <span class="badge badge-primary">${todayAppts.filter(a=>a.status==='scheduled').length} scheduled</span>
            <span class="badge badge-success">${todayAppts.filter(a=>a.status==='completed').length} done</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:380px;overflow-y:auto">
          ${todayAppts.length === 0 ? emptyState('', 'No appointments today') :
          todayAppts.map(a => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border)">
            <div style="text-align:center;min-width:44px">
              <div style="font-size:15px;font-weight:700;color:var(--primary-light)">${formatTime(a.appointment_time)}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div class="font-semibold truncate">${a.first_name} ${a.last_name}</div>
              <div class="text-xs text-muted">${a.mrn} · Dr. ${a.doctor_name || 'Unassigned'}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              ${statusBadge(a.status)}
              <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditAppointment(${a.id})" title="Edit">${RBAC.icon('settings')}</button>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- ALL APPOINTMENTS TABLE -->
    <div class="card mt-4" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title">All Appointments</div>
        <div style="display:flex;gap:8px">
          <input class="form-input" type="date" id="appt-date-filter" onchange="loadAppointmentsTable()" style="max-width:160px" />
          <select class="form-select" id="appt-status-filter" onchange="loadAppointmentsTable()" style="max-width:140px">
            <option value="">All Status</option>
            <option>scheduled</option><option>in-progress</option><option>completed</option><option>cancelled</option>
          </select>
        </div>
      </div>
      <div id="appts-table-wrap"><div class="loading"><div class="spinner"></div></div></div>
    </div>`;

    loadAppointmentsTable();
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error</div><p>${e.message}</p></div>`;
  }
};

function buildCalendarDays(date, calData) {
  const year = date.getFullYear(), month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];
  const calMap = {};
  calData.forEach(d => { calMap[d.appointment_date] = d; });
  let html = '';
  // Pad start
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day other-month"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const info = calMap[dateStr];
    const isToday = dateStr === today;
    html += `<div class="calendar-day${isToday?' today':''}${info?' has-events':''}" onclick="loadAppointmentsTable('${dateStr}')" title="${dateStr}">
      <span>${day}</span>
      ${info ? `<span class="cal-count">${info.count}</span>` : ''}
    </div>`;
  }
  return html;
}

function changeCalMonth(dir) {
  apptCurrentDate.setMonth(apptCurrentDate.getMonth() + dir);
  Pages.appointments();
}

let apptPage = 1;
async function loadAppointmentsTable(dateOverride) {
  const tableWrap = document.getElementById('appts-table-wrap');
  if (!tableWrap) return;
  tableWrap.innerHTML = loadingSpinner();

  const dateFilter = dateOverride || document.getElementById('appt-date-filter')?.value || '';
  if (dateOverride && document.getElementById('appt-date-filter')) {
    document.getElementById('appt-date-filter').value = dateOverride;
  }
  const statusFilter = document.getElementById('appt-status-filter')?.value || '';

  try {
    const params = new URLSearchParams({ page: apptPage, limit: 15, ...(dateFilter?{date:dateFilter}:{}), ...(statusFilter?{status:statusFilter}:{}) });
    const { data, total } = await api.get(`/appointments?${params}`);

    tableWrap.innerHTML = `
    ${data.length === 0 ? emptyState('📅', 'No appointments found') :
    `<div class="table-wrap"><table>
      <thead><tr><th>Date & Time</th><th>Patient</th><th>Doctor</th><th>Type</th><th>Status</th><th>Complaint</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.map(a => `
        <tr>
          <td>
            <div class="font-semibold">${formatDate(a.appointment_date)}</div>
            <div class="text-xs text-muted">${formatTime(a.appointment_time)}</div>
          </td>
          <td>
            <div>${a.first_name} ${a.last_name}</div>
            <div class="text-xs text-muted">${a.mrn}</div>
          </td>
          <td>
            <div>${a.doctor_name}</div>
            <div class="text-xs text-muted">${a.specialization}</div>
          </td>
          <td>${capitalize(a.type||'')}</td>
          <td>${statusBadge(a.status)}</td>
          <td class="truncate" style="max-width:160px">${a.chief_complaint||'—'}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-outline btn-sm" onclick="openEditAppointment(${a.id})">Edit</button>
              ${a.status !== 'cancelled' ? `<button class="btn btn-ghost btn-sm" onclick="cancelAppointment(${a.id})">Cancel</button>` : ''}
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`}
    <div id="appt-pagination"></div>`;

    renderPagination(document.getElementById('appt-pagination'), apptPage, total, 15, `(p) => { apptPage=p; loadAppointmentsTable(); }`);
  } catch(e) {
    tableWrap.innerHTML = `<div class="empty-state"><div class="empty-title">Error</div><p>${e.message}</p></div>`;
  }
}

async function openBookAppointment(preselectedPatientId = null) {
  const [patients, doctors] = await Promise.all([
    api.get('/patients?limit=200').then(r => r.data || r),
    api.get('/doctors')
  ]);

  const body = `<form id="appt-form">
    <div class="form-group"><label class="form-label">Patient *</label>
      <select class="form-select" name="patient_id" required>
        <option value="">Select patient...</option>
        ${patients.map(p => `<option value="${p.id}" ${preselectedPatientId==p.id?'selected':''}>${p.first_name} ${p.last_name} (${p.mrn})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Doctor *</label>
      <select class="form-select" name="doctor_id" required onchange="loadDoctorSlots()">
        <option value="">Select doctor...</option>
        ${doctors.map(d => `<option value="${d.id}">${d.name} — ${d.specialization}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date *</label>
        <input class="form-input" type="date" name="appointment_date" min="${todayStr()}" required onchange="loadDoctorSlots()" />
      </div>
      <div class="form-group"><label class="form-label">Time *</label>
        <select class="form-select" name="appointment_time" id="time-select" required>
          <option value="">Select date & doctor first</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Appointment Type</label>
      <select class="form-select" name="type">
        <option value="consultation">Consultation</option>
        <option value="follow-up">Follow-up</option>
        <option value="emergency">Emergency</option>
        <option value="procedure">Procedure</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Chief Complaint</label>
      <textarea class="form-textarea" name="chief_complaint" rows="2" placeholder="Reason for visit"></textarea>
    </div>
    <div class="form-group"><label class="form-label">Notes</label>
      <textarea class="form-textarea" name="notes" rows="2"></textarea>
    </div>
  </form>`;

  Modal.open('Book Appointment', body,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitAppointmentForm()">Book Appointment</button>`
  );
}

async function loadDoctorSlots() {
  const form = document.getElementById('appt-form');
  if (!form) return;
  const doctorId = form.doctor_id.value;
  const date = form.appointment_date.value;
  const sel = document.getElementById('time-select');
  if (!doctorId || !date) return;
  sel.innerHTML = `<option>Loading slots...</option>`;
  try {
    const { slots } = await api.get(`/doctors/${doctorId}/availability?date=${date}`);
    if (!slots || !slots.length) {
      sel.innerHTML = `<option value="">No slots available</option>`;
    } else {
      sel.innerHTML = slots.map(s => `<option value="${s.time}" ${!s.available?'disabled':''}>
        ${formatTime(s.time)} ${!s.available?'(Booked)':''}
      </option>`).join('');
    }
  } catch(e) {
    sel.innerHTML = `<option value="">Error loading slots</option>`;
  }
}

async function submitAppointmentForm(id = null) {
  const form = document.getElementById('appt-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    if (id) { await api.put(`/appointments/${id}`, data); toast('success', 'Appointment updated'); }
    else { await api.post('/appointments', data); toast('success', 'Appointment booked!'); }
    Modal.close();
    Pages.appointments();
  } catch(e) { toast('error', 'Failed to save', e.message); }
}

async function openEditAppointment(id) {
  Modal.open('Edit Appointment', loadingSpinner());
  try {
    const a = await api.get(`/appointments/${id}`);
    const body = `<form id="appt-form">
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-select" name="status">
          ${['scheduled','in-progress','completed','cancelled'].map(s => `<option ${a.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" name="appointment_date" value="${a.appointment_date||''}" /></div>
        <div class="form-group"><label class="form-label">Time</label><input class="form-input" type="time" name="appointment_time" value="${a.appointment_time||''}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Chief Complaint</label><textarea class="form-textarea" name="chief_complaint">${a.chief_complaint||''}</textarea></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" name="notes">${a.notes||''}</textarea></div>
    </form>`;
    Modal.open('Edit Appointment', body,
      `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="submitAppointmentForm(${id})">Save Changes</button>`
    );
  } catch(e) { toast('error', 'Failed to load', e.message); Modal.close(); }
}

async function cancelAppointment(id) {
  confirmAction('Cancel Appointment', 'Are you sure you want to cancel this appointment?', async () => {
    try {
      await api.delete(`/appointments/${id}`);
      toast('success', 'Appointment cancelled');
      loadAppointmentsTable();
    } catch(e) { toast('error', 'Failed to cancel', e.message); }
  });
}
