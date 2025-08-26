/**
 * Background Script - SICOSI
 * Service Worker que gerencia operações em background da extensão
 */

// Variáveis globais do service worker
let installationTimestamp = null;
let dailyStatsReset = null;

// Event listeners para ciclo de vida da extensão
chrome.runtime.onInstalled.addListener(handleInstallation);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.runtime.onMessage.addListener(handleMessage);

// Alarmes para tarefas periódicas
chrome.alarms.onAlarm.addListener(handleAlarm);

/**
 * Manipula instalação/atualização da extensão
 */
async function handleInstallation(details) {
  console.log('SICOSI Background: Extensão instalada/atualizada', details);
  
  installationTimestamp = Date.now();
  
  try {
    // Configurar dados iniciais
    await initializeExtensionData(details);
    
    // Configurar alarmes periódicos
    await setupPeriodicTasks();
    
    // Mostrar página de boas-vindas na primeira instalação
    if (details.reason === 'install') {
      await showWelcomePage();
    }
    
    // Log de instalação
    await logEvent('extension_installed', {
      reason: details.reason,
      previousVersion: details.previousVersion,
      timestamp: installationTimestamp
    });
    
  } catch (error) {
    console.error('SICOSI Background: Erro na instalação:', error);
  }
}

/**
 * Manipula inicialização da extensão
 */
async function handleStartup() {
  console.log('SICOSI Background: Extensão iniciada');
  
  try {
    // Verificar e limpar dados expirados
    await cleanupExpiredData();
    
    // Resetar estatísticas diárias se necessário
    await resetDailyStatsIfNeeded();
    
    // Verificar atualizações da base de dados
    await checkDatabaseUpdates();
    
  } catch (error) {
    console.error('SICOSI Background: Erro na inicialização:', error);
  }
}

/**
 * Manipula mensagens do content script
 */
function handleMessage(message, sender, sendResponse) {
  console.log('SICOSI Background: Mensagem recebida:', message.type);
  
  switch (message.type) {
    case 'SEARCH_EXTERNAL_ALTERNATIVES':
      handleExternalSearch(message.data)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Manter canal aberto para resposta assíncrona
      
    case 'LOG_ANALYTICS_EVENT':
      handleAnalyticsEvent(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'GET_USER_SETTINGS':
      getUserSettings()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'UPDATE_USER_SETTINGS':
      updateUserSettings(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'GET_STATISTICS':
      getExtensionStatistics()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'EXPORT_DATA':
      exportUserData()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    default:
      console.warn('SICOSI Background: Tipo de mensagem desconhecido:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
}

/**
 * Manipula alarmes periódicos
 */
async function handleAlarm(alarm) {
  console.log('SICOSI Background: Alarme disparado:', alarm.name);
  
  try {
    switch (alarm.name) {
      case 'daily-cleanup':
        await performDailyCleanup();
        break;
        
      case 'weekly-stats':
        await generateWeeklyStats();
        break;
        
      case 'database-update':
        await checkDatabaseUpdates();
        break;
        
      case 'cache-cleanup':
        await cleanupExpiredCache();
        break;
    }
  } catch (error) {
    console.error(`SICOSI Background: Erro no alarme ${alarm.name}:`, error);
  }
}

/**
 * Inicializa dados da extensão
 */
async function initializeExtensionData(details) {
  // Configurações padrão
  const defaultSettings = {
    enabled: true,
    categories: {
      descartaveis: true,
      papel: true,
      limpeza: true,
      equipamentos: true,
      embalagens: true
    },
    notifications: {
      modal: true,
      sound: false,
      position: 'center'
    },
    advanced: {
      autoSearch: true,
      externalSearch: true,
      cacheEnabled: true,
      debugMode: false
    },
    privacy: {
      analytics: true,
      dataCollection: 'minimal'
    }
  };
  
  // Verificar se já existem configurações
  const existingSettings = await chrome.storage.sync.get(['SICOSISettings']);
  
  if (!existingSettings.SICOSISettings) {
    await chrome.storage.sync.set({
      SICOSISettings: {
        ...defaultSettings,
        installDate: Date.now(),
        version: chrome.runtime.getManifest().version
      }
    });
  }
  
  // Inicializar estatísticas
  const existingStats = await chrome.storage.local.get(['SICOSIStatistics']);
  
  if (!existingStats.SICOSIStatistics) {
    await chrome.storage.local.set({
      SICOSIStatistics: {
        totalModalShown: 0,
        totalAlternativesSelected: 0,
        totalSearches: 0,
        categoriesUsed: {},
        impactMetrics: {
          estimatedCO2Saved: 0,
          estimatedWasteSaved: 0,
          sustainableItemsAdopted: 0
        },
        installDate: Date.now(),
        lastActive: Date.now()
      }
    });
  }
}

/**
 * Configura tarefas periódicas
 */
async function setupPeriodicTasks() {
  // Limpeza diária às 2:00 AM
  await chrome.alarms.create('daily-cleanup', {
    when: getNextScheduledTime(2, 0),
    periodInMinutes: 24 * 60
  });
  
  // Estatísticas semanais aos domingos às 8:00 AM
  await chrome.alarms.create('weekly-stats', {
    when: getNextWeeklyTime(0, 8, 0), // Domingo
    periodInMinutes: 7 * 24 * 60
  });
  
  // Verificação de atualização da base de dados diariamente
  await chrome.alarms.create('database-update', {
    delayInMinutes: 30,
    periodInMinutes: 24 * 60
  });
  
  // Limpeza de cache a cada 6 horas
  await chrome.alarms.create('cache-cleanup', {
    delayInMinutes: 60,
    periodInMinutes: 6 * 60
  });
}

/**
 * Manipula busca externa por alternativas
 */
async function handleExternalSearch(data) {
  const { originalProduct, category, maxResults = 5 } = data;
  
  try {
    // Verificar se busca externa está habilitada
    const settings = await getUserSettings();
    if (!settings.advanced.externalSearch) {
      return {
        results: [],
        message: 'Busca externa desabilitada nas configurações'
      };
    }
    
    // Gerar termos de busca
    const searchTerms = generateSearchTerms(originalProduct, category);
    
    // Simular busca externa (em implementação real, usaria APIs reais)
    const searchResults = await simulateExternalSearch(searchTerms, category);
    
    // Filtrar e limitar resultados
    const filteredResults = searchResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
    
    // Log da busca
    await logEvent('external_search_performed', {
      originalProduct,
      category,
      resultsFound: filteredResults.length,
      searchTerms: searchTerms.slice(0, 3) // Apenas primeiros 3 termos
    });
    
    return {
      results: filteredResults,
      searchTerms,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('SICOSI Background: Erro na busca externa:', error);
    throw error;
  }
}

/**
 * Simula busca externa por alternativas
 */
async function simulateExternalSearch(searchTerms, category) {
  // Base simulada de fornecedores sustentáveis
  const sustainableSuppliers = {
    descartaveis: [
      {
        name: 'EcoDisposables Brasil',
        product: 'Copos biodegradáveis PLA',
        price: 'R$ 0,35/unidade',
        certifications: ['ASTM D6400', 'EN 13432'],
        contact: 'vendas@ecodisposables.com.br',
        relevanceScore: 0.95
      },
      {
        name: 'GreenPack Solutions',
        product: 'Embalagens compostáveis',
        price: 'Sob consulta',
        certifications: ['BPI', 'Seedling'],
        contact: 'contato@greenpack.com.br',
        relevanceScore: 0.88
      }
    ],
    papel: [
      {
        name: 'Papel Verde Reciclados',
        product: 'Papel A4 100% reciclado',
        price: 'R$ 18,50/resma',
        certifications: ['FSC Recycled', 'ISO 14001'],
        contact: 'vendas@papelverde.com.br',
        relevanceScore: 0.92
      }
    ],
    limpeza: [
      {
        name: 'CleanGreen Produtos',
        product: 'Detergente biodegradável concentrado',
        price: 'R$ 12,80/litro',
        certifications: ['IBAMA', 'Cradle to Cradle'],
        contact: 'comercial@cleangreen.com.br',
        relevanceScore: 0.90
      }
    ]
  };
  
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  return sustainableSuppliers[category] || [];
}

/**
 * Gera termos de busca para categoria
 */
function generateSearchTerms(originalProduct, category) {
  const baseTerms = extractProductKeywords(originalProduct);
  const sustainableModifiers = {
    descartaveis: ['biodegradável', 'compostável', 'ecológico'],
    papel: ['reciclado', 'FSC', 'certificado'],
    limpeza: ['biodegradável', 'natural', 'ecológico'],
    equipamentos: ['energy star', 'eficiente', 'sustentável'],
    embalagens: ['biodegradável', 'kraft', 'reciclável']
  };
  
  const modifiers = sustainableModifiers[category] || ['sustentável', 'ecológico'];
  const terms = [];
  
  baseTerms.forEach(base => {
    modifiers.forEach(modifier => {
      terms.push(`${base} ${modifier} fornecedor brasil`);
    });
  });
  
  return terms.slice(0, 5);
}

/**
 * Extrai palavras-chave do produto
 */
function extractProductKeywords(product) {
  return product.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !['descartavel', 'comum'].includes(word))
    .slice(0, 3);
}

/**
 * Manipula eventos de analytics
 */
async function handleAnalyticsEvent(eventData) {
  const { event, details, metadata = {} } = eventData;
  
  // Verificar se analytics está habilitado
  const settings = await getUserSettings();
  if (!settings.privacy.analytics) {
    return;
  }
  
  // Criar entrada de log
  const logEntry = {
    timestamp: Date.now(),
    event,
    details,
    metadata: {
      ...metadata,
      version: chrome.runtime.getManifest().version,
      userAgent: 'Chrome Extension' // Anonimizado
    }
  };
  
  // Armazenar no storage local
  await logEvent(event, logEntry);
  
  // Atualizar estatísticas agregadas
  await updateAggregatedStats(event, details);
}

/**
 * Atualiza estatísticas agregadas
 */
async function updateAggregatedStats(event, details) {
  const result = await chrome.storage.local.get(['SICOSIStatistics']);
  const stats = result.SICOSIStatistics || {};
  
  const updated = { ...stats, lastActive: Date.now() };
  
  switch (event) {
    case 'modal_shown':
      updated.totalModalShown = (updated.totalModalShown || 0) + 1;
      break;
      
    case 'alternative_selected':
      updated.totalAlternativesSelected = (updated.totalAlternativesSelected || 0) + 1;
      updated.impactMetrics = updated.impactMetrics || {};
      updated.impactMetrics.sustainableItemsAdopted = 
        (updated.impactMetrics.sustainableItemsAdopted || 0) + 1;
      break;
      
    case 'search_performed':
      updated.totalSearches = (updated.totalSearches || 0) + 1;
      break;
  }
  
  await chrome.storage.local.set({ SICOSIStatistics: updated });
}

/**
 * Obtém configurações do usuário
 */
async function getUserSettings() {
  const result = await chrome.storage.sync.get(['SICOSISettings']);
  return result.SICOSISettings || {};
}

/**
 * Atualiza configurações do usuário
 */
async function updateUserSettings(newSettings) {
  const current = await getUserSettings();
  const updated = { ...current, ...newSettings, lastUpdated: Date.now() };
  await chrome.storage.sync.set({ SICOSISettings: updated });
}

/**
 * Obtém estatísticas da extensão
 */
async function getExtensionStatistics() {
  const [stats, settings] = await Promise.all([
    chrome.storage.local.get(['SICOSIStatistics']),
    chrome.storage.sync.get(['SICOSISettings'])
  ]);
  
  const statistics = stats.SICOSIStatistics || {};
  const userSettings = settings.SICOSISettings || {};
  
  return {
    usage: statistics,
    settings: userSettings,
    version: chrome.runtime.getManifest().version,
    installDate: userSettings.installDate,
    lastActive: statistics.lastActive
  };
}

/**
 * Exporta dados do usuário
 */
async function exportUserData() {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(null),
    chrome.storage.local.get(null)
  ]);
  
  return {
    sync: syncData,
    local: localData,
    exportDate: Date.now(),
    version: chrome.runtime.getManifest().version
  };
}

/**
 * Realiza limpeza diária
 */
async function performDailyCleanup() {
  console.log('SICOSI Background: Executando limpeza diária');
  
  try {
    // Limpar cache expirado
    await cleanupExpiredCache();
    
    // Limpar logs antigos (manter últimos 30 dias)
    await cleanupOldLogs();
    
    // Otimizar storage
    await optimizeStorage();
    
    await logEvent('daily_cleanup_completed', {
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('SICOSI Background: Erro na limpeza diária:', error);
  }
}

/**
 * Limpa cache expirado
 */
async function cleanupExpiredCache() {
  const allData = await chrome.storage.local.get(null);
  const keysToRemove = [];
  const now = Date.now();
  
  Object.keys(allData).forEach(key => {
    if (key.startsWith('alternatives_cache_') || key.startsWith('search_cache_')) {
      const data = allData[key];
      if (data && data.expires && data.expires < now) {
        keysToRemove.push(key);
      }
    }
  });
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log(`SICOSI Background: ${keysToRemove.length} itens de cache removidos`);
  }
}

/**
 * Limpa logs antigos
 */
async function cleanupOldLogs() {
  const result = await chrome.storage.local.get(['SICOSIAnalyticsLogs']);
  const logs = result.SICOSIAnalyticsLogs || [];
  
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentLogs = logs.filter(log => log.timestamp > thirtyDaysAgo);
  
  if (recentLogs.length !== logs.length) {
    await chrome.storage.local.set({ SICOSIAnalyticsLogs: recentLogs });
    console.log(`SICOSI Background: ${logs.length - recentLogs.length} logs antigos removidos`);
  }
}

/**
 * Otimiza storage removendo dados redundantes
 */
async function optimizeStorage() {
  // Implementar otimizações específicas se necessário
  console.log('SICOSI Background: Storage otimizado');
}

/**
 * Log de evento genérico
 */
async function logEvent(event, data) {
  const result = await chrome.storage.local.get(['SICOSIAnalyticsLogs']);
  const logs = result.SICOSIAnalyticsLogs || [];
  
  logs.push({
    event,
    data,
    timestamp: Date.now()
  });
  
  // Manter apenas últimos 500 logs
  if (logs.length > 500) {
    logs.splice(0, logs.length - 500);
  }
  
  await chrome.storage.local.set({ SICOSIAnalyticsLogs: logs });
}

/**
 * Calcula próximo horário agendado
 */
function getNextScheduledTime(hours, minutes) {
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);
  
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  
  return scheduled.getTime();
}

/**
 * Calcula próximo horário semanal
 */
function getNextWeeklyTime(dayOfWeek, hours, minutes) {
  const now = new Date();
  const scheduled = new Date();
  
  scheduled.setDate(scheduled.getDate() + (dayOfWeek - scheduled.getDay() + 7) % 7);
  scheduled.setHours(hours, minutes, 0, 0);
  
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 7);
  }
  
  return scheduled.getTime();
}

/**
 * Limpa dados expirados na inicialização
 */
async function cleanupExpiredData() {
  await cleanupExpiredCache();
}

/**
 * Reseta estatísticas diárias se necessário
 */
async function resetDailyStatsIfNeeded() {
  const result = await chrome.storage.local.get(['dailyStatsDate']);
  const today = new Date().toDateString();
  
  if (result.dailyStatsDate !== today) {
    // Reset de estatísticas diárias
    await chrome.storage.local.set({
      dailyStatsDate: today,
      dailyModalShown: 0,
      dailyAlternativesSelected: 0
    });
  }
}

/**
 * Verifica atualizações da base de dados
 */
async function checkDatabaseUpdates() {
  // Implementar verificação de atualizações se necessário
  console.log('SICOSI Background: Verificando atualizações da base de dados');
}

/**
 * Gera estatísticas semanais
 */
async function generateWeeklyStats() {
  console.log('SICOSI Background: Gerando estatísticas semanais');
  
  const stats = await getExtensionStatistics();
  
  await logEvent('weekly_stats_generated', {
    stats,
    timestamp: Date.now()
  });
}

/**
 * Mostra página de boas-vindas
 */
async function showWelcomePage() {
  try {
    await chrome.tabs.create({
      url: chrome.runtime.getURL('pages/welcome.html')
    });
  } catch (error) {
    console.warn('SICOSI Background: Não foi possível abrir página de boas-vindas:', error);
  }
}