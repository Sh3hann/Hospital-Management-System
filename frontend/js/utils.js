// ─── UTILITIES ───────────────────────────────────────
window.Pages = window.Pages || {};

// Toast
function toast(type, title, msg = '', duration = 3500) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 200); }, duration);
}

// Modal
const Modal = {
  open(title, bodyHtml, footerHtml = '', size = '') {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml;
    modal.className = 'modal' + (size ? ` modal-${size}` : '');
    overlay.classList.remove('hidden');
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
    document.getElementById('modal-footer').innerHTML = '';
  }
};

// Date helpers
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatDateTime(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatTime(str) {
  if (!str) return '—';
  const [h, m] = str.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function calcAge(dob) {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 86400000)) + ' yrs';
}

// Currency
function currency(val) {
  return 'LKR ' + parseFloat(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Status badge helper
function statusBadge(status) {
  const map = {
    scheduled: 'primary', 'in-progress': 'warning', completed: 'success',
    cancelled: 'danger', pending: 'warning', paid: 'success', partial: 'info',
    requested: 'info', dispensed: 'success', normal: 'neutral', urgent: 'danger',
    admitted: 'warning', discharged: 'success', approved: 'success', rejected: 'danger',
    present: 'success', absent: 'danger', leave: 'warning',
  };
  const cls = map[status] || 'neutral';
  return `<span class="badge badge-${cls}">${status || '—'}</span>`;
}

// Capitalize
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

// Empty state
function emptyState(icon, title, desc = '') {
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <div class="empty-title">${title}</div>
    ${desc ? `<p class="empty-desc">${desc}</p>` : ''}
  </div>`;
}

// Loading
function loadingSpinner(text = 'Loading...') {
  return `<div class="loading"><div class="spinner"></div><span class="loading-text">${text}</span></div>`;
}

// Confirm modal
function confirmAction(title, msg, onConfirm) {
  Modal.open(title,
    `<p style="color:var(--text-muted)">${msg}</p>`,
    `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
     <button class="btn btn-danger" id="confirm-yes">Confirm</button>`
  );
  document.getElementById('confirm-yes').onclick = () => { Modal.close(); onConfirm(); };
}

// Bar chart renderer
function renderBarChart(container, data, valueKey, labelKey, colorClass = 'primary') {
  if (!data || !data.length) { container.innerHTML = emptyState('📊', 'No data'); return; }
  const max = Math.max(...data.map(d => d[valueKey] || 0)) || 1;
  const isCurrency = valueKey === 'revenue';
  container.style.display = 'flex';
  container.style.alignItems = 'stretch';
  container.innerHTML = `<div class="bar-chart">
    ${data.map(d => {
      const val = d[valueKey] || 0;
      const heightPct = Math.max(4, (val / max) * 140);
      const label = isCurrency ? 'LKR ' + parseFloat(val).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : val;
      return `
      <div class="bar-group">
        <div class="bar ${colorClass}" style="height:${heightPct}px" data-value="${label}"></div>
        <div class="bar-label">${d[labelKey] || ''}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// Donut chart
function renderDonut(container, data, colors) {
  if (!data || !data.length) { container.innerHTML = emptyState('🥧', 'No data'); return; }
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const r = 50, cx = 60, cy = 60, strokeW = 16;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = (d.value || 0) / total;
    const dash = pct * circ;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i % colors.length]}"
      stroke-width="${strokeW}" stroke-dasharray="${dash} ${circ - dash}"
      stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round"/>`;
    offset += dash;
    return seg;
  });
  const legend = data.map((d, i) => `
    <div class="donut-legend-item">
      <div class="donut-dot" style="background:${colors[i % colors.length]}"></div>
      <span>${d.label} <strong>${d.value}</strong></span>
    </div>`).join('');
  container.innerHTML = `<div class="donut-wrap">
    <svg class="donut-svg" viewBox="0 0 120 120" width="120" height="120">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${strokeW}"/>
      ${segments.join('')}
      <text x="${cx}" y="${cy}" text-anchor="middle" dy="0.35em" fill="var(--text)" font-size="14" font-weight="700">${total}</text>
    </svg>
    <div class="donut-legend">${legend}</div>
  </div>`;
}

// Table pagination
function renderPagination(container, current, total, limit, onChange) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) { container.innerHTML = ''; return; }
  const start = Math.max(1, current - 2);
  const end = Math.min(pages, current + 2);
  let html = `<div class="pagination">
    <button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="(${onChange})(${current - 1})">‹</button>`;
  if (start > 1) html += `<button class="page-btn" onclick="(${onChange})(1)">1</button><span class="page-info">…</span>`;
  for (let p = start; p <= end; p++) {
    html += `<button class="page-btn ${p === current ? 'active' : ''}" onclick="(${onChange})(${p})">${p}</button>`;
  }
  if (end < pages) html += `<span class="page-info">…</span><button class="page-btn" onclick="(${onChange})(${pages})">${pages}</button>`;
  html += `<button class="page-btn" ${current === pages ? 'disabled' : ''} onclick="(${onChange})(${current + 1})">›</button>`;
  html += `<span class="page-info">${(current-1)*limit+1}–${Math.min(current*limit, total)} of ${total}</span></div>`;
  container.innerHTML = html;
}

// Patient name
function patientName(row) {
  return `${row.first_name || ''} ${row.last_name || ''}`.trim();
}

// Stock color
function stockColor(qty, reorder) {
  if (qty <= 0) return 'danger';
  if (qty <= reorder) return 'warning';
  return 'success';
}
