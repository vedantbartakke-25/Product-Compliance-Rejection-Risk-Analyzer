import React, { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { downloadReport } from '../api';

function ResultsPage({ user, onLogout, result, request }) {
  const navigate = useNavigate();
  const [expandedTest, setExpandedTest] = useState(null);
  const [evalId] = useState(() => Math.floor(Math.random() * 9000) + 1000);

  if (!result || !request) {
    return <Navigate to="/evaluate" replace />;
  }

  // ── Map backend response to local variables ────────────────
  // Backend wraps: { status: "success", data: { product, category, compliance_report: {...} } }
  const apiData = result.data || result;
  const report = apiData.compliance_report || {};

  const riskScore      = report.risk_score ?? 0;
  const status         = report.status || 'UNKNOWN';
  const ruleOutcomes   = report.rule_outcomes || [];
  const aiExplanation  = report.ai_explanation || '';
  const totalViolations  = report.total_violations ?? 0;
  const totalBorderlines = report.total_borderlines ?? 0;
  const totalPasses      = report.total_passes ?? 0;
  const missingDataCount = report.missing_data_count ?? 0;
  const totalTests       = ruleOutcomes.length;

  const isPass = status === 'COMPLIANT';

  // -90deg = 0 risk, 90deg = 100 risk
  const rotation = (riskScore / 100) * 180 - 90;

  const toggleTest = (idx) => {
    setExpandedTest(expandedTest === idx ? null : idx);
  };

  const getStatusColor = (outcome) => {
    if (outcome === 'PASS') return 'text-primary bg-primary/10';
    if (outcome === 'BORDERLINE') return 'text-amber-500 bg-amber-100';
    if (outcome === 'NO_DATA') return 'text-slate-500 bg-slate-100';
    return 'text-red-500 bg-red-100';
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadReport(request);
    } catch {
      alert('Failed to generate PDF report');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-primary/10 bg-white/50 dark:bg-background-dark/50 flex-col">
        <Link to="/" className="p-6 flex items-center gap-3">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined">shield_with_heart</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary">ComplianceIQ</h1>
        </Link>
        <nav className="flex-1 px-4 space-y-2">
          <Link to="/evaluate" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer">
            <span className="material-symbols-outlined">fact_check</span>
            <span>New Evaluation</span>
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-semibold">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Results</span>
          </div>
          <Link to="/history" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer">
            <span className="material-symbols-outlined">history</span>
            <span>History</span>
          </Link>
        </nav>
        <div className="p-6 mt-auto border-t border-primary/10">
          {user && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden font-bold text-primary uppercase">
                    {user.name?.[0] || 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold truncate max-w-[100px]">{user.name?.split(' ')[0]}</p>
                  <p className="text-xs text-primary font-medium">Compliance Tier</p>
                </div>
              </div>
              <button onClick={onLogout} className="text-slate-400 hover:text-primary transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined ml-2" title="Log Out">logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
        <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md border-b border-primary/10 px-4 md:px-8 py-4 flex justify-between items-center">
          <div>
            <nav className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <span>Evaluation</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-primary">Results</span>
            </nav>
            <h2 className="text-2xl font-extrabold flex flex-wrap items-center gap-2">
              Evaluation Results <span className="text-slate-400 font-normal text-lg">#{apiData.evaluation_id || `CIQ-${evalId}`}</span>
            </h2>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button onClick={handleDownloadPdf} className="hidden sm:flex items-center gap-2 px-4 py-2 border border-primary/20 rounded-lg hover:bg-primary/5 transition-all font-semibold text-sm">
              <span className="material-symbols-outlined text-sm">download</span>
              Download PDF
            </button>
            <button onClick={() => navigate('/evaluate')} className="flex items-center gap-2 px-4 md:px-6 py-2 bg-primary text-white rounded-lg hover:brightness-110 transition-all font-bold text-sm shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-sm">add</span>
              New Eval
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Summary Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status & Product Info */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-8 border border-primary/10 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{apiData.product || request.productName}</h3>
                    <p className="text-slate-500 font-medium">Category: {apiData.category || request.category}</p>
                    <p className="text-slate-500 font-medium mt-1">
                        Standard: <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{apiData.standard || (request.category === 'soap' ? 'BIS IS 2888:2004' : request.category === 'talcum' ? 'BIS IS 1462:2019' : request.category === 'hairoil' ? 'BIS IS 7123:2019' : request.category === 'lotion' ? 'BIS IS 6608:2004' : request.category === 'perfume' ? 'BIS IS 8482:2007' : 'FSSAI 2.11.10')}</span>
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-3 px-8 py-4 text-white rounded-xl shadow-xl ${isPass ? 'bg-primary shadow-primary/30' : (status === 'BORDERLINE' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-red-500 shadow-red-500/30')}`}>
                    <span className="material-symbols-outlined text-4xl">{isPass ? 'verified' : (status === 'BORDERLINE' ? 'warning' : 'cancel')}</span>
                    <div className="flex flex-col">
                      <span className="text-4xl font-black tracking-widest">{status}</span>
                      <span className="text-xs font-bold uppercase opacity-80">Final Verification Result</span>
                    </div>
                  </div>
                </div>
                {/* Risk Gauge */}
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-tighter">Risk Score</span>
                  <div className="semi-circle-gauge overflow-hidden">
                    <div className="gauge-fill" style={{ transform: `rotate(${rotation}deg)` }}></div>
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                      <div className="text-center">
                        <span className={`text-3xl font-black ${riskScore >= 50 ? 'text-red-500' : 'text-primary'}`}>{riskScore}</span>
                        <span className="text-xs font-bold text-slate-400 block">/ 100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="ai-glow rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <h4 className="font-bold text-primary tracking-tight">AI SUMMARY</h4>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto mb-4 font-medium whitespace-pre-line">
                  {aiExplanation || "No AI explanation available for this evaluation."}
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-primary/10 flex items-center gap-4">
              <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">checklist</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Total Tests</p>
                <p className="text-2xl font-black">{totalTests}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-primary/10 flex items-center gap-4">
              <div className={`size-12 rounded-lg flex items-center justify-center ${totalViolations > 0 ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                <span className="material-symbols-outlined">{totalViolations > 0 ? 'report' : 'check'}</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Violations</p>
                <p className={`text-2xl font-black ${totalViolations > 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>{totalViolations}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-primary/10 flex items-center gap-4">
              <div className={`size-12 rounded-lg flex items-center justify-center ${totalBorderlines > 0 ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-500'}`}>
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Borderline</p>
                <p className={`text-2xl font-black ${totalBorderlines > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-slate-100'}`}>{totalBorderlines}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-primary/10 flex items-center gap-4">
              <div className="size-12 bg-green-100 rounded-lg flex items-center justify-center text-green-500">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Passed</p>
                <p className="text-2xl font-black text-green-600">{totalPasses}</p>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="font-bold text-lg">Test Matrix — Rule Outcomes</h4>
              <div className="flex gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600 dark:bg-slate-800 dark:text-slate-300">All {totalTests}</span>
                {totalViolations > 0 && <span className="flex items-center gap-1 text-xs font-bold bg-red-100 px-2 py-1 rounded text-red-600">{totalViolations} Fail</span>}
                {totalBorderlines > 0 && <span className="flex items-center gap-1 text-xs font-bold bg-amber-100 px-2 py-1 rounded text-amber-600">{totalBorderlines} Borderline</span>}
                {missingDataCount > 0 && <span className="flex items-center gap-1 text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">{missingDataCount} No Data</span>}
              </div>
            </div>

            <div className="space-y-3">
              {ruleOutcomes.map((test, index) => {
                const isExpanded = expandedTest === index;
                let colorClasses = '';
                let icon = 'check_circle';

                if (test.outcome === 'PASS') {
                  colorClasses = 'border-primary/20 hover:border-primary/50';
                } else if (test.outcome === 'BORDERLINE') {
                  colorClasses = 'border-amber-300';
                  icon = 'warning';
                } else if (test.outcome === 'NO_DATA') {
                  colorClasses = 'border-slate-300';
                  icon = 'help_outline';
                } else {
                  colorClasses = 'border-red-300';
                  icon = 'cancel';
                }

                return (
                  <div key={index} className={`group bg-white dark:bg-slate-900 border rounded-xl p-4 transition-all shadow-sm ${colorClasses}`}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleTest(index)}>
                      <div className="flex items-center gap-4">
                        <div className={`size-10 rounded-lg flex items-center justify-center ${getStatusColor(test.outcome)}`}>
                          <span className="material-symbols-outlined">{icon}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{test.rule_name}</p>
                          <p className="text-sm text-slate-500">{test.test_module} — {test.rule_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:gap-8">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-bold text-slate-400 uppercase">Actual</p>
                          <p className="font-bold">{test.actual_value !== null && test.actual_value !== undefined ? `${Number(test.actual_value).toFixed(4)}%` : 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase">Result</p>
                          <p className={`font-black uppercase ${test.outcome === 'PASS' ? 'text-primary' : (test.outcome === 'BORDERLINE' ? 'text-amber-500' : (test.outcome === 'NO_DATA' ? 'text-slate-500' : 'text-red-500'))}`}>
                            {test.outcome}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                      </div>
                    </div>
                    {/* Expanded details */}
                    {isExpanded && (
                       <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                           <div className="p-3 bg-slate-50 dark:bg-background-dark/50 rounded-lg">
                             <p className="text-xs font-bold text-slate-400 uppercase mb-1">Actual Value</p>
                             <p className="text-lg font-bold">{test.actual_value !== null && test.actual_value !== undefined ? `${Number(test.actual_value).toFixed(4)}%` : 'N/A'}</p>
                           </div>
                           <div className="p-3 bg-slate-50 dark:bg-background-dark/50 rounded-lg">
                             <p className="text-xs font-bold text-slate-400 uppercase mb-1">Limit</p>
                             <p className="text-lg font-bold">{test.limit_value !== null && test.limit_value !== undefined ? `${Number(test.limit_value).toFixed(4)}%` : 'N/A'}</p>
                           </div>
                           <div className="p-3 bg-slate-50 dark:bg-background-dark/50 rounded-lg">
                             <p className="text-xs font-bold text-slate-400 uppercase mb-1">Deviation</p>
                             <p className="text-lg font-bold">{test.deviation_pct !== null && test.deviation_pct !== undefined ? `${Number(test.deviation_pct).toFixed(2)}%` : 'N/A'}</p>
                           </div>
                           <div className={`p-3 rounded-lg ${test.outcome === 'PASS' ? 'bg-primary/5' : (test.outcome === 'BORDERLINE' ? 'bg-amber-50' : (test.outcome === 'NO_DATA' ? 'bg-slate-100' : 'bg-red-50'))}`}>
                             <p className={`text-xs font-bold uppercase mb-1 ${test.outcome === 'PASS' ? 'text-primary' : (test.outcome === 'BORDERLINE' ? 'text-amber-600' : (test.outcome === 'NO_DATA' ? 'text-slate-500' : 'text-red-600'))}`}>Severity</p>
                             <p className={`text-lg font-bold ${test.outcome === 'PASS' ? 'text-primary' : (test.outcome === 'BORDERLINE' ? 'text-amber-600' : (test.outcome === 'NO_DATA' ? 'text-slate-500' : 'text-red-600'))}`}>{test.severity || 'N/A'}</p>
                           </div>
                         </div>
                         <div className="p-3 bg-slate-50 dark:bg-background-dark/50 rounded-lg">
                           <p className="text-xs font-bold text-slate-400 uppercase mb-1">Reasoning</p>
                           <p className="text-sm text-slate-700 dark:text-slate-300">{test.reasoning || 'No reasoning provided'}</p>
                         </div>
                       </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Breakdown */}
          {report.risk_breakdown && report.risk_breakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-primary/10 shadow-sm">
              <h4 className="font-bold text-lg mb-4">Risk Score Breakdown</h4>
              <div className="space-y-2">
                {report.risk_breakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize w-[250px] md:w-auto truncate">{(item.reason || "").replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="text-xs text-slate-500 max-w-sm truncate" title={item.details}>{item.details}</span>
                    </div>
                    <span className="text-sm font-black text-red-500">+{item.points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shelf Life Prediction CTA — only for low-risk compliant/borderline products */}
          {status !== 'NON-COMPLIANT' && riskScore <= 20 && (
            <div className="relative bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-xl p-8 border border-emerald-500/20 shadow-sm overflow-hidden">
              <div className="absolute -right-8 -top-8 opacity-5">
                <span className="material-symbols-outlined" style={{ fontSize: '160px' }}>science</span>
              </div>
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="size-14 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-emerald-600 text-3xl">labs</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                      Product Eligible for Shelf Life Prediction
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                      Your product passed compliance with low risk — estimate how long it will survive under different 
                      storage conditions using our multi-mode degradation simulation engine.
                    </p>
                  </div>
                </div>
                <Link
                  to="/shelf-life"
                  state={{
                    productName: apiData.product || request.productName,
                    category: apiData.category || request.category,
                    ingredients: request.ingredients,
                    evaluationId: apiData.evaluation_id || null,
                  }}
                  className="flex-shrink-0"
                >
                  <button className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-emerald-600/30 text-base">
                    <span className="material-symbols-outlined">science</span>
                    Predict Shelf Life
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </Link>
              </div>
            </div>
          )}

          <footer className="bg-primary/5 border border-primary/20 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase">Timestamp</span>
                <span className="text-sm font-semibold">{new Date().toLocaleString()}</span>
              </div>
              <div className="flex flex-col border-l border-primary/20 pl-6">
                <span className="text-xs font-bold text-slate-500 uppercase">Evaluator</span>
                <span className="text-sm font-semibold">ComplianceIQ Engine</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 italic">This is an electronically generated compliance report.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default ResultsPage;
