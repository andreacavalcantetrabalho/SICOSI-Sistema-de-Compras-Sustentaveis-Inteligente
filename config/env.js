// config/env.js - ESTE ARQUIVO SERÁ VERSIONADO!
window.SICOSI_CONFIG = {
  // Detecta automaticamente se está em desenvolvimento ou produção
  get PROXY_ENDPOINT() {
    // Se estiver rodando localmente (desenvolvimento)
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api/groq-proxy';
    }
    
    // Produção - URL FIXA do deploy na Vercel
    return 'https://sicosi-sistema-de-compras-sustentaveis-inteligente-7ing5niv4.vercel.app/api/groq-proxy';
  }
};