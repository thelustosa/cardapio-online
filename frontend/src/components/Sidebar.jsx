import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Ticket,
  ChefHat,
  HandPlatter,
  Table2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Menu,
  X,
  Settings,
  ChevronsUpDown,
  ArrowUpRight,
  Palette,
  Monitor,
  Sun,
  Moon,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ZestIcon from '../assets/icone_ZEST.svg';
import styles from './Sidebar.module.css';

const Sidebar = ({ activePath, onNavigate, storeData, onLogout, activeTheme, changeTheme }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sections = [
    {
      title: null,
      items: [
        { title: 'Dashboard', icon: <Home size={18} />, path: '/' },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { title: 'Pedidos', icon: <Ticket size={18} />, path: '/pedidos' },
        { title: 'Cozinha', icon: <ChefHat size={18} />, path: '/cozinha' },
        { title: 'Cardápio', icon: <HandPlatter size={18} />, path: '/cardapio' },
        { title: 'Cardápio Digital', icon: <Smartphone size={18} />, path: '/cardapio-digital' },
        { title: 'Salão', icon: <Table2 size={18} />, path: '/salao' },
        { title: 'Análises', icon: <BarChart3 size={18} />, path: '/analises' },
      ]
    }
  ];

  const handleNavClick = (path) => {
    onNavigate(path);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE HEADER */}
      <div className={styles.mobileHeader}>
        <button className={styles.mobileToggle} onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className={styles.mobileBranding}>
          <img src={ZestIcon} alt="Zest Logo" className={styles.brandIconMobile} />
          <span className={styles.brandNameMobile}>zestmenu</span>
        </div>
        <div style={{ width: 40 }} /> {/* Spacer */}
      </div>

      {/* BACKDROP FOR MOBILE */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className={styles.sidebarBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`${styles.sidebar} ${isMobileOpen ? styles.mobileOpen : ''}`}
        animate={{
          width: '250px',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* BRANDING HEADER */}
        <div className={styles.sidebarHeader}>
          <div className={styles.brandingContainer}>
            <img src={ZestIcon} alt="Zest Logo" className={styles.brandIcon} />
            <motion.div
              className={styles.brandText}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className={styles.brandName}><span className={styles.openText}>zest</span>menu</h1>
              <span className={styles.brandSubtext}>CARDÁPIO DIGITAL</span>
            </motion.div>
          </div>
        </div>

        {/* MENU ITEMS */}
        <nav className={styles.sidebarNav}>
          {sections.map((section, sIndex) => (
            <div key={sIndex} className={styles.navSection}>
              {section.title && (
                <div className={styles.navSectionTitle}>{section.title}</div>
              )}
              {section.items.map((item, index) => (
                <div
                  key={index}
                  className={`${styles.navItem} ${activePath === item.path ? styles.active : ''}`}
                  onClick={() => handleNavClick(item.path)}
                >
                  <div className={styles.navIcon}>{item.icon}</div>
                  <motion.span
                    className={styles.navTitle}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    {item.title}
                  </motion.span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* FOOTER - USER PROFILE */}
        <div className={styles.sidebarFooter} ref={profileMenuRef}>
          <button 
            className={styles.profileBtn} 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <div className={styles.profileAvatar}>
              {storeData?.nome ? storeData.nome.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{storeData?.nome || 'Craft'}</span>
              <span className={styles.profileEmail}>{storeData?.email || 'craft@openship.org'}</span>
            </div>
            <ChevronsUpDown size={14} className={styles.profileChevron} />
          </button>

          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div 
                className={styles.profileMenu}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                {/* Settings Link */}
                <button 
                  className={styles.profileMenuItemBtn}
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onNavigate('/configuracoes');
                  }}
                >
                  <div className={styles.profileMenuItemLeft}>
                    <Settings size={14} className={styles.menuIcon} />
                    <span>Configurações</span>
                  </div>
                </button>

                <div className={styles.menuDivider} />

                {/* Theme Switcher */}
                <div className={styles.profileMenuItem}>
                  <div className={styles.profileMenuItemLeft}>
                    <Palette size={14} className={styles.menuIcon} />
                    <span>Tema</span>
                  </div>
                  <div className={styles.themeSelector}>
                    <button 
                      onClick={(e) => changeTheme('system', e)}
                      className={`${styles.themeOption} ${activeTheme === 'system' ? styles.themeActive : ''}`}
                    >
                      <Monitor size={12} />
                    </button>
                    <button 
                      onClick={(e) => changeTheme('dark', e)}
                      className={`${styles.themeOption} ${activeTheme === 'dark' ? styles.themeActive : ''}`}
                    >
                      <Moon size={12} />
                    </button>
                    <button 
                      onClick={(e) => changeTheme('light', e)}
                      className={`${styles.themeOption} ${activeTheme === 'light' ? styles.themeActive : ''}`}
                    >
                      <Sun size={12} />
                    </button>
                  </div>
                </div>

                <div className={styles.menuDivider} />

                {/* Log Out */}
                <button className={styles.profileMenuItemBtn} onClick={onLogout}>
                  <div className={styles.profileMenuItemLeft}>
                    <LogOut size={14} className={styles.menuIcon} />
                    <span>Sair</span>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
