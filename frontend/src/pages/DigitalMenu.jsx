import React from 'react';
import { ExternalLink, ImageUp, Save, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './DigitalMenu.module.css';

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' 
  : 'https://api.zestmenu.com.br';

const DigitalMenu = ({ storeData, onUpdate, setIsDirty }) => {
  const [bannerImage, setBannerImage] = React.useState(null);
  const [logoImage, setLogoImage] = React.useState(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState('idle');
  const fileInputRef = React.useRef(null);
  const logoInputRef = React.useRef(null);

  // Preview state
  const [previewMenus, setPreviewMenus] = React.useState([]);
  const [previewItems, setPreviewItems] = React.useState([]);
  const [selectedMenu, setSelectedMenu] = React.useState(null); // null = "Todos"
  const [selectedCategory, setSelectedCategory] = React.useState(null);

  const defaultBanner = '/default-cover.png';

  const sanitizeCssUrl = (url) => {
    if (!url || typeof url !== 'string') return defaultBanner;
    if (url.startsWith('data:image/') || url.startsWith('http://') ||
        url.startsWith('https://') || url.startsWith('file:///') ||
        url.startsWith('/uploads/')) {
      return url.replace(/[()'"]/g, '');
    }
    return defaultBanner;
  };

  const parseImage = (image) => {
    if (!image) return null;
    if (Array.isArray(image)) return image.flat(Infinity)[0] || null;
    if (typeof image === 'string') {
      if (image.startsWith('[') || image.startsWith('{')) {
        try {
          const parsed = JSON.parse(image);
          return Array.isArray(parsed) ? parsed.flat(Infinity)[0] : parsed;
        } catch { return image; }
      }
      return image;
    }
    return null;
  };

  // Fetch menus and items for the preview
  React.useEffect(() => {
    const storeId = storeData?.id || localStorage.getItem('activeStoreId');
    if (!storeId) return;

    const fetchData = async () => {
      try {
        const [catRes, itemRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/categories/${storeId}`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/items/${storeId}`, { credentials: 'include' })
        ]);
        const catData = await catRes.json();
        const itemData = await itemRes.json();

        const parsedCats = catData.map(c => ({
          ...c,
          subcategories: typeof c.subcategories === 'string'
            ? JSON.parse(c.subcategories || '[]')
            : (c.subcategories || [])
        }));

        setPreviewMenus(parsedCats);
        setPreviewItems(itemData);
      } catch (err) {
        console.error('Error fetching preview data:', err);
      }
    };
    fetchData();
  }, [storeData]);

  // Sync initial images from DB
  React.useEffect(() => {
    if (storeData?.promo_banner) setBannerImage(storeData.promo_banner);
    if (storeData?.logo) setLogoImage(storeData.logo);
  }, [storeData]);

  const handleBannerClick = () => fileInputRef.current.click();
  const handleLogoClick = () => logoInputRef.current.click();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBannerImage(e.target.result);
        if (setIsDirty) setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoImage(e.target.result);
        if (setIsDirty) setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const storeId = storeData?.id || localStorage.getItem('activeStoreId');
      if (!storeId) { alert('ID da loja não encontrado.'); return; }

      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3002' : 'https://api.zestmenu.com.br';
      let csrfToken = '', nonce = '';
      try {
        const csrfRes = await fetch(`${apiBase}/api/csrf-token`, { credentials: 'include' });
        csrfToken = (await csrfRes.json()).csrfToken;
        const nonceRes = await fetch(`${apiBase}/api/nonce`);
        nonce = (await nonceRes.json()).nonce;
      } catch (err) { console.warn('Segurança local inativa'); }

      const updateData = { ...storeData, promo_banner: bannerImage, logo: logoImage };

      const response = await fetch(`${apiBase}/api/store/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken, 'X-Nonce-Token': nonce },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        if (setIsDirty) setIsDirty(false);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
        if (onUpdate) onUpdate(updateData);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Derived data for preview
  const activeMenu = selectedMenu ? previewMenus.find(m => m.id === selectedMenu) : null;
  const subcategories = activeMenu?.subcategories || [];

  const filteredItems = previewItems.filter(item => {
    if (!selectedMenu) return true;
    const matchMenu = item.category_name === activeMenu?.name;
    if (!matchMenu) return false;
    if (selectedCategory) return item.subcategory_name === selectedCategory;
    return true;
  });

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price.replace(',', '.')) : price;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num || 0);
  };

  return (
    <motion.div
      className={styles.digitalMenuContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* HEADER */}
      <div className={styles.pageHeader}>
        <div className={styles.headerInfo}>
          <h1>Cardápio Digital</h1>
          <p>Gerencie o link, a aparência e o QRCode do menu que seus clientes acessarão.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isSaving || saveStatus === 'success'}
            style={saveStatus === 'success' ? { borderColor: '#10b981', color: '#10b981' } : {}}
          >
            <Save size={18} />
            <span>
              {saveStatus === 'success' ? 'Salvo!' : (isSaving ? 'Salvando...' : 'Salvar Alterações')}
            </span>
          </button>
          <button className={styles.primaryBtn}>
            <ExternalLink size={18} />
            Visualizar Cardápio Digital
          </button>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Left: Config */}
        <div className={styles.configArea}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: '#111827' }}>Personalização Visual</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px 0' }}>Escolha as imagens que darão a identidade ao seu cardápio.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IMAGEM DE CAPA (BANNER)</label>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              <div
                className={styles.bannerUploadBox}
                onClick={handleBannerClick}
                style={{
                  width: '100%', height: '160px', borderRadius: '10px', border: '2px dashed #e5e7eb',
                  backgroundImage: `url(${sanitizeCssUrl(bannerImage || defaultBanner)})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  position: 'relative', overflow: 'hidden', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '10px', transition: 'opacity 0.2s' }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backdropFilter: 'blur(4px)' }}>
                    <ImageUp size={24} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>Clique para alterar a capa</span>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Recomendado: 1200x400px • JPG ou PNG</p>
            </div>

            <div style={{ height: '1px', background: '#f3f4f6', margin: '24px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LOGOTIPO (PERFIL)</label>
              <input type="file" ref={logoInputRef} onChange={handleLogoChange} accept="image/*" style={{ display: 'none' }} />
              <div
                className={styles.logoUploadBox}
                onClick={handleLogoClick}
                style={{
                  width: '120px', height: '120px', borderRadius: '50%', border: '2px dashed #e5e7eb',
                  backgroundImage: `url(${sanitizeCssUrl(logoImage || '/default-logo.png')})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  position: 'relative', overflow: 'hidden', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '6px', textAlign: 'center', padding: '10px' }}>
                  <ImageUp size={18} />
                  <span style={{ fontSize: '10px', fontWeight: '600' }}>Alterar Logo</span>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Recomendado: 500x500px • JPG ou PNG</p>
            </div>
          </div>
        </div>

        {/* Right: Mobile Preview */}
        <div className={styles.previewArea}>
          <div className={styles.iphoneFrame}>
            <div className={styles.dynamicIsland} />
            <div className={styles.iphoneScreen}>
              <div className={styles.iphoneContent}>
                {/* BANNER */}
                <div
                  className={styles.mockupBanner}
                  style={{
                    height: '160px',
                    backgroundImage: `url(${sanitizeCssUrl(bannerImage || defaultBanner)})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    position: 'relative', flexShrink: 0
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)' }} />
                  <img
                    src={logoImage || '/default-logo.png'}
                    style={{
                      position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)',
                      width: '64px', height: '64px', borderRadius: '50%',
                      border: '4px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      zIndex: 5, objectFit: 'cover'
                    }}
                    alt="Logo"
                  />
                </div>

                <div style={{ padding: '40px 16px 20px 16px' }}>
                  <h4 style={{ margin: '0', fontSize: '18px', fontWeight: '700', textAlign: 'center', color: '#111827' }}>{storeData?.nome || 'Minha Loja'}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>Aberto agora • 11:00 - 22:00</p>

                  <div style={{ height: '1px', background: '#f3f4f6', margin: '14px 0' }} />

                  {/* MENUS TABS */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    <button
                      onClick={() => { setSelectedMenu(null); setSelectedCategory(null); }}
                      style={{
                        flexShrink: 0, padding: '5px 11px',
                        background: !selectedMenu ? '#111827' : '#f3f4f6',
                        color: !selectedMenu ? 'white' : '#374151',
                        border: 'none', borderRadius: '20px', fontSize: '10px', fontWeight: '600', cursor: 'pointer'
                      }}
                    >
                      Todos
                    </button>
                    {previewMenus.map(menu => (
                      <button
                        key={menu.id}
                        onClick={() => { setSelectedMenu(menu.id); setSelectedCategory(null); }}
                        style={{
                          flexShrink: 0, padding: '5px 11px',
                          background: selectedMenu === menu.id ? '#111827' : '#f3f4f6',
                          color: selectedMenu === menu.id ? 'white' : '#374151',
                          border: 'none', borderRadius: '20px', fontSize: '10px', fontWeight: '600', cursor: 'pointer'
                        }}
                      >
                        {menu.name}
                      </button>
                    ))}
                  </div>

                  {/* SUBCATEGORIES — only when a menu is selected and has subcats */}
                  {selectedMenu && subcategories.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        style={{
                          flexShrink: 0, padding: '3px 9px',
                          background: !selectedCategory ? '#4B5563' : 'transparent',
                          color: !selectedCategory ? 'white' : '#6b7280',
                          border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '9px', fontWeight: '500', cursor: 'pointer'
                        }}
                      >
                        Todas
                      </button>
                      {subcategories.map(sub => (
                        <button
                          key={sub}
                          onClick={() => setSelectedCategory(sub)}
                          style={{
                            flexShrink: 0, padding: '3px 9px',
                            background: selectedCategory === sub ? '#4B5563' : 'transparent',
                            color: selectedCategory === sub ? 'white' : '#6b7280',
                            border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '9px', fontWeight: '500', cursor: 'pointer'
                          }}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ITEMS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredItems.length === 0 ? (
                      <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: '16px' }}>Nenhum item neste menu</p>
                    ) : (
                      filteredItems.map(item => {
                        const imgUrl = parseImage(item.image);
                        return (
                          <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{
                              width: '54px', height: '54px', borderRadius: '10px',
                              background: '#f3f4f6', border: '1px solid #f3f4f6',
                              overflow: 'hidden', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {imgUrl ? (
                                <img
                                  src={imgUrl.startsWith('/uploads/') ? `${API_BASE_URL}${imgUrl}` : imgUrl}
                                  alt={item.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <ImageOff size={18} color="#d1d5db" strokeWidth={1.5} />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                              {item.description && (
                                <div style={{ fontSize: '9px', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</div>
                              )}
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '11px', color: '#111827', flexShrink: 0 }}>{formatPrice(item.price)}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DigitalMenu;
