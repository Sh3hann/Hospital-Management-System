# 🏥 MediCore Hospital Management System

Full-stack Hospital Management System built with **Node.js**, **Express**, and **MySQL**.

---

## 📁 Project Structure

```
hms/
├── frontend/                  ← Static SPA (HTML/CSS/JS)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── api.js             ← API client wrapper
│       ├── app.js             ← SPA router & shell
│       ├── rbac.js            ← Role-based UI
│       ├── utils.js
│       └── pages/             ← Page controllers
│
├── backend/                   ← Node.js API server
│   ├── .env                   ← Database credentials & secrets
│   ├── .env.example           ← Template
│   ├── index.js               ← Server entry point
│   ├── config/
│   │   └── db.js              ← MySQL connection pool (mysql2/promise)
│   ├── middleware/
│   │   ├── auth.js            ← JWT authentication & RBAC
│   │   └── audit.js           ← Audit trail middleware
│   ├── routes/                ← REST API endpoints
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── doctors.js
│   │   ├── appointments.js
│   │   ├── medical-records.js
│   │   ├── admissions.js
│   │   ├── lab.js
│   │   ├── pharmacy.js
│   │   ├── billing.js
│   │   ├── staff.js
│   │   ├── users.js
│   │   ├── reports.js
│   │   └── backup.js          ← Backup & Recovery API
│   ├── db/
│   │   ├── schema.sql         ← MySQL schema
│   │   ├── migrate.js         ← Run schema against MySQL
│   │   ├── seed.js            ← Seed initial data
│   │   ├── seed-demo-accounts.js ← Demo accounts setup (Sri Lankan names)
│   │   └── backup.js          ← Backup/restore engine
│   └── utils/
│       └── scheduler.js       ← Cron backup scheduler
│
├── backups/                   ← Auto-generated backups
│   ├── daily/
│   ├── weekly/
│   └── manual/
│
└── package.json
```

---

## 🔑 Demo Accounts (All Verified & Working)

All accounts are created with real Sri Lankan names across all system roles:

| Role | Username | Password | Full Name | Department / Notes |
|---|---|---|---|---|
| **Administrator** | `admin` | `Admin@123` | Kavindu Perera | System Admin / Full Access |
| **Doctor** | `dr.silva` | `Doctor@123` | Dr. Nuwan Silva | Cardiology |
| **Doctor** | `dr.fernando` | `Doctor@123` | Dr. Dilani Fernando | Orthopedics |
| **Doctor** | `dr.jayawardena` | `Doctor@123` | Dr. Asanka Jayawardena | Neurology |
| **Doctor** | `dr.wickramasinghe` | `Doctor@123` | Dr. Thilini Wickramasinghe | Pediatrics |
| **Doctor** | `dr.rajapaksa` | `Doctor@123` | Dr. Chamari Rajapaksa | Gynecology |
| **Doctor** | `dr.dissanayake` | `Doctor@123` | Dr. Roshan Dissanayake | General Medicine |
| **Doctor** | `dr.bandara` | `Doctor@123` | Dr. Sachini Bandara | Oncology |
| **Nurse** | `nurse.kumari` | `Nurse@123` | Kumari Rathnayake | Inpatient Ward |
| **Nurse** | `nurse.sewwandi` | `Nurse@123` | Sewwandi Gunawardena | Emergency Ward |
| **Nurse** | `nurse.priyanka` | `Nurse@123` | Priyanka Herath | General Ward |
| **Receptionist** | `reception.imalka` | `Staff@123` | Imalka Senanayake | Front Desk / Appointments |
| **Receptionist** | `reception.nadeesha` | `Staff@123` | Nadeesha Wijesinghe | Patient Registration |
| **Pharmacist** | `pharma.ruwan` | `Pharma@123` | Ruwan Karunaratne | Pharmacy Dispenser |
| **Pharmacist** | `pharma.sanduni` | `Pharma@123` | Sanduni Amarasinghe | Pharmacy Stock Lead |
| **Lab Technician** | `lab.saman` | `Lab@123` | Saman Kodithuwakku | Pathology / Blood Lab |
| **Lab Technician** | `lab.nishani` | `Lab@123` | Nishani Pathirana | Diagnostics Lab |
| **Accountant** | `accounts.dinesh` | `Accounts@123` | Dinesh Madushanka | Billing & Cashier |
| **Accountant** | `accounts.hiruni` | `Accounts@123` | Hiruni Jayasooriya | Financial Reports |
| **Patient** | `patient.kasun` / `patient` | `Patient@123` | Kasun Perera | Patient Portal / Personal Health |

---

## ⚙️ Quick Start

```powershell
# 1. Run migrations & seed demo accounts
npm run migrate
npm run seed
node backend/db/seed-demo-accounts.js

# 2. Start server
npm run dev

# 3. Access web client
# http://localhost:3000
```
