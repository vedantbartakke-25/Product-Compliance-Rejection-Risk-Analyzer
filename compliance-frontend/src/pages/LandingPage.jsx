import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage({ user, onLogout }) {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        {/* Header */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-primary/10 px-6 md:px-20 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined">shield_with_heart</span>
            </div>
            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-extrabold leading-tight tracking-tight">ComplianceIQ</h2>
          </Link>
          <div className="hidden md:flex flex-1 justify-center gap-10">
            <a className="text-sm font-semibold hover:text-primary transition-colors" href="#process">Process</a>
            <a className="text-sm font-semibold hover:text-primary transition-colors" href="#technology">Technology</a>
            <a className="text-sm font-semibold hover:text-primary transition-colors" href="#features">Features</a>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
               <>
                 <Link to="/evaluate" className="hidden sm:flex min-w-[120px] cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                   Dashboard
                 </Link>
                 <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.name?.split(' ')[0]}</p>
                    </div>
                    <button onClick={onLogout} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Log Out">
                      <span className="material-symbols-outlined">logout</span>
                    </button>
                 </div>
               </>
            ) : (
               <>
                 <Link to="/login" className="text-sm font-semibold hover:text-primary transition-colors hidden sm:block">Sign In</Link>
                 <Link to="/signup" className="hidden sm:flex min-w-[120px] cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                   Get Started
                 </Link>
               </>
            )}
          </div>
        </header>
        <main className="flex-1">
          {/* Hero Section */}
          <section className="px-6 md:px-20 py-16 md:py-24 max-w-[1280px] mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="flex flex-col gap-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider w-fit">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  AI Verified
                </div>
                <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-slate-100">
                  The Journey to <span className="text-primary italic">Certified</span> Compliance
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-[540px]">
                  Follow our interactive process from raw ingredient analysis to the final digital certification.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to={user ? "/evaluate" : "/signup"} className="flex min-w-[180px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 bg-primary text-white text-lg font-bold shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:brightness-110 transition-all">
                    <span className="material-symbols-outlined mr-2">rocket_launch</span>
                    Start Evaluation
                  </Link>
                  <Link to={user ? "/history" : "/login"} className="flex min-w-[180px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-primary/30 transition-all">
                    <span className="material-symbols-outlined mr-2">history</span>
                    View History
                  </Link>
                </div>
              </div>
              {/* Process Flow Diagram */}
              <div className="relative bg-white dark:bg-slate-900/50 rounded-3xl p-8 border border-primary/10 shadow-lg shadow-primary/5">
                <div className="flex flex-col gap-12 relative">
                  <div className="flex items-center gap-6 group">
                    <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-all duration-500">
                      <span className="material-symbols-outlined text-3xl">eco</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">Raw Ingredients</h3>
                      <p className="text-sm text-slate-500">Formulation input details</p>
                    </div>
                    <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined">check_circle</span>
                    </div>
                  </div>
                  <div className="ml-8 w-0.5 h-12 bg-gradient-to-b from-primary to-slate-200 dark:to-slate-800"></div>
                  <div className="flex items-center gap-6 group">
                    <div className="size-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-3xl">biotech</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">Molecular Analysis</h3>
                      <p className="text-sm text-slate-500">AI-powered checks</p>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                      <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                      <div className="w-1.5 h-3 bg-primary rounded-full"></div>
                    </div>
                  </div>
                  <div className="ml-8 w-0.5 h-12 bg-slate-200 dark:border-slate-800"></div>
                  <div className="flex items-center gap-6 group">
                    <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-all duration-500">
                      <span className="material-symbols-outlined text-3xl">verified</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">Digital Certification</h3>
                      <p className="text-sm text-slate-500">Final compliance report</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300">lock</span>
                  </div>
                </div>
                <div className="absolute -z-10 -bottom-6 -right-6 size-48 bg-primary/5 blur-3xl rounded-full"></div>
              </div>
            </div>
          </section>
          {/* How It Works Section */}
          <section id="process" className="bg-slate-50 dark:bg-slate-900/30 py-24 px-6 md:px-20 border-y border-slate-200 dark:border-slate-800">
            <div className="max-w-[1280px] mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <div className="flex flex-col gap-4">
                  <h2 className="text-primary font-bold tracking-widest uppercase text-sm">The Methodology</h2>
                  <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-100">Precision at Every Step</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 max-w-[400px]">
                  Our verification engine ensures that every product meeting the standard is fully compliant with regulations.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-12">
                <div className="flex flex-col gap-6">
                  <div className="text-7xl font-black text-slate-200 dark:text-slate-800 leading-none">01</div>
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">input</span> Intake
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Enter product specifications and ingredients into our system.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="text-7xl font-black text-slate-200 dark:text-slate-800 leading-none">02</div>
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">science</span> Deep Screening
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Ingredients are instantly mapped against BIS, FSSAI, and international standards.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="text-7xl font-black text-slate-200 dark:text-slate-800 leading-none">03</div>
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">workspace_premium</span> Certification
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Receive an exact breakdown of risk scores, violations, and AI insights.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Technology Section */}
          <section id="technology" className="px-6 md:px-20 py-24 max-w-[1280px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-4">Under the Hood</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-100">Powered by 5 Test Modules</h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-[600px] mx-auto mt-4">Each product is evaluated through a multi-stage compliance pipeline.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-primary/10 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
                  <span className="material-symbols-outlined">block</span>
                </div>
                <h4 className="text-lg font-bold mb-2">Ingredient Ban Test</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Detects prohibited substances with zero-tolerance enforcement.</p>
              </div>
              <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-primary/10 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
                  <span className="material-symbols-outlined">speed</span>
                </div>
                <h4 className="text-lg font-bold mb-2">Ingredient Limit Test</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Validates min/max concentrations against regulatory thresholds.</p>
              </div>
              <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-primary/10 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
                  <span className="material-symbols-outlined">groups</span>
                </div>
                <h4 className="text-lg font-bold mb-2">Group Limit Test</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Checks cumulative limits for ingredient groups and classes.</p>
              </div>
              <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-primary/10 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
                  <span className="material-symbols-outlined">compare_arrows</span>
                </div>
                <h4 className="text-lg font-bold mb-2">Interaction Test</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Detects harmful chemical interactions between ingredients.</p>
              </div>
              <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-primary/10 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
                  <span className="material-symbols-outlined">label</span>
                </div>
                <h4 className="text-lg font-bold mb-2">Labeling Compliance</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Verifies labeling rules are met for accurate product declarations.</p>
              </div>
              <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-primary/10 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
                  <span className="material-symbols-outlined">auto_awesome</span>
                </div>
                <h4 className="text-lg font-bold mb-2">AI Summary</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Gemini-powered executive summary with actionable remediation steps.</p>
              </div>
            </div>
          </section>

          {/* Feature Highlights */}
          <section id="features" className="px-6 md:px-20 py-24 max-w-[1280px] mx-auto">
             <div className="text-center mb-16">
               <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-4">Platform Features</h2>
               <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-100">Built for Compliance Teams</h3>
             </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all bg-white dark:bg-slate-900">
                <span className="material-symbols-outlined text-primary text-4xl mb-4">security</span>
                <h4 className="text-xl font-bold mb-3">Immutable Audit</h4>
                <p className="text-slate-600 dark:text-slate-400">Every evaluation is persisted with full rule outcomes, timestamps, and pipeline stage data.</p>
              </div>
              <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all bg-white dark:bg-slate-900">
                <span className="material-symbols-outlined text-primary text-4xl mb-4">public</span>
                <h4 className="text-xl font-bold mb-3">Regulatory Coverage</h4>
                <p className="text-slate-600 dark:text-slate-400">Certified against BIS IS 2888:2004 for soaps and FSSAI 2.11.10 for cookies & biscuits.</p>
              </div>
              <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all bg-white dark:bg-slate-900">
                <span className="material-symbols-outlined text-primary text-4xl mb-4">bolt</span>
                <h4 className="text-xl font-bold mb-3">Real-time Insights</h4>
                <p className="text-slate-600 dark:text-slate-400">Instant risk scoring with BORDERLINE detection within 10% of regulatory limits.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-6 md:px-20 py-20 max-w-[1280px] mx-auto">
            <div className="bg-primary rounded-3xl p-12 md:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
              <div className="relative z-10">
                <h3 className="text-3xl md:text-4xl font-black mb-4">Ready to run your first evaluation?</h3>
                <p className="text-white/80 max-w-lg mx-auto mb-8 text-lg">Get instant compliance insights powered by AI and backed by real regulatory data.</p>
                <Link to={user ? "/evaluate" : "/signup"} className="inline-flex items-center gap-2 px-10 py-4 bg-white text-primary rounded-xl font-bold text-lg hover:bg-slate-50 transition-all shadow-xl">
                  <span className="material-symbols-outlined">rocket_launch</span>
                  Get Started Free
                </Link>
              </div>
            </div>
          </section>
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 px-6 md:px-20 py-12 bg-white dark:bg-background-dark">
          <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="material-symbols-outlined text-lg">verified_user</span>
              <span className="text-sm">© 2026 ComplianceIQ. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-400">
                <Link to="/evaluate" className="hover:text-primary transition-colors">Evaluate</Link>
                <Link to="/history" className="hover:text-primary transition-colors">History</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
