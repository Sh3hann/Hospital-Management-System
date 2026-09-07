// ─── PHARMACY PAGE ───────────────────────────────────
window.Pages = window.Pages || {};
Pages.pharmacy = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner();

  try {
    const { data: medicines, total, low_stock_count, expiring_count } = await api.get('/pharmacy/medicines');
    const { data: prescriptions } = await api.get('/pharmacy/prescriptions?status=pending');

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Pharmacy</h2><p>Medicine inventory and prescription management</p></div>
      <div class="page-header-actions">
        <button class="btn btn-outline" onclick="showPharmacyTab('prescriptions')">📋 Prescriptions ${prescriptions.length > 0 ? `<span class="badge badge-warning" style="margin-left:4px">${prescriptions.length}</span>` : ''}</button>
        <button class="btn btn-primary" onclick="openAddMedicine()">+ Add Medicine</button>
      </div>
    </div>

    ${low_stock_count > 0 ? `<div class="alert warning mb-4">⚠️ <strong>${low_stock_count} medicines</strong> below reorder level</div>` : ''}
    ${expiring_count > 0 ? `<div class="alert danger mb-4">🚨 <strong>${expiring_count} medicines</strong> expiring within 30 days</div>` : ''}

    <div class="stats-grid mb-4" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card primary"><div class="stat-icon primary">💊</div><div class="stat-info"><div class="stat-value">${total}</div><div class="stat-label">Total Medicines</div></div></div>
      <div class="stat-card warning"><div class="stat-icon warning">📉</div><div class="stat-info"><div class="stat-value">${low_stock_count}</div><div class="stat-label">Low Stock</div></div></div>
      <div class="stat-card danger"><div class="stat-icon danger">📅</div><div class="stat-info"><div class="stat-value">${expiring_count}</div><div class="stat-label">Expiring Soon</div></div></div>
      <div class="stat-card success"><div class="stat-icon success">📋</div><div class="stat-info"><div class="stat-value">${prescriptions.length}</div><div class="stat-label">Pending Rx</div></div></div>
    </div>

    <div class="tab-nav" id="pharmacy-tabs">
      <button class="tab-btn active" onclick="showPharmacyTab('inventory')">Inventory</button>
      <button class="tab-btn" onclick="showPharmacyTab('prescriptions')">Pending Prescriptions</button>
      <button class="tab-btn" onclick="showPharmacyTab('alerts')">Alerts</button>
    </div>

    <!-- INVENTORY -->
    <div id="pharmacy-inventory" class="tab-panel active">
      <div class="card">
        <div class="filter-bar">
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input class="form-input search-input" id="med-search" placeholder="Search medicines..." oninput="searchMedicines(this.value)" />
          </div>
          <select class="form-select" id="med-cat-filter" onchange="searchMedicines()" style="max-width:160px">
            <option value="">All Categories</option>
            ${[...new Set(medicines.map(m => m.category).filter(Boolean))].map(c => `<option>${c}</option>`).join('')}
          </select>
        </div>
        <div class="table-wrap">
          <table id="medicines-table">
            <thead><tr>
              <th>Medicine</th><th>Category</th><th>Form</th><th>Stock</th><th>Price</th><th>Expiry</th><th>Actions</th>
            </tr></thead>
            <tbody id="medicines-tbody">
              ${medicines.map(m => renderMedicineRow(m)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PRESCRIPTIONS -->
    <div id="pharmacy-prescriptions" class="tab-panel">
      <div class="card">
        ${prescriptions.length === 0 ? emptyState('📋', 'No pending prescriptions') :
        `<table>
          <thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${prescriptions.map(p => `
            <tr>
              <td>${formatDate(p.created_at)}</td>
              <td><div>${p.first_name} ${p.last_name}</div><div class="text-xs text-muted">${p.mrn}</div></td>
              <td>${p.doctor_name}</td>
              <td>${statusBadge(p.status)}</td>
              <td><div class="table-actions">
                <button class="btn btn-outline btn-sm" onclick="viewPrescription(${p.id})">View</button>
                <button class="btn btn-success btn-sm" onclick="dispensePrescription(${p.id})">Dispense</button>
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
    </div>

    <!-- ALERTS -->
    <div id="pharmacy-alerts" class="tab-panel">
      <div id="pharmacy-alerts-content"><div class="loading"><div class="spinner"></div></div></div>
    </div>`;

    window._allMedicines = medicines;
    loadPharmacyAlerts();
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error</div><p>${e.message}</p></div>`;
  }
};

function renderMedicineRow(m) {
  const today = new Date().toISOString().split('T')[0];
  const isExpired = m.expiry_date && m.expiry_date < today;
  const isLow = m.stock_qty <= m.reorder_level;
  const stockPct = Math.min(100, (m.stock_qty / Math.max(m.reorder_level * 3, 1)) * 100);
  const color = stockColor(m.stock_qty, m.reorder_level);
  return `
  <tr>
    <td>
      <div class="font-semibold">${m.name}</div>
      <div class="text-xs text-muted">${m.generic_name || ''} · ${m.manufacturer || ''}</div>
    </td>
    <td><span class="badge badge-neutral">${m.category || '—'}</span></td>
    <td>${m.dosage_form || '—'} ${m.strength ? `· ${m.strength}` : ''}</td>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="min-width:60px">
          <span class="${isLow ? 'text-danger font-bold' : ''}">${m.stock_qty} units</span>
        </div>
        <div class="stock-bar" style="width:60px">
          <div class="stock-fill" style="width:${stockPct}%;background:var(--${color})"></div>
        </div>
        ${isLow ? '<span class="badge badge-warning">Low</span>' : ''}
      </div>
    </td>
    <td class="text-success font-semibold">${currency(m.unit_price)}</td>
    <td>${m.expiry_date ? `<span class="${isExpired ? 'badge badge-danger' : ''}">${formatDate(m.expiry_date)}</span>` : '—'}</td>
    <td>
      <div class="table-actions">
        <button class="btn btn-ghost btn-sm" onclick="openEditMedicine(${m.id})">Edit</button>
        <button class="btn btn-outline btn-sm" onclick="openStockAdjust(${m.id}, '${m.name}', ${m.stock_qty})">Stock</button>
      </div>
    </td>
  </tr>`;
}

function showPharmacyTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`pharmacy-${name}`)?.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.getAttribute('onclick').includes(name)) b.classList.add('active');
  });
}

function searchMedicines(search = '') {
  const s = (search || document.getElementById('med-search')?.value || '').toLowerCase();
  const cat = document.getElementById('med-cat-filter')?.value;
  const filtered = (window._allMedicines || []).filter(m => {
    const ms = !s || m.name.toLowerCase().includes(s) || (m.generic_name||'').toLowerCase().includes(s);
    const mc = !cat || m.category === cat;
    return ms && mc;
  });
  const tbody = document.getElementById('medicines-tbody');
  if (tbody) tbody.innerHTML = filtered.map(m => renderMedicineRow(m)).join('') || emptyState('💊', 'No medicines found');
}

async function loadPharmacyAlerts() {
  const { data: lowStock } = await api.get('/pharmacy/medicines?low_stock=true&limit=50').catch(() => ({ data: [] }));
  const { data: nearExpiry } = await api.get('/pharmacy/medicines?near_expiry=true&limit=50').catch(() => ({ data: [] }));
  const el = document.getElementById('pharmacy-alerts-content');
  if (!el) return;
  el.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:20px">
    <div class="card">
      <div class="card-header"><div class="card-title">⚠️ Low Stock Medicines (${lowStock.length})</div></div>
      ${lowStock.length === 0 ? emptyState('✅', 'All medicines well-stocked') :
      `<table><thead><tr><th>Medicine</th><th>Current Stock</th><th>Reorder Level</th><th>Action</th></tr></thead>
      <tbody>${lowStock.map(m => `
        <tr>
          <td>${m.name}<br><span class="text-xs text-muted">${m.generic_name||''}</span></td>
          <td><span class="${m.stock_qty===0?'text-danger':'text-warning'} font-bold">${m.stock_qty} units</span></td>
          <td>${m.reorder_level} units</td>
          <td><button class="btn btn-outline btn-sm" onclick="openStockAdjust(${m.id},'${m.name}',${m.stock_qty})">Add Stock</button></td>
        </tr>`).join('')}</tbody></table>`}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">🚨 Expiring Soon (${nearExpiry.length})</div></div>
      ${nearExpiry.length === 0 ? emptyState('✅', 'No medicines expiring soon') :
      `<table><thead><tr><th>Medicine</th><th>Batch</th><th>Stock</th><th>Expiry Date</th></tr></thead>
      <tbody>${nearExpiry.map(m => `
        <tr>
          <td>${m.name}</td>
          <td>${m.batch_number||'—'}</td>
          <td>${m.stock_qty} units</td>
          <td><span class="badge badge-danger">⚠️ ${formatDate(m.expiry_date)}</span></td>
        </tr>`).join('')}</tbody></table>`}
    </div>
  </div>`;
}

function openAddMedicine() {
  Modal.open('Add Medicine', buildMedicineForm(null),
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitMedicineForm()">Add Medicine</button>`
  );
}
async function openEditMedicine(id) {
  const m = await api.get(`/pharmacy/medicines/${id}`).catch(() => null);
  if (!m) return;
  Modal.open(`Edit — ${m.name}`, buildMedicineForm(m),
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitMedicineForm(${id})">Save Changes</button>`
  );
}
function buildMedicineForm(m) {
  return `<form id="med-form">
  <div class="form-row">
    <div class="form-group"><label class="form-label">Medicine Name *</label><input class="form-input" name="name" value="${m?.name||''}" required /></div>
    <div class="form-group"><label class="form-label">Generic Name</label><input class="form-input" name="generic_name" value="${m?.generic_name||''}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Category</label>
      <select class="form-select" name="category">
        <option value="">Select</option>
        ${['Analgesic','Antibiotic','Antidiabetic','Antihypertensive','Antihistamine','NSAID','Statin','Proton Pump Inhibitor','Bronchodilator','Anticoagulant','Vitamin','Other'].map(c => `<option ${m?.category===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Dosage Form</label>
      <select class="form-select" name="dosage_form">
        <option value="">Select</option>
        ${['Tablet','Capsule','Syrup','Injection','Inhaler','Cream','Drops','Infusion'].map(f => `<option ${m?.dosage_form===f?'selected':''}>${f}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Strength</label><input class="form-input" name="strength" value="${m?.strength||''}" placeholder="e.g. 500mg" /></div>
    <div class="form-group"><label class="form-label">Manufacturer</label><input class="form-input" name="manufacturer" value="${m?.manufacturer||''}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Stock Quantity</label><input class="form-input" type="number" name="stock_qty" value="${m?.stock_qty||0}" min="0" /></div>
    <div class="form-group"><label class="form-label">Unit Price (LKR)</label><input class="form-input" type="number" name="unit_price" value="${m?.unit_price||0}" min="0" step="0.01" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Reorder Level</label><input class="form-input" type="number" name="reorder_level" value="${m?.reorder_level||10}" min="0" /></div>
    <div class="form-group"><label class="form-label">Expiry Date</label><input class="form-input" type="date" name="expiry_date" value="${m?.expiry_date||''}" /></div>
  </div>
  <div class="form-group"><label class="form-label">Batch Number</label><input class="form-input" name="batch_number" value="${m?.batch_number||''}" /></div>
  </form>`;
}
async function submitMedicineForm(id = null) {
  const form = document.getElementById('med-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    if (id) { await api.put(`/pharmacy/medicines/${id}`, data); toast('success', 'Medicine updated'); }
    else { await api.post('/pharmacy/medicines', data); toast('success', 'Medicine added'); }
    Modal.close();
    Pages.pharmacy();
  } catch(e) { toast('error', 'Failed', e.message); }
}

function openStockAdjust(id, name, current) {
  Modal.open(`Stock Adjustment — ${name}`,
    `<div class="alert info mb-3">Current stock: <strong>${current} units</strong></div>
     <form id="stock-form">
       <div class="form-group"><label class="form-label">Adjustment Type</label>
         <select class="form-select" name="type"><option value="add">Add Stock</option><option value="subtract">Remove Stock</option></select>
       </div>
       <div class="form-group"><label class="form-label">Quantity *</label>
         <input class="form-input" type="number" name="adjustment" min="1" required />
       </div>
     </form>`,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitStockAdjust(${id})">Adjust Stock</button>`
  );
}
async function submitStockAdjust(id) {
  const form = document.getElementById('stock-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await api.patch(`/pharmacy/medicines/${id}/stock`, data);
    toast('success', 'Stock updated');
    Modal.close();
    Pages.pharmacy();
  } catch(e) { toast('error', 'Failed', e.message); }
}

async function viewPrescription(id) {
  const p = await api.get(`/pharmacy/prescriptions/${id}`).catch(() => null);
  if (!p) return;
  let items = [];
  try { items = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []); } catch(e) {}
  Modal.open(`Prescription — ${p.first_name} ${p.last_name}`,
    `<div class="detail-grid mb-3">
      <div class="detail-item"><div class="detail-label">Patient</div><div class="detail-value">${p.first_name} ${p.last_name} (${p.mrn})</div></div>
      <div class="detail-item"><div class="detail-label">Doctor</div><div class="detail-value">Dr. ${p.doctor_name}</div></div>
      <div class="detail-item"><div class="detail-label">Date</div><div class="detail-value">${formatDateTime(p.created_at)}</div></div>
      <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(p.status)}</div></div>
    </div>
    ${p.allergies ? `<div class="alert danger mb-3">⚠️ Allergies: ${p.allergies}</div>` : ''}
    <div class="form-section-title">Prescribed Medicines</div>
    ${items.length ? `<table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
    <tbody>${items.map(i => `<tr><td>${i.name||i.medicine_name||'—'}</td><td>${i.dosage||'—'}</td><td>${i.frequency||'—'}</td><td>${i.duration||'—'}</td></tr>`).join('')}</tbody></table>`
    : `<p class="text-muted">No items listed</p>`}`,
    `<button class="btn btn-outline" onclick="Modal.close()">Close</button>
     <button class="btn btn-success" onclick="dispensePrescription(${id})">✓ Mark Dispensed</button>`
  );
}

async function dispensePrescription(id) {
  confirmAction('Dispense Prescription', 'Mark this prescription as dispensed and update stock?', async () => {
    try {
      await api.put(`/pharmacy/prescriptions/${id}/dispense`);
      toast('success', 'Prescription dispensed');
      Pages.pharmacy();
    } catch(e) { toast('error', 'Failed', e.message); }
  });
}
