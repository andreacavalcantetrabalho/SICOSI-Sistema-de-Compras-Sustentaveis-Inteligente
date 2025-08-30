// utils/llm-analyzer.js

/**
 * LLM Analyzer - SICOSI
 * Análise de sustentabilidade e busca de fornecedores usando Groq AI via proxy seguro
 */
class SICOSILLMAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.proxyEndpoint = null;
    this.analysisMode = "auto"; // 'auto', 'ai-only', 'local-only'
  }

  async initialize() {
    try {
      // Busca o modo de análise salvo
      const result = await chrome.storage.sync.get(["proxySettings"]);
      const settings = result.proxySettings || {};

      // <<< LÓGICA DE DETECÇÃO DE AMBIENTE >>>
      const isProduction = !!chrome.runtime.getManifest().update_url;

      if (typeof window.SICOSI_CONFIG === "undefined") {
        console.error(
          "SICOSI ERRO CRÍTICO: O arquivo config/env.js não foi encontrado ou não foi carregado corretamente."
        );
        this.proxyEndpoint = null; // Força o modo offline
      } else {
        if (isProduction) {
          this.proxyEndpoint = window.SICOSI_CONFIG.PRODUCTION_PROXY_ENDPOINT;
          console.log("🌱 SICOSI: Ambiente de PRODUÇÃO detectado.");
        } else {
          this.proxyEndpoint = window.SICOSI_CONFIG.DEVELOPMENT_PROXY_ENDPOINT;
          console.log("🌱 SICOSI: Ambiente de DESENVOLVIMENTO detectado.");
        }
      }
      // <<< FIM DA LÓGICA >>>

      this.analysisMode = settings.analysisMode || "auto";
      this.isInitialized = true;
      console.log(
        "🌱 SICOSI: LLM Analyzer pronto. Usando endpoint:",
        this.proxyEndpoint || "Modo Offline"
      );
    } catch (error) {
      console.error("SICOSI: Erro ao inicializar LLM:", error);
      this.isInitialized = false;
    }
  }

  async analyzeProduct(productInfo) {
    const useLocal = this.analysisMode === "local-only";
    const useAIOnly = this.analysisMode === "ai-only";

    if (
      useLocal ||
      !this.proxyEndpoint ||
      !this.proxyEndpoint.startsWith("http")
    ) {
      console.log(
        "Análise forçada para modo local (proxy não configurado ou offline)."
      );
      return this.localFallbackAnalysis(productInfo);
    }

    try {
      console.log("🤖 Enviando para análise Groq:", productInfo.description);
      const response = await fetch(this.proxyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "analyze_product", // Especifica o tipo de requisição
          productInfo
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const analysis = await response.json();
      console.log("✅ Análise Groq recebida:", analysis);

      return {
        ...analysis,
        needsAlternatives:
          !analysis.isSustainable && analysis.alternatives?.length > 0,
        analysisMethod: "llm",
      };
    } catch (error) {
      console.error("❌ Erro na análise Groq, usando fallback:", error);
      if (useAIOnly) {
        return {
          isSustainable: false,
          reason:
            "Falha na conexão com o serviço de IA. Verifique a configuração do proxy.",
          alternatives: [],
          needsAlternatives: false,
          analysisMethod: "error",
        };
      }
      return this.localFallbackAnalysis(productInfo);
    }
  }

  /**
   * Busca fornecedores reais para as alternativas sugeridas usando a LLM.
   * @param {Array} alternatives - A lista de objetos de alternativas.
   * @returns {Promise<Array>} A lista de alternativas enriquecida com informações de fornecedores.
   */
  async findRealSuppliers(alternatives) {
    if (!this.proxyEndpoint || !this.proxyEndpoint.startsWith("http")) {
      console.log("Busca por fornecedores pulada (modo offline).");
      return alternatives.map((alt) => ({ ...alt, suppliers: [] }));
    }

    try {
      console.log("🤖 Buscando fornecedores para alternativas via Groq...");

      const response = await fetch(this.proxyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "find_suppliers",
          alternatives: alternatives.map((a) => a.name),
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status} ao buscar fornecedores.`);
      }

      const suppliersByAlternative = await response.json();

      // Combina os resultados dos fornecedores com as alternativas originais
      return alternatives.map((alt) => ({
        ...alt,
        suppliers: suppliersByAlternative[alt.name] || [],
      }));
    } catch (error) {
      console.error(
        "❌ Erro ao buscar fornecedores, retornando alternativas sem eles:",
        error
      );
      return alternatives.map((alt) => ({ ...alt, suppliers: [] }));
    }
  }

  localFallbackAnalysis(productInfo) {
    const text = (
      productInfo.fullText ||
      productInfo.description ||
      ""
    ).toLowerCase();

    const sustainableTerms = [
      "biodegradável", "compostável", "reciclado", "fsc", "bambu", "bagaço",
    ];
    const unsustainableTerms = ["plástico", "isopor", "descartável", "comum"];

    const hasSustainable = sustainableTerms.some((t) => text.includes(t));
    const hasUnsustainable = unsustainableTerms.some((t) => text.includes(t));
    const isSustainable = hasSustainable && !hasUnsustainable;
    const alternatives = this.getLocalAlternatives(productInfo.description);

    return {
      isSustainable,
      sustainabilityScore: isSustainable ? 7 : 3,
      reason: isSustainable
        ? "Produto apresenta características sustentáveis"
        : "Produto convencional - considere alternativas ecológicas",
      alternatives,
      needsAlternatives: !isSustainable && alternatives.length > 0,
      analysisMethod: "local_fallback",
      category: this.detectCategory(text),
      timestamp: Date.now(),
    };
  }

  getLocalAlternatives(description) {
    const desc = description.toLowerCase();
    const alternatives = [];
    if (
      desc.includes("copo") &&
      (desc.includes("plástico") || desc.includes("descartável"))
    ) {
      alternatives.push({
        name: "Copo biodegradável de bagaço de cana",
        description: "Feito de resíduo agrícola, decompõe em 90 dias",
        benefits: "Zero plástico, compostável",
        searchTerms: ["copo biodegradável", "copo bagaço"],
      });
    }
    if (desc.includes("papel") && !desc.includes("reciclado")) {
      alternatives.push({
        name: "Papel A4 100% reciclado",
        description: "Papel de alta qualidade feito de aparas",
        benefits: "Poupa árvores e água",
        searchTerms: ["papel reciclado a4"],
      });
    }
    return alternatives.slice(0, 3);
  }

  detectCategory(text) {
    if (text.match(/copo|prato|talher|descartáv/)) return "descartaveis";
    if (text.match(/papel|sulfite|a4/)) return "papel";
    if (text.match(/detergente|sabão|limpeza/)) return "limpeza";
    if (text.match(/computador|impressora|monitor/)) return "equipamentos";
    return "geral";
  }
}

// Tornar disponível globalmente
window.SICOSILLMAnalyzer = new SICOSILLMAnalyzer();