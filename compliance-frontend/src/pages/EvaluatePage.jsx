import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { evaluateProduct } from '../api';

const EMPTY_INGREDIENT = { name: '', concentration: "", unit: '%' };

const CATEGORIES = [
  { value: 'soap', label: 'Body Soap (BIS IS 2888:2004)' },
  { value: 'cookies', label: 'Cookies & Biscuits (FSSAI 2.11.10)' },
  { value: 'talcum', label: 'Talcum Powder (BIS IS 1462:2019)' },
  { value: 'hairoil', label: 'Hair Oil (BIS IS 7123:2019)' },
  { value: 'lotion', label: 'Moisturizing Cream/Lotion (BIS IS 6608:2004)' },
  { value: 'perfume', label: 'Body Spray / Deodorant (BIS IS 8482:2007)' },
];

function EvaluatePage({ user, onLogout, onResult }) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};

  const [productName, setProductName] = useState(prefill.productName || '');
  const [manufacturer, setManufacturer] = useState('');
  const [category, setCategory] = useState(prefill.category || 'soap');
  const [ingredients, setIngredients] = useState(() => {
    if (prefill.ingredients && prefill.ingredients.length > 0) {
      return prefill.ingredients.map(i => ({
        name: i.name || '',
        concentration: i.concentration ?? '',
        unit: i.unit || '%',
      }));
    }
    return [{ ...EMPTY_INGREDIENT }];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addIngredient = () => {
    setIngredients([...ingredients, { ...EMPTY_INGREDIENT }]);
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index, field, value) => {
    const next = [...ingredients];
    next[index][field] = value;
    setIngredients(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!productName.trim()) {
      setError('Product name is required');
      return;
    }

    const validIngredients = ingredients.filter((i) => i.name.trim());
    if (validIngredients.length === 0) {
      setError('Add at least one ingredient');
      return;
    }

    const requestData = {
      productName: productName.trim(),
      category,
      manufacturer: manufacturer.trim() || undefined,
      userId: user.id,
      ingredients: validIngredients.map((i) => ({
        name: i.name.trim(),
        concentration: Number(i.concentration),
        unit: i.unit,
      })),
    };

    setLoading(true);

    try {
      const result = await evaluateProduct(requestData);
      onResult(result, requestData);
      navigate('/results');
    } catch (err) {
      setError(err.message || 'Evaluation failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          {/* Navigation Header */}
          <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-primary/10 bg-white dark:bg-slate-900 px-6 md:px-20 py-4 z-10 sticky top-0">
            <Link to="/" className="flex items-center gap-3">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined">shield_with_heart</span>
              </div>
              <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">ComplianceIQ</h2>
            </Link>
            <div className="flex items-center gap-6">
                <Link to="/history" className="text-sm font-semibold hover:text-primary transition-colors">History</Link>
              {user && (
                <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-6">
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
          
          <main className="flex flex-1 justify-center py-8 px-4 md:px-0">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
              {/* Page Hero/Header */}
              <div className="flex flex-wrap justify-between gap-3 mb-8">
                <div className="flex min-w-72 flex-col gap-2">
                  <h1 className="text-slate-900 dark:text-slate-100 text-4xl font-extrabold leading-tight tracking-tight">New Evaluation</h1>
                  <p className="text-primary font-medium text-lg">Check safety compliance for your formulations</p>
                </div>
              </div>

              {/* Simulation Lab handoff banner */}
              {prefill.fromSimulation && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl mb-4">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">science</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Formulation imported from Simulation Lab</p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Your compliant combination has been pre-filled. Review and hit Evaluate for the full AI-backed report.</p>
                  </div>
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
                </div>
              )}

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  {error}
                </div>
              )}

              {/* Evaluation Form Card */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-primary/10 p-6 md:p-8">
                
                {/* Product Metadata addition to UI */}
                <div className="mb-8 p-4 bg-background-light dark:bg-slate-800/50 rounded-xl border border-transparent">
                  <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100">Product Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Product Name</label>
                        <input className="w-full h-12 px-4 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                            type="text" placeholder="e.g. Premium Bath Soap" value={productName} onChange={(e)=>setProductName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Category</label>
                        <select className="w-full h-12 px-4 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                            value={category} onChange={(e)=>setCategory(e.target.value)}>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Manufacturer (Optional)</label>
                        <input className="w-full h-12 px-4 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                            type="text" placeholder="e.g. Acme Corp" value={manufacturer} onChange={(e)=>setManufacturer(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-slate-900 dark:text-slate-100 text-2xl font-bold tracking-tight">Ingredients List</h2>
                  <span className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{ingredients.length} Active Rules</span>
                </div>

                {/* Ingredients Builder */}
                <div className="space-y-4">
                  {/* Header Row Labels (Hidden on mobile) */}
                  <div className="hidden md:flex gap-4 px-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="flex-[3]">Ingredient Name</div>
                    <div className="flex-[1]">Concentration</div>
                    <div className="flex-[1]">Unit</div>
                    <div className="w-10"></div>
                  </div>

                  {ingredients.map((ing, i) => (
                      <div key={i} className="flex flex-col md:flex-row gap-4 p-4 bg-background-light dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-primary/30 transition-all group">
                        <div className="flex-[3]">
                          <label className="block md:hidden text-xs font-bold text-slate-500 mb-1 uppercase">Ingredient Name</label>
                          <input className="w-full h-12 px-4 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                            placeholder="e.g. Salicylic Acid" type="text" value={ing.name} onChange={(e) => updateIngredient(i, 'name', e.target.value)} />
                        </div>
                        <div className="flex-[1]">
                          <label className="block md:hidden text-xs font-bold text-slate-500 mb-1 uppercase">Concentration</label>
                          <input className="w-full h-12 px-4 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                            placeholder="0.00" type="number" step="any" value={ing.concentration} onChange={(e) => updateIngredient(i, 'concentration', e.target.value)} />
                        </div>
                        <div className="flex-[1]">
                          <label className="block md:hidden text-xs font-bold text-slate-500 mb-1 uppercase">Unit</label>
                          <select className="w-full h-12 px-4 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                             value={ing.unit} onChange={(e) => updateIngredient(i, 'unit', e.target.value)}>
                            <option value="%">%</option>
                            <option value="mg/kg">mg/kg</option>
                            <option value="ppm">ppm</option>
                          </select>
                        </div>
                        <div className="flex items-end md:items-center justify-end w-full md:w-10">
                          {ingredients.length > 1 && (
                            <button type="button" onClick={() => removeIngredient(i)} className="text-slate-400 hover:text-red-500 transition-colors p-2">
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                  ))}

                  {/* Add Ingredient Button */}
                  <button type="button" onClick={addIngredient} className="w-full py-4 mt-2 border-2 border-dashed border-primary/30 rounded-xl flex items-center justify-center gap-2 text-primary font-bold hover:bg-primary/5 hover:border-primary transition-all">
                    <span className="material-symbols-outlined">add_circle</span>
                    Add Ingredient
                  </button>
                </div>

                {/* Footer Actions */}
                <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 text-slate-500 mb-6">
                    <span className="material-symbols-outlined text-primary">info</span>
                    <p className="text-sm">Evaluating against BIS and FSSAI rules</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Evaluate Compliance — full pipeline with AI + DB */}
                    <button type="button" onClick={handleSubmit} disabled={loading} className="flex items-center justify-center gap-3 px-8 py-5 bg-primary text-white rounded-xl font-bold text-lg glow-primary hover:brightness-110 active:scale-[0.98] transition-all">
                      {loading ? (
                        <span>Testing...</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">fact_check</span>
                          Evaluate Compliance
                        </>
                      )}
                    </button>

                    {/* Simulation Mode — lightweight iterative pipeline */}
                    <Link
                      to="/simulation"
                      state={{
                        productName: productName || '',
                        category: category || 'soap',
                        ingredients: ingredients.filter(i => i.name.trim()),
                      }}
                      className="flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-violet-600/25"
                    >
                      <span className="material-symbols-outlined">science</span>
                      Simulation Mode
                    </Link>
                  </div>

                  {/* Helper text under buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <p className="text-xs text-slate-400 text-center">Full compliance report with AI insights</p>
                    <p className="text-xs text-slate-400 text-center">Iterate & optimize formulations interactively</p>
                  </div>
                </div>
              </div>

              {/* Guidelines Preview */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="material-symbols-outlined text-primary mb-3">gavel</span>
                  <h3 className="font-bold mb-1">Legal Accuracy</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Cross-referenced with the latest global regulatory updates.</p>
                </div>
                <div className="p-6 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="material-symbols-outlined text-primary mb-3">speed</span>
                  <h3 className="font-bold mb-1">Real-time Check</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Instant feedback on banned or restricted substances.</p>
                </div>
                <div className="p-6 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="material-symbols-outlined text-primary mb-3">history</span>
                  <h3 className="font-bold mb-1">Audit Trail</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Every evaluation is timestamped and stored for compliance.</p>
                </div>
              </div>
            </div>
          </main>
          
          <footer className="py-10 text-center text-slate-400 text-sm">
            <p>© 2026 ComplianceIQ Solutions. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default EvaluatePage;
