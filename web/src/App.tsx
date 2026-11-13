import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import { Spinner } from './components/ui';
import { useAuth } from './lib/auth';
import Audit from './pages/Audit';
import Branches from './pages/Branches';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Roles from './pages/Roles';
import Staff from './pages/Staff';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="glass rounded-glass px-6 py-5">
        <Spinner label="Opening your gym" />
      </div>
    </div>
  );
}

function Protected() {
  const { me, loading } = useAuth();
  if (loading) return <Splash />;
  if (!me) return <Navigate to="/login" replace />;
  return <Shell />;
}

export default function App() {
  const { me, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={loading ? <Splash /> : me ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected />}>
        <Route index element={<Overview />} />
        <Route path="branches" element={<Branches />} />
        <Route path="staff" element={<Staff />} />
        <Route path="roles" element={<Roles />} />
        <Route path="audit" element={<Audit />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
