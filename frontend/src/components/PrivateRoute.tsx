import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function PrivateRoute() {
  const token = useAuth((s) => s.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
