// utils/web-search.js (COMPLETAMENTE LIMPO)
class WebSearchManager {
  constructor() {
    this.searchCache = new Map();
    this.rateLimitDelay = 1000;
    this.lastRequestTime = 0;
  }

  /**
   * Busca alternativas sustentáveis via IA
   */
  async searchSustainableAlternatives(originalProduct, category) {
    const cacheKey = `${originalProduct}_${category}`;
    
    // Verificar cache
    const cached = await this.getCachedResults(cacheKey);
    if (cached) {
      console.log('🔍 Usando cache para:', originalProduct);
      return cached;
    }

    // Rate limiting
    await this.enforceRateLimit();

    // Gerar termos otimizados
    const searchTerms = window.SICOSISearchHelpers.generateSearchTerms(
      originalProduct, 
      category
    );
    
    // Pedir para IA buscar produtos REAIS
    const alternatives = await this.askAIForRealAlternatives(
      originalProduct,
      searchTerms,
      category
    );
    
    // Cachear resultados válidos
    if (alternatives && alternatives.length > 0) {
      await this.cacheResults(cacheKey, alternatives);
    }
    
    return alternatives || [];
  }

  /**
   * Integração com IA para buscar produtos reais
   */
  async askAIForRealAlternatives(product, searchTerms, category) {
    if (!window.SICOSILLMAnalyzer) {
      console.warn('LLM Analyzer não disponível');
      return [];
    }
    
    try {
      // Chamar IA com prompt específico para produtos REAIS
      const response = await window.SICOSILLMAnalyzer.findWebAlternatives({
        product,
        searchTerms,
        category,
        requestType: 'find_real_web_alternatives'
      });
      
      // Filtrar e validar resultados
      return this.validateAIResults(response);
      
    } catch (error) {
      console.error('Erro ao buscar com IA:', error);
      return [];
    }
  }

  /**
   * Valida resultados da IA (remove qualquer coisa que pareça mock)
   */
  validateAIResults(results) {
    if (!Array.isArray(results)) return [];
    
    return results.filter(item => {
      // Rejeitar se parecer mock/fake
      if (!item.productName || !item.supplier) return false;
      
      // Rejeitar URLs falsas
      if (item.website && !item.website.startsWith('http')) return false;
      
      // Aceitar apenas com informações mínimas
      return true;
    });
  }

  /**
   * Sistema de cache usando storage-manager
   */
  async getCachedResults(cacheKey) {
    if (!window.SICOSIStorage) return null;
    return await window.SICOSIStorage.getCachedAlternatives(cacheKey);
  }

  async cacheResults(cacheKey, results) {
    if (!window.SICOSIStorage) return;
    // Cache por 30 minutos
    await window.SICOSIStorage.cacheAlternatives(cacheKey, results, 30 * 60 * 1000);
  }

  /**
   * Rate limiting para não sobrecarregar
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await window.SICOSISearchHelpers.delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Limpa cache
   */
  clearCache() {
    this.searchCache.clear();
  }
}

// Tornar disponível globalmente
window.SICOSIWebSearch = new WebSearchManager();