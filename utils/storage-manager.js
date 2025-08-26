/**
 * Storage Manager - SICOSI Sustentável
 * Gerencia armazenamento de dados da extensão usando Chrome Storage API
 */

class StorageManager {
  constructor() {
    this.storageKeys = window.SICOSIConstants.CACHE_CONFIG.KEYS;
    this.defaultExpiry = window.SICOSIConstants.CACHE_CONFIG.DEFAULT_EXPIRY;
  }

  /**
   * Salva configurações do usuário
   * @param {Object} settings - Configurações a serem salvas
   */
  async saveUserSettings(settings) {
    try {
      await chrome.storage.sync.set({
        [this.storageKeys.SETTINGS]: {
          data: settings,
          timestamp: Date.now()
        }
      });
      console.log('SICOSI Storage: Configurações salvas:', settings);
    } catch (error) {
      console.error('SICOSI Storage: Erro ao salvar configurações:', error);
      throw error;
    }
  }

  /**
   * Carrega configurações do usuário
   * @returns {Object} Configurações do usuário ou padrões
   */
  async loadUserSettings() {
    try {
      const result = await chrome.storage.sync.get([this.storageKeys.SETTINGS]);
      const stored = result[this.storageKeys.SETTINGS];
      
      if (stored && stored.data) {
        // Mesclar com configurações padrão para garantir compatibilidade
        return {
          ...window.SICOSIConstants.DEFAULT_SETTINGS,
          ...stored.data
        };
      }
      
      return window.SICOSIConstants.DEFAULT_SETTINGS;
    } catch (error) {
      console.error('SICOSI Storage: Erro ao carregar configurações:', error);
      return window.SICOSIConstants.DEFAULT_SETTINGS;
    }
  }

  /**
   * Cache de alternativas sustentáveis encontradas
   * @param {string} keyword - Palavra-chave pesquisada
   * @param {Array} alternatives - Alternativas encontradas
   * @param {number} ttl - Time to live em milissegundos
   */
  async cacheAlternatives(keyword, alternatives, ttl = this.defaultExpiry) {
    try {
      const cacheKey = `alternatives_${keyword.toLowerCase().replace(/\s+/g, '_')}`;
      const cacheData = {
        data: alternatives,
        timestamp: Date.now(),
        expires: Date.now() + ttl
      };

      await chrome.storage.local.set({
        [cacheKey]: cacheData
      });

      console.log(`SICOSI Storage: Cache salvo para "${keyword}":`, alternatives.length, 'alternativas');
    } catch (error) {
      console.error('SICOSI Storage: Erro ao salvar cache:', error);
    }
  }

  /**
   * Recupera alternativas do cache
   * @param {string} keyword - Palavra-chave pesquisada
   * @returns {Array|null} Alternativas em cache ou null se expirado/inexistente
   */
  async getCachedAlternatives(keyword) {
    try {
      const cacheKey = `alternatives_${keyword.toLowerCase().replace(/\s+/g, '_')}`;
      const result = await chrome.storage.local.get([cacheKey]);
      const cached = result[cacheKey];

      if (cached && cached.expires > Date.now()) {
        console.log(`SICOSI Storage: Cache hit para "${keyword}"`);
        return cached.data;
      }

      if (cached) {
        // Cache expirado, remover
        await chrome.storage.local.remove([cacheKey]);
        console.log(`SICOSI Storage: Cache expirado removido para "${keyword}"`);
      }

      return null;
    } catch (error) {
      console.error('SICOSI Storage: Erro ao recuperar cache:', error);
      return null;
    }
  }

  /**
   * Salva estatísticas de uso
   * @param {Object} stats - Estatísticas a serem salvas
   */
  async saveStatistics(stats) {
    try {
      const current = await this.loadStatistics();
      const updated = {
        ...current,
        ...stats,
        lastUpdated: Date.now()
      };

      await chrome.storage.local.set({
        [this.storageKeys.STATISTICS]: updated
      });

      console.log('SICOSI Storage: Estatísticas atualizadas:', updated);
    } catch (error) {
      console.error('SICOSI Storage: Erro ao salvar estatísticas:', error);
    }
  }

  /**
   * Carrega estatísticas de uso
   * @returns {Object} Estatísticas de uso
   */
  async loadStatistics() {
    try {
      const result = await chrome.storage.local.get([this.storageKeys.STATISTICS]);
      return result[this.storageKeys.STATISTICS] || {
        modalShown: 0,
        alternativesSelected: 0,
        modalsDismissed: 0,
        searchesPerformed: 0,
        categoriesUsed: {},
        impactMetrics: {
          estimatedCO2Saved: 0,
          estimatedWasteSaved: 0
        },
        firstUse: Date.now(),
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('SICOSI Storage: Erro ao carregar estatísticas:', error);
      return {};
    }
  }

  /**
   * Registra evento de analytics
   * @param {string} event - Nome do evento
   * @param {string} details - Detalhes do evento
   * @param {Object} metadata - Metadados adicionais
   */
  async logAnalytics(event, details, metadata = {}) {
    try {
      const logEntry = {
        timestamp: Date.now(),
        event,
        details,
        metadata,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 200) // Limitado para privacidade
      };

      // Carregar logs existentes
      const result = await chrome.storage.local.get([window.SICOSIConstants.ANALYTICS_CONFIG.STORAGE_KEY]);
      const logs = result[window.SICOSIConstants.ANALYTICS_CONFIG.STORAGE_KEY] || [];
      
      // Adicionar novo log
      logs.push(logEntry);

      // Manter apenas os logs mais recentes
      const maxLogs = window.SICOSIConstants.ANALYTICS_CONFIG.MAX_LOGS;
      if (logs.length > maxLogs) {
        logs.splice(0, logs.length - maxLogs);
      }

      // Salvar logs atualizados
      await chrome.storage.local.set({
        [window.SICOSIConstants.ANALYTICS_CONFIG.STORAGE_KEY]: logs
      });

      // Atualizar estatísticas resumidas
      await this.updateStatisticsFromEvent(event, details, metadata);

      console.log('SICOSI Analytics:', logEntry);
    } catch (error) {
      console.error('SICOSI Storage: Erro ao salvar analytics:', error);
    }
  }

  /**
   * Atualiza estatísticas baseado em evento
   * @param {string} event - Nome do evento
   * @param {string} details - Detalhes do evento
   * @param {Object} metadata - Metadados do evento
   */
  async updateStatisticsFromEvent(event, details, metadata) {
    const current = await this.loadStatistics();
    const updated = { ...current };

    switch (event) {
      case window.SICOSIConstants.ANALYTICS_CONFIG.EVENTS.MODAL_SHOWN:
        updated.modalShown = (updated.modalShown || 0) + 1;
        break;
      
      case window.SICOSIConstants.ANALYTICS_CONFIG.EVENTS.ALTERNATIVE_SELECTED:
        updated.alternativesSelected = (updated.alternativesSelected || 0) + 1;
        
        // Calcular impacto estimado
        if (metadata.category) {
          const category = metadata.category.toLowerCase();
          updated.categoriesUsed = updated.categoriesUsed || {};
          updated.categoriesUsed[category] = (updated.categoriesUsed[category] || 0) + 1;
          
          // Estimar economia de CO2 e resíduos
          const impactData = window.SICOSIConstants.impact_calculator || {};
          if (impactData[category]) {
            updated.impactMetrics = updated.impactMetrics || {};
            updated.impactMetrics.estimatedCO2Saved = 
              (updated.impactMetrics.estimatedCO2Saved || 0) + 
              (impactData[category].co2_saved_per_unit || 0);
            updated.impactMetrics.estimatedWasteSaved = 
              (updated.impactMetrics.estimatedWasteSaved || 0) + 
              (impactData[category].waste_reduction_grams || 0);
          }
        }
        break;
      
      case window.SICOSIConstants.ANALYTICS_CONFIG.EVENTS.MODAL_DISMISSED:
        updated.modalsDismissed = (updated.modalsDismissed || 0) + 1;
        break;
      
      case window.SICOSIConstants.ANALYTICS_CONFIG.EVENTS.SEARCH_PERFORMED:
        updated.searchesPerformed = (updated.searchesPerformed || 0) + 1;
        break;
    }

    await this.saveStatistics(updated);
  }

  /**
   * Recupera logs de analytics
   * @param {number} limit - Número máximo de logs para retornar
   * @returns {Array} Array de logs
   */
  async getAnalyticsLogs(limit = 50) {
    try {
      const result = await chrome.storage.local.get([window.SICOSIConstants.ANALYTICS_CONFIG.STORAGE_KEY]);
      const logs = result[window.SICOSIConstants.ANALYTICS_CONFIG.STORAGE_KEY] || [];
      
      return logs.slice(-limit).reverse(); // Últimos logs, mais recentes primeiro
    } catch (error) {
      console.error('SICOSI Storage: Erro ao recuperar logs:', error);
      return [];
    }
  }

  /**
   * Limpa cache expirado
   */
  async clearExpiredCache() {
    try {
      const allKeys = await chrome.storage.local.get(null);
      const keysToRemove = [];
      const now = Date.now();

      Object.keys(allKeys).forEach(key => {
        if (key.startsWith('alternatives_')) {
          const data = allKeys[key];
          if (data && data.expires && data.expires < now) {
            keysToRemove.push(key);
          }
        }
      });

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`SICOSI Storage: ${keysToRemove.length} caches expirados removidos`);
      }
    } catch (error) {
      console.error('SICOSI Storage: Erro ao limpar cache:', error);
    }
  }

  /**
   * Exporta dados para backup
   * @returns {Object} Todos os dados da extensão
   */
  async exportData() {
    try {
      const [syncData, localData] = await Promise.all([
        chrome.storage.sync.get(null),
        chrome.storage.local.get(null)
      ]);

      return {
        sync: syncData,
        local: localData,
        exportDate: Date.now(),
        version: chrome.runtime.getManifest().version
      };
    } catch (error) {
      console.error('SICOSI Storage: Erro ao exportar dados:', error);
      throw error;
    }
  }

  /**
   * Importa dados de backup
   * @param {Object} backupData - Dados de backup
   */
  async importData(backupData) {
    try {
      if (backupData.sync) {
        await chrome.storage.sync.clear();
        await chrome.storage.sync.set(backupData.sync);
      }

      if (backupData.local) {
        await chrome.storage.local.clear();
        await chrome.storage.local.set(backupData.local);
      }

      console.log('SICOSI Storage: Dados importados com sucesso');
    } catch (error) {
      console.error('SICOSI Storage: Erro ao importar dados:', error);
      throw error;
    }
  }

  /**
   * Limpa todos os dados da extensão
   */
  async clearAllData() {
    try {
      await Promise.all([
        chrome.storage.sync.clear(),
        chrome.storage.local.clear()
      ]);
      console.log('SICOSI Storage: Todos os dados foram limpos');
    } catch (error) {
      console.error('SICOSI Storage: Erro ao limpar dados:', error);
      throw error;
    }
  }

  /**
   * Obtém uso de storage
   * @returns {Object} Informações sobre uso de storage
   */
  async getStorageUsage() {
    try {
      const [syncUsage, localUsage] = await Promise.all([
        chrome.storage.sync.getBytesInUse(),
        chrome.storage.local.getBytesInUse()
      ]);

      return {
        sync: {
          used: syncUsage,
          quota: chrome.storage.sync.QUOTA_BYTES,
          percentage: Math.round((syncUsage / chrome.storage.sync.QUOTA_BYTES) * 100)
        },
        local: {
          used: localUsage,
          quota: chrome.storage.local.QUOTA_BYTES,
          percentage: Math.round((localUsage / chrome.storage.local.QUOTA_BYTES) * 100)
        }
      };
    } catch (error) {
      console.error('SICOSI Storage: Erro ao obter uso de storage:', error);
      return null;
    }
  }
}

// Tornar disponível globalmente
window.SICOSIStorage = new StorageManager();

// Limpar cache expirado a cada hora
setInterval(() => {
  window.SICOSIStorage.clearExpiredCache();
}, 60 * 60 * 1000);