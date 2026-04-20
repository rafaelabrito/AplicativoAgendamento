import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/auth';

interface RoleRouteProps {
  allowed: string[];
}

export default function RoleRoute({ allowed }: RoleRouteProps) {
  const user = useAuth((s) => s.user);

  if (!user?.tipo || !allowed.includes(user.tipo)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
