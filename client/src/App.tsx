import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { DialogRoot } from './components/Modal';
import AuthPage from './pages/AuthPage';
import TrackerPage from './pages/TrackerPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-accent font-mono text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <TrackerPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DialogRoot />
    </AuthProvider>
  );
}
