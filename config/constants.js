/**
 * ARQUIVO: config/constants.js
 * Constantes básicas para o SICOSI
 * VERSÃO CORRIGIDA: Com estruturas necessárias para storage-manager
 */

(function() {
  'use strict';

  // Configurações básicas
  const DEFAULT_SETTINGS = {
    enabled: true,
    debug: false,
    categories: {
      descartaveis: true,
      papel: true,
      limpeza: true,
      equipamentos: true,
      embalagens: true
    },
    notifications: {
      modal: true,
      sound: false
    },
    advanced: {
      autoSearch: true,
      externalSearch: true,
      cacheEnabled: true
    }
  };

  // Configurações de cache necessárias para storage-manager
  const CACHE_CONFIG = {
    KEYS: {
      SETTINGS: 'SICOSI-user-settings',
      STATISTICS: 'SICOSI-statistics'
    },
    DEFAULT_EXPIRY: 24 * 60 * 60 * 1000 // 24 horas
  };

  // Configurações de analytics necessárias para storage-manager
  const ANALYTICS_CONFIG = {
    EVENTS: {
      MODAL_SHOWN: 'modal_shown',
      ALTERNATIVE_SELECTED: 'alternative_selected',
      MODAL_DISMISSED: 'modal_dismissed',
      SEARCH_PERFORMED: 'search_performed'
    },
    STORAGE_KEY: 'SICOSI-logs',
    MAX_LOGS: 100
  };

  // Alternativas sustentáveis básicas para fallback
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
    'papel sulfite': {
      alternatives: ['papel reciclado', 'papel FSC', 'papel de reflorestamento'],
      search_terms: ['reciclado', 'FSC', 'certificado'],
      reason: 'Certificação florestal responsável',
      impact: 'Médio',
      category: 'Papel'
    },
    'detergente': {
      alternatives: ['detergente biodegradável', 'detergente ecológico', 'detergente concentrado'],
      search_terms: ['biodegradável', 'ecológico', 'concentrado'],
      reason: 'Menos tóxico para ambiente aquático',
      impact: 'Alto',
      category: 'Limpeza'
    }
  };

  // Configuração do modal
  const MODAL_CONFIG = {
    ID: 'SICOSI-modal',
    CLASS_PREFIX: 'SICOSI-',
    AUTO_CLOSE_DELAY: 15000,
    Z_INDEX: 999999
  };

  // Tornar disponível globalmente
  window.SICOSIConstants = {
    DEFAULT_SETTINGS,
    CACHE_CONFIG,
    ANALYTICS_CONFIG,
    SUSTAINABLE_ALTERNATIVES,
    MODAL_CONFIG
  };

  // Disparar evento quando estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.dispatchEvent(new CustomEvent('SICOSIConstantsReady', { 
        detail: window.SICOSIConstants 
      }));
    });
  } else {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('SICOSIConstantsReady', { 
        detail: window.SICOSIConstants 
      }));
    }, 0);
  }

  console.log('🌱 SICOSI Constants carregado com estruturas necessárias');

})();