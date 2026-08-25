import { useEffect, useState } from 'react'
import './index.css'
import useCells from './hooks/useCells'
import BilateralView from './views/BilateralView'
import RiskView from './views/RiskView'
import ArchiveView from './views/ArchiveView'
import ConfigView from './views/ConfigView'
import ResumenView from './views/ResumenView'
import Wordmark from './components/Wordmark'

const VIEWS = ['bilateral', 'resumen', 'riesgos', 'archivo', 'config'];
const VIEW_LABELS = {
  bilateral: 'Bilateral',
  resumen: 'Resumen',
  riesgos: 'Riesgos',
  archivo: 'Archivo',
  config: 'Config',
};

function App() {
  const [currentView, setCurrentView] = useState('bilateral');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const { cells, loading, updateCell } = useCells(!!user);
  const readOnly = user?.role === 'reader';

  const fetchMe = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        setUser(null);
        setAuthError('');
        return;
      }
      const data = await res.json();
      setUser(data.user || null);
      setAuthError('');
    } catch (_err) {
      setUser(null);
      setAuthError('No fue posible validar la sesión.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoginBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser.trim(), password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data?.error || 'Error de autenticación');
        return;
      }
      setUser(data.user || null);
      setLoginPass('');
      setCurrentView('bilateral');
    } catch (_err) {
      setAuthError('No fue posible iniciar sesión.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_err) {
    }
    setUser(null);
    setCurrentView('bilateral');
  };

  const renderView = () => {
    if (loading) return <p className="text-ink-mute">Cargando...</p>;
    switch (currentView) {
      case 'bilateral': return <BilateralView cells={cells} readOnly={readOnly} />;
      case 'resumen': return <ResumenView cells={cells} readOnly={readOnly} />;
      case 'riesgos': return <RiskView cells={cells} readOnly={readOnly} />;
      case 'archivo': return <ArchiveView cells={cells} readOnly={readOnly} />;
      case 'config': return <ConfigView cells={cells} onUpdateCell={updateCell} readOnly={readOnly} currentUser={user} />;
      default: return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EA]">
        <p className="text-ink-mute">Validando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EA] p-4">
        <div className="w-full max-w-md bg-paper border border-ink/10 rounded-sm p-5">
          <div className="mb-4">
            <Wordmark size={28} />
            <h2 className="font-serif text-2xl text-ink mt-3">Acceso al seguimiento</h2>
            <p className="text-sm text-ink-mute mt-1">Ingresa con tu usuario para consultar o editar según tu rol.</p>
          </div>

          <form className="space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs text-ink-mute mb-1">Usuario</label>
              <input
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full px-3 py-2 border border-ink/20 rounded-sm bg-paper"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-ink-mute mb-1">Contraseña</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-3 py-2 border border-ink/20 rounded-sm bg-paper"
                autoComplete="current-password"
                required
              />
            </div>
            {authError && <p className="text-xs text-red-700">{authError}</p>}
            <button
              type="submit"
              disabled={loginBusy || !loginUser.trim() || !loginPass}
              className="w-full px-4 py-2 bg-navy-deep text-paper rounded-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {loginBusy ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-56 bg-navy-deep text-paper flex flex-col py-6 px-3 gap-1">
        <div className="px-3 mb-8">
          <Wordmark size={28} />
        </div>
        {VIEWS.map(view => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            className={`text-left px-3 py-2 text-sm font-sans font-medium tracking-wide cursor-pointer transition-colors ${
              currentView === view
                ? 'bg-white/15 text-paper'
                : 'text-paper/70 hover:bg-white/8 hover:text-paper'
            }`}
          >
            {VIEW_LABELS[view]}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <h2 className="font-serif text-3xl tracking-tight text-ink">
              {VIEW_LABELS[currentView]}
            </h2>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="text-xs text-ink-mute">{user.name || user.username}</span>
              <span className={`text-xs px-2 py-1 rounded-sm ${readOnly ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                {readOnly ? 'Solo lectura' : 'Editor'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs px-3 py-1 rounded-sm border border-ink/20 bg-paper hover:bg-ink/5 cursor-pointer"
              >
                Salir
              </button>
            </div>
          </div>
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;
