/**
 * CORREÇÃO: utils/data-converter.js
 * Conversor que transforma a estrutura complexa do JSON em estrutura simples para o content script
 */

class SICOSIDataConverter {
  constructor() {
    this.convertedData = null;
    this.isLoaded = false;
  }

  /**
   * Carrega e converte dados do arquivo JSON complexo para estrutura simples
   */
  async loadAndConvertData() {
    try {
      // Carregar arquivo JSON complexo
      const response = await fetch(chrome.runtime.getURL('database/sustainable-alternatives.json'));
      const complexData = await response.json();
      
      // Converter para estrutura simples
      this.convertedData = this.convertComplexToSimple(complexData);
      this.isLoaded = true;
      
      // Adicionar aos constants
      if (window.SICOSIConstants) {
        window.SICOSIConstants.SUSTAINABLE_ALTERNATIVES = this.convertedData;
      }
      
      console.log('🌱 SICOSI: Dados JSON convertidos com sucesso');
      return this.convertedData;
      
    } catch (error) {
      console.error('SICOSI Data Converter: Erro ao carregar dados:', error);
      return this.getFallbackData();
    }
  }

  /**
   * Converte estrutura complexa do JSON para estrutura simples esperada pelo content script
   */
  convertComplexToSimple(complexData) {
    const simpleData = {};
    
    if (!complexData.categories) {
      return this.getFallbackData();
    }

    // Iterar pelas categorias
    Object.keys(complexData.categories).forEach(categoryKey => {
      const category = complexData.categories[categoryKey];
      
      // Iterar pelos produtos da categoria
      Object.keys(category).forEach(productKey => {
        const product = category[productKey];
        
        if (!product.keywords || !product.alternatives) return;
        
        // Para cada keyword, criar entrada na estrutura simples
        product.keywords.forEach(keyword => {
          simpleData[keyword] = {
            alternatives: this.extractAlternativeNames(product.alternatives),
            search_terms: this.extractSearchTerms(product.alternatives),
            reason: this.extractReason(product.alternatives),
            impact: this.determineImpact(categoryKey),
            category: this.formatCategoryName(categoryKey)
          };
        });
      });
    });

    return simpleData;
  }

  /**
   * Extrai nomes das alternativas do formato complexo
   */
  extractAlternativeNames(alternatives) {
    return alternatives.map(alt => {
      if (typeof alt === 'string') return alt;
      if (alt.name) return alt.name;
      if (alt.title) return alt.title;
      return 'Alternativa sustentável';
    });
  }

  /**
   * Extrai termos de busca das alternativas
   */
  extractSearchTerms(alternatives) {
    const allTerms = [];
    
    alternatives.forEach(alt => {
      if (typeof alt === 'string') {
        // Extrair palavras-chave do nome
        allTerms.push(...this.extractKeywordsFromName(alt));
      } else if (alt.search_terms && Array.isArray(alt.search_terms)) {
        allTerms.push(...alt.search_terms);
      } else if (alt.name) {
        allTerms.push(...this.extractKeywordsFromName(alt.name));
      }
    });

    // Remover duplicatas e termos muito comuns
    return [...new Set(allTerms)]
      .filter(term => term.length > 3)
      .filter(term => !['para', 'com', 'sem', 'tipo', 'produto'].includes(term.toLowerCase()))
      .slice(0, 5); // Limitar a 5 termos
  }

  /**
   * Extrai palavras-chave de um nome de produto
   */
  extractKeywordsFromName(name) {
    return name.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => ['biodegradavel', 'reciclado', 'sustentavel', 'ecologico', 'fsc', 'bambu', 'natural'].includes(word));
  }

  /**
   * Extrai razão/benefício das alternativas
   */
  extractReason(alternatives) {
    // Procurar reason/benefits nas alternativas
    for (const alt of alternatives) {
      if (typeof alt === 'object') {
        if (alt.reason) return alt.reason;
        if (alt.benefits && Array.isArray(alt.benefits)) {
          return alt.benefits[0] || 'Opção mais sustentável';
        }
        if (alt.description) return alt.description;
      }
    }
    
    return 'Opção mais sustentável e ecologicamente responsável';
  }

  /**
   * Determina nível de impacto baseado na categoria
   */
  determineImpact(categoryKey) {
    const impactMapping = {
      'descartaveis': 'Alto',
      'embalagens': 'Alto',
      'limpeza': 'Alto',
      'papel': 'Médio',
      'equipamentos': 'Médio'
    };
    
    return impactMapping[categoryKey] || 'Médio';
  }

  /**
   * Formata nome da categoria para exibição
   */
  formatCategoryName(categoryKey) {
    const nameMapping = {
      'descartaveis': 'Descartáveis',
      'papel': 'Papel',
      'limpeza': 'Limpeza',
      'equipamentos': 'Equipamentos',
      'embalagens': 'Embalagens'
    };
    
    return nameMapping[categoryKey] || categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
  }

  /**
   * Dados de fallback caso o carregamento falhe
   */
  getFallbackData() {
    return {
      'copo descartável': {
        alternatives: ['copo biodegradável', 'copo de papel reciclado', 'copo compostável'],
        search_terms: ['biodegradável', 'compostável', 'reciclável'],
        reason: 'Reduz poluição plástica e decomposição mais rápida',
        impact: 'Alto',
        category: 'Descartáveis'
      },
      'copo plástico': {
        alternatives: ['copo biodegradável', 'copo de papel kraft', 'copo de bambu'],
        search_terms: ['biodegradável', 'bambu', 'kraft'],
        reason: 'Evita microplásticos e poluição oceânica',
        impact: 'Alto',
        category: 'Descartáveis'
      },
      'prato descartável': {
        alternatives: ['prato biodegradável', 'prato de papelão reciclável', 'prato de bagaço de cana'],
        search_terms: ['biodegradável', 'bagaço', 'reciclável'],
        reason: 'Material renovável que decompõe naturalmente',
        impact: 'Alto',
        category: 'Descartáveis'
      },
      'papel sulfite': {
        alternatives: ['papel reciclado', 'papel FSC', 'papel de reflorestamento'],
        search_terms: ['reciclado', 'FSC', 'certificado'],
        reason: 'Certificação florestal responsável',
        impact: 'Médio',
        category: 'Papel'
      },
      'papel a4': {
        alternatives: ['papel A4 reciclado', 'papel A4 FSC', 'papel A4 ecológico'],
        search_terms: ['A4 reciclado', 'A4 FSC', 'A4 ecológico'],
        reason: 'Reduz desmatamento e uso de recursos naturais',
        impact: 'Médio',
        category: 'Papel'
      },
      'detergente': {
        alternatives: ['detergente biodegradável', 'detergente ecológico', 'detergente concentrado'],
        search_terms: ['biodegradável', 'ecológico', 'concentrado'],
        reason: 'Menos tóxico para ambiente aquático',
        impact: 'Alto',
        category: 'Limpeza'
      },
      'impressora': {
        alternatives: ['impressora Energy Star', 'impressora EPEAT', 'impressora ecológica'],
        search_terms: ['Energy Star', 'EPEAT', 'eficiente'],
        reason: 'Menor consumo energético e materiais sustentáveis',
        impact: 'Médio',
        category: 'Equipamentos'
      }
    };
  }

  /**
   * Obtém dados convertidos (carrega se necessário)
   */
  async getData() {
    if (!this.isLoaded) {
      await this.loadAndConvertData();
    }
    return this.convertedData;
  }

  /**
   * Verifica se um produto tem alternativas
   */
  async hasAlternatives(productDescription) {
    const data = await this.getData();
    const lowerDesc = productDescription.toLowerCase();
    
    return Object.keys(data).some(keyword => 
      lowerDesc.includes(keyword.toLowerCase())
    );
  }

  /**
   * Encontra alternativas para um produto
   */
  async findAlternatives(productDescription) {
    const data = await this.getData();
    const lowerDesc = productDescription.toLowerCase();
    const matches = [];
    
    Object.keys(data).forEach(keyword => {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        matches.push({
          keyword,
          data: data[keyword]
        });
      }
    });
    
    return matches;
  }
}

// Tornar disponível globalmente
window.SICOSIDataConverter = new SICOSIDataConverter();