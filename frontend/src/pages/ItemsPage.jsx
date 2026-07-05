import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Settings, Pencil, ChevronRight, ChevronDown, ChevronUp, Star, ImageOff, X, Bold, Italic, Underline, Type, List, ListOrdered, Maximize2, Link, Trash2, Clock } from 'lucide-react';
import styles from './ItemsPage.module.css';

// ================= SECURITY: Dynamic API Base URL (V4) ================= //
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' 
  : 'https://api.zestmenu.com.br';

// ================= SECURITY: URL Sanitization Helper (V6) ================= //
const isSafeMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  // Allow data URIs (base64), relative paths, and http/https URLs
  return url.startsWith('data:image/') || url.startsWith('data:video/') ||
         url.startsWith('http://') || url.startsWith('https://') ||
         url.startsWith('/uploads/');
};

const parseItemImage = (image) => {
  if (!image) return [];
  if (Array.isArray(image)) return image.flat(Infinity);
  if (typeof image === 'string') {
    if (image.startsWith('[') || image.startsWith('{')) {
      try {
        const parsed = JSON.parse(image);
        return Array.isArray(parsed) ? parsed.flat(Infinity) : [parsed];
      } catch (e) {
        return [image];
      }
    }
    return [image];
  }
  return [];
};

const ItemsPage = ({ setIsDirty }) => {
  const storeId = localStorage.getItem('activeStoreId');
  const [activeCategory, setActiveCategory] = useState('Todos os itens');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null); 
  const [categoryToDelete, setCategoryToDelete] = useState(null); // Para exclusão de menu
  const [subcategoryToDelete, setSubcategoryToDelete] = useState(null); // { catIndex, subIndex, subName }
  const [expandedCategories, setExpandedCategories] = useState([]); 
  const [activeSubCategory, setActiveSubCategory] = useState(null);

  // Controla se a página está "suja" (em edição) para bloquear saída acidental
  useEffect(() => {
    if (setIsDirty) setIsDirty(isEditMode);
  }, [isEditMode, setIsDirty]);

  // Limpa o estado dirty ao desmontar
  useEffect(() => {
    return () => { if (setIsDirty) setIsDirty(false); };
  }, [setIsDirty]);

  const toggleEditMode = () => {
    if (!isEditMode) {
      const hasMenus = categories.filter(c => c.name !== 'Todos os itens').length > 0;
      if (!hasMenus) {
        setShowMenuWarning(true);
        return;
      }
    }
    const nextMode = !isEditMode;
    setIsEditMode(nextMode);
    if (setIsDirty) setIsDirty(nextMode);
  };

  // Dynamic state
  const [categories, setCategories] = useState([{ name: 'Todos os itens', count: 0 }]);
  const [items, setItems] = useState([]);

  // Fetch data on mount
  React.useEffect(() => {
    const fetchData = async () => {
      if (!storeId) return;
      try {
        const [catRes, itemRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/categories/${storeId}`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/items/${storeId}`, { credentials: 'include' })
        ]);

        const catData = await catRes.json();
        const itemData = await itemRes.json();

        const parsedCatData = catData.map(c => ({
          ...c,
          subcategories: typeof c.subcategories === 'string' ? JSON.parse(c.subcategories || '[]') : (c.subcategories || [])
        }));

        const parsedItemData = itemData.map(item => ({
          ...item,
          image: parseItemImage(item.image)
        }));

        setCategories([{ name: 'Todos os itens', count: itemData.length }, ...parsedCatData]);
        setItems(parsedItemData);
      } catch (err) {
        console.error('Error fetching menu data:', err);
      }
    };
    fetchData();
  }, [storeId]);

  const fetchAuthTokens = async () => {
    try {
      const csrfRes = await fetch(`${API_BASE_URL}/api/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const nonceRes = await fetch(`${API_BASE_URL}/api/nonce`);
      const { nonce } = await nonceRes.json();
      return { csrfToken, nonce };
    } catch (err) {
      console.warn('Security tokens fetch failed', err);
      return { csrfToken: '', nonce: '' };
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num || 0);
  };

  const filteredItems = activeCategory === 'Todos os itens'
    ? items
    : items.filter(item => {
        const matchesCategory = item.category === activeCategory || item.category_name === activeCategory;
        if (activeSubCategory) {
          return matchesCategory && item.subcategory_name === activeSubCategory;
        }
        return matchesCategory;
      });

  const getSubcategoryCount = (catName, subName) => {
    return items.filter(it => 
      (it.category === catName || it.category_name === catName) && 
      it.subcategory_name === subName
    ).length;
  };

  const [newMenuName, setNewMenuName] = useState('');
  const [description, setDescription] = useState('');

  // Category sub-menu state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newMenuCategories, setNewMenuCategories] = useState([]);

  // Item form state
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemFeatured, setItemFeatured] = useState(false);
  const [selectedItemMenu, setSelectedItemMenu] = useState('');
  const [selectedItemSubCategory, setSelectedItemSubCategory] = useState('');

  // Extended Details
  const [itemPrepTime, setItemPrepTime] = useState('');
  const [itemCalories, setItemCalories] = useState('');
  const [itemKitchenStation, setItemKitchenStation] = useState('');
  const [itemAllergens, setItemAllergens] = useState([]);
  const [itemDietaryFlags, setItemDietaryFlags] = useState([]);

  const [isAllergenDropdownOpen, setIsAllergenDropdownOpen] = useState(false);
  const [isDietaryDropdownOpen, setIsDietaryDropdownOpen] = useState(false);
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);
  const [isSubCategoryDropdownOpen, setIsSubCategoryDropdownOpen] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [itemMediaFiles, setItemMediaFiles] = useState([]); // Array of { file, preview, type }
  const [isNovoMenuHighlighted, setIsNovoMenuHighlighted] = useState(false);
  const [showMenuWarning, setShowMenuWarning] = useState(false);

  const triggerMenuHighlight = () => {
    setIsNovoMenuHighlighted(true);
    setTimeout(() => {
      setIsNovoMenuHighlighted(false);
    }, 4000);
  };

  const handleNewItemClick = () => {
    const hasMenus = categories.filter(c => c.name !== 'Todos os itens').length > 0;
    if (!hasMenus) {
      setShowMenuWarning(true);
      return;
    }
    setIsItemDrawerOpen(true);
  };

  const allergenRef = useRef(null);
  const dietaryRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuSelectRef = useRef(null);
  const subCategorySelectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (allergenRef.current && !allergenRef.current.contains(event.target)) {
        setIsAllergenDropdownOpen(false);
      }
      if (dietaryRef.current && !dietaryRef.current.contains(event.target)) {
        setIsDietaryDropdownOpen(false);
      }
      if (menuSelectRef.current && !menuSelectRef.current.contains(event.target)) {
        setIsMenuDropdownOpen(false);
      }
      if (subCategorySelectRef.current && !subCategorySelectRef.current.contains(event.target)) {
        setIsSubCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allergensList = ['Glúten', 'Laticínios', 'Ovos', 'Nozes', 'Crustáceos', 'Soja', 'Peixe'];
  const dietaryList = ['Vegetariano', 'Vegano', 'Sem Glúten', 'Sem Laticínios', 'Misto'];

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    // Auto-expand height
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleItemDescriptionChange = (e) => {
    setItemDescription(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) return;
    if (!storeId) {
      alert('Você precisa estar logado para salvar menus na nuvem.');
      return;
    }

    const { csrfToken, nonce } = await fetchAuthTokens();
    const data = { store_id: storeId, name: newMenuName, description, subcategories: newMenuCategories };

    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const savedCat = await res.json();
        setCategories([...categories, savedCat]);
        setNewMenuName('');
        setDescription('');
        setIsAddingCategory(false);
        setNewCategoryName('');
        setNewMenuCategories([]);
        setIsDrawerOpen(false);
      } else {
        const errData = await res.json();
        alert('Erro ao salvar menu: ' + (errData.error || 'Erro desconhecido.'));
      }
    } catch (err) {
      console.error('Error creating menu:', err);
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleAddSubCategory = () => {
    if (newCategoryName.trim()) {
      setNewMenuCategories([...newMenuCategories, newCategoryName.trim()]);
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleCloseMenuDrawer = () => {
    setNewMenuName('');
    setDescription('');
    setIsAddingCategory(false);
    setNewCategoryName('');
    setNewMenuCategories([]);
    setIsDrawerOpen(false);
  };

  const handleCloseItemDrawer = () => {
    setItemName('');
    setItemPrice('');
    setItemDescription('');
    setItemAvailable(true);
    setItemFeatured(false);
    setSelectedItemMenu('');
    setSelectedItemSubCategory('');
    setItemPrepTime('');
    setItemCalories('');
    setItemKitchenStation('');
    setItemAllergens([]);
    setItemDietaryFlags([]);
    setItemMediaFiles([]);
    setIsItemDrawerOpen(false);
    setEditingItem(null);
  };

  const handleEditItemClick = (item) => {
    setEditingItem(item);
    setItemName(item.name || '');
    setItemPrice(item.price || '');
    setItemDescription(item.description || '');
    setItemAvailable(item.status === 'Ativo' || item.status === 'Available');
    setItemFeatured(Boolean(item.popular));
    setSelectedItemMenu(item.category_name || '');
    setSelectedItemSubCategory(item.subcategory_name || '');
    setItemPrepTime(item.prep_time || '');
    setItemCalories(item.calories || '');
    setItemKitchenStation(item.kitchen_station || '');
    
    // Parse allergens/dietary if they are JSON strings
    const allergens = typeof item.allergens === 'string' ? JSON.parse(item.allergens || '[]') : (item.allergens || []);
    const dietary = typeof item.dietary_flags === 'string' ? JSON.parse(item.dietary_flags || '[]') : (item.dietary_flags || []);
    
    setItemAllergens(allergens);
    setItemDietaryFlags(dietary);
    
    // Media previews
    const images = parseItemImage(item.image);
    
    const media = images.map(url => ({
      file: null, // Existing files don't have a File object
      preview: url,
      type: (typeof url === 'string' && (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov'))) ? 'video' : 'image'
    }));
    
    setItemMediaFiles(media);
    setIsItemDrawerOpen(true);
  };

  const handleRemoveSubCategory = (indexToRemove) => {
    setNewMenuCategories(newMenuCategories.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateItem = async () => {
    if (!itemName.trim() || !selectedItemMenu) {
      alert('Por favor, preencha o Nome e selecione um Menu.');
      return;
    }
    
    console.log('Iniciando criação de item:', itemName);
    if (!storeId) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      return;
    }

    const { csrfToken, nonce } = await fetchAuthTokens();
    let dataNonce = nonce;

    // 1. Separate new files from existing URLs
    const existingUrls = itemMediaFiles.filter(m => !m.file).map(m => m.preview);
    const newFiles = itemMediaFiles.filter(m => m.file);
    
    let uploadedUrls = [];
    if (newFiles.length > 0) {
      const formData = new FormData();
      newFiles.forEach(m => formData.append('files', m.file));

      try {
        const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'X-Nonce-Token': nonce
          },
          credentials: 'include',
          body: formData
        });

        if (uploadRes.ok) {
          const { files } = await uploadRes.json();
          uploadedUrls = files.map(f => f.url);
          
          const { nonce: freshNonce } = await fetchAuthTokens();
          dataNonce = freshNonce;
        } else {
          console.error('Falha no upload de mídia');
          dataNonce = nonce;
        }
      } catch (err) {
        console.error('Erro de conexão no upload:', err);
        dataNonce = nonce;
      }
    }

    const finalImageArray = [...existingUrls, ...uploadedUrls];

    const data = {
      store_id: storeId,
      category_name: selectedItemMenu || null,
      subcategory_name: selectedItemSubCategory || null,
      name: itemName,
      price: typeof itemPrice === 'string' ? parseFloat(itemPrice.replace(',', '.')) || 0 : parseFloat(itemPrice) || 0,
      description: itemDescription,
      image: finalImageArray.length > 0 ? JSON.stringify(finalImageArray) : null,
      status: itemAvailable ? 'Ativo' : 'Inativo',
      popular: itemFeatured ? 1 : 0,
      prep_time: itemPrepTime || null,
      calories: itemCalories || null,
      kitchen_station: itemKitchenStation || null,
      allergens: itemAllergens.length > 0 ? itemAllergens : null,
      dietary_flags: itemDietaryFlags.length > 0 ? itemDietaryFlags : null
    };

    try {
      const url = editingItem 
        ? `${API_BASE_URL}/api/items/${editingItem.id}` 
        : `${API_BASE_URL}/api/items`;
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': dataNonce
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const savedItem = await res.json();
        const parsedItem = {
          ...savedItem,
          image: parseItemImage(savedItem.image)
        };
        
        if (editingItem) {
          setItems(items.map(it => Number(it.id) === Number(parsedItem.id) ? { ...it, ...parsedItem } : it));
        } else {
          setItems([...items, parsedItem]);
        }

        setItemName('');
        setItemPrice('');
        setItemDescription('');
        setItemAvailable(true);
        setItemFeatured(false);
        setSelectedItemMenu('');
        setSelectedItemSubCategory('');
        setItemPrepTime('');
        setItemCalories('');
        setItemKitchenStation('');
        setItemAllergens([]);
        setItemDietaryFlags([]);
        setItemMediaFiles([]);
        setEditingItem(null);
        setIsItemDrawerOpen(false);
      } else {
        const errData = await res.json();
        alert('Erro ao salvar item: ' + (errData.error || 'Erro desconhecido.'));
      }
    } catch (err) {
      console.error('Error creating item:', err);
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleDeleteItem = async (id) => {
    // Agora apenas seta o ID para abrir o modal customizado
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete;
    
    try {
      const { csrfToken, nonce } = await fetchAuthTokens();
      const res = await fetch(`${API_BASE_URL}/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include'
      });
      
      if (res.ok) {
        setItems(items.filter(it => Number(it.id) !== Number(id)));
        setItemToDelete(null); // Fecha o modal
      } else {
        alert('Erro ao excluir item.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão.');
      setItemToDelete(null);
    }
  };

  const handleMoveCategory = async (index, direction) => {
    // index is relative to the categories array (which includes "Todos os itens" at index 0)
    if (index === 0) return; // Cannot move "Todos os itens"
    
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 1 || targetIndex >= newCategories.length) return;
    
    // Swap
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    
    setCategories(newCategories);
    
    // Persist to backend
    try {
      const { csrfToken, nonce } = await fetchAuthTokens();
      const payload = newCategories
        .filter(c => c.id) // Only real categories
        .map((c, idx) => ({ id: c.id, sort_order: idx }));
        
      await fetch(`${API_BASE_URL}/api/categories/reorder`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include',
        body: JSON.stringify({ categories: payload })
      });
    } catch (err) {
      console.error('Error reordering categories:', err);
    }
  };

  const handleMoveSubcategory = async (catIndex, subIndex, direction) => {
    const newCategories = [...categories];
    const category = { ...newCategories[catIndex] };
    const subcats = [...category.subcategories];
    
    const targetIndex = direction === 'up' ? subIndex - 1 : subIndex + 1;
    if (targetIndex < 0 || targetIndex >= subcats.length) return;
    
    // Swap
    [subcats[subIndex], subcats[targetIndex]] = [subcats[targetIndex], subcats[subIndex]];
    
    category.subcategories = subcats;
    newCategories[catIndex] = category;
    
    setCategories(newCategories);
    
    // Persist
    try {
      const { csrfToken, nonce } = await fetchAuthTokens();
      await fetch(`${API_BASE_URL}/api/categories/${category.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include',
        body: JSON.stringify({
          name: category.name,
          description: category.description,
          subcategories: subcats
        })
      });
    } catch (err) {
      console.error('Error reordering subcategories:', err);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const cat = categoryToDelete;
    
    try {
      const { csrfToken, nonce } = await fetchAuthTokens();
      if (!csrfToken || !nonce) {
        alert('Erro de segurança: Tokens ausentes. Tente recarregar a página.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/categories/delete/${cat.id}`, {
        method: 'POST',
        headers: { 
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include'
      });
      
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== cat.id));
        setCategoryToDelete(null);
        if (activeCategory === cat.name) setActiveCategory('Todos os itens');
      } else {
        const errData = await res.json();
        alert('Erro ao excluir menu: ' + (errData.error || 'Erro desconhecido.'));
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão com o servidor.');
      setCategoryToDelete(null);
    }
  };

  const confirmDeleteSubcategory = async () => {
    if (!subcategoryToDelete) return;
    const { catIndex, subIndex } = subcategoryToDelete;
    
    const newCategories = [...categories];
    const category = { ...newCategories[catIndex] };
    const subcats = category.subcategories.filter((_, idx) => idx !== subIndex);
    
    category.subcategories = subcats;
    newCategories[catIndex] = category;
    
    try {
      const { csrfToken, nonce } = await fetchAuthTokens();
      const res = await fetch(`${API_BASE_URL}/api/categories/${category.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include',
        body: JSON.stringify({
          name: category.name,
          description: category.description,
          subcategories: subcats
        })
      });

      if (res.ok) {
        setCategories(newCategories);
        setSubcategoryToDelete(null);
      } else {
        alert('Erro ao atualizar subcategoria no servidor.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao remover subcategoria.');
      setSubcategoryToDelete(null);
    }
  };

  // V9: Otimizado — Usa PATCH endpoint que envia apenas o status, sem payload pesado
  const handleTogglePauseItem = async (item) => {
    const isCurrentlyActive = item.status === 'Ativo' || item.status === 'Available';
    const newStatus = isCurrentlyActive ? 'Inativo' : 'Ativo';
    
    try {
      const { csrfToken, nonce } = await fetchAuthTokens();
      const res = await fetch(`${API_BASE_URL}/api/items/${item.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        setItems(items.map(it => Number(it.id) === Number(item.id) ? { ...it, status: newStatus } : it));
      } else {
        alert('Erro ao alterar status do item.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão.');
    }
  };

  return (
    <motion.div
      className={styles.itemsPageContainer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <header className={styles.itemsHeader}>
        <div className={styles.headerInfo}>
          <h1>Cardápio</h1>
          <p>{items.length} itens</p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={`${styles.secondaryBtn} ${isEditMode ? styles.activeEdit : ''}`} 
            onClick={toggleEditMode}
            style={isEditMode ? { background: '#18181b', color: 'white' } : {}}
          >
            {isEditMode ? 'Finalizar Edição' : 'Editar'}
          </button>
          <button 
            className={`${styles.secondaryBtn} ${isNovoMenuHighlighted ? styles.highlightedMenuBtn : ''}`} 
            onClick={() => setIsDrawerOpen(true)}
          >
            Novo Menu
          </button>
          <button className={styles.primaryBtn} onClick={handleNewItemClick}>
            <Plus size={18} />
            Novo Item
          </button>
        </div>
      </header>

      <div className={styles.itemsLayout}>
        <aside className={`${styles.categorySidebar} ${isEditMode ? styles.editModeActive : ''}`}>
          {categories.map((cat, index) => {
            const isAllItems = cat.name === 'Todos os itens';
            const isExpanded = expandedCategories.includes(cat.name);
            const hasSubcats = cat.subcategories && cat.subcategories.length > 0;

            const toggleExpand = (e) => {
              e.stopPropagation();
              setExpandedCategories(prev => 
                prev.includes(cat.name) ? prev.filter(c => c !== cat.name) : [...prev, cat.name]
              );
            };

            const selectCategory = () => {
              setActiveCategory(cat.name);
              setActiveSubCategory(null);
            };

            return (
              <div key={cat.name} className={styles.sidebarGroup}>
                <div
                  className={`${styles.categoryItem} ${activeCategory === cat.name && !activeSubCategory ? styles.active : ''} ${isEditMode ? styles.sidebarEditActive : ''}`}
                >
                  <div className={styles.catMainContent} onClick={selectCategory}>
                    <span className={styles.catName}>{cat.name}</span>
                  </div>
                  
                  <div className={styles.catActionsWrapper}>
                    {!isAllItems && hasSubcats ? (
                      <button className={`${styles.expandTrigger} ${isExpanded ? styles.rotated : ''}`} onClick={toggleExpand}>
                        <ChevronDown size={14} />
                      </button>
                    ) : (
                      <span className={styles.catCount}>{cat.count}</span>
                    )}

                    {isEditMode && !isAllItems && (
                      <div className={styles.categoryReorderBtns}>
                        <button className={`${styles.reorderBtn} ${styles.trashBtn}`} onClick={(e) => { e.stopPropagation(); setCategoryToDelete(cat); }}>
                          <Trash2 size={12} />
                        </button>
                        <div className={styles.verticalDividerMini}></div>
                        <div className={styles.reorderColumn}>
                          {index > 1 && (
                            <button className={styles.reorderBtn} onClick={(e) => { e.stopPropagation(); handleMoveCategory(index, 'up'); }}>
                              <ChevronUp size={12} />
                            </button>
                          )}
                          {index < categories.length - 1 && (
                            <button className={styles.reorderBtn} onClick={(e) => { e.stopPropagation(); handleMoveCategory(index, 'down'); }}>
                              <ChevronDown size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subcategories list */}
                <AnimatePresence>
                  {isExpanded && !isAllItems && hasSubcats && (
                    <motion.div 
                      className={styles.subcategoryList}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {cat.subcategories.map((sub, subIdx) => (
                        <div 
                          key={sub} 
                          className={`${styles.subcategoryItem} ${activeSubCategory === sub ? styles.active : ''}`}
                          onClick={() => {
                            setActiveCategory(cat.name);
                            setActiveSubCategory(sub);
                          }}
                        >
                          <span className={styles.subName}>{sub}</span>
                          
                          <div className={styles.catActionsWrapper}>
                            <span className={styles.subCount}>{getSubcategoryCount(cat.name, sub)}</span>
                            
                            {isEditMode && (
                              <div className={styles.categoryReorderBtns}>
                                <button className={`${styles.reorderBtn} ${styles.trashBtn}`} onClick={(e) => { e.stopPropagation(); setSubcategoryToDelete({ catIndex: index, subIndex: subIdx, subName: sub }); }}>
                                  <Trash2 size={12} />
                                </button>
                                <div className={styles.verticalDividerMini}></div>
                                <div className={styles.reorderColumn}>
                                  {subIdx > 0 && (
                                    <button className={styles.reorderBtn} onClick={(e) => { e.stopPropagation(); handleMoveSubcategory(index, subIdx, 'up'); }}>
                                      <ChevronUp size={12} />
                                    </button>
                                  )}
                                  {subIdx < cat.subcategories.length - 1 && (
                                    <button className={styles.reorderBtn} onClick={(e) => { e.stopPropagation(); handleMoveSubcategory(index, subIdx, 'down'); }}>
                                      <ChevronDown size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </aside>

        <main className={styles.productsContent}>
          <div className={styles.productsGrid}>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                className={`${styles.productCard} ${isEditMode ? styles.editActive : ''} ${item.status === 'Inativo' || item.status === 'Unavailable' ? styles.itemPaused : ''}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isEditMode && (
                  <div className={styles.editOverlayButtons}>
                    <button 
                      className={styles.overlayPauseBtn} 
                      onClick={(e) => { e.stopPropagation(); handleTogglePauseItem(item); }}
                    >
                      {item.status === 'Inativo' || item.status === 'Unavailable' ? 'Ativar' : 'Pausar'}
                    </button>
                    <button 
                      className={styles.overlayDeleteBtn} 
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                    >
                      Excluir
                    </button>
                  </div>
                )}
                <div className={styles.productImageWrapper}>
                  {item.image ? (
                    (() => {
                      let mediaUrl = item.image;
                      // Safe check if it's still a JSON string
                      if (typeof mediaUrl === 'string' && (mediaUrl.startsWith('[') || mediaUrl.startsWith('{'))) {
                        try { mediaUrl = JSON.parse(mediaUrl); } catch(e) {}
                      }
                      
                      const finalUrl = Array.isArray(mediaUrl) ? mediaUrl[0] : mediaUrl;
                      const isVideo = typeof finalUrl === 'string' && (finalUrl.endsWith('.mp4') || finalUrl.endsWith('.webm') || finalUrl.endsWith('.mov'));
                      
                      // V6: Sanitização de URL de mídia
                      if (!finalUrl || !isSafeMediaUrl(finalUrl)) {
                         return <div className={styles.imagePlaceholder}><ImageOff size={40} strokeWidth={1} /></div>;
                      }

                      if (isVideo) {
                        return <video src={finalUrl} className={styles.productImage} muted onMouseOver={e => e.target.play()} onMouseOut={e => e.target.pause()} />;
                      }
                      return (
                        <img
                          src={finalUrl}
                          alt={item.name}
                          className={styles.productImage}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <ImageOff size={40} strokeWidth={1} />
                    </div>
                  )}
                </div>
                <div className={styles.productInfo}>
                  <div className={styles.productTitleRow}>
                    <span className={styles.productTitle}>{item.name}</span>
                    <span className={styles.productPrice}>{formatCurrency(item.price)}</span>
                  </div>
                  <div className={styles.productMetaRow} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={styles.productStatus}>
                      <div className={`${styles.statusDot} ${item.status === 'Ativo' || item.status === 'Available' ? styles.available : ''}`}></div>
                      {item.status === 'Ativo' || item.status === 'Available' ? 'Ativo' : 'Inativo'}
                    </div>
                    {Boolean(item.popular) && (
                      <div className={styles.popularBadge}>
                        <Star size={11} fill="currentColor" strokeWidth={3} />
                        POPULAR
                      </div>
                    )}
                    <span className={styles.productTag}>{item.category_name || item.category}</span>
                  </div>
                </div>
                <div className={styles.productFooter}>
                  <button className={styles.configureBtn} onClick={() => handleEditItemClick(item)}>
                    <Pencil size={13} />
                    Configurar
                    <ChevronRight size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </main>
      </div>

      {/* CATEGORY DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              className={styles.drawerOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseMenuDrawer}
            />
            <motion.div
              className={styles.drawerContent}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className={styles.drawerHeader}>
                <div>
                  <h2>Criar menu</h2>
                  <p>Criar um novo menu</p>
                </div>
                <button className={styles.closeBtn} onClick={handleCloseMenuDrawer}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.drawerBody}>
                <div className={styles.formGroup}>
                  <label>Nome</label>
                  <input
                    type="text"
                    placeholder="Nome do menu"
                    value={newMenuName}
                    onChange={(e) => setNewMenuName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Descrição</label>
                  <textarea
                    rows={4}
                    placeholder="Descrição do menu"
                    value={description}
                    onChange={handleDescriptionChange}
                    style={{ overflow: 'hidden' }}
                  ></textarea>
                </div>

                <div className={styles.formGroup}>
                  <label>Categorias</label>
                  {newMenuCategories.length > 0 && (
                    <div className={styles.linkedCategoriesList} style={{ marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {newMenuCategories.map((cat, idx) => (
                        <div key={idx} className={styles.linkedCategoryBadge} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px', fontWeight: '500', color: '#374151', border: '1px solid #e5e7eb' }}>
                          {cat}
                          <button
                            type="button"
                            onClick={() => handleRemoveSubCategory(idx)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#9ca3af' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isAddingCategory ? (
                    <div className={styles.linkedItemsBox}>
                      <button className={styles.addLinkBtn} onClick={() => setIsAddingCategory(true)}>
                        <Plus size={16} />
                        Criar categoria
                      </button>
                    </div>
                  ) : (
                    <div className={styles.linkedCategoryForm}>
                      <label>Name</label>
                      <input
                        type="text"
                        placeholder="Nome da categoria"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.linkedCategoryActions}>
                        <button className={styles.secondaryBtn} onClick={() => {
                          setIsAddingCategory(false);
                          setNewCategoryName('');
                        }}>Cancelar</button>
                        <button className={styles.primaryBtn} onClick={handleAddSubCategory}>Criar categoria</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.drawerFooter}>
                <button className={styles.secondaryBtn} onClick={handleCloseMenuDrawer}>
                  Cancelar
                </button>
                <button className={styles.primaryBtn} onClick={handleCreateMenu}>
                  Criar menu
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ITEM DRAWER */}
      <AnimatePresence>
        {isItemDrawerOpen && (
          <>
            <motion.div
              className={styles.drawerOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseItemDrawer}
            />
            <motion.div
              className={styles.drawerContent}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className={styles.drawerHeader}>
                <div>
                  <h2>{editingItem ? 'Editar item' : 'Criar item'}</h2>
                  <p>{editingItem ? 'Edite os detalhes do seu item' : 'Criar um novo item'}</p>
                </div>
                <button className={styles.closeBtn} onClick={handleCloseItemDrawer}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.drawerBody}>
                <div className={styles.formGroup}>
                  <label>Nome</label>
                  <input
                    type="text"
                    placeholder="Nome do prato"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Menu</label>
                  <div className={styles.customSelectWrapper} ref={menuSelectRef}>
                    <div 
                      className={styles.customSelectTrigger}
                      onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
                    >
                      <span>{selectedItemMenu || 'Selecione o menu'}</span>
                      <ChevronDown size={16} className={`${styles.selectArrow} ${isMenuDropdownOpen ? styles.rotated : ''}`} />
                    </div>
                    {isMenuDropdownOpen && (
                      <ul className={styles.customSelectOptions}>
                        <li 
                          onClick={() => {
                            setSelectedItemMenu('');
                            setSelectedItemSubCategory('');
                            setIsMenuDropdownOpen(false);
                          }}
                          className={selectedItemMenu === '' ? styles.selectedOption : ''}
                        >
                          Selecione o menu
                        </li>
                        {categories.filter(c => c.name !== 'Todos os itens').map((c, i) => (
                          <li 
                            key={i}
                            onClick={() => {
                              setSelectedItemMenu(c.name);
                              setSelectedItemSubCategory('');
                              setIsMenuDropdownOpen(false);
                            }}
                            className={selectedItemMenu === c.name ? styles.selectedOption : ''}
                          >
                            {c.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Categoria</label>
                  <div 
                    className={`${styles.customSelectWrapper} ${!selectedItemMenu ? styles.selectDisabled : ''}`} 
                    ref={subCategorySelectRef}
                  >
                    <div 
                      className={styles.customSelectTrigger}
                      onClick={() => {
                        if (selectedItemMenu) {
                          setIsSubCategoryDropdownOpen(!isSubCategoryDropdownOpen);
                        }
                      }}
                    >
                      <span>{selectedItemSubCategory || 'Selecione a categoria'}</span>
                      <ChevronDown size={16} className={`${styles.selectArrow} ${isSubCategoryDropdownOpen ? styles.rotated : ''}`} />
                    </div>
                    {isSubCategoryDropdownOpen && selectedItemMenu && (() => {
                      const menuObj = categories.find(c => c.name === selectedItemMenu);
                      const subcats = (menuObj && menuObj.subcategories) || [];
                      
                      return (
                        <ul className={styles.customSelectOptions}>
                          <li 
                            onClick={() => {
                              setSelectedItemSubCategory('');
                              setIsSubCategoryDropdownOpen(false);
                            }}
                            className={selectedItemSubCategory === '' ? styles.selectedOption : ''}
                          >
                            Selecione a categoria
                          </li>
                          {subcats.length > 0 ? (
                            subcats.map((sub, i) => (
                              <li 
                                key={i}
                                onClick={() => {
                                  setSelectedItemSubCategory(sub);
                                  setIsSubCategoryDropdownOpen(false);
                                }}
                                className={selectedItemSubCategory === sub ? styles.selectedOption : ''}
                              >
                                {sub}
                              </li>
                            ))
                          ) : (
                            <li className={styles.disabledOption} style={{ padding: '10px 12px', fontSize: '13px', color: '#9ca3af', cursor: 'default' }}>
                              Lembre de adicionar Categorias no Menu '{selectedItemMenu}'.
                            </li>
                          )}
                        </ul>
                      );
                    })()}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Imagens e Vídeos do Item</label>
                  <div className={styles.imageUploadBox}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      multiple 
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        const newFiles = files.map(file => ({
                          file,
                          preview: URL.createObjectURL(file),
                          type: file.type.startsWith('video') ? 'video' : 'image'
                        }));
                        setItemMediaFiles([...itemMediaFiles, ...newFiles]);
                      }}
                    />
                    <button className={styles.uploadMainBtn} onClick={() => fileInputRef.current?.click()}>
                      <Plus size={16} />
                      Criar imagem do item
                    </button>
                    <button className={styles.linkAssetBtn}>Vincular imagem existente</button>
                  </div>
                  {itemMediaFiles.length > 0 && (
                    <div className={styles.mediaPreviewGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
                      {itemMediaFiles.map((m, i) => (
                        <div key={i} className={styles.mediaPreviewItem} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          {m.type === 'video' ? (
                            <video src={m.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <img src={m.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                          <button 
                            className={styles.removeMediaBtn} 
                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer' }}
                            onClick={() => {
                              const updated = itemMediaFiles.filter((_, idx) => idx !== i);
                              setItemMediaFiles(updated);
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Descrição</label>
                  <div className={styles.richTextContainer}>
                    <div className={styles.textToolbar}>
                      <div className={styles.toolbarGroup}>
                        <div className={styles.toolbarSelect}>Parágrafo <ChevronRight size={14} className="rotate-90" /></div>
                      </div>
                      <div className={styles.toolbarGroup}>
                        <button className={styles.toolBtn}><Bold size={16} /></button>
                        <button className={styles.toolBtn}><Italic size={16} /></button>
                        <button className={styles.toolBtn}><Underline size={16} /></button>
                        <button className={styles.toolBtn}><Type size={16} /></button>
                        <button className={styles.toolBtn}><Link size={16} /></button>
                      </div>
                      <div className={styles.toolbarGroup}>
                        <button className={styles.toolBtn}><List size={16} /></button>
                        <button className={styles.toolBtn}><ListOrdered size={16} /></button>
                        <button className={styles.toolBtn}><Maximize2 size={16} /></button>
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Descrição do produto..."
                      value={itemDescription}
                      onChange={handleItemDescriptionChange}
                      style={{ overflow: 'hidden' }}
                    ></textarea>
                  </div>
                </div>

                <div 
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    margin: '20px 0 10px 0',
                    userSelect: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                >
                  <span>Avançado opcional</span>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      transform: showAdvancedOptions ? 'rotate(180deg)' : 'rotate(0deg)', 
                      transition: 'transform 0.2s ease',
                      color: '#6b7280'
                    }} 
                  />
                </div>

                {showAdvancedOptions && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                    <div className={styles.formGroup}>
                      <label>Tempo de Preparo</label>
                      <p className={styles.fieldHint} style={{ fontSize: '13px', color: '#888', margin: '-4px 0 6px 0' }}>Tempo de preparo em minutos</p>
                      <input
                        type="number"
                        placeholder="15"
                        value={itemPrepTime}
                        onChange={(e) => setItemPrepTime(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Calorias</label>
                      <p className={styles.fieldHint} style={{ fontSize: '13px', color: '#888', margin: '-4px 0 6px 0' }}>Contagem de calorias para este item</p>
                      <input
                        type="number"
                        placeholder="Ex: 450"
                        value={itemCalories}
                        onChange={(e) => setItemCalories(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Área de Preparo</label>
                      <select
                        className={styles.customSelect}
                        value={itemKitchenStation}
                        onChange={(e) => setItemKitchenStation(e.target.value)}
                      >
                        <option value="">Selecione a estação</option>
                        <option value="Grill">Grill</option>
                        <option value="Fritadeira">Fritadeira</option>
                        <option value="Salada">Salada</option>
                        <option value="Bar">Bar</option>
                      </select>
                    </div>

                    <div className={`${styles.formGroup} ${styles.multiSelectWrapper}`} ref={allergenRef}>
                      <label>Alérgenos</label>
                      <div className={styles.multiSelectContainer}>
                        <div className={styles.multiSelectInputBox} onClick={() => setIsAllergenDropdownOpen(!isAllergenDropdownOpen)}>
                          {itemAllergens.map(a => (
                            <div key={a} className={styles.multiSelectBadge}>
                              <span className={styles.badgeText}>{a}</span>
                              <button type="button" aria-label="Remover" onClick={(e) => { e.stopPropagation(); setItemAllergens(itemAllergens.filter(x => x !== a)); }}>
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <input 
                            type="text" 
                            className={styles.multiSelectFakeInput} 
                            placeholder={itemAllergens.length === 0 ? "Selecione as opções..." : ""} 
                            readOnly 
                          />
                          {itemAllergens.length > 0 && (
                            <button type="button" className={styles.clearSelectBtn} aria-label="Limpar tudo" onClick={(e) => { e.stopPropagation(); setItemAllergens([]); }}>
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        {isAllergenDropdownOpen && allergensList.filter(al => !itemAllergens.includes(al)).length > 0 && (
                          <ul className={styles.multiSelectDropdown}>
                            {allergensList.filter(al => !itemAllergens.includes(al)).map(al => (
                              <li key={al} onClick={(e) => {
                                e.stopPropagation();
                                setItemAllergens([...itemAllergens, al]);
                              }}>
                                {al}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className={`${styles.formGroup} ${styles.multiSelectWrapper}`} ref={dietaryRef}>
                      <label>Restrições Alimentares</label>
                      <div className={styles.multiSelectContainer}>
                        <div className={styles.multiSelectInputBox} onClick={() => setIsDietaryDropdownOpen(!isDietaryDropdownOpen)}>
                          {itemDietaryFlags.map(d => (
                            <div key={d} className={styles.multiSelectBadge}>
                              <span className={styles.badgeText}>{d}</span>
                              <button type="button" aria-label="Remover" onClick={(e) => { e.stopPropagation(); setItemDietaryFlags(itemDietaryFlags.filter(x => x !== d)); }}>
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <input 
                            type="text" 
                            className={styles.multiSelectFakeInput} 
                            placeholder={itemDietaryFlags.length === 0 ? "Selecione as opções..." : ""} 
                            readOnly 
                          />
                          {itemDietaryFlags.length > 0 && (
                            <button type="button" className={styles.clearSelectBtn} aria-label="Limpar tudo" onClick={(e) => { e.stopPropagation(); setItemDietaryFlags([]); }}>
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        {isDietaryDropdownOpen && dietaryList.filter(df => !itemDietaryFlags.includes(df)).length > 0 && (
                          <ul className={styles.multiSelectDropdown}>
                            {dietaryList.filter(df => !itemDietaryFlags.includes(df)).map(df => (
                              <li key={df} onClick={(e) => {
                                e.stopPropagation();
                                setItemDietaryFlags([...itemDietaryFlags, df]);
                              }}>
                                {df}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}


                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Preço</label>
                    <p className={styles.fieldHint}>Valor do prato</p>
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={itemPrice}
                      onChange={(e) => {
                        // Allow only numbers and comma/dot
                        const val = e.target.value.replace(/[^0-9,.]/g, '');
                        setItemPrice(val);
                      }}
                    />
                  </div>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={itemAvailable}
                      onChange={(e) => setItemAvailable(e.target.checked)}
                    />
                    Disponível
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={itemFeatured}
                      onChange={(e) => setItemFeatured(e.target.checked)}
                    />
                    Destaque
                  </label>
                </div>
              </div>

              <div className={styles.drawerFooter}>
                <button className={styles.secondaryBtn} onClick={handleCloseItemDrawer}>
                  Cancelar
                </button>
                <button className={styles.primaryBtn} onClick={handleCreateItem}>
                  {editingItem ? 'Salvar alterações' : 'Criar item'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* DELETE CONFIRMATION MODAL */}
      {/* Menu / Category Delete Confirmation */}
      <AnimatePresence>
        {(categoryToDelete || subcategoryToDelete) && (
          <div className={styles.customModalOverlay}>
            <motion.div 
              className={styles.customModalBox}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className={styles.modalIconWarning}>
                <Trash2 size={40} color="#ef4444" />
              </div>
              <h2>Excluir {subcategoryToDelete ? 'Subcategoria' : 'Menu'}?</h2>
              <p>
                Tem certeza que deseja excluir <strong>{subcategoryToDelete ? subcategoryToDelete.subName : categoryToDelete.name}</strong>? 
                {categoryToDelete && " Todos os itens deste menu ficarão sem categoria."}
              </p>
              
              <div className={styles.modalActionsList}>
                <button 
                  className={styles.confirmBtnDanger} 
                  onClick={subcategoryToDelete ? confirmDeleteSubcategory : confirmDeleteCategory}
                >
                  Sim, excluir agora
                </button>
                <button 
                  className={styles.cancelBtnOutline} 
                  onClick={() => { setCategoryToDelete(null); setSubcategoryToDelete(null); }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {itemToDelete && (
          <div className={styles.customModalOverlay}>
            <motion.div 
              className={styles.customModalBox}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className={styles.modalIconWarning}>
                 <Trash2 size={40} color="#ef4444" />
              </div>
              <h2>Excluir Item?</h2>
              <p>Esta ação não pode ser desfeita. O item será removido permanentemente do seu cardápio.</p>
              
              <div className={styles.modalActionsList}>
                <button className={styles.confirmBtnDanger} onClick={confirmDelete}>
                  Sim, excluir item
                </button>
                <button className={styles.cancelBtnOutline} onClick={() => setItemToDelete(null)}>
                  Não, cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Warning */}
      <AnimatePresence>
        {showMenuWarning && (
          <div className={styles.customModalOverlay}>
            <motion.div 
              className={styles.customModalBox}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.modalIconWarning} style={{ background: '#f0fdf4' }}>
                <Plus size={40} color="#77bb2b" />
              </div>
              <h2>Criar Novo Menu</h2>
              <p>Por favor, crie um <strong>Novo Menu</strong> antes de adicionar itens ao seu cardápio.</p>
              
              <div className={styles.modalActionsList}>
                <button 
                  className={styles.confirmBtnDanger} 
                  onClick={() => { setShowMenuWarning(false); setIsDrawerOpen(true); triggerMenuHighlight(); }}
                  style={{ background: '#77bb2b', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#66a025'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#77bb2b'}
                >
                  Criar Menu Agora
                </button>
                <button className={styles.cancelBtnOutline} onClick={() => { setShowMenuWarning(false); triggerMenuHighlight(); }}>
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ItemsPage;
