/**
 * Constantes da Extensão SICOSI
 * Arquivo centralizado com todas as configurações e constantes.
 *
 * VERSÃO CORRIGIDA E MELHORADA:
 * - Remove seletores CSS inválidos (como :contains).
 * - Utiliza uma IIFE para carregar as constantes de forma segura.
 * - Dispara um evento 'SICOSIConstantsReady' para notificar outros scripts quando o carregamento estiver concluído.
 */

(function() {
  'use strict';

  // URLs e domínios do ComprasNet
  const COMPRASNET_URLS = {
    CATALOG_BASE: 'https://catalogo.compras.gov.br',
    SEARCH_PAGE: 'https://catalogo.compras.gov.br/cnbs-web/busca',
    MAIN_DOMAIN: 'compras.gov.br'
  };

  // Seletores CSS - Mais robustos e sem seletores inválidos.
  // A lógica para encontrar texto específico (como "Selecionar") será feita no JavaScript.
  const DOM_SELECTORS = {
    SEARCH_INPUT: [
      'input[placeholder*="Digite"]',
      'input[placeholder*="material"]',
      'input[type="text"]:not([style*="display: none"])',
      '.p-autocomplete-input',
      'p-autocomplete input'
    ],
    SELECT_BUTTONS: [
      'button[type="button"]',
      '.btn',
      'button:not([disabled])'
    ],
    ITEM_CONFIG_PAGE: [
      '[class*="pdm"]',
      '[class*="detail"]',
      '.item-details'
    ],
    ADD_BUTTON: [
      'button[type="submit"]',
      '.btn-primary'
    ]
  };

  // Palavras-chave para identificar itens não sustentáveis
  const NON_SUSTAINABLE_KEYWORDS = {
    DISPOSABLE_PLASTIC: [
      'copo descartável', 'copo plástico', 'prato descartável',
      'prato plástico', 'talher descartável', 'talher plástico',
      'sacola plástica', 'saco plástico', 'embalagem plástica'
    ],
    NON_ECO_MATERIALS: ['poliestireno', 'isopor', 'polipropileno'],
    NON_CERTIFIED_PAPER: ['papel sulfite', 'papel a4', 'papel ofício'],
    CONVENTIONAL_CLEANING: ['detergente', 'desinfetante', 'alvejante']
  };

  // Base de dados de alternativas sustentáveis
  const SUSTAINABLE_ALTERNATIVES = {
    'copo descartável': {
      alternatives: ['copo biodegradável', 'copo de papel reciclado'],
      search_terms: ['biodegradável', 'compostável', 'reciclável'],
      reason: 'Reduz poluição plástica e decompõe mais rápido.',
      impact: 'Alto',
      category: 'Descartáveis'
    },
    'copo plástico': {
      alternatives: ['copo biodegradável', 'copo de papel kraft'],
      search_terms: ['biodegradável', 'bambu', 'kraft'],
      reason: 'Evita a geração de microplásticos.',
      impact: 'Alto',
      category: 'Descartáveis'
    },
    'papel sulfite': {
      alternatives: ['papel reciclado', 'papel FSC'],
      search_terms: ['reciclado', 'FSC', 'certificado'],
      reason: 'Garante manejo florestal responsável.',
      impact: 'Médio',
      category: 'Papel'
    },
    'papel a4': {
      alternatives: ['papel A4 reciclado', 'papel A4 FSC'],
      search_terms: ['A4 reciclado', 'A4 FSC'],
      reason: 'Reduz o desmatamento e o uso de recursos.',
      impact: 'Médio',
      category: 'Papel'
    },
    'detergente': {
      alternatives: ['detergente biodegradável', 'detergente ecológico'],
      search_terms: ['biodegradável', 'ecológico', 'concentrado'],
      reason: 'Menos tóxico para o ecossistema aquático.',
      impact: 'Alto',
      category: 'Limpeza'
    }
  };

  // Configurações do Modal
  const MODAL_CONFIG = {
    ID: 'SICOSI-modal',
    CLASS_PREFIX: 'SICOSI-',
    AUTO_CLOSE_DELAY: 15000
  };
  
  // Mensagens da Interface
  const UI_MESSAGES = {
    MODAL_TITLE: '🌱 Alternativa Sustentável Disponível',
    MODAL_SUBTITLE: 'Encontramos opções mais ecológicas para este item'
  };

  // Configurações Padrão
  const DEFAULT_SETTINGS = {
    enabled: true,
    categories: {
      descartaveis: true,
      papel: true,
      limpeza: true,
      equipamentos: true,
      embalagens: true
    }
  };

  // Agrupa todas as constantes em um único objeto global
  const SICOSIConstants = {
    COMPRASNET_URLS,
    DOM_SELECTORS,
    NON_SUSTAINABLE_KEYWORDS,
    SUSTAINABLE_ALTERNATIVES,
    MODAL_CONFIG,
    UI_MESSAGES,
    DEFAULT_SETTINGS
  };

  // Disponibiliza o objeto globalmente para os outros scripts da extensão
  if (typeof window !== 'undefined') {
    window.SICOSIConstants = SICOSIConstants;
    
    // Dispara um evento para avisar que as constantes foram carregadas
    // O content-script.js pode "ouvir" este evento para iniciar com segurança
    const event = new CustomEvent('SICOSIConstantsReady', { detail: SICOSIConstants });
    window.dispatchEvent(event);
    
    console.log('🌱 SICOSI Constants carregado com sucesso');
  }

})();