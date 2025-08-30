/**
 * LLM Analyzer - SICOSI
 * Análise de sustentabilidade usando Grok AI via proxy seguro
 */

class SICOSILLMAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.proxyEndpoint = null;
    this.analysisMode = "auto"; // 'auto', 'ai-only', 'local-only'
  }

  async initialize() {
    try {
      // Busca a URL do proxy e o modo de análise salvos
      const result = await chrome.storage.sync.get(["proxySettings"]);
      const settings = result.proxySettings || {};

      // IMPORTANTE: A URL de produção é definida aqui.
      // Substitua pela URL do seu deploy na Vercel.
      this.proxyEndpoint =
        window.SICOSI_CONFIG?.PROXY_ENDPOINT ||
        "COLE_SUA_URL_DA_VERCEL_AQUI/api/grok-proxy";

      this.analysisMode = settings.analysisMode || "auto";

      this.isInitialized = true;
      console.log("🌱 SICOSI: LLM Analyzer pronto. Modo:", this.analysisMode);
    } catch (error) {
      console.error("SICOSI: Erro ao inicializar LLM:", error);
      this.isInitialized = false;
    }
  }

  async analyzeProduct(productInfo) {
    const useLocal = this.analysisMode === "local-only";
    const useAIOnly = this.analysisMode === "ai-only";

    if (useLocal || !this.proxyEndpoint) {
      console.log("Análise forçada para modo local.");
      return this.localFallbackAnalysis(productInfo);
    }

    try {
      console.log("🤖 Enviando para análise Grok:", productInfo.description);

      const response = await fetch(this.proxyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productInfo }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const analysis = await response.json();
      console.log("✅ Análise Grok recebida:", analysis);

      return {
        ...analysis,
        needsAlternatives:
          !analysis.isSustainable && analysis.alternatives?.length > 0,
        analysisMethod: "llm",
      };
    } catch (error) {
      console.error("❌ Erro na análise Grok, usando fallback:", error);
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

  localFallbackAnalysis(productInfo) {
    const text = (
      productInfo.fullText ||
      productInfo.description ||
      ""
    ).toLowerCase();

    const sustainableTerms = [
      "biodegradável",
      "compostável",
      "reciclado",
      "fsc",
      "bambu",
      "bagaço",
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
