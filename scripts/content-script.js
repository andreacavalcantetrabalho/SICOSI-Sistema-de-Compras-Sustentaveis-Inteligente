/**
 * Content Script - SICOSI
 * Script principal que monitora o ComprasNet e exibe sugestões sustentáveis
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

  // Inicializar quando a página carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * Inicialização principal da extensão
   */
  async function init() {
    try {
      console.log('SICOSI: Inicializando extensão...');
      
      // Verificar se estamos em uma página do ComprasNet
      if (!isComprasNetPage()) {
        console.log('SICOSI: Não é uma página do ComprasNet');
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
   * Verifica se estamos em uma página do ComprasNet
   */
  function isComprasNetPage() {
    const currentUrl = window.location.href;
    const hostname = window.location.hostname;
    
    return hostname.includes(window.SICOSIConstants.COMPRASNET_URLS.MAIN_DOMAIN) ||
           currentUrl.includes('compras.gov.br');
  }

  /**
   * Carrega configurações do usuário do storage
   */
  async function loadUserSettings() {
    try {
      const result = await chrome.storage.sync.get(['SICOSISettings']);
      userSettings = result.SICOSISettings || window.SICOSIConstants.DEFAULT_SETTINGS;
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
          // Verificar se foram adicionados elementos relevantes
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.querySelector && (
                node.querySelector('button:contains("Selecionar")') ||
                node.querySelector('.p-autocomplete-input') ||
                node.querySelector('[class*="pdm"]')
              )) {
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
    if (!userSettings.enabled) {
      return;
    }

    // Monitorar botões de "Selecionar" na lista de resultados
    monitorSelectButtons();
    
    // Monitorar tela de configuração de item
    monitorItemConfigPage();
  }

  /**
   * Monitora botões "Selecionar" na lista de resultados
   */
  function monitorSelectButtons() {
    const selectButtons = findElements(window.SICOSIConstants.DOM_SELECTORS.SELECT_BUTTONS);
    
    selectButtons.forEach(button => {
      if (!button.hasSICOSIListener) {
        button.hasSICOSIListener = true;
        button.addEventListener('click', handleSelectButtonClick);
      }
    });
  }

  /**
   * Monitora tela de configuração de item
   */
  function monitorItemConfigPage() {
    const configElements = findElements(window.SICOSIConstants.DOM_SELECTORS.ITEM_CONFIG_PAGE);
    
    if (configElements.length > 0) {
      // Aguardar a página carregar completamente
      setTimeout(() => {
        analyzeCurrentItem();
      }, 1000);
    }
  }

  /**
   * Manipula clique no botão "Selecionar"
   */
  function handleSelectButtonClick(event) {
    const button = event.target;
    const itemRow = button.closest('tr') || button.closest('.item-row');
    
    if (itemRow) {
      const itemDescription = extractItemDescription(itemRow);
      
      if (itemDescription && isNonSustainableItem(itemDescription)) {
        // Prevenir navegação temporariamente
        event.preventDefault();
        event.stopPropagation();
        
        // Mostrar modal de sugestão
        showSustainabilityModal(itemDescription, () => {
          // Callback para continuar com seleção original
          button.click();
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

    const pageContent = document.body.textContent;
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
    // Procurar na coluna "Padrão Descritivo de Material"
    const descriptionCell = itemRow.querySelector('[class*="descri"]') || 
                           itemRow.querySelector('td:nth-child(3)') ||
                           itemRow.cells && itemRow.cells[2];
    
    return descriptionCell ? descriptionCell.textContent.trim().toLowerCase() : null;
  }

  /**
   * Extrai descrição do item da página de configuração
   */
  function extractItemFromConfigPage() {
    // Procurar pelo título PDM ou descrição na página
    const pdmElement = document.querySelector('[class*="pdm"]:contains("PDM")') ||
                      document.querySelector('h1, h2, h3') ||
                      document.querySelector('.title, .heading');
    
    if (pdmElement) {
      const text = pdmElement.textContent.toLowerCase();
      // Extrair texto após "PDM:" ou similar
      const match = text.match(/pdm[:\s]*\d+[:\s-]*(.+)/i);
      return match ? match[1].trim() : text.trim();
    }

    return null;
  }

  /**
   * Verifica se um item não é sustentável
   */
  function isNonSustainableItem(description) {
    const lowerDesc = description.toLowerCase();
    const keywords = window.SICOSIConstants.NON_SUSTAINABLE_KEYWORDS;
    
    // Verificar todas as categorias de palavras-chave
    for (const category in keywords) {
      const categoryKeywords = keywords[category];
      for (const keyword of categoryKeywords) {
        if (lowerDesc.includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Encontra alternativas sustentáveis para um item
   */
  function findSustainableAlternatives(description) {
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
    setTimeout(() => {
      if (currentModal) {
        closeModal();
      }
    }, window.SICOSIConstants.TIMING_CONFIG.AUTO_CLOSE_DELAY);
  }

  /**
   * Cria elemento do modal
   */
  function createModal(alternatives, itemDescription, continueCallback) {
    const modal = document.createElement('div');
    modal.id = window.SICOSIConstants.MODAL_CONFIG.ID;
    modal.className = 'SICOSI-modal-overlay';

    modal.innerHTML = `
      <div class="SICOSI-modal-content">
        <div class="SICOSI-modal-header">
          <div class="SICOSI-modal-icon">🌱</div>
          <div class="SICOSI-modal-title">
            <h3>${window.SICOSIConstants.UI_MESSAGES.MODAL_TITLE}</h3>
            <p class="SICOSI-modal-subtitle">${window.SICOSIConstants.UI_MESSAGES.MODAL_SUBTITLE}</p>
          </div>
          <button class="SICOSI-close-btn" onclick="window.closeSICOSIModal()">&times;</button>
        </div>
        
        <div class="SICOSI-modal-body">
          <div class="SICOSI-current-item">
            <strong>Item selecionado:</strong> ${itemDescription}
          </div>
          
          ${alternatives.map(alternative => `
            <div class="SICOSI-suggestion-item">
              <div class="SICOSI-suggestion-header">
                <span class="SICOSI-category-badge">${alternative.data.category}</span>
                <span class="SICOSI-impact-badge impact-${alternative.data.impact.toLowerCase()}">${alternative.data.impact} Impacto</span>
              </div>
              
              <div class="SICOSI-alternatives-list">
                <p><strong>Alternativas sustentáveis:</strong></p>
                <div class="SICOSI-alternatives-grid">
                  ${alternative.data.alternatives.map(alt => `
                    <button class="SICOSI-alternative-btn" data-alternative="${alt}" data-search="${alternative.data.search_terms.join(' ')}">
                      ${alt}
                    </button>
                  `).join('')}
                </div>
              </div>
              
              <div class="SICOSI-reason">
                <p class="SICOSI-benefit"><strong>Benefício:</strong> ${alternative.data.reason}</p>
              </div>
            </div>
          `).join('')}
          
          <div class="SICOSI-modal-actions">
            <button class="SICOSI-btn SICOSI-btn-primary" onclick="window.searchForAlternatives()">
              🔍 Buscar Alternativas
            </button>
            <button class="SICOSI-btn SICOSI-btn-secondary" onclick="window.continueWithOriginal()">
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
   */
  function setupModalEventListeners(modal, continueCallback) {
    // Botões de alternativas
    modal.querySelectorAll('.SICOSI-alternative-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const alternative = this.dataset.alternative;
        const searchTerms = this.dataset.search;
        
        searchForAlternative(alternative, searchTerms);
        logAnalytics('alternative_selected', alternative);
      });
    });

    // Fechar ao clicar no backdrop
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal();
        logAnalytics('modal_dismissed', 'backdrop_click');
      }
    });

    // Funções globais para os botões
    window.closeSICOSIModal = closeModal;
    window.continueWithOriginal = () => {
      closeModal();
      if (continueCallback) {
        continueCallback();
      }
      logAnalytics('modal_dismissed', 'continue_original');
    };
    window.searchForAlternatives = () => {
      // TODO: Implementar busca no catálogo/web
      closeModal();
      logAnalytics('search_performed', 'manual_search');
    };
  }

  /**
   * Busca por uma alternativa específica
   */
  function searchForAlternative(alternative, searchTerms) {
    closeModal();
    
    // Encontrar campo de busca e preencher
    const searchInput = findElements(window.SICOSIConstants.DOM_SELECTORS.SEARCH_INPUT)[0];
    
    if (searchInput) {
      searchInput.value = alternative;
      searchInput.focus();
      
      // Disparar eventos para notificar o Angular
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
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
   * Encontra elementos usando múltiplos seletores
   */
  function findElements(selectors) {
    const elements = [];
    
    selectors.forEach(selector => {
      try {
        if (selector.includes(':contains(')) {
          // Seletor customizado com :contains
          const text = selector.match(/contains\("([^"]+)"\)/)[1];
          const baseSelector = selector.split(':contains(')[0];
          const candidates = document.querySelectorAll(baseSelector || '*');
          
          candidates.forEach(el => {
            if (el.textContent.includes(text)) {
              elements.push(el);
            }
          });
        } else {
          // Seletor CSS padrão
          const found = document.querySelectorAll(selector);
          elements.push(...found);
        }
      } catch (error) {
        // Ignorar seletores inválidos
      }
    });

    return [...new Set(elements)]; // Remover duplicatas
  }

  /**
   * Log de analytics/eventos
   */
  function logAnalytics(event, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      url: window.location.href
    };

    try {
      // Armazenar no storage local
      chrome.storage.local.get([window.SICOSIConstants.ANALYTICS_CONFIG.STORAGE_KEY], (result) => {
        const logs = result[window.SICOSIConstants.ANALYTICS_CONFIG.STORAGE_KEY] || [];
        logs.push(logEntry);

        // Manter apenas os últimos logs
        const maxLogs = window.SICOSIConstants.ANALYTICS_CONFIG.MAX_LOGS;
        if (logs.length > maxLogs) {
          logs.splice(0, logs.length - maxLogs);
        }

        chrome.storage.local.set({
          [window.SICOSIConstants.ANALYTICS_CONFIG.STORAGE_KEY]: logs
        });
      });

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

})();