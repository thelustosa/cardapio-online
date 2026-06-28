import React from 'react';
import { ExternalLink, ImageUp, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './DigitalMenu.module.css';

const DigitalMenu = ({ storeData, onUpdate, setIsDirty }) => {
  const [bannerImage, setBannerImage] = React.useState(null);
  const [logoImage, setLogoImage] = React.useState(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const logoInputRef = React.useRef(null);

  const defaultBanner = '/default-cover.png';

  // V6: Sanitização de URL de mídia para prevenir CSS injection via url()
  const sanitizeCssUrl = (url) => {
    if (!url || typeof url !== 'string') return defaultBanner;
    // Allow data URIs (base64), http/https, and local file protocol
    if (url.startsWith('data:image/') || url.startsWith('http://') || 
        url.startsWith('https://') || url.startsWith('file:///')) {
      // Escape parentheses and quotes to prevent CSS injection
      return url.replace(/[()'"]/g, '');
    }
    return defaultBanner; // Fallback seguro
  };

  // Sincroniza estado inicial com banco de dados
  React.useEffect(() => {
    if (storeData?.promo_banner) {
      setBannerImage(storeData.promo_banner);
    }
    if (storeData?.logo) {
      setLogoImage(storeData.logo);
    }
  }, [storeData]);

  const handleBannerClick = () => {
    fileInputRef.current.click();
  };

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

  const handleLogoClick = () => {
    logoInputRef.current.click();
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

      if (!storeId) {
        alert('ID da loja não encontrado.');
        return;
      }

      // Tokens de Segurança (CSRF/Nonce)
      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3002' : 'https://api.zestmenu.com.br';
      let csrfToken = '', nonce = '';
      try {
        const csrfRes = await fetch(`${apiBase}/api/csrf-token`, { credentials: 'include' });
        csrfToken = (await csrfRes.json()).csrfToken;
        const nonceRes = await fetch(`${apiBase}/api/nonce`);
        nonce = (await nonceRes.json()).nonce;
      } catch (err) { console.warn('Segurança local inativa'); }

      // Payload: Preserva dados existentes e atualiza o banner e logo
      const updateData = {
        ...storeData,
        promo_banner: bannerImage,
        logo: logoImage
      };

      const response = await fetch(`${apiBase}/api/store/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        if (setIsDirty) setIsDirty(false);
        // Feedback visual elegante sem alert
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

  const [saveStatus, setSaveStatus] = React.useState('idle'); // idle, success, error

  return (
    <motion.div
      className={styles.digitalMenuContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* HEADER IDÊNTICO AO SETTINGS */}
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
        {/* Lado Esquerdo: Configurações (75%) */}
        <div className={styles.configArea}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: '#111827' }}>Personalização Visual</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px 0' }}>Escolha as imagens que darão a identidade ao seu cardápio.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IMAGEM DE CAPA (BANNER)</label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />

              <div
                className={styles.bannerUploadBox}
                onClick={handleBannerClick}
                style={{
                  width: '100%',
                  height: '160px',
                  borderRadius: '10px',
                  border: '2px dashed #e5e7eb',
                  backgroundImage: `url(${sanitizeCssUrl(bannerImage || defaultBanner)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  gap: '10px',
                  transition: 'opacity 0.2s'
                }}>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%', 
                    backdropFilter: 'blur(4px)' 
                  }}>
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

              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoChange}
                accept="image/*"
                style={{ display: 'none' }}
              />

              <div
                className={styles.logoUploadBox}
                onClick={handleLogoClick}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '2px dashed #e5e7eb',
                  backgroundImage: `url(${sanitizeCssUrl(logoImage || '/default-logo.png')})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  gap: '6px',
                  transition: 'opacity 0.2s',
                  textAlign: 'center',
                  padding: '10px'
                }}>
                  <ImageUp size={18} />
                  <span style={{ fontSize: '10px', fontWeight: '600' }}>Alterar Logo</span>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Recomendado: 500x500px • JPG ou PNG</p>
            </div>
          </div>
        </div>

        {/* Lado Direito: Preview Mobile (25%) */}
        <div className={styles.previewArea}>
          <div className={styles.iphoneFrame}>
            <div className={styles.dynamicIsland} />
            <div className={styles.iphoneScreen}>
              {/* Conteúdo Mockup do Cardápio Digital com scroll invisível */}
              <div className={styles.iphoneContent}>
                {/* BANNER REALISTA NO SIMULADOR */}
                <div
                  className={styles.mockupBanner}
                  style={{
                    height: '160px',
                    backgroundImage: `url(${sanitizeCssUrl(bannerImage || defaultBanner)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)' }} />
                  <img
                    src={logoImage || '/default-logo.png'}
                    style={{
                      position: 'absolute',
                      bottom: '-30px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: '4px solid white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      zIndex: 5,
                      objectFit: 'cover'
                    }}
                    alt="Logo"
                  />
                </div>

                <div style={{ padding: '40px 20px 20px 20px' }}>
                  <h4 style={{ margin: '0', fontSize: '18px', fontWeight: '700', textAlign: 'center', color: '#111827' }}>{storeData?.nome || 'Minha Loja'}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>Aberto agora • 11:00 - 22:00</p>

                  <div style={{ height: '1px', background: '#f3f4f6', margin: '15px 0' }} />

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'hidden' }}>
                    <div style={{ padding: '6px 12px', background: '#111827', color: 'white', borderRadius: '20px', fontSize: '10px' }}>Todos</div>
                    <div style={{ padding: '6px 12px', background: '#f3f4f6', borderRadius: '20px', fontSize: '10px' }}>Entradas</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '60px', height: '60px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ height: '10px', width: '70%', background: '#f3f4f6', borderRadius: '4px', marginBottom: '6px' }} />
                          <div style={{ height: '8px', width: '45%', background: '#f9fafb', borderRadius: '4px' }} />
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '12px', color: '#111827' }}>R$ 00</div>
                      </div>
                    ))}
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
