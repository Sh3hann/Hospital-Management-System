// ─── ROLE BASED ACCESS CONTROL (RBAC) & ICONS ────────

const RBAC = {
  // 4 Distinct Login Portals (including Patient Portal)
  PORTALS: {
    admin: {
      id: 'admin',
      name: 'Administration Portal',
      subtitle: 'System Control & Analytics',
      color: '#4f46e5',
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      description: 'System settings, user management, audit logs, employee records & high-level reporting.',
      roles: ['admin'],
      badge: 'ADMIN PORTAL',
      icon: 'shield'
    },
    clinical: {
      id: 'clinical',
      name: 'Clinical Portal',
      subtitle: 'Patient Care & Medical Staff',
      color: '#059669',
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      description: 'Doctors & Nurses portal for EMR, diagnosis, prescriptions, appointments & inpatient care.',
      roles: ['doctor', 'nurse'],
      badge: 'MEDICAL STAFF',
      icon: 'activity'
    },
    operations: {
      id: 'operations',
      name: 'Operations Portal',
      subtitle: 'Hospital Support Services',
      color: '#0284c7',
      gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
      description: 'Reception, Laboratory, Pharmacy & Financial billing management.',
      roles: ['receptionist', 'lab_staff', 'lab_tech', 'pharmacist', 'accountant'],
      badge: 'SUPPORT STAFF',
      icon: 'briefcase'
    },
    patient: {
      id: 'patient',
      name: 'Patient Portal',
      subtitle: 'Personal Health & Services',
      color: '#0d9488',
      gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
      description: 'View medical history, prescriptions, lab results, appointments & pay medical bills online.',
      roles: ['patient'],
      badge: 'PATIENT PORTAL',
      icon: 'heart'
    }
  },

  // Role Navigation Schemas
  NAV: {
    admin: [
      { group: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: 'grid' }] },
      { group: 'Clinical', items: [
        { id: 'patients', label: 'Patients', icon: 'users' },
        { id: 'doctors', label: 'Doctors', icon: 'activity' },
        { id: 'appointments', label: 'Appointments', icon: 'calendar' },
        { id: 'emr', label: 'Medical Records', icon: 'file-text' },
        { id: 'admissions', label: 'Admissions', icon: 'bed' }
      ]},
      { group: 'Services', items: [
        { id: 'lab', label: 'Laboratory', icon: 'flask' },
        { id: 'pharmacy', label: 'Pharmacy', icon: 'package' },
        { id: 'billing', label: 'Billing & Payments', icon: 'credit-card' }
      ]},
      { group: 'Administration', items: [
        { id: 'staff', label: 'Staff Management', icon: 'user-check' },
        { id: 'users', label: 'User Management', icon: 'settings' },
        { id: 'reports', label: 'Reports & Analytics', icon: 'bar-chart-2' }
      ]}
    ],

    doctor: [
      { group: 'Overview', items: [{ id: 'dashboard', label: 'Doctor Dashboard', icon: 'grid' }] },
      { group: 'Patient Care', items: [
        { id: 'patients', label: 'Patients', icon: 'users' },
        { id: 'appointments', label: 'My Appointments', icon: 'calendar' },
        { id: 'emr', label: 'Medical Records (EMR)', icon: 'file-text' },
        { id: 'admissions', label: 'Inpatient Care', icon: 'bed' }
      ]},
      { group: 'Diagnostic & Rx', items: [
        { id: 'lab', label: 'Lab Requests', icon: 'flask' },
        { id: 'pharmacy', label: 'Pharmacy Prescriptions', icon: 'package' }
      ]}
    ],

    nurse: [
      { group: 'Overview', items: [{ id: 'dashboard', label: 'Nurse Dashboard', icon: 'grid' }] },
      { group: 'Patient Nursing', items: [
        { id: 'patients', label: 'Patients Directory', icon: 'users' },
        { id: 'appointments', label: 'Appointments List', icon: 'calendar' },
        { id: 'emr', label: 'Medical Records', icon: 'file-text' },
        { id: 'admissions', label: 'Ward & Admissions', icon: 'bed' }
      ]}
    ],

    receptionist: [
      { group: 'Overview', items: [{ id: 'dashboard', label: 'Reception Dashboard', icon: 'grid' }] },
      { group: 'Front Desk', items: [
        { id: 'patients', label: 'Patient Registration', icon: 'users' },
        { id: 'appointments', label: 'Schedule Appointment', icon: 'calendar' },
        { id: 'doctors', label: 'Doctor Schedules', icon: 'activity' },
        { id: 'billing', label: 'Billing & Counter', icon: 'credit-card' }
      ]}
    ],

    lab_tech: [
      { group: 'Overview', items: [{ id: 'dashboard', label: 'Lab Dashboard', icon: 'grid' }] },
      { group: 'Laboratory', items: [
        { id: 'lab', label: 'Test Requests & Results', icon: 'flask' },
        { id: 'patients', label: 'Patient Search', icon: 'users' }
      ]}
    ],

    lab_staff: [
      { group: 'Overview', items: [{ id: 'dashboard', label: 'Lab Dashboard', icon: 'grid' }] },
      { group: 'Laboratory', items: [
        { id: 'lab', label: 'Test Requests & Results', icon: 'flask' },
        { id: 'patients', label: 'Patient Search', icon: 'users' }
      ]}
    ],

    pharmacist: [
      { group: 'Overview', items: [{ id: 'dashboard', label: 'Pharmacy Dashboard', icon: 'grid' }] },
      { group: 'Dispensary', items: [
        { id: 'pharmacy', label: 'Inventory & Prescriptions', icon: 'package' },
        { id: 'patients', label: 'Patient Directory', icon: 'users' }
      ]}
    ],

    accountant: [
      { group: 'Overview', items: [{ id: 'dashboard', label: 'Finance Dashboard', icon: 'grid' }] },
      { group: 'Accounting', items: [
        { id: 'billing', label: 'Invoices & Payments', icon: 'credit-card' },
        { id: 'reports', label: 'Financial Reports', icon: 'bar-chart-2' }
      ]}
    ],

    patient: [
      { group: 'My Portal', items: [{ id: 'dashboard', label: 'Patient Home', icon: 'grid' }] },
      { group: 'My Health', items: [
        { id: 'appointments', label: 'My Appointments', icon: 'calendar' },
        { id: 'emr', label: 'My Health Records', icon: 'file-text' },
        { id: 'lab', label: 'My Lab Results', icon: 'flask' },
        { id: 'billing', label: 'My Medical Bills', icon: 'credit-card' }
      ]}
    ]
  },

  // Role Human Readable Names
  ROLE_NAMES: {
    admin: 'Administrator',
    doctor: 'Doctor',
    nurse: 'Nurse',
    receptionist: 'Receptionist',
    lab_tech: 'Lab Technician',
    lab_staff: 'Lab Technician',
    pharmacist: 'Pharmacist',
    accountant: 'Accountant',
    patient: 'Patient'
  },

  // Modern Vector Outline Profile Avatars (Crisp & Clean SVG instead of emoji)
  ROLE_OUTLINE_AVATARS: {
    admin: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`,
    doctor: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M19 8v6"></path><path d="M16 11h6"></path></svg>`,
    nurse: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
    receptionist: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 18h6"></path><path d="M9 10h6"></path></svg>`,
    lab_tech: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"></path><path d="M10 3v5l-6.5 11a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L14 8V3"></path><line x1="8.5" y1="14" x2="15.5" y2="14"></line></svg>`,
    lab_staff: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"></path><path d="M10 3v5l-6.5 11a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L14 8V3"></path><line x1="8.5" y1="14" x2="15.5" y2="14"></line></svg>`,
    pharmacist: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>`,
    accountant: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    patient: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`
  },

  getRoleAvatar(role, size = 22) {
    const raw = this.ROLE_OUTLINE_AVATARS[role] || this.ROLE_OUTLINE_AVATARS.admin;
    return raw.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`);
  },

  getRoleEmoji(role) {
    return this.getRoleAvatar(role);
  },

  getRoleDisplay(role) {
    return this.ROLE_NAMES[role] || 'Hospital User';
  },

  getNav(role) {
    return this.NAV[role] || this.NAV.admin;
  },

  canAccess(role, pageId) {
    if (!role) return false;
    if (role === 'admin') return true;
    const navGroups = this.getNav(role);
    for (const g of navGroups) {
      if (g.items.some(item => item.id === pageId)) return true;
    }
    return pageId === 'profile' || pageId === 'dashboard';
  },

  getPortalForRole(role) {
    if (role === 'admin') return 'admin';
    if (['doctor', 'nurse'].includes(role)) return 'clinical';
    if (role === 'patient') return 'patient';
    return 'operations';
  },

  // Minimal SVG Icons
  SVG_ICONS: {
    grid: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`,
    users: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    activity: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
    calendar: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    'file-text': `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    bed: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>`,
    flask: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"></path><path d="M10 3v5l-6.5 11a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L14 8V3"></path><line x1="8.5" y1="14" x2="15.5" y2="14"></line></svg>`,
    package: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    'credit-card': `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`,
    'user-check': `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`,
    settings: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    'bar-chart-2': `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
    shield: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    briefcase: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    heart: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
    lock: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
    'user-plus': `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`,
    printer: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`
  },

  icon(name, cls = '') {
    return `<span class="icon-wrap ${cls}">${this.SVG_ICONS[name] || ''}</span>`;
  }
};
