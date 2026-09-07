const { initDB, run, queryOne } = require('./db');

async function migrate() {
  await initDB();
  console.log('Running database migration...');

  try {
    run('ALTER TABLE admissions ADD COLUMN admission_type TEXT DEFAULT "inpatient"');
    console.log('✅ Column admission_type added to admissions table');
  } catch(e) {
    console.log('Note (admission_type):', e.message);
  }

  try {
    run('ALTER TABLE admissions ADD COLUMN discharge_diagnosis TEXT');
    console.log('✅ Column discharge_diagnosis added to admissions table');
  } catch(e) {
    console.log('Note (discharge_diagnosis):', e.message);
  }

  try {
    run('ALTER TABLE admissions ADD COLUMN discharge_notes TEXT');
    console.log('✅ Column discharge_notes added to admissions table');
  } catch(e) {
    console.log('Note (discharge_notes):', e.message);
  }

  console.log('Migration complete!');
}

migrate();
