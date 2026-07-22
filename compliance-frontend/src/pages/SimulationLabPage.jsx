import React, { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { runSimulation } from '../api';

const EMPTY_INGREDIENT = { name: '', concentration: '', unit: '%' };
const CATEGORIES = [
  { value: 'soap', label: 'Body Soap' },
  { value: 'cookies', label: 'Cookies & Biscuits' },
  { value: 'talcum', label: 'Talcum Powder' },
  { value: 'hairoil', label: 'Hair Oil' },
  { value: 'lotion', label: 'Body Lotion' },
  { value: 'perfume', label: 'Perfume / Fragrance' },
];

function SimulationLabPage({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = location.state || {};
  const resultsRef = useRef(null);

  // ── Form State ──
  const [productName, setProductName] = useState(prefill.productName || '');
  const [category, setCategory] = useState(prefill.category || '');
  const [ingredients, setIngredients] = useState(() => {
    if (prefill.ingredients && prefill.ingredients.length > 0) {
      return prefill.ingredients.map(i => ({
        name: i.name || '', concentration: i.concentration ?? '', unit: i.unit || '%',
      }));
    }
    return [{ ...EMPTY_INGREDIENT }];
  });

  // ── Simulation State ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [versions, setVersions] = useState([]);       // full version history
  const [selectedCompare, setSelectedCompare] = useState(null); // index to compare

  const latestResult = versions.length > 0 ? versions[versions.length - 1] : null;

  // ── Ingredient Management ──
  const updateIngredient = (idx, field, value) => {
    setIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing));
  };
  const addIngredient = () => setIngredients(prev => [...prev, { ...EMPTY_INGREDIENT }]);
  const removeIngredient = (idx) => {
    if (ingredients.length <= 1) return;
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Run Simulation ──
  const handleSimulate = async () => {
    setError('');
    const validIngredients = ingredients.filter(i => i.name.trim() && Number(i.concentration) > 0);
    if (!category) return setError('Select a category');
    if (validIngredients.length === 0) return setError('Add at least one ingredient');

    const previousVersion = latestResult ? {
      ingredients: latestResult.request_ingredients,
      riskScore: latestResult.compliance.risk_score,
      status: latestResult.compliance.status,
      totalViolations: latestResult.compliance.total_violations,
      totalBorderlines: latestResult.compliance.total_borderlines,
      ruleOutcomes: (latestResult.compliance.rule_outcomes || []).map(o => ({
        rule_id: o.rule_id,
        outcome: o.outcome,
        actual_value: o.actual_value,
        rule_name: o.rule_name,
      })),
    } : undefined;

    setLoading(true);
    try {
      const res = await runSimulation({
        productName: productName || 'Untitled Product',
        category,
        ingredients: validIngredients.map(i => ({
          name: i.name, concentration: Number(i.concentration), unit: i.unit,
        })),
        previousVersion,
      });

      const version = {
        number: versions.length + 1,
        timestamp: new Date().toLocaleTimeString(),
        request_ingredients: validIngredients.map(i => ({
          name: i.name, concentration: Number(i.concentration), unit: i.unit,
        })),
        ...res.data,
      };

      setVersions(prev => [...prev, version]);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Apply Suggestion ──
  const applySuggestion = (suggestion) => {
    setIngredients(prev => {
      const updated = prev.map(ing => {
        const ingNameLower = ing.name.toLowerCase().trim();

        // Priority 1: Match via input_name (the user's original typed name, e.g., "Lye")
        if (suggestion.input_name && ingNameLower === suggestion.input_name.toLowerCase().trim()) {
          if (suggestion.type === 'REMOVE') return null;
          return { ...ing, concentration: suggestion.suggested_value };
        }

        // Priority 2: Match via rule_name containing ingredient name or vice versa
        const ruleLower = (suggestion.target_ingredient || '').toLowerCase();
        if (ingNameLower && (ruleLower.includes(ingNameLower) || ingNameLower.includes(ruleLower.split('(')[0].trim()))) {
          if (suggestion.type === 'REMOVE') return null;
          return { ...ing, concentration: suggestion.suggested_value };
        }

        return ing;
      }).filter(Boolean);

      if (suggestion.type === 'REMOVE' && updated.length === 0) {
        return [{ ...EMPTY_INGREDIENT }];
      }
      return updated;
    });
  };

  // ── Helpers ──
  const getRiskColor = (score) => {
    if (score >= 50) return 'text-red-500';
    if (score >= 20) return 'text-amber-500';
    return 'text-emerald-500';
  };
  const getStatusBadge = (status) => {
    if (status === 'COMPLIANT') return { bg: 'bg-emerald-100 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', icon: 'verified' };
    if (status === 'BORDERLINE') return { bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', icon: 'warning' };
    return { bg: 'bg-red-100 dark:bg-red-500/15', text: 'text-red-700 dark:text-red-400', icon: 'cancel' };
  };

  // ── Navigate to full evaluation with current formulation pre-filled ──
  const handleFinalEvaluation = () => {
    const validIngredients = ingredients.filter(i => i.name.trim() && Number(i.concentration) > 0);
    navigate('/evaluate', {
      state: {
        fromSimulation: true,
        productName: productName || 'Untitled Product',
        category,
        ingredients: validIngredients.map(i => ({
          name: i.name,
          concentration: Number(i.concentration),
          unit: i.unit,
        })),
      },
    });
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
          <Link to="/evaluate" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined">fact_check</span>
            <span>New Evaluation</span>
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-400 font-semibold">
            <span className="material-symbols-outlined">science</span>
            <span>Simulation Lab</span>
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
        <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-violet-500/10 px-4 md:px-8 py-4 flex justify-between items-center">
          <div>
            <nav className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Link to="/evaluate" className="hover:text-primary transition-colors">Evaluate</Link>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-violet-600">Simulation Lab</span>
            </nav>
            <h2 className="text-2xl font-extrabold flex items-center gap-3">
              <span className="material-symbols-outlined text-violet-600">science</span>
              Virtual Reformulation Lab
              {versions.length > 0 && (
                <span className="text-sm font-medium bg-violet-100 dark:bg-violet-500/15 text-violet-600 px-3 py-1 rounded-full">
                  {versions.length} version{versions.length > 1 ? 's' : ''}
                </span>
              )}
            </h2>
          </div>
          <div className="flex gap-2">
            {latestResult && (
              <button onClick={() => { setVersions([]); setError(''); }} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-semibold">
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                Reset Lab
              </button>
            )}
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">

          {/* ═══════════════════════════════════════════════════ */}
          {/* SPLIT PANEL: Editor + Results */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── LEFT: Ingredient Editor ── */}
            <div className="space-y-4">
              {/* Product Info */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-violet-500/15 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Product Name</label>
                    <input
                      type="text" placeholder="e.g. Premium Bath Soap"
                      value={productName} onChange={e => setProductName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Category</label>
                    <select
                      value={category} onChange={e => setCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    >
                      <option value="">Select category...</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-violet-500/15 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-600 text-lg">biotech</span>
                    Ingredients
                  </h3>
                  <button onClick={addIngredient} className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors">
                    <span className="material-symbols-outlined text-sm">add</span> Add
                  </button>
                </div>

                <div className="space-y-2">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text" placeholder="Ingredient name"
                        value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)}
                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      />
                      <input
                        type="number" step="any" placeholder="Value"
                        value={ing.concentration} onChange={e => updateIngredient(idx, 'concentration', e.target.value)}
                        className="w-24 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-right focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      />
                      <select
                        value={ing.unit} onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                        className="w-20 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      >
                        <option value="%">%</option>
                        <option value="ppm">ppm</option>
                        <option value="mg/kg">mg/kg</option>
                      </select>
                      <button onClick={() => removeIngredient(idx)} className="text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined">error</span>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Run Button */}
              <button
                onClick={handleSimulate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-violet-600 text-white rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-violet-600/30 text-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Simulating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">science</span>
                    {versions.length === 0 ? 'Run First Simulation' : `Run V${versions.length + 1}`}
                  </>
                )}
              </button>
            </div>

            {/* ── RIGHT: Results Panel ── */}
            <div ref={resultsRef} className="space-y-4">
              {!latestResult ? (
                /* Empty state */
                <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-violet-500/20 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                  <div className="size-20 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-violet-500 text-4xl">labs</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">Your Virtual Lab Awaits</h3>
                  <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                    Add your ingredients on the left and run a simulation. The system will analyze compliance, suggest optimizations, and track your experiment history.
                  </p>
                </div>
              ) : (
                <>
                  {/* Risk Score & Status */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-violet-500/15 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Version {latestResult.number}</span>
                      <span className="text-xs text-slate-400">{latestResult.duration_ms}ms</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className={`text-5xl font-black ${getRiskColor(latestResult.compliance.risk_score)}`}>
                          {latestResult.compliance.risk_score}
                        </p>
                        <p className="text-xs font-bold text-slate-400 mt-1">RISK / 100</p>
                      </div>
                      <div className="flex-1">
                        {(() => {
                          const badge = getStatusBadge(latestResult.compliance.status);
                          return (
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${badge.bg} ${badge.text} font-bold`}>
                              <span className="material-symbols-outlined">{badge.icon}</span>
                              {latestResult.compliance.status}
                            </div>
                          );
                        })()}
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="size-2 bg-red-500 rounded-full" />
                            {latestResult.compliance.total_violations} violations
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="size-2 bg-amber-500 rounded-full" />
                            {latestResult.compliance.total_borderlines} borderline
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="size-2 bg-emerald-500 rounded-full" />
                            {latestResult.compliance.total_passes} pass
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delta Analysis (only if delta exists) */}
                  {latestResult.delta && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-violet-500/15 shadow-sm">
                      <h4 className="font-bold text-sm flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-violet-600 text-lg">compare_arrows</span>
                        Delta Analysis
                        <span className="text-xs font-medium bg-violet-100 dark:bg-violet-500/15 text-violet-600 px-2 py-0.5 rounded-full">
                          V{latestResult.number - 1} → V{latestResult.number}
                        </span>
                      </h4>

                      {/* Summary metrics */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className={`text-2xl font-black ${latestResult.delta.summary.risk_score_delta > 0 ? 'text-emerald-500' : latestResult.delta.summary.risk_score_delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {latestResult.delta.summary.risk_score_delta > 0 ? '−' : latestResult.delta.summary.risk_score_delta < 0 ? '+' : ''}{Math.abs(latestResult.delta.summary.risk_score_delta)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Risk Change</p>
                        </div>
                        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className={`text-2xl font-black ${latestResult.delta.summary.violations_delta > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {latestResult.delta.summary.violations_delta > 0 ? '−' : ''}{Math.abs(latestResult.delta.summary.violations_delta)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Violations Δ</p>
                        </div>
                        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-2xl font-black text-violet-600">{latestResult.delta.summary.ingredients_modified}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Modified</p>
                        </div>
                      </div>

                      {/* Status change */}
                      {latestResult.delta.summary.status_change.old !== latestResult.delta.summary.status_change.new && (
                        <div className="flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-500/10 rounded-lg mb-3">
                          <span className="material-symbols-outlined text-violet-600">swap_horiz</span>
                          <span className="text-sm font-semibold">
                            Status: <span className="text-red-500">{latestResult.delta.summary.status_change.old}</span>
                            {' → '}
                            <span className="text-emerald-500">{latestResult.delta.summary.status_change.new}</span>
                          </span>
                        </div>
                      )}

                      {/* Ingredient changes */}
                      <div className="space-y-2">
                        {latestResult.delta.ingredient_changes.map((change, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                            <span className={`material-symbols-outlined text-base ${
                              change.action === 'MODIFIED' ? 'text-violet-500' :
                              change.action === 'ADDED' ? 'text-emerald-500' :
                              'text-red-500'
                            }`}>
                              {change.action === 'MODIFIED' ? 'edit' : change.action === 'ADDED' ? 'add_circle' : 'remove_circle'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold">{change.name}</span>
                              {change.action === 'MODIFIED' && (
                                <span className="text-slate-400 ml-1">
                                  {change.old_value}{change.old_unit} → {change.new_value}{change.new_unit}
                                  {change.change_pct !== null && (
                                    <span className={`ml-1 font-bold ${change.change_pct > 0  ? 'text-emerald-500' : 'text-red-500'}`}>
                                      ({change.change_pct > 0 ? '+' : ''}{change.change_pct}%)
                                    </span>
                                  )}
                                </span>
                              )}
                              {change.action === 'ADDED' && (
                                <span className="text-emerald-500 ml-1">+{change.new_value}{change.new_unit}</span>
                              )}
                              {change.action === 'REMOVED' && (
                                <span className="text-red-500 ml-1">removed</span>
                              )}
                            </div>
                            {/* Impact */}
                            {change.impact?.outcomes_changed?.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {change.impact.outcomes_changed.map((flip, j) => (
                                  <span key={j} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    flip.new_outcome === 'PASS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
                                    'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                                  }`}>
                                    {flip.old_outcome}→{flip.new_outcome}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {latestResult.suggestions && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-violet-500/15 shadow-sm">
                      <h4 className="font-bold text-sm flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-amber-500 text-lg">lightbulb</span>
                        Optimization Suggestions
                        {latestResult.suggestions.suggestions.length === 0 && (
                          <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full">
                            All clear — no issues
                          </span>
                        )}
                      </h4>

                      {latestResult.suggestions.suggestions.length === 0 ? (
                        <div className="text-center py-4">
                          <span className="material-symbols-outlined text-emerald-400 text-3xl mb-2">check_circle</span>
                          <p className="text-sm text-slate-500">All rules pass — no optimization needed!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {latestResult.suggestions.suggestions.map((sug) => (
                            <div key={sug.id} className={`p-3 rounded-lg border-l-4 ${
                              sug.priority === 'CRITICAL' ? 'border-red-500 bg-red-50 dark:bg-red-500/10' :
                              sug.priority === 'HIGH' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' :
                              'border-blue-400 bg-blue-50 dark:bg-blue-500/10'
                            }`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      sug.priority === 'CRITICAL' ? 'bg-red-200 text-red-700' :
                                      sug.priority === 'HIGH' ? 'bg-amber-200 text-amber-700' :
                                      'bg-blue-200 text-blue-700'
                                    }`}>{sug.priority}</span>
                                    <span className="text-xs font-bold uppercase text-slate-500">{sug.type}</span>
                                  </div>
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{sug.reason}</p>
                                  <p className="text-xs text-slate-400 mt-1">Expected: {sug.estimated_outcome}</p>
                                </div>
                                <button
                                  onClick={() => applySuggestion(sug)}
                                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm">auto_fix</span>
                                  Apply
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Final Evaluation CTA — shown when formulation is compliant */}
                  {latestResult.compliance.status === 'COMPLIANT' && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-xl p-6 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="size-14 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-3xl">verified</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-base">Formulation Ready!</h4>
                          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1 max-w-xs leading-relaxed">
                            Your combination passes all compliance checks. Run the full evaluation to get an AI-generated report, compliance certificate, and persist it to your history.
                          </p>
                        </div>
                        <button
                          onClick={handleFinalEvaluation}
                          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-emerald-600/30 text-sm mt-1"
                        >
                          <span className="material-symbols-outlined">fact_check</span>
                          Go for Final Evaluation
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sensitivity Analysis */}
                  {latestResult.suggestions?.sensitivity?.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-violet-500/15 shadow-sm">
                      <h4 className="font-bold text-sm flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-orange-500 text-lg">insights</span>
                        Sensitivity Analysis
                      </h4>
                      <p className="text-xs text-slate-400 mb-3">Parameters ranked by impact — small changes here cause big compliance shifts.</p>
                      <div className="space-y-2">
                        {latestResult.suggestions.sensitivity.slice(0, 6).map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold">{item.ingredient}</span>
                                <span className="text-slate-400">
                                  {item.current?.toFixed?.(4) ?? 'N/A'} / {item.limit?.toFixed?.(4) ?? 'N/A'} {item.type === 'MIN_LIMIT' ? '↑' : '↓'}
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    item.sensitivity_score >= 7 ? 'bg-red-500' :
                                    item.sensitivity_score >= 4 ? 'bg-amber-500' : 'bg-blue-400'
                                  }`}
                                  style={{ width: `${Math.min(100, item.sensitivity_score * 10)}%` }}
                                />
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${
                              item.outcome === 'FAIL' ? 'text-red-500' :
                              item.outcome === 'BORDERLINE' ? 'text-amber-500' : 'text-emerald-500'
                            }`}>{item.outcome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rule Outcomes */}
                  <details className="bg-white dark:bg-slate-900 rounded-xl border border-violet-500/15 shadow-sm">
                    <summary className="p-5 cursor-pointer font-bold text-sm flex items-center gap-2 select-none">
                      <span className="material-symbols-outlined text-slate-400 text-lg">checklist</span>
                      Rule Outcomes ({latestResult.compliance.rule_outcomes?.length || 0} rules)
                    </summary>
                    <div className="px-5 pb-5 space-y-1.5">
                      {(latestResult.compliance.rule_outcomes || []).map((o, i) => (
                        <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                          o.outcome === 'PASS' ? 'bg-emerald-50 dark:bg-emerald-500/5' :
                          o.outcome === 'BORDERLINE' ? 'bg-amber-50 dark:bg-amber-500/5' :
                          o.outcome === 'FAIL' ? 'bg-red-50 dark:bg-red-500/5' : 'bg-slate-50 dark:bg-slate-800'
                        }`}>
                          <span className="font-semibold truncate max-w-[200px]">{o.rule_name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">
                              {o.actual_value !== null && o.actual_value !== undefined ? `${Number(o.actual_value).toFixed(4)}%` : 'N/A'}
                            </span>
                            <span className={`font-black ${
                              o.outcome === 'PASS' ? 'text-emerald-600' :
                              o.outcome === 'BORDERLINE' ? 'text-amber-600' :
                              o.outcome === 'FAIL' ? 'text-red-600' : 'text-slate-400'
                            }`}>{o.outcome}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* VERSION TIMELINE */}
          {/* ═══════════════════════════════════════════════════ */}
          {versions.length > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-violet-500/15 shadow-sm">
              <h4 className="font-bold text-sm flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-violet-600">timeline</span>
                Experiment Timeline
                <span className="text-xs text-slate-400 font-normal ml-2">click any version to view details</span>
              </h4>

              {/* Timeline bar */}
              <div className="flex items-end gap-1 mb-4 h-20">
                {versions.map((v,i) => {
                  const maxRisk = Math.max(...versions.map(x => x.compliance.risk_score), 1);
                  const heightPct = Math.max(5, (v.compliance.risk_score / maxRisk) * 100);
                  const isSelected = selectedCompare === i;
                  const isLatest = i === versions.length - 1;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedCompare(isSelected ? null : i)}
                      className={`flex-1 rounded-t-lg transition-all relative group ${
                        isLatest ? 'bg-violet-500' :
                        isSelected ? 'bg-violet-400' : 'bg-violet-200 dark:bg-violet-500/30 hover:bg-violet-300'
                      }`}
                      style={{ height: `${heightPct}%`, minHeight: '8px' }}
                      title={`V${v.number}: Risk ${v.compliance.risk_score}, ${v.compliance.status}`}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                        {v.compliance.risk_score}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Version labels */}
              <div className="flex gap-1">
                {versions.map((v, i) => {
                  const badge = getStatusBadge(v.compliance.status);
                  return (
                    <div key={i} className="flex-1 text-center">
                      <p className="text-[10px] font-bold text-slate-500">V{v.number}</p>
                      <span className={`material-symbols-outlined text-xs ${badge.text}`}>{badge.icon}</span>
                    </div>
                  );
                })}
              </div>

              {/* Selected version details */}
              {selectedCompare !== null && versions[selectedCompare] && (
                <div className="mt-4 p-4 bg-violet-50 dark:bg-violet-500/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-bold text-sm text-violet-700 dark:text-violet-400">
                      Version {versions[selectedCompare].number} — {versions[selectedCompare].timestamp}
                    </h5>
                    <span className={`text-sm font-bold ${getRiskColor(versions[selectedCompare].compliance.risk_score)}`}>
                      Risk: {versions[selectedCompare].compliance.risk_score}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {versions[selectedCompare].request_ingredients.map((ing, j) => (
                      <span key={j} className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded-full font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {ing.name}: {ing.concentration} {ing.unit}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk progression summary */}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <span className="text-slate-400">Risk journey:</span>
                {versions.map((v, i) => (
                  <React.Fragment key={i}>
                    <span className={`font-bold ${getRiskColor(v.compliance.risk_score)}`}>
                      {v.compliance.risk_score}
                    </span>
                    {i < versions.length - 1 && <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default SimulationLabPage;
