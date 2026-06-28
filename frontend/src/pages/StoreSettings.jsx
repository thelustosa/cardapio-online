import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Tag,
  Clock,
  Save,
  Trash2,
  Plus,
  Copy,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './StoreSettings.module.css';

const StoreSettings = ({ storeData, onUpdate, setIsDirty }) => {
  const currentDayIndex = new Date().getDay(); // 0 (Dom) to 6 (Sáb)
  const dayMapping = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  const currentDayLabel = dayMapping[currentDayIndex];
  const [activeDay, setActiveDay] = useState(currentDayLabel);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, success, error
  const [isSaving, setIsSaving] = useState(false);
  
  const [schedule, setSchedule] = useState(storeData?.schedule || {
    'DOM': { windows: [{ open: '11:00', close: '22:00' }], isOpen: true },
    'SEG': { windows: [{ open: '11:00', close: '22:00' }], isOpen: true },
    'TER': { windows: [{ open: '11:00', close: '22:00' }], isOpen: true },
    'QUA': { windows: [{ open: '11:00', close: '22:00' }], isOpen: true },
    'QUI': { windows: [{ open: '11:00', close: '22:00' }], isOpen: true },
    'SEX': { windows: [{ open: '11:00', close: '23:00' }], isOpen: true },
    'SAB': { windows: [{ open: '11:00', close: '23:00' }], isOpen: true },
  });

  const handleAddWindow = () => {
    const activeSchedule = schedule[activeDay];
    if (activeSchedule.windows.length >= 3) return; // Limite de 3 janelas
    
    setSchedule({
      ...schedule,
      [activeDay]: {
        ...activeSchedule,
        windows: [...activeSchedule.windows, { open: '18:00', close: '22:00' }]
      }
    });
    setIsDirty(true);
  };

  const handleRemoveWindow = (index) => {
    const activeSchedule = schedule[activeDay];
    if (activeSchedule.windows.length <= 1) return;

    const newWindows = activeSchedule.windows.filter((_, i) => i !== index);
    setSchedule({
      ...schedule,
      [activeDay]: { ...activeSchedule, windows: newWindows }
    });
    setIsDirty(true);
  };

  const handleUpdateTime = (index, field, value, e) => {
    // Permite apenas números e limita a 4 caracteres brutos
    const digits = value.replace(/\D/g, '').slice(0, 4);
    
    // Formata como HH:mm
    let formatted = digits;
    if (digits.length >= 3) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
    
    const activeSchedule = schedule[activeDay];
    const newWindows = [...activeSchedule.windows];
    newWindows[index] = { ...newWindows[index], [field]: formatted };
    
    setSchedule({
      ...schedule,
      [activeDay]: { ...activeSchedule, windows: newWindows }
    });

    // Lógica de "Pular para o próximo" ao completar 4 números
    if (digits.length === 4 && e) {
      setTimeout(() => {
        const inputs = Array.from(document.querySelectorAll(`.${styles.serviceWindowRow} input`));
        const currentIndex = inputs.indexOf(e.target);
        if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
          inputs[currentIndex + 1].focus();
          inputs[currentIndex + 1].select(); // Seleciona o conteúdo para facilitar a digitação
        }
      }, 10);
    }
  };

  const openDaysCount = Object.values(schedule).filter(day => day.isOpen).length;

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Atualiza a cada minuto
    return () => clearInterval(timer);
  }, []);

  const days = [
    { label: 'DOM', status: 'active', isToday: currentDayIndex === 0 },
    { label: 'SEG', status: 'active', isToday: currentDayIndex === 1 },
    { label: 'TER', status: 'active', isToday: currentDayIndex === 2 },
    { label: 'QUA', status: 'active', isToday: currentDayIndex === 3 },
    { label: 'QUI', status: 'active', isToday: currentDayIndex === 4 },
    { label: 'SEX', status: 'active', isToday: currentDayIndex === 5 },
    { label: 'SAB', status: 'active', isToday: currentDayIndex === 6 },
  ];

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const storeId = localStorage.getItem('activeStoreId');
      if (!storeId) {
        alert('Usuário não identificado. Por favor, faça login.');
        setIsSaving(false);
        return;
      }

      // Fetch Security Tokens securely
      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3002' : 'https://api.zestmenu.com.br';
      let csrfToken = '', nonce = '';
      try {
        const csrfRes = await fetch(`${apiBase}/api/csrf-token`, { credentials: 'include' });
        csrfToken = (await csrfRes.json()).csrfToken;
        const nonceRes = await fetch(`${apiBase}/api/nonce`);
        nonce = (await nonceRes.json()).nonce;
      } catch (err) {
        console.warn('Proteções de segurança inativas localmente ou erro de fecth');
      }

      // Collect data from inputs (using IDs or refs)
      const data = {
        nome: document.getElementById('store-name').value,
        cnpj: document.getElementById('store-cnpj').value,
        endereco: document.getElementById('store-address').value,
        telefone: document.getElementById('store-phone').value,
        email: document.getElementById('store-email').value,
        promo_banner: document.getElementById('store-promo').value,
        schedule: schedule // This is already reactive state
      };

      const response = await fetch(`${apiBase}/api/store/${storeId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken,
          'X-Nonce-Token': nonce
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (response.ok) {
        if (setIsDirty) setIsDirty(false);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
        if (onUpdate) onUpdate(data);
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

  const handleCopyToAll = () => {
    const activeSchedule = schedule[activeDay];
    const newSchedule = {};
    
    dayMapping.forEach(day => {
      newSchedule[day] = {
        ...activeSchedule,
        // Deep clone windows to avoid reference shared across days
        windows: activeSchedule.windows.map(w => ({ ...w }))
      };
    });
    
    setSchedule(newSchedule);
    setIsDirty(true);
  };

  const fullDayNames = {
    'SEG': 'Segunda-feira',
    'TER': 'Terça-feira',
    'QUA': 'Quarta-feira',
    'QUI': 'Quinta-feira',
    'SEX': 'Sexta-feira',
    'SAB': 'Sábado',
    'DOM': 'Domingo'
  };

  return (
    <motion.div
      className={styles.settingsContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* HEADER */}
      <div className={styles.settingsHeader}>
        <div className={styles.headerInfo}>
          <h1>Configurações da Loja</h1>
          <p>Controles centralizados de como sua loja aparece e opera.</p>
        </div>
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
      </div>

      {/* QUICK STATS */}
      <div className={styles.quickStatsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>DIAS ABERTOS</span>
          <span className={styles.statValue}>{openDaysCount} <span className={styles.statDim}>/ 7</span></span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>HOJE</span>
          <span className={`${styles.statValue} ${!schedule[currentDayLabel].isOpen ? styles.closedText : ''}`}>
            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][currentDayIndex]}: {
              schedule[currentDayLabel].isOpen 
                ? schedule[currentDayLabel].windows.map(w => `${w.open} às ${w.close}`).join(' + ')
                : 'Fechado'
            }
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>HORÁRIO ATUAL</span>
          <span className={styles.statValue}>
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>FUSO HORÁRIO</span>
          <span className={styles.statValue}>Brasília</span>
        </div>
      </div>

      <div className={`${styles.settingsGrid} ${schedule[activeDay].windows.length > 1 ? styles.hasMultipleWindows : ''}`}>
        {/* IDENTITY & CONTACT */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <Building2 size={18} className={styles.cardIcon} />
            <span className={styles.cardTitle}>IDENTIFICAÇÃO & CONTATO</span>
          </div>

          <div className={styles.cardContentGrid}>
            <div className={`${styles.gridRow} ${styles.row2}`}>
              <div className={styles.gridCell}>
                <label>NOME DA LOJA</label>
                <input id="store-name" type="text" defaultValue={storeData?.nome || 'Stack Burger Co.'} onChange={() => setIsDirty(true)} placeholder="Nome do seu negócio" />
              </div>
              <div className={styles.gridCell}>
                <label>CNPJ</label>
                <input id="store-cnpj" type="text" defaultValue={storeData?.cnpj || ''} onChange={() => setIsDirty(true)} placeholder="00.000.000/0000-00" />
              </div>
            </div>

            <div className={`${styles.gridRow} ${styles.full}`}>
              <div className={styles.gridCell}>
                <label>ENDEREÇO</label>
                <input id="store-address" type="text" defaultValue={storeData?.endereco || ''} onChange={() => setIsDirty(true)} placeholder="Rua, Número, Bairro, Cidade - UF" />
              </div>
            </div>

            <div className={`${styles.gridRow} ${styles.row2}`}>
              <div className={styles.gridCell}>
                <label>TELEFONE</label>
                <input id="store-phone" type="text" defaultValue={storeData?.telefone || '(718) 555-0142'} onChange={() => setIsDirty(true)} placeholder="Telefone de contato" />
              </div>
              <div className={styles.gridCell}>
                <label>EMAIL</label>
                <input id="store-email" type="text" defaultValue={storeData?.email || 'info@restaurant.com'} onChange={() => setIsDirty(true)} placeholder="Email de contato" />
              </div>
            </div>

            <div className={`${styles.gridRow} ${styles.full}`}>
              <div className={styles.gridCell}>
                <label>PROMO BANNER</label>
                <input id="store-promo" type="text" defaultValue={storeData?.promo_banner || ""} onChange={() => setIsDirty(true)} />
              </div>
            </div>
          </div>
        </div>

        {/* OPERATIONS */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <Calendar size={18} className={styles.cardIcon} />
            <span className={styles.cardTitle}>OPERAÇÕES</span>
          </div>

          <div className={styles.cardContentGrid}>
            {/* DAY SELECTOR ROW */}
            <div className={`${styles.gridRow} ${styles.full}`}>
              <div className={styles.daySelector}>
                {days.map((day) => (
                  <div
                    key={day.label}
                    className={`${styles.dayItem} ${activeDay === day.label ? styles.active : ''}`}
                    onClick={() => setActiveDay(day.label)}
                  >
                    <span className={styles.dayLabel}>{day.label}</span>
                    <div className={`${styles.statusDot} ${schedule[day.label].isOpen ? styles.active : ''}`}></div>
                    {day.isToday && <span className={styles.todayTag}>HOJE</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* DAY INFO & TOGGLE ROW */}
            <div className={`${styles.gridRow} ${styles.full} ${styles.operationInfoRow}`}>
              <div className={styles.gridCell}>
                <div className={styles.infoWithToggle}>
                  <div className={styles.dayStatusText}>
                    <span className={styles.selectedDayName}>{fullDayNames[activeDay]}</span>
                    <span className={styles.serviceWindowsCount}>
                      {schedule[activeDay].windows.length} {schedule[activeDay].windows.length === 1 ? 'janela' : 'janelas'} de serviço
                    </span>
                  </div>

                  <div className={styles.statusToggleWrapper}>
                    <span className={styles.statusLabelSmall}>{schedule[activeDay].isOpen ? 'Aberto' : 'Fechado'}</span>
                    <div 
                      className={`${styles.toggleSwitch} ${schedule[activeDay].isOpen ? styles.active : ''}`}
                      onClick={() => {
                        setSchedule({
                          ...schedule, 
                          [activeDay]: { ...schedule[activeDay], isOpen: !schedule[activeDay].isOpen }
                        });
                        setIsDirty(true);
                      }}
                    >
                      <div className={styles.toggleHandle}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TIME INPUTS GRID ROWS */}
            {schedule[activeDay].windows.map((window, index) => (
              <div key={index} className={`${styles.gridRow} ${styles.serviceWindowRow}`}>
                <div className={styles.gridCell}>
                  <label>ABRE</label>
                  <div className={styles.timeInputFlat}>
                    <input 
                      type="text" 
                      value={window.open} 
                      onChange={(e) => handleUpdateTime(index, 'open', e.target.value, e)} 
                    />
                    <Clock size={14} />
                  </div>
                </div>
                <div className={styles.gridCell}>
                  <label>FECHA</label>
                  <div className={styles.timeInputFlat}>
                    <input 
                      type="text" 
                      value={window.close} 
                      onChange={(e) => handleUpdateTime(index, 'close', e.target.value, e)} 
                    />
                    <Clock size={14} />
                  </div>
                </div>
                {schedule[activeDay].windows.length > 1 && (
                  <div className={`${styles.gridCell} ${styles.trashCell}`}>
                    <button 
                      className={styles.trashBtn} 
                      onClick={() => handleRemoveWindow(index)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}


            {/* FOOTER ACTIONS ROW */}
            <div className={`${styles.gridRow} ${styles.full} ${styles.operationFooterRow}`}>
              <div className={styles.gridCell}>
                <div className={styles.operationFooterActions}>
                  <button className={styles.linkAction} onClick={handleAddWindow}>
                    <Plus size={14} />
                    Dividir turno
                  </button>
                  <button className={styles.linkAction} onClick={handleCopyToAll}>
                    <Copy size={14} />
                    Copiar para todos
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StoreSettings;
