import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHistory } from '../api';

function HistoryPage({ user, onLogout }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await getHistory(user.id);
        // Backend returns { status: "success", data: [...] }
        setHistory(res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [user.id]);

  const getStatusBadge = (record) => {
    const st = record.status;
    if (st === 'COMPLIANT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
          <span className="size-1.5 rounded-full bg-primary"></span> Pass
        </span>
      );
    } else if (st === 'NON-COMPLIANT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
          <span className="size-1.5 rounded-full bg-red-600"></span> Fail
        </span>
      );
    } else if (st === 'BORDERLINE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-600">
          <span className="size-1.5 rounded-full bg-amber-600"></span> Borderline
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
        <span className="size-1.5 rounded-full bg-slate-600"></span> {st}
      </span>
    );
  };

  const getRiskBarColor = (score) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          {/* TopNavBar */}
          <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-primary/10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 md:px-10 py-3 sticky top-0 z-50">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-3 text-primary">
                <div className="size-8 flex items-center justify-center bg-primary rounded-lg text-white">
                  <span className="material-symbols-outlined">shield_with_heart</span>
                </div>
                <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">ComplianceIQ</h2>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/evaluate" className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary text-sm font-semibold transition-colors">Dashboard</Link>
                <Link to="/history" className="text-primary text-sm font-semibold border-b-2 border-primary pb-1">Compliance History</Link>
              </nav>
            </div>
            <div className="flex flex-1 justify-end gap-4 items-center">
              <label className="hidden sm:flex flex-col min-w-40 h-10 max-w-64">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-slate-400 flex items-center justify-center pl-3">
                    <span className="material-symbols-outlined text-xl">search</span>
                  </div>
                  <input className="form-input flex w-full min-w-0 flex-1 border-none bg-transparent focus:ring-0 text-sm placeholder:text-slate-400" placeholder="Search evaluations..." />
                </div>
              </label>
              {user && (
                <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-4">
                   <div className="hidden sm:block text-right">
                       <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.name?.split(' ')[0]}</p>
                   </div>
                   <button onClick={onLogout} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Log Out">
                     <span className="material-symbols-outlined">logout</span>
                   </button>
                </div>
              )}
            </div>
          </header>

          <main className="flex flex-1 justify-center py-8">
            <div className="layout-content-container flex flex-col max-w-[1200px] flex-1 px-6 md:px-10">
              {/* Page Header */}
              <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                <div className="flex flex-col gap-2">
                  <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-extrabold leading-tight tracking-tight">Compliance History</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-base font-medium">Review and manage your organization&apos;s product safety audits.</p>
                </div>
                <div className="flex gap-3">
                  <Link to="/evaluate" className="flex items-center gap-2 rounded-lg h-11 px-5 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                    <span className="material-symbols-outlined text-lg">add_task</span>
                    <span>Run New Audit</span>
                  </Link>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-slate-200 dark:border-slate-800 mb-6">
                <div className="flex gap-8 overflow-x-auto">
                  <div className="flex items-center gap-2 border-b-2 border-primary text-primary pb-4 px-1 cursor-pointer">
                    <span className="text-sm font-bold tracking-wide">All Evaluations</span>
                    <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{history.length}</span>
                  </div>
                </div>
              </div>

              {/* Table Card */}
              {loading ? (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center">
                    <span className="material-symbols-outlined animate-spin text-4xl mb-4 text-primary">autorenew</span>
                    Loading history...
                </div>
              ) : error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                     {error}
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 mt-10 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                    <span className="material-symbols-outlined text-4xl">inventory_2</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No evaluations found</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-8">
                    No compliance records found. Start your first audit to get started.
                  </p>
                  <Link to="/evaluate" className="flex items-center gap-2 rounded-lg h-11 px-8 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                    <span className="material-symbols-outlined text-lg">rocket_launch</span>
                    <span>Start First Evaluation</span>
                  </Link>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Product Name</th>
                          <th className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Category</th>
                          <th className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Risk Score</th>
                          <th className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Risk Level</th>
                          <th className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Violations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {history.map((record, i) => (
                          <tr key={record.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                            <td className="px-6 py-5 text-slate-500 dark:text-slate-400 text-sm font-medium">
                              {new Date(record.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-5 text-slate-900 dark:text-slate-100 text-sm font-bold">
                              {record.product_name}
                            </td>
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {record.category}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                  <div className={`h-full rounded-full ${getRiskBarColor(record.risk_score)}`} style={{ width: `${Math.min(record.risk_score, 100)}%` }}></div>
                                </div>
                                <span className="text-slate-900 dark:text-slate-100 text-sm font-bold">{record.risk_score}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                              {record.risk_level}
                            </td>
                            <td className="px-6 py-5">
                              {getStatusBadge(record)}
                            </td>
                            <td className="px-6 py-5 text-sm font-bold">
                              <span className={record.total_violations > 0 ? 'text-red-500' : 'text-slate-500'}>
                                {record.total_violations}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination area */}
                  <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Showing {history.length} result{history.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
            </div>
          </main>

          <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark py-8 px-10 mt-auto">
            <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-lg">verified_user</span>
                <span className="text-sm">© 2026 ComplianceIQ Systems. All rights reserved.</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;
