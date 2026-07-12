import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const isPostgres = !!process.env.DATABASE_URL;
let pgPool: Pool | null = null;
let sqliteDb: sqlite3.Database | null = null;

// Initialize Database connection
export function initDb() {
  if (isPostgres) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    console.log('Database: Connected to PostgreSQL');
  } else {
    const dbPath = path.resolve(__dirname, '../../fleet.db');
    sqliteDb = new sqlite3.Database(dbPath);
    console.log(`Database: Connected to SQLite at ${dbPath}`);
  }
}

// Unified Query Function
// Adapts pg-style $1, $2 params to SQLite-style ? if running on SQLite
export function query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[] }> {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      pgPool!.query(sql, params, (err, res) => {
        if (err) return reject(err);
        resolve({ rows: res.rows });
      });
    } else {
      // Translate $1, $2 placeholders to ? for sqlite
      const sqliteSql = sql.replace(/\$\d+/g, '?');
      
      // Determine if it is a write query or read query
      const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        sqliteDb!.all(sqliteSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows: (rows || []) as T[] });
        });
      } else {
        sqliteDb!.run(sqliteSql, params, function (err) {
          if (err) return reject(err);
          // Return inserted id or changes if needed (wrapped in rows mock)
          resolve({ rows: [{ id: this.lastID, changes: this.changes }] as any });
        });
      }
    }
  });
}

// Run schema setup and seed data
export async function setupDatabase() {
  const createUserTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `;

  const createDriversTable = `
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      license_number TEXT NOT NULL,
      license_expiry TEXT NOT NULL,
      status TEXT NOT NULL, -- Available, Driving, Resting, On Leave
      rating REAL DEFAULT 5.0,
      total_trips INTEGER DEFAULT 0,
      total_distance REAL DEFAULT 0.0,
      accident_history INTEGER DEFAULT 0
    );
  `;

  const createVehiclesTable = `
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      registration_number TEXT UNIQUE NOT NULL,
      manufacturer TEXT NOT NULL,
      model TEXT NOT NULL,
      manufacturing_year INTEGER NOT NULL,
      type TEXT NOT NULL,
      capacity REAL NOT NULL,
      acquisition_date TEXT NOT NULL,
      acquisition_cost REAL NOT NULL,
      odometer REAL NOT NULL,
      gps_device_id TEXT UNIQUE NOT NULL,
      fastag_id TEXT UNIQUE NOT NULL,
      fuel_type TEXT NOT NULL,
      mileage REAL NOT NULL,
      insurance_expiry TEXT NOT NULL,
      permit_expiry TEXT NOT NULL,
      puc_expiry TEXT NOT NULL,
      status TEXT NOT NULL, -- Available, On Trip, Idle, Maintenance, Out of Service
      current_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
      current_route_id INTEGER REFERENCES routes(id) ON DELETE SET NULL,
      lat REAL,
      lng REAL,
      speed REAL DEFAULT 0.0,
      heading REAL DEFAULT 0.0,
      last_ping TEXT
    );
  `;

  const createRoutesTable = `
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      distance REAL NOT NULL,
      estimated_time INTEGER NOT NULL, -- minutes
      geofence_buffer REAL DEFAULT 100.0 -- meters
    );
  `;

  const createRouteCheckpointsTable = `
    CREATE TABLE IF NOT EXISTS route_checkpoints (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      sequence INTEGER NOT NULL
    );
  `;

  const createTollPlazasTable = `
    CREATE TABLE IF NOT EXISTS toll_plazas (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      fastag_plaza_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      expected_arrival_minutes INTEGER NOT NULL
    );
  `;

  const createTripsTable = `
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
      status TEXT NOT NULL, -- Scheduled, Active, Completed, Cancelled
      start_time TEXT,
      end_time TEXT,
      current_toll_sequence INTEGER DEFAULT 0,
      current_toll_status TEXT DEFAULT 'Pending'
    );
  `;

  const createTollClearanceLogTable = `
    CREATE TABLE IF NOT EXISTS toll_clearance_log (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
      toll_plaza_id INTEGER REFERENCES toll_plazas(id) ON DELETE CASCADE,
      status TEXT NOT NULL, -- Cleared, Skipped, Out-of-sequence, Pending
      expected_arrival TEXT,
      actual_crossing_time TEXT,
      gps_lat REAL,
      gps_lng REAL,
      time_deviation INTEGER -- deviation in minutes
    );
  `;

  const createAlertsTable = `
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
      vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- Route Deviation, Missed Toll Plaza, Unauthorized Stop, Overspeed, GPS Offline, Driver SOS
      severity TEXT NOT NULL, -- Low, Medium, High, Critical
      message TEXT NOT NULL,
      gps_lat REAL,
      gps_lng REAL,
      deviation_distance REAL,
      resolved_at TEXT,
      created_at TEXT NOT NULL
    );
  `;

  const createGpsPingsTable = `
    CREATE TABLE IF NOT EXISTS gps_pings (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
      vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      speed REAL NOT NULL,
      heading REAL NOT NULL,
      timestamp TEXT NOT NULL
    );
  `;

  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER DEFAULT 0, -- 0 = false, 1 = true
      created_at TEXT NOT NULL
    );
  `;

  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      fleet_idle_timeout_min INTEGER DEFAULT 15,
      route_deviation_buffer_meters REAL DEFAULT 150.0,
      toll_tolerance_window_min INTEGER DEFAULT 20
    );
  `;

  // Execute table creations
  const tables = [
    createUserTable,
    createDriversTable,
    createRoutesTable,
    createRouteCheckpointsTable,
    createTollPlazasTable,
    createVehiclesTable,
    createTripsTable,
    createTollClearanceLogTable,
    createAlertsTable,
    createGpsPingsTable,
    createNotificationsTable,
    createSettingsTable
  ];

  for (const tableSql of tables) {
    await query(tableSql);
  }

  // Create indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_gps_pings_trip ON gps_pings(trip_id, timestamp);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_toll_clearance_trip ON toll_clearance_log(trip_id);`);

  // Seed default settings if not exists
  const settingsCount = await query(`SELECT COUNT(*) as count FROM settings`);
  if ((settingsCount.rows[0] as any).count === 0) {
    await query(`INSERT INTO settings (fleet_idle_timeout_min, route_deviation_buffer_meters, toll_tolerance_window_min) VALUES (15, 150.0, 20)`);
  }

  // Seed admin user
  const userCount = await query(`SELECT COUNT(*) as count FROM users`);
  if ((userCount.rows[0] as any).count === 0) {
    const hashedPw = await bcrypt.hash('admin123', 10);
    await query(`INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)`, [
      'admin@transitops.com',
      hashedPw,
      'Fleet Administrator',
      'Admin'
    ]);
    await query(`INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)`, [
      'manager@transitops.com',
      hashedPw,
      'Fleet Manager',
      'Fleet Manager'
    ]);
  }

  // Seed drivers
  const driverCount = await query(`SELECT COUNT(*) as count FROM drivers`);
  if ((driverCount.rows[0] as any).count === 0) {
    const drivers = [
      ['Amit Sharma', '+91 98765 43210', 'amit.sharma@transitops.com', 'DL-1420200012345', '2030-05-15', 'Available', 4.8, 120, 24000.5, 0],
      ['Rajesh Kumar', '+91 98765 43211', 'rajesh.kumar@transitops.com', 'HR-2620180054321', '2028-11-20', 'Available', 4.5, 95, 19500.0, 0],
      ['Sanjay Singh', '+91 98765 43212', 'sanjay.singh@transitops.com', 'MH-1220190098765', '2026-07-28', 'Available', 4.9, 150, 31000.2, 0], // Driver expiring license soon
      ['Vikram Patel', '+91 98765 43213', 'vikram.patel@transitops.com', 'GJ-0120210087654', '2029-03-10', 'Available', 4.2, 80, 15400.8, 1]
    ];
    for (const d of drivers) {
      await query(`
        INSERT INTO drivers (name, phone, email, license_number, license_expiry, status, rating, total_trips, total_distance, accident_history)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, d);
    }
  }

  // Seed routes
  const routeCount = await query(`SELECT COUNT(*) as count FROM routes`);
  if ((routeCount.rows[0] as any).count === 0) {
    // Delhi to Mumbai Route (Simplified coordinates)
    // Delhi: 28.6139, 77.2090
    // Jaipur: 26.9124, 75.7873
    // Ahmedabad: 23.0225, 72.5714
    // Mumbai: 19.0760, 72.8777
    const route1Id = (await query(`
      INSERT INTO routes (name, source, destination, distance, estimated_time, geofence_buffer)
      VALUES ('Delhi - Mumbai Corridor', 'Delhi NCR', 'Mumbai JNPT', 1415.0, 1440, 200.0)
    `)).rows[0].id || 1;

    // Checkpoints for Route 1
    const checkpoints1 = [
      ['Delhi Exit Geofence', 28.5200, 77.1500, 1],
      ['Jaipur Bypass Checkpoint', 26.9500, 75.8500, 2],
      ['Udaipur Transit Station', 24.5800, 73.7100, 3],
      ['Ahmedabad Outer Ring', 23.0500, 72.6500, 4],
      ['Surat Security Plaza', 21.1700, 72.8300, 5],
      ['Mumbai Entrance Gate', 19.1500, 72.9500, 6]
    ];
    for (const cp of checkpoints1) {
      await query(`INSERT INTO route_checkpoints (route_id, name, lat, lng, sequence) VALUES ($1, $2, $3, $4, $5)`, [
        route1Id, ...cp
      ]);
    }

    // Toll Plazas for Route 1
    const tolls1 = [
      ['Gurugram Kherki Daula Toll', 28.3845, 76.9744, 'FASTAG-PLZ-092', 1, 45],
      ['Shahpura Toll Plaza', 27.3912, 75.9811, 'FASTAG-PLZ-184', 2, 180],
      ['Kishangarh Toll Plaza', 26.6110, 74.9215, 'FASTAG-PLZ-049', 3, 300],
      ['Shamlaji Toll Plaza', 23.8501, 73.3812, 'FASTAG-PLZ-312', 4, 600],
      ['Vadodara Expressway Toll', 22.3415, 73.2045, 'FASTAG-PLZ-720', 5, 840],
      ['Charoti Toll Plaza', 20.0102, 72.9015, 'FASTAG-PLZ-441', 6, 1140]
    ];
    for (const t of tolls1) {
      await query(`INSERT INTO toll_plazas (route_id, name, lat, lng, fastag_plaza_id, sequence, expected_arrival_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        route1Id, ...t
      ]);
    }

    // Route 2: Mumbai to Pune Expressway
    // Mumbai: 19.0760, 72.8777
    // Lonavala: 18.7508, 73.4042
    // Pune: 18.5204, 73.8567
    const route2Id = (await query(`
      INSERT INTO routes (name, source, destination, distance, estimated_time, geofence_buffer)
      VALUES ('Mumbai - Pune Expressway Link', 'Mumbai Kalamboli', 'Pune Wakad', 94.5, 120, 150.0)
    `)).rows[0].id || 2;

    const checkpoints2 = [
      ['Kalamboli Entry Geofence', 19.0200, 73.1000, 1],
      ['Khalapur Food Mall Checkpoint', 18.8200, 73.3000, 2],
      ['Talegaon Exit Checkpoint', 18.7200, 73.6800, 3]
    ];
    for (const cp of checkpoints2) {
      await query(`INSERT INTO route_checkpoints (route_id, name, lat, lng, sequence) VALUES ($1, $2, $3, $4, $5)`, [
        route2Id, ...cp
      ]);
    }

    const tolls2 = [
      ['Khalapur Toll Plaza', 18.8354, 73.2921, 'FASTAG-PLZ-211', 1, 30],
      ['Talegaon Toll Plaza', 18.7302, 73.6645, 'FASTAG-PLZ-329', 2, 85]
    ];
    for (const t of tolls2) {
      await query(`INSERT INTO toll_plazas (route_id, name, lat, lng, fastag_plaza_id, sequence, expected_arrival_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        route2Id, ...t
      ]);
    }
  }

  // Seed vehicles
  const vehicleCount = await query(`SELECT COUNT(*) as count FROM vehicles`);
  if ((vehicleCount.rows[0] as any).count === 0) {
    const today = new Date();
    const expirySoon = new Date();
    expirySoon.setDate(today.getDate() + 15); // Expiry in 15 days (triggers warning)
    const expiryFar = new Date();
    expiryFar.setDate(today.getDate() + 300);

    const vehicles = [
      ['DL-01-MA-1234', 'Tata Motors', 'Prima 4028.S', 2021, 'HCV Trailer', 40.0, '2021-06-12', 3800000.0, 124500.5, 'GPS-TATA-99123', 'FTAG-TATA-001', 'Diesel', 3.5, expirySoon.toISOString().split('T')[0], expiryFar.toISOString().split('T')[0], expiryFar.toISOString().split('T')[0], 'Available', 1, null, 28.6139, 77.2090, 0, 0, today.toISOString()],
      ['MH-12-PQ-5678', 'Ashok Leyland', 'U-3518', 2022, 'HCV Tipper', 35.0, '2022-03-20', 3400000.0, 85200.0, 'GPS-ALEY-88456', 'FTAG-ALEY-002', 'Diesel', 4.0, expiryFar.toISOString().split('T')[0], expirySoon.toISOString().split('T')[0], expiryFar.toISOString().split('T')[0], 'Available', 2, null, 19.0760, 72.8777, 0, 0, today.toISOString()], // Permit expiring soon
      ['GJ-01-ZX-9876', 'BharatBenz', '2823R', 2020, 'Rigid Truck', 28.0, '2020-11-05', 2900000.0, 164200.8, 'GPS-BENZ-77345', 'FTAG-BENZ-003', 'Diesel', 4.5, expiryFar.toISOString().split('T')[0], expiryFar.toISOString().split('T')[0], expirySoon.toISOString().split('T')[0], 'Available', 3, null, 23.0225, 72.5714, 0, 0, today.toISOString()], // PUC expiring soon
      ['HR-55-AB-4321', 'Mahindra', 'Blazo X 35', 2023, 'HCV Cargo', 35.0, '2023-01-15', 3600000.0, 48200.3, 'GPS-MAH-55112', 'FTAG-MAH-004', 'Diesel', 3.8, expiryFar.toISOString().split('T')[0], expiryFar.toISOString().split('T')[0], expiryFar.toISOString().split('T')[0], 'Available', 4, null, 28.4595, 77.0266, 0, 0, today.toISOString()],
      ['MH-43-XY-9000', 'Eicher', 'Pro 6028', 2022, 'Medium Duty Truck', 15.0, '2022-08-10', 1800000.0, 95100.2, 'GPS-EICH-33441', 'FTAG-EICH-005', 'Diesel', 6.0, expiryFar.toISOString().split('T')[0], expiryFar.toISOString().split('T')[0], expiryFar.toISOString().split('T')[0], 'Available', null, null, 19.1030, 72.8800, 0, 0, today.toISOString()]
    ];
    for (const v of vehicles) {
      await query(`
        INSERT INTO vehicles (
          registration_number, manufacturer, model, manufacturing_year, type, capacity,
          acquisition_date, acquisition_cost, odometer, gps_device_id, fastag_id, fuel_type,
          mileage, insurance_expiry, permit_expiry, puc_expiry, status, current_driver_id,
          current_route_id, lat, lng, speed, heading, last_ping
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      `, v);
    }
  }
}
