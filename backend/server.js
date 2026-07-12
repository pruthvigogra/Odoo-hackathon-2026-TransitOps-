const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, initDb, runQuery, allQuery, getQuery } = require('./db');

const app = express();
const JWT_SECRET = 'transitops-super-secret-key';

app.use(cors());
app.use(express.json());

// Initialize Database on startup
initDb();

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ---------------- AUTH ROUTES ----------------

// Account lock state tracker (Hackathon Requirement 🟡)
const loginAttempts = {};

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Please provide email, password, and role' });
  }

  // Lock account after 5 failed attempts
  if (loginAttempts[email] >= 5) {
    return res.status(423).json({ error: 'Account locked due to 5 failed login attempts.' });
  }

  try {
    const user = await getQuery("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.role !== role) {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;
      return res.status(401).json({ error: 'Role mismatch' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Reset login attempts on success
    loginAttempts[email] = 0;

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- VEHICLES ----------------

app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await allQuery("SELECT * FROM vehicles");
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  const { reg_no, name, type, max_load_capacity, odometer, acquisition_cost } = req.body;
  if (!reg_no || !name || !type || !max_load_capacity || !odometer || !acquisition_cost) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Unique check
    const existing = await getQuery("SELECT * FROM vehicles WHERE reg_no = ?", [reg_no]);
    if (existing) {
      return res.status(400).json({ error: `Registration No. ${reg_no} is already registered.` });
    }

    await runQuery(
      `INSERT INTO vehicles (reg_no, name, type, max_load_capacity, odometer, acquisition_cost, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'Available')`,
      [reg_no, name, type, max_load_capacity, odometer, acquisition_cost]
    );
    res.status(201).json({ message: 'Vehicle added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles/:id/retire', async (req, res) => {
  try {
    await runQuery("UPDATE vehicles SET status = 'Retired' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Vehicle retired successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- DRIVERS ----------------

app.get('/api/drivers', async (req, res) => {
  try {
    const drivers = await allQuery("SELECT * FROM drivers");
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drivers', async (req, res) => {
  const { name, license_no, license_category, license_expiry_date, contact_no } = req.body;
  if (!name || !license_no || !license_category || !license_expiry_date || !contact_no) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    await runQuery(
      `INSERT INTO drivers (name, license_no, license_category, license_expiry_date, contact_no, safety_score, status) 
       VALUES (?, ?, ?, ?, ?, 100, 'Available')`,
      [name, license_no, license_category, license_expiry_date, contact_no]
    );
    res.status(201).json({ message: 'Driver added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drivers/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    await runQuery("UPDATE drivers SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ message: `Driver status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drivers/:id/safety', async (req, res) => {
  const { safety_score } = req.body;
  try {
    await runQuery("UPDATE drivers SET safety_score = ? WHERE id = ?", [safety_score, req.params.id]);
    res.json({ message: `Safety score updated to ${safety_score}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- TRIPS ----------------

app.get('/api/trips', async (req, res) => {
  try {
    const trips = await allQuery(`
      SELECT t.*, v.reg_no as vehicle_reg, v.name as vehicle_name, v.max_load_capacity, d.name as driver_name 
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
    `);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips', async (req, res) => {
  const { source, destination, cargo_weight, planned_distance, vehicle_id, driver_id } = req.body;
  try {
    await runQuery(
      `INSERT INTO trips (source, destination, cargo_weight, planned_distance, vehicle_id, driver_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Draft')`,
      [source, destination, cargo_weight, planned_distance, vehicle_id, driver_id]
    );
    res.status(201).json({ message: 'Trip created as Draft' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips/:id/dispatch', async (req, res) => {
  const tripId = req.params.id;
  try {
    const trip = await getQuery("SELECT * FROM trips WHERE id = ?", [tripId]);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const vehicle = await getQuery("SELECT * FROM vehicles WHERE id = ?", [trip.vehicle_id]);
    const driver = await getQuery("SELECT * FROM drivers WHERE id = ?", [trip.driver_id]);

    if (!vehicle || vehicle.status !== 'Available') {
      return res.status(400).json({ error: 'Assigned vehicle is not Available.' });
    }

    // License expiry date evaluation compared to current date
    const today = new Date().toISOString().split('T')[0];
    const isLicenseExpired = driver.license_expiry_date < today;

    if (!driver || driver.status === 'Suspended' || driver.status !== 'Available' || isLicenseExpired) {
      return res.status(400).json({ error: 'Assigned driver is not Available, is Suspended, or has an expired license.' });
    }

    if (trip.cargo_weight > vehicle.max_load_capacity) {
      return res.status(400).json({ error: `Cargo weight (${trip.cargo_weight} kg) exceeds vehicle maximum capacity (${vehicle.max_load_capacity} kg).` });
    }

    // Begin Dispatch
    await runQuery("UPDATE trips SET status = 'Dispatched' WHERE id = ?", [tripId]);
    await runQuery("UPDATE vehicles SET status = 'On Trip' WHERE id = ?", [trip.vehicle_id]);
    await runQuery("UPDATE drivers SET status = 'On Trip' WHERE id = ?", [trip.driver_id]);

    res.json({ message: 'Trip successfully dispatched' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips/:id/complete', async (req, res) => {
  const tripId = req.params.id;
  const { final_odometer, fuel_consumed, revenue, toll_expense, other_expense } = req.body;

  try {
    const trip = await getQuery("SELECT * FROM trips WHERE id = ?", [tripId]);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const vehicle = await getQuery("SELECT * FROM vehicles WHERE id = ?", [trip.vehicle_id]);
    if (final_odometer <= vehicle.odometer) {
      return res.status(400).json({ error: `Final odometer must be greater than starting odometer (${vehicle.odometer} km).` });
    }

    // Calculate fuel cost (mock rate at $95 per liter / currency unit)
    const fuelCost = parseFloat(fuel_consumed) * 95;
    const toll = parseFloat(toll_expense) || 0;
    const other = parseFloat(other_expense) || 0;
    const totalExpense = fuelCost + toll + other;

    // Database writes in sequence
    await runQuery(
      `UPDATE trips SET status = 'Completed', final_odometer = ?, fuel_consumed = ?, revenue = ? WHERE id = ?`,
      [final_odometer, fuel_consumed, revenue, tripId]
    );

    // Revert statuses to Available
    await runQuery("UPDATE vehicles SET status = 'Available', odometer = ? WHERE id = ?", [final_odometer, trip.vehicle_id]);
    await runQuery("UPDATE drivers SET status = 'Available' WHERE id = ?", [trip.driver_id]);

    // Insert Fuel Log
    const today = new Date().toISOString().split('T')[0];
    await runQuery(
      `INSERT INTO fuel_logs (vehicle_id, date, liters, cost) VALUES (?, ?, ?, ?)`,
      [trip.vehicle_id, today, fuel_consumed, fuelCost]
    );

    // Insert Expense Log
    await runQuery(
      `INSERT INTO expenses (trip_id, vehicle_id, toll, other, total) VALUES (?, ?, ?, ?, ?)`,
      [tripId, trip.vehicle_id, toll, other, totalExpense]
    );

    res.json({ message: 'Trip successfully completed and expenses logged.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips/:id/cancel', async (req, res) => {
  const tripId = req.params.id;
  try {
    const trip = await getQuery("SELECT * FROM trips WHERE id = ?", [tripId]);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    await runQuery("UPDATE trips SET status = 'Cancelled' WHERE id = ?", [tripId]);
    await runQuery("UPDATE vehicles SET status = 'Available' WHERE id = ?", [trip.vehicle_id]);
    await runQuery("UPDATE drivers SET status = 'Available' WHERE id = ?", [trip.driver_id]);

    res.json({ message: 'Trip cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- MAINTENANCE ----------------

app.get('/api/maintenance', async (req, res) => {
  try {
    const records = await allQuery(`
      SELECT m.*, v.reg_no as vehicle_reg, v.name as vehicle_name 
      FROM maintenance_records m
      JOIN vehicles v ON m.vehicle_id = v.id
    `);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/maintenance', async (req, res) => {
  const { vehicle_id, service_type, cost, date } = req.body;
  try {
    // Check vehicle status
    const vehicle = await getQuery("SELECT * FROM vehicles WHERE id = ?", [vehicle_id]);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Set record
    await runQuery(
      `INSERT INTO maintenance_records (vehicle_id, service_type, cost, date, status) 
       VALUES (?, ?, ?, ?, 'Open')`,
      [vehicle_id, service_type, cost, date]
    );

    // Automatically set vehicle status to In Shop
    await runQuery("UPDATE vehicles SET status = 'In Shop' WHERE id = ?", [vehicle_id]);

    res.status(201).json({ message: 'Maintenance record logged and vehicle set In Shop' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/maintenance/:id/close', async (req, res) => {
  const maintenanceId = req.params.id;
  try {
    const record = await getQuery("SELECT * FROM maintenance_records WHERE id = ?", [maintenanceId]);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await runQuery("UPDATE maintenance_records SET status = 'Closed' WHERE id = ?", [maintenanceId]);

    // Check vehicle status (do not set to Available if it was retired)
    const vehicle = await getQuery("SELECT * FROM vehicles WHERE id = ?", [record.vehicle_id]);
    if (vehicle && vehicle.status !== 'Retired') {
      await runQuery("UPDATE vehicles SET status = 'Available' WHERE id = ?", [record.vehicle_id]);
    }

    // Link/Sync to expenses table (as operational cost maintenance)
    await runQuery(
      `INSERT INTO expenses (vehicle_id, toll, other, maintenance_cost, total) VALUES (?, 0, 0, ?, ?)`,
      [record.vehicle_id, record.cost, record.cost]
    );

    res.json({ message: 'Maintenance closed and vehicle returned to Available status.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- FUEL & EXPENSES ----------------

app.get('/api/fuel', async (req, res) => {
  try {
    const fuel = await allQuery(`
      SELECT f.*, v.reg_no as vehicle_reg, v.name as vehicle_name 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
    `);
    res.json(fuel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fuel', async (req, res) => {
  const { vehicle_id, date, liters, cost } = req.body;
  try {
    await runQuery(
      `INSERT INTO fuel_logs (vehicle_id, date, liters, cost) VALUES (?, ?, ?, ?)`,
      [vehicle_id, date, liters, cost]
    );
    // Log expense total
    await runQuery(
      `INSERT INTO expenses (vehicle_id, toll, other, total) VALUES (?, 0, 0, ?)`,
      [vehicle_id, cost]
    );
    res.status(201).json({ message: 'Fuel log saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await allQuery(`
      SELECT e.*, v.reg_no as vehicle_reg, v.name as vehicle_name, t.source, t.destination
      FROM expenses e
      JOIN vehicles v ON e.vehicle_id = v.id
      LEFT JOIN trips t ON e.trip_id = t.id
    `);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { vehicle_id, trip_id, toll, other } = req.body;
  const total = (parseFloat(toll) || 0) + (parseFloat(other) || 0);
  try {
    await runQuery(
      `INSERT INTO expenses (vehicle_id, trip_id, toll, other, total) VALUES (?, ?, ?, ?, ?)`,
      [vehicle_id, trip_id || null, toll || 0, other || 0, total]
    );
    res.status(201).json({ message: 'Expense added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- REPORTS & ANALYTICS ----------------

app.get('/api/reports/analytics', async (req, res) => {
  try {
    const vehicles = await allQuery("SELECT * FROM vehicles");
    const trips = await allQuery("SELECT * FROM trips");
    const fuelLogs = await allQuery("SELECT * FROM fuel_logs");
    const maintenance = await allQuery("SELECT * FROM maintenance_records");
    const expenses = await allQuery("SELECT * FROM expenses");

    // KPIs
    const activeVehicles = vehicles.filter(v => v.status === 'On Trip').length;
    const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'In Shop').length;
    const totalVehicles = vehicles.filter(v => v.status !== 'Retired').length;

    const fleetUtilization = totalVehicles > 0 ? ((activeVehicles / totalVehicles) * 100).toFixed(1) : 0;

    // Fuel Efficiency = Total Odometer Distance / Total Fuel Liters
    const totalCompletedTripsDist = trips
      .filter(t => t.status === 'Completed')
      .reduce((sum, t) => sum + t.planned_distance, 0);

    const totalFuelLiters = fuelLogs.reduce((sum, f) => sum + f.liters, 0);
    const fuelEfficiency = totalFuelLiters > 0 ? (totalCompletedTripsDist / totalFuelLiters).toFixed(2) : 0;

    // Operational Cost = Fuel + Maintenance
    const totalFuelCost = fuelLogs.reduce((sum, f) => sum + f.cost, 0);
    const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + m.cost, 0);
    const totalOpCost = totalFuelCost + totalMaintenanceCost;

    // Vehicle ROI calculations
    // Formula: ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
    const vehicleAnalyticsList = vehicles.map(v => {
      // Find fuel consumed
      const vFuelCost = fuelLogs.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + f.cost, 0);
      // Find maintenance cost
      const vMaintCost = maintenance.filter(m => m.vehicle_id === v.id).reduce((sum, m) => sum + m.cost, 0);
      // Total operational cost
      const vOpCost = vFuelCost + vMaintCost;
      // Revenue
      const vRevenue = trips.filter(t => t.vehicle_id === v.id && t.status === 'Completed').reduce((sum, t) => sum + (t.revenue || 0), 0);
      // ROI
      const roi = v.acquisition_cost > 0 ? (((vRevenue - vOpCost) / v.acquisition_cost) * 100).toFixed(2) : 0;

      return {
        id: v.id,
        reg_no: v.reg_no,
        name: v.name,
        operational_cost: vOpCost,
        revenue: vRevenue,
        acquisition_cost: v.acquisition_cost,
        roi: parseFloat(roi)
      };
    });

    // Top Costliest Vehicles
    const topCostliestVehicles = [...vehicleAnalyticsList]
      .sort((a, b) => b.operational_cost - a.operational_cost)
      .slice(0, 5);

    // Revenue per month (Mock data aligned with seeded logs and new entries)
    const monthlyRevenue = [
      { month: 'May', Revenue: 45000 },
      { month: 'Jun', Revenue: 82000 },
      { month: 'Jul', Revenue: trips.filter(t => t.status === 'Completed').reduce((sum, t) => sum + (t.revenue || 0), 0) + 120000 }
    ];

    res.json({
      kpis: {
        activeVehicles,
        availableVehicles,
        maintenanceVehicles,
        fleetUtilization,
        fuelEfficiency,
        totalOpCost,
        totalRevenue: trips.filter(t => t.status === 'Completed').reduce((sum, t) => sum + (t.revenue || 0), 0)
      },
      topCostliestVehicles,
      monthlyRevenue,
      vehicleAnalyticsList
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`TransitOps Backend Server running on port ${PORT}`);
});
