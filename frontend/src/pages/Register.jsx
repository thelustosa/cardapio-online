import React from 'react';
import { motion } from 'framer-motion';
import { Store, Phone, FileText, Mail, ArrowRight } from 'lucide-react';
import ZestIcon from '../assets/icone_ZEST.svg';
import styles from './Register.module.css';

const Register = ({ onRegister, onLogin }) => {
  const [isLogin, setIsLogin] = React.useState(false);
  const [formData, setFormData] = React.useState({
    nome: '',
    telefone: '',
    cnpj: '',
    email: '',
    senha: ''
  });

  const maskCNPJ = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleChange = (field, value) => {
    let maskedValue = value;
    if (field === 'cnpj') maskedValue = maskCNPJ(value);
    if (field === 'telefone') maskedValue = maskPhone(value);
    
    setFormData({ ...formData, [field]: maskedValue });
  };

  // V7: Validação de complexidade de senha no frontend
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 1) return { score, label: 'Fraca', color: '#ef4444' };
    if (score === 2) return { score, label: 'Média', color: '#f59e0b' };
    if (score === 3) return { score, label: 'Forte', color: '#10b981' };
    return { score, label: 'Muito forte', color: '#059669' };
  };

  const passwordStrength = getPasswordStrength(formData.senha);

  const validatePassword = (password) => {
    if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
    if (!/[A-Z]/.test(password)) return 'A senha deve conter pelo menos uma letra maiúscula.';
    if (!/[0-9]/.test(password)) return 'A senha deve conter pelo menos um número.';
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      if (!formData.email || !formData.senha) {
        alert('Por favor, preencha email e senha.');
        return;
      }
      onLogin({ email: formData.email, senha: formData.senha });
    } else {
      if (!formData.senha) {
        alert('Por favor, defina uma senha.');
        return;
      }
      // V7: Validação no frontend antes de enviar ao backend
      const passwordError = validatePassword(formData.senha);
      if (passwordError) {
        alert(passwordError);
        return;
      }
      onRegister(formData);
    }
  };
  return (
    <div id="register-native-dark" className={`${styles.registerContainer} ${styles.darkTheme}`}>
      <motion.div 
        className={styles.registerFormBox}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className={styles.registerHeader}>
          <div className={styles.brandingContainer}>
            <img src={ZestIcon} alt="Zest Logo" className={styles.brandIcon} />
            <div className={styles.brandText}>
              <h1 className={styles.brandName}><span className={styles.openText}>zest</span>menu</h1>
              <span className={styles.brandSubtext}>CARDÁPIO DIGITAL</span>
            </div>
          </div>
          <h1>{isLogin ? 'Acesse sua conta' : 'Crie sua conta'}</h1>
          <p className={styles.subtitle}>
            {isLogin ? 'Novo por aqui?' : 'Já tem uma conta?'} {' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
              {isLogin ? 'Cadastre-se' : 'Entrar'}
            </a>
          </p>
        </header>

        <form className={styles.registerForm} onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className={styles.formGroup}>
                <label>Nome da Loja</label>
                <input 
                  type="text" 
                  placeholder="Ex: Gourmet Burgers" 
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Telefone</label>
                <input 
                  type="tel" 
                  placeholder="(00) 00000-0000" 
                  value={formData.telefone}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>CNPJ</label>
                <input 
                  type="text" 
                  placeholder="00.000.000/0000-00" 
                  value={formData.cnpj}
                  onChange={(e) => handleChange('cnpj', e.target.value)}
                />
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label>Email</label>
            <input 
              type="email" 
              placeholder="seu@exemplo.com" 
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Senha</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={formData.senha}
              onChange={(e) => handleChange('senha', e.target.value)}
            />
            {/* V7: Indicador visual de força da senha */}
            {!isLogin && formData.senha && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      height: '3px',
                      flex: 1,
                      borderRadius: '2px',
                      background: i <= passwordStrength.score ? passwordStrength.color : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.3s'
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: passwordStrength.color, fontWeight: '500' }}>
                  {passwordStrength.label}
                </span>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', lineHeight: '1.6' }}>
                  {formData.senha.length < 8 && <div>• Mínimo 8 caracteres</div>}
                  {!/[A-Z]/.test(formData.senha) && <div>• Uma letra maiúscula</div>}
                  {!/[0-9]/.test(formData.senha) && <div>• Um número</div>}
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className={styles.submitBtnDark}
          >
            {isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <footer className={styles.registerFooter}>
          Esqueceu sua senha? <a href="#reset">Recuperar senha</a>
        </footer>
      </motion.div>
    </div>
  );
};

export default Register;
