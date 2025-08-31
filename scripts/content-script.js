/**
 * Content Script - SICOSI (VERSÃO CORRIGIDA COMPLETA)
 * ARQUIVO: scripts/content-script.js
 * Combina a simplicidade da versão antiga com as melhorias da nova
 * Prioriza funcionamento básico sobre funcionalidades avançadas
 */

(function() {
  'use strict';

  // Prevenir múltiplas execuções
  if (window.SICOSISustentavelInitialized) {
    return;
  }
  window.SICOSISustentavelInitialized = true;

  // Variáveis globais
  let currentModal = null;
  let isModalVisible = false;
  let debounceTimer = null;
  let observerInstance = null;
  let userSettings = { enabled: true }; // Padrão simples
  let llmAnalyzer = null;

  console.log("🌱 SICOSI: Iniciando extensão...");

  /**
   * INICIALIZAÇÃO SIMPLIFICADA E ROBUSTA
   */
  async function initialize() {
    try {
      // Verificar compatibilidade da página
      if (!isCompatiblePage()) {
        console.log("🌱 SICOSI: Página não compatível");
        return;
      }

      // Carregar configurações (com fallback)
      await loadUserSettings();

      if (!userSettings.enabled) {
        console.log("🌱 SICOSI: Extensão desabilitada");
        return;
      }

      // Inicializar LLM se disponível (não bloquear se falhar)
      await initializeLLMAnalyzer();

      // Configurar monitoramento
      setupPageObserver();
      monitorExistingElements();

      console.log("🌱 SICOSI: Extensão ativa e funcionando!");

    } catch (error) {
      console.error("🌱 SICOSI: Erro na inicialização:", error);
      // Continuar funcionando mesmo com erro
      setupBasicMonitoring();
    }
  }

  /**
   * VERIFICAÇÃO DE COMPATIBILIDADE SIMPLES
   */
  function isCompatiblePage() {
    const hostname = window.location.hostname;
    return hostname.includes('compras.gov.br') || 
           hostname === 'localhost' || 
           hostname === '127.0.0.1';
  }

  /**
   * CARREGAMENTO DE CONFIGURAÇÕES COM FALLBACK
   */
  async function loadUserSettings() {
    try {
      if (chrome?.storage?.sync) {
        const result = await chrome.storage.sync.get(['SICOSISettings']);
        userSettings = result.SICOSISettings || { enabled: true };
      }
    } catch (error) {
      console.warn("🌱 SICOSI: Usando configurações padrão");
      userSettings = { enabled: true };
    }
  }

  /**
   * INICIALIZAÇÃO DO LLM (NÃO BLOQUEAR SE FALHAR)
   */
  async function initializeLLMAnalyzer() {
    try {
      if (window.SICOSILLMAnalyzer) {
        llmAnalyzer = window.SICOSILLMAnalyzer;
        await llmAnalyzer.initialize();
        console.log("🌱 SICOSI: LLM analyzer disponível");
      }
    } catch (error) {
      console.warn("🌱 SICOSI: LLM não disponível, usando análise local");
      llmAnalyzer = null;
    }
  }

  /**
   * OBSERVADOR DE DOM ROBUSTO
   */
  function setupPageObserver() {
    if (observerInstance) {
      observerInstance.disconnect();
    }

    observerInstance = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(monitorExistingElements, 500);
    });

    observerInstance.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false // Reduzir carga
    });

    // Backup: verificação periódica
    setInterval(monitorExistingElements, 3000);
  }

  /**
   * MONITORAMENTO BÁSICO COMO FALLBACK
   */
  function setupBasicMonitoring() {
    console.log("🌱 SICOSI: Usando monitoramento básico de fallback");
    setInterval(monitorExistingElements, 2000);
  }

  /**
   * DETECÇÃO DE BOTÕES ROBUSTA E SIMPLES
   */
  function monitorExistingElements() {
    if (!userSettings?.enabled) return;

    // Buscar TODOS os botões da página
    const allButtons = document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn');
    
    allButtons.forEach(button => {
      if (button.hasSICOSIListener) return;

      const buttonText = (button.textContent || button.value || button.title || '').toLowerCase().trim();
      
      // Termos que indicam ação de adicionar item
      const actionTerms = [
        'selecionar', 'adicionar', 'incluir', 'comprar', 
        'solicitar', 'escolher', 'confirmar'
      ];

      const isActionButton = actionTerms.some(term => buttonText.includes(term));

      if (isActionButton) {
        console.log(`✅ SICOSI: Adicionando listener ao botão: "${buttonText}"`);
        button.hasSICOSIListener = true;
        
        // Usar capture phase para interceptar antes
        button.addEventListener('click', handleButtonClick, true);
        
        // Debug visual (removível em produção)
        if (userSettings.debug) {
          button.style.outline = '2px solid green';
          button.title = `SICOSI monitora: ${buttonText}`;
        }
      }
    });
  }

  /**
   * HANDLER DE CLIQUE PRINCIPAL
   */
  async function handleButtonClick(event) {
    if (isModalVisible) {
      console.log("⚠️ SICOSI: Modal já visível, ignorando");
      return;
    }

    console.log("🎯 SICOSI: Botão clicado:", event.target);

    const button = event.currentTarget || event.target;
    const productInfo = extractProductInfo(button);

    if (!productInfo.description) {
      console.warn("⚠️ SICOSI: Não conseguiu extrair descrição do produto");
      return; // Permitir ação normal
    }

    console.log("📦 SICOSI: Produto detectado:", productInfo.description);

    try {
      const analysis = await analyzeProduct(productInfo);
      
      if (analysis && !analysis.isSustainable && analysis.alternatives?.length > 0) {
        console.log("🌱 SICOSI: Produto não sustentável - mostrando modal");
        
        // INTERCEPTAR A AÇÃO
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        await showSustainabilityModal(productInfo, analysis, () => {
          // Callback para continuar com ação original
          console.log("✅ SICOSI: Usuário optou por continuar");
          button.removeEventListener('click', handleButtonClick, true);
          setTimeout(() => button.click(), 100);
        });

        // Log analytics se disponível
        logEvent('modal_shown', productInfo.description);
      }

    } catch (error) {
      console.error("❌ SICOSI: Erro na análise:", error);
      // Permitir ação normal em caso de erro
    }
  }

  /**
   * EXTRAÇÃO DE INFORMAÇÕES DO PRODUTO ROBUSTA
   */
  function extractProductInfo(button) {
    const info = {
      description: '',
      material: '',
      fullText: '',
      code: ''
    };

    // Estratégia 1: Procurar na linha da tabela (mais comum)
    let container = button.closest('tr') || 
                   button.closest('.item-row') || 
                   button.closest('li') ||
                   button.parentElement?.parentElement;

    if (container) {
      // Extrair de células da tabela
      const cells = container.querySelectorAll('td, th');
      
      if (cells.length >= 2) {
        info.code = extractCleanText(cells[0]);
        info.description = extractCleanText(cells[1]);
        
        // Procurar material em células adicionais
        for (let i = 2; i < cells.length; i++) {
          const cellText = extractCleanText(cells[i]).toLowerCase();
          if (cellText.includes('material:') || cellText.length > 10) {
            info.material = cellText.replace(/^material:\s*/i, '');
            break;
          }
        }
      } else {
        // Fallback: extrair todo texto do container
        info.description = extractCleanText(container);
      }
    }

    // Estratégia 2: Procurar em elementos próximos
    if (!info.description) {
      const nearby = button.parentElement;
      if (nearby) {
        const textElements = nearby.querySelectorAll('span, div, p, td');
        textElements.forEach(el => {
          const text = extractCleanText(el);
          if (text.length > info.description.length && text.length > 10) {
            info.description = text;
          }
        });
      }
    }

    info.fullText = `${info.code} ${info.description} ${info.material}`.toLowerCase();
    
    return info;
  }

  /**
   * EXTRAÇÃO DE TEXTO LIMPO
   */
  function extractCleanText(element) {
    if (!element) return '';
    const text = element.textContent || element.innerText || '';
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * ANÁLISE DE PRODUTO (LLM + FALLBACK)
   */
  async function analyzeProduct(productInfo) {
    // Tentar LLM primeiro
    if (llmAnalyzer) {
      try {
        const llmResult = await llmAnalyzer.analyzeProduct(productInfo);
        if (llmResult) {
          console.log("🤖 SICOSI: Análise LLM bem-sucedida");
          return llmResult;
        }
      } catch (error) {
        console.warn("🤖 SICOSI: LLM falhou, usando análise local:", error);
      }
    }

    // Fallback para análise local
    return analyzeProductLocally(productInfo);
  }

  /**
   * ANÁLISE LOCAL ROBUSTA
   */
  function analyzeProductLocally(productInfo) {
    const text = productInfo.fullText;
    
    // Termos sustentáveis
    const sustainableTerms = [
      'biodegradável', 'biodegradavel', 'compostável', 'compostavel',
      'reciclado', 'reciclável', 'reciclavel', 'fsc', 'certificado',
      'sustentável', 'sustentavel', 'ecológico', 'ecologico',
      'bambu', 'bagaço', 'bagaco', 'natural', 'orgânico', 'organico'
    ];

    // Termos não sustentáveis
    const unsustainableTerms = [
      'plástico comum', 'plastico comum', 'descartável comum',
      'poliestireno', 'isopor', 'pvc'
    ];

    const hasSustainable = sustainableTerms.some(term => text.includes(term));
    const hasUnsustainable = unsustainableTerms.some(term => text.includes(term));
    
    const isSustainable = hasSustainable || !hasUnsustainable;
    
    // Gerar alternativas se não sustentável
    const alternatives = isSustainable ? [] : generateLocalAlternatives(productInfo.description);

    return {
      isSustainable,
      sustainabilityScore: isSustainable ? 7 : 3,
      reason: isSustainable ? 
        'Produto apresenta características sustentáveis' : 
        'Produto convencional - considere alternativas ecológicas',
      alternatives,
      needsAlternatives: !isSustainable && alternatives.length > 0,
      analysisMethod: 'local'
    };
  }

  /**
   * GERAÇÃO DE ALTERNATIVAS LOCAIS
   */
  function generateLocalAlternatives(description) {
    const desc = description.toLowerCase();
    const alternatives = [];

    if (desc.includes('copo') && (desc.includes('plástico') || desc.includes('descartável'))) {
      alternatives.push({
        name: 'Copo biodegradável de bagaço de cana',
        description: 'Produzido com resíduo agrícola, decompõe em 90 dias',
        benefits: 'Zero plástico, compostável, renovável',
        searchTerms: ['copo biodegradável', 'copo bagaço cana']
      });
      alternatives.push({
        name: 'Copo de papel certificado FSC',
        description: 'Papel de fonte responsável com certificação florestal',
        benefits: 'Reciclável, manejo sustentável',
        searchTerms: ['copo papel FSC', 'copo certificado']
      });
    }

    if (desc.includes('papel') && !desc.includes('reciclado')) {
      alternatives.push({
        name: 'Papel A4 100% reciclado',
        description: 'Papel de alta qualidade produzido com aparas pós-consumo',
        benefits: 'Preserva árvores, economiza água e energia',
        searchTerms: ['papel A4 reciclado', 'papel ecológico']
      });
    }

    if (desc.includes('detergente') && !desc.includes('biodegradável')) {
      alternatives.push({
        name: 'Detergente biodegradável concentrado',
        description: 'Fórmula concentrada com surfactantes vegetais',
        benefits: 'Não polui águas, biodegrada rapidamente',
        searchTerms: ['detergente biodegradável', 'detergente ecológico']
      });
    }

    return alternatives.slice(0, 3); // Limitar a 3 alternativas
  }

  /**
   * MODAL DE SUSTENTABILIDADE
   */
  async function showSustainabilityModal(productInfo, analysis, continueCallback) {
    if (isModalVisible) return;

    isModalVisible = true;
    currentModal = createModal(productInfo, analysis, continueCallback);
    document.body.appendChild(currentModal);

    // Animar entrada
    setTimeout(() => {
      if (currentModal) {
        currentModal.classList.add('sicosi-modal-visible');
      }
    }, 50);

    // Auto-fechar após 20 segundos
    setTimeout(() => {
      if (currentModal) {
        closeModal();
        if (continueCallback) continueCallback();
      }
    }, 20000);
  }

  /**
   * CRIAÇÃO DO MODAL
   */
  function createModal(productInfo, analysis, continueCallback) {
    const modal = document.createElement('div');
    modal.id = 'sicosi-modal';
    modal.className = 'sicosi-modal-overlay';

    const alternativesHTML = analysis.alternatives
      .map(alt => `
        <div class="sicosi-alternative-item">
          <h4>${alt.name}</h4>
          <p>${alt.description}</p>
          <p class="sicosi-benefits">✅ ${alt.benefits}</p>
          <div class="sicosi-search-actions">
            ${alt.searchTerms.map(term => `
              <button class="sicosi-search-btn" data-search="${term}">
                🔍 Buscar: ${term}
              </button>
            `).join('')}
          </div>
        </div>
      `).join('');

    modal.innerHTML = `
      <div class="sicosi-modal-content">
        <div class="sicosi-modal-header">
          <div class="sicosi-header-info">
            <span class="sicosi-icon">🌱</span>
            <div>
              <h3>Alternativa Sustentável Encontrada</h3>
              <p>Sistema Inteligente de Compras Sustentáveis</p>
            </div>
          </div>
          <button class="sicosi-close-btn">&times;</button>
        </div>
        
        <div class="sicosi-modal-body">
          <div class="sicosi-product-info">
            <h4>Produto selecionado:</h4>
            <p><strong>${productInfo.description}</strong></p>
            <p class="sicosi-analysis">Análise: ${analysis.reason}</p>
          </div>
          
          <div class="sicosi-alternatives">
            <h4>🌿 Alternativas sustentáveis recomendadas:</h4>
            ${alternativesHTML}
          </div>
          
          <div class="sicosi-actions">
            <button class="sicosi-btn-continue" id="continueOriginal">
              Continuar com produto original
            </button>
          </div>
          
          <div class="sicosi-footer">
            <small>💡 Análise: ${analysis.analysisMethod === 'llm' ? '🤖 IA' : '📊 Local'} | 
            ${new Date().toLocaleTimeString('pt-BR')}</small>
          </div>
        </div>
      </div>
    `;

    setupModalEvents(modal, continueCallback);
    return modal;
  }

  /**
   * EVENTOS DO MODAL
   */
  function setupModalEvents(modal, continueCallback) {
    // Fechar modal
    const closeBtn = modal.querySelector('.sicosi-close-btn');
    const continueBtn = modal.querySelector('#continueOriginal');

    closeBtn?.addEventListener('click', () => {
      closeModal();
      logEvent('modal_dismissed', 'close_button');
    });

    continueBtn?.addEventListener('click', () => {
      closeModal();
      if (continueCallback) continueCallback();
      logEvent('modal_action', 'continue_original');
    });

    // Botões de busca
    modal.querySelectorAll('.sicosi-search-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const searchTerm = btn.dataset.search;
        performSearch(searchTerm);
        closeModal();
        logEvent('alternative_search', searchTerm);
      });
    });

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
        logEvent('modal_dismissed', 'backdrop_click');
      }
    });
  }

  /**
   * BUSCAR ALTERNATIVA
   */
  function performSearch(searchTerm) {
    const searchInput = document.querySelector('input[type="text"], input[type="search"]');
    
    if (searchInput) {
      searchInput.value = searchTerm;
      searchInput.focus();
      
      // Disparar eventos
      ['input', 'change'].forEach(eventType => {
        searchInput.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      
      // Tentar submit
      const form = searchInput.closest('form');
      if (form) {
        form.submit();
      } else {
        searchInput.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          bubbles: true
        }));
      }
      
      console.log("🔍 SICOSI: Buscando por:", searchTerm);
    }
  }

  /**
   * FECHAR MODAL
   */
  function closeModal() {
    if (currentModal) {
      currentModal.classList.add('sicosi-modal-closing');
      setTimeout(() => {
        if (currentModal?.parentNode) {
          currentModal.parentNode.removeChild(currentModal);
        }
        currentModal = null;
        isModalVisible = false;
      }, 300);
    }
  }

  /**
   * LOG DE EVENTOS
   */
  function logEvent(event, details) {
    try {
      if (window.SICOSIStorage?.logAnalytics) {
        window.SICOSIStorage.logAnalytics(event, details);
      }
      console.log(`📊 SICOSI: ${event} - ${details}`);
    } catch (error) {
      console.warn("📊 SICOSI: Erro no log:", error);
    }
  }

  // CSS do Modal (inline para garantir que funcione)
  const modalCSS = `
    .sicosi-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .sicosi-modal-overlay.sicosi-modal-visible {
      opacity: 1;
      visibility: visible;
    }

    .sicosi-modal-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 650px;
      max-height: 85vh;
      width: 90%;
      overflow: hidden;
      transform: scale(0.95);
      transition: transform 0.3s ease;
    }

    .sicosi-modal-visible .sicosi-modal-content {
      transform: scale(1);
    }

    .sicosi-modal-header {
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sicosi-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sicosi-icon {
      font-size: 28px;
    }

    .sicosi-modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .sicosi-modal-header p {
      margin: 2px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }

    .sicosi-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 24px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      transition: background 0.2s;
    }

    .sicosi-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .sicosi-modal-body {
      padding: 24px;
      max-height: calc(85vh - 140px);
      overflow-y: auto;
    }

    .sicosi-product-info {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #ff9800;
    }

    .sicosi-product-info h4 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 14px;
    }

    .sicosi-product-info p {
      margin: 4px 0;
      font-size: 13px;
      color: #555;
    }

    .sicosi-analysis {
      font-style: italic;
      color: #666 !important;
    }

    .sicosi-alternatives h4 {
      margin: 20px 0 16px 0;
      color: #333;
      font-size: 16px;
    }

    .sicosi-alternative-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      background: #fafafa;
      transition: all 0.2s;
    }

    .sicosi-alternative-item:hover {
      border-color: #4CAF50;
      background: #f8fff8;
    }

    .sicosi-alternative-item h4 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 15px;
    }

    .sicosi-alternative-item p {
      margin: 6px 0;
      font-size: 13px;
      color: #666;
    }

    .sicosi-benefits {
      color: #4CAF50 !important;
      font-weight: 500;
    }

    .sicosi-search-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .sicosi-search-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .sicosi-search-btn:hover {
      background: #45a049;
    }

    .sicosi-actions {
      text-align: center;
      margin: 24px 0 16px 0;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .sicosi-btn-continue {
      background: #f5f5f5;
      color: #666;
      border: 1px solid #ddd;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .sicosi-btn-continue:hover {
      background: #e8e8e8;
      color: #333;
    }

    .sicosi-footer {
      text-align: center;
      font-size: 11px;
      color: #888;
      margin-top: 16px;
    }

    .sicosi-modal-closing {
      opacity: 0;
      visibility: hidden;
    }

    /* Responsivo */
    @media (max-width: 768px) {
      .sicosi-modal-content {
        width: 95%;
        margin: 0 8px;
      }
      
      .sicosi-modal-header {
        padding: 20px 16px;
      }
      
      .sicosi-modal-body {
        padding: 20px 16px;
      }
      
      .sicosi-search-actions {
        flex-direction: column;
      }
      
      .sicosi-search-btn {
        width: 100%;
      }
    }
  `;

  // Injetar CSS
  const style = document.createElement('style');
  style.textContent = modalCSS;
  document.head.appendChild(style);

  // INICIALIZAR
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Cleanup
  window.addEventListener('beforeunload', () => {
    if (observerInstance) {
      observerInstance.disconnect();
    }
    if (currentModal) {
      closeModal();
    }
  });

  // Debug disponível no console
  window.SICOSI_DEBUG = {
    isModalVisible: () => isModalVisible,
    userSettings: () => userSettings,
    testModal: () => showSustainabilityModal(
      { description: 'copo descartável plástico' },
      {
        isSustainable: false,
        reason: 'Produto teste não sustentável',
        alternatives: [{
          name: 'Copo teste biodegradável',
          description: 'Alternativa de teste',
          benefits: 'Teste sustentável',
          searchTerms: ['copo teste']
        }]
      }
    ),
    forceMonitor: monitorExistingElements
  };

  console.log("🌱 SICOSI: Script carregado e pronto para uso!");

})();