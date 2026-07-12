'use client';

import { useState } from 'react';
import { 
  BarChart3, FileText, Calendar, Download, RefreshCw, CheckCircle2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api, getToken } from '@/utils/api';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('tolls');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const reportModules = [
    {
      id: 'tolls',
      title: 'Toll Plaza Verification Report',
      description: 'Audit logs of GPS locations compared to independent FASTag toll plazas. Highlights skipped/out-of-sequence compliance errors.',
      kpis: ['Total Toll Crossings', 'Cleared Tolls', 'Skipped/Out-of-sequence Alerts']
    },
    {
      id: 'utilization',
      title: 'Vehicle Utilization Report',
      description: 'Fleet metrics, including odometer statistics, vehicle classifications, active trip frequencies, and fuel level checks.',
      kpis: ['Odometer Summary', 'Active Trip Frequency', 'Maintenance Statuses']
    },
    {
      id: 'drivers',
      title: 'Driver Performance Report',
      description: 'Driver shift records, average safety ratings, commercial license expiration checklists, and road incident history tallies.',
      kpis: ['Safety Ratings (1-5)', 'Accident Histories', 'Total Distance Completed']
    },
    {
      id: 'alerts',
      title: 'Fleet Compliance Alerts Log',
      description: 'Chronological timeline of all system exceptions, including Route Corridor Deviations, Unauthorized Stop delays, and SOS alarms.',
      kpis: ['High-Severity Violations', 'Alert Resolution Time', 'Risk Analysis Log']
    }
  ];

  const handleExport = async (format: string) => {
    setIsExporting(true);
    setExportFormat(format);
    setSuccessMsg('');

    const token = getToken();
    const queryParams = new URLSearchParams({
      format,
      startDate,
      endDate
    });

    const exportUrl = `http://localhost:5000/api/v1/reports/${reportType}/export?${queryParams.toString()}`;

    try {
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export generation failed on server.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const fileExtensions: Record<string, string> = { pdf: 'pdf', xlsx: 'xlsx', csv: 'csv' };
      a.download = `transitops-${reportType}-report.${fileExtensions[format]}`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg(`Successfully generated and downloaded ${format.toUpperCase()} report.`);
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to download report.');
    } finally {
      setIsExporting(false);
      setExportFormat('');
    }
  };

  const selectedReportInfo = reportModules.find(m => m.id === reportType)!;

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Title */}
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            Operations Reports & Compliance Export
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Generate formal audit documents, compliance logs, and spreadsheet summaries.</p>
        </div>

        {/* Success message banner */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-2xl p-4 text-xs leading-normal font-semibold animate-scale-in shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Report selection */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-bold text-slate-400 block mb-1">SELECT REPORT MODULE</span>
            <div className="flex flex-col gap-2.5">
              {reportModules.map(m => {
                const isActive = reportType === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setReportType(m.id);
                      setSuccessMsg('');
                    }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-sky-50 border-sky-200 text-slate-800 shadow-sm shadow-sky-100' 
                        : 'bg-slate-50/50 border-slate-150 hover:bg-slate-50 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                      {m.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">{m.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: Configurations & Actions */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-6">
            
            <div className="space-y-5">
              <div className="pb-3.5 border-b border-slate-150">
                <h2 className="text-base font-bold text-slate-800">{selectedReportInfo.title}</h2>
                <p className="text-xs text-slate-500 mt-1 leading-normal">{selectedReportInfo.description}</p>
              </div>

              {/* Date Filters */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">DATE RANGE AUDIT FILTER</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 block">START DATE</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-11 pr-4 py-2.5 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 block">END DATE</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-11 pr-4 py-2.5 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Data checklist display */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-sky-600 block">EXPORTED DATA METRICS INCLUDE:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedReportInfo.kpis.map((kpi, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-650 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                      {kpi}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Export buttons */}
            <div className="pt-4 border-t border-slate-150">
              {isExporting ? (
                <div className="flex items-center justify-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl py-3 text-xs font-semibold text-slate-500">
                  <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
                  <span>Generating server-side {exportFormat.toUpperCase()} document, compiling statistics...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center justify-center gap-1.5 bg-sky-650 hover:bg-sky-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm"
                    style={{ backgroundColor: '#0284c7' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-250 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-2.5 rounded-xl border border-slate-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Raw CSV
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
        </div>
      </main>
    </div>
  );
}
