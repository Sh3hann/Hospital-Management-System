// ================================================================
// backend/db/seed-records.js
// Populates rich sample records across all modules for Sri Lankan patients:
//   - Extra Sri Lankan Patients
//   - Appointments (Past & Today)
//   - Admissions & Bed Allocation
//   - EMR / Medical Records with Vitals
//   - Lab Test Requests & Results
//   - Prescriptions (Pending & Dispensed)
//   - Bills & Payments
//   - Staff / Employees directory & Attendance & Leave Requests
// ================================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initDB, run, query, queryOne } = require('../config/db');

async function seedRecords() {
  await initDB();
  console.log('Seeding rich demo records across all HMS modules...');

  // 1. Ensure additional Sri Lankan patients exist
  const newPatients = [
    { mrn: 'P00006', first: 'Chaminda',   last: 'Vaas',          dob: '1974-01-27', gender: 'male',   blood: 'O+',  phone: '077-9876543', email: 'chaminda.vaas@gmail.com', address: 'Kandy Road, Colombo 07', allergies: 'Penicillin' },
    { mrn: 'P00007', first: 'Kaveesha',   last: 'Wickramasinghe',dob: '1998-05-14', gender: 'female', blood: 'B+',  phone: '071-8765432', email: 'kaveesha.w@gmail.com', address: 'Galle Road, Dehiwala', allergies: 'None' },
    { mrn: 'P00008', first: 'Nuwan',      last: 'Kulasekara',    dob: '1982-07-22', gender: 'male',   blood: 'A-',  phone: '076-7654321', email: 'nuwan.k@yahoo.com', address: 'Negombo Road, Wattala', allergies: 'Sulfa drugs' },
    { mrn: 'P00009', first: 'Thilini',    last: 'Priyadarshani', dob: '1995-11-03', gender: 'female', blood: 'AB+', phone: '072-6543210', email: 'thilini.p@hotmail.com', address: 'Main Street, Kurunegala', allergies: 'None' },
    { mrn: 'P00010', first: 'Dhananjaya', last: 'De Silva',      dob: '1991-09-06', gender: 'male',   blood: 'O-',  phone: '078-5432109', email: 'dhananjaya.ds@gmail.com', address: 'Havelock Road, Colombo 05', allergies: 'Aspirin' }
  ];

  for (const p of newPatients) {
    const exists = await queryOne('SELECT id FROM patients WHERE mrn = ?', [p.mrn]);
    if (!exists) {
      await run(
        `INSERT INTO patients (mrn, first_name, last_name, dob, gender, blood_type, phone, email, address, allergies)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.mrn, p.first, p.last, p.dob, p.gender, p.blood, p.phone, p.email, p.address, p.allergies]
      );
      console.log(`  ✓ Added Patient: ${p.first} ${p.last} (${p.mrn})`);
    }
  }

  // Fetch all patients and doctors
  const patients = await query('SELECT id, mrn, first_name, last_name FROM patients WHERE active=1 ORDER BY id');
  const doctors = await query('SELECT id, name, specialization FROM doctors WHERE active=1 ORDER BY id');
  const adminUser = await queryOne('SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name="admin" LIMIT 1)');
  const adminId = adminUser ? adminUser.id : 1;

  if (patients.length === 0 || doctors.length === 0) {
    console.log('  ⚠️ Patients or Doctors missing. Please run seed first.');
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // 2. Appointments
  const existingAppts = await queryOne('SELECT COUNT(*) as c FROM appointments');
  if (existingAppts.c === 0) {
    console.log('Seeding appointments...');
    const appts = [
      { p: patients[0].id, d: doctors[0].id, date: today, time: '09:30:00', type: 'consultation', status: 'completed', complaint: 'Chest tightness and mild fatigue' },
      { p: patients[1].id, d: doctors[1].id, date: today, time: '10:30:00', type: 'follow_up',    status: 'scheduled', complaint: 'Post-knee arthroscopy review' },
      { p: patients[2].id, d: doctors[2].id, date: today, time: '11:15:00', type: 'consultation', status: 'scheduled', complaint: 'Frequent migraine episodes with aura' },
      { p: patients[3].id, d: doctors[3].id, date: today, time: '14:00:00', type: 'checkup',      status: 'scheduled', complaint: 'Pediatric viral fever follow-up' },
      { p: patients[4].id, d: doctors[4].id, date: today, time: '15:30:00', type: 'consultation', status: 'scheduled', complaint: 'Routine antenatal checkup' },
      { p: patients[5 % patients.length].id, d: doctors[0].id, date: tomorrow, time: '09:00:00', type: 'checkup', status: 'scheduled', complaint: 'Hypertension annual review' },
      { p: patients[6 % patients.length].id, d: doctors[5 % doctors.length].id, date: yesterday, time: '16:00:00', type: 'emergency', status: 'completed', complaint: 'Severe acute gastritis' },
    ];

    for (const a of appts) {
      await run(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, status, chief_complaint, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.p, a.d, a.date, a.time, a.type, a.status, a.complaint, adminId]
      );
    }
    console.log(`  ✓ ${appts.length} appointments seeded`);
  }

  // 3. EMR / Medical Records
  const existingRecords = await queryOne('SELECT COUNT(*) as c FROM medical_records');
  if (existingRecords.c === 0) {
    console.log('Seeding medical records...');
    const records = [
      {
        p: patients[0].id, d: doctors[0].id,
        complaint: 'Chest pain on exertion',
        diag: 'Essential Hypertension (Stage 1) with mild angina',
        plan: 'Lifestyle modification, low sodium diet, ECG, prescribe Amlodipine 5mg OD.',
        rx: 'Amlodipine 5mg OD - 30 days\nAtorvastatin 20mg Nocte - 30 days',
        vitals: { bp: '138/88 mmHg', pulse: '76 bpm', temp: '98.4 F', spo2: '99%', weight: '74 kg' }
      },
      {
        p: patients[1].id, d: doctors[1].id,
        complaint: 'Left knee pain after sports activity',
        diag: 'Mild Medial Meniscal Strain',
        plan: 'Rest, ice therapy, physiotherapist referral for quadriceps strengthening.',
        rx: 'Paracetamol 500mg TDS PRN\nDiclofenac gel locally BD',
        vitals: { bp: '120/80 mmHg', pulse: '72 bpm', temp: '98.6 F', spo2: '100%', weight: '62 kg' }
      },
      {
        p: patients[2].id, d: doctors[2].id,
        complaint: 'Recurrent unilateral throbbing headache',
        diag: 'Migraine without aura',
        plan: 'Avoid caffeine triggers, adequate sleep hygiene, rescue medication at onset.',
        rx: 'Paracetamol 1000mg stat\nNaproxen 500mg PRN',
        vitals: { bp: '124/82 mmHg', pulse: '80 bpm', temp: '98.2 F', spo2: '98%', weight: '68 kg' }
      }
    ];

    for (const r of records) {
      await run(
        `INSERT INTO medical_records (patient_id, doctor_id, chief_complaint, diagnosis, treatment_plan, prescription, vitals, visit_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [r.p, r.d, r.complaint, r.diag, r.plan, r.rx, JSON.stringify(r.vitals)]
      );
    }
    console.log(`  ✓ ${records.length} medical records seeded`);
  }

  // 4. Admissions
  const existingAdmissions = await queryOne('SELECT COUNT(*) as c FROM admissions');
  if (existingAdmissions.c === 0) {
    console.log('Seeding admissions...');
    const admissions = [
      { p: patients[0].id, d: doctors[0].id, ward: 'Cardiology Ward 3', bed: 'Bed 302', type: 'inpatient', diag: 'Unstable Angina Monitoring', status: 'admitted' },
      { p: patients[2].id, d: doctors[2].id, ward: 'Neurology Ward 1',  bed: 'Bed 108', type: 'inpatient', diag: 'Severe Migraine Status',       status: 'admitted' },
      { p: patients[3].id, d: doctors[3].id, ward: 'Pediatric Ward 2',  bed: 'Bed 205', type: 'inpatient', diag: 'Dengue Fever Day 3 Monitoring', status: 'admitted' },
      { p: patients[4].id, d: doctors[4].id, ward: 'Maternity Ward',    bed: 'Bed 410', type: 'inpatient', diag: 'Antenatal Observation',        status: 'discharged' }
    ];

    for (const adm of admissions) {
      await run(
        `INSERT INTO admissions (patient_id, doctor_id, ward, bed_number, admission_type, diagnosis, status, admitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [adm.p, adm.d, adm.ward, adm.bed, adm.type, adm.diag, adm.status]
      );
    }
    console.log(`  ✓ ${admissions.length} admissions seeded`);
  }

  // 5. Laboratory Tests
  const existingLabs = await queryOne('SELECT COUNT(*) as c FROM lab_tests');
  if (existingLabs.c === 0) {
    console.log('Seeding laboratory tests...');
    const labTech = await queryOne('SELECT id FROM users WHERE username = "lab.saman"') || { id: adminId };
    const tests = [
      { p: patients[0].id, d: doctors[0].id, name: 'Lipid Profile (Full)', cat: 'Biochemistry', priority: 'normal', status: 'completed', res: 'Total Cholesterol: 215 mg/dL, HDL: 44 mg/dL, LDL: 135 mg/dL, Triglycerides: 180 mg/dL', ref: '< 200 mg/dL', fee: 2200 },
      { p: patients[3].id, d: doctors[3].id, name: 'Full Blood Count (FBC)', cat: 'Hematology', priority: 'urgent', status: 'completed', res: 'WBC: 4.8 x10^3/uL, Platelets: 165 x10^3/uL, Hemoglobin: 13.2 g/dL, HCT: 40%', ref: 'Plat: 150-450 x10^3/uL', fee: 950 },
      { p: patients[1].id, d: doctors[1].id, name: 'Serum Uric Acid', cat: 'Biochemistry', priority: 'normal', status: 'requested', res: null, ref: '3.5 - 7.2 mg/dL', fee: 800 },
      { p: patients[2].id, d: doctors[2].id, name: 'Serum Electrolytes (Na/K/Cl)', cat: 'Biochemistry', priority: 'normal', status: 'in-progress', res: null, ref: 'Na: 135-145, K: 3.5-5.0 mmol/L', fee: 1400 },
      { p: patients[4].id, d: doctors[4].id, name: 'Fasting Blood Sugar (FBS)', cat: 'Biochemistry', priority: 'normal', status: 'completed', res: '92 mg/dL', ref: '70 - 100 mg/dL', fee: 600 }
    ];

    for (const t of tests) {
      await run(
        `INSERT INTO lab_tests (patient_id, doctor_id, test_name, test_category, priority, status, result, reference_range, charge, technician_id, requested_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [t.p, t.d, t.name, t.cat, t.priority, t.status, t.res, t.ref, t.fee, labTech.id]
      );
    }
    console.log(`  ✓ ${tests.length} lab tests seeded`);
  }

  // 6. Pharmacy Prescriptions
  const existingRx = await queryOne('SELECT COUNT(*) as c FROM prescriptions');
  if (existingRx.c === 0) {
    console.log('Seeding pharmacy prescriptions...');
    const pharmaUser = await queryOne('SELECT id FROM users WHERE username = "pharma.ruwan"') || { id: adminId };
    const rxItems1 = [
      { medicine_name: 'Amlodipine 5mg', dosage: '1 tab OD morning', quantity: 30, unit_price: 12.00 },
      { medicine_name: 'Atorvastatin 20mg', dosage: '1 tab Nocte night', quantity: 30, unit_price: 15.00 }
    ];
    const rxItems2 = [
      { medicine_name: 'Paracetamol 500mg', dosage: '2 tabs TDS PRN', quantity: 20, unit_price: 2.50 },
      { medicine_name: 'Amoxicillin 500mg', dosage: '1 cap TDS 8-hourly', quantity: 21, unit_price: 8.00 }
    ];

    await run(
      `INSERT INTO prescriptions (patient_id, doctor_id, items, status, dispensed_by, dispensed_at, notes)
       VALUES (?, ?, ?, 'dispensed', ?, NOW(), 'Dispensed with patient counseling on dosage')`,
      [patients[0].id, doctors[0].id, JSON.stringify(rxItems1), pharmaUser.id]
    );

    await run(
      `INSERT INTO prescriptions (patient_id, doctor_id, items, status, notes)
       VALUES (?, ?, ?, 'pending', 'To be collected after lab report verification')`,
      [patients[1].id, doctors[1].id, JSON.stringify(rxItems2)]
    );
    console.log('  ✓ 2 prescriptions seeded');
  }

  // 7. Billing & Payments
  const existingBills = await queryOne('SELECT COUNT(*) as c FROM bills');
  if (existingBills.c === 0) {
    console.log('Seeding bills and payments...');
    const billItems1 = [
      { description: 'Consultation Fee (Dr. Nuwan Silva)', amount: 2500, type: 'consultation' },
      { description: 'ECG 12-Lead Diagnostic', amount: 1500, type: 'investigation' },
      { description: 'Lipid Profile Blood Test', amount: 2200, type: 'lab' }
    ];
    const b1 = await run(
      `INSERT INTO bills (patient_id, items, subtotal, discount, tax, total, status, created_by)
       VALUES (?, ?, 6200.00, 200.00, 0.00, 6000.00, 'paid', ?)`,
      [patients[0].id, JSON.stringify(billItems1), adminId]
    );

    await run(
      `INSERT INTO payments (bill_id, amount, method, reference, notes, received_by)
       VALUES (?, 6000.00, 'cash', 'REC-2026-001', 'Settled in full at counter', ?)`,
      [b1.lastId, adminId]
    );

    const billItems2 = [
      { description: 'Consultation Fee (Dr. Dilani Fernando)', amount: 3000, type: 'consultation' },
      { description: 'Knee X-Ray (AP/Lateral)', amount: 2800, type: 'radiology' }
    ];
    await run(
      `INSERT INTO bills (patient_id, items, subtotal, discount, tax, total, status, created_by)
       VALUES (?, ?, 5800.00, 0.00, 0.00, 5800.00, 'pending', ?)`,
      [patients[1].id, JSON.stringify(billItems2), adminId]
    );
    console.log('  ✓ Bills and payments seeded');
  }

  // 8. Staff / Employees Directory & Attendance
  const existingEmployees = await query('SELECT count(*) as c FROM employees');
  if (existingEmployees[0].c <= 1) {
    console.log('Populating employees directory with all staff accounts...');
    const staffUsers = await query(
      `SELECT u.id, u.username, u.full_name, u.email, r.name as role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE r.name != 'admin'`
    );

    const cardiologyDept = await queryOne('SELECT id FROM departments WHERE name="Cardiology" LIMIT 1') || { id: 1 };
    const generalDept = await queryOne('SELECT id FROM departments WHERE name="General Medicine" LIMIT 1') || { id: 1 };

    for (const s of staffUsers) {
      const exists = await queryOne('SELECT id FROM employees WHERE user_id = ? OR email = ?', [s.id, s.email]);
      if (!exists) {
        const empRole = s.role_name === 'doctor' ? 'Doctor' : (s.role_name.charAt(0).toUpperCase() + s.role_name.slice(1));
        const r = await run(
          `INSERT INTO employees (user_id, name, role, department_id, phone, email, address, dob, gender, join_date, salary, active)
           VALUES (?, ?, ?, ?, '077-5551234', ?, 'Colombo, Sri Lanka', '1985-06-15', 'Male', '2023-01-10', 95000.00, 1)`,
          [s.id, s.full_name, empRole, cardiologyDept.id, s.email]
        );

        // Record attendance for today
        await run(
          `INSERT INTO attendance (employee_id, date, status, check_in, check_out, notes)
           VALUES (?, ?, 'present', '08:00:00', '16:30:00', 'On duty')
           ON DUPLICATE KEY UPDATE status=VALUES(status)`,
          [r.lastId, today]
        );
      }
    }
    console.log('  ✓ Employees directory & attendance seeded');
  }

  console.log('\n✅ All demo records successfully seeded into MySQL!');
  process.exit(0);
}

seedRecords().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
