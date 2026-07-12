# TransitOps Fleet Manager Dashboard

This repository contains the full-stack codebase for the **TransitOps Fleet Manager Dashboard**—an enterprise-grade Smart Transport Operations Platform. It features a **Toll Plaza Verification system** that cross-checks live GPS tracking logs against independent FASTag crossing events to detect route deviation, skipped tolls, and cargo safety incidents in real-time.

---

## 1. Project Directory Structure

- `/backend`: Node.js Express server with Socket.IO, database schema adapters, PDFKit (PDF audits reports generator), ExcelJS (xlsx sheets generator), and real-time verification algorithms.
- `/frontend`: Next.js App Router project with Tailwind CSS, Lucide icons, Recharts analytics, and Leaflet Map dark-mode views.

---

## 2. Tech Stack Setup

- **Frontend:** Next.js (React), TypeScript, Tailwind CSS, Leaflet Maps, Recharts, Socket.IO Client.
- **Backend:** Node.js, Express, Socket.IO, PDFKit, ExcelJS.
- **Database:** SQLite (default for instant running) / PostgreSQL (production connection configuration).
- **Authentication:** JSON Web Tokens (JWT) with Role-Based Access Control.

---

## 3. How to Run Locally

### Step 1: Start the Backend API
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The server starts on `http://localhost:5000` and automatically boots a seeded SQLite database (`fleet.db`).*

### Step 2: Start the Frontend Portal
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   *The client portal boots on `http://localhost:3000`.*

---

## 4. Default Demo Accounts

Sign in using the following seed configurations on the login screen:

| Role | Email Address | Password |
|---|---|---|
| **Fleet Manager** | `manager@transitops.com` | `admin123` |
| **Fleet Administrator** | `admin@transitops.com` | `admin123` |

---

## 5. Walkthrough of Simulated Security & Safe Auditing

1. Log in to the operational portal at `http://localhost:3000` as the **Fleet Manager**.
2. Click **Launch Simulated Trip** in the **Simulator Control Panel** at the bottom left.
3. Select the vehicle on the map to display its live **Toll Progress Card** in the right-side inspector.
4. Try clicking **Cross** on sequence 1, skip sequence 2, and click **Cross** on sequence 3.
   - *Observe the skipped toll plaza turn red instantly in the audit log.*
   - *A "Missed Toll Plaza" high-severity alert is appended to the operational compliance feed.*
5. Toggle **Force Route Deviation** to **ON**.
   - *Observe the vehicle status marker turn Red/Orange on the map.*
   - *A "Route Deviation" alert triggers a real-time toast banner and compliance warning.*
6. Select the **Analytics & Reports** tab from the top navigation bar to download styled PDF logs, Excel spreadsheets, or CSV raw tables.
