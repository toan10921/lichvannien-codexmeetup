import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, apiRequest } from '../api/client';
import { useAuth } from '../auth/AuthContext';

function HomePage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState('Đang kiểm tra...');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    apiRequest('/api/health')
      .then((response) => {
        if (isMounted) {
          setApiStatus(response.message || 'API is running');
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiStatus('Không kết nối được backend');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup compact">
          <span className="brand-mark" aria-hidden="true">LV</span>
          <span className="brand-name">Lịch Vạn Niên AI</span>
        </div>

        <div className="session-actions">
          <span className="session-name">{user?.name}</span>
          <button className="secondary-button" type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="workspace-panel" aria-labelledby="workspace-title">
          <div className="section-heading">
            <span>Phiên làm việc</span>
            <h1 id="workspace-title">Xin chào, {user?.name}</h1>
          </div>

          <dl className="session-grid">
            <div>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt>Backend</dt>
              <dd>{apiStatus}</dd>
            </div>
            <div>
              <dt>API URL</dt>
              <dd>{API_URL}</dd>
            </div>
            <div>
              <dt>Phiên</dt>
              <dd>{token ? 'Đang hoạt động' : 'Chưa có token'}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
