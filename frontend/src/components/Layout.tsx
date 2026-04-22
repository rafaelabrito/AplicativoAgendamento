import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

type IconName = 'menu' | 'calendar' | 'dashboard' | 'users' | 'clock' | 'chart' | 'logout' | 'profile';

function Icon({ name, size = 20, color = 'currentColor' }: { name: IconName; size?: number; color?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M3 10h18" />
          <path d="M8 14h3" />
          <path d="M13 14h3" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3" />
          <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 4.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 16v-5" />
          <path d="M12 16V8" />
          <path d="M17 16v-9" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.tipo === 'Administrador';
  const isAtendente = user?.tipo === 'Atendente';
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1280;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' as const, visible: true },
    { path: '/usuarios', label: 'Usuários', icon: 'users' as const, visible: true },
    { path: '/agendamentos', label: 'Agendamentos', icon: 'calendar' as const, visible: true },
    { path: '/disponibilidade', label: 'Disponibilidade', icon: 'clock' as const, visible: isAdmin },
    { path: '/relatorios', label: 'Relatórios', icon: 'chart' as const, visible: isAdmin || isAtendente },
  ].filter((item) => item.visible);

  const navStyle = (path: string) => {
    const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: isSidebarOpen ? 'flex-start' : 'center',
      gap: 12,
      width: '100%',
      padding: '11px 12px',
      borderRadius: 10,
      color: '#e2e8f0',
      background: isActive ? 'linear-gradient(135deg, #334155 0%, #1e293b 100%)' : 'transparent',
      fontWeight: isActive ? 700 : 500,
      border: isActive ? '1px solid rgba(148,163,184,0.4)' : '1px solid transparent',
      textDecoration: 'none',
      transition: 'all 0.2s ease',
    } as const;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f1f5f9' }}>
      <aside
        style={{
          width: isSidebarOpen ? 248 : 84,
          background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)',
          color: '#e2e8f0',
          padding: 14,
          borderRight: '1px solid #334155',
          position: 'sticky',
          top: 0,
          height: '100vh',
          transition: 'width 0.22s ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarOpen ? 'flex-start' : 'center',
            gap: 12,
            padding: '8px 6px 16px',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #34d399 0%, #6366f1 100%)',
              boxShadow: '0 10px 24px rgba(79,70,229,0.28)',
              flexShrink: 0,
            }}
            title="Agenda"
          >
            <Icon name="calendar" color="#ffffff" size={22} />
          </div>
          {isSidebarOpen && (
            <span style={{ color: '#f8fafc', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>
              Agendamentos
            </span>
          )}
        </div>

        <nav style={{ display: 'grid', gap: 6 }}>
          {navItems.map((item) => (
            <Link key={item.path} style={navStyle(item.path)} to={item.path} title={item.label} aria-label={item.label}>
              <Icon name={item.icon} color="currentColor" size={20} />
              {isSidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 20px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsSidebarOpen((current) => !current)}
                aria-label={isSidebarOpen ? 'Ocultar menu lateral' : 'Abrir menu lateral'}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#334155',
                }}
              >
                <Icon name="menu" size={20} color="currentColor" />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                aria-label="Avatar do usuário"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: '#e2e8f0',
                  border: '1px solid #cbd5e1',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#475569',
                }}
              >
                <Icon name="profile" size={18} color="currentColor" />
              </div>
              {user && <span style={{ color: '#334155', fontWeight: 600 }}>{user.nome || user.email}</span>}
              <button
                onClick={handleLogout}
                style={{
                  background: '#eef2ff',
                  color: '#3730a3',
                  border: '1px solid #c7d2fe',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon name="logout" size={16} color="currentColor" />
                Sair
              </button>
            </div>
          </div>
        </header>

        <main style={{ padding: '22px', background: '#f1f5f9' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
