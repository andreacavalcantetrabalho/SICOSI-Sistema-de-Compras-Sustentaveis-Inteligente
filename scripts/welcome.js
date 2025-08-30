// scripts/welcome.js

/**
 * Gerencia a página de boas-vindas simplificada do SICOSI.
 */
document.addEventListener('DOMContentLoaded', () => {
  
  /**
   * Abre o site do ComprasNet em uma nova aba.
   */
  const openComprasNet = () => {
    try {
      // Esta é a forma correta de chamar a API do Chrome
      chrome.tabs.create({ url: 'https://catalogo.compras.gov.br/cnbs-web/busca' });
    } catch (error) {
      console.error("Erro ao tentar abrir o ComprasNet:", error);
    }
  };

  /**
   * Mostra ou oculta a seção de instruções.
   */
  const toggleInstructions = () => {
    const instructionsDiv = document.getElementById('instructions');
    const instructionsBtn = document.getElementById('showInstructionsBtn');
    
    if (instructionsDiv && instructionsBtn) {
      const isHidden = instructionsDiv.style.display === 'none';
      instructionsDiv.style.display = isHidden ? 'block' : 'none';
      instructionsBtn.textContent = isHidden ? '📖 Ocultar Instruções' : '📖 Ver Instruções';
      if (isHidden) {
        instructionsDiv.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  /**
   * Associa as funções aos elementos do DOM.
   */
  const setupEventListeners = () => {
    const comprasNetBtn = document.getElementById('openComprasNetBtn');
    const instructionsBtn = document.getElementById('showInstructionsBtn');

    if (comprasNetBtn) {
      comprasNetBtn.addEventListener('click', openComprasNet);
    }
    
    if (instructionsBtn) {
      instructionsBtn.addEventListener('click', toggleInstructions);
    }
  };

  // --- Execução Principal ---
  setupEventListeners();
  console.log("🌱 SICOSI: Página de boas-vindas carregada.");

});