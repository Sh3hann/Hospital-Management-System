<div align="center">

# 🏥 MediCore Hospital Management System
### Enterprise Healthcare Operations & Patient Electronic Health Records (EHR) Portal

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://hospital-management-system-green-eight.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<p align="center">
  <a href="https://hospital-management-system-green-eight.vercel.app"><b>🚀 Visit Live Platform</b></a> •
  <a href="#-project-structure"><b>Architecture</b></a> •
  <a href="#-demo-accounts-all-verified--working"><b>Demo Logins</b></a> •
  <a href="#️-quick-start"><b>Local Setup</b></a>
</p>

</div>

---

Full-stack, production-grade Hospital Management System built with **Node.js**, **Express**, and **MySQL**. Provides comprehensive medical workflows including OPD/IPD admissions, doctor scheduling, electronic medical records, laboratory testing, pharmacy dispensary, billing, audit logging, and automated database backups.

---

## 📁 Project Structure

`
hms/
├── frontend/                  # Static Single Page App (HTML5 / Modern CSS / Vanilla JS)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── api.js             # API client & fetch wrapper
│       ├── app.js             # SPA router & shell
│       ├── rbac.js            # Role-based UI rendering
│       ├── utils.js
│       └── pages/             # Page controllers (patients, doctors, billing, etc.)
│
├── backend/                   # Node.js REST API server
│   ├── .env                   # Database credentials & secrets
│   ├── .env.example           # Configuration template
│   ├── index.js               # Server entry point
│   ├── config/
│   │   └── db.js              # MySQL connection pool (mysql2/promise)
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication & RBAC middleware
│   │   └── audit.js           # Comprehensive compliance audit trail
│   ├── routes/                # REST API endpoints
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
│   │   └── backup.js          # Backup & Recovery REST API
│   ├── db/
│   │   ├── schema.sql         # Relational database schema
│   │   ├── migrate.js         # Automated schema migration runner
│   │   ├── seed.js            # Database seeding utility
│   │   ├── seed-demo-accounts.js # Comprehensive demo accounts
│   │   └── backup.js          # Automated database backup engine
│   └── utils/
│       └── scheduler.js       # Automated cron backup scheduler
│
├── backups/                   # System backups
│   ├── daily/
│   ├── weekly/
│   └── manual/
│
└── package.json
`

---

## 🔑 Demo Accounts (All Verified & Working)

All accounts are created with real Sri Lankan names across all system roles:

| Role | Username | Password | Full Name | Department / Notes |
|---|---|---|---|---|
| **Administrator** | dmin | Admin@123 | Kavindu Perera | System Admin / Full Access |
| **Doctor** | dr.silva | Doctor@123 | Dr. Nuwan Silva | Cardiology |
| **Doctor** | dr.fernando | Doctor@123 | Dr. Dilani Fernando | Orthopedics |
| **Doctor** | dr.jayawardena | Doctor@123 | Dr. Asanka Jayawardena | Neurology |
| **Doctor** | dr.wickramasinghe | Doctor@123 | Dr. Thilini Wickramasinghe | Pediatrics |
| **Doctor** | dr.rajapaksa | Doctor@123 | Dr. Chamari Rajapaksa | Gynecology |
| **Doctor** | dr.dissanayake | Doctor@123 | Dr. Roshan Dissanayake | General Medicine |
| **Doctor** | dr.bandara | Doctor@123 | Dr. Sachini Bandara | Oncology |
| **Nurse** | 
urse.kumari | Nurse@123 | Kumari Rathnayake | Inpatient Ward |
| **Nurse** | 
urse.sewwandi | Nurse@123 | Sewwandi Gunawardena | Emergency Ward |
| **Nurse** | 
urse.priyanka | Nurse@123 | Priyanka Herath | General Ward |
| **Receptionist** | eception.imalka | Staff@123 | Imalka Senanayake | Front Desk / Appointments |
| **Receptionist** | eception.nadeesha | Staff@123 | Nadeesha Wijesinghe | Patient Registration |
| **Pharmacist** | pharma.ruwan | Pharma@123 | Ruwan Karunaratne | Pharmacy Dispenser |
| **Pharmacist** | pharma.sanduni | Pharma@123 | Sanduni Amarasinghe | Pharmacy Stock Lead |
| **Lab Technician** | lab.saman | Lab@123 | Saman Kodithuwakku | Pathology / Blood Lab |
| **Lab Technician** | lab.nishani | Lab@123 | Nishani Pathirana | Diagnostics Lab |
| **Accountant** | ccounts.dinesh | Accounts@123 | Dinesh Madushanka | Billing & Cashier |
| **Accountant** | ccounts.hiruni | Accounts@123 | Hiruni Jayasooriya | Financial Reports |
| **Patient** | patient.kasun / patient | Patient@123 | Kasun Perera | Patient Portal / Personal Health |

---

## ⚙️ Quick Start

`powershell
# 1. Run migrations & seed demo accounts
npm run migrate
npm run seed
node backend/db/seed-demo-accounts.js

# 2. Start server
npm run dev

# 3. Access web client
# http://localhost:3000
`

---

## 👤 Author

**Akil Shehan**
- Live Demo: [hospital-management-system-green-eight.vercel.app](https://hospital-management-system-green-eight.vercel.app)
- Portfolio: [itzshehan.xyz](https://itzshehan.xyz/)
- GitHub: [@Sh3hann](https://github.com/Sh3hann)
- LinkedIn: [Akil Shehan](https://www.linkedin.com/in/akil-shehan-b808b340b)

---

## 📄 License
This project is licensed under the MIT License.