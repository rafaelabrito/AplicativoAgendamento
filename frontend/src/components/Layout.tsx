import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.tipo === 'Administrador';
  const isAtendente = user?.tipo === 'Atendente';

  const navStyle = (path: string) => {
    const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return {
      padding: '7px 12px',
      borderRadius: 8,
      color: '#fff',
      background: isActive ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.08)',
      fontWeight: isActive ? 700 : 500,
      border: isActive ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
    } as const;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          color: '#fff',
          padding: '14px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.25)',
          background: 'linear-gradient(120deg, #4f46e5 0%, #7c3aed 60%, #6d28d9 100%)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '22px', letterSpacing: '-0.3px' }}>Agendamentos</div>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <Link style={navStyle('/dashboard')} to="/dashboard">Dashboard</Link>
            <Link style={navStyle('/usuarios')} to="/usuarios">Usuários</Link>
            <Link style={navStyle('/agendamentos')} to="/agendamentos">Agendamentos</Link>
            {isAdmin && <Link style={navStyle('/disponibilidade')} to="/disponibilidade">Disponibilidade</Link>}
            {(isAdmin || isAtendente) && <Link style={navStyle('/relatorios')} to="/relatorios">Relatórios</Link>}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user && <span style={{ opacity: 0.95 }}>{user.nome || user.email}</span>}
            <button
              onClick={handleLogout}
              style={{
                background: '#fff',
                color: '#6d28d9',
                border: 0,
                padding: '7px 12px',
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main style={{ flex: 1, padding: '22px', background: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 38%, #f8fafc 100%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
