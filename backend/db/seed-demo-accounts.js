// ================================================================
// backend/db/seed-demo-accounts.js
// Creates / updates ALL demo accounts with Sri Lankan real names
// Run: node backend/db/seed-demo-accounts.js
// ================================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { initDB, run, query, queryOne } = require('../config/db');

// ── Sri Lankan demo accounts by role ─────────────────────────
const DEMO_ACCOUNTS = [

  // ── ADMIN ────────────────────────────────────────────────────
  {
    id: 1,
    username:  'admin',
    full_name: 'Kavindu Perera',
    email:     'kavindu.perera@medicore.lk',
    role:      'admin',
    password:  'Admin@123',
  },

  // ── DOCTORS ──────────────────────────────────────────────────
  {
    id: 2,
    username:  'dr.silva',
    old_username: 'dr.smith',
    full_name: 'Dr. Nuwan Silva',
    email:     'nuwan.silva@medicore.lk',
    role:      'doctor',
    password:  'Doctor@123',
    doctor: { spec: 'Cardiologist',      dept: 'Cardiology',       fee: 2500, exp: 14 },
  },
  {
    id: 3,
    username:  'dr.fernando',
    old_username: 'dr.johnson',
    full_name: 'Dr. Dilani Fernando',
    email:     'dilani.fernando@medicore.lk',
    role:      'doctor',
    password:  'Doctor@123',
    doctor: { spec: 'Orthopedic Surgeon', dept: 'Orthopedics',      fee: 3000, exp: 11 },
  },
  {
    id: 4,
    username:  'dr.jayawardena',
    old_username: 'dr.patel',
    full_name: 'Dr. Asanka Jayawardena',
    email:     'asanka.jayawardena@medicore.lk',
    role:      'doctor',
    password:  'Doctor@123',
    doctor: { spec: 'Neurologist',        dept: 'Neurology',        fee: 3500, exp: 18 },
  },
  {
    id: 5,
    username:  'dr.wickramasinghe',
    old_username: 'dr.chen',
    full_name: 'Dr. Thilini Wickramasinghe',
    email:     'thilini.wickramasinghe@medicore.lk',
    role:      'doctor',
    password:  'Doctor@123',
    doctor: { spec: 'Pediatrician',       dept: 'Pediatrics',       fee: 2000, exp: 9  },
  },
  {
    id: 6,
    username:  'dr.rajapaksa',
    old_username: 'dr.ali',
    full_name: 'Dr. Chamari Rajapaksa',
    email:     'chamari.rajapaksa@medicore.lk',
    role:      'doctor',
    password:  'Doctor@123',
    doctor: { spec: 'Gynecologist',       dept: 'Gynecology',       fee: 2500, exp: 13 },
  },
  // Extra new doctors
  {
    username:  'dr.dissanayake',
    full_name: 'Dr. Roshan Dissanayake',
    email:     'roshan.dissanayake@medicore.lk',
    role:      'doctor',
    password:  'Doctor@123',
    doctor: { spec: 'General Physician',  dept: 'General Medicine', fee: 1500, exp: 7  },
  },
  {
    username:  'dr.bandara',
    full_name: 'Dr. Sachini Bandara',
    email:     'sachini.bandara@medicore.lk',
    role:      'doctor',
    password:  'Doctor@123',
    doctor: { spec: 'Oncologist',         dept: 'Oncology',         fee: 4000, exp: 20 },
  },

  // ── NURSES ───────────────────────────────────────────────────
  {
    id: 7,
    username:  'nurse.kumari',
    old_username: 'nurse01',
    full_name: 'Kumari Rathnayake',
    email:     'kumari.rathnayake@medicore.lk',
    role:      'nurse',
    password:  'Nurse@123',
  },
  {
    username:  'nurse.sewwandi',
    full_name: 'Sewwandi Gunawardena',
    email:     'sewwandi.gunawardena@medicore.lk',
    role:      'nurse',
    password:  'Nurse@123',
  },
  {
    username:  'nurse.priyanka',
    full_name: 'Priyanka Herath',
    email:     'priyanka.herath@medicore.lk',
    role:      'nurse',
    password:  'Nurse@123',
  },

  // ── RECEPTIONISTS ────────────────────────────────────────────
  {
    id: 8,
    username:  'reception.imalka',
    old_username: 'reception01',
    full_name: 'Imalka Senanayake',
    email:     'imalka.senanayake@medicore.lk',
    role:      'receptionist',
    password:  'Staff@123',
  },
  {
    username:  'reception.nadeesha',
    full_name: 'Nadeesha Wijesinghe',
    email:     'nadeesha.wijesinghe@medicore.lk',
    role:      'receptionist',
    password:  'Staff@123',
  },

  // ── PHARMACISTS ──────────────────────────────────────────────
  {
    id: 9,
    username:  'pharma.ruwan',
    old_username: 'pharma01',
    full_name: 'Ruwan Karunaratne',
    email:     'ruwan.karunaratne@medicore.lk',
    role:      'pharmacist',
    password:  'Pharma@123',
  },
  {
    username:  'pharma.sanduni',
    full_name: 'Sanduni Amarasinghe',
    email:     'sanduni.amarasinghe@medicore.lk',
    role:      'pharmacist',
    password:  'Pharma@123',
  },

  // ── LAB TECHNICIANS ──────────────────────────────────────────
  {
    id: 10,
    username:  'lab.saman',
    old_username: 'lab01',
    full_name: 'Saman Kodithuwakku',
    email:     'saman.kodithuwakku@medicore.lk',
    role:      'lab_tech',
    password:  'Lab@123',
  },
  {
    username:  'lab.nishani',
    full_name: 'Nishani Pathirana',
    email:     'nishani.pathirana@medicore.lk',
    role:      'lab_tech',
    password:  'Lab@123',
  },

  // ── ACCOUNTANTS ──────────────────────────────────────────────
  {
    username:  'accounts.dinesh',
    full_name: 'Dinesh Madushanka',
    email:     'dinesh.madushanka@medicore.lk',
    role:      'accountant',
    password:  'Accounts@123',
  },
  {
    username:  'accounts.hiruni',
    full_name: 'Hiruni Jayasooriya',
    email:     'hiruni.jayasooriya@medicore.lk',
    role:      'accountant',
    password:  'Accounts@123',
  },

  // ── PATIENTS ──────────────────────────────────────────────────
  {
    username:  'patient.kasun',
    full_name: 'Kasun Perera',
    email:     'kasun.perera@medicore.lk',
    role:      'patient',
    password:  'Patient@123',
  },
  {
    username:  'patient',
    full_name: 'Kasun Perera (Patient)',
    email:     'patient@medicore.lk',
    role:      'patient',
    password:  'Patient@123',
  },
];

// ── Department name → id lookup ──────────────────────────────
let deptMap = {};

async function getDeptId(name) {
  if (deptMap[name]) return deptMap[name];
  let dept = await queryOne('SELECT id FROM departments WHERE name=?', [name]);
  if (!dept) {
    const r = await run('INSERT INTO departments (name) VALUES (?)', [name]);
    deptMap[name] = r.lastId;
  } else {
    deptMap[name] = dept.id;
  }
  return deptMap[name];
}

async function main() {
  await initDB();
  console.log('\n🌟 HMS Sri Lankan Demo Accounts Setup');
  console.log('═'.repeat(50));

  const results = [];

  for (const acc of DEMO_ACCOUNTS) {
    const hash    = bcrypt.hashSync(acc.password, 10);
    let roleRow = await queryOne('SELECT id FROM roles WHERE name=?', [acc.role]);
    if (!roleRow && acc.role === 'patient') {
      const pResult = await run(
        'INSERT INTO roles (name, permissions) VALUES (?, ?)',
        ['patient', JSON.stringify(['patients:read','appointments:read','appointments:create','emr:read','lab:read','billing:read'])]
      );
      roleRow = { id: pResult.lastId };
    }
    if (!roleRow) {
      console.log(`  ⚠️  Role not found: ${acc.role} — skipping ${acc.username}`);
      continue;
    }

    // ── UPDATE existing user (by id) ──────────────────────────
    if (acc.id) {
      // Update username, full_name, email, password
      await run(
        `UPDATE users SET username=?, full_name=?, email=?, password_hash=?, role_id=? WHERE id=?`,
        [acc.username, acc.full_name, acc.email, hash, roleRow.id, acc.id]
      );
      console.log(`  ✏️  Updated [${acc.role.padEnd(12)}]  ${acc.username}  →  ${acc.full_name}`);

      // Update linked doctor record if applicable
      if (acc.doctor) {
        const deptId = await getDeptId(acc.doctor.dept);
        const schedule = JSON.stringify({
          monday:'08:30-16:30', tuesday:'08:30-16:30', wednesday:'08:30-12:30',
          thursday:'08:30-16:30', friday:'08:30-16:30'
        });
        await run(
          `UPDATE doctors SET name=?, specialization=?, department_id=?, consultation_fee=?, experience_years=?, schedule=?
           WHERE user_id=?`,
          [acc.full_name, acc.doctor.spec, deptId, acc.doctor.fee, acc.doctor.exp, schedule, acc.id]
        );
      }

    // ── CREATE new user ────────────────────────────────────────
    } else {
      const existing = await queryOne('SELECT id FROM users WHERE username=?', [acc.username]);
      if (existing) {
        // Just update password & name if already there
        await run(
          `UPDATE users SET full_name=?, email=?, password_hash=?, role_id=? WHERE username=?`,
          [acc.full_name, acc.email, hash, roleRow.id, acc.username]
        );
        console.log(`  ✏️  Updated [${acc.role.padEnd(12)}]  ${acc.username}  →  ${acc.full_name}`);
      } else {
        const r = await run(
          `INSERT INTO users (username,password_hash,role_id,full_name,email) VALUES (?,?,?,?,?)`,
          [acc.username, hash, roleRow.id, acc.full_name, acc.email]
        );
        console.log(`  ✅ Created [${acc.role.padEnd(12)}]  ${acc.username}  →  ${acc.full_name}`);

        // Create doctor profile for new doctor accounts
        if (acc.doctor) {
          const deptId  = await getDeptId(acc.doctor.dept);
          const schedule = JSON.stringify({
            monday:'08:30-16:30', tuesday:'08:30-16:30', wednesday:'08:30-12:30',
            thursday:'08:30-16:30', friday:'08:30-16:30'
          });
          await run(
            `INSERT INTO doctors (user_id,name,specialization,department_id,consultation_fee,experience_years,schedule)
             VALUES (?,?,?,?,?,?,?)`,
            [r.lastId, acc.full_name, acc.doctor.spec, deptId, acc.doctor.fee, acc.doctor.exp, schedule]
          );
        }
      }
    }

    results.push({ role: acc.role, username: acc.username, password: acc.password, name: acc.full_name });
  }

  // ── Print summary table ───────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('📋  COMPLETE DEMO ACCOUNT LIST');
  console.log('═'.repeat(70));
  console.log(`${'ROLE'.padEnd(14)} ${'USERNAME'.padEnd(26)} ${'PASSWORD'.padEnd(14)} NAME`);
  console.log('─'.repeat(70));

  const grouped = {};
  for (const r of results) {
    if (!grouped[r.role]) grouped[r.role] = [];
    grouped[r.role].push(r);
  }
  for (const role of ['admin','doctor','nurse','receptionist','pharmacist','lab_tech','accountant','patient']) {
    if (!grouped[role]) continue;
    for (const r of grouped[role]) {
      console.log(`${role.padEnd(14)} ${r.username.padEnd(26)} ${r.password.padEnd(14)} ${r.name}`);
    }
  }
  console.log('═'.repeat(70));
  console.log('\n✅ All demo accounts ready!');
  console.log('🌐 Login at: http://localhost:3000\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
