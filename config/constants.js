/**
 * Constantes da Extensão SICOSI
 * Arquivo centralizado com todas as configurações e constantes
 */

// URLs e domínios do ComprasNet
const COMPRASNET_URLS = {
  CATALOG_BASE: 'https://catalogo.compras.gov.br',
  SEARCH_PAGE: 'https://catalogo.compras.gov.br/cnbs-web/busca',
  MAIN_DOMAIN: 'compras.gov.br'
};

// Seletores CSS para identificar elementos na página
const DOM_SELECTORS = {
  // Campo de busca principal
  SEARCH_INPUT: [
    'body > app-root > div > main > app-busca > div:nth-child(2) > div > div > div.row.pesquisa.mt-3.d-flex > div > div > p-autocomplete > span > input',
    '.p-autocomplete-input',
    'input[placeholder*="Digite aqui o material"]',
    'input[aria-role="searchbox"]'
  ],
  
  // Botões de seleção na lista de resultados
  SELECT_BUTTONS: [
    'button:contains("Selecionar")',
    '.btn:contains("Selecionar")',
    'button[type="button"]:contains("Selecionar")'
  ],
  
  // Tela de configuração do item
  ITEM_CONFIG_PAGE: [
    '.pdm-details',
    '[class*="pdm"]',
    'div:contains("PDM:")'
  ],
  
  // Campos de características do item
  CHARACTERISTICS: {
    MATERIAL: ['select[ng-reflect-field="material"]', 'select:contains("Material")', '[formcontrolname="material"]'],
    CAPACITY: ['select[ng-reflect-field="capacidade"]', 'select:contains("Capacidade")', '[formcontrolname="capacidade"]'],
    APPLICATION: ['select[ng-reflect-field="aplicacao"]', 'select:contains("Aplicação")', '[formcontrolname="aplicacao"]']
  },
  
  // Botão adicionar final
  ADD_BUTTON: [
    'button:contains("Adicionar")',
    '.btn-primary:contains("Adicionar")',
    'button[type="submit"]:contains("Adicionar")'
  ]
};

// Palavras-chave que indicam produtos não-sustentáveis
const NON_SUSTAINABLE_KEYWORDS = {
  // Descartáveis plásticos
  DISPOSABLE_PLASTIC: [
    'copo descartável',
    'copo plástico',
    'prato descartável', 
    'prato plástico',
    'talher descartável',
    'talher plástico',
    'sacola plástica',
    'saco plástico',
    'embalagem plástica'
  ],
  
  // Materiais não-sustentáveis
  NON_ECO_MATERIALS: [
    'poliestireno',
    'isopor',
    'polipropileno',
    'polietileno',
    'pvc',
    'acrílico'
  ],
  
  // Papel não-certificado
  NON_CERTIFIED_PAPER: [
    'papel sulfite',
    'papel a4',
    'papel ofício',
    'papel toalha',
    'guardanapo'
  ],
  
  // Produtos de limpeza convencionais
  CONVENTIONAL_CLEANING: [
    'detergente',
    'desinfetante',
    'alvejante',
    'amaciante',
    'sabão em pó'
  ],
  
  // Equipamentos sem certificação
  NON_CERTIFIED_EQUIPMENT: [
    'impressora',
    'computador',
    'monitor',
    'ar condicionado',
    'refrigerador'
  ]
};

// Alternativas sustentáveis correspondentes
const SUSTAINABLE_ALTERNATIVES = {
  // Descartáveis sustentáveis
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
  
  // Papel sustentável
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
  
  // Produtos de limpeza
  'detergente': {
    alternatives: ['detergente biodegradável', 'detergente ecológico', 'detergente concentrado'],
    search_terms: ['biodegradável', 'ecológico', 'concentrado'],
    reason: 'Menos tóxico para ambiente aquático',
    impact: 'Alto',
    category: 'Limpeza'
  },
  
  // Equipamentos certificados
  'impressora': {
    alternatives: ['impressora Energy Star', 'impressora EPEAT', 'impressora ecológica'],
    search_terms: ['Energy Star', 'EPEAT', 'eficiente'],
    reason: 'Menor consumo energético e materiais sustentáveis',
    impact: 'Médio',
    category: 'Equipamentos'
  }
};

// Configurações do modal de sugestão
const MODAL_CONFIG = {
  ID: 'SICOSI-modal',
  CLASS_PREFIX: 'SICOSI-',
  ANIMATION_DURATION: 300,
  AUTO_CLOSE_DELAY: 15000, // 15 segundos
  Z_INDEX: 999999,
  BACKDROP_OPACITY: 0.5
};

// Configurações de timing
const TIMING_CONFIG = {
  DEBOUNCE_DELAY: 800,        // Delay para detectar digitação
  MODAL_SHOW_DELAY: 500,      // Delay para mostrar modal
  SEARCH_TIMEOUT: 5000,       // Timeout para buscas externas
  CACHE_DURATION: 3600000     // 1 hora em millisegundos
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

// Configurações de analytics/logging
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
  DEFAULT_EXPIRY: 24 * 60 * 60 * 1000 // 24 horas
};

// Configurações padrão do usuário
const DEFAULT_SETTINGS = {
  enabled: true,
  categories: {
    descartáveis: true,
    papel: true,
    limpeza: true,
    equipamentos: true
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

// Exportar constantes para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
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
} else {
  // Browser environment - tornar disponível globalmente
  window.SICOSIConstants = {
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
}