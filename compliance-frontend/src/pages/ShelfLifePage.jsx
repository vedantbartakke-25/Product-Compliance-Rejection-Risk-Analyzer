import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { predictShelfLife } from '../api';

const ENVIRONMENTS = [
  { id: 'room_temp',    name: 'Room Temperature',  temp: 25, humidity: 40, icon: 'home',          desc: 'Standard indoor storage' },
  { id: 'hot_humid',    name: 'Hot & Humid',        temp: 40, humidity: 75, icon: 'thermostat',    desc: 'Tropical / warehouse' },
  { id: 'cold_dry',     name: 'Cold & Dry',         temp: 15, humidity: 30, icon: 'ac_unit',       desc: 'Cool climate storage' },
  { id: 'extreme_heat', name: 'Extreme Heat',       temp: 50, humidity: 60, icon: 'local_fire_department', desc: 'Direct sun / hot transport' },
  { id: 'refrigerated', name: 'Refrigerated',       temp: 5,  humidity: 50, icon: 'kitchen',       desc: 'Fridge storage' },
];

const PACKAGING_OPTIONS = [
  { value: 'AIRTIGHT',    label: 'Airtight',    icon: 'package_2',   desc: 'Vacuum sealed / foil wrapped' },
  { value: 'SEMI_SEALED', label: 'Semi-Sealed', icon: 'inventory_2', desc: 'Standard container / box' },
  { value: 'OPEN',        label: 'Open',        icon: 'open_in_new', desc: 'Exposed / no sealed packaging' },
];

const CONFIDENCE_COLORS = {
  HIGH:   { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  MEDIUM: { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300' },
  LOW:    { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300' },
};

function ShelfLifePage({ user, onLogout }) {
  const location = useLocation();
  const prefill = location.state || {};

  // ── Form State ──
  const [productName] = useState(prefill.productName || '');
  const [category] = useState(prefill.category || '');
  const [ingredients] = useState(prefill.ingredients || []);
  const [evaluationId] = useState(prefill.evaluationId || null);

  const [phValue, setPhValue] = useState('');
  const [waterPercent, setWaterPercent] = useState('');
  const [packagingType, setPackagingType] = useState('SEMI_SEALED');
  const [selectedEnvs, setSelectedEnvs] = useState(new Set(ENVIRONMENTS.map(e => e.id)));

  // ── Results State ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const toggleEnv = (id) => {
    setSelectedEnvs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setError('');
    if (selectedEnvs.size === 0) {
      setError('Select at least one environment');
      return;
    }

    const requestData = {
      productName,
      category,
      userId: user?.id,
      evaluationId: evaluationId || undefined,
      ingredients: ingredients.map(i => ({
        name: i.name,
        concentration: Number(i.concentration),
        unit: i.unit,
      })),
      phValue: phValue !== '' ? Number(phValue) : undefined,
      waterPercent: waterPercent !== '' ? Number(waterPercent) : undefined,
      packagingType,
      environments: Array.from(selectedEnvs),
    };

    setLoading(true);
    try {
      const res = await predictShelfLife(requestData);
      setResults(res.data);
    } catch (err) {
      setError(err.message || 'Prediction failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // ── Bar width helper ──
  const maxBarMonths = results
    ? Math.max(...results.environments.flatMap(e => [e.chemical_months, e.microbial_months, e.physical_months]), 1)
    : 1;
  const barWidth = (months) => `${Math.min(100, (months / maxBarMonths) * 100)}%`;

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
          <Link to="/evaluate" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined">fact_check</span>
            <span>New Evaluation</span>
          </Link>
          <Link to="/results" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Results</span>
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-700 font-semibold">
            <span className="material-symbols-outlined">science</span>
            <span>Shelf Life</span>
          </div>
          <Link to="/history" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined">history</span>
            <span>History</span>
          </Link>
        </nav>
        <div className="p-6 mt-auto border-t border-primary/10">
          {user && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary uppercase">
                  {user.name?.[0] || 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold truncate max-w-[100px]">{user.name?.split(' ')[0]}</p>
                  <p className="text-xs text-primary font-medium">Compliance Tier</p>
                </div>
              </div>
              <button onClick={onLogout} className="text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined ml-2" title="Log Out">logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/10 px-4 md:px-8 py-4 flex justify-between items-center">
          <div>
            <nav className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Link to="/results" className="hover:text-primary transition-colors">Results</Link>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-emerald-600">Shelf Life Prediction</span>
            </nav>
            <h2 className="text-2xl font-extrabold flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600">science</span>
              Shelf Life Prediction
            </h2>
          </div>
          <Link to="/evaluate" className="flex items-center gap-2 px-4 md:px-6 py-2 bg-primary text-white rounded-lg hover:brightness-110 transition-all font-bold text-sm shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-sm">add</span>
            New Eval
          </Link>
        </header>

        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">

          {/* Product Context Card (read-only) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-primary/10 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">inventory</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">{productName || 'Unknown Product'}</h3>
                <p className="text-sm text-slate-500">Category: <span className="text-primary font-medium capitalize">{category}</span>
                  {evaluationId && <span className="ml-3 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Eval #{evaluationId}</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing, i) => (
                <span key={i} className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-slate-600 dark:text-slate-300">
                  {ing.name} <span className="text-slate-400">({ing.concentration} {ing.unit})</span>
                </span>
              ))}
              {ingredients.length === 0 && (
                <span className="text-sm text-slate-400 italic">No ingredients available — navigate from compliance results</span>
              )}
            </div>
          </div>

          {/* Input Parameters Section */}
          {!results && (
            <>
              {/* Additional Parameters */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-emerald-500/20 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-emerald-600">tune</span>
                  <h3 className="font-bold text-lg">Additional Parameters</h3>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold ml-2">Optional — improves accuracy</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* pH Value */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">pH Value (0–14)</label>
                    <div className="relative">
                      <input
                        type="number" step="0.1" min="0" max="14" placeholder="e.g. 9.5"
                        value={phValue}
                        onChange={(e) => setPhValue(e.target.value)}
                        className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">pH</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Affects microbial growth estimation</p>
                  </div>

                  {/* Water % */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Water / Moisture %</label>
                    <div className="relative">
                      <input
                        type="number" step="0.1" min="0" max="100" placeholder="e.g. 12"
                        value={waterPercent}
                        onChange={(e) => setWaterPercent(e.target.value)}
                        className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">%</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">High water accelerates spoilage</p>
                  </div>

                  {/* Packaging Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Packaging Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PACKAGING_OPTIONS.map(pkg => (
                        <button
                          key={pkg.value}
                          type="button"
                          onClick={() => setPackagingType(pkg.value)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center ${
                            packagingType === pkg.value
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700'
                              : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-500'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">{pkg.icon}</span>
                          <span className="text-xs font-bold">{pkg.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment Selection */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-emerald-500/20 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600">public</span>
                    <h3 className="font-bold text-lg">Storage Environments</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEnvs.size === ENVIRONMENTS.length) setSelectedEnvs(new Set());
                      else setSelectedEnvs(new Set(ENVIRONMENTS.map(e => e.id)));
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {selectedEnvs.size === ENVIRONMENTS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {ENVIRONMENTS.map(env => {
                    const selected = selectedEnvs.has(env.id);
                    return (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => toggleEnv(env.id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          selected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 opacity-60'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-2xl ${selected ? 'text-emerald-600' : 'text-slate-400'}`}>{env.icon}</span>
                        <span className="text-sm font-bold">{env.name}</span>
                        <div className="flex gap-2 text-xs text-slate-500">
                          <span>{env.temp}°C</span>
                          <span>•</span>
                          <span>{env.humidity}% RH</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">{env.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error & Submit */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined">error</span>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || ingredients.length === 0}
                  className="flex items-center gap-3 px-10 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-emerald-600/30 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Simulating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">science</span>
                      Predict Shelf Life
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* RESULTS SECTION */}
          {/* ═══════════════════════════════════════════════════════ */}
          {results && (
            <>
              {/* Summary Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white shadow-xl shadow-emerald-600/20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-extrabold mb-1">Shelf Life Prediction Complete</h3>
                    <p className="text-emerald-100 text-sm">
                      Base shelf life: <strong>{results.base_shelf_life_months} months</strong> •
                      Packaging: <strong className="capitalize">{(results.packaging || '').replace('_', '-').toLowerCase()}</strong>
                      {results.ph !== null && results.ph !== undefined && <> • pH: <strong>{results.ph}</strong></>}
                      {results.water_percent !== null && results.water_percent !== undefined && <> • Water: <strong>{results.water_percent}%</strong></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-lg font-bold text-sm ${CONFIDENCE_COLORS[results.overall_confidence]?.bg || 'bg-slate-100'} ${CONFIDENCE_COLORS[results.overall_confidence]?.text || 'text-slate-700'}`}>
                      {results.overall_confidence} Confidence
                    </div>
                    <button
                      onClick={() => setResults(null)}
                      className="px-4 py-2 bg-white/20 rounded-lg font-semibold text-sm hover:bg-white/30 transition-colors"
                    >
                      Modify Inputs
                    </button>
                  </div>
                </div>
              </div>

              {/* Environment Result Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.environments.map((env, i) => {
                  const conf = CONFIDENCE_COLORS[env.confidence] || CONFIDENCE_COLORS.LOW;
                  return (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-500/15 shadow-sm overflow-hidden hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-slate-50 to-emerald-50/50 dark:from-slate-800 dark:to-emerald-900/20 px-5 py-4 border-b border-emerald-500/10">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100">{env.environment}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${conf.bg} ${conf.text}`}>
                            {env.confidence}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">thermostat</span>
                            {env.temp_celsius}°C
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">humidity_percentage</span>
                            {env.humidity_percent}% RH
                          </span>
                        </div>
                      </div>

                      {/* Predicted Range */}
                      <div className="px-5 py-5">
                        <div className="text-center mb-5">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Shelf Life</p>
                          <p className="text-4xl font-black text-emerald-600">
                            {env.predicted_min_months}–{env.predicted_max_months}
                            <span className="text-base font-bold text-slate-400 ml-1">months</span>
                          </p>
                        </div>

                        {/* Degradation Breakdown Bars */}
                        <div className="space-y-3">
                          {/* Chemical */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-blue-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">science</span>
                                Chemical
                              </span>
                              <span className="font-bold text-slate-600">{env.chemical_months} mo</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-700"
                                style={{ width: barWidth(env.chemical_months) }}
                              />
                            </div>
                          </div>

                          {/* Microbial */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-purple-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">microbiology</span>
                                Microbial
                              </span>
                              <span className="font-bold text-slate-600">{env.microbial_months} mo</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-700"
                                style={{ width: barWidth(env.microbial_months) }}
                              />
                            </div>
                          </div>

                          {/* Physical */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-orange-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">broken_image</span>
                                Physical
                              </span>
                              <span className="font-bold text-slate-600">{env.physical_months} mo</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-700"
                                style={{ width: barWidth(env.physical_months) }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Limiting Factor */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <span className="material-symbols-outlined text-red-400 text-[16px]">priority_high</span>
                          <span className="text-xs text-slate-500">Limiting factor:</span>
                          <span className="text-xs font-bold text-red-600">{env.limiting_factor}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comparison Table */}
              {results.environments.length > 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-emerald-500/15 shadow-sm overflow-x-auto">
                  <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600">compare</span>
                    Environment Comparison
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-2 font-bold text-slate-500 text-xs uppercase">Environment</th>
                        <th className="text-center py-3 px-2 font-bold text-blue-600 text-xs uppercase">Chemical</th>
                        <th className="text-center py-3 px-2 font-bold text-purple-600 text-xs uppercase">Microbial</th>
                        <th className="text-center py-3 px-2 font-bold text-orange-600 text-xs uppercase">Physical</th>
                        <th className="text-center py-3 px-2 font-bold text-emerald-600 text-xs uppercase">Range</th>
                        <th className="text-center py-3 px-2 font-bold text-red-500 text-xs uppercase">Limiting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.environments.map((env, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-colors">
                          <td className="py-3 px-2 font-semibold text-slate-700 dark:text-slate-200">{env.environment}</td>
                          <td className="py-3 px-2 text-center font-bold text-blue-600">{env.chemical_months} mo</td>
                          <td className="py-3 px-2 text-center font-bold text-purple-600">{env.microbial_months} mo</td>
                          <td className="py-3 px-2 text-center font-bold text-orange-600">{env.physical_months} mo</td>
                          <td className="py-3 px-2 text-center">
                            <span className="font-black text-emerald-600">{env.predicted_min_months}–{env.predicted_max_months}</span>
                            <span className="text-slate-400 ml-1">mo</span>
                          </td>
                          <td className="py-3 px-2 text-center text-xs font-bold text-red-500">{env.limiting_factor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5 flex items-start gap-4">
                <span className="material-symbols-outlined text-amber-500 flex-shrink-0 mt-0.5">info</span>
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">Pre-Lab Estimation Only</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-500/80 leading-relaxed">
                    {results.disclaimer || 'These estimates are for pre-lab planning purposes only.'} These predictions use 
                    rule-based heuristic models derived from known chemical and microbiological degradation principles. 
                    Actual shelf life must be confirmed through accelerated stability testing (ICH Q1A guidelines) 
                    and real-time stability studies.
                  </p>
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}

export default ShelfLifePage;
