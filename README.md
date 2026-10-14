<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=16,23,30&height=200&section=header&text=🏥%20MediCore%20HMS&fontSize=46&fontAlignY=36&desc=Enterprise%20Healthcare%20Operations%20%7C%20EHR%20%7C%20Clinical%20Portal&descAlignY=58&descSize=16&fontColor=ffffff" width="100%" alt="MediCore HMS Header" />

  <p align="center">
    <b>A high-performance, full-stack Hospital Management & Electronic Health Records (EHR) platform built for clinical efficiency, patient care, and automated administration.</b>
  </p>

  <p align="center">
    <a href="https://hospital-management-system-green-eight.vercel.app" target="_blank">
      <img src="https://img.shields.io/badge/🌐_Live_Demo-Launch_Portal-0077B5?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
    </a>
    &nbsp;
    <a href="https://github.com/Sh3hann/Hospital-Management-System">
      <img src="https://img.shields.io/badge/💻_Source_Code-GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="Source Code" />
    </a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-Backend-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL" />
    <img src="https://img.shields.io/badge/JWT-RBAC_Security-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT" />
    <img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" alt="License" />
  </p>

</div>

---

## ⚡ Core Operational Modules

<div align="center">

| Module | Core Functionality | Impact |
|:---|:---|:---|
| 🏥 **Patient & EHR Engine** | Complete OPD/IPD registration, medical history, vital signs tracking, and digital prescription archives. | Eliminates paper records and streamlines patient care history. |
| 👨‍⚕️ **Doctor & Consultation Desk** | Specialty-based appointment scheduling (Cardiology, Neurology, Pediatrics, etc.) with real-time slot management. | Prevents scheduling overlaps and optimizes consultation queues. |
| 🧪 **Pathology & Lab Diagnostics** | Diagnostic test requisition, specimen tracking, result entry, and automated lab report generation. | Accelerates turnaround time for critical diagnostic evaluations. |
| 💊 **Pharmacy & Inventory** | Real-time drug inventory tracking, automated prescription dispensing, and low-stock threshold alerts. | Prevents medication stockouts and ensures accurate prescription fulfillment. |
| 💳 **Billing & Automated Invoicing** | Comprehensive financial desk calculating consultation, pharmacy, and laboratory charges with receipt generation. | Provides instant reconciliation and transparent breakdown of charges. |
| 🛡️ **Audit Trail & System Recovery** | Full compliance audit logging for every medical transaction with automated database backup routines. | Ensures medical regulatory compliance and high disaster recovery readiness. |

</div>

---

## 🏗️ System Architecture

MediCore is engineered using a decoupled Single Page Application (SPA) frontend and a modular REST API backend:

`mermaid
graph LR
    subgraph Client ["Frontend Client"]
        UI["Modern SPA Interface<br/>(HTML5 / CSS3 / Vanilla JS)"]
        RBAC_UI["Role-Based View Engine"]
        API_CLIENT["REST API Client"]
    end

    subgraph Server ["Node.js Express Backend"]
        ROUTER["API Router"]
        AUTH["JWT & RBAC Middleware"]
        AUDIT["Compliance Audit Engine"]
        SERVICES["Clinical Services Layer"]
    end

    subgraph DataStore ["Persistence Layer"]
        DB[("MySQL Relational DB")]
        BACKUP["Automated Backup Engine"]
    end

    UI --> RBAC_UI --> API_CLIENT
    API_CLIENT --> ROUTER
    ROUTER --> AUTH --> AUDIT --> SERVICES
    SERVICES --> DB
    DB --> BACKUP
`

<details>
<summary><b>📂 View Modular Codebase Organization</b></summary>

`
Hospital-Management-System/
├── frontend/                  # Responsive Single Page Application
│   ├── js/pages/              # Modular view controllers (patients, doctors, billing)
│   ├── js/rbac.js             # Dynamic role-based interface gating
│   └── js/api.js              # Centralized authenticated API gateway
├── backend/                   # RESTful API Micro-Architecture
│   ├── routes/                # Domain routers (auth, medical-records, lab, pharmacy, billing)
│   ├── middleware/            # JWT verification & audit trail interceptors
│   ├── config/db.js           # MySQL connection pooling (mysql2/promise)
│   └── db/                    # Schema migrations, seeders & backup schedulers
└── backups/                   # Automated scheduled database snapshots
`

</details>

---

## 🔑 Quick Demo Access

Test the live platform immediately using any of the pre-configured accounts:

| Role | Username | Password | Access Level |
|:---|:---|:---|:---|
| **System Admin** | dmin | Admin@123 | Full administrative control, system logs & backups |
| **Chief Doctor** | dr.silva | Doctor@123 | Clinical consults, prescriptions & medical records |
| **Nurse Lead** | 
urse.kumari | Nurse@123 | Inpatient wards, patient vitals & admissions |
| **Patient** | patient | Patient@123 | Personal health portal, appointments & billing |

<details>
<summary><b>📋 View Full Roster (20 Verified Multi-Department Accounts)</b></summary>

| Role | Username | Password | Full Name | Department / Focus |
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
| **Receptionist** | eception.imalka | Staff@123 | Imalka Senanayake | Front Desk & Appointments |
| **Receptionist** | eception.nadeesha | Staff@123 | Nadeesha Wijesinghe | Patient Registration |
| **Pharmacist** | pharma.ruwan | Pharma@123 | Ruwan Karunaratne | Pharmacy Dispenser |
| **Pharmacist** | pharma.sanduni | Pharma@123 | Sanduni Amarasinghe | Pharmacy Stock Lead |
| **Lab Technician** | lab.saman | Lab@123 | Saman Kodithuwakku | Pathology & Blood Lab |
| **Lab Technician** | lab.nishani | Lab@123 | Nishani Pathirana | Diagnostics Lab |
| **Accountant** | ccounts.dinesh | Accounts@123 | Dinesh Madushanka | Billing & Cashier |
| **Accountant** | ccounts.hiruni | Accounts@123 | Hiruni Jayasooriya | Financial Reports |
| **Patient** | patient.kasun | Patient@123 | Kasun Perera | Personal Health Records |

</details>

---

## 🚀 Local Development Setup

### 1. Clone & Install
`ash
git clone https://github.com/Sh3hann/Hospital-Management-System.git
cd Hospital-Management-System
npm install
`

### 2. Configure Environment
Create ackend/.env with your database credentials:
`env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hms_db
JWT_SECRET=your_jwt_secret_key
PORT=3000
`

### 3. Run Database Migrations & Seeds
`ash
npm run migrate
npm run seed
node backend/db/seed-demo-accounts.js
`

### 4. Start the Application
`ash
npm run dev
`
Open **http://localhost:3000** in your browser.

---

<div align="center">

### 👨‍💻 Developed with Precision by [Akil Shehan](https://github.com/Sh3hann)

[![Website](https://img.shields.io/badge/Portfolio-itzshehan.xyz-f59e0b?style=flat-square&logo=google-chrome&logoColor=white)](https://itzshehan.xyz/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Akil_Shehan-0077b5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/akil-shehan-b808b340b)
[![GitHub](https://img.shields.io/badge/GitHub-@Sh3hann-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Sh3hann)

<sub>© 2026 MediCore HMS. Released under the MIT License.</sub>

</div>