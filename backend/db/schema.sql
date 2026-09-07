-- ================================================================
-- HMS Database Schema — MySQL 8.x
-- File: backend/db/schema.sql
-- ================================================================

CREATE DATABASE IF NOT EXISTS hmsdb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hmsdb;

-- =====================
-- ROLES & USERS
-- =====================

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  permissions TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- DEPARTMENTS
-- =====================

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  head_doctor_id INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- DOCTORS
-- =====================

CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(200) NOT NULL,
  specialization VARCHAR(200) NOT NULL,
  department_id INT,
  phone VARCHAR(50),
  email VARCHAR(200),
  qualification VARCHAR(300),
  experience_years INT DEFAULT 0,
  consultation_fee DECIMAL(10,2) DEFAULT 0.00,
  schedule JSON,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- PATIENTS
-- =====================

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mrn VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  blood_type VARCHAR(10),
  phone VARCHAR(50),
  email VARCHAR(200),
  address TEXT,
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(50),
  insurance_provider VARCHAR(200),
  insurance_number VARCHAR(100),
  allergies TEXT,
  notes TEXT,
  active TINYINT(1) NOT NULL DEFAULT 1,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- PATIENT DOCUMENTS
-- =====================

CREATE TABLE IF NOT EXISTS patient_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  category VARCHAR(100) DEFAULT 'medical_report',
  file_data LONGTEXT,
  file_name VARCHAR(300),
  file_size VARCHAR(50),
  uploaded_by INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- APPOINTMENTS
-- =====================

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  type VARCHAR(100) NOT NULL DEFAULT 'consultation',
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  chief_complaint TEXT,
  notes TEXT,
  created_by INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- ADMISSIONS
-- =====================

CREATE TABLE IF NOT EXISTS admissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT,
  ward VARCHAR(100),
  bed_number VARCHAR(50),
  admission_type VARCHAR(50) DEFAULT 'inpatient',
  diagnosis TEXT,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'admitted',
  admitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  discharge_date DATETIME,
  discharged_at DATETIME,
  discharge_diagnosis TEXT,
  discharge_notes TEXT,
  notes TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- MEDICAL RECORDS
-- =====================

CREATE TABLE IF NOT EXISTS medical_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_id INT,
  visit_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  chief_complaint TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  prescription TEXT,
  notes TEXT,
  vitals JSON,
  follow_up_date DATE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- LABORATORY
-- =====================

CREATE TABLE IF NOT EXISTS lab_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  test_name VARCHAR(200) NOT NULL,
  test_category VARCHAR(100),
  priority VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) NOT NULL DEFAULT 'requested',
  sample_collected_at DATETIME,
  result TEXT,
  reference_range VARCHAR(300),
  remarks TEXT,
  technician_id INT,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  charge DECIMAL(10,2) DEFAULT 0.00,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- PHARMACY
-- =====================

CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),
  category VARCHAR(100),
  dosage_form VARCHAR(100),
  strength VARCHAR(100),
  manufacturer VARCHAR(200),
  stock_qty INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  reorder_level INT DEFAULT 10,
  expiry_date DATE,
  batch_number VARCHAR(100),
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  medical_record_id INT,
  items JSON NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  dispensed_by INT,
  dispensed_at DATETIME,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (medical_record_id) REFERENCES medical_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- BILLING
-- =====================

CREATE TABLE IF NOT EXISTS bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  admission_id INT,
  items JSON NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  due_date DATE,
  notes TEXT,
  created_by INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (admission_id) REFERENCES admissions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(50) NOT NULL DEFAULT 'cash',
  reference VARCHAR(200),
  notes TEXT,
  received_by INT,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- EMPLOYEES & STAFF
-- =====================

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(100) NOT NULL,
  department_id INT,
  phone VARCHAR(50),
  email VARCHAR(200),
  address TEXT,
  dob DATE,
  gender VARCHAR(20),
  join_date DATE,
  salary DECIMAL(12,2) DEFAULT 0.00,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'present',
  check_in TIME,
  check_out TIME,
  notes TEXT,
  UNIQUE KEY uniq_attendance (employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  approved_by INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- AUDIT LOGS
-- =====================

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100),
  record_id INT,
  details TEXT,
  ip_address VARCHAR(100),
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_module (module),
  INDEX idx_audit_ts (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================
-- BACKUP LOGS
-- =====================

CREATE TABLE IF NOT EXISTS backup_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  file_path VARCHAR(500),
  file_size BIGINT,
  status VARCHAR(50) NOT NULL DEFAULT 'success',
  error_msg TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_backup_type (type),
  INDEX idx_backup_ts (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;