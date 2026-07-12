import * as db from '../db/db';
import { EventEmitter } from 'events';

// Event emitter to notify server.ts of state updates or alerts
export const eventEmitter = new EventEmitter();

// --- Mathematical Helpers ---

// Haversine formula to compute distance in meters between two points
export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Find the minimum distance from point P to line segment AB (represented by lat/lng)
function getDistanceToSegment(pLat: number, pLng: number, aLat: number, aLng: number, bLat: number, bLng: number): number {
  // Simple projection in local flat coordinates (valid for short distances)
  const x = pLng;
  const y = pLat;
  const x1 = aLng;
  const y1 = aLat;
  const x2 = bLng;
  const y2 = bLat;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return getDistanceMeters(pLat, pLng, aLat, aLng);
  }

  // Projection factor t
  let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t)); // Clamp to segment

  // Nearest point coordinates
  const nearestLat = y1 + t * dy;
  const nearestLng = x1 + t * dx;

  return getDistanceMeters(pLat, pLng, nearestLat, nearestLng);
}

// Compute distance to a route (represented by ordered checkpoints)
export async function getDistanceToRoute(lat: number, lng: number, routeId: number): Promise<number> {
  const checkpointsRes = await db.query(`
    SELECT lat, lng FROM route_checkpoints
    WHERE route_id = $1
    ORDER BY sequence ASC
  `, [routeId]);

  const checkpoints = checkpointsRes.rows;
  if (checkpoints.length < 2) return 0; // Can't calculate segment without 2 checkpoints

  let minDistance = Infinity;

  for (let i = 0; i < checkpoints.length - 1; i++) {
    const cpA = checkpoints[i];
    const cpB = checkpoints[i + 1];
    const dist = getDistanceToSegment(lat, lng, cpA.lat, cpA.lng, cpB.lat, cpB.lng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

// --- Verification logic ---

interface GpsPingPayload {
  vehicleId: number;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: string;
}

// Recalculates vehicle status state machine and checks route compliance on every GPS ping
export async function processGpsPing(ping: GpsPingPayload) {
  // Get vehicle with active trip
  const vehicleRes = await db.query(`
    SELECT v.*, t.id as active_trip_id, t.route_id as active_route_id, d.name as driver_name
    FROM vehicles v
    LEFT JOIN trips t ON t.vehicle_id = v.id AND t.status = 'Active'
    LEFT JOIN drivers d ON d.id = v.current_driver_id
    WHERE v.id = $1
  `, [ping.vehicleId]);

  if (vehicleRes.rows.length === 0) return;
  const vehicle = vehicleRes.rows[0];

  const tripId = vehicle.active_trip_id;
  const routeId = vehicle.active_route_id;

  // Insert ping into gps_pings history if on active trip
  if (tripId) {
    await db.query(`
      INSERT INTO gps_pings (trip_id, vehicle_id, lat, lng, speed, heading, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [tripId, ping.vehicleId, ping.lat, ping.lng, ping.speed, ping.heading, ping.timestamp]);
  }

  // Default parameters
  const settingsRes = await db.query(`SELECT * FROM settings LIMIT 1`);
  const settings = settingsRes.rows[0] || { fleet_idle_timeout_min: 15, route_deviation_buffer_meters: 150.0 };

  let nextStatus = 'Available';
  let isDeviated = false;
  let isIdle = false;
  let deviationDist = 0;

  if (tripId && routeId) {
    nextStatus = 'Green'; // Default on-trip state

    // 1. Route Compliance: Check distance to route checkpoints polyline
    deviationDist = await getDistanceToRoute(ping.lat, ping.lng, routeId);
    if (deviationDist > settings.route_deviation_buffer_meters) {
      isDeviated = true;
      nextStatus = 'Red';

      // Check if an unresolved route deviation alert already exists for this trip
      const existingAlert = await db.query(`
        SELECT id FROM alerts
        WHERE trip_id = $1 AND type = 'Route Deviation' AND resolved_at IS NULL
        LIMIT 1
      `, [tripId]);

      if (existingAlert.rows.length === 0) {
        // Log Route Deviation Alert
        const alertMsg = `Vehicle ${vehicle.registration_number} diverted ${Math.round(deviationDist)}m off approved route corridor.`;
        const alertResult = await db.query(`
          INSERT INTO alerts (trip_id, vehicle_id, type, severity, message, gps_lat, gps_lng, deviation_distance, created_at)
          VALUES ($1, $2, 'Route Deviation', 'High', $3, $4, $5, $6, $7)
        `, [tripId, ping.vehicleId, alertMsg, ping.lat, ping.lng, deviationDist, ping.timestamp]);

        // Push real-time event
        eventEmitter.emit('alert', {
          id: alertResult.rows[0].id,
          trip_id: tripId,
          vehicle_id: ping.vehicleId,
          registration_number: vehicle.registration_number,
          driver_name: vehicle.driver_name,
          type: 'Route Deviation',
          severity: 'High',
          message: alertMsg,
          lat: ping.lat,
          lng: ping.lng,
          deviation_distance: deviationDist,
          created_at: ping.timestamp
        });
      }
    }

    // 2. Idle State Machine Check
    if (ping.speed === 0) {
      // Check if vehicle is at a whitelisted geofence location
      // Whitelist includes: route checkpoints, toll plazas
      const checkpointsRes = await db.query(`SELECT lat, lng FROM route_checkpoints WHERE route_id = $1`, [routeId]);
      const tollsRes = await db.query(`SELECT lat, lng FROM toll_plazas WHERE route_id = $1`, [routeId]);
      
      let isAtWhitelisted = false;
      const whitelistThreshold = 200.0; // 200m buffer

      for (const cp of checkpointsRes.rows) {
        if (getDistanceMeters(ping.lat, ping.lng, cp.lat, cp.lng) < whitelistThreshold) {
          isAtWhitelisted = true;
          break;
        }
      }

      if (!isAtWhitelisted) {
        for (const tp of tollsRes.rows) {
          if (getDistanceMeters(ping.lat, ping.lng, tp.lat, tp.lng) < whitelistThreshold) {
            isAtWhitelisted = true;
            break;
          }
        }
      }

      if (isAtWhitelisted) {
        nextStatus = 'Yellow'; // Stopped at approved geofence
      } else {
        // Query last pings where speed was > 0 to compute idle duration
        const lastMovingRes = await db.query(`
          SELECT timestamp FROM gps_pings
          WHERE trip_id = $1 AND speed > 0
          ORDER BY timestamp DESC
          LIMIT 1
        `, [tripId]);

        if (lastMovingRes.rows.length > 0) {
          const lastMovingTime = new Date(lastMovingRes.rows[0].timestamp).getTime();
          const pingTime = new Date(ping.timestamp).getTime();
          const idleMin = (pingTime - lastMovingTime) / (60 * 1000);

          if (idleMin >= settings.fleet_idle_timeout_min) {
            isIdle = true;
            nextStatus = isDeviated ? 'Red' : 'Orange'; // Escalate if also deviated

            const existingAlert = await db.query(`
              SELECT id FROM alerts
              WHERE trip_id = $1 AND type = 'Unauthorized Stop' AND resolved_at IS NULL
              LIMIT 1
            `, [tripId]);

            if (existingAlert.rows.length === 0) {
              const alertMsg = `Vehicle ${vehicle.registration_number} has been idling for ${Math.round(idleMin)} min at unauthorized location.`;
              const alertResult = await db.query(`
                INSERT INTO alerts (trip_id, vehicle_id, type, severity, message, gps_lat, gps_lng, deviation_distance, created_at)
                VALUES ($1, $2, 'Unauthorized Stop', 'Medium', $3, $4, $5, 0, $6)
              `, [tripId, ping.vehicleId, alertMsg, ping.lat, ping.lng, ping.timestamp]);

              eventEmitter.emit('alert', {
                id: alertResult.rows[0].id,
                trip_id: tripId,
                vehicle_id: ping.vehicleId,
                registration_number: vehicle.registration_number,
                driver_name: vehicle.driver_name,
                type: 'Unauthorized Stop',
                severity: 'Medium',
                message: alertMsg,
                lat: ping.lat,
                lng: ping.lng,
                deviation_distance: 0,
                created_at: ping.timestamp
              });
            }
          }
        }
      }
    }
  } else {
    // If vehicle status is not on a trip, maintain its general status
    nextStatus = vehicle.status === 'On Trip' ? 'Available' : vehicle.status;
  }

  // Update vehicle position, heading, speed, status in database
  await db.query(`
    UPDATE vehicles
    SET lat = $1, lng = $2, speed = $3, heading = $4, status = $5, last_ping = $6
    WHERE id = $7
  `, [ping.lat, ping.lng, ping.speed, ping.heading, tripId ? 'On Trip' : nextStatus, ping.timestamp, ping.vehicleId]);

  // Emit websocket update for vehicle coordinates and state
  eventEmitter.emit('ping', {
    vehicleId: ping.vehicleId,
    registration_number: vehicle.registration_number,
    driver_name: vehicle.driver_name,
    status: nextStatus, // Broadcast state color (Green, Yellow, Orange, Red)
    lat: ping.lat,
    lng: ping.lng,
    speed: ping.speed,
    heading: ping.heading,
    timestamp: ping.timestamp,
    active_trip_id: tripId
  });
}

// --- FASTag Verification System ---

interface FastagTransactionPayload {
  fastagId: string;
  fastagPlazaId: string;
  crossingTime: string;
}

export async function processFastagCrossing(txn: FastagTransactionPayload) {
  // 1. Find vehicle with this FASTag ID and its active trip
  const tripRes = await db.query(`
    SELECT t.*, v.id as vehicle_id, v.registration_number, d.name as driver_name
    FROM trips t
    JOIN vehicles v ON v.id = t.vehicle_id
    LEFT JOIN drivers d ON d.id = t.driver_id
    WHERE v.fastag_id = $1 AND t.status = 'Active'
    LIMIT 1
  `, [txn.fastagId]);

  if (tripRes.rows.length === 0) {
    console.log(`FASTag Log: No active trip found for FASTag ID ${txn.fastagId}`);
    return;
  }

  const trip = tripRes.rows[0];
  const tripId = trip.id;
  const routeId = trip.route_id;

  // 2. Fetch all toll plazas expected along this route
  const tollsRes = await db.query(`
    SELECT * FROM toll_plazas
    WHERE route_id = $1
    ORDER BY sequence ASC
  `, [routeId]);
  const expectedTolls = tollsRes.rows;

  // Find where this crossed toll fits in the sequence
  const crossedTollIndex = expectedTolls.findIndex(t => t.fastag_plaza_id === txn.fastagPlazaId);
  if (crossedTollIndex === -1) {
    // Crossed a toll plaza NOT on this route!
    const alertMsg = `Vehicle ${trip.registration_number} recorded FASTag crossing at unknown toll plaza ${txn.fastagPlazaId} (Out-of-sequence/Route deviation).`;
    const alertResult = await db.query(`
      INSERT INTO alerts (trip_id, vehicle_id, type, severity, message, gps_lat, gps_lng, deviation_distance, created_at)
      VALUES ($1, $2, 'Route Deviation', 'Critical', $3, 0.0, 0.0, 0, $4)
    `, [tripId, trip.vehicle_id, alertMsg, txn.crossingTime]);

    eventEmitter.emit('alert', {
      id: alertResult.rows[0].id,
      trip_id: tripId,
      vehicle_id: trip.vehicle_id,
      registration_number: trip.registration_number,
      driver_name: trip.driver_name,
      type: 'Route Deviation',
      severity: 'Critical',
      message: alertMsg,
      lat: 0.0,
      lng: 0.0,
      deviation_distance: 0,
      created_at: txn.crossingTime
    });
    return;
  }

  const crossedToll = expectedTolls[crossedTollIndex];
  const expectedSequence = trip.current_toll_sequence + 1; // Expected next sequence (1-indexed)
  const actualSequence = crossedToll.sequence;

  // Get settings
  const settingsRes = await db.query(`SELECT toll_tolerance_window_min FROM settings LIMIT 1`);
  const settings = settingsRes.rows[0] || { toll_tolerance_window_min: 20 };

  // Calculate expected arrival time
  // expected_arrival = trip_start_time + expected_arrival_minutes
  const tripStartTime = new Date(trip.start_time).getTime();
  const expectedArrivalTime = new Date(tripStartTime + crossedToll.expected_arrival_minutes * 60 * 1000);
  const actualTime = new Date(txn.crossingTime).getTime();
  const timeDeviationMin = Math.round((actualTime - expectedArrivalTime.getTime()) / (60 * 1000));

  // Determine actual vehicle GPS location at crossing time (best effort from last recorded pings)
  const lastPingRes = await db.query(`
    SELECT lat, lng FROM gps_pings
    WHERE trip_id = $1
    ORDER BY ABS(strftime('%s', timestamp) - strftime('%s', $2)) ASC
    LIMIT 1
  `, [tripId, txn.crossingTime]);
  
  // For postgres, fallback if sqlite strftime doesn't work
  let lastLat = crossedToll.lat;
  let lastLng = crossedToll.lng;
  if (lastPingRes.rows.length > 0) {
    lastLat = lastPingRes.rows[0].lat;
    lastLng = lastPingRes.rows[0].lng;
  }

  // Determine transaction verification status
  if (actualSequence === expectedSequence) {
    // 1. In-sequence match!
    const timeStatus = Math.abs(timeDeviationMin) <= settings.toll_tolerance_window_min ? 'Cleared' : 'Cleared'; // Still Cleared, but dev log tracks time
    
    // Upsert Clearance Log
    await db.query(`
      INSERT INTO toll_clearance_log (trip_id, toll_plaza_id, status, expected_arrival, actual_crossing_time, gps_lat, gps_lng, time_deviation)
      VALUES ($1, $2, 'Cleared', $3, $4, $5, $6, $7)
    `, [tripId, crossedToll.id, expectedArrivalTime.toISOString(), txn.crossingTime, lastLat, lastLng, timeDeviationMin]);

    // Update Trip Sequence
    await db.query(`
      UPDATE trips
      SET current_toll_sequence = $1, current_toll_status = 'Cleared'
      WHERE id = $2
    `, [actualSequence, tripId]);

    // Notify updates
    eventEmitter.emit('toll_cleared', {
      trip_id: tripId,
      toll_plaza_id: crossedToll.id,
      name: crossedToll.name,
      status: 'Cleared',
      actual_crossing_time: txn.crossingTime,
      time_deviation: timeDeviationMin
    });

  } else if (actualSequence > expectedSequence) {
    // 2. Skipped: Crossed a later toll plaza, missing intermediate plaza(s)!
    // Example: expected sequence 2, crossed sequence 3. Plaza 2 was skipped.
    
    // Write skip records for all missed intermediate plazas
    for (let seq = expectedSequence; seq < actualSequence; seq++) {
      const missedToll = expectedTolls.find(t => t.sequence === seq);
      if (missedToll) {
        const missedETA = new Date(tripStartTime + missedToll.expected_arrival_minutes * 60 * 1000);
        await db.query(`
          INSERT INTO toll_clearance_log (trip_id, toll_plaza_id, status, expected_arrival, actual_crossing_time, gps_lat, gps_lng, time_deviation)
          VALUES ($1, $2, 'Skipped', $3, NULL, NULL, NULL, NULL)
        `, [tripId, missedToll.id, missedETA.toISOString()]);

        // Generate Alert for Missed Plaza
        const alertMsg = `Vehicle ${trip.registration_number} SKIPPED expected toll plaza: ${missedToll.name} (FASTag missed).`;
        const alertResult = await db.query(`
          INSERT INTO alerts (trip_id, vehicle_id, type, severity, message, gps_lat, gps_lng, deviation_distance, created_at)
          VALUES ($1, $2, 'Missed Toll Plaza', 'High', $3, lastLat, lastLng, 0, $4)
        `, [tripId, trip.vehicle_id, alertMsg, txn.crossingTime]);

        eventEmitter.emit('alert', {
          id: alertResult.rows[0]?.id || 999,
          trip_id: tripId,
          vehicle_id: trip.vehicle_id,
          registration_number: trip.registration_number,
          driver_name: trip.driver_name,
          type: 'Missed Toll Plaza',
          severity: 'High',
          message: alertMsg,
          lat: lastLat,
          lng: lastLng,
          deviation_distance: 0,
          created_at: txn.crossingTime
        });
      }
    }

    // Now log the crossed toll as Cleared
    await db.query(`
      INSERT INTO toll_clearance_log (trip_id, toll_plaza_id, status, expected_arrival, actual_crossing_time, gps_lat, gps_lng, time_deviation)
      VALUES ($1, $2, 'Cleared', $3, $4, $5, $6, $7)
    `, [tripId, crossedToll.id, expectedArrivalTime.toISOString(), txn.crossingTime, lastLat, lastLng, timeDeviationMin]);

    // Update active trip status and sequence
    await db.query(`
      UPDATE trips
      SET current_toll_sequence = $1, current_toll_status = 'Skipped'
      WHERE id = $2
    `, [actualSequence, tripId]);

    eventEmitter.emit('toll_cleared', {
      trip_id: tripId,
      toll_plaza_id: crossedToll.id,
      name: crossedToll.name,
      status: 'Cleared',
      actual_crossing_time: txn.crossingTime,
      time_deviation: timeDeviationMin
    });

  } else {
    // 3. Out-of-sequence (re-crossed an earlier plaza, or sequence went backward)
    await db.query(`
      INSERT INTO toll_clearance_log (trip_id, toll_plaza_id, status, expected_arrival, actual_crossing_time, gps_lat, gps_lng, time_deviation)
      VALUES ($1, $2, 'Out-of-sequence', $3, $4, $5, $6, $7)
    `, [tripId, crossedToll.id, expectedArrivalTime.toISOString(), txn.crossingTime, lastLat, lastLng, timeDeviationMin]);

    const alertMsg = `Vehicle ${trip.registration_number} triggered an OUT-OF-SEQUENCE FASTag crossing at ${crossedToll.name} (Expected sequence ${expectedSequence}, got ${actualSequence}).`;
    const alertResult = await db.query(`
      INSERT INTO alerts (trip_id, vehicle_id, type, severity, message, gps_lat, gps_lng, deviation_distance, created_at)
      VALUES ($1, $2, 'Route Deviation', 'Critical', $3, lastLat, lastLng, 0, $4)
    `, [tripId, trip.vehicle_id, alertMsg, txn.crossingTime]);

    eventEmitter.emit('alert', {
      id: alertResult.rows[0]?.id || 998,
      trip_id: tripId,
      vehicle_id: trip.vehicle_id,
      registration_number: trip.registration_number,
      driver_name: trip.driver_name,
      type: 'Route Deviation',
      severity: 'Critical',
      message: alertMsg,
      lat: lastLat,
      lng: lastLng,
      deviation_distance: 0,
      created_at: txn.crossingTime
    });
  }
}
