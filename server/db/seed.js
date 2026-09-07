const { initDB, query, queryOne, run } = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Starting database seeding...');
  await initDB();

  try {
    // 1. Seed Roles (if empty or missing patient)
    const roles = ['admin', 'doctor', 'nurse', 'receptionist', 'lab_staff', 'pharmacist', 'accountant', 'patient'];
    for (const r of roles) {
      const existing = queryOne('SELECT id FROM roles WHERE name = ?', [r]);
      if (!existing) {
        run('INSERT INTO roles (name) VALUES (?)', [r]);
      }
    }
    console.log(`✅ Roles verified.`);

    // 2. Seed Users (if missing)
    const defaultUsers = [
      { username: 'admin', pass: 'Admin@123', name: 'System Administrator', email: 'admin@medicore.com', role: 'admin' },
      { username: 'dr.perera', pass: 'Doctor@123', name: 'Dr. Kamal Perera', email: 'drperera@medicore.com', role: 'doctor' },
      { username: 'dr.fernando', pass: 'Doctor@123', name: 'Dr. Nimesha Fernando', email: 'drfernando@medicore.com', role: 'doctor' },
      { username: 'nurse1', pass: 'Nurse@123', name: 'Sanduni Rajapaksa', email: 'nurse1@medicore.com', role: 'nurse' },
      { username: 'nurse2', pass: 'Nurse@123', name: 'Chamara Dissanayake', email: 'nurse2@medicore.com', role: 'nurse' },
      { username: 'receptionist1', pass: 'Recept@123', name: 'Dilani Wickramasinghe', email: 'recept1@medicore.com', role: 'receptionist' },
      { username: 'lab1', pass: 'Lab@123', name: 'Ruwan Jayasinghe', email: 'lab1@medicore.com', role: 'lab_staff' },
      { username: 'pharmacist1', pass: 'Pharma@123', name: 'Malika Gunasekara', email: 'pharma1@medicore.com', role: 'pharmacist' },
      { username: 'accountant1', pass: 'Acct@123', name: 'Thilak Bandara', email: 'acct1@medicore.com', role: 'accountant' },
      { username: 'patient1', pass: 'Patient@123', name: 'Nimal Sirisena', email: 'patient1@example.com', role: 'patient' }
    ];

    for (const u of defaultUsers) {
      const existing = queryOne('SELECT id FROM users WHERE username = ?', [u.username]);
      if (!existing) {
        const roleObj = queryOne('SELECT id FROM roles WHERE name = ?', [u.role]);
        if (roleObj) {
          const hash = bcrypt.hashSync(u.pass, 10);
          run(
            'INSERT INTO users (username, password_hash, role_id, full_name, email) VALUES (?, ?, ?, ?, ?)',
            [u.username, hash, roleObj.id, u.name, u.email]
          );
        }
      }
    }
    console.log(`✅ Verified default user accounts.`);

    // 3. Seed Departments (if empty)
    const deptCount = (queryOne('SELECT COUNT(*) as c FROM departments') || {}).c || 0;
    if (deptCount === 0) {
      const depts = [
        ['General Medicine', 'Primary healthcare and general consultations'],
        ['Cardiology', 'Heart and cardiovascular system care'],
        ['Neurology', 'Brain and nervous system treatment'],
        ['Orthopedics', 'Bones, joints, and musculoskeletal system'],
        ['Pediatrics', 'Child health and infant medical care'],
        ['Gynecology', 'Women health and maternity care'],
        ['Emergency', '24/7 urgent medical emergency services'],
        ['Radiology', 'X-ray, MRI, CT scans and diagnostic imaging'],
        ['Oncology', 'Cancer diagnosis and treatment']
      ];
      for (const [name, desc] of depts) {
        run('INSERT INTO departments (name, description) VALUES (?, ?)', [name, desc]);
      }
      console.log(`✅ Seeded ${depts.length} departments.`);
    }

    // 4. Seed Patients (if empty)
    const patCount = (queryOne('SELECT COUNT(*) as c FROM patients') || {}).c || 0;
    if (patCount === 0) {
      const patients = [
        ['Nimal', 'Sirisena', '1985-03-15', 'Male', 'O+', '+94-77-1234501', 'nimal.sirisena@email.com', 'PAT-100101', '45 Galle Road, Colombo 03', 'Penicillin'],
        ['Kumari', 'Weerasinghe', '1992-07-22', 'Female', 'A+', '+94-77-1234502', 'kumari.w@email.com', 'PAT-100102', '12 Kandy Road, Kurunegala', 'Aspirin'],
        ['Sunil', 'Rathnayake', '1978-11-30', 'Male', 'B+', '+94-71-2345603', 'sunil.r@email.com', 'PAT-100103', '78 Temple Street, Kandy', 'None'],
        ['Priyanka', 'Madushani', '1995-04-10', 'Female', 'AB+', '+94-76-3456704', 'priyanka.m@email.com', 'PAT-100104', '22 Beach Road, Galle', 'Sulfa drugs'],
        ['Asanka', 'Liyanage', '1965-09-05', 'Male', 'O-', '+94-70-4567805', 'asanka.l@email.com', 'PAT-100105', '56 Main Street, Matara', 'None']
      ];
      for (const p of patients) {
        run(`INSERT INTO patients (first_name, last_name, dob, gender, blood_type, phone, email, mrn, address, allergies)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, p);
      }
      console.log(`✅ Seeded sample patients.`);
    }

    // 5. Seed Doctors (if empty)
    const docCount = (queryOne('SELECT COUNT(*) as c FROM doctors WHERE active=1') || {}).c || 0;
    if (docCount === 0) {
      const defaultSchedule = JSON.stringify({
        monday: '09:00-17:00', tuesday: '09:00-17:00', wednesday: '09:00-17:00',
        thursday: '09:00-17:00', friday: '09:00-17:00', saturday: '09:00-13:00', sunday: ''
      });
      const initialDocs = [
        [1, 2, 'Dr. Kamal Perera', 'General Medicine', 1, '+94-77-1234510', 'dr.perera@medicore.lk', 'MBBS, MD', 12, 2500, defaultSchedule],
        [2, 3, 'Dr. Nimesha Fernando', 'Cardiology', 2, '+94-77-1234511', 'dr.fernando@medicore.lk', 'MBBS, MD, FRCP', 10, 3500, defaultSchedule],
        [3, 4, 'Dr. Anura Jayasinghe', 'Neurology', 3, '+94-77-1234512', 'dr.jayasinghe@medicore.lk', 'MBBS, MD, MRCP', 15, 4000, defaultSchedule],
        [4, 5, 'Dr. Ruwani Dissanayake', 'Pediatrics', 5, '+94-77-1234513', 'dr.dissanayake@medicore.lk', 'MBBS, DCH, MD', 8, 3000, defaultSchedule],
        [5, 6, 'Dr. Kasun Wijesinghe', 'Orthopedics', 4, '+94-77-1234514', 'dr.wijesinghe@medicore.lk', 'MBBS, MS, FRCS', 14, 3500, defaultSchedule],
        [6, 12, 'Dr. Malini Wickramasinghe', 'Gynecology', 6, '+94-77-1234515', 'dr.wickramasinghe@medicore.lk', 'MBBS, MS, MRCOG', 11, 3500, defaultSchedule]
      ];
      for (const d of initialDocs) {
        run(`INSERT OR REPLACE INTO doctors (id, user_id, name, specialization, department_id, phone, email, qualification, experience_years, consultation_fee, schedule, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, d);
      }
      console.log(`✅ Seeded ${initialDocs.length} doctors with Sri Lankan names.`);
    }

    // 6. Seed Medicines (if empty)
    const medCount = (queryOne('SELECT COUNT(*) as c FROM medicines') || {}).c || 0;
    if (medCount === 0) {
      const meds = [
        ['Paracetamol', 'Acetaminophen', 'Analgesic', 'Tablet', '500mg', 'PharmaCorp', 500, 0.50, 50, '2027-12-31', 'BAT-001'],
        ['Amoxicillin', 'Amoxicillin', 'Antibiotic', 'Capsule', '250mg', 'MediHealth', 300, 2.50, 30, '2026-10-15', 'BAT-002'],
        ['Metformin', 'Metformin HCl', 'Antidiabetic', 'Tablet', '500mg', 'BioLabs', 400, 1.20, 40, '2027-08-20', 'BAT-003'],
        ['Amlodipine', 'Amlodipine Besylate', 'Antihypertensive', 'Tablet', '5mg', 'PharmaCorp', 250, 3.00, 25, '2026-11-10', 'BAT-004'],
        ['Omeprazole', 'Omeprazole', 'Proton Pump Inhibitor', 'Capsule', '20mg', 'CureAll', 200, 1.80, 20, '2027-05-18', 'BAT-005']
      ];
      for (const m of meds) {
        run(`INSERT INTO medicines (name, generic_name, category, dosage_form, strength, manufacturer, stock_qty, unit_price, reorder_level, expiry_date, batch_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, m);
      }
      console.log(`✅ Seeded ${meds.length} medicines.`);
    }

    console.log('🎉 Database seeding completed successfully.');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { seed };
