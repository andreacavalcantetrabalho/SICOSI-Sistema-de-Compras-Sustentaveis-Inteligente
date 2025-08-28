/**
 * LLM Analyzer - SICOSI
 * Módulo responsável por interagir com a API de LLM (via proxy) para
 * realizar análises de sustentabilidade de produtos.
 */

class SICOSILLMAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.apiClient = null;
  }

  /**
   * Inicializa o analisador, garantindo que o APIClient esteja disponível.
   */
  async initialize() {
    if (window.SICOSIAPIClient) {
      this.apiClient = window.SICOSIAPIClient;
      this.isInitialized = true;
      console.log('🌱 SICOSI: LLM Analyzer inicializado com sucesso.');
    } else {
      console.error('SICOSI: Falha ao inicializar LLM Analyzer - SICOSIAPIClient não encontrado.');
      this.isInitialized = false;
    }
  }

  /**
   * Analisa um produto usando a melhor estratégia disponível (LLM ou local).
   * @param {Object} productInfo - Informações do produto extraídas da página.
   * @returns {Promise<Object>} Um objeto com o resultado da análise.
   */
  async analyzeProduct(productInfo) {
    if (!this.isInitialized || !this.apiClient) {
      console.warn("LLM Analyzer não está pronto, usando análise local como fallback.");
      return this.localFallbackAnalysis(productInfo);
    }

    try {
      // Tenta a análise via proxy (camada online)
      const llmResult = await this.apiClient.analyzeProductWithProxy(productInfo.description);

      if (llmResult && typeof llmResult.isSustainable === 'boolean') {
        // A API respondeu com sucesso
        return {
          ...llmResult,
          needsAlternatives: !llmResult.isSustainable && llmResult.alternatives && llmResult.alternatives.length > 0,
          analysisMethod: 'llm',
        };
      } else {
        // A API falhou ou retornou um formato inesperado, usa o fallback local
        console.warn("Análise via LLM falhou ou retornou formato inválido. Usando fallback local.");
        return this.localFallbackAnalysis(productInfo);
      }
    } catch (error) {
      console.error("Erro durante a análise do produto com LLM, usando fallback local:", error);
      return this.localFallbackAnalysis(productInfo);
    }
  }

  /**
   * Análise de fallback que roda localmente se a API falhar.
   * Utiliza a base de dados interna para uma análise mais simples.
   * @param {Object} productInfo - Informações do produto.
   * @returns {Object} Resultado da análise local.
   */
  localFallbackAnalysis(productInfo) {
    const fullText = productInfo.fullText.toLowerCase();

    const sustainableTerms = ["biodegradável", "compostável", "reciclado", "fsc", "energy star", "ecológico", "bagaço de cana"];
    const unsustainableTerms = ["plástico comum", "isopor", "poliestireno", "convencional"];

    let isSustainable = sustainableTerms.some(term => fullText.includes(term));
    const isClearlyUnsustainable = unsustainableTerms.some(term => fullText.includes(term));

    // Regra: Se tiver termos ruins, não é sustentável, mesmo que tenha termos bons.
    if (isClearlyUnsustainable) {
      isSustainable = false;
    }

    // Busca alternativas na base de dados offline
    const alternatives = this.findLocalAlternatives(productInfo.description);

    return {
      isSustainable,
      reason: isSustainable ? "Produto parece possuir características sustentáveis." : "Produto convencional com potencial de impacto ambiental.",
      sustainabilityScore: isSustainable ? 7 : 3,
      alternatives: alternatives,
      needsAlternatives: !isSustainable && alternatives.length > 0,
      analysisMethod: 'local_fallback',
    };
  }

  /**
   * Busca alternativas na base de dados local (gerenciada por data-converter).
   * @param {string} description - Descrição do produto.
   * @returns {Array} Lista de alternativas encontradas.
   */
  findLocalAlternatives(description) {
      const alternativesData = window.SICOSIConstants.SUSTAINABLE_ALTERNATIVES;
      const lowerDesc = description.toLowerCase();
      let foundAlternatives = [];

      for (const keyword in alternativesData) {
          if (lowerDesc.includes(keyword)) {
              const data = alternativesData[keyword];
              // Mapeia para o formato esperado pelo modal
              foundAlternatives = data.alternatives.map(altName => ({
                  name: altName,
                  description: data.reason,
                  benefits: `Impacto: ${data.impact} | Categoria: ${data.category}`,
                  searchTerms: data.search_terms,
              }));
              break; // Para no primeiro match
          }
      }
      return foundAlternatives;
  }
}

// Tornar a classe disponível globalmente para o content-script
window.SICOSILLMAnalyzer = new SICOSILLMAnalyzer();