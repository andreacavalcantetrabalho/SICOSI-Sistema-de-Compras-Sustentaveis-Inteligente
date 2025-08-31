/**
 * Content Script - SICOSI (versão enxuta e rápida, sem CSS inline)
 * - Delegação única de clique (sem varrer a página toda)
 * - Análise com timeout: abre rápido com fallback local, enriquece depois com IA
 * - “Bypass” automático do próximo clique quando usuário decide continuar
 * - Injeta fornecedores reais (via seu proxy) sem travar a abertura do modal
 */

(function () {
  'use strict';

  if (window.SICOSISustentavelInitialized) return;
  window.SICOSISustentavelInitialized = true;

  // ---- Estado global mínimo
  let currentModal = null;
  let isModalVisible = false;
  let userSettings = { enabled: true };
  let llmAnalyzer = null;

  console.log('🌱 SICOSI: Iniciando extensão...');

  // ---------- Boot ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  async function initialize() {
    try {
      if (!isCompatiblePage()) return;

      await loadUserSettings();
      if (!userSettings.enabled) return;

      await initializeLLMAnalyzer();

      // Delegação única de cliques em toda a página (captura)
      document.addEventListener('click', onDocumentClick, true);

      console.log('🌱 SICOSI: Extensão ativa!');
    } catch (e) {
      console.error('🌱 SICOSI: Erro na inicialização:', e);
    }
  }

  function isCompatiblePage() {
    const host = location.hostname;
    return host.includes('compras.gov.br') || host === 'localhost' || host === '127.0.0.1';
  }

  async function loadUserSettings() {
    try {
      if (chrome?.storage?.sync) {
        const result = await chrome.storage.sync.get(['SICOSISettings']);
        userSettings = result.SICOSISettings || { enabled: true };
      } else {
        userSettings = { enabled: true };
      }
    } catch {
      userSettings = { enabled: true };
    }
  }

  async function initializeLLMAnalyzer() {
    try {
      if (window.SICOSILLMAnalyzer) {
        llmAnalyzer = window.SICOSILLMAnalyzer;
        await llmAnalyzer.initialize();
        console.log('🌱 SICOSI: LLM analyzer disponível');
      }
    } catch {
      llmAnalyzer = null;
      console.warn('🌱 SICOSI: LLM indisponível, usando análise local');
    }
  }

  // ---------- Delegação de clique ----------
  const ACTION_TERMS = ['selecionar', 'adicionar', 'incluir', 'comprar', 'solicitar', 'escolher', 'confirmar'];

  async function onDocumentClick(event) {
    try {
      // Se modal está aberto, não faz nada
      if (isModalVisible) return;

      // Encontra um botão/link “de ação”
      const btn = event.target?.closest?.('button, input[type="button"], input[type="submit"], a.btn');
      if (!btn) return;

      const label = (btn.textContent || btn.value || btn.title || '').toLowerCase().trim();
      if (!ACTION_TERMS.some(t => label.includes(t))) return;

      // Se marcamos bypass para este botão, deixa passar 1 vez e limpa
      if (btn.dataset.sicosiBypass === '1') {
        delete btn.dataset.sicosiBypass;
        return;
      }

      // Extrai dados do item
      const productInfo = extractProductInfo(btn);
      if (!productInfo.description) return;
      console.log('📦 SICOSI: Produto detectado:', productInfo.description);

      // Analisa rápido (LLM com deadline curto, senão local)
      const analysis = await analyzeProductFast(productInfo);

      // Se há alternativas, intercepta e mostra modal
      if (analysis && !analysis.isSustainable && analysis.alternatives?.length) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        await showSustainabilityModal(productInfo, analysis, () => {
          // libera só o próximo clique
          btn.dataset.sicosiBypass = '1';
          requestAnimationFrame(() => btn.click());
        });

        logEvent('modal_shown', productInfo.description);
      }
    } catch (e) {
      console.error('SICOSI click error:', e);
    }
  }

  // ---------- Extração de dados ----------
  function extractProductInfo(button) {
    const info = { description: '', material: '', fullText: '', code: '' };

    let container =
      button.closest('tr') ||
      button.closest('.item-row') ||
      button.closest('li') ||
      button.parentElement?.parentElement;

    if (container) {
      const cells = container.querySelectorAll('td, th');
      if (cells.length >= 2) {
        info.code = cleanText(cells[0]);
        info.description = cleanText(cells[1]);
        for (let i = 2; i < cells.length; i++) {
          const t = cleanText(cells[i]).toLowerCase();
          if (t.includes('material:') || t.length > 10) {
            info.material = t.replace(/^material:\s*/i, '');
            break;
          }
        }
      } else {
        info.description = cleanText(container);
      }
    }

    if (!info.description) {
      const near = button.parentElement;
      if (near) {
        near.querySelectorAll('span, div, p, td').forEach(el => {
          const t = cleanText(el);
          if (t.length > info.description.length && t.length > 10) info.description = t;
        });
      }
    }

    info.fullText = `${info.code} ${info.description} ${info.material}`.toLowerCase();
    return info;
  }

  function cleanText(el) {
    if (!el) return '';
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  }

  // ---------- Análise com timeout ----------
  function withTimeout(promise, ms, onTimeoutValue) {
    return Promise.race([
      promise,
      new Promise(resolve => setTimeout(() => resolve(onTimeoutValue), ms))
    ]);
  }

  async function analyzeProductFast(productInfo) {
    // Fast-path: descartável/plástico → já abre com local, IA enriquece depois
    const t = (productInfo.fullText || '').toLowerCase();
    const quickHit = /copo|prato|talher/.test(t) && /(plástico|plastico|descartáv|descartav)/.test(t);
    if (quickHit) {
      const local = analyzeProductLocally(productInfo);
      if (llmAnalyzer?.analyzeProduct) {
        withTimeout(llmAnalyzer.analyzeProduct(productInfo), 4000, null).then(ai => {
          if (ai && currentModal && !ai.isSustainable && ai.alternatives?.length) {
            try { enhanceOpenModalWithAI(ai); } catch {}
          }
        });
      }
      return local;
    }

    // Caminho normal: tenta IA por 800ms, senão cai pro local
    if (llmAnalyzer?.analyzeProduct) {
      const ai = await withTimeout(llmAnalyzer.analyzeProduct(productInfo), 800, null);
      if (ai) return ai;
    }
    return analyzeProductLocally(productInfo);
  }

  function analyzeProductLocally(productInfo) {
    const text = (productInfo.fullText || '').toLowerCase();
    const sustainable = ['biodegradável','biodegradavel','compostável','compostavel','reciclado','reciclável','reciclavel','fsc','certificado','sustentável','sustentavel','ecológico','ecologico','bambu','bagaço','bagaco','natural','orgânico','organico'];
    const bad = ['plástico comum','plastico comum','descartável comum','poliestireno','isopor','pvc'];

    const hasGood = sustainable.some(w => text.includes(w));
    const hasBad = bad.some(w => text.includes(w));
    const isSustainable = hasGood || !hasBad;

    const alternatives = isSustainable ? [] : generateLocalAlternatives(productInfo.description);

    return {
      isSustainable,
      sustainabilityScore: isSustainable ? 7 : 3,
      reason: isSustainable ? 'Produto apresenta características sustentáveis' : 'Produto convencional - considere alternativas ecológicas',
      alternatives,
      needsAlternatives: !isSustainable && alternatives.length > 0,
      analysisMethod: 'local'
    };
  }

  function generateLocalAlternatives(description) {
    const desc = (description || '').toLowerCase();
    const alts = [];

    if (desc.includes('copo') && (desc.includes('plástico') || desc.includes('plastico') || desc.includes('descartável') || desc.includes('descartavel'))) {
      alts.push({
        name: 'Copo de Vidro Reutilizável',
        description: 'Copo de vidro para múltiplos usos',
        benefits: 'Reduz o consumo de plásticos descartáveis',
        searchTerms: ['copo de vidro', 'reutilizável']
      });
      alts.push({
        name: 'Copo de Plástico Biodegradável',
        description: 'Copo feito de plástico biodegradável para uso único',
        benefits: 'Menor impacto ambiental que o plástico comum',
        searchTerms: ['copo biodegradável', 'PLA 200ml']
      });
    }

    if (desc.includes('papel') && !desc.includes('reciclado')) {
      alts.push({
        name: 'Papel A4 100% reciclado',
        description: 'Aparas pós-consumo, boa alvura',
        benefits: 'Preserva árvores, economiza água e energia',
        searchTerms: ['papel A4 reciclado', 'FSC reciclado']
      });
    }

    return alts.slice(0, 3);
  }

  // ---------- Modal ----------
  async function showSustainabilityModal(productInfo, analysis, continueCallback) {
    if (isModalVisible) return;
    isModalVisible = true;

    currentModal = createModal(productInfo, analysis, continueCallback);
    document.body.appendChild(currentModal);

    // enriquece com fornecedores reais quando (e se) chegarem — não bloqueia
    tryInjectSuppliers(currentModal, analysis);

    // auto-fecha (opcional): 20s
    setTimeout(() => {
      if (currentModal) {
        closeModal();
        if (continueCallback) continueCallback();
      }
    }, 20000);
  }

  function createModal(productInfo, analysis, continueCallback) {
    const modal = document.createElement('div');
    modal.id = 'sicosi-modal';
    modal.className = 'sicosi-modal-overlay sicosi-modal-visible';

    const altHTML = (analysis.alternatives || []).map(alt => `
      <div class="sicosi-suggestion-item">
        <h4>${alt.name}</h4>
        <p>${alt.description}</p>
        <p class="sicosi-benefit">✅ ${alt.benefits}</p>
        <div class="sicosi-alternatives-grid">
          ${(alt.searchTerms || []).map(term => `<button class="sicosi-alternative-btn" data-search="${term}">🔍 ${term}</button>`).join('')}
        </div>
      </div>
    `).join('');

    modal.innerHTML = `
      <div class="sicosi-modal-content">
        <div class="sicosi-modal-header">
          <span class="sicosi-modal-icon">🌱</span>
          <div class="sicosi-modal-title">
            <h3>Alternativa Sustentável Encontrada</h3>
            <p class="sicosi-modal-subtitle">Sistema Inteligente de Compras Sustentáveis</p>
          </div>
          <button class="sicosi-close-btn" aria-label="Fechar modal">&times;</button>
        </div>
        <div class="sicosi-modal-body">
          <div class="sicosi-current-item">
            Produto: <strong>${productInfo.description}</strong><br>
            <span>${analysis.reason}</span>
          </div>
          <div class="sicosi-suggestions" id="sicosi-suggestions">
            ${altHTML}
          </div>
          <div class="sicosi-modal-actions">
            <button class="sicosi-btn sicosi-btn-secondary" id="continueOriginal">Continuar com produto original</button>
          </div>
          <div class="sicosi-modal-footer">
            <small>Análise: ${analysis.analysisMethod === 'llm' ? '🤖 IA' : '📊 Local'} | ${new Date().toLocaleTimeString('pt-BR')}</small>
          </div>
        </div>
      </div>
    `;

    // eventos
    modal.querySelector('.sicosi-close-btn')?.addEventListener('click', () => {
      closeModal();
      logEvent('modal_dismissed', 'close_button');
    });

    modal.querySelector('#continueOriginal')?.addEventListener('click', () => {
      closeModal();
      if (continueCallback) continueCallback();
      logEvent('modal_action', 'continue_original');
    });

    modal.querySelectorAll('.sicosi-alternative-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        performSearch(btn.dataset.search);
        closeModal();
        logEvent('alternative_search', btn.dataset.search);
      });
    });

    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeModal();
        logEvent('modal_dismissed', 'backdrop_click');
      }
    });

    return modal;
  }

  function closeModal() {
    if (!currentModal) return;
    currentModal.classList.add('sicosi-modal-closing');
    // espera o CSS animar
    setTimeout(() => {
      currentModal?.parentNode?.removeChild(currentModal);
      currentModal = null;
      isModalVisible = false;
    }, 250);
  }

  function performSearch(term) {
    const input = document.querySelector('input[type="text"], input[type="search"]');
    if (!input) return;
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const form = input.closest('form');
    if (form) form.submit();
    else input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }

  // ---------- Enriquecimento com IA (quando chegar depois) ----------
  function enhanceOpenModalWithAI(aiAnalysis) {
    if (!currentModal) return;
    if (!aiAnalysis.alternatives?.length) return;

    const list = currentModal.querySelector('#sicosi-suggestions');
    if (!list) return;

    // substitui conteúdo por alternativas da IA
    list.innerHTML = aiAnalysis.alternatives.map(alt => `
      <div class="sicosi-suggestion-item">
        <h4>${alt.name}</h4>
        <p>${alt.description}</p>
        <p class="sicosi-benefit">✅ ${alt.benefits}</p>
        <div class="sicosi-alternatives-grid">
          ${(alt.searchTerms || []).map(term => `<button class="sicosi-alternative-btn" data-search="${term}">🔍 ${term}</button>`).join('')}
        </div>
      </div>
    `).join('');

    // reanexa handlers
    list.querySelectorAll('.sicosi-alternative-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        performSearch(btn.dataset.search);
        closeModal();
        logEvent('alternative_search', btn.dataset.search);
      });
    });

    // tenta fornecedores para as novas alternativas
    tryInjectSuppliers(currentModal, aiAnalysis);
  }

  // ---------- Fornecedores reais (não bloqueia) ----------
  function tryInjectSuppliers(modal, analysis) {
    if (!llmAnalyzer?.findRealSuppliers) return;
    if (!analysis?.alternatives?.length) return;

    llmAnalyzer.findRealSuppliers(analysis.alternatives)
      .then(enriched => {
        const body = modal.querySelector('.sicosi-modal-body');
        const cards = body?.querySelectorAll('.sicosi-suggestion-item');
        if (!cards || !cards.length) return;

        enriched.forEach((alt, i) => {
          const node = cards[i];
          if (!node) return;
          const suppliers = (alt.suppliers || []).slice(0, 2);
          if (!suppliers.length) return;

          const supDiv = document.createElement('div');
          supDiv.style.marginTop = '8px';
          supDiv.innerHTML = `
            <p style="font-weight:600;margin:0 0 8px 0;">Fornecedores sugeridos:</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${suppliers.map(s => `<a class="sicosi-btn sicosi-btn-primary" href="${s.website}" target="_blank" rel="noopener noreferrer">${s.name}</a>`).join('')}
            </div>
          `;
          node.appendChild(supDiv);
        });
      })
      .catch(e => console.warn('SICOSI: findRealSuppliers falhou', e));
  }

  // ---------- Logs ----------
  function logEvent(event, details) {
    try {
      window.SICOSIStorage?.logAnalytics?.(event, details);
      console.log(`📊 SICOSI: ${event} - ${details}`);
    } catch {}
  }

  // limpeza
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('click', onDocumentClick, true);
    if (currentModal) closeModal();
  });
})();
