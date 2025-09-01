// utils/search-helpers.js
class SearchHelpers {
  // Suas funções já migradas...
  
  // ADICIONAR: Função de score de sustentabilidade (útil do api-client.js)
  static calculateSustainabilityScore(text) {
    const sustainableTerms = [
      'biodegradável', 'reciclável', 'reciclado', 'sustentável', 
      'ecológico', 'fsc', 'energy star', 'epeat', 'certificado', 
      'verde', 'natural', 'compostável', 'renovável', 'orgânico', 
      'bambu', 'bagaço'
    ];

    let score = 0;
    const lowerText = text.toLowerCase();
    sustainableTerms.forEach(term => {
      if (lowerText.includes(term)) score += 0.1;
    });

    return Math.min(score, 1.0);
  }

  // ADICIONAR: Remove duplicatas (útil do api-client.js)
  static removeDuplicates(results, keyField = 'title') {
    const seen = new Set();
    return results.filter(result => {
      const key = (result[keyField] || '').toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ADICIONAR: Delay utility
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

window.SICOSISearchHelpers = SearchHelpers;