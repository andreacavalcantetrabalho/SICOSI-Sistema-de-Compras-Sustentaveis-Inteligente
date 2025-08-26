/**
 * Web Search - SICOSI Sustentável
 * Busca alternativas sustentáveis em fontes externas quando não encontradas no catálogo
 */

class WebSearchManager {
  constructor() {
    this.searchCache = new Map();
    this.requestsInProgress = new Set();
    this.rateLimitDelay = 1000; // 1 segundo entre requisições
    this.lastRequestTime = 0;
  }

  /**
   * Busca alternativas sustentáveis na web
   * @param {string} originalProduct - Produto original não-sustentável
   * @param {string} category - Categoria do produto
   * @returns {Promise<Array>} Array de alternativas encontradas
   */
  async searchSustainableAlternatives(originalProduct, category) {
    const cacheKey = `${originalProduct}_${category}`;
    
    // Verificar cache primeiro
    const cached = await this.getCachedResults(cacheKey);
    if (cached) {
      return cached;
    }

    // Evitar requisições duplicadas
    if (this.requestsInProgress.has(cacheKey)) {
      await this.waitForRequest(cacheKey);
      return this.getCachedResults(cacheKey) || [];
    }

    this.requestsInProgress.add(cacheKey);

    try {
      // Gerar termos de busca otimizados
      const searchTerms = this.generateSearchTerms(originalProduct, category);
      
      // Executar buscas paralelas em múltiplas fontes
      const searchPromises = searchTerms.map(term => 
        this.performWebSearch(term, category)
      );

      const searchResults = await Promise.allSettled(searchPromises);
      
      // Processar e filtrar resultados
      const alternatives = this.processSearchResults(searchResults, originalProduct, category);
      
      // Armazenar no cache
      await this.cacheResults(cacheKey, alternatives);
      
      return alternatives;

    } catch (error) {
      console.error('Web Search: Erro na busca externa:', error);
      return [];
    } finally {
      this.requestsInProgress.delete(cacheKey);
    }
  }

  /**
   * Gera termos de busca otimizados
   * @param {string} originalProduct - Produto original
   * @param {string} category - Categoria do produto
   * @returns {Array} Array de termos de busca
   */
  generateSearchTerms(originalProduct, category) {
    const baseTerms = this.extractKeywords(originalProduct);
    const sustainableModifiers = this.getSustainableModifiers(category);
    
    const searchTerms = [];
    
    // Combinações de termo base + modificador sustentável
    baseTerms.forEach(baseTerm => {
      sustainableModifiers.forEach(modifier => {
        searchTerms.push(`${baseTerm} ${modifier} fornecedor brasil`);
        searchTerms.push(`${modifier} ${baseTerm} comprar`);
      });
    });

    // Termos específicos por categoria
    const categoryTerms = this.getCategorySpecificTerms(category);
    searchTerms.push(...categoryTerms);

    return searchTerms.slice(0, 5); // Limitar número de buscas
  }

  /**
   * Extrai palavras-chave do produto original
   * @param {string} product - Descrição do produto
   * @returns {Array} Palavras-chave principais
   */
  extractKeywords(product) {
    const words = product.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Remover palavras muito comuns
    const stopWords = ['descartavel', 'comum', 'tradicional', 'normal', 'padrao'];
    const keywords = words.filter(word => !stopWords.includes(word));

    // Manter apenas palavras mais relevantes
    return keywords.slice(0, 3);
  }

  /**
   * Obtém modificadores sustentáveis por categoria
   * @param {string} category - Categoria do produto
   * @returns {Array} Modificadores sustentáveis
   */
  getSustainableModifiers(category) {
    const modifiersByCategory = {
      descartaveis: ['biodegradavel', 'compostavel', 'ecologico', 'sustentavel'],
      papel: ['reciclado', 'FSC', 'certificado', 'sustentavel'],
      limpeza: ['biodegradavel', 'ecologico', 'natural', 'verde'],
      equipamentos: ['energy star', 'eficiente', 'certificado', 'sustentavel'],
      embalagens: ['biodegradavel', 'reciclavel', 'kraft', 'ecologico']
    };

    return modifiersByCategory[category] || ['sustentavel', 'ecologico', 'verde'];
  }

  /**
   * Obtém termos específicos por categoria
   * @param {string} category - Categoria do produto
   * @returns {Array} Termos específicos
   */
  getCategorySpecificTerms(category) {
    const termsByCategory = {
      descartaveis: [
        'produtos biodegradaveis brasil fornecedor',
        'embalagens compostaveis distribuidora',
        'descartaveis ecologicos atacado'
      ],
      papel: [
        'papel reciclado FSC brasil',
        'papel certificado fornecedor sustentavel',
        'papel ecologico distribuidora'
      ],
      limpeza: [
        'produtos limpeza biodegradaveis',
        'detergentes ecologicos brasil',
        'limpeza sustentavel fornecedor'
      ],
      equipamentos: [
        'equipamentos energy star brasil',
        'tecnologia sustentavel fornecedor',
        'equipamentos certificados ecologicos'
      ]
    };

    return termsByCategory[category] || [];
  }

  /**
   * Executa busca na web usando API simulada
   * @param {string} searchTerm - Termo de busca
   * @param {string} category - Categoria do produto
   * @returns {Promise<Object>} Resultados da busca
   */
  async performWebSearch(searchTerm, category) {
    // Rate limiting
    await this.enforceRateLimit();

    try {
      // Simular busca em diferentes fontes
      const sources = [
        this.searchMercadoLivre(searchTerm),
        this.searchGoogleShopping(searchTerm),
        this.searchSupplierDirectories(searchTerm, category)
      ];

      const results = await Promise.race(sources); // Usar o primeiro que responder
      return {
        searchTerm,
        results: results || [],
        source: 'web_search',
        timestamp: Date.now()
      };

    } catch (error) {
      console.warn(`Web Search: Falha na busca para "${searchTerm}":`, error);
      return {
        searchTerm,
        results: [],
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Busca no Mercado Livre (simulado)
   * @param {string} searchTerm - Termo de busca
   * @returns {Promise<Array>} Resultados encontrados
   */
  async searchMercadoLivre(searchTerm) {
    // Simulação de busca no Mercado Livre
    // Em implementação real, usaria API do ML ou web scraping
    
    const mockResults = [
      {
        title: `${searchTerm} - Produto Sustentável`,
        supplier: 'EcoFornecedor LTDA',
        price: 'R$ 25,00',
        description: 'Produto eco-friendly certificado',
        url: '#',
        certifications: ['FSC', 'ISO 14001'],
        rating: 4.5,
        source: 'mercadolivre'
      }
    ];

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    return mockResults;
  }

  /**
   * Busca no Google Shopping (simulado)
   * @param {string} searchTerm - Termo de busca
   * @returns {Promise<Array>} Resultados encontrados
   */
  async searchGoogleShopping(searchTerm) {
    // Simulação - em implementação real usaria Custom Search API
    const mockResults = [
      {
        title: `${searchTerm} Certificado`,
        supplier: 'GreenSupply Brasil',
        price: 'R$ 32,00',
        description: 'Alternativa sustentável com certificação',
        url: '#',
        certifications: ['ABNT', 'Ecolabel'],
        rating: 4.8,
        source: 'google_shopping'
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
    
    return mockResults;
  }

  /**
   * Busca em diretórios de fornecedores sustentáveis
   * @param {string} searchTerm - Termo de busca
   * @param {string} category - Categoria do produto
   * @returns {Promise<Array>} Resultados encontrados
   */
  async searchSupplierDirectories(searchTerm, category) {
    // Base de fornecedores sustentáveis conhecidos
    const supplierDatabase = await this.getVerifiedSuppliers(category);
    
    const results = supplierDatabase
      .filter(supplier => 
        supplier.specialty.toLowerCase().includes(category) ||
        supplier.products.some(product => 
          product.toLowerCase().includes(searchTerm.split(' ')[0])
        )
      )
      .map(supplier => ({
        title: `${searchTerm} - ${supplier.name}`,
        supplier: supplier.name,
        price: 'Consultar',
        description: supplier.description,
        url: supplier.website,
        certifications: supplier.certifications,
        rating: supplier.rating,
        source: 'supplier_directory'
      }));

    await new Promise(resolve => setTimeout(resolve, 200));
    
    return results;
  }

  /**
   * Obtém fornecedores verificados por categoria
   * @param {string} category - Categoria do produto
   * @returns {Promise<Array>} Lista de fornecedores
   */
  async getVerifiedSuppliers(category) {
    // Base de fornecedores sustentáveis verificados
    const suppliers = [
      {
        name: 'EcoSupplies Brasil',
        specialty: 'descartaveis',
        products: ['copo biodegradavel', 'prato compostavel', 'talher bambu'],
        certifications: ['ISO 14001', 'FSC'],
        website: 'https://ecosupplies.com.br',
        rating: 4.7,
        description: 'Especialista em produtos descartáveis biodegradáveis'
      },
      {
        name: 'Papel Verde Reciclados',
        specialty: 'papel',
        products: ['papel reciclado', 'papel FSC', 'cartao sustentavel'],
        certifications: ['FSC', 'PEFC'],
        website: 'https://papelverde.com.br',
        rating: 4.5,
        description: 'Papéis reciclados e certificados para escritório'
      },
      {
        name: 'CleanGreen Produtos',
        specialty: 'limpeza',
        products: ['detergente biodegradavel', 'sabao ecologico', 'desinfetante natural'],
        certifications: ['IBAMA', 'Ecolabel'],
        website: 'https://cleangreen.com.br',
        rating: 4.6,
        description: 'Produtos de limpeza ecológicos e biodegradáveis'
      },
      {
        name: 'TecnoVerde Equipamentos',
        specialty: 'equipamentos',
        products: ['impressora energy star', 'computador eficiente', 'monitor certificado'],
        certifications: ['Energy Star', 'EPEAT'],
        website: 'https://tecnoverde.com.br',
        rating: 4.4,
        description: 'Equipamentos de tecnologia com certificação ambiental'
      }
    ];

    return suppliers.filter(supplier => 
      supplier.specialty === category || category === 'all'
    );
  }

  /**
   * Processa resultados de busca e filtra por relevância
   * @param {Array} searchResults - Resultados das buscas
   * @param {string} originalProduct - Produto original
   * @param {string} category - Categoria do produto
   * @returns {Array} Alternativas processadas e filtradas
   */
  processSearchResults(searchResults, originalProduct, category) {
    const allResults = [];

    searchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.results) {
        allResults.push(...result.value.results);
      }
    });

    // Filtrar e pontuar por relevância
    const scoredResults = allResults.map(result => ({
      ...result,
      relevanceScore: this.calculateWebRelevanceScore(result, originalProduct, category)
    }));

    // Filtrar por score mínimo e ordenar
    const filteredResults = scoredResults
      .filter(result => result.relevanceScore > 0.3)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8); // Limitar a 8 melhores resultados

    return filteredResults;
  }

  /**
   * Calcula score de relevância para resultados web
   * @param {Object} result - Resultado da busca
   * @param {string} originalProduct - Produto original
   * @param {string} category - Categoria
   * @returns {number} Score de relevância (0-1)
   */
  calculateWebRelevanceScore(result, originalProduct, category) {
    let score = 0;

    // Score baseado no título
    const titleWords = result.title.toLowerCase().split(/\s+/);
    const productWords = originalProduct.toLowerCase().split(/\s+/);
    const commonWords = titleWords.filter(word => productWords.includes(word));
    score += (commonWords.length / Math.max(titleWords.length, productWords.length)) * 0.4;

    // Score por certificações
    if (result.certifications && result.certifications.length > 0) {
      score += 0.3;
    }

    // Score por rating do fornecedor
    if (result.rating) {
      score += (result.rating / 5) * 0.2;
    }

    // Score por fonte confiável
    const reliableSources = ['supplier_directory', 'verified_supplier'];
    if (reliableSources.includes(result.source)) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Aplica rate limiting entre requisições
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Aguarda requisição em progresso terminar
   * @param {string} cacheKey - Chave da requisição
   */
  async waitForRequest(cacheKey) {
    while (this.requestsInProgress.has(cacheKey)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Obtém resultados do cache
   * @param {string} cacheKey - Chave do cache
   * @returns {Promise<Array|null>} Resultados em cache ou null
   */
  async getCachedResults(cacheKey) {
    try {
      const cached = await window.SICOSIStorage.getCachedAlternatives(cacheKey);
      return cached;
    } catch (error) {
      return null;
    }
  }

  /**
   * Armazena resultados no cache
   * @param {string} cacheKey - Chave do cache
   * @param {Array} results - Resultados para armazenar
   */
  async cacheResults(cacheKey, results) {
    try {
      await window.SICOSIStorage.cacheAlternatives(cacheKey, results, 3600000); // 1 hora
    } catch (error) {
      console.warn('Web Search: Erro ao armazenar cache:', error);
    }
  }

  /**
   * Limpa cache de buscas
   */
  clearCache() {
    this.searchCache.clear();
  }

  /**
   * Obtém estatísticas das buscas
   * @returns {Object} Estatísticas
   */
  getStatistics() {
    return {
      cacheSize: this.searchCache.size,
      requestsInProgress: this.requestsInProgress.size,
      lastRequestTime: this.lastRequestTime
    };
  }
}

// Tornar disponível globalmente
window.SICOSIWebSearch = new WebSearchManager();