/**
 * Content Script - SICOSI (Versão Fixa)
 * - Tempo limite aumentado para 15 segundos para análise de IA
 * - Busca de fornecedor melhorada, sem URLs falsas
 * - Melhor tratamento de erros e registro de logs
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
      console.error('🌱 SICOSI: Erro de inicialização:', e);
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
        console.log('🌱 SICOSI: Analisador de IA disponível');
      }
    } catch {
      llmAnalyzer = null;
      console.warn('🌱 SICOSI: IA indisponível, usando análise local');
    }
  }

  // ---------- CLICK HANDLER ----------
  async function onDocumentClick(event) {
    try {
      if (isModalVisible) return;

      const btn = event.target?.closest?.('button, input[type="button"], input[type="submit"], a.btn');
      if (!btn) return;

      const label = (btn.textContent || btn.value || btn.title || '').toLowerCase().trim();
      if (!ACTION_TERMS.some(t => label.includes(t))) return;

      if (btn.dataset.sicosiBypass === '1') {
        delete btn.dataset.sicosiBypass;
        return;
      }

      const productInfo = extractProductInfo(btn);
      if (!productInfo.description) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openModalSkeleton(productInfo, () => {
        btn.dataset.sicosiBypass = '1';
        requestAnimationFrame(() => btn.click());
      });

      // Análise local primeiro
      const localAnalysis = analyzeProductLocally(productInfo);
      if (!localAnalysis.isSustainable && localAnalysis.alternatives?.length) {
        renderSuggestions(localAnalysis.alternatives, '📊 Análise Local', productInfo);
        logEvent('modal_suggestions_local', productInfo.description);
      } else if (localAnalysis.isSustainable) {
        updateModalHeader('sustainable');
        showSustainableMessage(productInfo);
        hideLoadingFooter('📊 Análise Local');
        logEvent('modal_local_sustainable', productInfo.description);
        return;
      }

      // Análise de IA com 15 segundos de tempo limite
      if (llmAnalyzer?.analyzeProduct) {
        console.log('🤖 Consultando IA para análise aprofundada...');
        
        fetchAIWithTimeout(productInfo, 15000)
          .then(async (ai) => {
            if (!ai) {
              console.log('⚠️ A IA não respondeu dentro do tempo limite');
              updateModalHeader('no-alternatives');
              hideLoadingFooter('📊 Análise Local');
              return;
            }

            console.log('✅ Resposta da IA recebida:', ai);

            if (ai.isSustainable) {
              updateModalHeader('sustainable');
              showSustainableMessage(productInfo);
              hideLoadingFooter('🤖 A IA confirma: produto sustentável');
              return;
            }

            if (!ai.alternatives?.length) {
              updateModalHeader('no-alternatives');
              hideLoadingFooter('🤖 A IA não encontrou alternativas');
              return;
            }

            renderSuggestions(ai.alternatives, '🤖 Análise da IA', productInfo);

            try {
              if (llmAnalyzer.findRealSuppliers) {
                console.log('🔍 Buscando por fornecedores...');
                const enriched = await llmAnalyzer.findRealSuppliers(ai.alternatives);
                injectSuppliers(enriched, productInfo);
              }
            } catch (e) {
              console.warn('SICOSI: Erro ao encontrar fornecedores', e);
            }
            
            // CORREÇÃO: A mensagem de "concluído" é atualizada aqui,
            // após a busca por fornecedores.
            updateModalHeader('alternatives');
            hideLoadingFooter('🤖 Análise da IA');
            logEvent('modal_suggestions_ai', productInfo.description);
          })
          .catch((error) => {
            console.error('❌ Erro na análise da IA:', error);
            updateModalHeader('error');
            hideLoadingFooter('📊 Análise Local (IA indisponível)');
          });
      } else {
        updateModalHeader('no-alternatives');
        hideLoadingFooter('📊 Análise Local');
      }
    } catch (e) {
      console.error('Erro de clique do SICOSI:', e);
    }
  }

  // ---------- MODAL ----------
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
            <h3>Buscando por alternativas sustentáveis...</h3>
            <p class="sicosi-modal-subtitle">Por favor, aguarde enquanto analisamos opções ecológicas</p>
          </div>
          <button class="sicosi-close-btn" aria-label="Fechar modal">&times;</button>
        </div>

        <div class="sicosi-modal-body">
          <div class="sicosi-current-item">
            <strong>Produto selecionado:</strong><br>
            ${escapeHTML(productInfo.description)}
            ${productInfo.code ? `<br><small>Código: ${escapeHTML(productInfo.code)}</small>` : ''}
          </div>

          <div id="sicosi-loading" class="sicosi-loading" style="display:flex;align-items:center;gap:10px;margin:20px 0;">
            <div class="spinner"></div>
            <div>Analisando a sustentabilidade e buscando alternativas...</div>
          </div>

          <div id="sicosi-sustainable-message" style="display:none;">
            <div style="background:#d4edda;color:#155724;padding:15px;border-radius:8px;margin:20px 0;">
              <strong>✅ Produto já é sustentável!</strong><br>
              <span id="sustainable-reason"></span>
            </div>
          </div>

          <div class="sicosi-suggestions" id="sicosi-suggestions"></div>

          <div class="sicosi-modal-actions">
            <button class="sicosi-btn sicosi-btn-secondary" id="continueOriginal">
              Continuar com o produto original
            </button>
            <button class="sicosi-btn sicosi-btn-primary" id="searchCatalog" style="display:none;">
              🔍 Buscar no catálogo
            </button>
          </div>

          <div class="sicosi-modal-footer">
            <small id="sicosi-footer-note">Analisando produto...</small>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    currentModal.querySelector('.sicosi-close-btn')?.addEventListener('click', () => {
      closeModal();
      logEvent('modal_dismissed', 'close_button');
    });

    const continueBtn = currentModal.querySelector('#continueOriginal');
    if (continueBtn) {
      continueBtn.removeAttribute('disabled');
      continueBtn.addEventListener('click', () => {
        closeModal();
        if (continueCallback) continueCallback();
        logEvent('modal_action', 'continue_original');
      });
    }

    const searchBtn = currentModal.querySelector('#searchCatalog');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const firstAlternative = currentModal.querySelector('.sicosi-alternative-btn');
        if (firstAlternative) {
          performSearch(firstAlternative.dataset.search);
        }
        closeModal();
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

  function updateModalHeader(status) {
    if (!currentModal) return;
    const title = currentModal.querySelector('.sicosi-modal-title h3');
    const subtitle = currentModal.querySelector('.sicosi-modal-subtitle');
    if (!title || !subtitle) return;

    switch (status) {
      case 'alternatives':
        title.textContent = 'Alternativas sustentáveis encontradas';
        subtitle.textContent = 'Análise concluída com sucesso.';
        break;
      case 'sustainable':
        title.textContent = 'Produto já é sustentável';
        subtitle.textContent = 'Você pode prosseguir com segurança!';
        break;
      case 'no-alternatives':
        title.textContent = 'Nenhuma alternativa encontrada';
        subtitle.textContent = 'A análise foi concluída, mas não encontramos outras opções.';
        break;
      case 'error':
        title.textContent = 'Ocorreu um erro';
        subtitle.textContent = 'Não foi possível completar a análise. Por favor, tente novamente.';
        break;
      default:
        break;
    }
  }

  function renderSuggestions(alternatives, sourceLabel, productInfo) {
    if (!currentModal) return;
    const list = currentModal.querySelector('#sicosi-suggestions');
    const footer = currentModal.querySelector('#sicosi-footer-note');
    const searchBtn = currentModal.querySelector('#searchCatalog');
    
    if (!list) return;

    if (searchBtn) searchBtn.style.display = 'inline-flex';

    list.innerHTML = '<h4 style="margin: 0 0 15px 0;">🌿 Alternativas sustentáveis:</h4>';
    
    list.innerHTML += (alternatives || []).map((alt, index) => `
      <div class="sicosi-suggestion-item" style="margin-bottom: 15px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h4 style="margin: 0 0 8px 0; color: #2e7d32;">${escapeHTML(alt.name || '')}</h4>
        <p style="margin: 0 0 8px 0; color: #555;">${escapeHTML(alt.description || '')}</p>
        ${alt.benefits ? `<p class="sicosi-benefit" style="margin: 0 0 10px 0; color: #4CAF50;">✅ ${escapeHTML(alt.benefits)}</p>` : ''}
        
        <div class="sicosi-alternatives-grid" style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${generateActionButtons(alt, productInfo, index)}
        </div>
        
        <div id="suppliers-${index}" class="sicosi-suppliers-section" style="margin-top: 10px;"></div>
      </div>
    `).join('');

    list.querySelectorAll('.sicosi-alternative-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const search = btn.dataset.search;
        
        if (action === 'search-catalog') {
          performSearch(search);
          closeModal();
          logEvent('alternative_search', search);
        } else if (action === 'search-google') {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(search + ' comprar brasil')}`, '_blank');
          logEvent('external_search', search);
        }
      });
    });

    if (footer) footer.textContent = `${sourceLabel} | ${new Date().toLocaleTimeString('pt-BR')}`;
    hideLoading();
  }

  function generateActionButtons(alternative, productInfo, index) {
    const buttons = [];
    
    if (alternative.searchTerms && alternative.searchTerms.length > 0) {
      const mainTerm = alternative.searchTerms[0];
      buttons.push(`
        <button class="sicosi-alternative-btn" 
                data-action="search-catalog" 
                data-search="${escapeAttr(mainTerm)}"
                style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white;">
          🔍 Buscar "${escapeHTML(mainTerm)}" no catálogo
        </button>
      `);
    }
    
    buttons.push(`
      <button class="sicosi-alternative-btn" 
              data-action="search-google" 
              data-search="${escapeAttr(alternative.name)}"
              style="background: #f0f0f0; color: #333;">
        🌐 Buscar fornecedores online
      </button>
    `);
    
    return buttons.join('');
  }

  function injectSuppliers(enrichedAlternatives, productInfo) {
    if (!currentModal) return;
    
    enrichedAlternatives.forEach((alt, i) => {
      const supplierSection = currentModal.querySelector(`#suppliers-${i}`);
      if (!supplierSection) return;

      const suppliers = (alt.suppliers || []).slice(0, 3);
      if (!suppliers.length) return;

      supplierSection.innerHTML = `
        <div style="border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 10px;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #1976D2;">
            📦 Fornecedores que podem ter este produto:
          </p>
          <ul style="margin: 0; padding-left: 20px;">
            ${suppliers.map(s => `
              <li style="margin: 5px 0; display: flex; align-items: center; gap: 8px;">
                <span style="color: #555;">${escapeHTML(s.name)}</span>
                <button class="sicosi-supplier-search-btn" 
                        data-search="${escapeAttr(s.name + ' ' + alt.name)}"
                        style="background: #f0f0f0; border: 1px solid #ddd; color: #333; 
                               padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                  🔍 Buscar no catálogo
                </button>
                <button class="sicosi-google-search-btn" 
                        data-search="${escapeAttr(s.name)}"
                        style="background: #fff; border: 1px solid #4285f4; color: #4285f4; 
                               padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                  🌐 Google
                </button>
              </li>
            `).join('')}
          </ul>
          <p style="margin: 10px 0 0 0; font-size: 11px; color: #888; font-style: italic;">
            ⚠️ Nomes sugeridos por IA - verifique a disponibilidade no catálogo
          </p>
        </div>
      `;

      supplierSection.querySelectorAll('.sicosi-supplier-search-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          performSearch(btn.dataset.search);
          closeModal();
          logEvent('supplier_catalog_search', btn.dataset.search);
        });
      });

      supplierSection.querySelectorAll('.sicosi-google-search-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(btn.dataset.search + ' site:.com.br')}`, '_blank');
          logEvent('supplier_google_search', btn.dataset.search);
        });
      });
    });
  }

  function showSustainableMessage(productInfo) {
    const msgDiv = currentModal?.querySelector('#sicosi-sustainable-message');
    const reasonSpan = currentModal?.querySelector('#sustainable-reason');
    const loadingDiv = currentModal?.querySelector('#sicosi-loading');
    const searchBtn = currentModal?.querySelector('#searchCatalog');
    
    if (msgDiv && reasonSpan) {
      msgDiv.style.display = 'block';
      reasonSpan.textContent = 'Este produto já possui características ecológicas.';
      if (loadingDiv) loadingDiv.style.display = 'none';
      if (searchBtn) searchBtn.style.display = 'none';
    }
  }

  function hideLoadingFooter(sourceText) {
    hideLoading();
    const footer = currentModal?.querySelector('#sicosi-footer-note');
    if (footer) footer.textContent = `${sourceText} | ${new Date().toLocaleTimeString('pt-BR')}`;
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

  // ---------- AI WITH TIMEOUT ----------
  function fetchAIWithTimeout(productInfo, timeoutMs = 15000) {
    if (!llmAnalyzer?.analyzeProduct) return Promise.resolve(null);
    
    return new Promise((resolve) => {
      let settled = false;
      
      const timeoutId = setTimeout(() => { 
        if (!settled) { 
          settled = true; 
          console.warn('⏱️ Tempo limite da análise de IA esgotado após', timeoutMs, 'ms');
          resolve(null); 
        } 
      }, timeoutMs);
      
      llmAnalyzer.analyzeProduct(productInfo)
        .then(res => { 
          if (!settled) { 
            settled = true; 
            clearTimeout(timeoutId); 
            resolve(res); 
          } 
        })
        .catch((error) => { 
          if (!settled) { 
            settled = true; 
            clearTimeout(timeoutId);
            console.error('❌ Erro na análise da IA:', error);
            resolve(null); 
          } 
        });
    });
  }

  // ---------- LOCAL ANALYSIS ----------
  function analyzeProductLocally(productInfo) {
    const text = (productInfo.fullText || productInfo.description || '').toLowerCase();
    
    const sustainable = [
      'biodegradável','biodegradavel','compostável','compostavel',
      'reciclado','reciclável','reciclavel','fsc','certificado',
      'sustentável','sustentavel','ecológico','ecologico',
      'bambu','bagaço','bagaco','natural','orgânico','organico',
      'energy star', 'epeat', 'papel reciclado'
    ];
    
    const bad = ['plástico comum','plastico comum','descartável comum','poliestireno','isopor','pvc'];

    const hasGood = sustainable.some(w => text.includes(w));
    const hasBad = bad.some(w => text.includes(w));
    const isSustainable = hasGood && !hasBad;

    const alternatives = isSustainable ? [] : generateLocalAlternatives(productInfo.description);

    return {
      isSustainable,
      sustainabilityScore: isSustainable ? 7 : 3,
      reason: isSustainable ? 
        'O produto tem características sustentáveis' :
        'Produto convencional - considerando alternativas ecológicas…',
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
        name: 'Copo Biodegradável (PLA)',
        description: 'Copo de bioplástico compostável feito de amido de milho',
        benefits: 'Decompõe em 90-180 dias em compostagem industrial',
        searchTerms: ['copo biodegradável', 'copo PLA', 'copo compostável']
      });
      alts.push({
        name: 'Copo de Papel Reciclado',
        description: 'Copo de papel com revestimento à base de plantas',
        benefits: '100% reciclável e feito de fontes renováveis',
        searchTerms: ['copo papel', 'copo reciclado', 'copo kraft']
      });
    }

    if (desc.includes('papel') && !desc.includes('reciclado')) {
      alts.push({
        name: 'Papel A4 100% Reciclado',
        description: 'Papel de alta qualidade feito de resíduos pós-consumo',
        benefits: 'Economiza árvores, usa 70% menos água e 60% menos energia',
        searchTerms: ['papel A4 reciclado', 'papel reciclado', 'resma reciclada']
      });
      alts.push({
        name: 'Papel Certificado FSC',
        description: 'Papel proveniente de manejo florestal responsável',
        benefits: 'Garante a origem e rastreabilidade sustentável',
        searchTerms: ['papel FSC', 'papel certificado', 'papel sustentável']
      });
    }

    if (desc.includes('detergente')) {
      alts.push({
        name: 'Detergente Biodegradável',
        description: 'Detergente com tensoativos de origem vegetal',
        benefits: 'Não contamina a água, decompõe em 28 dias',
        searchTerms: ['detergente biodegradável', 'detergente ecológico']
      });
    }

    return alts.slice(0, 3);
  }

  // ---------- EXTRACTION ----------
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

  // ---------- SEARCH ----------
  function performSearch(term) {
    const input = document.querySelector('input[type="text"], input[type="search"], .p-autocomplete-input');
    if (!input) {
      console.warn('SICOSI: Campo de busca não encontrado');
      return;
    }
    
    input.value = '';
    input.focus();
    
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    const form = input.closest('form');
    if (form) {
      console.log('SICOSI: Enviando formulário de busca');
      form.submit();
    } else {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
    }
    
    logEvent('search_performed', term);
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