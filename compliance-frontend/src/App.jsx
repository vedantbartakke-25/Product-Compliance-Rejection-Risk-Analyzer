import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import EvaluatePage from './pages/EvaluatePage';
import ResultsPage from './pages/ResultsPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ShelfLifePage from './pages/ShelfLifePage';
import SimulationLabPage from './pages/SimulationLabPage';

function App() {
  const [lastResult, setLastResult] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ciq_user')); } catch { return null; }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('ciq_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ciq_user');
  };

  // removed ProtectedRoute definition

  return (
    <Routes>
      <Route path="/" element={<LandingPage user={user} onLogout={handleLogout} />} />
      <Route path="/login" element={user ? <Navigate to="/evaluate" replace /> : <LoginPage onLogin={handleLogin} />} />
      <Route path="/signup" element={user ? <Navigate to="/evaluate" replace /> : <SignupPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/evaluate" replace /> : <ForgotPasswordPage />} />
      
      <Route path="/evaluate" element={
        user ? (
          <EvaluatePage 
            user={user} 
            onLogout={handleLogout}
            onResult={(result, request) => {
              setLastResult(result);
              setLastRequest(request);
            }} 
          />
        ) : <Navigate to="/login" replace />
      } />
      
      <Route path="/results" element={
        user ? (
          <ResultsPage 
            user={user} 
            onLogout={handleLogout}
            result={lastResult} 
            request={lastRequest} 
          />
        ) : <Navigate to="/login" replace />
      } />
      
      <Route path="/history" element={
        user ? (
          <HistoryPage 
            user={user} 
            onLogout={handleLogout}
          />
        ) : <Navigate to="/login" replace />
      } />
      
      <Route path="/shelf-life" element={
        user ? (
          <ShelfLifePage 
            user={user} 
            onLogout={handleLogout}
          />
        ) : <Navigate to="/login" replace />
      } />
      
      <Route path="/simulation" element={
        user ? (
          <SimulationLabPage 
            user={user} 
            onLogout={handleLogout}
          />
        ) : <Navigate to="/login" replace />
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
