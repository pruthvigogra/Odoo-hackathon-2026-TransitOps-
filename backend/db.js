const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'transitops.db');
const db = new sqlite3.Database(dbPath);

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function initDb() {
  db.serialize(() => {
    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON;");

    // 1. Create Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL
    )`);

    // 2. Create Vehicles Table
    db.run(`CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reg_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      max_load_capacity INTEGER NOT NULL,
      odometer INTEGER NOT NULL,
      acquisition_cost REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available'
    )`);

    // 3. Create Drivers Table
    db.run(`CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license_no TEXT UNIQUE NOT NULL,
      license_category TEXT NOT NULL,
      license_expiry_date TEXT NOT NULL,
      contact_no TEXT NOT NULL,
      safety_score REAL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'Available'
    )`);

    // 4. Create Trips Table
    db.run(`CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      cargo_weight REAL NOT NULL,
      planned_distance REAL NOT NULL,
      vehicle_id INTEGER,
      driver_id INTEGER,
      status TEXT NOT NULL DEFAULT 'Draft',
      final_odometer REAL,
      fuel_consumed REAL,
      revenue REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )`);

    // 5. Create Maintenance Records Table
    db.run(`CREATE TABLE IF NOT EXISTS maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      cost REAL NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )`);

    // 6. Create Fuel Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS fuel_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      liters REAL NOT NULL,
      cost REAL NOT NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )`);

    // 7. Create Expenses Table
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER,
      vehicle_id INTEGER NOT NULL,
      toll REAL DEFAULT 0,
      other REAL DEFAULT 0,
      maintenance_cost REAL DEFAULT 0,
      total REAL NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )`);

    // Seed Data if empty
    db.get("SELECT count(*) as count FROM users", (err, row) => {
      if (err) return console.error(err);
      if (!row || row.count === 0) {
        db.serialize(() => {
          console.log("Seeding users...");
          const roles = [
            { email: 'manager@transitops.com', role: 'Fleet Manager', name: 'Alice Manager', pass: 'manager123' },
            { email: 'dispatcher@transitops.com', role: 'Dispatcher', name: 'Bob Dispatcher', pass: 'dispatcher123' },
            { email: 'safety@transitops.com', role: 'Safety Officer', name: 'Charlie Safety', pass: 'safety123' },
            { email: 'finance@transitops.com', role: 'Financial Analyst', name: 'Diana Finance', pass: 'finance123' }
          ];

          for (const u of roles) {
            const hash = bcrypt.hashSync(u.pass, 8);
            db.run("INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)", [u.email, hash, u.role, u.name]);
          }

          // Seed vehicles
          console.log("Seeding vehicles...");
          db.run("INSERT INTO vehicles (reg_no, name, type, max_load_capacity, odometer, acquisition_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ["MH12QW1234", "Tata Prima 2825.K", "Heavy Truck", 15000, 45000, 4200000, "Available"]);
          db.run("INSERT INTO vehicles (reg_no, name, type, max_load_capacity, odometer, acquisition_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ["DL01AB9999", "Mahindra Bolero Pik-Up", "Pickup Van", 1500, 120000, 950000, "Available"]);
          db.run("INSERT INTO vehicles (reg_no, name, type, max_load_capacity, odometer, acquisition_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ["KA03XY5678", "Eicher Pro 3019", "Medium Truck", 10000, 85000, 2800000, "In Shop"]);
          db.run("INSERT INTO vehicles (reg_no, name, type, max_load_capacity, odometer, acquisition_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ["HR55ZZ1111", "Ashok Leyland 3520", "Heavy Truck", 20000, 310000, 3800000, "Retired"]);

          // Seed drivers
          console.log("Seeding drivers...");
          db.run("INSERT INTO drivers (name, license_no, license_category, license_expiry_date, contact_no, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ["John Doe", "DL-1420180099", "Heavy Transport", "2028-12-31", "+91 9876543210", 94.5, "Available"]);
          db.run("INSERT INTO drivers (name, license_no, license_category, license_expiry_date, contact_no, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ["Jane Smith", "MH-1220150033", "Light Commercial", "2027-05-15", "+91 9123456789", 88.0, "Available"]);
          db.run("INSERT INTO drivers (name, license_no, license_category, license_expiry_date, contact_no, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ["Robert Expired", "KA-0320140022", "Heavy Transport", "2026-06-01", "+91 9000000001", 75.0, "Available"]); // License Expired
          db.run("INSERT INTO drivers (name, license_no, license_category, license_expiry_date, contact_no, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ["Sam Suspended", "HR-5520190044", "Heavy Transport", "2029-08-20", "+91 9000000002", 45.0, "Suspended"]); // Suspended

          // Seed some maintenance records
          console.log("Seeding maintenance records...");
          db.run("INSERT INTO maintenance_records (vehicle_id, service_type, cost, date, status) VALUES (?, ?, ?, ?, ?)",
            [3, "Engine Tuning & Oil Change", 12500, "2026-07-10", "Open"]);
          db.run("INSERT INTO maintenance_records (vehicle_id, service_type, cost, date, status) VALUES (?, ?, ?, ?, ?)",
            [1, "Brake Pad Replacement", 8000, "2026-06-15", "Closed"]);

          // Seed fuel logs
          console.log("Seeding fuel logs...");
          db.run("INSERT INTO fuel_logs (vehicle_id, date, liters, cost) VALUES (?, ?, ?, ?)",
            [1, "2026-07-01", 120, 11400]);
          db.run("INSERT INTO fuel_logs (vehicle_id, date, liters, cost) VALUES (?, ?, ?, ?)",
            [2, "2026-07-05", 50, 4750]);

          // Seed expenses
          console.log("Seeding expenses...");
          db.run("INSERT INTO expenses (vehicle_id, toll, other, maintenance_cost, total) VALUES (?, ?, ?, ?, ?)",
            [1, 1200, 300, 8000, 9500]);
        });
      }
    });
  });
}

module.exports = {
  db,
  runQuery,
  allQuery,
  getQuery,
  initDb
};
