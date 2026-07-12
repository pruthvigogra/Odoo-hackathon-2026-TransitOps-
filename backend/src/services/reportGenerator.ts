import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import * as db from '../db/db';

// Interface for Report Request
interface ReportOptions {
  type: string; // utilization, drivers, tolls, alerts
  startDate: string;
  endDate: string;
}

// Generate PDF Report
export async function generatePdfReport(options: ReportOptions): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // --- Header Design ---
      doc.fillColor('#0f172a').rect(0, 0, 595.28, 100).fill('#0f172a'); // Slate-900 banner background
      doc.fillColor('#38bdf8').fontSize(24).font('Helvetica-Bold').text('TRANSITOPS', 50, 25);
      doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text('SMART FLEET MANAGEMENT OPERATIONS PLATFORM', 50, 55);
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('AUDIT & COMPLIANCE REPORT', 400, 25, { align: 'right', width: 145 });
      doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, 400, 55, { align: 'right', width: 145 });

      doc.y = 120;
      doc.fillColor('#000000');

      // --- Report Title & Metadata ---
      const reportTitle = getReportTitle(options.type);
      doc.fontSize(16).font('Helvetica-Bold').text(reportTitle, 50, doc.y);
      doc.fontSize(10).font('Helvetica-Oblique').text(`Date Filter Range: ${options.startDate} to ${options.endDate}`, 50, doc.y + 20);

      doc.y = doc.y + 45;

      // --- Fetch Data ---
      const data = await fetchReportData(options);

      // --- Summary KPIs Layout ---
      drawKpiSummaryCards(doc, options.type, data);

      doc.y = doc.y + 90;

      // --- Render Table Grid ---
      drawReportTable(doc, options.type, data);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Generate Excel Report
export async function generateExcelReport(options: ReportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TransitOps Operations';
  workbook.lastModifiedBy = 'TransitOps System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(getReportTitle(options.type));
  const data = await fetchReportData(options);

  // Styling Setup
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]; // Freeze header row

  const headerStyle = {
    font: { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } }, // Slate-900
    alignment: { vertical: 'middle' as const, horizontal: 'center' as const }
  };

  const borderStyle = {
    top: { style: 'thin' as const, color: { argb: 'E2E8F0' } },
    left: { style: 'thin' as const, color: { argb: 'E2E8F0' } },
    bottom: { style: 'thin' as const, color: { argb: 'E2E8F0' } },
    right: { style: 'thin' as const, color: { argb: 'E2E8F0' } }
  };

  // Build Sheet Columns & Data based on type
  if (options.type === 'tolls') {
    worksheet.columns = [
      { header: 'Trip ID', key: 'trip_id', width: 10 },
      { header: 'Vehicle No', key: 'reg_no', width: 18 },
      { header: 'Driver', key: 'driver_name', width: 22 },
      { header: 'Route', key: 'route_name', width: 25 },
      { header: 'Toll Plaza', key: 'toll_name', width: 25 },
      { header: 'Seq', key: 'sequence', width: 8 },
      { header: 'Expected Arrival', key: 'expected_arrival', width: 22 },
      { header: 'Actual Crossing', key: 'actual_crossing', width: 22 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Time Dev (min)', key: 'time_deviation', width: 15 }
    ];

    data.rows.forEach((row: any) => {
      worksheet.addRow({
        trip_id: row.trip_id,
        reg_no: row.registration_number,
        driver_name: row.driver_name || 'Unassigned',
        route_name: row.route_name,
        toll_name: row.toll_name,
        sequence: row.sequence,
        expected_arrival: row.expected_arrival ? new Date(row.expected_arrival) : 'N/A',
        actual_crossing: row.actual_crossing_time ? new Date(row.actual_crossing_time) : 'N/A',
        status: row.status,
        time_deviation: row.time_deviation !== null ? row.time_deviation : 0
      });
    });

  } else if (options.type === 'utilization') {
    worksheet.columns = [
      { header: 'Vehicle No', key: 'reg_no', width: 18 },
      { header: 'Manufacturer', key: 'mfg', width: 15 },
      { header: 'Model', key: 'model', width: 15 },
      { header: 'Type', key: 'type', width: 18 },
      { header: 'Total Odometer (km)', key: 'odometer', width: 20 },
      { header: 'Active Trips Count', key: 'trips_count', width: 18 },
      { header: 'Current Fuel (L)', key: 'fuel', width: 15 },
      { header: 'Status', key: 'status', width: 18 }
    ];

    data.rows.forEach((row: any) => {
      worksheet.addRow({
        reg_no: row.registration_number,
        mfg: row.manufacturer,
        model: row.model,
        type: row.type,
        odometer: row.odometer,
        trips_count: row.trips_count || 0,
        fuel: 85.0, // Simulated fuel constant
        status: row.status
      });
    });

  } else if (options.type === 'drivers') {
    worksheet.columns = [
      { header: 'Driver Name', key: 'name', width: 22 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'License No', key: 'license', width: 20 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Total Trips', key: 'total_trips', width: 12 },
      { header: 'Total Distance (km)', key: 'total_dist', width: 18 },
      { header: 'Accidents', key: 'accidents', width: 10 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    data.rows.forEach((row: any) => {
      worksheet.addRow({
        name: row.name,
        phone: row.phone,
        license: row.license_number,
        rating: row.rating,
        total_trips: row.total_trips,
        total_dist: row.total_distance,
        accidents: row.accident_history,
        status: row.status
      });
    });

  } else {
    // Alerts by default
    worksheet.columns = [
      { header: 'Trip ID', key: 'trip_id', width: 10 },
      { header: 'Vehicle No', key: 'reg_no', width: 18 },
      { header: 'Driver', key: 'driver_name', width: 22 },
      { header: 'Alert Type', key: 'type', width: 20 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Message', key: 'message', width: 45 },
      { header: 'Deviation (m)', key: 'dev_dist', width: 15 },
      { header: 'Timestamp', key: 'created_at', width: 22 }
    ];

    data.rows.forEach((row: any) => {
      worksheet.addRow({
        trip_id: row.trip_id,
        reg_no: row.registration_number,
        driver_name: row.driver_name || 'N/A',
        type: row.type,
        severity: row.severity,
        message: row.message,
        dev_dist: row.deviation_distance || 0,
        created_at: new Date(row.created_at)
      });
    });
  }

  // Format cell borders & styles
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (rowNumber === 1) {
        cell.style = headerStyle;
      } else {
        cell.border = borderStyle;
        cell.font = { name: 'Arial', size: 10 };
        // Date formats
        if (cell.value instanceof Date) {
          cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
        }
        // Numeric alignment
        if (typeof cell.value === 'number') {
          cell.alignment = { horizontal: 'right' };
        }
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}

// Generate CSV Report
export async function generateCsvReport(options: ReportOptions): Promise<string> {
  const data = await fetchReportData(options);
  if (data.rows.length === 0) return 'No data available';

  const headers = Object.keys(data.rows[0]);
  const csvLines = [headers.join(',')];

  for (const row of data.rows) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '';
      const stringVal = String(val).replace(/"/g, '""');
      return stringVal.includes(',') || stringVal.includes('\n') ? `"${stringVal}"` : stringVal;
    });
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
}

// --- Report Helpers ---

function getReportTitle(type: string): string {
  switch (type) {
    case 'tolls': return 'Toll Plaza FASTag Clearance Record Audit';
    case 'utilization': return 'Vehicle Fleet Utilization Report';
    case 'drivers': return 'Driver Performance & Safety Analytics';
    default: return 'Fleet Compliance & Geofence Security Alerts';
  }
}

async function fetchReportData(options: ReportOptions) {
  const sDate = `${options.startDate} 00:00:00`;
  const eDate = `${options.endDate} 23:59:59`;

  if (options.type === 'tolls') {
    return await db.query(`
      SELECT tcl.*, t.vehicle_id, v.registration_number, d.name as driver_name, r.name as route_name, tp.name as toll_name, tp.sequence
      FROM toll_clearance_log tcl
      JOIN trips t ON t.id = tcl.trip_id
      JOIN vehicles v ON v.id = t.vehicle_id
      JOIN routes r ON r.id = t.route_id
      JOIN toll_plazas tp ON tp.id = tcl.toll_plaza_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      WHERE (tcl.actual_crossing_time BETWEEN $1 AND $2) OR (tcl.actual_crossing_time IS NULL AND tcl.expected_arrival BETWEEN $1 AND $2)
      ORDER BY tcl.trip_id DESC, tp.sequence ASC
    `, [sDate, eDate]);

  } else if (options.type === 'utilization') {
    return await db.query(`
      SELECT v.*, COUNT(t.id) as trips_count
      FROM vehicles v
      LEFT JOIN trips t ON t.vehicle_id = v.id
      GROUP BY v.id
    `);

  } else if (options.type === 'drivers') {
    return await db.query(`
      SELECT * FROM drivers
      ORDER BY rating DESC
    `);

  } else {
    // Alerts
    return await db.query(`
      SELECT a.*, v.registration_number, d.name as driver_name
      FROM alerts a
      JOIN vehicles v ON v.id = a.vehicle_id
      LEFT JOIN trips t ON t.id = a.trip_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      WHERE a.created_at BETWEEN $1 AND $2
      ORDER BY a.created_at DESC
    `, [sDate, eDate]);
  }
}

// PDF Draw KPI Box helper
function drawKpiSummaryCards(doc: any, type: string, data: any) {
  // Let's draw 3 neat boxes
  const cardWidth = 150;
  const cardHeight = 60;
  const spacing = 20;
  const startX = 50;
  const startY = doc.y;

  let kpi1 = { label: 'Total Records', val: String(data.rows.length) };
  let kpi2 = { label: 'Primary Indicator', val: 'N/A' };
  let kpi3 = { label: 'Risk Factor', val: 'Normal' };

  if (type === 'tolls') {
    const cleared = data.rows.filter((r: any) => r.status === 'Cleared').length;
    const skipped = data.rows.filter((r: any) => r.status === 'Skipped').length;
    kpi2 = { label: 'Cleared Tolls', val: String(cleared) };
    kpi3 = { label: 'Skipped/Out-of-seq', val: String(skipped + data.rows.filter((r: any) => r.status === 'Out-of-sequence').length) };
  } else if (type === 'utilization') {
    const available = data.rows.filter((r: any) => r.status === 'Available').length;
    const onTrip = data.rows.filter((r: any) => r.status === 'On Trip' || r.status === 'Maintenance').length;
    kpi2 = { label: 'Available Vehicles', val: String(available) };
    kpi3 = { label: 'Active/Maintenance', val: String(onTrip) };
  } else if (type === 'drivers') {
    const count = data.rows.length;
    const accidents = data.rows.reduce((sum: number, r: any) => sum + r.accident_history, 0);
    kpi2 = { label: 'Avg Driver Rating', val: (data.rows.reduce((sum: number, r: any) => sum + r.rating, 0) / (count || 1)).toFixed(1) };
    kpi3 = { label: 'Total Incidents', val: String(accidents) };
  } else {
    // Alerts
    const critical = data.rows.filter((r: any) => r.severity === 'Critical' || r.severity === 'High').length;
    kpi2 = { label: 'Critical/High Alerts', val: String(critical) };
    kpi3 = { label: 'Resolved Alerts', val: String(data.rows.filter((r: any) => r.resolved_at !== null).length) };
  }

  const cards = [kpi1, kpi2, kpi3];

  cards.forEach((card, i) => {
    const x = startX + i * (cardWidth + spacing);
    doc.fillColor('#f8fafc').rect(x, startY, cardWidth, cardHeight).fill();
    doc.lineWidth(1).strokeColor('#cbd5e1').rect(x, startY, cardWidth, cardHeight).stroke();

    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text(card.label.toUpperCase(), x + 10, startY + 12);
    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text(card.val, x + 10, startY + 28);
  });
}

// PDF Draw Grid Table helper
function drawReportTable(doc: any, type: string, data: any) {
  const startX = 50;
  const startY = doc.y;
  let headers: string[] = [];
  let colWidths: number[] = [];

  if (type === 'tolls') {
    headers = ['Trip', 'Vehicle', 'Toll Plaza', 'Seq', 'Actual Crossing', 'Status', 'Dev (min)'];
    colWidths = [45, 80, 150, 30, 110, 80, 50];
  } else if (type === 'utilization') {
    headers = ['Vehicle', 'Manufacturer', 'Model', 'Type', 'Odo (km)', 'Trips', 'Status'];
    colWidths = [85, 90, 80, 80, 75, 45, 90];
  } else if (type === 'drivers') {
    headers = ['Driver Name', 'Phone', 'License No', 'Rating', 'Trips', 'Dist (km)', 'Status'];
    colWidths = [115, 90, 110, 45, 45, 60, 80];
  } else {
    // Alerts
    headers = ['Trip', 'Vehicle', 'Alert Type', 'Severity', 'Message', 'Timestamp'];
    colWidths = [35, 75, 85, 55, 160, 135];
  }

  // Draw Header Row
  doc.fillColor('#0f172a').rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), 20).fill();
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

  let currentX = startX;
  headers.forEach((h, i) => {
    doc.text(h, currentX + 5, startY + 6, { width: colWidths[i] - 10, align: 'left' });
    currentX += colWidths[i];
  });

  // Draw Data Rows
  let currentY = startY + 20;
  doc.fillColor('#000000').fontSize(7).font('Helvetica');

  data.rows.forEach((row: any, rowIndex: number) => {
    // Row background stripes
    if (rowIndex % 2 === 1) {
      doc.fillColor('#f8fafc').rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 16).fill();
    }

    // Highlight Skipped/Out-of-sequence rows slightly in red/yellow for toll reports
    if (type === 'tolls' && (row.status === 'Skipped' || row.status === 'Out-of-sequence')) {
      doc.fillColor('#fef2f2').rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 16).fill();
      doc.fillColor('#991b1b'); // Dark red text
    } else {
      doc.fillColor('#334155');
    }

    currentX = startX;

    let cellValues: string[] = [];
    if (type === 'tolls') {
      cellValues = [
        String(row.trip_id),
        row.registration_number,
        row.toll_name,
        String(row.sequence),
        row.actual_crossing_time ? row.actual_crossing_time.split('T')[0] + ' ' + row.actual_crossing_time.split('T')[1].substring(0, 8) : 'MISSING/SKIPPED',
        row.status,
        row.time_deviation !== null ? `${row.time_deviation} min` : '0 min'
      ];
    } else if (type === 'utilization') {
      cellValues = [
        row.registration_number,
        row.manufacturer,
        row.model,
        row.type,
        String(row.odometer),
        String(row.trips_count || 0),
        row.status
      ];
    } else if (type === 'drivers') {
      cellValues = [
        row.name,
        row.phone,
        row.license_number,
        String(row.rating),
        String(row.total_trips),
        String(row.total_distance),
        row.status
      ];
    } else {
      // Alerts
      cellValues = [
        row.trip_id ? String(row.trip_id) : 'System',
        row.registration_number,
        row.type,
        row.severity,
        row.message,
        row.created_at.replace('T', ' ').substring(0, 19)
      ];
    }

    cellValues.forEach((val, i) => {
      doc.text(val, currentX + 5, currentY + 4, { width: colWidths[i] - 10, truncate: true });
      currentX += colWidths[i];
    });

    currentY += 16;

    // Page Break if too low
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
      // Redraw Table Headers on new page
      doc.fillColor('#0f172a').rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 20).fill();
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      let pageX = startX;
      headers.forEach((h, i) => {
        doc.text(h, pageX + 5, currentY + 6, { width: colWidths[i] - 10 });
        pageX += colWidths[i];
      });
      currentY += 20;
      doc.fillColor('#000000').fontSize(7).font('Helvetica');
    }
  });
}
