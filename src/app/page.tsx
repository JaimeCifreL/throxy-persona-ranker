  // ...existing code...

  // ...existing code...
'use client';

import { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';

// --- Lógica de filtrado adaptada de filter_leads.js ---
function getCompanySize(employeeRange: string) {
  if (!employeeRange) return 'unknown';
  const range = employeeRange.toLowerCase();
  if (range.includes('1-10') || range.includes('2-10') || range.includes('11-50')) return 'startup';
  if (range.includes('51-200')) return 'smb';
  if (range.includes('201-500') || range.includes('501-1000')) return 'mid-market';
  if (range.includes('1001-5000') || range.includes('5001-10000') || range.includes('10001+') || range.includes('10000+')) return 'enterprise';
  return 'unknown';
}

function isHardExclusion(title: string) {
  const exclusions = [
    'human resources', 'hr ', 'talent acquisition', 'recruiter', 'recruiting',
    'legal', 'compliance', 'counsel',
    'cfo', 'finance', 'accounting', 'controller', 'treasurer',
    'cto', 'engineering', 'engineer', 'developer', 'architect', 'devops',
    'product manager', 'product owner', 'product marketing',
    'customer success', 'customer support', 'support',
    'plant manager', 'facility', 'manufacturing',
    'supply chain', 'logistics', 'procurement',
    'marketing manager', 'content', 'social media', 'brand',
    'board member', 'advisor', 'consultant', 'assistant', 'coordinator',
    'intern', 'analyst'
  ];
  const lowerTitle = (title || '').toLowerCase();
  if (lowerTitle.includes('sales operations') || lowerTitle.includes('revenue operations')) return false;
  return exclusions.some(exc => lowerTitle.includes(exc)) ||
    (lowerTitle.includes('operations manager') && !lowerTitle.includes('sales') && !lowerTitle.includes('revenue'));
}

function isSalesIC(title: string) {
  const lowerTitle = (title || '').toLowerCase();
  return (
    lowerTitle.includes('bdr') ||
    lowerTitle.includes('sdr') ||
    lowerTitle.includes('business development representative') ||
    lowerTitle.includes('sales development representative') ||
    lowerTitle.includes('account executive') ||
    lowerTitle.includes('ae ') ||
    lowerTitle.includes('account manager') ||
    lowerTitle.includes('inside sales')
  );
}

function isSalesOrRevOpsManager(title: string) {
  const t = (title || '').toLowerCase();
  if (!t.includes('manager')) return (
    t.includes('regional sales manager') ||
    t.includes('sales manager')
  );
  return (
    t.includes('sales') ||
    t.includes('revenue operations') ||
    t.includes('revops')
  );
}

function calculatePriority(title: string, companySize: string) {
  const lowerTitle = (title || '').toLowerCase();
  let priority = 0;
  if (companySize === 'startup') {
    if (lowerTitle.includes('founder') || lowerTitle.includes('co-founder')) priority = 5;
    else if (lowerTitle.includes('ceo') || lowerTitle.includes('president')) priority = 5;
    else if (lowerTitle.includes('owner') || lowerTitle.includes('co-owner')) priority = 5;
    else if (lowerTitle.includes('managing director')) priority = 4;
    else if (lowerTitle.includes('head of sales')) priority = 4;
    else if (lowerTitle.includes('vp') || lowerTitle.includes('vice president')) priority = 3;
  } else if (companySize === 'smb') {
    if ((lowerTitle.includes('vp') || lowerTitle.includes('vice president')) && (lowerTitle.includes('sales') || lowerTitle.includes('revenue') || lowerTitle.includes('sales development'))) priority = 5;
    else if (lowerTitle.includes('head of sales')) priority = 5;
    else if (lowerTitle.includes('director') && (lowerTitle.includes('sales development') || lowerTitle.includes('sales') || lowerTitle.includes('comercial'))) priority = 5;
    else if (lowerTitle.includes('regional sales director')) priority = 5;
    else if (lowerTitle.includes('cro') || lowerTitle.includes('chief revenue')) priority = 4;
    else if (lowerTitle.includes('revenue operations') && (lowerTitle.includes('head') || lowerTitle.includes('vp'))) priority = 4;
    else if ((lowerTitle.includes('vp') || lowerTitle.includes('vice president')) && lowerTitle.includes('growth')) priority = 4;
    else if (lowerTitle.includes('sales manager')) priority = 3;
    else if (lowerTitle.includes('founder') || lowerTitle.includes('ceo')) priority = 3;
  } else if (companySize === 'mid-market') {
    if (lowerTitle.includes('vp') && lowerTitle.includes('sales development')) priority = 5;
    else if ((lowerTitle.includes('vp') || lowerTitle.includes('vice president')) && lowerTitle.includes('sales')) priority = 5;
    else if (lowerTitle.includes('head of sales development')) priority = 5;
    else if (lowerTitle.includes('director') && lowerTitle.includes('sales development')) priority = 5;
    else if (lowerTitle.includes('director') && (lowerTitle.includes('sales') || lowerTitle.includes('comercial') || lowerTitle.includes('regional sales director'))) priority = 4;
    else if (lowerTitle.includes('cro') || lowerTitle.includes('chief revenue')) priority = 4;
    else if ((lowerTitle.includes('vp') || lowerTitle.includes('vice president')) && lowerTitle.includes('revenue operations')) priority = 4;
    else if ((lowerTitle.includes('vp') || lowerTitle.includes('vice president')) && (lowerTitle.includes('gtm') || lowerTitle.includes('growth'))) priority = 4;
    else if (lowerTitle.includes('manager') && (lowerTitle.includes('sales') || lowerTitle.includes('bdr') || lowerTitle.includes('revops') || lowerTitle.includes('revenue operations'))) priority = 3;
    else if (lowerTitle.includes('ceo') || lowerTitle.includes('president')) priority = 1;
  } else if (companySize === 'enterprise') {
    if ((lowerTitle.includes('vp') || lowerTitle.includes('vice president')) && lowerTitle.includes('sales development')) priority = 5;
    else if ((lowerTitle.includes('vp') || lowerTitle.includes('vice president')) && lowerTitle.includes('inside sales')) priority = 5;
    else if (lowerTitle.includes('head of sales development')) priority = 5;
    else if (lowerTitle.includes('director') && lowerTitle.includes('sales development')) priority = 4;
    else if ((lowerTitle.includes('vp') || lowerTitle.includes('vice president')) && lowerTitle.includes('field sales')) priority = 4;
    else if ((lowerTitle.includes('vp') || lowerTitle.includes('vice president')) && lowerTitle.includes('revenue operations')) priority = 4;
    else if (lowerTitle.includes('director') && (lowerTitle.includes('sales') || lowerTitle.includes('comercial'))) priority = 4;
    else if (lowerTitle.includes('cro') || lowerTitle.includes('chief revenue')) priority = 4;
    else if (lowerTitle.includes('manager') && (lowerTitle.includes('bdr') || lowerTitle.includes('revops') || lowerTitle.includes('revenue operations') || lowerTitle.includes('sales'))) priority = 3;
    else if (lowerTitle.includes('ceo') || lowerTitle.includes('president')) priority = 0;
  }
  return priority;
}

function filterLeadsRaw(leads: any[]) {
  const results: any[] = [];
  // Excluidos solo para debug
  leads.forEach(lead => {
    const title = lead.lead_job_title || '';
    const companySize = getCompanySize(lead.account_employee_range);
    if (isHardExclusion(title)) return;
    if (companySize === 'unknown') return;
    const priority = calculatePriority(title, companySize);
    const isIC = isSalesIC(title);
    let finalPriority = priority;
    if (isIC && priority < 3) return;
    else if (isIC) finalPriority = 2;
    if (finalPriority < 3) return;
    results.push({
      ...lead,
      company_size: companySize,
      priority: finalPriority,
      is_champion: 'no',
    });
  });
  // Champions: marcar managers si no hay decisor en la empresa
  const hasPrimaryByCompany: Record<string, boolean> = {};
  results.forEach(lead => {
    const key = String(lead.account_name || '').toLowerCase();
    if (!hasPrimaryByCompany[key]) hasPrimaryByCompany[key] = false;
    if (lead.priority >= 4) hasPrimaryByCompany[key] = true;
  });
  results.forEach(lead => {
    const key = String(lead.account_name || '').toLowerCase();
    const companyHasPrimary = hasPrimaryByCompany[key];
    const title = lead.lead_job_title || '';
    const size = lead.company_size;
    const managerCandidate = isSalesOrRevOpsManager(title);
    if (!companyHasPrimary && managerCandidate && lead.priority === 3 && (size === 'smb' || size === 'mid-market' || size === 'enterprise')) {
      lead.is_champion = 'yes';
    }
  });
  return results;
}

type Lead = {
  id: string;
  account_name: string;
  lead_first_name: string;
  lead_last_name: string;
  lead_job_title: string;
  company_size: string;
  priority: number;
  is_champion: string;
  import_batch?: string;
};

type RankedLead = Lead & {
  score: number;
  reasoning: string;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'main' | 'import'>('main');
  const [importBatch, setImportBatch] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
    // Export top N people per company to CSV
    const exportTopNPerCompanyToCSV = () => {
      if (!ranked || ranked.length === 0) return;
      const grouped: { [company: string]: RankedLead[] } = {};
      ranked.forEach((lead: RankedLead) => {
        if (!grouped[lead.account_name]) grouped[lead.account_name] = [];
        grouped[lead.account_name].push(lead);
      });
      const rows: any[] = [];
      Object.entries(grouped).forEach(([company, leads]) => {
        leads.sort((a, b) => b.score - a.score);
        leads.slice(0, topN).forEach((lead: RankedLead) => {
          rows.push({
            Company: lead.account_name,
            FirstName: lead.lead_first_name,
            LastName: lead.lead_last_name,
            Title: lead.lead_job_title,
            Size: lead.company_size,
            Priority: lead.priority,
            Score: lead.score,
            Reasoning: lead.reasoning,
          });
        });
      });
      if (rows.length === 0) return;
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(','), ...rows.map(row => headers.map(h => '"' + String(row[h]).replace(/"/g, '""') + '"').join(','))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `top_${topN}_per_company.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ranked, setRanked] = useState<RankedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [topN, setTopN] = useState(10);
  const [aiStats, setAiStats] = useState<any | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    const { data, error } = await supabase.from('leads').select('*');
    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }
    setLeads(data || []);
    // Extraer batches únicos
    const batches = Array.from(new Set((data || []).map((l: any) => l.import_batch).filter(Boolean)));
    setAvailableBatches(batches);
    // Si no hay batch seleccionado, seleccionar el primero
    if (!selectedBatch && batches.length > 0) setSelectedBatch(batches[0]);
  }

  async function handleRank() {
    if (!selectedBatch) {
      alert('Selecciona un batch de importación para rankear.');
      return;
    }
    const leadsToRank = leads.filter(l => l.import_batch === selectedBatch);
    if (leadsToRank.length === 0) {
      alert('No hay leads para rankear en el batch seleccionado.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: leadsToRank.map((l) => l.id) }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(`Error: ${data.error}`);
        setLoading(false);
        return;
      }
      const combined = leadsToRank.map((lead) => {
        const ranking = data.rankings.find((r: any) => r.lead_id === lead.id);
        return {
          ...lead,
          score: ranking?.score || 0,
          reasoning: ranking?.reasoning || '',
        };
      });
      combined.sort((a, b) => b.score - a.score);
      setRanked(combined);
      setAiStats(data.ai_stats || null);
    } catch (error) {
      console.error('Error ranking:', error);
      alert('Error ranking leads');
    } finally {
      setLoading(false);
    }
  }

  const displayedLeads = [...ranked]
    .sort((a, b) => {
      let vA: any, vB: any;
      switch (sortBy) {
        case 'score':
          vA = a.score; vB = b.score; break;
        case 'priority':
          vA = a.priority; vB = b.priority; break;
        case 'name':
          vA = `${a.lead_first_name} ${a.lead_last_name}`.toLowerCase();
          vB = `${b.lead_first_name} ${b.lead_last_name}`.toLowerCase();
          break;
        case 'title':
          vA = a.lead_job_title.toLowerCase(); vB = b.lead_job_title.toLowerCase(); break;
        case 'company':
          vA = a.account_name.toLowerCase(); vB = b.account_name.toLowerCase(); break;
        case 'size':
          vA = a.company_size.toLowerCase(); vB = b.company_size.toLowerCase(); break;
        default:
          vA = undefined; vB = undefined;
      }
      if (vA === undefined || vB === undefined) return 0;
      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    })
    .slice(0, topN);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Throxy Persona Ranker</h1>
        <p className="text-slate-300 mb-6">AI-powered lead ranking for sales outbound</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-t-md font-semibold transition ${activeTab === 'main' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'bg-slate-700 text-slate-300'}`}
            onClick={() => setActiveTab('main')}
          >
            Leads
          </button>
          <button
            className={`px-4 py-2 rounded-t-md font-semibold transition ${activeTab === 'import' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'bg-slate-700 text-slate-300'}`}
            onClick={() => setActiveTab('import')}
          >
            Import Leads
          </button>
        </div>

        {/* Main Tab */}
        {activeTab === 'main' && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-slate-500 text-xs mb-2 italic">
                  I applied a series of filters to focus on the most relevant leads based on our ideal customer profile and increase the efficiency of the AI. Choose a batch to work with a specific group of leads.
                </p>
                <div className="mb-2">
                  <label className="text-slate-300 text-sm mr-2">Import batch:</label>
                  <select
                    value={selectedBatch}
                    onChange={e => setSelectedBatch(e.target.value)}
                    className="px-3 py-1 bg-slate-700 text-white rounded text-sm"
                  >
                    <option value="">-- Select a batch --</option>
                    {availableBatches.map(batch => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                </div>
                <p className="text-slate-200 mb-2">
                  Total leads in batch: <span className="font-bold text-white">{leads.filter(l => l.import_batch === selectedBatch).length}</span>
                </p>
                <div className="flex gap-2 items-center mt-2">
                  <button onClick={handleRank} disabled={loading || !selectedBatch || leads.filter(l => l.import_batch === selectedBatch).length === 0}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-md transition"
                  >
                    {loading ? 'Ranking...' : 'Start AI Ranking'}
                  </button>
                  <button onClick={exportTopNPerCompanyToCSV} disabled={ranked.length === 0 || loading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-md transition text-sm"
                  >
                    Export top {topN} per company to CSV
                  </button>
                </div>
                {loading && (
                  <div className="w-full flex items-center gap-2 mt-4">
                    <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-300 text-sm">Ranking leads with AI, please wait...</span>
                  </div>
                )}
              </div>

              {aiStats && (
                <div className="bg-slate-900 border border-slate-700 rounded p-4 mt-2 text-slate-300 text-xs flex flex-col gap-1">
                  <div><b>AI Model:</b> {aiStats.model}</div>
                  <div><b>Prompt tokens:</b> {aiStats.prompt_tokens} | <b>Completion tokens:</b> {aiStats.completion_tokens} | <b>Total tokens:</b> {aiStats.total_tokens}</div>
                  <div><b>Input cost:</b> ${aiStats.input_cost_usd.toFixed(6)} | <b>Output cost:</b> ${aiStats.output_cost_usd.toFixed(6)} | <b>Total cost:</b> <span className="font-bold text-green-400">${aiStats.total_cost_usd.toFixed(6)}</span></div>
                </div>
              )}

              {ranked.length > 0 && (
                <div className="flex gap-4 items-center">
                  <div>
                    <label className="text-slate-300 text-sm">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="ml-2 px-3 py-1 bg-slate-700 text-white rounded text-sm"
                    >
                      <option value="score">AI Score</option>
                      <option value="priority">Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 text-sm">Top N:</label>
                    <input
                      type="number"
                      min="1"
                      max={ranked.length}
                      value={topN}
                      onChange={(e) => setTopN(parseInt(e.target.value))}
                      className="ml-2 px-3 py-1 bg-slate-700 text-white rounded text-sm w-16"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6 max-w-xl mx-auto">
            <h2 className="text-xl text-white font-bold mb-4">Import Leads from CSV/TSV</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!importBatch.trim()) {
                  alert('You must provide a name for the import batch.');
                  return;
                }
                if (!fileInputRef.current?.files?.[0]) {
                  alert('Select a CSV or TSV file.');
                  return;
                }
                setImportLoading(true);
                const file = fileInputRef.current.files[0];
                Papa.parse(file, {
                  header: true,
                  skipEmptyLines: true,
                  complete: async (results) => {
                    // Apply business filters before importing
                    const rows = results.data as any[];
                    const filtered = filterLeadsRaw(rows).map(row => ({
                      ...row,
                      import_batch: importBatch,
                    }));
                    if (filtered.length === 0) {
                      alert('No leads from the file passed the filters. Nothing was imported.');
                      setImportLoading(false);
                      return;
                    }
                    // Insert into Supabase
                    const { error } = await supabase.from('leads').insert(filtered);
                    if (error) {
                      alert('Import error: ' + error.message);
                    } else {
                      alert('Import completed. Leads imported: ' + filtered.length);
                      setImportBatch('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      fetchLeads();
                    }
                    setImportLoading(false);
                  },
                  error: (err) => {
                    alert('File read error: ' + err.message);
                    setImportLoading(false);
                  },
                  delimiter: file.name.endsWith('.tsv') ? '\t' : ',',
                });
              }}
            >
              <div className="mb-4">
                <label className="block text-slate-300 mb-1">Import batch name</label>
                <input
                  type="text"
                  value={importBatch}
                  onChange={e => setImportBatch(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                  placeholder="E.g.: December 2025 Campaign"
                  disabled={importLoading}
                />
              </div>
              <div className="mb-4">
                <label className="block text-slate-300 mb-1">CSV or TSV file</label>
                <input
                  type="file"
                  accept=".csv,.tsv,text/csv,text/tsv"
                  ref={fileInputRef}
                  className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                  disabled={importLoading}
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-md transition"
                disabled={importLoading}
              >
                {importLoading ? 'Importing...' : 'Import Leads'}
              </button>
            </form>
          </div>
        )}

        {ranked.length > 0 && !loading && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold cursor-pointer select-none" onClick={() => { setSortBy('rank'); setSortDir(sortBy === 'rank' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                      Rank {sortBy === 'rank' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold cursor-pointer select-none" onClick={() => { setSortBy('name'); setSortDir(sortBy === 'name' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                      Name {sortBy === 'name' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold cursor-pointer select-none" onClick={() => { setSortBy('title'); setSortDir(sortBy === 'title' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                      Title {sortBy === 'title' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold cursor-pointer select-none" onClick={() => { setSortBy('company'); setSortDir(sortBy === 'company' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                      Company {sortBy === 'company' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold cursor-pointer select-none" onClick={() => { setSortBy('size'); setSortDir(sortBy === 'size' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                      Size {sortBy === 'size' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="px-6 py-3 text-right text-slate-300 font-semibold cursor-pointer select-none" onClick={() => { setSortBy('score'); setSortDir(sortBy === 'score' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                      Score {sortBy === 'score' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="px-6 py-3 text-right text-slate-300 font-semibold cursor-pointer select-none" onClick={() => { setSortBy('priority'); setSortDir(sortBy === 'priority' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
                      Priority {sortBy === 'priority' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold">Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedLeads.map((lead, i) => (
                    <tr key={lead.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                      <td className="px-6 py-3 text-slate-300">{i + 1}</td>
                      <td className="px-6 py-3 text-white font-medium">
                        {lead.lead_first_name} {lead.lead_last_name}
                      </td>
                      <td className="px-6 py-3 text-slate-300">{lead.lead_job_title}</td>
                      <td className="px-6 py-3 text-slate-300">{lead.account_name}</td>
                      <td className="px-6 py-3 text-slate-300">{lead.company_size}</td>
                      <td className="px-6 py-3 text-right">
                        <span className="font-bold text-green-400">{lead.score}</span>
                      </td>
                      <td className="px-6 py-3 text-slate-400 text-xs">{lead.reasoning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {ranked.length === 0 && leads.length > 0 && (
          <div className="text-center text-slate-400 py-12">
            Click "Start AI Ranking" to generate personalized scores for all leads.
          </div>
        )}
      </div>
    </div>
  );
}
