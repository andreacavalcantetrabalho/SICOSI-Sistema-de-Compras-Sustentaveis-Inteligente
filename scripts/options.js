/**
 * Options Script - SICOSI
 * JavaScript para gerenciar a página de configurações da extensão
 */

class OptionsManager {
  constructor() {
    this.currentTab = 'general';
    this.settings = null;
    this.statistics = null;
    this.hasUnsavedChanges = false;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.switchTab = this.switchTab.bind(this);
    this.saveAllSettings = this.saveAllSettings.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
  }

  /**
   * Inicialização da página de configurações
   */
  async init() {
    try {
      // Mostrar loading
      this.showLoading(true);
      
      // Carregar dados
      await Promise.all([
        this.loadSettings(),
        this.loadStatistics(),
        this.loadStorageInfo()
      ]);
      
      // Configurar interface
      this.setupEventListeners();
      this.setupTabNavigation();
      this.updateUI();
      
    } catch (error) {
      console.error('Options: Erro na inicialização:', error);
      this.showToast('Erro ao carregar configurações', 'error');
    } finally {
      this.showLoading(false);
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
      
      this.settings = response || window.SICOSIConstants.DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Options: Erro ao carregar configurações:', error);
      this.settings = window.SICOSIConstants.DEFAULT_SETTINGS;
    }
  }

  /**
   * Carrega estatísticas da extensão
   */
  async loadStatistics() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_STATISTICS'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      this.statistics = response.usage || {};
    } catch (error) {
      console.error('Options: Erro ao carregar estatísticas:', error);
      this.statistics = {};
    }
  }

  /**
   * Carrega informações de storage
   */
  async loadStorageInfo() {
    try {
      const [syncUsage, localUsage] = await Promise.all([
        chrome.storage.sync.getBytesInUse(),
        chrome.storage.local.getBytesInUse()
      ]);

      this.storageInfo = {
        sync: Math.round(syncUsage / 1024 * 100) / 100,
        local: Math.round(localUsage / 1024 * 100) / 100
      };
    } catch (error) {
      console.error('Options: Erro ao carregar info de storage:', error);
      this.storageInfo = { sync: 0, local: 0 };
    }
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Botões do header
    document.getElementById('saveAllBtn').addEventListener('click', this.saveAllSettings);
    document.getElementById('exportBtn').addEventListener('click', this.exportData);
    
    // Configurações gerais
    document.getElementById('extensionEnabled').addEventListener('change', this.handleSettingChange);
    document.getElementById('debugMode').addEventListener('change', this.handleSettingChange);
    document.getElementById('modalPosition').addEventListener('change', this.handleSettingChange);
    
    // Range sliders
    this.setupRangeSliders();
    
    // Categorias
    document.querySelectorAll('.category-toggle').forEach(toggle => {
      toggle.addEventListener('change', this.handleCategoryChange.bind(this));
    });
    
    // Bulk actions para categorias
    document.getElementById('enableAllCategories').addEventListener('click', () => {
      this.toggleAllCategories(true);
    });
    document.getElementById('disableAllCategories').addEventListener('click', () => {
      this.toggleAllCategories(false);
    });
    document.getElementById('resetCategories').addEventListener('click', this.resetCategories.bind(this));
    
    // Notificações
    document.getElementById('modalNotifications').addEventListener('change', this.handleSettingChange);
    document.getElementById('soundNotifications').addEventListener('change', this.handleSettingChange);
    document.getElementById('browserNotifications').addEventListener('change', this.handleSettingChange);
    document.getElementById('detectionDelay').addEventListener('input', this.handleSettingChange);
    document.getElementById('maxSuggestions').addEventListener('change', this.handleSettingChange);
    
    // Botões de teste
    document.getElementById('testModal').addEventListener('click', this.testModal);
    document.getElementById('testSound').addEventListener('click', this.testSound);
    document.getElementById('testBrowser').addEventListener('click', this.testBrowserNotification);
    
    // Configurações avançadas
    document.getElementById('autoSearch').addEventListener('change', this.handleSettingChange);
    document.getElementById('externalSearch').addEventListener('change', this.handleSettingChange);
    document.getElementById('cacheEnabled').addEventListener('change', this.handleSettingChange);
    document.getElementById('searchTimeout').addEventListener('input', this.handleSettingChange);
    
    // Storage actions
    document.getElementById('clearCache').addEventListener('click', this.clearCache.bind(this));
    document.getElementById('clearLogs').addEventListener('click', this.clearLogs.bind(this));
    document.getElementById('clearAllData').addEventListener('click', this.clearAllData.bind(this));
    
    // Proxy Configuration
    document.getElementById('testProxyBtn')?.addEventListener('click', this.handleTestProxy.bind(this));
    document.getElementById('saveProxyBtn')?.addEventListener('click', this.handleSaveProxy.bind(this));

    // Privacy
    document.getElementById('analyticsEnabled').addEventListener('change', this.handleSettingChange);
    document.getElementById('errorLogging').addEventListener('change', this.handleSettingChange);
    document.getElementById('viewPrivacyPolicy').addEventListener('click', this.viewPrivacyPolicy);
    document.getElementById('downloadData').addEventListener('click', this.downloadUserData);
    
    // About links
    document.getElementById('helpLink').addEventListener('click', this.openHelpPage);
    
    // Auto-save on change
    document.addEventListener('change', () => {
      this.hasUnsavedChanges = true;
      this.updateSaveButton();
    });
    
    // Confirmação antes de sair com mudanças não salvas
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  /**
   * Configura navegação por abas
   */
  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  /**
   * Configura range sliders com atualização de valor
   */
  setupRangeSliders() {
    const rangeInputs = document.querySelectorAll('.range-slider');
    
    rangeInputs.forEach(input => {
      const updateValue = () => {
        const valueDisplay = input.parentElement.querySelector('.range-value');
        if (valueDisplay) {
          let value = input.value;
          let unit = '';
          
          if (input.id === 'autoCloseTime' || input.id === 'searchTimeout') {
            unit = 's';
          } else if (input.id === 'detectionDelay') {
            unit = 'ms';
          }
          
          valueDisplay.textContent = value + unit;
        }
      };
      
      input.addEventListener('input', updateValue);
      updateValue(); // Valor inicial
    });
  }

  /**
   * Troca de aba
   */
  switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    this.currentTab = tabName;
    chrome.storage.local.set({ lastActiveTab: tabName });
  }

  /**
   * Atualiza a interface com os dados carregados
   */
  updateUI() {
    // Configurações gerais
    document.getElementById('extensionEnabled').checked = this.settings.enabled !== false;
    document.getElementById('debugMode').checked = this.settings.advanced?.debugMode || false;
    document.getElementById('modalPosition').value = this.settings.notifications?.position || 'center';
    document.getElementById('autoCloseTime').value = (this.settings.timing?.autoCloseDelay || 15000) / 1000;
    
    // Categorias
    const categories = this.settings.categories || {};
    document.querySelectorAll('.category-toggle').forEach(toggle => {
      const category = toggle.dataset.category;
      toggle.checked = categories[category] !== false;
      this.updateCategoryCard(category, toggle.checked);
    });
    
    // Notificações
    document.getElementById('modalNotifications').checked = this.settings.notifications?.modal !== false;
    document.getElementById('soundNotifications').checked = this.settings.notifications?.sound || false;
    document.getElementById('browserNotifications').checked = this.settings.notifications?.browser || false;
    document.getElementById('detectionDelay').value = this.settings.timing?.debounceDelay || 800;
    document.getElementById('maxSuggestions').value = this.settings.notifications?.maxPerSession || 10;
    
    // Avançado
    document.getElementById('autoSearch').checked = this.settings.advanced?.autoSearch !== false;
    document.getElementById('externalSearch').checked = this.settings.advanced?.externalSearch !== false;
    document.getElementById('cacheEnabled').checked = this.settings.advanced?.cacheEnabled !== false;
    document.getElementById('searchTimeout').value = (this.settings.timing?.searchTimeout || 5000) / 1000;
    
    // Privacy
    document.getElementById('analyticsEnabled').checked = this.settings.privacy?.analytics !== false;
    document.getElementById('errorLogging').checked = this.settings.privacy?.errorLogging !== false;
    
    // Storage info
    document.getElementById('syncStorage').textContent = `${this.storageInfo.sync} KB`;
    document.getElementById('localStorage').textContent = `${this.storageInfo.local} KB`;
    
    // Estatísticas
    document.getElementById('totalSuggestions').textContent = this.statistics.totalModalShown || 0;
    document.getElementById('totalAlternatives').textContent = this.statistics.totalAlternativesSelected || 0;
    document.getElementById('co2Impact').textContent = `${(this.statistics.impactMetrics?.estimatedCO2Saved || 0).toFixed(2)}kg`;
    
    // Carregar configurações do Proxy
    this.loadProxySettings();

    // Restaurar aba ativa
    this.restoreActiveTab();
  }

  /**
   * Restaura a última aba ativa
   */
  async restoreActiveTab() {
    try {
      const result = await chrome.storage.local.get(['lastActiveTab']);
      const lastTab = result.lastActiveTab || 'general';
      this.switchTab(lastTab);
    } catch (error) {
      this.switchTab('general');
    }
  }

  /**
   * Manipula mudanças de configurações
   */
  handleSettingChange(event) {
    this.hasUnsavedChanges = true;
    this.updateSaveButton();
    
    const criticalSettings = ['extensionEnabled'];
    if (criticalSettings.includes(event.target.id)) {
      this.saveAllSettings();
    }
  }

  /**
   * Manipula mudanças de categorias
   */
  handleCategoryChange(event) {
    const category = event.target.dataset.category;
    const enabled = event.target.checked;
    
    this.updateCategoryCard(category, enabled);
    this.handleSettingChange(event);
  }

  /**
   * Atualiza visual do card de categoria
   */
  updateCategoryCard(category, enabled) {
    const card = document.querySelector(`[data-category="${category}"]`);
    if (card) {
      card.classList.toggle('enabled', enabled);
    }
  }

  /**
   * Habilita/desabilita todas as categorias
   */
  toggleAllCategories(enable) {
    document.querySelectorAll('.category-toggle').forEach(toggle => {
      toggle.checked = enable;
      const category = toggle.dataset.category;
      this.updateCategoryCard(category, enable);
    });
    
    this.hasUnsavedChanges = true;
    this.updateSaveButton();
  }

  /**
   * Restaura categorias para o padrão
   */
  resetCategories() {
    if (!confirm('Restaurar configurações de categoria para o padrão?')) {
      return;
    }
    
    const defaultCategories = window.SICOSIConstants.DEFAULT_SETTINGS.categories;
    
    document.querySelectorAll('.category-toggle').forEach(toggle => {
      const category = toggle.dataset.category;
      const enabled = defaultCategories[category] !== false;
      toggle.checked = enabled;
      this.updateCategoryCard(category, enabled);
    });
    
    this.hasUnsavedChanges = true;
    this.updateSaveButton();
  }
  
  /**
   * Carrega e exibe as configurações do proxy salvas.
   */
  async loadProxySettings() {
    try {
      const result = await chrome.storage.sync.get(['proxySettings']);
      const settings = result.proxySettings || {};
      
      if (settings.grokProxyUrl) {
        document.getElementById('proxyUrl').value = settings.grokProxyUrl;
        this.testProxyConnection(settings.grokProxyUrl); // Testa a conexão ao carregar
      }
      if (settings.analysisMode) {
        document.getElementById('analysisMode').value = settings.analysisMode;
      }
    } catch (error) {
      console.error("Erro ao carregar configurações do proxy:", error);
    }
  }

  /**
   * Testa a conexão com a URL do proxy fornecida.
   * @param {string} url - A URL do endpoint do proxy.
   */
  async testProxyConnection(url) {
    const statusEl = document.getElementById('proxyStatus');
    if (!url || !url.startsWith('https://')) {
      statusEl.innerHTML = '<span style="color: red;">❌ URL inválida</span>';
      return;
    }

    statusEl.innerHTML = '<span>🔄 Testando conexão...</span>';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productDescription: 'teste de conexão' })
      });

      if (response.ok) {
        statusEl.innerHTML = '<span style="color: green;">✅ Conexão OK!</span>';
      } else {
        statusEl.innerHTML = `<span style="color: red;">❌ Erro HTTP ${response.status}</span>`;
      }
    } catch (error) {
      console.error("Erro ao testar proxy:", error);
      statusEl.innerHTML = '<span style="color: red;">❌ Erro de conexão</span>';
    }
  }

  /**
   * Manipulador para o botão de teste do proxy.
   */
  handleTestProxy() {
    const url = document.getElementById('proxyUrl').value;
    this.testProxyConnection(url);
  }

  /**
   * Salva as configurações do proxy no chrome.storage.
   */
  async handleSaveProxy() {
    const url = document.getElementById('proxyUrl').value;
    const mode = document.getElementById('analysisMode').value;
    const statusEl = document.getElementById('proxyStatus');

    try {
      await chrome.storage.sync.set({ 
        proxySettings: { 
          grokProxyUrl: url,
          analysisMode: mode 
        } 
      });
      statusEl.innerHTML = '<span style="color: green;">✅ Configuração salva!</span>';
      this.showToast('Configurações do Proxy salvas!', 'success');
    } catch (error) {
      console.error("Erro ao salvar configurações do proxy:", error);
      statusEl.innerHTML = '<span style="color: red;">❌ Erro ao salvar</span>';
      this.showToast('Erro ao salvar configurações do Proxy', 'error');
    }
  }

  /**
   * Salva todas as configurações
   */
  async saveAllSettings() {
    try {
      this.showLoading(true);
      
      const updatedSettings = {
        enabled: document.getElementById('extensionEnabled').checked,
        categories: {},
        notifications: {
          modal: document.getElementById('modalNotifications').checked,
          sound: document.getElementById('soundNotifications').checked,
          browser: document.getElementById('browserNotifications').checked,
          position: document.getElementById('modalPosition').value,
          maxPerSession: parseInt(document.getElementById('maxSuggestions').value)
        },
        advanced: {
          autoSearch: document.getElementById('autoSearch').checked,
          externalSearch: document.getElementById('externalSearch').checked,
          cacheEnabled: document.getElementById('cacheEnabled').checked,
          debugMode: document.getElementById('debugMode').checked
        },
        timing: {
          autoCloseDelay: parseInt(document.getElementById('autoCloseTime').value) * 1000,
          debounceDelay: parseInt(document.getElementById('detectionDelay').value),
          searchTimeout: parseInt(document.getElementById('searchTimeout').value) * 1000
        },
        privacy: {
          analytics: document.getElementById('analyticsEnabled').checked,
          errorLogging: document.getElementById('errorLogging').checked
        }
      };
      
      document.querySelectorAll('.category-toggle').forEach(toggle => {
        const category = toggle.dataset.category;
        updatedSettings.categories[category] = toggle.checked;
      });
      
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_SETTINGS',
        data: updatedSettings
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Salva também as configurações do proxy
      await this.handleSaveProxy();

      this.settings = updatedSettings;
      this.hasUnsavedChanges = false;
      this.updateSaveButton();
      
      this.showToast('Configurações salvas com sucesso!', 'success');
      
    } catch (error) {
      console.error('Options: Erro ao salvar:', error);
      this.showToast('Erro ao salvar configurações', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Atualiza estado do botão de salvar
   */
  updateSaveButton() {
    const saveBtn = document.getElementById('saveAllBtn');
    if (this.hasUnsavedChanges) {
      saveBtn.textContent = '💾 Salvar Alterações';
      saveBtn.classList.add('btn-warning');
      saveBtn.classList.remove('btn-primary');
    } else {
      saveBtn.textContent = '💾 Salvar Tudo';
      saveBtn.classList.add('btn-primary');
      saveBtn.classList.remove('btn-warning');
    }
  }

  /**
   * Exporta dados da extensão
   */
  async exportData() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_DATA'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
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
      
      this.showToast('Dados exportados com sucesso!', 'success');
      
    } catch (error) {
      console.error('Options: Erro no export:', error);
      this.showToast('Erro ao exportar dados', 'error');
    }
  }

  /**
   * Testa modal de sugestão
   */
  testModal() {
    alert('Modal de teste: Esta seria uma sugestão sustentável para "copo descartável" → "copo biodegradável"');
  }

  /**
   * Testa som de notificação
   */
  testSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMbBj2Y2/LLdSgFIHzL8N2SQgkPVLjo6qZVFAg+lt/xwmsiCzm06PCxWh0MGmK+7+WgWA4dTaXh6rFdGAg5kNT4znkfBSJ/yO7ZkzwIM06q5+OtXR0WOwgTOh');
    audio.play().catch(() => {
      this.showToast('Som de teste reproduzido (silencioso)', 'success');
    });
  }

  /**
   * Testa notificação do browser
   */
  async testBrowserNotification() {
    try {
      if (!('Notification' in window)) {
        throw new Error('Notificações não suportadas neste browser');
      }
      
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      if (permission === 'granted') {
        new Notification('SICOSI - Teste', {
          body: 'Esta é uma notificação de teste da extensão SICOSI',
          icon: chrome.runtime.getURL('assets/icons/icon48.png')
        });
        this.showToast('Notificação de teste enviada!', 'success');
      } else {
        throw new Error('Permissão de notificação negada');
      }
      
    } catch (error) {
      this.showToast(`Erro no teste: ${error.message}`, 'error');
    }
  }

  /**
   * Limpa cache da extensão
   */
  async clearCache() {
    if (!confirm('Limpar todo o cache da extensão? Isso pode reduzir a performance temporariamente.')) {
      return;
    }
    
    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_CACHE'
      });
      
      await this.loadStorageInfo();
      this.updateUI();
      
      this.showToast('Cache limpo com sucesso!', 'success');
    } catch (error) {
      this.showToast('Erro ao limpar cache', 'error');
    }
  }

  /**
   * Limpa logs da extensão
   */
  async clearLogs() {
    if (!confirm('Limpar todos os logs da extensão?')) {
      return;
    }
    
    try {
      await chrome.storage.local.remove(['SICOSI-logs']);
      
      await this.loadStorageInfo();
      this.updateUI();
      
      this.showToast('Logs limpos com sucesso!', 'success');
    } catch (error) {
      this.showToast('Erro ao limpar logs', 'error');
    }
  }

  /**
   * Limpa todos os dados da extensão
   */
  async clearAllData() {
    const confirmed = confirm(
      'ATENÇÃO: Isso vai apagar TODOS os dados da extensão, incluindo configurações, estatísticas e cache.\n\n' +
      'Esta ação não pode ser desfeita. Deseja continuar?'
    );
    
    if (!confirmed) return;
    
    try {
      await Promise.all([
        chrome.storage.sync.clear(),
        chrome.storage.local.clear()
      ]);
      
      this.showToast('Todos os dados foram limpos. A página será recarregada.', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      this.showToast('Erro ao limpar dados', 'error');
    }
  }

  /**
   * Abre política de privacidade
   */
  viewPrivacyPolicy() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('pages/privacy.html')
    });
  }

  /**
   * Download dos dados do usuário
   */
  async downloadUserData() {
    try {
      const data = await chrome.runtime.sendMessage({
        type: 'EXPORT_DATA'
      });
      
      const anonymizedData = {
        settings: data.sync,
        statistics: data.local.SICOSIStatistics,
        exportDate: data.exportDate,
        version: data.version
      };
      
      const dataStr = JSON.stringify(anonymizedData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SICOSI-meus-dados-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      this.showToast('Seus dados foram baixados!', 'success');
      
    } catch (error) {
      this.showToast('Erro ao baixar dados', 'error');
    }
  }

  /**
   * Abre página de ajuda
   */
  openHelpPage() {
    chrome.tabs.create({
      url: 'https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente#readme'
    });
  }

  /**
   * Mostra loading overlay
   */
  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('hidden', !show);
  }

  /**
   * Mostra toast de notificação
   */
  showToast(message, type = 'success') {
    const toastId = type === 'success' ? 'successToast' : 'errorToast';
    const toast = document.getElementById(toastId);
    const messageElement = toast.querySelector('.toast-message');
    
    messageElement.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  const optionsManager = new OptionsManager();
  optionsManager.init();
});
