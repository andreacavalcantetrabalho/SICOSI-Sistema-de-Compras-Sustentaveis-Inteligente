/**
 * Catalog Analyzer - Nudge Sustentável
 * Analisa o catálogo do ComprasNet para encontrar alternativas sustentáveis
 */

class CatalogAnalyzer {
  constructor() {
    this.currentSearchResults = [];
    this.sustainableDatabase = null;
    this.searchCache = new Map();
    this.isAnalyzing = false;
  }

  /**
   * Inicializa o analisador carregando a base de dados
   */
  async initialize() {
    try {
      // Carregar base de dados de alternativas sustentáveis
      const response = await fetch(chrome.runtime.getURL('database/sustainable-alternatives.json'));
      this.sustainableDatabase = await response.json();
      console.log('Catalog Analyzer: Base de dados carregada');
    } catch (error) {
      console.error('Catalog Analyzer: Erro ao carregar base de dados:', error);
      // Fallback para constantes se não conseguir carregar o arquivo
      this.sustainableDatabase = {
        categories: window.NudgeConstants?.SUSTAINABLE_ALTERNATIVES || {}
      };
    }
  }

  /**
   * Analisa item selecionado e busca alternativas no catálogo atual
   * @param {string} itemDescription - Descrição do item selecionado
   * @param {Element} resultsContainer - Container com resultados atuais
   * @returns {Promise<Array>} Array de alternativas encontradas
   */
  async analyzeItemAndFindAlternatives(itemDescription, resultsContainer = null) {
    if (this.isAnalyzing) return [];
    
    this.isAnalyzing = true;
    
    try {
      // Extrair resultados atuais se não fornecidos
      if (!resultsContainer) {
        resultsContainer = this.findResultsContainer();
      }

      // Extrair dados dos resultados atuais
      this.currentSearchResults = this.extractSearchResults(resultsContainer);

      // Identificar tipo de produto e alternativas possíveis
      const productAnalysis = this.analyzeProductType(itemDescription);
      
      if (!productAnalysis.isSustainable) {
        // Buscar alternativas na lista atual
        const catalogAlternatives = this.findAlternativesInCurrentResults(productAnalysis);
        
        // Se não encontrou na lista atual, sugerir termos de busca
        const searchSuggestions = this.generateSearchTerms(productAnalysis);
        
        return {
          catalogAlternatives,
          searchSuggestions,
          analysis: productAnalysis
        };
      }

      return {
        catalogAlternatives: [],
        searchSuggestions: [],
        analysis: productAnalysis
      };

    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Encontra container com resultados da busca
   * @returns {Element|null} Container dos resultados
   */
  findResultsContainer() {
    const selectors = [
      'table tbody',
      '.results-table tbody',
      '.search-results',
      '[class*="result"]',
      '.ng-star-inserted table tbody'
    ];

    return window.NudgeDOMHelpers.findFirstElement(selectors);
  }

  /**
   * Extrai dados dos resultados da busca atual
   * @param {Element} container - Container dos resultados
   * @returns {Array} Array com dados dos resultados
   */
  extractSearchResults(container) {
    if (!container) return [];

    const results = [];
    const rows = container.querySelectorAll('tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 3) {
        const result = {
          element: row,
          class: window.NudgeDOMHelpers.extractCleanText(cells[0]),
          code: window.NudgeDOMHelpers.extractCleanText(cells[1]),
          description: window.NudgeDOMHelpers.extractCleanText(cells[2]).toLowerCase(),
          selectButton: row.querySelector('button:contains("Selecionar")') || 
                       row.querySelector('button') ||
                       row.querySelector('.btn')
        };
        
        if (result.description) {
          results.push(result);
        }
      }
    });

    console.log(`Catalog Analyzer: ${results.length} itens extraídos dos resultados`);
    return results;
  }

  /**
   * Analisa tipo de produto para determinar sustentabilidade
   * @param {string} description - Descrição do produto
   * @returns {Object} Análise do produto
   */
  analyzeProductType(description) {
    const lowerDesc = description.toLowerCase();
    const analysis = {
      originalDescription: description,
      isSustainable: true,
      category: null,
      nonSustainableKeywords: [],
      alternativeTypes: [],
      impactLevel: 'baixo'
    };

    // Verificar cada categoria da base de dados
    if (this.sustainableDatabase?.categories) {
      Object.keys(this.sustainableDatabase.categories).forEach(categoryKey => {
        const category = this.sustainableDatabase.categories[categoryKey];
        
        Object.keys(category).forEach(productKey => {
          const product = category[productKey];
          
          if (product.keywords) {
            product.keywords.forEach(keyword => {
              if (lowerDesc.includes(keyword.toLowerCase())) {
                analysis.isSustainable = false;
                analysis.category = categoryKey;
                analysis.nonSustainableKeywords.push(keyword);
                analysis.alternativeTypes = product.alternatives || [];
                analysis.impactLevel = this.determineImpactLevel(keyword);
              }
            });
          }
        });
      });
    }

    // Análise adicional usando constantes se base não carregou
    if (analysis.isSustainable && window.NudgeConstants?.NON_SUSTAINABLE_KEYWORDS) {
      const keywords = window.NudgeConstants.NON_SUSTAINABLE_KEYWORDS;
      
      Object.keys(keywords).forEach(category => {
        keywords[category].forEach(keyword => {
          if (lowerDesc.includes(keyword.toLowerCase())) {
            analysis.isSustainable = false;
            analysis.category = category;
            analysis.nonSustainableKeywords.push(keyword);
          }
        });
      });
    }

    return analysis;
  }

  /**
   * Determina nível de impacto ambiental
   * @param {string} keyword - Palavra-chave do produto
   * @returns {string} Nível de impacto
   */
  determineImpactLevel(keyword) {
    const highImpact = ['plástico', 'isopor', 'poliestireno', 'descartável'];
    const mediumImpact = ['papel', 'sulfite', 'impressora'];
    
    const lowerKeyword = keyword.toLowerCase();
    
    if (highImpact.some(term => lowerKeyword.includes(term))) {
      return 'alto';
    } else if (mediumImpact.some(term => lowerKeyword.includes(term))) {
      return 'médio';
    }
    
    return 'baixo';
  }

  /**
   * Busca alternativas sustentáveis nos resultados atuais
   * @param {Object} analysis - Análise do produto
   * @returns {Array} Alternativas encontradas nos resultados atuais
   */
  findAlternativesInCurrentResults(analysis) {
    const alternatives = [];
    const sustainableTerms = this.getSustainableSearchTerms(analysis.category);

    this.currentSearchResults.forEach(result => {
      const description = result.description;
      
      // Verificar se contém termos sustentáveis
      const isSustainable = sustainableTerms.some(term => 
        description.includes(term.toLowerCase())
      );

      if (isSustainable) {
        // Calcular score de relevância
        const relevanceScore = this.calculateRelevanceScore(
          description, 
          analysis.originalDescription,
          sustainableTerms
        );

        if (relevanceScore > 0.3) { // Threshold mínimo
          alternatives.push({
            ...result,
            relevanceScore,
            sustainableTerms: sustainableTerms.filter(term => 
              description.includes(term.toLowerCase())
            )
          });
        }
      }
    });

    // Ordenar por relevância
    alternatives.sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(`Catalog Analyzer: ${alternatives.length} alternativas encontradas nos resultados atuais`);
    return alternatives.slice(0, 5); // Limitar a 5 melhores
  }

  /**
   * Obtém termos de busca sustentáveis para categoria
   * @param {string} category - Categoria do produto
   * @returns {Array} Array de termos sustentáveis
   */
  getSustainableSearchTerms(category) {
    const termsByCategory = {
      descartaveis: ['biodegradável', 'compostável', 'reciclável', 'ecológico', 'sustentável', 'bambu', 'papel'],
      papel: ['reciclado', 'FSC', 'certificado', 'ecológico', 'sustentável'],
      limpeza: ['biodegradável', 'ecológico', 'natural', 'concentrado'],
      equipamentos: ['energy star', 'epeat', 'eficiente', 'certificado'],
      embalagens: ['biodegradável', 'kraft', 'papel', 'reciclável']
    };

    const defaultTerms = ['biodegradável', 'ecológico', 'sustentável', 'reciclável'];
    return termsByCategory[category] || defaultTerms;
  }

  /**
   * Calcula score de relevância entre descrições
   * @param {string} alternative - Descrição da alternativa
   * @param {string} original - Descrição original
   * @param {Array} sustainableTerms - Termos sustentáveis
   * @returns {number} Score de 0 a 1
   */
  calculateRelevanceScore(alternative, original, sustainableTerms) {
    let score = 0;
    const altWords = alternative.toLowerCase().split(/\s+/);
    const origWords = original.toLowerCase().split(/\s+/);

    // Score por palavras em comum (exceto termos muito comuns)
    const commonWords = altWords.filter(word => 
      origWords.includes(word) && 
      word.length > 3 && 
      !['para', 'com', 'sem', 'tipo'].includes(word)
    );
    score += (commonWords.length / Math.max(origWords.length, altWords.length)) * 0.6;

    // Score por termos sustentáveis
    const sustainableCount = sustainableTerms.filter(term =>
      alternative.toLowerCase().includes(term.toLowerCase())
    ).length;
    score += (sustainableCount / sustainableTerms.length) * 0.4;

    return Math.min(score, 1);
  }

  /**
   * Gera sugestões de termos de busca para alternativas não encontradas
   * @param {Object} analysis - Análise do produto
   * @returns {Array} Sugestões de busca
   */
  generateSearchTerms(analysis) {
    const suggestions = [];
    const category = analysis.category;
    
    if (this.sustainableDatabase?.categories?.[category]) {
      Object.values(this.sustainableDatabase.categories[category]).forEach(product => {
        if (product.alternatives) {
          product.alternatives.forEach(alternative => {
            if (alternative.search_terms) {
              suggestions.push(...alternative.search_terms);
            }
          });
        }
      });
    }

    // Remover duplicatas e ordenar por relevância
    const uniqueSuggestions = [...new Set(suggestions)];
    
    return uniqueSuggestions.slice(0, 5).map(term => ({
      term,
      category: analysis.category,
      estimatedResults: this.estimateSearchResults(term)
    }));
  }

  /**
   * Estima número de resultados para um termo de busca
   * @param {string} term - Termo de busca
   * @returns {string} Estimativa textual
   */
  estimateSearchResults(term) {
    // Termos mais específicos tendem a ter menos resultados
    if (term.includes('certificado') || term.includes('energy star')) {
      return 'Poucos resultados especializados';
    } else if (term.includes('biodegradável') || term.includes('ecológico')) {
      return 'Resultados moderados';
    } else if (term.includes('reciclável') || term.includes('papel')) {
      return 'Muitos resultados disponíveis';
    }
    
    return 'Resultados variados';
  }

  /**
   * Executa busca automática por termo alternativo
   * @param {string} searchTerm - Termo para buscar
   * @returns {Promise<boolean>} Sucesso da busca
   */
  async executeAlternativeSearch(searchTerm) {
    try {
      const searchInput = window.NudgeDOMHelpers.findFirstElement(
        window.NudgeConstants.DOM_SELECTORS.SEARCH_INPUT
      );

      if (searchInput) {
        // Limpar cache de busca anterior
        this.currentSearchResults = [];
        
        // Executar nova busca
        await window.NudgeDOMHelpers.humanType(searchInput, searchTerm);
        
        // Aguardar resultados carregarem
        await window.NudgeDOMHelpers.sleep(2000);
        
        // Disparar evento de busca se necessário
        const searchButton = document.querySelector('button[type="submit"], .search-button');
        if (searchButton) {
          window.NudgeDOMHelpers.humanClick(searchButton);
        } else {
          // Tentar Enter se não há botão
          searchInput.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true
          }));
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Catalog Analyzer: Erro na busca automática:', error);
      return false;
    }
  }

  /**
   * Verifica se um item é realmente sustentável baseado na descrição completa
   * @param {string} description - Descrição do item
   * @returns {boolean} True se sustentável
   */
  isItemSustainable(description) {
    const lowerDesc = description.toLowerCase();
    const sustainableIndicators = [
      'biodegradável', 'compostável', 'reciclável', 'reciclado',
      'sustentável', 'ecológico', 'fsc', 'energy star', 'epeat',
      'certificado', 'bambu', 'natural', 'renovável'
    ];

    return sustainableIndicators.some(indicator => 
      lowerDesc.includes(indicator)
    );
  }

  /**
   * Limpa cache de resultados
   */
  clearCache() {
    this.currentSearchResults = [];
    this.searchCache.clear();
  }

  /**
   * Obtém estatísticas do analisador
   * @returns {Object} Estatísticas de uso
   */
  getStatistics() {
    return {
      totalAnalyzes: this.searchCache.size,
      currentResults: this.currentSearchResults.length,
      databaseLoaded: !!this.sustainableDatabase,
      categories: this.sustainableDatabase ? 
        Object.keys(this.sustainableDatabase.categories).length : 0
    };
  }
}

// Tornar disponível globalmente
window.NudgeCatalogAnalyzer = new CatalogAnalyzer();

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.NudgeCatalogAnalyzer.initialize();
  });
} else {
  window.NudgeCatalogAnalyzer.initialize();
}