// ─── BILLING PAGE ────────────────────────────────────
window.Pages = window.Pages || {};
Pages.billing = async function(page = 1) {
  const content = document.getElementById('page-content');
  content.innerHTML = loadingSpinner();

  try {
    const { data: bills, total } = await api.get(`/billing?page=${page}&limit=15`);

    // Revenue summary
    const pending = bills.filter(b => b.status === 'pending' || b.status === 'partial');
    const pendingAmount = pending.reduce((s, b) => s + b.total - (b.paid_amount || 0), 0);

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Billing</h2><p>Invoice and payment management</p></div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openCreateBill()">+ Create Bill</button>
      </div>
    </div>

    <div class="stats-grid mb-4" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card primary"><div class="stat-icon primary">📄</div><div class="stat-info"><div class="stat-value">${total}</div><div class="stat-label">Total Bills</div></div></div>
      <div class="stat-card success"><div class="stat-icon success">✅</div><div class="stat-info"><div class="stat-value">${bills.filter(b=>b.status==='paid').length}</div><div class="stat-label">Paid</div></div></div>
      <div class="stat-card warning"><div class="stat-icon warning">⏳</div><div class="stat-info"><div class="stat-value">${pending.length}</div><div class="stat-label">Pending</div></div></div>
      <div class="stat-card danger"><div class="stat-icon danger">💸</div><div class="stat-info"><div class="stat-value">${currency(pendingAmount)}</div><div class="stat-label">Outstanding</div></div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Bills</div>
        <div style="display:flex;gap:8px">
          <select class="form-select" id="bill-status-filter" onchange="filterBills()" style="max-width:140px">
            <option value="">All Status</option>
            <option>pending</option><option>partial</option><option>paid</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        ${bills.length === 0 ? emptyState('💳', 'No bills found') :
        `<table>
          <thead><tr><th>Date</th><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="bills-tbody">
            ${bills.map(b => renderBillRow(b)).join('')}
          </tbody>
        </table>`}
      </div>
      <div id="bill-pagination"></div>
    </div>`;

    renderPagination(document.getElementById('bill-pagination'), page, total, 15, `(p) => Pages.billing(p)`);
    window._allBills = bills;
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Error</div><p>${e.message}</p></div>`;
  }
};

function renderBillRow(b) {
  const paid = parseFloat(b.paid_amount) || 0;
  const balance = b.total - paid;
  return `
  <tr>
    <td>${formatDate(b.created_at)}</td>
    <td>
      <div class="font-semibold">${b.first_name} ${b.last_name}</div>
      <div class="text-xs text-muted">${b.mrn}</div>
    </td>
    <td class="font-semibold">${currency(b.total)}</td>
    <td class="text-success">${currency(paid)}</td>
    <td class="${balance > 0 ? 'text-danger font-semibold' : 'text-muted'}">${currency(balance)}</td>
    <td>${statusBadge(b.status)}</td>
    <td>
      <div class="table-actions">
        <button class="btn btn-outline btn-sm" onclick="viewBill(${b.id})">View</button>
        ${b.status !== 'paid' ? `<button class="btn btn-success btn-sm" onclick="openPayment(${b.id})">Pay</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="printBill(${b.id})">Print</button>
      </div>
    </td>
  </tr>`;
}

function filterBills() {
  const status = document.getElementById('bill-status-filter')?.value;
  const filtered = (window._allBills || []).filter(b => !status || b.status === status);
  const tbody = document.getElementById('bills-tbody');
  if (tbody) tbody.innerHTML = filtered.length ? filtered.map(b => renderBillRow(b)).join('') : emptyState('💳', 'No bills');
}

async function viewBill(id) {
  Modal.open('Bill Details', loadingSpinner(), '', 'lg');
  try {
    const b = await api.get(`/billing/${id}`);
    let items = [];
    try { items = typeof b.items === 'string' ? JSON.parse(b.items) : (b.items || []); } catch(e) {}
    const paid = b.payments?.reduce((s, p) => s + p.amount, 0) || 0;
    const balance = b.total - paid;

    const body = `
    <div id="bill-print-area">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <h3 style="font-size:20px;font-weight:800">🏥 MediCore HMS</h3>
          <p class="text-muted text-sm">Invoice #${String(b.id).padStart(6,'0')}</p>
        </div>
        <div style="text-align:right">
          <div>${statusBadge(b.status)}</div>
          <div class="text-sm text-muted mt-1">${formatDate(b.created_at)}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;background:var(--surface-2);padding:14px;border-radius:8px;margin-bottom:20px">
        <div><div class="detail-label">Patient</div><div class="font-semibold">${b.first_name} ${b.last_name}</div><div class="text-sm text-muted">${b.mrn}</div></div>
        <div><div class="detail-label">Phone</div><div>${b.phone||'—'}</div></div>
        <div><div class="detail-label">Insurance</div><div>${b.insurance_provider||'—'}</div></div>
        <div><div class="detail-label">Address</div><div class="text-sm">${b.address||'—'}</div></div>
      </div>

      <table style="margin-bottom:16px">
        <thead><tr><th>Description</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${items.map(i => `<tr><td>${i.description||'—'}</td><td><span class="badge badge-neutral">${i.type||'—'}</span></td><td style="text-align:right">${currency(i.amount)}</td></tr>`).join('')}
        </tbody>
      </table>

      <div style="background:var(--surface-2);padding:14px;border-radius:8px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="text-muted">Subtotal</span><span>${currency(b.subtotal)}</span></div>
        ${b.discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="text-muted">Discount</span><span class="text-success">-${currency(b.discount)}</span></div>` : ''}
        ${b.tax > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="text-muted">Tax</span><span>${currency(b.tax)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border);font-size:16px;font-weight:700"><span>Total</span><span>${currency(b.total)}</span></div>
      </div>

      ${b.payments?.length ? `
      <div class="form-section-title">Payment History</div>
      <table>
        <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${b.payments.map(p => `<tr>
            <td>${formatDateTime(p.paid_at)}</td>
            <td><span class="badge badge-neutral">${p.method}</span></td>
            <td>${p.reference||'—'}</td>
            <td style="text-align:right" class="text-success font-semibold">${currency(p.amount)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:10px;font-size:15px;font-weight:700;color:var(--${balance > 0 ? 'danger' : 'success'})">
        ${balance > 0 ? `Balance Due: ${currency(balance)}` : '✅ Fully Paid'}
      </div>` : ''}
    </div>`;

    Modal.open(`Invoice #${String(b.id).padStart(6,'0')}`, body,
      `<button class="btn btn-outline" onclick="Modal.close()">Close</button>
       <button class="btn btn-ghost" onclick="window.print()">🖨 Print</button>
       ${b.status !== 'paid' ? `<button class="btn btn-success" onclick="openPayment(${b.id})">Record Payment</button>` : ''}`,
      'lg'
    );
  } catch(e) { toast('error', 'Failed to load bill', e.message); }
}

async function openCreateBill() {
  const patients = await api.get('/patients?limit=200').then(r => r.data || r).catch(() => []);
  const body = `<form id="bill-form">
    <div class="form-group"><label class="form-label">Patient *</label>
      <select class="form-select" name="patient_id" required>
        <option value="">Select patient</option>
        ${patients.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name} (${p.mrn})</option>`).join('')}
      </select>
    </div>
    <div class="form-section-title mt-3">Bill Items</div>
    <div id="bill-items">
      ${buildBillItemRow(0)}
    </div>
    <button type="button" class="btn btn-outline btn-sm" onclick="addBillItem()" style="margin-top:8px">+ Add Item</button>
    <div class="divider"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Discount (LKR)</label><input class="form-input" type="number" name="discount" value="0" min="0" step="0.01" /></div>
      <div class="form-group"><label class="form-label">Tax (LKR)</label><input class="form-input" type="number" name="tax" value="0" min="0" step="0.01" /></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" name="notes"></textarea></div>
  </form>`;
  Modal.open('Create Bill', body,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-primary" onclick="submitBillForm()">Create Bill</button>`
  );
  window._billItemCount = 1;
}

function buildBillItemRow(idx) {
  return `<div id="bill-item-${idx}" style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:end">
    <div class="form-group" style="margin:0"><label class="form-label">Description</label><input class="form-input" name="item_desc_${idx}" placeholder="e.g. Consultation" required /></div>
    <div class="form-group" style="margin:0"><label class="form-label">Type</label>
      <select class="form-select" name="item_type_${idx}">
        <option value="consultation">Consultation</option><option value="lab">Lab</option>
        <option value="pharmacy">Pharmacy</option><option value="admission">Admission</option><option value="other">Other</option>
      </select>
    </div>
    <div class="form-group" style="margin:0"><label class="form-label">Amount (LKR)</label><input class="form-input" type="number" name="item_amount_${idx}" min="0" step="0.01" value="0" required /></div>
    <button type="button" class="btn btn-danger btn-icon" style="margin-top:20px" onclick="document.getElementById('bill-item-${idx}').remove()">✕</button>
  </div>`;
}

function addBillItem() {
  const container = document.getElementById('bill-items');
  const idx = window._billItemCount++;
  const div = document.createElement('div');
  div.innerHTML = buildBillItemRow(idx);
  container.appendChild(div.firstElementChild);
}

async function submitBillForm() {
  const form = document.getElementById('bill-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const fd = new FormData(form);
  const entries = Object.fromEntries(fd.entries());

  const items = [];
  let i = 0;
  while (entries[`item_desc_${i}`] !== undefined) {
    if (entries[`item_desc_${i}`]) {
      items.push({ description: entries[`item_desc_${i}`], type: entries[`item_type_${i}`], amount: parseFloat(entries[`item_amount_${i}`]) || 0 });
    }
    i++;
  }
  if (!items.length) { toast('warning', 'Add at least one item'); return; }

  const data = { patient_id: entries.patient_id, items, discount: parseFloat(entries.discount)||0, tax: parseFloat(entries.tax)||0, notes: entries.notes };
  try {
    await api.post('/billing', data);
    toast('success', 'Bill created successfully');
    Modal.close();
    Pages.billing();
  } catch(e) { toast('error', 'Failed to create bill', e.message); }
}

function openPayment(billId) {
  Modal.open('Record Payment',
    `<form id="payment-form">
      <div class="form-group"><label class="form-label">Amount (LKR) *</label><input class="form-input" type="number" name="amount" step="0.01" min="0.01" required /></div>
      <div class="form-group"><label class="form-label">Payment Method</label>
        <select class="form-select" name="method">
          <option value="cash">Cash</option><option value="card">Card</option>
          <option value="insurance">Insurance</option><option value="bank_transfer">Bank Transfer</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Reference</label><input class="form-input" name="reference" placeholder="Receipt/Ref number" /></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" name="notes"></textarea></div>
    </form>`,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-success" onclick="submitPayment(${billId})">Record Payment</button>`
  );
}

async function submitPayment(billId) {
  const form = document.getElementById('payment-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await api.post(`/billing/${billId}/payment`, data);
    toast('success', 'Payment recorded', `Status: ${res.status}`);
    Modal.close();
    Pages.billing();
  } catch(e) { toast('error', 'Failed', e.message); }
}

function printBill(id) {
  viewBill(id).then(() => {
    setTimeout(() => window.print(), 500);
  });
}
