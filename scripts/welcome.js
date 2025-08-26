/**
 * Welcome Script - SICOSI
 * Gerencia o processo de onboarding e configuração inicial da extensão
 */

class WelcomeManager {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.selectedCategories = new Set(['descartaveis', 'papel', 'limpeza', 'equipamentos', 'embalagens']);
    this.selectedNotificationType = 'modal';
    this.isCompleted = false;
  }

  /**
   * Inicializa a página de boas-vindas
   */
  async init() {
    console.log('🌱 SICOSI Welcome: Inicializando onboarding...');
    
    try {
      // Verificar se é primeira execução
      await this.checkFirstRun();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Inicializar interface
      this.updateStepDisplay();
      
      // Configurar dados iniciais
      this.setupInitialData();
      
    } catch (error) {
      console.error('Welcome: Erro na inicialização:', error);
      this.showError('Erro ao carregar página de boas-vindas');
    }
  }

  /**
   * Verifica se é a primeira execução
   */
  async checkFirstRun() {
    try {
      const result = await chrome.storage.sync.get(['SICOSISettings']);
      const settings = result.SICOSISettings;
      
      if (settings && !settings.firstRun) {
        // Não é primeira execução, redirecionar
        this.showAlreadyConfigured();
      }
    } catch (error) {
      console.warn('Welcome: Erro ao verificar primeira execução:', error);
    }
  }

  /**
   * Configura event listeners da interface
   */
  setupEventListeners() {
    // Navegação entre steps
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const finishBtn = document.getElementById('finishBtn');

    if (nextBtn) {
      nextBtn.addEventListener('click', this.nextStep.bind(this));
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', this.prevStep.bind(this));
    }
    
    if (finishBtn) {
      finishBtn.addEventListener('click', this.finishSetup.bind(this));
    }

    // Categorias (Step 1)
    document.querySelectorAll('.category-option input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', this.handleCategoryChange.bind(this));
    });

    // Notificações (Step 2)
    document.querySelectorAll('input[name="notification"]').forEach(radio => {
      radio.addEventListener('change', this.handleNotificationChange.bind(this));
    });

    // Botão para abrir configurações
    const openOptionsBtn = document.getElementById('openOptionsBtn');
    if (openOptionsBtn) {
      openOptionsBtn.addEventListener('click', this.openOptionsPage.bind(this));
    }

    // Modal de conclusão
    const gotItBtn = document.getElementById('gotItBtn');
    if (gotItBtn) {
      gotItBtn.addEventListener('click', this.closeCompletionModal.bind(this));
    }

    // Fechar modal clicando fora
    const completionModal = document.getElementById('completionModal');
    if (completionModal) {
      completionModal.addEventListener('click', (e) => {
        if (e.target === completionModal) {
          this.closeCompletionModal();
        }
      });
    }
  }

  /**
   * Configura dados iniciais da interface
   */
  setupInitialData() {
    // Marcar todas as categorias por padrão
    document.querySelectorAll('.category-option input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = true;
    });

    // Selecionar notificação modal por padrão
    const modalRadio = document.querySelector('input[name="notification"][value="modal"]');
    if (modalRadio) {
      modalRadio.checked = true;
    }

    // Atualizar estatísticas de impacto
    this.updateImpactStats();
  }

  /**
   * Atualiza exibição do step atual
   */
  updateStepDisplay() {
    // Atualizar cards dos steps
    document.querySelectorAll('.step-card').forEach((card, index) => {
      const stepNumber = index + 1;
      card.classList.toggle('active', stepNumber === this.currentStep);
    });

    // Atualizar botões de navegação
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const finishBtn = document.getElementById('finishBtn');

    if (prevBtn) {
      prevBtn.style.display = this.currentStep > 1 ? 'block' : 'none';
    }

    if (nextBtn && finishBtn) {
      if (this.currentStep === this.totalSteps) {
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'block';
      } else {
        nextBtn.style.display = 'block';
        finishBtn.style.display = 'none';
      }
    }

    // Scroll para o step ativo
    const activeStep = document.querySelector('.step-card.active');
    if (activeStep) {
      activeStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Avança para próximo step
   */
  nextStep() {
    if (this.currentStep < this.totalSteps) {
      // Validar step atual antes de avançar
      if (this.validateCurrentStep()) {
        this.currentStep++;
        this.updateStepDisplay();
        
        // Log da navegação
        this.logEvent('onboarding_step_completed', `step_${this.currentStep - 1}`);
      }
    }
  }

  /**
   * Volta para step anterior
   */
  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepDisplay();
    }
  }

  /**
   * Valida step atual
   */
  validateCurrentStep() {
    switch (this.currentStep) {
      case 1: // Categorias
        if (this.selectedCategories.size === 0) {
          this.showNotification('Selecione pelo menos uma categoria para continuar.', 'warning');
          return false;
        }
        return true;
      
      case 2: // Notificações
        return true; // Sempre válido, há seleção padrão
      
      case 3: // Conclusão
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Manipula mudança de categoria
   */
  handleCategoryChange(event) {
    const category = event.target.value || event.target.closest('.category-option').dataset.category;
    const isChecked = event.target.checked;

    if (isChecked) {
      this.selectedCategories.add(category);
    } else {
      this.selectedCategories.delete(category);
    }

    // Atualizar estatísticas de impacto
    this.updateImpactStats();
  }

  /**
   * Manipula mudança de tipo de notificação
   */
  handleNotificationChange(event) {
    this.selectedNotificationType = event.target.value;
  }

  /**
   * Atualiza estatísticas de impacto estimado
   */
  updateImpactStats() {
    const stats = {
      co2: 0,
      waste: 0,
      alternatives: 0
    };

    // Calcular estimativas baseado nas categorias selecionadas
    this.selectedCategories.forEach(category => {
      switch (category) {
        case 'descartaveis':
          stats.co2 += 1.2;
          stats.waste += 300;
          stats.alternatives += 8;
          break;
        case 'papel':
          stats.co2 += 0.8;
          stats.waste += 150;
          stats.alternatives += 5;
          break;
        case 'limpeza':
          stats.co2 += 0.3;
          stats.waste += 50;
          stats.alternatives += 4;
          break;
        case 'equipamentos':
          stats.co2 += 0.2;
          stats.waste += 0;
          stats.alternatives += 2;
          break;
        case 'embalagens':
          stats.co2 += 0.5;
          stats.waste += 200;
          stats.alternatives += 3;
          break;
      }
    });

    // Atualizar elementos na interface
    const co2Element = document.querySelector('.stat-card .stat-number');
    const wasteElement = document.querySelectorAll('.stat-card .stat-number')[1];
    const alternativesElement = document.querySelectorAll('.stat-card .stat-number')[2];

    if (co2Element) co2Element.textContent = `${stats.co2.toFixed(1)} kg`;
    if (wasteElement) wasteElement.textContent = `${stats.waste}g`;
    if (alternativesElement) alternativesElement.textContent = stats.alternatives;
  }

  /**
   * Finaliza configuração inicial
   */
  async finishSetup() {
    try {
      this.showLoading(true);

      // Criar configurações iniciais
      const initialSettings = {
        enabled: true,
        firstRun: false,
        onboardingCompleted: true,
        installDate: Date.now(),
        version: chrome.runtime.getManifest().version,
        categories: this.arrayToObject([...this.selectedCategories]),
        notifications: {
          modal: this.selectedNotificationType === 'modal' || this.selectedNotificationType === 'sound',
          sound: this.selectedNotificationType === 'sound',
          browser: false,
          position: 'center'
        },
        advanced: {
          autoSearch: true,
          externalSearch: true,
          cacheEnabled: true,
          debugMode: false
        },
        privacy: {
          analytics: true,
          dataCollection: 'minimal'
        }
      };

      // Salvar configurações
      await chrome.storage.sync.set({
        SICOSISettings: initialSettings
      });

      // Inicializar estatísticas
      const initialStats = {
        totalModalShown: 0,
        totalAlternativesSelected: 0,
        totalSearches: 0,
        categoriesUsed: {},
        impactMetrics: {
          estimatedCO2Saved: 0,
          estimatedWasteSaved: 0,
          sustainableItemsAdopted: 0
        },
        installDate: Date.now(),
        lastActive: Date.now(),
        onboardingCompleted: Date.now()
      };

      await chrome.storage.local.set({
        SICOSIStatistics: initialStats
      });

      this.isCompleted = true;

      // Log de conclusão
      await this.logEvent('onboarding_completed', {
        categories: [...this.selectedCategories],
        notificationType: this.selectedNotificationType,
        duration: Date.now() - (initialStats.installDate || Date.now())
      });

      // Mostrar modal de conclusão
      this.showCompletionModal();

    } catch (error) {
      console.error('Welcome: Erro ao finalizar setup:', error);
      this.showNotification('Erro ao salvar configurações. Tente novamente.', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Mostra modal de conclusão
   */
  showCompletionModal() {
    const modal = document.getElementById('completionModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('animate-fadeIn');
    }
  }

  /**
   * Fecha modal de conclusão
   */
  closeCompletionModal() {
    const modal = document.getElementById('completionModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('animate-fadeIn');
    }

    // Opcional: redirecionar para ComprasNet
    this.suggestComprasNetRedirect();
  }

  /**
   * Sugere redirecionamento para ComprasNet
   */
  suggestComprasNetRedirect() {
    const shouldRedirect = confirm(
      'Setup concluído! Gostaria de abrir o ComprasNet para testar a extensão?'
    );

    if (shouldRedirect) {
      chrome.tabs.create({
        url: 'https://catalogo.compras.gov.br/cnbs-web/busca'
      });
    }
  }

  /**
   * Abre página de configurações
   */
  openOptionsPage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('pages/options.html')
    });
  }

  /**
   * Mostra notificação para usuário já configurado
   */
  showAlreadyConfigured() {
    const container = document.querySelector('.welcome-container');
    if (container) {
      container.innerHTML = `
        <div class="card" style="max-width: 500px; margin: 50px auto; text-align: center;">
          <div class="card-body" style="padding: 40px;">
            <div class="logo-icon" style="font-size: 48px; margin-bottom: 20px;">🌱</div>
            <h2>SICOSI já está configurado!</h2>
            <p style="margin: 20px 0; color: var(--text-secondary);">
              A extensão já foi configurada anteriormente e está pronta para uso.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button class="btn btn-primary" onclick="this.openComprasNet()">
                🌐 Abrir ComprasNet
              </button>
              <button class="btn btn-secondary" onclick="this.openOptionsPage()">
                ⚙️ Configurações
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Abre ComprasNet
   */
  openComprasNet() {
    chrome.tabs.create({
      url: 'https://catalogo.compras.gov.br/cnbs-web/busca'
    });
  }

  /**
   * Converte array em objeto com valores true
   */
  arrayToObject(array) {
    const obj = {};
    array.forEach(item => {
      obj[item] = true;
    });
    return obj;
  }

  /**
   * Mostra/oculta loading
   */
  showLoading(show) {
    // Implementar se houver elemento de loading na página
    console.log('Loading:', show);
  }

  /**
   * Mostra notificação para o usuário
   */
  showNotification(message, type = 'info') {
    // Criar notificação temporária
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#F44336' : type === 'warning' ? '#FF9800' : '#4CAF50'};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
      font-size: 14px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remover após 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Log de eventos
   */
  async logEvent(event, details = {}) {
    try {
      const logEntry = {
        timestamp: Date.now(),
        event,
        details,
        page: 'welcome',
        userAgent: navigator.userAgent.substring(0, 100)
      };

      // Armazenar no storage local
      const result = await chrome.storage.local.get(['SICOSIWelcomeLogs']);
      const logs = result.SICOSIWelcomeLogs || [];
      
      logs.push(logEntry);
      
      // Manter apenas últimos 50 logs
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }

      await chrome.storage.local.set({ SICOSIWelcomeLogs: logs });
      
      console.log('Welcome Event:', logEntry);
    } catch (error) {
      console.warn('Erro ao fazer log:', error);
    }
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const welcomeManager = new WelcomeManager();
  welcomeManager.init();
  
  // Tornar disponível globalmente para uso nos event handlers inline
  window.welcomeManager = welcomeManager;
  window.openComprasNet = () => welcomeManager.openComprasNet();
  window.openOptionsPage = () => welcomeManager.openOptionsPage();
});