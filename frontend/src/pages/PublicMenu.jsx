import React, { useState, useEffect } from 'react';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PublicMenu.module.css';
import StoryViewer from '../components/StoryViewer';

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' 
  : 'https://api.zestmenu.com.br';

const defaultBanner = '/default-cover.png';
const defaultLogo = '/default-logo.png';

const PublicMenu = ({ slug }) => {
  const [storeData, setStoreData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/public/store/${slug}`);
        if (!response.ok) {
          throw new Error('Loja não encontrada');
        }
        const data = await response.json();
        setStoreData(data.store);
        setCategories(data.categories || []);
        setItems(data.items || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchPublicData();
  }, [slug]);

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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando cardápio...</p>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} style={{ marginBottom: '16px' }} />
        <h2>Ops!</h2>
        <p>{error || 'Restaurante não encontrado.'}</p>
      </div>
    );
  }

  const filteredItems = selectedCategory 
    ? items.filter(item => item.categoryId === selectedCategory)
    : items;

  const bgBannerUrl = storeData.banner 
    ? (storeData.banner.startsWith('/uploads/') ? `${API_BASE_URL}${storeData.banner}` : sanitizeCssUrl(storeData.banner))
    : sanitizeCssUrl(defaultBanner);

  const bgLogoUrl = storeData.logo 
    ? (storeData.logo.startsWith('/uploads/') ? `${API_BASE_URL}${storeData.logo}` : sanitizeCssUrl(storeData.logo))
    : sanitizeCssUrl(defaultLogo);

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price.replace(',', '.')) : price;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num || 0);
  };

  return (
    <div className={styles.publicMenuContainer}>
      <div className={styles.menuContent} style={{ backgroundColor: storeData.color_theme || '#ffffff' }}>
        
        {/* Banner */}
        <div 
          style={{ 
            height: '160px', 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            backgroundImage: `url('${bgBannerUrl}')`
          }} 
        />
        
        {/* Header Info */}
        <div style={{ padding: '0 20px', position: 'relative', marginTop: '-30px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: 'white',
            margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '4px'
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              backgroundSize: 'cover', backgroundPosition: 'center',
              backgroundImage: `url('${bgLogoUrl}')`
            }} />
          </div>
          
          <h2 style={{ margin: '12px 0 4px', fontSize: '20px', fontWeight: '700', color: '#111827' }}>
            {storeData.nome || 'Nome da Loja'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            Aberto agora • 11:00 - 22:00
          </p>
        </div>

        {/* Categories */}
        <div style={{ padding: '20px', marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <button 
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                border: 'none', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: selectedCategory === null ? '#111827' : '#f3f4f6',
                color: selectedCategory === null ? 'white' : '#4b5563'
              }}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                  border: 'none', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: selectedCategory === cat.id ? '#111827' : '#f3f4f6',
                  color: selectedCategory === cat.id ? 'white' : '#4b5563'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', paddingBottom: '100px' }}>
            {filteredItems.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', marginTop: '20px' }}>
                Nenhum item encontrado.
              </p>
            ) : (
              filteredItems.map((item, index) => {
                const img = parseImage(item.image);
                const displayImg = img ? (img.startsWith('/uploads/') ? `${API_BASE_URL}${img}` : img) : null;
                
                return (
                  <div 
                    key={item.id} 
                    style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setActiveStoryIndex(index)}
                  >
                    <div style={{ 
                      width: '70px', height: '70px', borderRadius: '12px', 
                      backgroundColor: '#f3f4f6', flexShrink: 0,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      backgroundImage: displayImg ? `url('${displayImg}')` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {!displayImg && <span style={{ color: '#9ca3af', fontSize: '10px' }}>Sem foto</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>{item.name}</h4>
                      {item.description && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>
                      {formatPrice(item.price)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Floating Cart Button (Cosmetic for now) */}
        <div style={{ 
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 40px)', background: '#111827', color: 'white',
          padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', 
          justifyContent: 'space-between', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          cursor: 'pointer'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
              0
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Ver sacola</span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: '700' }}>R$ 0,00</span>
        </div>

        {/* Story Viewer */}
        <AnimatePresence>
          {activeStoryIndex !== null && (
            <StoryViewer 
              items={filteredItems}
              initialIndex={activeStoryIndex}
              onClose={() => setActiveStoryIndex(null)}
              apiBaseUrl={API_BASE_URL}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PublicMenu;
