// ================================================================
// backend/db/seed-comprehensive.js
// ================================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initDB, run, query, queryOne } = require('../config/db');

async function seedComprehensive() {
  await initDB();
  console.log('Seeding comprehensive data for MediCare Hospital...');

  // 1. Extra Sri Lankan Patients
  const patientsData = [
    { mrn: 'P00011', first: 'Malinda',    last: 'Warnapura',     dob: '1979-04-12', gender: 'male',   blood: 'B+',  phone: '077-1234567', email: 'malinda.w@gmail.com',     address: 'Peradeniya Road, Kandy',          allergies: 'None' },
    { mrn: 'P00012', first: 'Anula',      last: 'Ratnayake',     dob: '1965-08-25', gender: 'female', blood: 'A+',  phone: '071-2345678', email: 'anula.ratnayake@yahoo.com',address: 'Kurunegala Road, Dambulla',      allergies: 'Ciprofloxacin' },
    { mrn: 'P00013', first: 'Sanjeewa',   last: 'Ranatunga',     dob: '1984-11-19', gender: 'male',   blood: 'O+',  phone: '076-3456789', email: 'sanjeewa.r@gmail.com',     address: 'High Level Road, Nugegoda',       allergies: 'None' },
    { mrn: 'P00014', first: 'Sanduni',    last: 'Jayakody',      dob: '2001-02-14', gender: 'female', blood: 'AB-', phone: '072-4567890', email: 'sanduni.j@hotmail.com',     address: 'Horana Road, Panadura',           allergies: 'NSAIDs' },
    { mrn: 'P00015', first: 'Roshan',     last: 'Mahanama',      dob: '1966-05-31', gender: 'male',   blood: 'O-',  phone: '078-5678901', email: 'roshan.m@gmail.com',       address: 'Ward Place, Colombo 07',          allergies: 'None' },
    { mrn: 'P00016', first: 'Nirosha',    last: 'Jayawardena',   dob: '1993-09-08', gender: 'female', blood: 'B-',  phone: '075-6789012', email: 'nirosha.j@gmail.com',      address: 'Station Road, Moratuwa',          allergies: 'Paracetamol' },
    { mrn: 'P00017', first: 'Kasun',      last: 'Rajitha',       dob: '1993-06-01', gender: 'male',   blood: 'A-',  phone: '070-7890123', email: 'kasun.r@yahoo.com',        address: 'Matara Road, Galle',              allergies: 'None' },
    { mrn: 'P00018', first: 'Hiruni',     last: 'Samarasekara',  dob: '1997-12-20', gender: 'female', blood: 'O+',  phone: '077-8901234', email: 'hiruni.s@gmail.com',       address: 'Kandy Road, Kiribathgoda',        allergies: 'None' }
  ];

  for (const p of patientsData) {
    const exists = await queryOne('SELECT id FROM patients WHERE mrn = ?', [p.mrn]);
    if (!exists) {
      await run(
        `INSERT INTO patients (mrn, first_name, last_name, dob, gender, blood_type, phone, email, address, allergies, active, registered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [p.mrn, p.first, p.last, p.dob, p.gender, p.blood, p.phone, p.email, p.address, p.allergies]
      );
    }
  }
  console.log('  Patients expanded');

  const patients = await query('SELECT id, mrn, first_name, last_name FROM patients WHERE active=1 ORDER BY id');
  const doctors = await query('SELECT id, name, specialization FROM doctors WHERE active=1 ORDER BY id');
  const adminUser = await queryOne('SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name="admin" LIMIT 1)');
  const adminId = adminUser ? adminUser.id : 1;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const dMinus = (days) => new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const dPlus = (days) => new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

  // 2. Extra Appointments (Today, upcoming & past)
  const apptsToAdd = [
    { p: patients[0].id, d: doctors[0].id, date: todayStr, time: '09:00:00', type: 'consultation', status: 'completed', complaint: 'Routine hypertension checkup' },
    { p: patients[1].id, d: doctors[1].id, date: todayStr, time: '09:45:00', type: 'consultation', status: 'completed', complaint: 'Joint pain in right shoulder' },
    { p: patients[2].id, d: doctors[2].id, date: todayStr, time: '10:30:00', type: 'consultation', status: 'scheduled', complaint: 'Dizziness and tension headaches' },
    { p: patients[3].id, d: doctors[3].id, date: todayStr, time: '11:15:00', type: 'follow_up',    status: 'scheduled', complaint: 'Pediatric asthma check' },
    { p: patients[4].id, d: doctors[4].id, date: todayStr, time: '13:30:00', type: 'consultation', status: 'scheduled', complaint: 'Second trimester ultrasound review' },
    { p: patients[5 % patients.length].id, d: doctors[0].id, date: todayStr, time: '14:15:00', type: 'checkup', status: 'scheduled', complaint: 'ECG review and lipid consultation' },
    { p: patients[6 % patients.length].id, d: doctors[5 % doctors.length].id, date: todayStr, time: '15:00:00', type: 'emergency', status: 'scheduled', complaint: 'High fever and dehydration' },
    { p: patients[7 % patients.length].id, d: doctors[2].id, date: dPlus(1), time: '10:00:00', type: 'consultation', status: 'scheduled', complaint: 'Neurological evaluation' },
    { p: patients[8 % patients.length].id, d: doctors[1].id, date: dPlus(2), time: '11:00:00', type: 'follow_up', status: 'scheduled', complaint: 'Sprain recovery examination' },
    { p: patients[9 % patients.length].id, d: doctors[0].id, date: dMinus(1), time: '09:30:00', type: 'consultation', status: 'completed', complaint: 'Follow up on BP medications' },
    { p: patients[10 % patients.length].id, d: doctors[3].id, date: dMinus(2), time: '14:30:00', type: 'checkup', status: 'completed', complaint: 'Childhood vaccination' }
  ];

  for (const a of apptsToAdd) {
    const ex = await queryOne('SELECT id FROM appointments WHERE patient_id=? AND appointment_date=? AND appointment_time=?', [a.p, a.date, a.time]);
    if (!ex) {
      await run(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, status, chief_complaint, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.p, a.d, a.date, a.time, a.type, a.status, a.complaint, adminId]
      );
    }
  }
  console.log('  Appointments seeded');

  // 3. EMR / Medical Records
  const emrToAdd = [
    {
      p: patients[3 % patients.length].id, d: doctors[3 % doctors.length].id,
      complaint: 'Wheezing and nocturnal cough',
      diag: 'Mild Persistent Bronchial Asthma',
      plan: 'Inhaled Salbutamol PRN, Budesonide 200mcg BD. Keep room dust-free.',
      rx: 'Salbutamol Inhaler 100mcg 2 puffs PRN\nBudesonide 200mcg 1 puff BD',
      vitals: { bp: '110/70 mmHg', pulse: '88 bpm', temp: '98.6 F', spo2: '97%', weight: '28 kg' }
    },
    {
      p: patients[5 % patients.length].id, d: doctors[0].id,
      complaint: 'Palpitations after light exercise',
      diag: 'Sinus Tachycardia secondary to anxiety and mild anemia',
      plan: 'Advised 24-hr Holter monitoring, Serum Ferritin test, Oral Iron supplements.',
      rx: 'Ferrous Fumarate 200mg OD\nVitamin C 500mg OD',
      vitals: { bp: '130/84 mmHg', pulse: '102 bpm', temp: '98.4 F', spo2: '99%', weight: '65 kg' }
    },
    {
      p: patients[7 % patients.length].id, d: doctors[2].id,
      complaint: 'Numbness in right hand fingers (thumb, index, middle)',
      diag: 'Carpal Tunnel Syndrome (Moderate)',
      plan: 'Wrist splint at night, nerve conduction study, oral NSAID short course.',
      rx: 'Mecobalamin 500mcg TDS\nCelecoxib 200mg OD for 7 days',
      vitals: { bp: '122/78 mmHg', pulse: '74 bpm', temp: '98.2 F', spo2: '99%', weight: '71 kg' }
    }
  ];

  for (const r of emrToAdd) {
    const ex = await queryOne('SELECT id FROM medical_records WHERE patient_id=? AND diagnosis=?', [r.p, r.diag]);
    if (!ex) {
      await run(
        `INSERT INTO medical_records (patient_id, doctor_id, chief_complaint, diagnosis, treatment_plan, prescription, vitals, visit_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [r.p, r.d, r.complaint, r.diag, r.plan, r.rx, JSON.stringify(r.vitals)]
      );
    }
  }
  console.log('  Medical records seeded');

  // 4. Inpatient Admissions
  const admissionsToAdd = [
    { p: patients[5 % patients.length].id, d: doctors[0].id, ward: 'ICU / CCU', bed: 'Bed 03', type: 'emergency', diag: 'Acute Coronary Syndrome Observation', status: 'admitted' },
    { p: patients[6 % patients.length].id, d: doctors[5 % doctors.length].id, ward: 'General Medical Ward 2', bed: 'Bed 214', type: 'inpatient', diag: 'Dengue Hemorrhagic Fever Warning Signs', status: 'admitted' },
    { p: patients[8 % patients.length].id, d: doctors[1].id, ward: 'Orthopedic Ward 1', bed: 'Bed 105', type: 'inpatient', diag: 'Right Femur Fracture (Pre-Op)', status: 'admitted' }
  ];

  for (const adm of admissionsToAdd) {
    const ex = await queryOne('SELECT id FROM admissions WHERE patient_id=? AND ward=? AND bed_number=?', [adm.p, adm.ward, adm.bed]);
    if (!ex) {
      await run(
        `INSERT INTO admissions (patient_id, doctor_id, ward, bed_number, admission_type, diagnosis, status, admitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [adm.p, adm.d, adm.ward, adm.bed, adm.type, adm.diag, adm.status]
      );
    }
  }
  console.log('  Admissions seeded');

  // 5. Laboratory Tests
  const labTech = await queryOne('SELECT id FROM users WHERE username = "lab.saman"') || { id: adminId };
  const testsToAdd = [
    { p: patients[5 % patients.length].id, d: doctors[0].id, name: 'Troponin I (High Sensitivity)', cat: 'Biochemistry', priority: 'urgent', status: 'completed', res: '0.012 ng/mL (Normal)', ref: '< 0.04 ng/mL', fee: 3500 },
    { p: patients[6 % patients.length].id, d: doctors[5 % doctors.length].id, name: 'Dengue NS1 Antigen', cat: 'Serology', priority: 'urgent', status: 'completed', res: 'POSITIVE (+)', ref: 'Negative', fee: 1800 },
    { p: patients[7 % patients.length].id, d: doctors[2].id, name: 'HbA1c Glycated Hemoglobin', cat: 'Biochemistry', priority: 'normal', status: 'in-progress', res: null, ref: '< 5.7% (Normal), 5.7-6.4% (Pre-diabetic)', fee: 1500 },
    { p: patients[8 % patients.length].id, d: doctors[1].id, name: 'C-Reactive Protein (Quantitative)', cat: 'Immunology', priority: 'normal', status: 'requested', res: null, ref: '< 5.0 mg/L', fee: 1200 },
    { p: patients[9 % patients.length].id, d: doctors[0].id, name: 'Renal Function Test (Urea / Creatinine)', cat: 'Biochemistry', priority: 'normal', status: 'completed', res: 'Creatinine: 0.9 mg/dL, BUN: 14 mg/dL', ref: 'Cr: 0.7 - 1.2 mg/dL', fee: 1600 }
  ];

  for (const t of testsToAdd) {
    const ex = await queryOne('SELECT id FROM lab_tests WHERE patient_id=? AND test_name=?', [t.p, t.name]);
    if (!ex) {
      await run(
        `INSERT INTO lab_tests (patient_id, doctor_id, test_name, test_category, priority, status, result, reference_range, charge, technician_id, requested_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [t.p, t.d, t.name, t.cat, t.priority, t.status, t.res, t.ref, t.fee, labTech.id]
      );
    }
  }
  console.log('  Lab tests seeded');

  // 6. Pharmacy Medicines Inventory (including low stock and expiring items)
  const medicinesToAdd = [
    { name: 'Ciprofloxacin 500mg', gen: 'Ciprofloxacin', cat: 'Antibiotic', form: 'Tablet', str: '500mg', mfr: 'Bayer Pharma', qty: 150, price: 18.00, reorder: 30, exp: dPlus(365), batch: 'CIP-2025-01' },
    { name: 'Salbutamol Inhaler 100mcg', gen: 'Salbutamol', cat: 'Respiratory', form: 'Inhaler', str: '100mcg', mfr: 'GSK Lanka', qty: 8, price: 850.00, reorder: 15, exp: dPlus(180), batch: 'SAL-2025-04' },
    { name: 'Insulin Glargine 100 IU/ml', gen: 'Insulin Glargine', cat: 'Antidiabetic', form: 'Injection', str: '100 IU/ml', mfr: 'Sanofi', qty: 25, price: 3200.00, reorder: 10, exp: dPlus(20), batch: 'INS-2024-09' },
    { name: 'Pantoprazole 40mg', gen: 'Pantoprazole', cat: 'PPI', form: 'Tablet', str: '40mg', mfr: 'Sun Pharma', qty: 320, price: 14.50, reorder: 50, exp: dPlus(400), batch: 'PAN-2025-08' },
    { name: 'Losartan Potassium 50mg', gen: 'Losartan', cat: 'Antihypertensive', form: 'Tablet', str: '50mg', mfr: 'Torrent Pharma', qty: 5, price: 9.00, reorder: 25, exp: dPlus(300), batch: 'LOS-2025-02' },
    { name: 'Azithromycin 500mg', gen: 'Azithromycin', cat: 'Antibiotic', form: 'Tablet', str: '500mg', mfr: 'Cipla Lanka', qty: 180, price: 45.00, reorder: 20, exp: dPlus(15), batch: 'AZI-2024-11' },
    { name: 'Ceftriaxone 1g Vial', gen: 'Ceftriaxone', cat: 'Antibiotic', form: 'Injection', str: '1g', mfr: 'Rocephin', qty: 60, price: 650.00, reorder: 15, exp: dPlus(500), batch: 'CEF-2025-10' },
    { name: 'Oral Rehydration Salts (ORS)', gen: 'ORS Formula WHO', cat: 'Electrolyte', form: 'Sachet', str: '20.5g', mfr: 'State Pharma Corp', qty: 450, price: 35.00, reorder: 50, exp: dPlus(600), batch: 'ORS-2025-01' }
  ];

  for (const m of medicinesToAdd) {
    const ex = await queryOne('SELECT id FROM medicines WHERE name=?', [m.name]);
    if (!ex) {
      await run(
        `INSERT INTO medicines (name, generic_name, category, dosage_form, strength, manufacturer, stock_qty, unit_price, reorder_level, expiry_date, batch_number, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [m.name, m.gen, m.cat, m.form, m.str, m.mfr, m.qty, m.price, m.reorder, m.exp, m.batch]
      );
    }
  }
  console.log('  Medicines catalog seeded');

  // 7. Prescriptions
  const rxToAdd = [
    {
      p: patients[3 % patients.length].id, d: doctors[3 % doctors.length].id,
      items: [
        { medicine_name: 'Salbutamol Inhaler 100mcg', dosage: '2 puffs 8-hourly PRN', quantity: 1, unit_price: 850.00 },
        { medicine_name: 'Paracetamol 500mg', dosage: '1 tab TDS PRN', quantity: 15, unit_price: 2.50 }
      ],
      status: 'pending',
      notes: 'Instruct parent on proper inhaler technique with spacer chamber'
    },
    {
      p: patients[5 % patients.length].id, d: doctors[0].id,
      items: [
        { medicine_name: 'Pantoprazole 40mg', dosage: '1 tab OD before breakfast', quantity: 14, unit_price: 14.50 },
        { medicine_name: 'Aspirin 100mg', dosage: '1 tab OD after lunch', quantity: 30, unit_price: 1.50 }
      ],
      status: 'dispensed',
      notes: 'Dispensed at main pharmacy counter by Pharmacist Ruwan'
    }
  ];

  for (const rx of rxToAdd) {
    await run(
      `INSERT INTO prescriptions (patient_id, doctor_id, items, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [rx.p, rx.d, JSON.stringify(rx.items), rx.status, rx.notes]
    );
  }
  console.log('  Prescriptions seeded');

  // 8. Bills & Payments
  const billingSets = [
    {
      patient: patients[2].id,
      items: [
        { description: 'Neurology Specialist Consultation (Dr. Jayawardena)', amount: 3500, type: 'consultation' },
        { description: 'Serum Electrolytes Lab Investigation', amount: 1400, type: 'lab' }
      ],
      subtotal: 4900.00, discount: 0.00, tax: 0.00, total: 4900.00,
      status: 'paid',
      payAmount: 4900.00, payMethod: 'card', payRef: 'TXN-CARD-9081',
      date: todayStr
    },
    {
      patient: patients[3].id,
      items: [
        { description: 'Pediatric Care & Nebulization Session', amount: 2200, type: 'procedure' },
        { description: 'Salbutamol Inhaler & Oral Medications', amount: 887.50, type: 'pharmacy' }
      ],
      subtotal: 3087.50, discount: 87.50, tax: 0.00, total: 3000.00,
      status: 'paid',
      payAmount: 3000.00, payMethod: 'cash', payRef: 'REC-2026-088',
      date: dMinus(1)
    },
    {
      patient: patients[4].id,
      items: [
        { description: 'Maternity Ward Inpatient Care (2 Days)', amount: 12000, type: 'accommodation' },
        { description: 'Gynecological Specialist Review', amount: 3000, type: 'consultation' },
        { description: 'Fasting Blood Sugar & Routine Panels', amount: 1600, type: 'lab' }
      ],
      subtotal: 16600.00, discount: 600.00, tax: 0.00, total: 16000.00,
      status: 'paid',
      payAmount: 16000.00, payMethod: 'bank_transfer', payRef: 'SLIP-BOC-4421',
      date: dMinus(2)
    },
    {
      patient: patients[5 % patients.length].id,
      items: [
        { description: 'CCU Monitoring & Emergency Cardiac Review', amount: 9500, type: 'emergency' },
        { description: 'High Sensitivity Troponin I', amount: 3500, type: 'lab' }
      ],
      subtotal: 13000.00, discount: 0.00, tax: 0.00, total: 13000.00,
      status: 'pending',
      payAmount: 0,
      date: todayStr
    },
    {
      patient: patients[7 % patients.length].id,
      items: [
        { description: 'General Medical Consultation', amount: 2000, type: 'consultation' },
        { description: 'Lipid Profile Full Panel', amount: 2200, type: 'lab' }
      ],
      subtotal: 4200.00, discount: 200.00, tax: 0.00, total: 4000.00,
      status: 'pending',
      payAmount: 0,
      date: todayStr
    }
  ];

  for (const b of billingSets) {
    const newBill = await run(
      `INSERT INTO bills (patient_id, items, subtotal, discount, tax, total, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.patient, JSON.stringify(b.items), b.subtotal, b.discount, b.tax, b.total, b.status, adminId, `${b.date} 11:30:00`]
    );

    if (b.payAmount > 0) {
      await run(
        `INSERT INTO payments (bill_id, amount, method, reference, notes, received_by, paid_at)
         VALUES (?, ?, ?, ?, 'Settled via billing desk', ?, ?)`,
        [newBill.lastId, b.payAmount, b.payMethod, b.payRef, adminId, `${b.date} 12:00:00`]
      );
    }
  }
  console.log('  Bills and payments seeded');

  // 9. Leave Requests & Attendance
  const employees = await query('SELECT id, name FROM employees WHERE active=1');
  if (employees.length >= 4) {
    const leaves = [
      { emp: employees[0].id, type: 'annual', start: dPlus(3), end: dPlus(5), reason: 'Family annual pilgrimage to Anuradhapura', status: 'pending' },
      { emp: employees[1].id, type: 'medical', start: dMinus(3), end: dMinus(1), reason: 'Viral fever and rest advised by physician', status: 'approved' },
      { emp: employees[2].id, type: 'casual', start: dPlus(7), end: dPlus(8), reason: 'Attending university graduation ceremony', status: 'pending' },
      { emp: employees[3].id, type: 'annual', start: dPlus(10), end: dPlus(14), reason: 'Personal leave', status: 'pending' }
    ];

    for (const l of leaves) {
      const ex = await queryOne('SELECT id FROM leave_requests WHERE employee_id=? AND start_date=?', [l.emp, l.start]);
      if (!ex) {
        await run(
          `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, approved_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [l.emp, l.type, l.start, l.end, l.reason, l.status, l.status === 'approved' ? adminId : null]
        );
      }
    }

    for (const emp of employees) {
      await run(
        `INSERT INTO attendance (employee_id, date, status, check_in, check_out, notes)
         VALUES (?, ?, 'present', '08:15:00', '16:45:00', 'On duty')
         ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [emp.id, todayStr]
      );
    }
    console.log('  Staff leave requests & attendance seeded');
  }

  console.log('Comprehensive database seeding completed successfully!');
  process.exit(0);
}

seedComprehensive().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
