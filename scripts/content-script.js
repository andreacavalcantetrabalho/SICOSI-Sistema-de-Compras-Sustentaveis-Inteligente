/**
 * Content Script - SICOSI
 * Script principal que monitora o ComprasNet e exibe sugestões sustentáveis
 * VERSÃO CORRIGIDA - Sem dependência de jQuery e com verificações de segurança
 */

(function() {
  'use strict';

  // Verificar se já foi inicializado para evitar múltiplas execuções
  if (window.SICOSISustentavelInitialized) {
    return;
  }
  window.SICOSISustentavelInitialized = true;

  // Variáveis globais do script
  let currentModal = null;
  let isModalVisible = false;
  let debounceTimer = null;
  let observerInstance = null;
  let userSettings = null;
  let constantsLoaded = false;

  // Aguardar constants carregar (com timeout)
  function waitForConstants(callback, attempts = 0) {
    if (window.SICOSIConstants) {
      constantsLoaded = true;
      console.log('SICOSI: Constants carregado com sucesso');
      callback();
    } else if (attempts < 20) { // Tentar por 2 segundos
      console.log('SICOSI: Aguardando constants... tentativa', attempts + 1);
      setTimeout(() => waitForConstants(callback, attempts + 1), 100);
    } else {
      console.error('SICOSI: Constants não carregou. Usando valores padrão.');
      // Criar constants mínimo de emergência
      window.SICOSIConstants = {
        COMPRASNET_URLS: {
          MAIN_DOMAIN: 'compras.gov.br'
        },
        DOM_SELECTORS: {
          SEARCH_INPUT: ['input[type="text"]', 'input[type="search"]'],
          SELECT_BUTTONS: ['button'],
          ITEM_CONFIG_PAGE: ['.pdm', '.item-details']
        },
        NON_SUSTAINABLE_KEYWORDS: {
          DISPOSABLE_PLASTIC: ['copo descartável', 'copo plástico', 'prato descartável'],
          NON_CERTIFIED_PAPER: ['papel sulfite', 'papel a4'],
          CONVENTIONAL_CLEANING: ['detergente', 'desinfetante']
        },
        SUSTAINABLE_ALTERNATIVES: {
          'copo descartável': {
            alternatives: ['copo biodegradável', 'copo de papel'],
            search_terms: ['biodegradável', 'compostável'],
            reason: 'Reduz poluição plástica',
            impact: 'Alto',
            category: 'Descartáveis'
          },
          'papel sulfite': {
            alternatives: ['papel reciclado', 'papel FSC'],
            search_terms: ['reciclado', 'FSC'],
            reason: 'Certificação florestal responsável',
            impact: 'Médio',
            category: 'Papel'
          },
          'detergente': {
            alternatives: ['detergente biodegradável'],
            search_terms: ['biodegradável', 'ecológico'],
            reason: 'Menos tóxico para ambiente aquático',
            impact: 'Alto',
            category: 'Limpeza'
          }
        },
        DEFAULT_SETTINGS: {
          enabled: true
        },
        MODAL_CONFIG: {
          ID: 'SICOSI-modal',
          CLASS_PREFIX: 'SICOSI-'
        },
        TIMING_CONFIG: {
          AUTO_CLOSE_DELAY: 15000
        },
        UI_MESSAGES: {
          MODAL_TITLE: '🌱 Alternativa Sustentável Disponível',
          MODAL_SUBTITLE: 'Encontramos opções mais ecológicas para este item'
        },
        ANALYTICS_CONFIG: {
          STORAGE_KEY: 'SICOSI-logs',
          MAX_LOGS: 100,
          EVENTS: {
            MODAL_SHOWN: 'modal_shown',
            ALTERNATIVE_SELECTED: 'alternative_selected',
            MODAL_DISMISSED: 'modal_dismissed',
            SEARCH_PERFORMED: 'search_performed',
            ERROR_OCCURRED: 'error_occurred'
          }
        }
      };
      callback();
    }
  }

  // Inicializar quando a página carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      waitForConstants(init);
    });
  } else {
    waitForConstants(init);
  }

  /**
   * Inicialização principal da extensão
   */
  async function init() {
    try {
      console.log('SICOSI: Inicializando extensão...');
      
      // Verificar se estamos em uma página compatível
      if (!isCompatiblePage()) {
        console.log('SICOSI: Página não compatível');
        return;
      }

      // Carregar configurações do usuário
      await loadUserSettings();
      
      // Configurar observador de mudanças na página
      setupPageObserver();
      
      // Monitorar elementos existentes
      monitorExistingElements();
      
      console.log('SICOSI: Extensão inicializada com sucesso');
    } catch (error) {
      console.error('SICOSI: Erro na inicialização:', error);
      logAnalytics('error_occurred', 'initialization_failed');
    }
  }

  /**
   * Verifica se estamos em uma página compatível
   */
  function isCompatiblePage() {
    const currentUrl = window.location.href;
    const hostname = window.location.hostname;
    
    // Aceitar ComprasNet, localhost e file:// para testes
    return hostname.includes('compras.gov.br') ||
           hostname === 'localhost' ||
           currentUrl.startsWith('file://') ||
           hostname === '127.0.0.1';
  }

  /**
   * Carrega configurações do usuário do storage
   */
  async function loadUserSettings() {
    try {
      if (chrome?.storage?.sync) {
        const result = await chrome.storage.sync.get(['SICOSISettings']);
        userSettings = result.SICOSISettings || window.SICOSIConstants.DEFAULT_SETTINGS;
      } else {
        console.warn('SICOSI: Chrome storage não disponível, usando padrões');
        userSettings = window.SICOSIConstants.DEFAULT_SETTINGS;
      }
    } catch (error) {
      console.warn('SICOSI: Usando configurações padrão:', error);
      userSettings = window.SICOSIConstants.DEFAULT_SETTINGS;
    }
  }

  /**
   * Configura observador para detectar mudanças dinâmicas na página
   */
  function setupPageObserver() {
    observerInstance = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Verificar se é um botão ou contém botões
              if (node.tagName === 'BUTTON' || 
                  (node.querySelector && node.querySelector('button'))) {
                shouldCheck = true;
              }
            }
          });
        }
      });

      if (shouldCheck) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(monitorExistingElements, 500);
      }
    });

    observerInstance.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Monitora elementos existentes na página
   */
  function monitorExistingElements() {
    if (!userSettings || !userSettings.enabled) {
      return;
    }

    // Monitorar botões de "Selecionar" na lista de resultados
    monitorSelectButtons();
    
    // Monitorar tela de configuração de item
    monitorItemConfigPage();
  }

  /**
   * Monitora botões "Selecionar" na lista de resultados
   * CORRIGIDO: Não usa mais :contains()
   */
  function monitorSelectButtons() {
    // Buscar todos os botões da página
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(button => {
      const buttonText = button.textContent || button.innerText || '';
      
      // Verificar se o texto contém "Selecionar" e não tem listener ainda
      if (buttonText.toLowerCase().includes('selecionar') && !button.hasSICOSIListener) {
        button.hasSICOSIListener = true;
        button.addEventListener('click', handleSelectButtonClick);
        console.log('SICOSI: Listener adicionado ao botão:', buttonText.trim());
      }
    });
  }

  /**
   * Monitora tela de configuração de item
   */
  function monitorItemConfigPage() {
    // Buscar elementos que indiquem página de configuração
    const configIndicators = [
      document.querySelector('.pdm'),
      document.querySelector('[class*="pdm"]'),
      document.querySelector('div[id*="config"]'),
      document.querySelector('div[class*="detail"]')
    ].filter(Boolean);
    
    if (configIndicators.length > 0) {
      setTimeout(() => {
        analyzeCurrentItem();
      }, 1000);
    }
  }

  /**
   * Manipula clique no botão "Selecionar"
   */
  function handleSelectButtonClick(event) {
    const button = event.currentTarget;
    const itemRow = button.closest('tr') || button.closest('.item-row') || button.parentElement?.parentElement;
    
    if (itemRow) {
      const itemDescription = extractItemDescription(itemRow);
      
      if (itemDescription && isNonSustainableItem(itemDescription)) {
        // Prevenir ação padrão temporariamente
        event.preventDefault();
        event.stopPropagation();
        
        // Mostrar modal de sugestão
        showSustainabilityModal(itemDescription, () => {
          // Simular clique novamente após fechar modal
          setTimeout(() => {
            button.click();
          }, 100);
        });
        
        logAnalytics('modal_shown', itemDescription);
      }
    }
  }

  /**
   * Analisa item atual na tela de configuração
   */
  function analyzeCurrentItem() {
    if (isModalVisible) {
      return;
    }

    const itemDescription = extractItemFromConfigPage();
    
    if (itemDescription && isNonSustainableItem(itemDescription)) {
      showSustainabilityModal(itemDescription);
      logAnalytics('modal_shown', itemDescription);
    }
  }

  /**
   * Extrai descrição do item da linha da tabela
   */
  function extractItemDescription(itemRow) {
    // Procurar texto em todas as células
    const cells = itemRow.querySelectorAll('td');
    
    for (let cell of cells) {
      const text = cell.textContent || cell.innerText || '';
      // Verificar se parece uma descrição de produto
      if (text.length > 10 && !text.match(/^\d+$/)) {
        return text.trim().toLowerCase();
      }
    }
    
    return null;
  }

  /**
   * Extrai descrição do item da página de configuração
   */
  function extractItemFromConfigPage() {
    // Buscar em vários lugares possíveis
    const possibleElements = [
      document.querySelector('h1'),
      document.querySelector('h2'),
      document.querySelector('h3'),
      document.querySelector('.title'),
      document.querySelector('.product-name'),
      document.querySelector('[class*="descri"]')
    ].filter(Boolean);
    
    for (let element of possibleElements) {
      const text = element.textContent || element.innerText || '';
      if (text.length > 5) {
        return text.trim().toLowerCase();
      }
    }
    
    return null;
  }

  /**
   * Verifica se um item não é sustentável
   */
  function isNonSustainableItem(description) {
    if (!description || !window.SICOSIConstants?.NON_SUSTAINABLE_KEYWORDS) {
      return false;
    }
    
    const lowerDesc = description.toLowerCase();
    const keywords = window.SICOSIConstants.NON_SUSTAINABLE_KEYWORDS;
    
    // Verificar todas as categorias de palavras-chave
    for (const category in keywords) {
      const categoryKeywords = keywords[category];
      if (Array.isArray(categoryKeywords)) {
        for (const keyword of categoryKeywords) {
          if (lowerDesc.includes(keyword.toLowerCase())) {
            console.log('SICOSI: Item não-sustentável detectado:', keyword);
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Encontra alternativas sustentáveis para um item
   */
  function findSustainableAlternatives(description) {
    if (!window.SICOSIConstants?.SUSTAINABLE_ALTERNATIVES) {
      return [];
    }
    
    const lowerDesc = description.toLowerCase();
    const alternatives = window.SICOSIConstants.SUSTAINABLE_ALTERNATIVES;
    const matches = [];
    
    for (const keyword in alternatives) {
      if (lowerDesc.includes(keyword)) {
        matches.push({
          keyword,
          data: alternatives[keyword]
        });
      }
    }
    
    return matches;
  }

  /**
   * Exibe modal com sugestões de sustentabilidade
   */
  async function showSustainabilityModal(itemDescription, continueCallback = null) {
    if (isModalVisible) {
      return;
    }

    const alternatives = findSustainableAlternatives(itemDescription);
    
    if (alternatives.length === 0) {
      console.log('SICOSI: Nenhuma alternativa encontrada para:', itemDescription);
      return;
    }

    isModalVisible = true;
    currentModal = createModal(alternatives, itemDescription, continueCallback);
    document.body.appendChild(currentModal);

    // Animar entrada do modal
    setTimeout(() => {
      currentModal.classList.add('SICOSI-modal-visible');
    }, 50);

    // Auto-fechar após tempo configurado
    const autoCloseDelay = window.SICOSIConstants?.TIMING_CONFIG?.AUTO_CLOSE_DELAY || 15000;
    setTimeout(() => {
      if (currentModal) {
        closeModal();
      }
    }, autoCloseDelay);
  }

  /**
   * Cria elemento do modal
   */
  function createModal(alternatives, itemDescription, continueCallback) {
    const modal = document.createElement('div');
    modal.id = window.SICOSIConstants?.MODAL_CONFIG?.ID || 'SICOSI-modal';
    modal.className = 'SICOSI-modal-overlay';

    // Criar HTML do modal com verificações de segurança
    const modalTitle = window.SICOSIConstants?.UI_MESSAGES?.MODAL_TITLE || '🌱 Alternativa Sustentável';
    const modalSubtitle = window.SICOSIConstants?.UI_MESSAGES?.MODAL_SUBTITLE || 'Opções mais ecológicas';

    modal.innerHTML = `
      <div class="SICOSI-modal-content">
        <div class="SICOSI-modal-header">
          <div class="SICOSI-modal-icon">🌱</div>
          <div class="SICOSI-modal-title">
            <h3>${modalTitle}</h3>
            <p class="SICOSI-modal-subtitle">${modalSubtitle}</p>
          </div>
          <button class="SICOSI-close-btn">&times;</button>
        </div>
        
        <div class="SICOSI-modal-body">
          <div class="SICOSI-current-item">
            <strong>Item selecionado:</strong> ${itemDescription}
          </div>
          
          ${alternatives.map(alternative => {
            const alt = alternative.data || {};
            return `
              <div class="SICOSI-suggestion-item">
                <div class="SICOSI-suggestion-header">
                  <span class="SICOSI-category-badge">${alt.category || 'Geral'}</span>
                  <span class="SICOSI-impact-badge impact-${(alt.impact || 'medio').toLowerCase()}">
                    ${alt.impact || 'Médio'} Impacto
                  </span>
                </div>
                
                <div class="SICOSI-alternatives-list">
                  <p><strong>Alternativas sustentáveis:</strong></p>
                  <div class="SICOSI-alternatives-grid">
                    ${(alt.alternatives || []).map(altOption => `
                      <button class="SICOSI-alternative-btn" data-alternative="${altOption}">
                        ${altOption}
                      </button>
                    `).join('')}
                  </div>
                </div>
                
                <div class="SICOSI-reason">
                  <p class="SICOSI-benefit">
                    <strong>Benefício:</strong> ${alt.reason || 'Opção mais sustentável'}
                  </p>
                </div>
              </div>
            `;
          }).join('')}
          
          <div class="SICOSI-modal-actions">
            <button class="SICOSI-btn SICOSI-btn-primary" id="searchAlternatives">
              🔍 Buscar Alternativas
            </button>
            <button class="SICOSI-btn SICOSI-btn-secondary" id="continueOriginal">
              Continuar com item original
            </button>
          </div>
          
          <div class="SICOSI-modal-footer">
            <small>💡 Esta sugestão visa promover compras públicas mais sustentáveis</small>
          </div>
        </div>
      </div>
    `;

    // Adicionar event listeners
    setupModalEventListeners(modal, continueCallback);

    return modal;
  }

  /**
   * Configura event listeners do modal
   * CORRIGIDO: Não usa mais onclick inline
   */
  function setupModalEventListeners(modal, continueCallback) {
    // Botão de fechar
    const closeBtn = modal.querySelector('.SICOSI-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeModal();
        logAnalytics('modal_dismissed', 'close_button');
      });
    }

    // Botões de alternativas
    modal.querySelectorAll('.SICOSI-alternative-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const alternative = this.dataset.alternative;
        searchForAlternative(alternative);
        logAnalytics('alternative_selected', alternative);
      });
    });

    // Botão de buscar alternativas
    const searchBtn = modal.querySelector('#searchAlternatives');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        closeModal();
        logAnalytics('search_performed', 'manual_search');
      });
    }

    // Botão de continuar com original
    const continueBtn = modal.querySelector('#continueOriginal');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        closeModal();
        if (continueCallback) {
          continueCallback();
        }
        logAnalytics('modal_dismissed', 'continue_original');
      });
    }

    // Fechar ao clicar no backdrop
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal();
        logAnalytics('modal_dismissed', 'backdrop_click');
      }
    });
  }

  /**
   * Busca por uma alternativa específica
   */
  function searchForAlternative(alternative) {
    closeModal();
    
    // Encontrar campo de busca
    const searchInputs = document.querySelectorAll('input[type="text"], input[type="search"]');
    const searchInput = searchInputs[0];
    
    if (searchInput) {
      searchInput.value = alternative;
      searchInput.focus();
      
      // Disparar eventos para notificar frameworks JS
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Simular Enter
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        keyCode: 13,
        bubbles: true
      });
      searchInput.dispatchEvent(enterEvent);
    }
  }

  /**
   * Fecha o modal atual
   */
  function closeModal() {
    if (currentModal) {
      currentModal.classList.add('SICOSI-modal-closing');
      
      setTimeout(() => {
        if (currentModal && currentModal.parentNode) {
          currentModal.parentNode.removeChild(currentModal);
        }
        currentModal = null;
        isModalVisible = false;
      }, 300);
    }
  }

  /**
   * Log de analytics/eventos
   * CORRIGIDO: Com verificações de segurança
   */
  function logAnalytics(event, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      url: window.location.href
    };

    try {
      if (chrome?.storage?.local) {
        const storageKey = window.SICOSIConstants?.ANALYTICS_CONFIG?.STORAGE_KEY || 'SICOSI-logs';
        const maxLogs = window.SICOSIConstants?.ANALYTICS_CONFIG?.MAX_LOGS || 100;
        
        chrome.storage.local.get([storageKey], (result) => {
          const logs = result[storageKey] || [];
          logs.push(logEntry);

          // Manter apenas os últimos logs
          if (logs.length > maxLogs) {
            logs.splice(0, logs.length - maxLogs);
          }

          chrome.storage.local.set({ [storageKey]: logs });
        });
      }
      
      console.log('SICOSI Analytics:', logEntry);
    } catch (error) {
      console.warn('SICOSI: Erro no analytics:', error);
    }
  }

  // Cleanup quando a página for descarregada
  window.addEventListener('beforeunload', () => {
    if (observerInstance) {
      observerInstance.disconnect();
    }
    if (currentModal) {
      closeModal();
    }
  });

  // Exportar para debug
  window.SICOSI_DEBUG = {
    isModalVisible: () => isModalVisible,
    showTestModal: () => showSustainabilityModal('teste de copo descartável'),
    constants: window.SICOSIConstants,
    settings: userSettings
  };

})();