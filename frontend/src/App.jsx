import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { StaffLayout } from './components/layout/StaffLayout';
import { LoginPage } from './pages/LoginPage';
import { SubmitComplaintPage } from './pages/SubmitComplaintPage';
import { TrackComplaintPage } from './pages/TrackComplaintPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { CorrelationGraphPage } from './pages/CorrelationGraphPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
        Initializing PulseResolve Intelligence Engine...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Customer Facing Route (No Auth, No Staff Nav) */}
            <Route path="/submit" element={<SubmitComplaintPage />} />
            <Route path="/track" element={<TrackComplaintPage />} />

            {/* Staff Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Staff Protected Workspace */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <StaffLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="incidents" element={<IncidentsPage />} />
              <Route path="incidents/:id" element={<IncidentDetailPage />} />
              <Route path="complaints" element={<ComplaintsPage />} />
              <Route path="correlation" element={<CorrelationGraphPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
