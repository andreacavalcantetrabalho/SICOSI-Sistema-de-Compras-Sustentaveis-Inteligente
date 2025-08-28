/**
 * LLM Analyzer - SICOSI
 * Análise de sustentabilidade usando Grok AI via proxy seguro
 */

class SICOSILLMAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.proxyEndpoint = null;
  }

  async initialize() {
    try {
      // Buscar URL do proxy configurada
      const result = await chrome.storage.sync.get(['proxySettings']);
      const settings = result.proxySettings || {};
      
      // URL padrão ou configurada pelo usuário
      this.proxyEndpoint = settings.grokProxyUrl || 'http://localhost:3000/api/grok-proxy';
      
      this.isInitialized = true;
      console.log('🌱 SICOSI: LLM Analyzer pronto com endpoint:', this.proxyEndpoint);
    } catch (error) {
      console.error('SICOSI: Erro ao inicializar LLM:', error);
      this.isInitialized = false;
    }
  }

  async analyzeProduct(productInfo) {
    // Se não inicializado ou sem endpoint, usa análise local
    if (!this.isInitialized || !this.proxyEndpoint) {
      console.log('LLM não disponível, usando análise local');
      return this.localFallbackAnalysis(productInfo);
    }

    try {
      console.log('🤖 Enviando para análise Grok:', productInfo.description);
      
      const response = await fetch(this.proxyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          productInfo: {
            description: productInfo.description,
            material: productInfo.material || '',
            characteristics: productInfo.characteristics || ''
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const analysis = await response.json();
      console.log('✅ Análise Grok recebida:', analysis);
      
      return {
        ...analysis,
        needsAlternatives: !analysis.isSustainable && (analysis.alternatives?.length > 0)
      };
      
    } catch (error) {
      console.error('❌ Erro na análise Grok, usando fallback:', error);
      return this.localFallbackAnalysis(productInfo);
    }
  }

  localFallbackAnalysis(productInfo) {
    const text = (productInfo.fullText || productInfo.description || '').toLowerCase();
    
    // Detectar sustentabilidade
    const sustainableTerms = ['biodegradável', 'compostável', 'reciclado', 'fsc', 'bambu', 'bagaço'];
    const unsustainableTerms = ['plástico', 'isopor', 'descartável', 'comum'];
    
    const hasSustainable = sustainableTerms.some(t => text.includes(t));
    const hasUnsustainable = unsustainableTerms.some(t => text.includes(t));
    
    const isSustainable = hasSustainable && !hasUnsustainable;
    
    // Buscar alternativas locais
    const alternatives = this.getLocalAlternatives(productInfo.description);
    
    return {
      isSustainable,
      sustainabilityScore: isSustainable ? 7 : 3,
      reason: isSustainable 
        ? 'Produto apresenta características sustentáveis'
        : 'Produto convencional - considere alternativas ecológicas',
      alternatives,
      needsAlternatives: !isSustainable && alternatives.length > 0,
      analysisMethod: 'local_fallback',
      category: this.detectCategory(text),
      timestamp: Date.now()
    };
  }

  getLocalAlternatives(description) {
    const desc = description.toLowerCase();
    const alternatives = [];
    
    if (desc.includes('copo') && (desc.includes('plástico') || desc.includes('descartável'))) {
      alternatives.push({
        name: 'Copo biodegradável de bagaço de cana',
        description: 'Feito de resíduo agrícola, decompõe em 90 dias',
        benefits: 'Zero plástico, compostável',
        searchTerms: ['copo biodegradável', 'copo bagaço'],
        estimatedCost: '15-20% mais caro'
      });
    }
    
    if (desc.includes('papel') && !desc.includes('reciclado')) {
      alternatives.push({
        name: 'Papel A4 100% reciclado',
        description: 'Papel de alta qualidade feito de aparas',
        benefits: 'Poupa árvores e água',
        searchTerms: ['papel reciclado a4'],
        estimatedCost: 'Preço similar'
      });
    }
    
    return alternatives.slice(0, 3); // Max 3 alternativas
  }

  detectCategory(text) {
    if (text.match(/copo|prato|talher|descartáv/)) return 'descartaveis';
    if (text.match(/papel|sulfite|a4/)) return 'papel';
    if (text.match(/detergente|sabão|limpeza/)) return 'limpeza';
    if (text.match(/computador|impressora|monitor/)) return 'equipamentos';
    return 'geral';
  }

  // Método para configurar endpoint
  async setProxyEndpoint(url) {
    this.proxyEndpoint = url;
    await chrome.storage.sync.set({ 
      proxySettings: { 
        grokProxyUrl: url,
        configuredAt: new Date().toISOString()
      }
    });
    console.log('Proxy configurado:', url);
  }

  // Teste de conectividade
  async testConnection() {
    try {
      const response = await fetch(this.proxyEndpoint, {
        method: 'OPTIONS'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Tornar disponível globalmente
window.SICOSILLMAnalyzer = new SICOSILLMAnalyzer();