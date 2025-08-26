/**
 * Content Script - Nudge Sustentável
 * Script principal que monitora o ComprasNet e exibe sugestões sustentáveis
 */

(function() {
  'use strict';

  // Verificar se já foi inicializado para evitar múltiplas execuções
  if (window.nudgeSustentavelInitialized) {
    return;
  }
  window.nudgeSustentavelInitialized = true;

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
      console.log('Nudge Sustentável: Inicializando extensão...');
      
      // Verificar se estamos em uma página do ComprasNet
      if (!isComprasNetPage()) {
        console.log('Nudge Sustentável: Não é uma página do ComprasNet');
        return;
      }

      // Carregar configurações do usuário
      await loadUserSettings();
      
      // Configurar observador de mudanças na página
      setupPageObserver();
      
      // Monitorar elementos existentes
      monitorExistingElements();
      
      console.log('Nudge Sustentável: Extensão inicializada com sucesso');
    } catch (error) {
      console.error('Nudge Sustentável: Erro na inicialização:', error);
      logAnalytics('error_occurred', 'initialization_failed');
    }
  }

  /**
   * Verifica se estamos em uma página do ComprasNet
   */
  function isComprasNetPage() {
    const currentUrl = window.location.href;
    const hostname = window.location.hostname;
    
    return hostname.includes(window.NudgeConstants.COMPRASNET_URLS.MAIN_DOMAIN) ||
           currentUrl.includes('compras.gov.br');
  }

  /**
   * Carrega configurações do usuário do storage
   */
  async function loadUserSettings() {
    try {
      const result = await chrome.storage.sync.get(['nudgeSettings']);
      userSettings = result.nudgeSettings || window.NudgeConstants.DEFAULT_SETTINGS;
    } catch (error) {
      console.warn('Nudge Sustentável: Usando configurações padrão:', error);
      userSettings = window.NudgeConstants.DEFAULT_SETTINGS;
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
    const selectButtons = findElements(window.NudgeConstants.DOM_SELECTORS.SELECT_BUTTONS);
    
    selectButtons.forEach(button => {
      if (!button.hasNudgeListener) {
        button.hasNudgeListener = true;
        button.addEventListener('click', handleSelectButtonClick);
      }
    });
  }

  /**
   * Monitora tela de configuração de item
   */
  function monitorItemConfigPage() {
    const configElements = findElements(window.NudgeConstants.DOM_SELECTORS.ITEM_CONFIG_PAGE);
    
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
    const keywords = window.NudgeConstants.NON_SUSTAINABLE_KEYWORDS;
    
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
    const alternatives = window.NudgeConstants.SUSTAINABLE_ALTERNATIVES;
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
      console.log('Nudge Sustentável: Nenhuma alternativa encontrada para:', itemDescription);
      return;
    }

    isModalVisible = true;
    currentModal = createModal(alternatives, itemDescription, continueCallback);
    document.body.appendChild(currentModal);

    // Animar entrada do modal
    setTimeout(() => {
      currentModal.classList.add('nudge-modal-visible');
    }, 50);

    // Auto-fechar após tempo configurado
    setTimeout(() => {
      if (currentModal) {
        closeModal();
      }
    }, window.NudgeConstants.TIMING_CONFIG.AUTO_CLOSE_DELAY);
  }

  /**
   * Cria elemento do modal
   */
  function createModal(alternatives, itemDescription, continueCallback) {
    const modal = document.createElement('div');
    modal.id = window.NudgeConstants.MODAL_CONFIG.ID;
    modal.className = 'nudge-modal-overlay';

    modal.innerHTML = `
      <div class="nudge-modal-content">
        <div class="nudge-modal-header">
          <div class="nudge-modal-icon">🌱</div>
          <div class="nudge-modal-title">
            <h3>${window.NudgeConstants.UI_MESSAGES.MODAL_TITLE}</h3>
            <p class="nudge-modal-subtitle">${window.NudgeConstants.UI_MESSAGES.MODAL_SUBTITLE}</p>
          </div>
          <button class="nudge-close-btn" onclick="window.closeNudgeModal()">&times;</button>
        </div>
        
        <div class="nudge-modal-body">
          <div class="nudge-current-item">
            <strong>Item selecionado:</strong> ${itemDescription}
          </div>
          
          ${alternatives.map(alternative => `
            <div class="nudge-suggestion-item">
              <div class="nudge-suggestion-header">
                <span class="nudge-category-badge">${alternative.data.category}</span>
                <span class="nudge-impact-badge impact-${alternative.data.impact.toLowerCase()}">${alternative.data.impact} Impacto</span>
              </div>
              
              <div class="nudge-alternatives-list">
                <p><strong>Alternativas sustentáveis:</strong></p>
                <div class="nudge-alternatives-grid">
                  ${alternative.data.alternatives.map(alt => `
                    <button class="nudge-alternative-btn" data-alternative="${alt}" data-search="${alternative.data.search_terms.join(' ')}">
                      ${alt}
                    </button>
                  `).join('')}
                </div>
              </div>
              
              <div class="nudge-reason">
                <p class="nudge-benefit"><strong>Benefício:</strong> ${alternative.data.reason}</p>
              </div>
            </div>
          `).join('')}
          
          <div class="nudge-modal-actions">
            <button class="nudge-btn nudge-btn-primary" onclick="window.searchForAlternatives()">
              🔍 Buscar Alternativas
            </button>
            <button class="nudge-btn nudge-btn-secondary" onclick="window.continueWithOriginal()">
              Continuar com item original
            </button>
          </div>
          
          <div class="nudge-modal-footer">
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
    modal.querySelectorAll('.nudge-alternative-btn').forEach(btn => {
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
    window.closeNudgeModal = closeModal;
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
    const searchInput = findElements(window.NudgeConstants.DOM_SELECTORS.SEARCH_INPUT)[0];
    
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
      currentModal.classList.add('nudge-modal-closing');
      
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
      chrome.storage.local.get([window.NudgeConstants.ANALYTICS_CONFIG.STORAGE_KEY], (result) => {
        const logs = result[window.NudgeConstants.ANALYTICS_CONFIG.STORAGE_KEY] || [];
        logs.push(logEntry);

        // Manter apenas os últimos logs
        const maxLogs = window.NudgeConstants.ANALYTICS_CONFIG.MAX_LOGS;
        if (logs.length > maxLogs) {
          logs.splice(0, logs.length - maxLogs);
        }

        chrome.storage.local.set({
          [window.NudgeConstants.ANALYTICS_CONFIG.STORAGE_KEY]: logs
        });
      });

      console.log('Nudge Sustentável Analytics:', logEntry);
    } catch (error) {
      console.warn('Nudge Sustentável: Erro no analytics:', error);
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