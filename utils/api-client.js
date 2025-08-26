/**
 * API Client - SICOSI
 * Cliente para comunicação com APIs externas e serviços de busca
 */

class APIClient {
  constructor() {
    this.baseURLs = window.SICOSIConstants.EXTERNAL_SEARCH_APIS;
    this.rateLimiter = new Map();
    this.requestCache = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Busca externa por alternativas sustentáveis
   * @param {string} query - Termo de busca
   * @param {string} category - Categoria do produto
   * @returns {Promise<Array>} Resultados da busca
   */
  async searchExternalAlternatives(query, category) {
    const cacheKey = `${query}_${category}`;
    
    // Verificar cache primeiro
    if (this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutos
        return cached.data;
      }
    }

    try {
      // Executar buscas paralelas
      const searchPromises = [
        this.searchMercadoLivre(query, category),
        this.searchGoogleShopping(query, category),
        this.searchSupplierDirectories(query, category)
      ];

      const results = await Promise.allSettled(searchPromises);
      
      // Processar resultados
      const alternatives = this.processSearchResults(results, query, category);
      
      // Armazenar no cache
      this.requestCache.set(cacheKey, {
        data: alternatives,
        timestamp: Date.now()
      });

      return alternatives;

    } catch (error) {
      console.error('API Client: Erro na busca externa:', error);
      return [];
    }
  }

  /**
   * Busca no Mercado Livre
   * @param {string} query - Termo de busca
   * @param {string} category - Categoria do produto
   * @returns {Promise<Array>} Resultados do ML
   */
  async searchMercadoLivre(query, category) {
    try {
      await this.enforceRateLimit('mercadolivre');

      // Construir query otimizada para ML
      const searchQuery = this.buildOptimizedQuery(query, category, 'mercadolivre');
      
      // Simular API do Mercado Livre (na implementação real, usar API oficial)
      const mockResults = this.generateMockMLResults(searchQuery, category);
      
      // Adicionar delay realístico
      await this.delay(500 + Math.random() * 1000);
      
      return mockResults.map(result => ({
        ...result,
        source: 'mercadolivre',
        relevanceScore: this.calculateRelevanceScore(result.title, query),
        sustainabilityScore: this.calculateSustainabilityScore(result.title, result.description)
      }));

    } catch (error) {
      console.warn('API Client: Erro no Mercado Livre:', error);
      return [];
    }
  }

  /**
   * Busca no Google Shopping
   * @param {string} query - Termo de busca
   * @param {string} category - Categoria do produto
   * @returns {Promise<Array>} Resultados do Google Shopping
   */
  async searchGoogleShopping(query, category) {
    try {
      await this.enforceRateLimit('google');

      // Em implementação real, usar Google Custom Search API
      const searchQuery = this.buildOptimizedQuery(query, category, 'google');
      
      const mockResults = this.generateMockGoogleResults(searchQuery, category);
      
      await this.delay(300 + Math.random() * 700);
      
      return mockResults.map(result => ({
        ...result,
        source: 'google_shopping',
        relevanceScore: this.calculateRelevanceScore(result.title, query),
        sustainabilityScore: this.calculateSustainabilityScore(result.title, result.description)
      }));

    } catch (error) {
      console.warn('API Client: Erro no Google Shopping:', error);
      return [];
    }
  }

  /**
   * Busca em diretórios de fornecedores
   * @param {string} query - Termo de busca  
   * @param {string} category - Categoria do produto
   * @returns {Promise<Array>} Resultados dos diretórios
   */
  async searchSupplierDirectories(query, category) {
    try {
      const suppliers = await this.getVerifiedSuppliers(category);
      
      const matchingSuppliers = suppliers.filter(supplier => {
        const searchTerms = query.toLowerCase().split(' ');
        const supplierText = `${supplier.name} ${supplier.description} ${supplier.products.join(' ')}`.toLowerCase();
        
        return searchTerms.some(term => supplierText.includes(term));
      });

      await this.delay(200);

      return matchingSuppliers.map(supplier => ({
        title: `${query} - ${supplier.name}`,
        description: supplier.description,
        price: supplier.priceRange || 'Consultar',
        supplier: supplier.name,
        website: supplier.website,
        certifications: supplier.certifications,
        rating: supplier.rating,
        verified: true,
        source: 'supplier_directory',
        relevanceScore: this.calculateRelevanceScore(supplier.name + ' ' + supplier.description, query),
        sustainabilityScore: supplier.sustainabilityRating || 0.8
      }));

    } catch (error) {
      console.warn('API Client: Erro nos diretórios:', error);
      return [];
    }
  }

  /**
   * Constrói query otimizada para cada fonte
   * @param {string} query - Query original
   * @param {string} category - Categoria
   * @param {string} source - Fonte da busca
   * @returns {string} Query otimizada
   */
  buildOptimizedQuery(query, category, source) {
    const sustainableModifiers = this.getSustainableModifiersForCategory(category);
    const baseTerms = this.extractKeywords(query);
    
    let optimizedQuery = '';
    
    switch (source) {
      case 'mercadolivre':
        // ML responde bem a termos específicos
        optimizedQuery = `${baseTerms[0]} ${sustainableModifiers[0]} Brasil`;
        break;
        
      case 'google':
        // Google prefere queries mais naturais
        optimizedQuery = `${query} ${sustainableModifiers.slice(0, 2).join(' ')} fornecedor sustentável`;
        break;
        
      default:
        optimizedQuery = `${query} ${sustainableModifiers[0]}`;
    }
    
    return optimizedQuery.trim();
  }

  /**
   * Obtém fornecedores verificados por categoria
   * @param {string} category - Categoria do produto
   * @returns {Promise<Array>} Lista de fornecedores
   */
  async getVerifiedSuppliers(category) {
    const supplierDatabase = {
      descartaveis: [
        {
          name: 'EcoSupplies Brasil',
          description: 'Especialista em produtos descartáveis biodegradáveis e compostáveis',
          products: ['copo biodegradável', 'prato compostável', 'talher bambu', 'canudo papel'],
          certifications: ['ISO 14001', 'FSC', 'BPI'],
          website: 'https://ecosupplies.com.br',
          rating: 4.7,
          sustainabilityRating: 0.9,
          priceRange: 'R$ 0,25 - R$ 1,50/un',
          location: 'São Paulo, SP'
        },
        {
          name: 'Verde Descartáveis',
          description: 'Produtos descartáveis ecológicos para eventos e alimentação',
          products: ['copo papel kraft', 'embalagem bagaço cana', 'guardanapo reciclado'],
          certifications: ['ABNT', 'Ecolabel'],
          website: 'https://verdedescartaveis.com.br',
          rating: 4.5,
          sustainabilityRating: 0.85,
          priceRange: 'R$ 0,20 - R$ 1,20/un',
          location: 'Rio de Janeiro, RJ'
        }
      ],
      papel: [
        {
          name: 'Papel Verde Reciclados',
          description: 'Papéis reciclados e certificados para escritório e impressão',
          products: ['papel a4 reciclado', 'papel fsc certificado', 'envelope reciclado'],
          certifications: ['FSC', 'PEFC', 'CERFLOR'],
          website: 'https://papelverde.com.br',
          rating: 4.6,
          sustainabilityRating: 0.88,
          priceRange: 'R$ 15,00 - R$ 25,00/resma',
          location: 'Curitiba, PR'
        },
        {
          name: 'Sustenta Papel',
          description: 'Produtos de papel sustentável para empresas e governo',
          products: ['papel reciclado', 'cartão certificado', 'bloco ecológico'],
          certifications: ['FSC', 'ISO 14001'],
          website: 'https://sustentapapel.com.br',
          rating: 4.4,
          sustainabilityRating: 0.82,
          priceRange: 'R$ 18,00 - R$ 28,00/resma',
          location: 'Belo Horizonte, MG'
        }
      ],
      limpeza: [
        {
          name: 'CleanGreen Produtos',
          description: 'Produtos de limpeza biodegradáveis e ecológicos',
          products: ['detergente biodegradável', 'sabão natural', 'desinfetante enzimático'],
          certifications: ['IBAMA', 'Ecolabel', 'Cradle to Cradle'],
          website: 'https://cleangreen.com.br',
          rating: 4.8,
          sustainabilityRating: 0.92,
          priceRange: 'R$ 8,00 - R$ 35,00/L',
          location: 'Porto Alegre, RS'
        },
        {
          name: 'Bio Limpeza Natural',
          description: 'Linha completa de produtos de limpeza naturais e concentrados',
          products: ['multiuso concentrado', 'sabão coco', 'alvejante natural'],
          certifications: ['IBAMA', 'Orgânico Brasil'],
          website: 'https://biolimpeza.com.br',
          rating: 4.3,
          sustainabilityRating: 0.87,
          priceRange: 'R$ 12,00 - R$ 28,00/L',
          location: 'Brasília, DF'
        }
      ],
      equipamentos: [
        {
          name: 'TecnoVerde Equipamentos',
          description: 'Equipamentos de tecnologia com certificação ambiental',
          products: ['impressora energy star', 'computador epeat', 'monitor eficiente'],
          certifications: ['Energy Star', 'EPEAT Gold', 'RoHS'],
          website: 'https://tecnoverde.com.br',
          rating: 4.2,
          sustainabilityRating: 0.75,
          priceRange: 'R$ 800,00 - R$ 8.000,00',
          location: 'São Paulo, SP'
        }
      ],
      embalagens: [
        {
          name: 'EcoEmbalagens Brasil',
          description: 'Embalagens sustentáveis e biodegradáveis para diversos segmentos',
          products: ['saco biodegradável', 'embalagem kraft', 'filme compostável'],
          certifications: ['ASTM D6400', 'EN 13432'],
          website: 'https://ecoembalagens.com.br',
          rating: 4.6,
          sustainabilityRating: 0.89,
          priceRange: 'R$ 0,15 - R$ 2,50/un',
          location: 'Salvador, BA'
        }
      ]
    };

    return supplierDatabase[category] || [];
  }

  /**
   * Processa resultados de múltiplas fontes
   * @param {Array} results - Resultados das buscas
   * @param {string} query - Query original
   * @param {string} category - Categoria
   * @returns {Array} Resultados processados
   */
  processSearchResults(results, query, category) {
    const allResults = [];

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        allResults.push(...result.value);
      }
    });

    // Filtrar por relevância mínima
    const filteredResults = allResults.filter(result => 
      result.relevanceScore > 0.3 && result.sustainabilityScore > 0.4
    );

    // Ordenar por score combinado
    filteredResults.sort((a, b) => {
      const scoreA = (a.relevanceScore * 0.7) + (a.sustainabilityScore * 0.3);
      const scoreB = (b.relevanceScore * 0.7) + (b.sustainabilityScore * 0.3);
      return scoreB - scoreA;
    });

    // Limitar resultados e remover duplicatas
    return this.removeDuplicates(filteredResults).slice(0, 8);
  }

  /**
   * Calcula score de relevância
   * @param {string} title - Título do resultado
   * @param {string} query - Query original
   * @returns {number} Score de 0 a 1
   */
  calculateRelevanceScore(title, query) {
    const titleWords = title.toLowerCase().split(/\s+/);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let matches = 0;
    queryWords.forEach(qWord => {
      if (titleWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
        matches++;
      }
    });

    const baseScore = matches / queryWords.length;
    
    // Boost para termos exatos
    const exactMatches = queryWords.filter(qWord => 
      titleWords.some(tWord => tWord === qWord)
    ).length;
    
    const exactBoost = exactMatches * 0.2;
    
    return Math.min(baseScore + exactBoost, 1.0);
  }

  /**
   * Calcula score de sustentabilidade
   * @param {string} title - Título
   * @param {string} description - Descrição
   * @returns {number} Score de 0 a 1
   */
  calculateSustainabilityScore(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const sustainableTerms = [
      'biodegradável', 'reciclável', 'reciclado', 'sustentável', 'ecológico',
      'fsc', 'energy star', 'epeat', 'certificado', 'verde', 'natural',
      'compostável', 'renovável', 'orgânico', 'bambu', 'bagaço'
    ];

    let score = 0;
    sustainableTerms.forEach(term => {
      if (text.includes(term)) {
        score += 0.1;
      }
    });

    // Penalizar termos não-sustentáveis
    const unsustainableTerms = ['descartável', 'comum', 'tradicional', 'barato'];
    unsustainableTerms.forEach(term => {
      if (text.includes(term)) {
        score -= 0.05;
      }
    });

    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * Gera resultados mock do Mercado Livre
   * @param {string} query - Query de busca
   * @param {string} category - Categoria
   * @returns {Array} Resultados mock
   */
  generateMockMLResults(query, category) {
    const baseTemplates = {
      descartaveis: [
        {
          title: `${query} Biodegradável Kit 100un`,
          description: 'Kit ecológico biodegradável, ideal para eventos sustentáveis',
          price: 'R$ 45,90',
          shipping: 'Frete grátis',
          seller: 'EcoLoja Sustentável',
          rating: 4.7
        },
        {
          title: `${query} Compostável Premium`,
          description: 'Produto compostável certificado, decompõe em 90 dias',
          price: 'R$ 38,50',
          shipping: 'R$ 12,99',
          seller: 'Verde Produtos',
          rating: 4.5
        }
      ],
      papel: [
        {
          title: `${query} FSC Certificado 5 Resmas`,
          description: 'Papel certificado FSC, alta qualidade para impressão',
          price: 'R$ 89,90',
          shipping: 'Frete grátis',
          seller: 'Papel Sustentável',
          rating: 4.6
        }
      ]
    };

    return baseTemplates[category] || [];
  }

  /**
   * Gera resultados mock do Google Shopping
   * @param {string} query - Query de busca
   * @param {string} category - Categoria
   * @returns {Array} Resultados mock
   */
  generateMockGoogleResults(query, category) {
    return [
      {
        title: `${query} Sustentável - Loja Especializada`,
        description: 'Encontre produtos sustentáveis certificados com entrega para todo Brasil',
        price: 'A partir de R$ 25,00',
        website: 'sustentavel.com.br',
        rating: 4.4
      }
    ];
  }

  /**
   * Obtém modificadores sustentáveis por categoria
   * @param {string} category - Categoria
   * @returns {Array} Lista de modificadores
   */
  getSustainableModifiersForCategory(category) {
    const modifiers = {
      descartaveis: ['biodegradável', 'compostável', 'bambu', 'bagaço'],
      papel: ['reciclado', 'FSC', 'certificado', 'sustentável'],
      limpeza: ['biodegradável', 'natural', 'enzimático', 'concentrado'],
      equipamentos: ['energy star', 'epeat', 'eficiente', 'certificado'],
      embalagens: ['kraft', 'biodegradável', 'compostável', 'reciclável']
    };

    return modifiers[category] || ['sustentável', 'ecológico'];
  }

  /**
   * Extrai palavras-chave principais
   * @param {string} query - Query original
   * @returns {Array} Palavras-chave
   */
  extractKeywords(query) {
    const stopWords = ['de', 'da', 'do', 'para', 'com', 'em', 'a', 'o'];
    return query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3);
  }

  /**
   * Remove duplicatas baseado no título
   * @param {Array} results - Resultados
   * @returns {Array} Resultados sem duplicatas
   */
  removeDuplicates(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = result.title.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Aplica rate limiting por fonte
   * @param {string} source - Fonte da API
   */
  async enforceRateLimit(source) {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get(source) || 0;
    const delay = 1000; // 1 segundo entre requisições

    if (now - lastRequest < delay) {
      await this.delay(delay - (now - lastRequest));
    }

    this.rateLimiter.set(source, Date.now());
  }

  /**
   * Utilitário de delay
   * @param {number} ms - Milissegundos
   * @returns {Promise} Promise que resolve após o delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpa cache de requisições
   */
  clearCache() {
    this.requestCache.clear();
  }

  /**
   * Obtém estatísticas do cliente
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      cacheSize: this.requestCache.size,
      rateLimiterEntries: this.rateLimiter.size
    };
  }
}

// Tornar disponível globalmente
window.SICOSIAPIClient = new APIClient();