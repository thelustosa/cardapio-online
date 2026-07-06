import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import StoreSettings from './pages/StoreSettings';
import Register from './pages/Register';
import ItemsPage from './pages/ItemsPage';
import DigitalMenu from './pages/DigitalMenu';
import PublicMenu from './pages/PublicMenu';
import styles from './App.module.css';

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' 
  : 'https://api.zestmenu.com.br';

const Dashboard = () => (
  <>
    <header className={styles.contentHeader}>
      <h2>Dashboard Overview</h2>
      <div className={styles.headerActions}>
        <button className={styles.actionBtn}>Novo Pedido</button>
      </div>
    </header>
    <div className={styles.dashboardGrid}>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Vendas Hoje</span>
        <span className={styles.statValue}>R$ 1.250,00</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Mesas Ativas</span>
        <span className={styles.statValue}>12</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Pedidos Pendentes</span>
        <span className={styles.statValue}>5</span>
      </div>
    </div>
  </>
);

function App() {
  const initialPath = window.location.pathname;
  // If the path is not the root or known paths, assume it's a slug for the public menu
  const isPublicSlug = initialPath !== '/' && initialPath !== '/cadastro' && !initialPath.startsWith('/configuracoes') && !initialPath.startsWith('/cardapio');
  
  const [activePath, setActivePath] = useState(isPublicSlug ? initialPath : '/cadastro');
  const [activeStoreId, setActiveStoreId] = useState(localStorage.getItem('activeStoreId'));
  const [storeData, setStoreData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Theme Management
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('zestMenuTheme') || 'system');

  React.useEffect(() => {
    const applyTheme = (themeValue) => {
      const isDark = 
        themeValue === 'dark' || 
        (themeValue === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      document.documentElement.classList.toggle('dark-theme-root', isDark);
    };

    applyTheme(activeTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const sysThemeChangeListener = () => {
      if (activeTheme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', sysThemeChangeListener);
    return () => mediaQuery.removeEventListener('change', sysThemeChangeListener);
  }, [activeTheme]);

  const changeTheme = (newTheme, event) => {
    localStorage.setItem('zestMenuTheme', newTheme);
    
    // Animação de Círculo Expansivo suportada em navegadores modernos
    if (document.startViewTransition && event) {
      const x = event.clientX;
      const y = event.clientY;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(() => {
        setActiveTheme(newTheme);
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`
            ]
          },
          {
            duration: 600,
            easing: 'ease-out',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      });
    } else {
      setActiveTheme(newTheme);
    }
  };

  // Fetch store data on load or when activeStoreId changes
  React.useEffect(() => {
    const fetchStore = async () => {
      if (!activeStoreId) {
        setActivePath('/cadastro');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/store/${activeStoreId}`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setStoreData(data);
          if (activePath === '/cadastro') setActivePath('/');
        } else {
          localStorage.removeItem('activeStoreId');
          setActiveStoreId(null);
          setActivePath('/cadastro');
        }
      } catch (error) {
        console.error('Error connecting to backend:', error);
      }
    };
    fetchStore();
  }, [activeStoreId]);

  const fetchSecurityTokens = async () => {
    try {
      const csrfRes = await fetch(`${API_BASE_URL}/api/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      
      const nonceRes = await fetch(`${API_BASE_URL}/api/nonce`);
      const { nonce } = await nonceRes.json();
      
      return { csrfToken, nonce };
    } catch(err) {
      console.error('Error fetching security tokens:', err);
      return { csrfToken: '', nonce: ''};
    }
  };

  const handleRegister = async (data) => {
    try {
      const { csrfToken, nonce } = await fetchSecurityTokens();
      
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include', // Both Cookies and Tokens must be sent
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem('activeStoreId', result.storeId);
        setActiveStoreId(result.storeId);
        setStoreData(result.data);
        setActivePath('/');
      } else {
        alert(`Erro no registro: ${result.error || result.message}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const { csrfToken, nonce } = await fetchSecurityTokens();

      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem('activeStoreId', result.data.id);
        setActiveStoreId(result.data.id);
        setStoreData(result.data);
        setActivePath('/');
      } else {
        alert(`Erro no login: ${result.error}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('activeStoreId');
    setActiveStoreId(null);
    setStoreData(null);
    setActivePath('/cadastro');
  };

  if (isPublicSlug) {
    const slug = initialPath.substring(1); // remove the leading slash
    return <PublicMenu slug={slug} />;
  }

  if (activePath === '/cadastro' && !activeStoreId) {
    return <Register onRegister={handleRegister} onLogin={handleLogin} />;
  }

  const handleNavigate = (path) => {
    // Intercepta se houver alterações não salvas em configurações OU modo edição ativo no cardápio
    if (hasUnsavedChanges && (activePath === '/configuracoes' || activePath === '/cardapio')) {
      setPendingPath(path);
      setShowConfirmModal(true);
    } else {
      setActivePath(path);
    }
  };

  const confirmNavigate = () => {
    setHasUnsavedChanges(false);
    setShowConfirmModal(false);
    if (pendingPath) setActivePath(pendingPath);
    setPendingPath(null);
  };

  const cancelNavigate = () => {
    setShowConfirmModal(false);
    setPendingPath(null);
  };

  const renderContent = () => {
    switch (activePath) {
      case '/':
        return <Dashboard />;
      case '/configuracoes':
        return <StoreSettings 
          key={storeData?.id} 
          storeData={storeData} 
          onUpdate={(newData) => {
            setStoreData({ ...storeData, ...newData });
            setHasUnsavedChanges(false);
          }}
          setIsDirty={setHasUnsavedChanges}
        />;
      case '/cardapio':
        return <ItemsPage setIsDirty={setHasUnsavedChanges} />;
      case '/cardapio-digital':
        return <DigitalMenu storeData={storeData} onUpdate={setStoreData} setIsDirty={setHasUnsavedChanges} />;
      default:
        return (
          <div style={{ padding: '20px' }}>
            <h1>{activePath.replace('/', '').toUpperCase()}</h1>
            <p>Em breve...</p>
          </div>
        );
    }
  };

  return (
    <div className={styles.appContainer}>
      <Sidebar 
        activePath={activePath} 
        onNavigate={handleNavigate} 
        storeData={storeData} 
        onLogout={handleLogout}
        activeTheme={activeTheme}
        changeTheme={changeTheme} 
      />
      <main className={styles.mainContent}>
        {renderContent()}
      </main>

      {/* Confirmação de Saída Modal */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h3>Alterações não salvas</h3>
            <p>Deseja realmente sair sem salvar as alterações?</p>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={cancelNavigate}>Não, continuar editando</button>
              <button className={styles.dangerBtn} onClick={confirmNavigate}>Sim, sair sem salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
