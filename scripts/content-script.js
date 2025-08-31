/**
 * Content Script - SICOSI (abre na hora, IA assíncrona, sem auto-fechar)
 * - scripts/content-script.js
 * - Modal abre imediatamente com “consultando a IA…”
 * - Usuário pode clicar "Continuar com produto original" a qualquer momento
 * - IA atualiza sugestões e fornecedores quando chegar (sem travar)
 * - Delegação única de clique
 */

(function () {
  'use strict';

  if (window.SICOSISustentavelInitialized) return;
  window.SICOSISustentavelInitialized = true;

  let currentModal = null;
  let isModalVisible = false;
  let userSettings = { enabled: true };
  let llmAnalyzer = null;

  const ACTION_TERMS = ['selecionar', 'adicionar', 'incluir', 'comprar', 'solicitar', 'escolher', 'confirmar'];

  // ---------- BOOT ----------
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

      document.addEventListener('click', onDocumentClick, true);

      console.log('🌱 SICOSI: Ativo e pronto.');
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

  // ---------- CLIQUE ----------
  async function onDocumentClick(event) {
    try {
      if (isModalVisible) return;

      const btn = event.target?.closest?.('button, input[type="button"], input[type="submit"], a.btn');
      if (!btn) return;

      const label = (btn.textContent || btn.value || btn.title || '').toLowerCase().trim();
      if (!ACTION_TERMS.some(t => label.includes(t))) return;

      // Se já liberamos o próximo clique, deixa passar e limpa
      if (btn.dataset.sicosiBypass === '1') {
        delete btn.dataset.sicosiBypass;
        return;
      }

      const productInfo = extractProductInfo(btn);
      if (!productInfo.description) return;

      // Intercepta para abrir o modal na hora
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openModalSkeleton(productInfo, () => {
        // libera apenas o próximo clique do botão original
        btn.dataset.sicosiBypass = '1';
        requestAnimationFrame(() => btn.click());
      });

      // Sugestões locais rápidas
      const localAnalysis = analyzeProductLocally(productInfo);
      if (!localAnalysis.isSustainable && localAnalysis.alternatives?.length) {
        renderSuggestions(localAnalysis.alternatives, '📊 Local');
        logEvent('modal_suggestions_local', productInfo.description);
      } else {
        logEvent('modal_local_sustainable', productInfo.description);
      }

      // IA em paralelo com timeout. Atualiza quando responder.
      if (llmAnalyzer?.analyzeProduct) {
        fetchAIWithTimeout(productInfo, 8000)
          .then(async (ai) => {
            if (!ai) {
              hideLoadingFooter('📊 Local'); // sem IA, mantém local (se houver)
              return;
            }
            if (ai.isSustainable || !ai.alternatives?.length) {
              hideLoadingFooter('🤖 IA (sem alternativas)');
              return;
            }

            hideLoadingFooter('🤖 IA');
            renderSuggestions(ai.alternatives, '🤖 IA');

            try {
              if (llmAnalyzer.findRealSuppliers) {
                const enriched = await llmAnalyzer.findRealSuppliers(ai.alternatives);
                injectSuppliers(enriched);
              }
            } catch (e) {
              console.warn('SICOSI: findRealSuppliers falhou', e);
            }

            logEvent('modal_suggestions_ai', productInfo.description);
          })
          .catch(() => hideLoadingFooter('📊 Local'));
      } else {
        hideLoadingFooter('📊 Local');
      }
    } catch (e) {
      console.error('SICOSI click error:', e);
    }
  }

  // ---------- MODAL (ESQUELETO + LOADING) ----------
  function openModalSkeleton(productInfo, continueCallback) {
    if (isModalVisible) return;
    isModalVisible = true;

    currentModal = document.createElement('div');
    currentModal.id = 'sicosi-modal';
    currentModal.className = 'sicosi-modal-overlay sicosi-modal-visible';

    currentModal.innerHTML = `
      <div class="sicosi-modal-content">
        <div class="sicosi-modal-header">
          <span class="sicosi-modal-icon">🌱</span>
          <div class="sicosi-modal-title">
            <h3>Buscando alternativas sustentáveis…</h3>
            <p class="sicosi-modal-subtitle">Aguarde um instante enquanto consultamos a IA</p>
          </div>
          <button class="sicosi-close-btn" aria-label="Fechar modal">&times;</button>
        </div>

        <div class="sicosi-modal-body">
          <div class="sicosi-current-item">
            Produto: <strong>${escapeHTML(productInfo.description)}</strong>
          </div>

          <div id="sicosi-loading" class="sicosi-loading" style="display:flex;align-items:center;gap:10px;margin:8px 0 16px 0;">
            <div class="spinner"></div>
            <div>Consultando sugestões da IA…</div>
          </div>

          <div class="sicosi-suggestions" id="sicosi-suggestions"></div>

          <div class="sicosi-modal-actions">
            <button class="sicosi-btn sicosi-btn-secondary" id="continueOriginal">Continuar com produto original</button>
          </div>

          <div class="sicosi-modal-footer">
            <small id="sicosi-footer-note">Análise: carregando IA…</small>
          </div>
        </div>
      </div>
    `;

    // Eventos
    currentModal.querySelector('.sicosi-close-btn')?.addEventListener('click', () => {
      closeModal();
      logEvent('modal_dismissed', 'close_button');
    });

    const continueBtn = currentModal.querySelector('#continueOriginal');
    if (continueBtn) {
      // Garante que está habilitado desde o início
      continueBtn.removeAttribute('disabled');
      continueBtn.addEventListener('click', () => {
        closeModal();
        if (continueCallback) continueCallback();
        logEvent('modal_action', 'continue_original');
      });
    }

    currentModal.addEventListener('click', e => {
      if (e.target === currentModal) {
        closeModal();
        logEvent('modal_dismissed', 'backdrop_click');
      }
    });

    document.body.appendChild(currentModal);
  }

  function renderSuggestions(alternatives, sourceLabel) {
    if (!currentModal) return;
    const list = currentModal.querySelector('#sicosi-suggestions');
    const footer = currentModal.querySelector('#sicosi-footer-note');
    if (!list) return;

    list.innerHTML = (alternatives || []).map(alt => `
      <div class="sicosi-suggestion-item">
        <h4>${escapeHTML(alt.name || '')}</h4>
        <p>${escapeHTML(alt.description || '')}</p>
        <p class="sicosi-benefit">✅ ${escapeHTML(alt.benefits || '')}</p>
        <div class="sicosi-alternatives-grid">
          ${(alt.searchTerms || []).map(term => `
            <button class="sicosi-alternative-btn" data-search="${escapeAttr(term)}">🔍 ${escapeHTML(term)}</button>
          `).join('')}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.sicosi-alternative-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        performSearch(btn.dataset.search);
        closeModal();
        logEvent('alternative_search', btn.dataset.search);
      });
    });

    if (footer) footer.textContent = `Análise: ${sourceLabel} | ${new Date().toLocaleTimeString('pt-BR')}`;
    hideLoading();
  }

  function injectSuppliers(enrichedAlternatives) {
    if (!currentModal) return;
    const cards = currentModal.querySelectorAll('.sicosi-suggestion-item');
    if (!cards || !cards.length) return;

    enrichedAlternatives.forEach((alt, i) => {
      const node = cards[i];
      if (!node) return;

      const suppliers = (alt.suppliers || []).slice(0, 3);
      if (!suppliers.length) return;

      const supWrap = document.createElement('div');
      supWrap.className = 'sicosi-alternatives-list';
      supWrap.innerHTML = `
        <p>Fornecedores sugeridos:</p>
        <ul style="margin:0 0 8px 16px; padding:0;">
          ${suppliers.map(s => `
            <li style="margin:4px 0;">
              <a href="${escapeAttr(s.website)}" target="_blank" rel="noreferrer noopener">${escapeHTML(s.name)}</a>
            </li>
          `).join('')}
        </ul>
      `;
      node.appendChild(supWrap);
    });
  }

  function hideLoadingFooter(sourceText) {
    hideLoading();
    const footer = currentModal?.querySelector('#sicosi-footer-note');
    if (footer) footer.textContent = `Análise: ${sourceText} | ${new Date().toLocaleTimeString('pt-BR')}`;
  }

  function hideLoading() {
    const ld = currentModal?.querySelector('#sicosi-loading');
    if (ld) ld.style.display = 'none';
  }

  function closeModal() {
    if (!currentModal) return;
    currentModal.classList.add('sicosi-modal-closing');
    setTimeout(() => {
      currentModal?.parentNode?.removeChild(currentModal);
      currentModal = null;
      isModalVisible = false;
    }, 250);
  }

  // ---------- IA COM TIMEOUT ----------
  function fetchAIWithTimeout(productInfo, timeoutMs = 8000) {
    if (!llmAnalyzer?.analyzeProduct) return Promise.resolve(null);
    return new Promise((resolve) => {
      let settled = false;
      const to = setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, timeoutMs);
      llmAnalyzer.analyzeProduct(productInfo)
        .then(res => { if (!settled) { settled = true; clearTimeout(to); resolve(res); } })
        .catch(() => { if (!settled) { settled = true; clearTimeout(to); resolve(null); } });
    });
  }

  // ---------- ANÁLISE LOCAL ----------
  function analyzeProductLocally(productInfo) {
    const text = (productInfo.fullText || '').toLowerCase();
    const sustainable = [
      'biodegradável','biodegradavel','compostável','compostavel',
      'reciclado','reciclável','reciclavel','fsc','certificado',
      'sustentável','sustentavel','ecológico','ecologico',
      'bambu','bagaço','bagaco','natural','orgânico','organico'
    ];
    const bad = ['plástico comum','plastico comum','descartável comum','poliestireno','isopor','pvc'];

    const hasGood = sustainable.some(w => text.includes(w));
    const hasBad = bad.some(w => text.includes(w));
    const isSustainable = hasGood || !hasBad;

    const alternatives = isSustainable ? [] : generateLocalAlternatives(productInfo.description);

    return {
      isSustainable,
      sustainabilityScore: isSustainable ? 7 : 3,
      reason: isSustainable ? 'Produto apresenta características sustentáveis'
                            : 'Produto convencional - considerando alternativas ecológicas…',
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
        name: 'Copo Biodegradável (PLA) 200ml',
        description: 'Bioplástico para uso único',
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

  // ---------- EXTRAÇÃO ----------
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

  // ---------- BUSCA ----------
  function performSearch(term) {
    const input = document.querySelector('input[type="text"], input[type="search"]');
    if (!input) return;
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const form = input.closest('form');
    if (form) form.submit();
    else input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }

  // ---------- UTILS ----------
  function escapeHTML(str = '') {
    return str.replace(/[&<>"']/g, s => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]
    ));
  }
  function escapeAttr(str = '') {
    return escapeHTML(str).replace(/"/g, '&quot;');
  }

  function logEvent(event, details) {
    try {
      window.SICOSIStorage?.logAnalytics?.(event, details);
      console.log(`📊 SICOSI: ${event} - ${details}`);
    } catch {}
  }

  // ---------- CLEANUP ----------
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('click', onDocumentClick, true);
    if (currentModal) closeModal();
  });
})();
