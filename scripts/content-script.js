/**
 * CORREÇÃO 2: scripts/content-script.js - Carregamento Robusto
 * Versão corrigida com melhor gestão de dependências e inicialização
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
  let isInitialized = false;

  // CORREÇÃO: Sistema de inicialização robusto com múltiplas estratégias
  class SICOSIInitializer {
    constructor() {
      this.dependencies = {
        constants: false,
        storage: false,
        domHelpers: false,
        catalogAnalyzer: false
      };
      this.initAttempts = 0;
      this.maxAttempts = 50; // 5 segundos de tentativas
    }

    async initialize() {
      console.log('🌱 SICOSI: Iniciando carregamento...');
      
      try {
        // Estratégia 1: Aguardar evento de constants ready
        await this.waitForConstantsEvent();
        
        // Estratégia 2: Polling para verificar dependências
        await this.waitForDependencies();
        
        // Estratégia 3: Inicializar componentes na ordem correta
        await this.initializeComponents();
        
        // Inicializar funcionalidade principal
        await this.startMainFunctionality();
        
        isInitialized = true;
        console.log('🌱 SICOSI: Inicialização completa com sucesso!');
        
      } catch (error) {
        console.error('🌱 SICOSI: Erro na inicialização:', error);
        this.createFallbackConstants();
        await this.startMainFunctionality();
      }
    }

    async waitForConstantsEvent() {
      return new Promise((resolve, reject) => {
        // Se já está disponível, resolver imediatamente
        if (window.SICOSIConstants) {
          this.dependencies.constants = true;
          resolve();
          return;
        }

        // Aguardar evento customizado
        const timeout = setTimeout(() => {
          window.removeEventListener('SICOSIConstantsReady', handler);
          reject(new Error('Timeout waiting for constants event'));
        }, 3000);

        const handler = (event) => {
          clearTimeout(timeout);
          window.removeEventListener('SICOSIConstantsReady', handler);
          this.dependencies.constants = true;
          console.log('🌱 SICOSI: Constants carregado via evento');
          resolve();
        };

        window.addEventListener('SICOSIConstantsReady', handler);
      });
    }

    async waitForDependencies() {
      return new Promise((resolve, reject) => {
        const checkDependencies = () => {
          this.initAttempts++;

          // Verificar constants
          if (window.SICOSIConstants && !this.dependencies.constants) {
            this.dependencies.constants = true;
            console.log('🌱 SICOSI: Constants encontrado');
          }

          // Verificar storage
          if (window.SICOSIStorage && !this.dependencies.storage) {
            this.dependencies.storage = true;
            console.log('🌱 SICOSI: Storage encontrado');
          }

          // Verificar DOM helpers
          if (window.SICOSIDOMHelpers && !this.dependencies.domHelpers) {
            this.dependencies.domHelpers = true;
            console.log('🌱 SICOSI: DOM Helpers encontrado');
          }

          // Verificar catalog analyzer
          if (window.SICOSICatalogAnalyzer && !this.dependencies.catalogAnalyzer) {
            this.dependencies.catalogAnalyzer = true;
            console.log('🌱 SICOSI: Catalog Analyzer encontrado');
          }

          // Verificar se todas as dependências estão prontas
          const allReady = Object.values(this.dependencies).every(ready => ready);
          
          if (allReady) {
            console.log('🌱 SICOSI: Todas as dependências carregadas');
            resolve();
            return;
          }

          // Verificar timeout
          if (this.initAttempts >= this.maxAttempts) {
            console.warn('🌱 SICOSI: Timeout nas dependências, usando fallbacks');
            resolve(); // Continuar mesmo sem todas as dependências
            return;
          }

          // Tentar novamente
          setTimeout(checkDependencies, 100);
        };

        checkDependencies();
      });
    }

    async initializeComponents() {
      // Inicializar storage se disponível
      if (this.dependencies.storage && window.SICOSIStorage) {
        try {
          await this.loadUserSettings();
        } catch (error) {
          console.warn('SICOSI: Erro ao carregar configurações:', error);
          userSettings = this.getDefaultSettings();
        }
      } else {
        userSettings = this.getDefaultSettings();
      }

      // Inicializar catalog analyzer se disponível
      if (this.dependencies.catalogAnalyzer && window.SICOSICatalogAnalyzer) {
        try {
          await window.SICOSICatalogAnalyzer.initialize();
        } catch (error) {
          console.warn('SICOSI: Erro ao inicializar catalog analyzer:', error);
        }
      }
    }

    async loadUserSettings() {
      if (window.SICOSIStorage) {
        userSettings = await window.SICOSIStorage.loadUserSettings();
      } else if (chrome?.storage?.sync) {
        // Fallback direto para Chrome Storage
        const result = await chrome.storage.sync.get(['SICOSISettings']);
        userSettings = result.SICOSISettings || this.getDefaultSettings();
      } else {
        userSettings = this.getDefaultSettings();
      }
    }

    getDefaultSettings() {
      return window.SICOSIConstants?.DEFAULT_SETTINGS || {
        enabled: true,
        categories: {
          descartaveis: true,
          papel: true,
          limpeza: true,
          equipamentos: true,
          embalagens: true
        }
      };
    }

    createFallbackConstants() {
      if (!window.SICOSIConstants) {
        console.warn('🌱 SICOSI: Criando constants de fallback');
        window.SICOSIConstants = {
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
            }
          },
          MODAL_CONFIG: {
            ID: 'SICOSI-modal',
            CLASS_PREFIX: 'SICOSI-',
            AUTO_CLOSE_DELAY: 15000
          },
          UI_MESSAGES: {
            MODAL_TITLE: '🌱 Alternativa Sustentável',
            MODAL_SUBTITLE: 'Opções mais ecológicas'
          },
          ANALYTICS_CONFIG: {
            STORAGE_KEY: 'SICOSI-logs',
            MAX_LOGS: 100,
            EVENTS: {
              MODAL_SHOWN: 'modal_shown',
              ALTERNATIVE_SELECTED: 'alternative_selected',
              MODAL_DISMISSED: 'modal_dismissed'
            }
          },
          DEFAULT_SETTINGS: {
            enabled: true,
            categories: {
              descartaveis: true,
              papel: true,
              limpeza: true
            }
          }
        };
      }
    }

    async startMainFunctionality() {
      if (!this.isCompatiblePage()) {
        console.log('🌱 SICOSI: Página não compatível');
        return;
      }

      if (!userSettings?.enabled) {
        console.log('🌱 SICOSI: Extensão desabilitada pelo usuário');
        return;
      }

      // Configurar observador de mudanças na página
      this.setupPageObserver();
      
      // Monitorar elementos existentes
      this.monitorExistingElements();
      
      console.log('🌱 SICOSI: Funcionalidade principal ativa');
    }

    isCompatiblePage() {
      const currentUrl = window.location.href;
      const hostname = window.location.hostname;
      
      return hostname.includes('compras.gov.br') ||
             hostname === 'localhost' ||
             currentUrl.startsWith('file://') ||
             hostname === '127.0.0.1';
    }

    setupPageObserver() {
      if (observerInstance) {
        observerInstance.disconnect();
      }

      observerInstance = new MutationObserver((mutations) => {
        let shouldCheck = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
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
          debounceTimer = setTimeout(() => this.monitorExistingElements(), 500);
        }
      });

      observerInstance.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    monitorExistingElements() {
      if (!userSettings?.enabled) return;

      // Monitorar botões de "Selecionar"
      this.monitorSelectButtons();
      
      // Monitorar tela de configuração de item
      this.monitorItemConfigPage();
    }

    monitorSelectButtons() {
      const buttons = document.querySelectorAll('button');
      
      buttons.forEach(button => {
        const buttonText = button.textContent || button.innerText || '';
        
        if (buttonText.toLowerCase().includes('selecionar') && !button.hasSICOSIListener) {
          button.hasSICOSIListener = true;
          button.addEventListener('click', this.handleSelectButtonClick.bind(this));
          console.log('🌱 SICOSI: Listener adicionado ao botão:', buttonText.trim());
        }
      });
    }

    monitorItemConfigPage() {
      const selectors = window.SICOSIConstants?.DOM_SELECTORS?.ITEM_CONFIG_PAGE || ['.pdm', '.item-details'];
      const configIndicators = selectors
        .map(selector => document.querySelector(selector))
        .filter(Boolean);
      
      if (configIndicators.length > 0) {
        setTimeout(() => {
          this.analyzeCurrentItem();
        }, 1000);
      }
    }

    handleSelectButtonClick(event) {
      const button = event.currentTarget;
      const itemRow = button.closest('tr') || button.closest('.item-row') || button.parentElement?.parentElement;
      
      if (itemRow) {
        const itemDescription = this.extractItemDescription(itemRow);
        
        if (itemDescription && this.isNonSustainableItem(itemDescription)) {
          event.preventDefault();
          event.stopPropagation();
          
          this.showSustainabilityModal(itemDescription, () => {
            setTimeout(() => {
              button.click();
            }, 100);
          });
          
          this.logAnalytics('modal_shown', itemDescription);
        }
      }
    }

    analyzeCurrentItem() {
      if (isModalVisible) return;

      const itemDescription = this.extractItemFromConfigPage();
      
      if (itemDescription && this.isNonSustainableItem(itemDescription)) {
        this.showSustainabilityModal(itemDescription);
        this.logAnalytics('modal_shown', itemDescription);
      }
    }

    extractItemDescription(itemRow) {
      const cells = itemRow.querySelectorAll('td');
      
      for (let cell of cells) {
        const text = cell.textContent || cell.innerText || '';
        if (text.length > 10 && !text.match(/^\d+$/)) {
          return text.trim().toLowerCase();
        }
      }
      
      return null;
    }

    extractItemFromConfigPage() {
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

    isNonSustainableItem(description) {
      if (!description || !window.SICOSIConstants?.NON_SUSTAINABLE_KEYWORDS) {
        return false;
      }
      
      const lowerDesc = description.toLowerCase();
      const keywords = window.SICOSIConstants.NON_SUSTAINABLE_KEYWORDS;
      
      for (const category in keywords) {
        const categoryKeywords = keywords[category];
        if (Array.isArray(categoryKeywords)) {
          for (const keyword of categoryKeywords) {
            if (lowerDesc.includes(keyword.toLowerCase())) {
              console.log('🌱 SICOSI: Item não-sustentável detectado:', keyword);
              return true;
            }
          }
        }
      }
      
      return false;
    }

    findSustainableAlternatives(description) {
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

    async showSustainabilityModal(itemDescription, continueCallback = null) {
      if (isModalVisible) return;

      const alternatives = this.findSustainableAlternatives(itemDescription);
      
      if (alternatives.length === 0) {
        console.log('🌱 SICOSI: Nenhuma alternativa encontrada para:', itemDescription);
        return;
      }

      isModalVisible = true;
      currentModal = this.createModal(alternatives, itemDescription, continueCallback);
      document.body.appendChild(currentModal);

      setTimeout(() => {
        currentModal.classList.add('SICOSI-modal-visible');
      }, 50);

      const autoCloseDelay = window.SICOSIConstants?.MODAL_CONFIG?.AUTO_CLOSE_DELAY || 15000;
      setTimeout(() => {
        if (currentModal) {
          this.closeModal();
        }
      }, autoCloseDelay);
    }

    createModal(alternatives, itemDescription, continueCallback) {
      const modal = document.createElement('div');
      modal.id = window.SICOSIConstants?.MODAL_CONFIG?.ID || 'SICOSI-modal';
      modal.className = 'SICOSI-modal-overlay';

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

      this.setupModalEventListeners(modal, continueCallback);
      return modal;
    }

    setupModalEventListeners(modal, continueCallback) {
      // Botão de fechar
      const closeBtn = modal.querySelector('.SICOSI-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.closeModal();
          this.logAnalytics('modal_dismissed', 'close_button');
        });
      }

      // Botões de alternativas
      modal.querySelectorAll('.SICOSI-alternative-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const alternative = btn.dataset.alternative;
          this.searchForAlternative(alternative);
          this.logAnalytics('alternative_selected', alternative);
        });
      });

      // Botão de buscar alternativas
      const searchBtn = modal.querySelector('#searchAlternatives');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => {
          this.closeModal();
          this.logAnalytics('search_performed', 'manual_search');
        });
      }

      // Botão de continuar com original
      const continueBtn = modal.querySelector('#continueOriginal');
      if (continueBtn) {
        continueBtn.addEventListener('click', () => {
          this.closeModal();
          if (continueCallback) {
            continueCallback();
          }
          this.logAnalytics('modal_dismissed', 'continue_original');
        });
      }

      // Fechar ao clicar no backdrop
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
          this.logAnalytics('modal_dismissed', 'backdrop_click');
        }
      });
    }

    searchForAlternative(alternative) {
      this.closeModal();
      
      const selectors = window.SICOSIConstants?.DOM_SELECTORS?.SEARCH_INPUT || ['input[type="text"]'];
      let searchInput = null;
      
      for (const selector of selectors) {
        searchInput = document.querySelector(selector);
        if (searchInput && searchInput.offsetParent !== null) {
          break;
        }
      }
      
      if (searchInput) {
        searchInput.value = alternative;
        searchInput.focus();
        
        // Disparar eventos
        ['input', 'change', 'keyup'].forEach(eventType => {
          searchInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        // Simular Enter
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          bubbles: true
        });
        searchInput.dispatchEvent(enterEvent);
        
        console.log('🌱 SICOSI: Busca executada para:', alternative);
      } else {
        console.warn('🌱 SICOSI: Campo de busca não encontrado');
      }
    }

    closeModal() {
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

    logAnalytics(event, details) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        details,
        url: window.location.href
      };

      try {
        if (window.SICOSIStorage) {
          // Usar storage manager se disponível
          window.SICOSIStorage.logAnalytics(event, details);
        } else if (chrome?.storage?.local) {
          // Fallback direto
          const storageKey = window.SICOSIConstants?.ANALYTICS_CONFIG?.STORAGE_KEY || 'SICOSI-logs';
          const maxLogs = window.SICOSIConstants?.ANALYTICS_CONFIG?.MAX_LOGS || 100;
          
          chrome.storage.local.get([storageKey], (result) => {
            const logs = result[storageKey] || [];
            logs.push(logEntry);

            if (logs.length > maxLogs) {
              logs.splice(0, logs.length - maxLogs);
            }

            chrome.storage.local.set({ [storageKey]: logs });
          });
        }
        
        console.log('🌱 SICOSI Analytics:', logEntry);
      } catch (error) {
        console.warn('🌱 SICOSI: Erro no analytics:', error);
      }
    }
  }

  // Inicializar quando a página carregar
  const initializer = new SICOSIInitializer();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializer.initialize();
    });
  } else {
    initializer.initialize();
  }

  // Cleanup quando a página for descarregada
  window.addEventListener('beforeunload', () => {
    if (observerInstance) {
      observerInstance.disconnect();
    }
    if (currentModal) {
      initializer.closeModal();
    }
  });

  // Exportar para debug
  window.SICOSI_DEBUG = {
    isInitialized: () => isInitialized,
    isModalVisible: () => isModalVisible,
    showTestModal: () => {
      if (isInitialized) {
        initializer.showSustainabilityModal('teste de copo descartável');
      }
    },
    testDetection: (product) => {
      return initializer.isNonSustainableItem(product);
    },
    constants: () => window.SICOSIConstants,
    settings: () => userSettings,
    dependencies: () => initializer.dependencies
  };

})();