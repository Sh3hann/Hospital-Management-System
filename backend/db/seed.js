// ================================================================
// backend/db/seed.js
// Seeds the MySQL HMS database with initial roles, admin user,
// sample departments, doctors, and patients.
// Run: npm run seed
// ================================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { initDB, run, queryOne } = require('../config/db');

async function seed() {
  console.log('🌱 Seeding HMS Database...');
  console.log('─'.repeat(40));

  await initDB();

  // ── 1. Roles ──────────────────────────────────────────────
  const roles = [
    { name: 'admin',       permissions: JSON.stringify(['*']) },
    { name: 'doctor',      permissions: JSON.stringify(['patients:read','appointments:*','emr:*','lab:read','pharmacy:read']) },
    { name: 'nurse',       permissions: JSON.stringify(['patients:read','appointments:read','emr:read','lab:*','admissions:*']) },
    { name: 'receptionist',permissions: JSON.stringify(['patients:*','appointments:*','billing:read']) },
    { name: 'pharmacist',  permissions: JSON.stringify(['pharmacy:*','patients:read']) },
    { name: 'lab_tech',    permissions: JSON.stringify(['lab:*','patients:read']) },
    { name: 'accountant',  permissions: JSON.stringify(['billing:*','reports:read']) },
  ];

  for (const role of roles) {
    const exists = await queryOne('SELECT id FROM roles WHERE name=?', [role.name]);
    if (!exists) {
      await run('INSERT INTO roles (name, permissions) VALUES (?, ?)', [role.name, role.permissions]);
      console.log(`  ✓ Role: ${role.name}`);
    }
  }

  // ── 2. Admin user ──────────────────────────────────────────
  const adminRole = await queryOne('SELECT id FROM roles WHERE name=?', ['admin']);
  const adminExists = await queryOne('SELECT id FROM users WHERE username=?', ['admin']);
  if (!adminExists) {
    const hash = bcrypt.hashSync('Admin@123', 10);
    await run(
      'INSERT INTO users (username,password_hash,role_id,full_name,email) VALUES (?,?,?,?,?)',
      ['admin', hash, adminRole.id, 'System Administrator', 'admin@medicore.local']
    );
    console.log('  ✓ Admin user: admin / Admin@123');
  }

  // ── 3. Departments ─────────────────────────────────────────
  const departments = [
    'Cardiology', 'Orthopedics', 'Neurology', 'Pediatrics',
    'Gynecology', 'Oncology', 'Emergency', 'General Medicine',
    'Radiology', 'Pathology',
  ];
  const deptIds = {};
  for (const name of departments) {
    const ex = await queryOne('SELECT id FROM departments WHERE name=?', [name]);
    if (!ex) {
      const r = await run('INSERT INTO departments (name) VALUES (?)', [name]);
      deptIds[name] = r.lastId;
    } else {
      deptIds[name] = ex.id;
    }
  }
  console.log(`  ✓ ${departments.length} departments seeded`);

  // ── 4. Doctor accounts ─────────────────────────────────────
  const doctorRole = await queryOne('SELECT id FROM roles WHERE name=?', ['doctor']);
  const sampleDoctors = [
    { username: 'dr.smith',   name: 'Dr. John Smith',     spec: 'Cardiologist',     dept: 'Cardiology',      fee: 500 },
    { username: 'dr.johnson', name: 'Dr. Emily Johnson',  spec: 'Orthopedic Surgeon',dept: 'Orthopedics',     fee: 600 },
    { username: 'dr.patel',   name: 'Dr. Raj Patel',      spec: 'Neurologist',      dept: 'Neurology',       fee: 550 },
    { username: 'dr.chen',    name: 'Dr. Mei Chen',       spec: 'Pediatrician',     dept: 'Pediatrics',      fee: 400 },
    { username: 'dr.ali',     name: 'Dr. Fatima Ali',     spec: 'Gynecologist',     dept: 'Gynecology',      fee: 450 },
  ];
  for (const d of sampleDoctors) {
    const ex = await queryOne('SELECT id FROM users WHERE username=?', [d.username]);
    if (!ex) {
      const hash = bcrypt.hashSync('Doctor@123', 10);
      const ur = await run(
        'INSERT INTO users (username,password_hash,role_id,full_name,email) VALUES (?,?,?,?,?)',
        [d.username, hash, doctorRole.id, d.name, `${d.username}@medicore.local`]
      );
      await run(
        `INSERT INTO doctors (user_id,name,specialization,department_id,experience_years,consultation_fee,schedule)
         VALUES (?,?,?,?,?,?,?)`,
        [ur.lastId, d.name, d.spec, deptIds[d.dept], 10, d.fee,
          JSON.stringify({ monday:'09:00-17:00', tuesday:'09:00-17:00', wednesday:'09:00-13:00',
                           thursday:'09:00-17:00', friday:'09:00-17:00' })]
      );
    }
  }
  console.log(`  ✓ ${sampleDoctors.length} sample doctors seeded`);

  // ── 5. Staff roles (nurse, receptionist, pharmacist, lab_tech) ─
  const staffAccounts = [
    { username: 'nurse01',     name: 'Nurse Sarah Lee',    role: 'nurse' },
    { username: 'reception01', name: 'Alice Brown',         role: 'receptionist' },
    { username: 'pharma01',    name: 'Bob Pharmacy',        role: 'pharmacist' },
    { username: 'lab01',       name: 'Lab Tech Kumar',      role: 'lab_tech' },
  ];
  for (const s of staffAccounts) {
    const ex = await queryOne('SELECT id FROM users WHERE username=?', [s.username]);
    if (!ex) {
      const roleRow = await queryOne('SELECT id FROM roles WHERE name=?', [s.role]);
      const hash = bcrypt.hashSync('Staff@123', 10);
      await run(
        'INSERT INTO users (username,password_hash,role_id,full_name,email) VALUES (?,?,?,?,?)',
        [s.username, hash, roleRow.id, s.name, `${s.username}@medicore.local`]
      );
    }
  }
  console.log(`  ✓ ${staffAccounts.length} staff accounts seeded`);

  // ── 6. Sample patients ─────────────────────────────────────
  const samplePatients = [
    { mrn:'P00001', first:'James',   last:'Wilson',  dob:'1975-03-15', gender:'male',   blood:'A+', phone:'555-0101' },
    { mrn:'P00002', first:'Maria',   last:'Garcia',  dob:'1988-07-22', gender:'female', blood:'B+', phone:'555-0102' },
    { mrn:'P00003', first:'Robert',  last:'Taylor',  dob:'1960-11-08', gender:'male',   blood:'O-', phone:'555-0103' },
    { mrn:'P00004', first:'Linda',   last:'Martinez',dob:'1992-04-30', gender:'female', blood:'AB+',phone:'555-0104' },
    { mrn:'P00005', first:'Michael', last:'Anderson',dob:'1980-09-12', gender:'male',   blood:'O+', phone:'555-0105' },
  ];
  for (const p of samplePatients) {
    const ex = await queryOne('SELECT id FROM patients WHERE mrn=?', [p.mrn]);
    if (!ex) {
      await run(
        `INSERT INTO patients (mrn,first_name,last_name,dob,gender,blood_type,phone)
         VALUES (?,?,?,?,?,?,?)`,
        [p.mrn, p.first, p.last, p.dob, p.gender, p.blood, p.phone]
      );
    }
  }
  console.log(`  ✓ ${samplePatients.length} sample patients seeded`);

  // ── 7. Sample medicines ────────────────────────────────────
  const medicines = [
    ['Paracetamol',   'Acetaminophen',  'Analgesic',    'Tablet','500mg', 'PharmaCo', 500, 2.50, 50],
    ['Amoxicillin',   'Amoxicillin',    'Antibiotic',   'Capsule','500mg','MediLabs', 200, 8.00, 30],
    ['Metformin',     'Metformin HCl',  'Antidiabetic', 'Tablet','850mg', 'GlucoLabs',300, 5.00, 40],
    ['Amlodipine',    'Amlodipine',     'Antihypertensive','Tablet','5mg','CardioMed',150,12.00,20],
    ['Omeprazole',    'Omeprazole',     'PPI',          'Capsule','20mg', 'GastroPharm',250,6.50,35],
    ['Aspirin',       'Acetylsalicylic','Analgesic',    'Tablet','100mg', 'PharmaCo', 400, 1.50, 60],
    ['Atorvastatin',  'Atorvastatin',   'Statin',       'Tablet','20mg',  'LipidMed', 200, 15.00,25],
    ['Cetirizine',    'Cetirizine HCl', 'Antihistamine','Tablet','10mg',  'AllergyMed',180, 3.50, 30],
  ];
  for (const m of medicines) {
    const ex = await queryOne('SELECT id FROM medicines WHERE name=? AND batch_number IS NULL', [m[0]]);
    if (!ex) {
      await run(
        `INSERT INTO medicines (name,generic_name,category,dosage_form,strength,manufacturer,stock_qty,unit_price,reorder_level)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        m
      );
    }
  }
  console.log(`  ✓ ${medicines.length} medicines seeded`);

  console.log('\n✅ Seeding complete!');
  console.log('─'.repeat(40));
  console.log('Default credentials:');
  console.log('  admin        / Admin@123');
  console.log('  dr.smith     / Doctor@123');
  console.log('  nurse01      / Staff@123');
  console.log('  reception01  / Staff@123');
  console.log('  pharma01     / Staff@123');
  console.log('  lab01        / Staff@123');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
