/**
 * CORREÇÃO 1: config/constants.js - Estrutura Corrigida
 * Alinhando com o que o content-script.js espera
 */

// === VERSÃO CORRIGIDA DO config/constants.js ===

/**
 * Constantes da Extensão SICOSI
 * Arquivo centralizado com todas as configurações e constantes
 * CORRIGIDO: Estrutura alinhada com content-script.js
 */

// URLs e domínios do ComprasNet
const COMPRASNET_URLS = {
  CATALOG_BASE: 'https://catalogo.compras.gov.br',
  SEARCH_PAGE: 'https://catalogo.compras.gov.br/cnbs-web/busca',
  MAIN_DOMAIN: 'compras.gov.br'
};

// Seletores CSS CORRIGIDOS - Mais robustos e menos específicos
const DOM_SELECTORS = {
  // Campo de busca principal - seletores mais genéricos
  SEARCH_INPUT: [
    'input[placeholder*="Digite"]',
    'input[placeholder*="material"]', 
    'input[type="text"]:not([style*="display: none"])',
    '.p-autocomplete-input',
    'p-autocomplete input',
    '[class*="search"] input',
    '[class*="busca"] input'
  ],
  
  // Botões de seleção - sem :contains que não funciona nativamente
  SELECT_BUTTONS: [
    'button[type="button"]',
    '.btn',
    'button:not([disabled])'
  ],
  
  // Tela de configuração do item
  ITEM_CONFIG_PAGE: [
    '[class*="pdm"]',
    '[class*="detail"]',
    '[class*="config"]',
    '.product-details',
    '.item-details'
  ],
  
  // Campos de características do item
  CHARACTERISTICS: {
    MATERIAL: ['select[name*="material"]', 'select[id*="material"]'],
    CAPACITY: ['select[name*="capacidade"]', 'select[id*="capacidade"]'],
    APPLICATION: ['select[name*="aplicacao"]', 'select[id*="aplicacao"]']
  },
  
  // Botão adicionar final
  ADD_BUTTON: [
    'button[type="submit"]',
    '.btn-primary',
    'button[class*="primary"]'
  ]
};

// CORRIGIDO: Estrutura simplificada que o content script espera
const NON_SUSTAINABLE_KEYWORDS = {
  DISPOSABLE_PLASTIC: [
    'copo descartável', 'copo plástico', 'prato descartável', 
    'prato plástico', 'talher descartável', 'talher plástico',
    'sacola plástica', 'saco plástico', 'embalagem plástica'
  ],
  NON_ECO_MATERIALS: [
    'poliestireno', 'isopor', 'polipropileno', 'polietileno', 'pvc'
  ],
  NON_CERTIFIED_PAPER: [
    'papel sulfite', 'papel a4', 'papel ofício', 'papel toalha'
  ],
  CONVENTIONAL_CLEANING: [
    'detergente', 'desinfetante', 'alvejante', 'amaciante'
  ],
  NON_CERTIFIED_EQUIPMENT: [
    'impressora', 'computador', 'monitor', 'ar condicionado'
  ]
};

// CORRIGIDO: Estrutura plana que o content script espera
const SUSTAINABLE_ALTERNATIVES = {
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
  'prato plástico': {
    alternatives: ['prato biodegradável', 'prato de folha de palmeira'],
    search_terms: ['biodegradável', 'natural', 'compostável'],
    reason: 'Alternativas naturais que não poluem',
    impact: 'Alto',
    category: 'Descartáveis'
  },
  'talher descartável': {
    alternatives: ['talher de bambu', 'talher compostável', 'talher de madeira'],
    search_terms: ['bambu', 'compostável', 'madeira'],
    reason: 'Materiais renováveis e biodegradáveis',
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
  'papel ofício': {
    alternatives: ['papel ofício reciclado', 'papel ofício FSC'],
    search_terms: ['ofício reciclado', 'ofício FSC'],
    reason: 'Fonte responsável de fibras',
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
  'desinfetante': {
    alternatives: ['desinfetante natural', 'desinfetante ecológico'],
    search_terms: ['natural', 'ecológico', 'biodegradável'],
    reason: 'Reduz compostos químicos nocivos',
    impact: 'Médio',
    category: 'Limpeza'
  },
  'impressora': {
    alternatives: ['impressora Energy Star', 'impressora EPEAT', 'impressora ecológica'],
    search_terms: ['Energy Star', 'EPEAT', 'eficiente'],
    reason: 'Menor consumo energético e materiais sustentáveis',
    impact: 'Médio',
    category: 'Equipamentos'
  },
  'computador': {
    alternatives: ['computador Energy Star', 'computador EPEAT', 'computador renovado'],
    search_terms: ['Energy Star', 'EPEAT', 'renovado', 'recertificado'],
    reason: 'Eficiência energética e economia circular',
    impact: 'Médio',
    category: 'Equipamentos'
  }
};

// Configurações do modal
const MODAL_CONFIG = {
  ID: 'SICOSI-modal',
  CLASS_PREFIX: 'SICOSI-',
  ANIMATION_DURATION: 300,
  AUTO_CLOSE_DELAY: 15000,
  Z_INDEX: 999999,
  BACKDROP_OPACITY: 0.5
};

// Configurações de timing
const TIMING_CONFIG = {
  DEBOUNCE_DELAY: 800,
  MODAL_SHOW_DELAY: 500,
  SEARCH_TIMEOUT: 5000,
  CACHE_DURATION: 3600000
};

// URLs para busca externa
const EXTERNAL_SEARCH_APIS = {
  GOOGLE_SEARCH: 'https://www.googleapis.com/customsearch/v1',
  BING_SEARCH: 'https://api.bing.microsoft.com/v7.0/search',
  MERCADO_LIVRE: 'https://api.mercadolibre.com/sites/MLB/search'
};

// Mensagens da interface
const UI_MESSAGES = {
  MODAL_TITLE: '🌱 Alternativa Sustentável Disponível',
  MODAL_SUBTITLE: 'Encontramos opções mais ecológicas para este item',
  NO_ALTERNATIVES_FOUND: 'Não encontramos alternativas sustentáveis no momento',
  SEARCHING_CATALOG: 'Buscando alternativas no catálogo...',
  SEARCHING_WEB: 'Buscando fornecedores sustentáveis...',
  ERROR_MESSAGE: 'Erro ao buscar alternativas. Tente novamente.',
  SUCCESS_MESSAGE: 'Alternativa sustentável selecionada com sucesso!'
};

// Configurações de analytics
const ANALYTICS_CONFIG = {
  EVENTS: {
    MODAL_SHOWN: 'modal_shown',
    ALTERNATIVE_SELECTED: 'alternative_selected',
    MODAL_DISMISSED: 'modal_dismissed',
    SEARCH_PERFORMED: 'search_performed',
    ERROR_OCCURRED: 'error_occurred'
  },
  STORAGE_KEY: 'SICOSI-logs',
  MAX_LOGS: 100
};

// Configurações de cache
const CACHE_CONFIG = {
  KEYS: {
    ALTERNATIVES: 'SICOSI-alternatives-cache',
    SETTINGS: 'SICOSI-user-settings',
    STATISTICS: 'SICOSI-statistics'
  },
  DEFAULT_EXPIRY: 24 * 60 * 60 * 1000
};

// Configurações padrão
const DEFAULT_SETTINGS = {
  enabled: true,
  categories: {
    descartaveis: true,
    papel: true,
    limpeza: true,
    equipamentos: true,
    embalagens: true
  },
  notifications: {
    sound: false,
    modal: true,
    position: 'center'
  },
  advanced: {
    autoSearch: true,
    externalSearch: true,
    cacheEnabled: true
  }
};

// CORRIGIDO: Exportar de forma mais robusta
(function() {
  'use strict';
  
  // Criar objeto de constantes
  const SICOSIConstants = {
    COMPRASNET_URLS,
    DOM_SELECTORS,
    NON_SUSTAINABLE_KEYWORDS,
    SUSTAINABLE_ALTERNATIVES,
    MODAL_CONFIG,
    TIMING_CONFIG,
    EXTERNAL_SEARCH_APIS,
    UI_MESSAGES,
    ANALYTICS_CONFIG,
    CACHE_CONFIG,
    DEFAULT_SETTINGS
  };

  // Tornar disponível globalmente de forma mais robusta
  if (typeof window !== 'undefined') {
    // Garantir que está disponível imediatamente
    window.SICOSIConstants = SICOSIConstants;
    
    // Disparar evento quando estiver pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.dispatchEvent(new CustomEvent('SICOSIConstantsReady', { detail: SICOSIConstants }));
      });
    } else {
      // Já está pronto, disparar imediatamente
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('SICOSIConstantsReady', { detail: SICOSIConstants }));
      }, 0);
    }
    
    console.log('🌱 SICOSI Constants loaded successfully');
  }

  // Node.js environment
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SICOSIConstants;
  }
})();