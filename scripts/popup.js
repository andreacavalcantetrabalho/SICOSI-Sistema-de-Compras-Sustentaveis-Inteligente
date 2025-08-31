/**
 * Popup Script - SICOSI
 * JavaScript para gerenciar a interface do popup da extensão
 */

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.settings = null;
    this.statistics = null;
    this.loadingOverlay = null;
    this.settingsModal = null;
    
    // Bind de métodos
    this.init = this.init.bind(this);
    this.handleToggleChange = this.handleToggleChange.bind(this);
    this.handleCategoryChange = this.handleCategoryChange.bind(this);
    this.showSettings = this.showSettings.bind(this);
    this.hideSettings = this.hideSettings.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
  }

  /**
   * Inicialização do popup
   */
  async init() {
    try {
      // Obter referências dos elementos
      this.getElementReferences();
      
      // Mostrar loading
      this.showLoading(true);
      
      // Carregar dados iniciais
      await Promise.all([
        this.loadCurrentTab(),
        this.loadSettings(),
        this.loadStatistics()
      ]);
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Atualizar interface
      this.updateUI();
      
    } catch (error) {
      console.error('Popup: Erro na inicialização:', error);
      this.showError('Erro ao carregar dados da extensão');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Obtém referências dos elementos DOM
   */
  getElementReferences() {
    // Status e toggle
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    this.extensionToggle = document.getElementById('extensionToggle');
    
    // Estatísticas
    this.modalCount = document.getElementById('modalCount');
    this.alternativeCount = document.getElementById('alternativeCount');
    this.impactScore = document.getElementById('impactScore');
    
    // Métricas de impacto
    this.co2Saved = document.getElementById('co2Saved');
    this.wasteSaved = document.getElementById('wasteSaved');
    this.itemsReplaced = document.getElementById('itemsReplaced');
    
    // Site atual
    this.siteSection = document.getElementById('siteSection');
    this.siteName = document.getElementById('siteName');
    this.compatibilityBadge = document.getElementById('compatibilityBadge');
    
    // Botões
    this.settingsBtn = document.getElementById('settingsBtn');
    this.viewStatsBtn = document.getElementById('viewStatsBtn');
    this.exportDataBtn = document.getElementById('exportDataBtn');
    this.testModeBtn = document.getElementById('testModeBtn');
    this.debugBtn = document.getElementById('debugBtn');
    
    // Links
    this.helpLink = document.getElementById('helpLink');
    this.feedbackLink = document.getElementById('feedbackLink');
    this.aboutLink = document.getElementById('aboutLink');
    this.privacyLink = document.getElementById('privacyLink');
    this.githubLink = document.getElementById('githubLink');
    
    // Modal de configurações
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
    
    // Checkboxes de categorias
    this.categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    
    // Configurações do modal
    this.soundNotifications = document.getElementById('soundNotifications');
    this.modalNotifications = document.getElementById('modalNotifications');
    this.autoSearch = document.getElementById('autoSearch');
    this.externalSearch = document.getElementById('externalSearch');
    this.analyticsEnabled = document.getElementById('analyticsEnabled');
    this.cacheEnabled = document.getElementById('cacheEnabled');
    
    // Loading overlay
    this.loadingOverlay = document.getElementById('loadingOverlay');
  }

  /**
   * Carrega informações da aba atual
   */
  async loadCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
      
      // Verificar se é uma página do ComprasNet
      const isComprasNet = this.currentTab.url.includes('compras.gov.br');
      
      if (isComprasNet) {
        this.siteSection.style.display = 'block';
        this.siteName.textContent = 'ComprasNet';
        this.compatibilityBadge.textContent = 'Compatível';
        this.compatibilityBadge.className = 'compatibility-badge';
      } else {
        this.siteSection.style.display = 'block';
        this.siteName.textContent = 'Site não compatível';
        this.compatibilityBadge.textContent = 'Incompatível';
        this.compatibilityBadge.className = 'compatibility-badge incompatible';
      }
      
    } catch (error) {
      console.error('Popup: Erro ao carregar aba atual:', error);
      this.siteSection.style.display = 'none';
    }
  }

  /**
   * Carrega configurações do usuário
   */
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_USER_SETTINGS'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      this.settings = response || {
        enabled: true,
        categories: {
          descartaveis: true,
          papel: true,
          limpeza: true,
          equipamentos: true,
          embalagens: true
        },
        notifications: {
          modal: true,
          sound: false
        },
        advanced: {
          autoSearch: true,
          externalSearch: true,
          cacheEnabled: true
        },
        privacy: {
          analytics: true
        }
      };
      
    } catch (error) {
      console.error('Popup: Erro ao carregar configurações:', error);
      this.settings = { enabled: false };
    }
  }

  /**
   * Carrega estatísticas de uso
   */
  async loadStatistics() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_STATISTICS'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      this.statistics = response.usage || {
        totalModalShown: 0,
        totalAlternativesSelected: 0,
        impactMetrics: {
          estimatedCO2Saved: 0,
          estimatedWasteSaved: 0,
          sustainableItemsAdopted: 0
        }
      };
      
    } catch (error) {
      console.error('Popup: Erro ao carregar estatísticas:', error);
      this.statistics = {
        totalModalShown: 0,
        totalAlternativesSelected: 0,
        impactMetrics: {
          estimatedCO2Saved: 0,
          estimatedWasteSaved: 0,
          sustainableItemsAdopted: 0
        }
      };
    }
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Toggle principal da extensão
    this.extensionToggle.addEventListener('change', this.handleToggleChange);
    
    // Checkboxes de categorias
    this.categoryCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', this.handleCategoryChange);
    });
    
    // Botões principais
    this.settingsBtn.addEventListener('click', this.showSettings);
    this.viewStatsBtn.addEventListener('click', this.openStatisticsPage);
    this.exportDataBtn.addEventListener('click', this.exportData);
    
    // Botões de ação do site
    if (this.testModeBtn) {
      this.testModeBtn.addEventListener('click', this.toggleTestMode);
    }
    if (this.debugBtn) {
      this.debugBtn.addEventListener('click', this.openDebugMode);
    }
    
    // Links
    this.helpLink.addEventListener('click', this.openHelpPage);
    this.feedbackLink.addEventListener('click', this.openFeedbackPage);
    this.aboutLink.addEventListener('click', this.openAboutPage);
    this.privacyLink.addEventListener('click', this.openPrivacyPage);
    this.githubLink.addEventListener('click', this.openGitHubPage);
    
    // Modal de configurações
    this.closeSettingsBtn.addEventListener('click', this.hideSettings);
    this.saveSettingsBtn.addEventListener('click', this.saveSettings);
    this.resetSettingsBtn.addEventListener('click', this.resetSettings);
    
    // Fechar modal clicando no overlay
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this.hideSettings();
      }
    });
    
    // ESC para fechar modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.settingsModal.style.display === 'none') {
        this.hideSettings();
      }
    });
  }

  /**
   * Atualiza a interface com os dados carregados
   */
  updateUI() {
    // Definir a versão da extensão dinamicamente
    const versionTextElement = document.getElementById('versionText');
    if (versionTextElement) {
      versionTextElement.textContent = `v${chrome.runtime.getManifest().version}`;
    }

    // Status da extensão
    const isEnabled = this.settings.enabled;
    this.extensionToggle.checked = isEnabled;
    this.statusDot.className = `status-dot ${isEnabled ? 'active' : 'inactive'}`;
    this.statusText.textContent = isEnabled ? 'Ativo' : 'Inativo';
    
    // Estatísticas diárias (simuladas como últimas 24h)
    this.modalCount.textContent = this.statistics.totalModalShown || 0;
    this.alternativeCount.textContent = this.statistics.totalAlternativesSelected || 0;
    
    // Calcular score de impacto
    const impactScore = this.calculateImpactScore();
    this.impactScore.textContent = impactScore;
    
    // Métricas de impacto total
    const metrics = this.statistics.impactMetrics || {};
    this.co2Saved.textContent = `${(metrics.estimatedCO2Saved || 0).toFixed(2)} kg`;
    this.wasteSaved.textContent = `${(metrics.estimatedWasteSaved || 0).toFixed(0)} g`;
    this.itemsReplaced.textContent = metrics.sustainableItemsAdopted || 0;
    
    // Categorias ativas
    const categories = this.settings.categories || {};
    this.categoryCheckboxes.forEach(checkbox => {
      const category = checkbox.dataset.category;
      checkbox.checked = categories[category] !== false;
    });
    
    // Configurações do modal
    if (this.settings.notifications) {
      this.soundNotifications.checked = this.settings.notifications.sound || false;
      this.modalNotifications.checked = this.settings.notifications.modal !== false;
    }
    
    if (this.settings.advanced) {
      this.autoSearch.checked = this.settings.advanced.autoSearch !== false;
      this.externalSearch.checked = this.settings.advanced.externalSearch !== false;
      this.cacheEnabled.checked = this.settings.advanced.cacheEnabled !== false;
    }
    
    if (this.settings.privacy) {
      this.analyticsEnabled.checked = this.settings.privacy.analytics !== false;
    }
  }

  /**
   * Calcula score de impacto baseado nas métricas
   */
  calculateImpactScore() {
    const metrics = this.statistics.impactMetrics || {};
    const items = metrics.sustainableItemsAdopted || 0;
    const co2 = metrics.estimatedCO2Saved || 0;
    
    // Fórmula simples: pontos por item + bônus por CO2 economizado
    const score = (items * 10) + Math.floor(co2 * 5);
    
    return Math.min(score, 999); // Limitar a 999 pontos
  }

  /**
   * Manipula mudança no toggle principal
   */
  async handleToggleChange(event) {
    const enabled = event.target.checked;
    
    try {
      this.showLoading(true);
      
      const updatedSettings = {
        ...this.settings,
        enabled
      };
      
      await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_SETTINGS',
        data: updatedSettings
      });
      
      this.settings = updatedSettings;
      this.updateUI();
      
      // Log da ação
      await chrome.runtime.sendMessage({
        type: 'LOG_ANALYTICS_EVENT',
        data: {
          event: 'extension_toggled',
          details: enabled ? 'enabled' : 'disabled'
        }
      });
      
    } catch (error) {
      console.error('Popup: Erro ao alterar status:', error);
      // Reverter toggle em caso de erro
      event.target.checked = !enabled;
      this.showError('Erro ao salvar configuração');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Manipula mudanças nas categorias
   */
  async handleCategoryChange(event) {
    const category = event.target.dataset.category;
    const enabled = event.target.checked;
    
    try {
      const updatedSettings = {
        ...this.settings,
        categories: {
          ...this.settings.categories,
          [category]: enabled
        }
      };
      
      await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_SETTINGS',
        data: updatedSettings
      });
      
      this.settings = updatedSettings;
      
      // Log da ação
      await chrome.runtime.sendMessage({
        type: 'LOG_ANALYTICS_EVENT',
        data: {
          event: 'category_toggled',
          details: `${category}: ${enabled ? 'enabled' : 'disabled'}`
        }
      });
      
    } catch (error) {
      console.error('Popup: Erro ao alterar categoria:', error);
      // Reverter checkbox
      event.target.checked = !enabled;
      this.showError('Erro ao salvar categoria');
    }
  }

  /**
   * Mostra modal de configurações
   */
  showSettings() {
    this.settingsModal.style.display = 'flex';
  }

  /**
   * Esconde modal de configurações
   */
  hideSettings() {
    this.settingsModal.style.display = 'none';
  }

  /**
   * Salva configurações do modal
   */
  async saveSettings() {
    try {
      this.showLoading(true);
      
      const updatedSettings = {
        ...this.settings,
        notifications: {
          sound: this.soundNotifications.checked,
          modal: this.modalNotifications.checked
        },
        advanced: {
          autoSearch: this.autoSearch.checked,
          externalSearch: this.externalSearch.checked,
          cacheEnabled: this.cacheEnabled.checked
        },
        privacy: {
          analytics: this.analyticsEnabled.checked
        }
      };
      
      await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_SETTINGS',
        data: updatedSettings
      });
      
      this.settings = updatedSettings;
      this.hideSettings();
      
      this.showSuccess('Configurações salvas com sucesso!');
      
    } catch (error) {
      console.error('Popup: Erro ao salvar configurações:', error);
      this.showError('Erro ao salvar configurações');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Restaura configurações padrão
   */
  async resetSettings() {
    if (!confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
      return;
    }
    
    try {
      this.showLoading(true);
      
      const defaultSettings = {
        enabled: true,
        categories: {
          descartaveis: true,
          papel: true,
          limpeza: true,
          equipamentos: true,
          embalagens: true
        },
        notifications: {
          modal: true,
          sound: false
        },
        advanced: {
          autoSearch: true,
          externalSearch: true,
          cacheEnabled: true
        },
        privacy: {
          analytics: true
        }
      };
      
      await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_SETTINGS',
        data: defaultSettings
      });
      
      this.settings = defaultSettings;
      this.updateUI();
      this.hideSettings();
      
      this.showSuccess('Configurações restauradas!');
      
    } catch (error) {
      console.error('Popup: Erro ao restaurar configurações:', error);
      this.showError('Erro ao restaurar configurações');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Abre página de estatísticas
   */
  async openStatisticsPage() {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('pages/statistics.html')
      });
      window.close();
    } catch (error) {
      console.error('Popup: Erro ao abrir estatísticas:', error);
    }
  }

  /**
   * Exporta dados do usuário
   */
  async exportData() {
    try {
      this.showLoading(true);
      
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_DATA'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Criar arquivo para download
      const dataStr = JSON.stringify(response, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SICOSI-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      this.showSuccess('Dados exportados com sucesso!');
      
    } catch (error) {
      console.error('Popup: Erro ao exportar dados:', error);
      this.showError('Erro ao exportar dados');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Alterna modo de teste
   */
  async toggleTestMode() {
    // Enviar mensagem para content script
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'TOGGLE_TEST_MODE'
      });
    } catch (error) {
      console.error('Popup: Erro no modo teste:', error);
    }
  }

  /**
   * Abre modo de debug
   */
  async openDebugMode() {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('pages/debug.html')
      });
    } catch (error) {
      console.error('Popup: Erro ao abrir debug:', error);
    }
  }

  /**
   * Abre páginas externas
   */
  openHelpPage() {
    chrome.tabs.create({ url: 'https://github.com/toticavalcanti/SICOSI-comprasnet#readme' });
  }

  openFeedbackPage() {
    chrome.tabs.create({ url: 'https://github.com/toticavalcanti/SICOSI-comprasnet/issues' });
  }

  openAboutPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('pages/about.html') });
  }

  openPrivacyPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('pages/privacy.html') });
  }

  openGitHubPage() {
    chrome.tabs.create({ url: 'https://github.com/toticavalcanti/SICOSI-comprasnet' });
  }

  /**
   * Mostra loading overlay
   */
  showLoading(show) {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Mostra mensagem de sucesso
   */
  showSuccess(message) {
    // Implementar toast de sucesso se necessário
    console.log('Success:', message);
  }

  /**
   * Mostra mensagem de erro
   */
  showError(message) {
    // Implementar toast de erro se necessário
    console.error('Error:', message);
    alert(message); // Fallback temporário
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const popupManager = new PopupManager();
  popupManager.init();
});