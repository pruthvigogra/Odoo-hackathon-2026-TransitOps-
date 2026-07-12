import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as db from './db/db';
import * as engine from './services/verificationEngine';
import * as reporter from './services/reportGenerator';
import { ROUTE_1_COORDS, ROUTE_2_COORDS, interpolatePath, LatLng } from './services/simulatorData';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: '*', // For development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'transitops-super-secret-key-12345';

// --- Authentication Middleware ---
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    name: string;
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded as any;
    next();
  });
}

function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied: Unauthorized role' });
    }
    next();
  };
}

// --- Wire up Verification Engine Events to WebSockets & Notifications ---
engine.eventEmitter.on('ping', (data) => {
  io.emit('vehicle_update', data);
});

engine.eventEmitter.on('alert', async (data) => {
  // Broadcast alert
  io.emit('new_alert', data);

  // Persist alert as user notification
  try {
    // Notify all active managers/admins
    const users = await db.query(`SELECT id FROM users WHERE role IN ('Admin', 'Fleet Manager')`);
    for (const u of users.rows) {
      await db.query(`
        INSERT INTO notifications (user_id, message, type, read, created_at)
        VALUES ($1, $2, $3, 0, $4)
      `, [u.id, data.message, data.type, data.created_at]);
    }
    io.emit('notification_update');
  } catch (err) {
    console.error('Failed to create notification', err);
  }
});

engine.eventEmitter.on('toll_cleared', (data) => {
  io.emit('toll_update', data);
});

// --- API Endpoints ---

// 1. Auth Routes
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const userRes = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = userRes.rows[0];
    const isPwMatch = await bcrypt.compare(password, user.password);
    if (!isPwMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

app.post('/api/v1/auth/driver-login', async (req: Request, res: Response) => {
  const { identifier } = req.body;
  try {
    const term = String(identifier).trim().toLowerCase();
    const result = await db.query(`SELECT * FROM drivers WHERE CAST(id AS TEXT) = $1 OR LOWER(email) = $2 OR REPLACE(phone, ' ', '') = $3`, [term, term, term.replace(/[\s+]/g, '')]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Driver profile not found.' });
    }
    
    const driver = result.rows[0];
    const token = jwt.sign(
      { id: driver.id, email: driver.email, name: driver.name, role: 'Driver' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: { id: driver.id, email: driver.email, name: driver.name, role: 'Driver' }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/auth/driver-register', async (req: Request, res: Response) => {
  const d = req.body;
  try {
    const insertStr = `
      INSERT INTO drivers (name, phone, email, license_number, license_expiry, status, rating, accident_history)
      VALUES ($1, $2, $3, $4, $5, 'Available', 5.0, 0)
    `;
    const insertResult = await db.query(insertStr, [d.name, d.phone, d.email, d.license_number, d.license_expiry]);
    const newId = insertResult.rows[0].id;

    // Fetch the full row
    const driverRes = await db.query(`SELECT * FROM drivers WHERE id = $1`, [newId]);
    const driver = driverRes.rows[0];

    const token = jwt.sign(
      { id: driver.id, email: driver.email, name: driver.name, role: 'Driver' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      token,
      user: { id: driver.id, email: driver.email, name: driver.name, role: 'Driver' }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Vehicle CRUD Routes
app.get('/api/v1/vehicles', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT v.*, d.name as driver_name, r.name as route_name
      FROM vehicles v
      LEFT JOIN drivers d ON d.id = v.current_driver_id
      LEFT JOIN routes r ON r.id = v.current_route_id
      ORDER BY v.registration_number ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/vehicles', authenticateToken, requireRole(['Admin', 'Fleet Manager']), async (req: Request, res: Response) => {
  const v = req.body;
  try {
    const queryStr = `
      INSERT INTO vehicles (
        registration_number, manufacturer, model, manufacturing_year, type, capacity,
        acquisition_date, acquisition_cost, odometer, gps_device_id, fastag_id, fuel_type,
        mileage, insurance_expiry, permit_expiry, puc_expiry, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'Available')
    `;
    await db.query(queryStr, [
      v.registration_number, v.manufacturer, v.model, parseInt(v.manufacturing_year),
      v.type, parseFloat(v.capacity), v.acquisition_date, parseFloat(v.acquisition_cost),
      parseFloat(v.odometer), v.gps_device_id, v.fastag_id, v.fuel_type,
      parseFloat(v.mileage), v.insurance_expiry, v.permit_expiry, v.puc_expiry
    ]);
    res.status(201).json({ message: 'Vehicle created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/vehicles/:id', authenticateToken, requireRole(['Admin', 'Fleet Manager']), async (req: Request, res: Response) => {
  const v = req.body;
  const { id } = req.params;
  try {
    const queryStr = `
      UPDATE vehicles SET
        registration_number = $1, manufacturer = $2, model = $3, manufacturing_year = $4,
        type = $5, capacity = $6, acquisition_date = $7, acquisition_cost = $8,
        odometer = $9, gps_device_id = $10, fastag_id = $11, fuel_type = $12,
        mileage = $13, insurance_expiry = $14, permit_expiry = $15, puc_expiry = $16,
        status = $17, current_driver_id = $18
      WHERE id = $19
    `;
    await db.query(queryStr, [
      v.registration_number, v.manufacturer, v.model, parseInt(v.manufacturing_year),
      v.type, parseFloat(v.capacity), v.acquisition_date, parseFloat(v.acquisition_cost),
      parseFloat(v.odometer), v.gps_device_id, v.fastag_id, v.fuel_type,
      parseFloat(v.mileage), v.insurance_expiry, v.permit_expiry, v.puc_expiry,
      v.status, v.current_driver_id || null, id
    ]);
    res.json({ message: 'Vehicle updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/vehicles/:id', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM vehicles WHERE id = $1`, [id]);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Driver CRUD Routes
app.get('/api/v1/drivers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.query(`SELECT * FROM drivers ORDER BY name ASC`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/drivers', authenticateToken, requireRole(['Admin', 'Fleet Manager']), async (req: Request, res: Response) => {
  const d = req.body;
  try {
    const queryStr = `
      INSERT INTO drivers (name, phone, email, license_number, license_expiry, status, rating)
      VALUES ($1, $2, $3, $4, $5, 'Available', 5.0)
    `;
    await db.query(queryStr, [d.name, d.phone, d.email, d.license_number, d.license_expiry]);
    res.status(201).json({ message: 'Driver created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/drivers/:id', authenticateToken, requireRole(['Admin', 'Fleet Manager']), async (req: Request, res: Response) => {
  const d = req.body;
  const { id } = req.params;
  try {
    const queryStr = `
      UPDATE drivers SET
        name = $1, phone = $2, email = $3, license_number = $4,
        license_expiry = $5, status = $6, rating = $7, accident_history = $8
      WHERE id = $9
    `;
    await db.query(queryStr, [
      d.name, d.phone, d.email, d.license_number, d.license_expiry,
      d.status, parseFloat(d.rating), parseInt(d.accident_history || 0), id
    ]);
    res.json({ message: 'Driver updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/drivers/:id', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM drivers WHERE id = $1`, [id]);
    res.json({ message: 'Driver deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Safety Officer: status-only toggle (Suspend / Reactivate)
app.patch('/api/v1/drivers/:id/status', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Safety Officer']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !['Available', 'Suspended'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "Available" or "Suspended".' });
  }
  try {
    await db.query(`UPDATE drivers SET status = $1 WHERE id = $2`, [status, id]);
    res.json({ message: `Driver status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Route CRUD Routes
app.get('/api/v1/routes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.query(`SELECT * FROM routes ORDER BY name ASC`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/routes/:id/tolls', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT * FROM toll_plazas
      WHERE route_id = $1
      ORDER BY sequence ASC
    `, [id]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Trip Management Routes
app.get('/api/v1/trips', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT t.*, v.registration_number, d.name as driver_name, r.name as route_name
      FROM trips t
      JOIN vehicles v ON v.id = t.vehicle_id
      JOIN routes r ON r.id = t.route_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      ORDER BY t.id DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/trips/start', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Dispatcher']), async (req: Request, res: Response) => {
  const { vehicle_id, driver_id, route_id } = req.body;
  try {
    // 1. Create Trip
    const startTime = new Date().toISOString();
    const tripResult = await db.query(`
      INSERT INTO trips (vehicle_id, driver_id, route_id, status, start_time, current_toll_sequence, current_toll_status)
      VALUES ($1, $2, $3, 'Active', $4, 0, 'Pending')
    `, [vehicle_id, driver_id, route_id]);

    const tripId = tripResult.rows[0].id;

    // 2. Update Vehicle Status & Attach Route/Driver
    await db.query(`
      UPDATE vehicles
      SET status = 'On Trip', current_driver_id = $1, current_route_id = $2
      WHERE id = $3
    `, [driver_id, route_id, vehicle_id]);

    // 3. Update Driver Status
    await db.query(`UPDATE drivers SET status = 'Driving' WHERE id = $1`, [driver_id]);

    res.status(201).json({ id: tripId, message: 'Trip started successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/trips/:id/end', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Dispatcher']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fuel_consumed, fuel_cost, final_odometer } = req.body;
  try {
    const endTime = new Date().toISOString();
    const tripRes = await db.query(`SELECT * FROM trips WHERE id = $1`, [id]);
    if (tripRes.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    const trip = tripRes.rows[0];

    // Update Trip to Completed
    await db.query(`
      UPDATE trips
      SET status = 'Completed', end_time = $1
      WHERE id = $2
    `, [endTime, id]);

    // Update Vehicle to Available and set new odometer if provided
    if (final_odometer) {
      await db.query(`
        UPDATE vehicles
        SET status = 'Available', current_route_id = NULL, current_driver_id = NULL, odometer = $1
        WHERE id = $2
      `, [parseFloat(final_odometer), trip.vehicle_id]);
    } else {
      await db.query(`
        UPDATE vehicles
        SET status = 'Available', current_route_id = NULL, current_driver_id = NULL
        WHERE id = $1
      `, [trip.vehicle_id]);
    }

    // Insert Fuel Log if provided
    if (fuel_consumed && fuel_cost) {
      await db.query(`INSERT INTO fuel_logs (vehicle_id, date, liters, cost) VALUES ($1, $2, $3, $4)`, [
        trip.vehicle_id,
        new Date().toISOString().split('T')[0],
        parseFloat(fuel_consumed),
        parseFloat(fuel_cost)
      ]);
    }

    // Free Driver
    await db.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [trip.driver_id]);

    // Resolve any active alerts for this trip
    await db.query(`
      UPDATE alerts
      SET resolved_at = $1
      WHERE trip_id = $2 AND resolved_at IS NULL
    `, [endTime, id]);

    res.json({ message: 'Trip completed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trip specific data
app.get('/api/v1/trips/:id/tolls', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT tcl.*, tp.name as toll_name, tp.sequence
      FROM toll_clearance_log tcl
      JOIN toll_plazas tp ON tp.id = tcl.toll_plaza_id
      WHERE tcl.trip_id = $1
      ORDER BY tp.sequence ASC
    `, [id]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/trips/:id/deviations', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.query(`SELECT * FROM alerts WHERE trip_id = $1 ORDER BY created_at DESC`, [id]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Alerts & Notifications Routes
app.get('/api/v1/alerts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT a.*, v.registration_number, d.name as driver_name
      FROM alerts a
      JOIN vehicles v ON v.id = a.vehicle_id
      LEFT JOIN trips t ON t.id = a.trip_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/alerts/:id/resolve', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Dispatcher']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const resolvedTime = new Date().toISOString();
    await db.query(`UPDATE alerts SET resolved_at = $1 WHERE id = $2`, [resolvedTime, id]);
    res.json({ message: 'Alert resolved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/notifications', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/notifications/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await db.query(`UPDATE notifications SET read = 1 WHERE user_id = $1`, [userId]);
    res.json({ message: 'Notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Settings Config
app.get('/api/v1/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.query(`SELECT * FROM settings LIMIT 1`);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/settings', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response) => {
  const s = req.body;
  try {
    await db.query(`
      UPDATE settings
      SET fleet_idle_timeout_min = $1, route_deviation_buffer_meters = $2, toll_tolerance_window_min = $3
      WHERE id = 1
    `, [parseInt(s.fleet_idle_timeout_min), parseFloat(s.route_deviation_buffer_meters), parseInt(s.toll_tolerance_window_min)]);
    res.json({ message: 'Settings updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Report Export Routes
app.get('/api/v1/reports/:type/export', async (req: Request, res: Response) => {
  const { type } = req.params;
  const { format, startDate, endDate } = req.query;

  if (!format || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing parameters format, startDate, or endDate' });
  }

  const options = {
    type,
    startDate: String(startDate),
    endDate: String(endDate)
  };

  try {
    if (format === 'pdf') {
      const buffer = await reporter.generatePdfReport(options);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=transitops-${type}-report.pdf`);
      res.send(buffer);
    } else if (format === 'xlsx') {
      const buffer = await reporter.generateExcelReport(options);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=transitops-${type}-report.xlsx`);
      res.send(buffer);
    } else if (format === 'csv') {
      const csvStr = await reporter.generateCsvReport(options);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=transitops-${type}-report.csv`);
      res.send(csvStr);
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Maintenance Routes
app.get('/api/v1/maintenance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.query(`SELECT * FROM maintenance ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/maintenance', authenticateToken, requireRole(['Admin', 'Fleet Manager']), async (req: Request, res: Response) => {
  const m = req.body;
  try {
    const query = `INSERT INTO maintenance (vehicle_id, description, cost, date, status) VALUES ($1, $2, $3, $4, $5)`;
    await db.query(query, [m.vehicle_id, m.description, parseFloat(m.cost), m.date, m.status || 'Pending']);
    res.status(201).json({ message: 'Maintenance record created' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/maintenance/:id', authenticateToken, requireRole(['Admin', 'Fleet Manager']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const m = req.body;
  try {
    const query = `UPDATE maintenance SET vehicle_id=$1, description=$2, cost=$3, date=$4, status=$5 WHERE id=$6`;
    await db.query(query, [m.vehicle_id, m.description, parseFloat(m.cost), m.date, m.status, id]);
    res.json({ message: 'Maintenance record updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/maintenance/:id', authenticateToken, requireRole(['Admin', 'Fleet Manager']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM maintenance WHERE id=$1`, [id]);
    res.json({ message: 'Maintenance record deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Fuel Log Routes
app.get('/api/v1/fuel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.query(`SELECT * FROM fuel_logs ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/fuel', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Financial Analyst', 'Local Analyst', 'Senior Analyst']), async (req: Request, res: Response) => {
  const f = req.body;
  try {
    const query = `INSERT INTO fuel_logs (vehicle_id, amount, date, odometer, price_per_liter, total_cost, description) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    await db.query(query, [f.vehicle_id, parseFloat(f.amount), f.date, parseFloat(f.odometer), parseFloat(f.price_per_liter), parseFloat(f.total_cost), f.description]);
    res.status(201).json({ message: 'Fuel log created' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/fuel/:id', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Financial Analyst', 'Local Analyst', 'Senior Analyst']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const f = req.body;
  try {
    const query = `UPDATE fuel_logs SET vehicle_id=$1, amount=$2, date=$3, odometer=$4, price_per_liter=$5, total_cost=$6, description=$7 WHERE id=$8`;
    await db.query(query, [f.vehicle_id, parseFloat(f.amount), f.date, parseFloat(f.odometer), parseFloat(f.price_per_liter), parseFloat(f.total_cost), f.description, id]);
    res.json({ message: 'Fuel log updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/fuel/:id', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Financial Analyst', 'Local Analyst', 'Senior Analyst']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM fuel_logs WHERE id=$1`, [id]);
    res.json({ message: 'Fuel log deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Expenses Routes
app.get('/api/v1/expenses', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.query(`SELECT * FROM expenses ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/expenses', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Financial Analyst', 'Local Analyst', 'Senior Analyst']), async (req: Request, res: Response) => {
  const e = req.body;
  try {
    const query = `INSERT INTO expenses (type, vehicle_id, trip_id, amount, date, description) VALUES ($1, $2, $3, $4, $5, $6)`;
    await db.query(query, [e.type, e.vehicle_id, e.trip_id, parseFloat(e.amount), e.date, e.description]);
    res.status(201).json({ message: 'Expense record created' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/expenses/:id', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Financial Analyst', 'Local Analyst', 'Senior Analyst']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const e = req.body;
  try {
    const query = `UPDATE expenses SET type=$1, vehicle_id=$2, trip_id=$3, amount=$4, date=$5, description=$6 WHERE id=$7`;
    await db.query(query, [e.type, e.vehicle_id, e.trip_id, parseFloat(e.amount), e.date, e.description, id]);
    res.json({ message: 'Expense record updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/expenses/:id', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Financial Analyst', 'Local Analyst', 'Senior Analyst']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM expenses WHERE id=$1`, [id]);
    res.json({ message: 'Expense record deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Fleet Operational Cost Aggregation (Financial Analyst)
app.get('/api/v1/fleet/operational-costs', authenticateToken, requireRole(['Admin', 'Fleet Manager', 'Financial Analyst', 'Local Analyst', 'Senior Analyst']), async (req: Request, res: Response) => {
  try {
    const fuelResult = await db.query(`
      SELECT
        COALESCE(SUM(COALESCE(cost, 0) + COALESCE(total_cost, 0)), 0) as total_fuel_cost
      FROM fuel_logs
    `);
    const maintResult = await db.query(`
      SELECT COALESCE(SUM(cost), 0) as total_maintenance_cost FROM maintenance
    `);
    const perVehicle = await db.query(`
      SELECT
        v.id,
        v.registration_number,
        v.model,
        COALESCE(f.fuel_total, 0) as fuel_cost,
        COALESCE(m.maint_total, 0) as maintenance_cost,
        COALESCE(f.fuel_total, 0) + COALESCE(m.maint_total, 0) as operational_cost
      FROM vehicles v
      LEFT JOIN (
        SELECT vehicle_id, SUM(COALESCE(cost, 0) + COALESCE(total_cost, 0)) as fuel_total FROM fuel_logs GROUP BY vehicle_id
      ) f ON f.vehicle_id = v.id
      LEFT JOIN (
        SELECT vehicle_id, SUM(cost) as maint_total FROM maintenance GROUP BY vehicle_id
      ) m ON m.vehicle_id = v.id
      ORDER BY operational_cost DESC
    `);
    res.json({
      total_fuel_cost: fuelResult.rows[0].total_fuel_cost,
      total_maintenance_cost: maintResult.rows[0].total_maintenance_cost,
      total_operational_cost: parseFloat(fuelResult.rows[0].total_fuel_cost) + parseFloat(maintResult.rows[0].total_maintenance_cost),
      per_vehicle: perVehicle.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Live Simulation Controller ---

interface SimulationState {
  isActive: boolean;
  tripId: number | null;
  vehicleId: number;
  driverId: number;
  routeId: number;
  coordinates: LatLng[];
  currentIndex: number;
  isDeviated: boolean;
  intervalId: NodeJS.Timeout | null;
}

let simState: SimulationState = {
  isActive: false,
  tripId: null,
  vehicleId: 1, // Tata Trailer by default
  driverId: 1,  // Amit Sharma by default
  routeId: 1,   // Delhi-Mumbai
  coordinates: [],
  currentIndex: 0,
  isDeviated: false,
  intervalId: null
};

app.get('/api/v1/simulator/status', (req: Request, res: Response) => {
  res.json({
    isActive: simState.isActive,
    tripId: simState.tripId,
    vehicleId: simState.vehicleId,
    routeId: simState.routeId,
    currentIndex: simState.currentIndex,
    totalSteps: simState.coordinates.length,
    isDeviated: simState.isDeviated
  });
});

app.post('/api/v1/simulator/start', async (req: Request, res: Response) => {
  const { routeId, vehicleId, driverId, tripId } = req.body;
  if (simState.isActive) {
    return res.status(400).json({ error: 'Simulation is already running. Stop it first.' });
  }

  try {
    let activeTripId = tripId ? parseInt(tripId) : null;
    let selRouteId = parseInt(routeId || 1);
    let selVehicleId = parseInt(vehicleId || 1);
    let selDriverId = parseInt(driverId || 1);

    if (activeTripId) {
      // If tripId is provided, we fetch details from existing trip rather than creating a new one
      const tripRes = await db.query(`SELECT * FROM trips WHERE id = $1`, [activeTripId]);
      if (tripRes.rows.length > 0) {
        selRouteId = tripRes.rows[0].route_id;
        selVehicleId = tripRes.rows[0].vehicle_id;
        selDriverId = tripRes.rows[0].driver_id;
      }
    } else {
      // 1. Create simulated active trip in Database
      const startTime = new Date().toISOString();
      const tripResult = await db.query(`
        INSERT INTO trips (vehicle_id, driver_id, route_id, status, start_time, current_toll_sequence, current_toll_status)
        VALUES ($1, $2, $3, 'Active', $4, 0, 'Pending')
      `, [selVehicleId, selDriverId, selRouteId, startTime]);

      activeTripId = tripResult.rows[0].id;

      // Update Vehicle
      await db.query(`
        UPDATE vehicles
        SET status = 'On Trip', current_driver_id = $1, current_route_id = $2
        WHERE id = $3
      `, [selDriverId, selRouteId, selVehicleId]);

      // Update Driver
      await db.query(`UPDATE drivers SET status = 'Driving' WHERE id = $1`, [selDriverId]);
    }

    // Clear old logs/alerts for this vehicle so demo starts clean
    await db.query(`DELETE FROM alerts WHERE vehicle_id = $1 AND resolved_at IS NULL`, [selVehicleId]);

    // 2. Select route coordinates and interpolate path
    const routeCoords = selRouteId === 1 ? ROUTE_1_COORDS : ROUTE_2_COORDS;
    const densePath = interpolatePath(routeCoords, 15); // Dense path with ~200 coordinates

    simState = {
      isActive: true,
      tripId: activeTripId,
      vehicleId: selVehicleId,
      driverId: selDriverId,
      routeId: selRouteId,
      coordinates: densePath,
      currentIndex: 0,
      isDeviated: false,
      intervalId: null
    };

    // 3. Start ticker interval (every 3 seconds)
    simState.intervalId = setInterval(async () => {
      if (!simState.isActive || simState.currentIndex >= simState.coordinates.length) {
        // End simulation automatically on path end
        if (simState.intervalId) clearInterval(simState.intervalId);
        simState.isActive = false;
        if (simState.tripId) {
          const endTime = new Date().toISOString();
          await db.query(`UPDATE trips SET status = 'Completed', end_time = $1 WHERE id = $2`, [endTime, simState.tripId]);
          await db.query(`UPDATE vehicles SET status = 'Available', current_route_id = NULL, current_driver_id = NULL WHERE id = $1`, [simState.vehicleId]);
          await db.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [simState.driverId]);
        }
        io.emit('simulator_stopped', { reason: 'Path completed' });
        return;
      }

      let currentCoord = simState.coordinates[simState.currentIndex];

      // Introduce route deviation coordinates multiplier if forced
      if (simState.isDeviated) {
        currentCoord = {
          lat: currentCoord.lat + 0.015, // Approx 1.6km off track (clearly triggers deviation)
          lng: currentCoord.lng - 0.015
        };
      }

      const isLastIndex = simState.currentIndex === simState.coordinates.length - 1;
      const speed = isLastIndex ? 0 : 72.0; // km/h
      const heading = 145.0; // degree angle

      await engine.processGpsPing({
        vehicleId: simState.vehicleId,
        lat: currentCoord.lat,
        lng: currentCoord.lng,
        speed,
        heading,
        timestamp: new Date().toISOString()
      });

      simState.currentIndex++;
      io.emit('simulator_tick', {
        currentIndex: simState.currentIndex,
        totalSteps: simState.coordinates.length,
        lat: currentCoord.lat,
        lng: currentCoord.lng
      });
    }, 3000);

    res.json({ tripId: activeTripId, message: 'Simulation started successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/simulator/deviate', (req: Request, res: Response) => {
  const { deviate } = req.body;
  if (!simState.isActive) {
    return res.status(400).json({ error: 'No active simulation running.' });
  }
  simState.isDeviated = !!deviate;
  res.json({ isDeviated: simState.isDeviated });
});

app.post('/api/v1/simulator/fastag', async (req: Request, res: Response) => {
  const { fastagPlazaId } = req.body;
  if (!simState.isActive || !simState.tripId) {
    return res.status(400).json({ error: 'No active simulated trip running.' });
  }

  try {
    const vehicleRes = await db.query(`SELECT fastag_id FROM vehicles WHERE id = $1`, [simState.vehicleId]);
    if (vehicleRes.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    const fastagId = vehicleRes.rows[0].fastag_id;

    // Trigger crossing process
    await engine.processFastagCrossing({
      fastagId,
      fastagPlazaId,
      crossingTime: new Date().toISOString()
    });

    res.json({ message: 'FASTag crossing simulated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/simulator/stop', async (req: Request, res: Response) => {
  if (simState.intervalId) {
    clearInterval(simState.intervalId);
  }

  if (simState.isActive && simState.tripId) {
    try {
      const endTime = new Date().toISOString();
      await db.query(`UPDATE trips SET status = 'Completed', end_time = $1 WHERE id = $2`, [endTime, simState.tripId]);
      await db.query(`UPDATE vehicles SET status = 'Available', current_route_id = NULL, current_driver_id = NULL WHERE id = $1`, [simState.vehicleId]);
      await db.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [simState.driverId]);
    } catch (err) {
      console.error('Failed to reset statuses on simulator stop', err);
    }
  }

  simState = {
    isActive: false,
    tripId: null,
    vehicleId: 1,
    driverId: 1,
    routeId: 1,
    coordinates: [],
    currentIndex: 0,
    isDeviated: false,
    intervalId: null
  };

  io.emit('simulator_stopped', { reason: 'User requested' });
  res.json({ message: 'Simulation stopped successfully' });
});

// Setup server and database
db.initDb();
db.setupDatabase()
  .then(() => {
    server.listen(port, () => {
      console.log(`Backend Server: listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to setup database', err);
  });
