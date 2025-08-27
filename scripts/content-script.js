/**
 * Content Script - SICOSI
 * Script principal que monitora o ComprasNet e sugere alternativas sustentáveis
 * VERSÃO CORRIGIDA: Com análise inteligente usando LLM
 */

(function () {
  "use strict";

  // Verificar se já foi inicializado
  if (window.SICOSISustentavelInitialized) {
    return;
  }
  window.SICOSISustentavelInitialized = true;

  // Variáveis globais
  let currentModal = null;
  let isModalVisible = false;
  let debounceTimer = null;
  let observerInstance = null;
  let userSettings = null;
  let isInitialized = false;
  let llmAnalyzer = null;

  class SICOSIManager {
    constructor() {
      this.dependencies = {
        constants: false,
        storage: false,
        domHelpers: false,
        catalogAnalyzer: false,
        llmAnalyzer: false,
        apiKeys: false,
      };
      this.initAttempts = 0;
      this.maxAttempts = 50;
    }

    async initialize() {
      console.log("🌱 SICOSI: Iniciando...");

      try {
        // Aguardar dependências
        await this.waitForDependencies();

        // Inicializar componentes
        await this.initializeComponents();

        // Inicializar funcionalidade principal
        await this.startMainFunctionality();

        isInitialized = true;
        console.log("🌱 SICOSI: Pronto para uso!");
      } catch (error) {
        console.error("🌱 SICOSI: Erro na inicialização:", error);
      }
    }

    async waitForDependencies() {
      return new Promise((resolve) => {
        const checkDependencies = () => {
          this.initAttempts++;

          // Verificar todas as dependências
          if (window.SICOSIConstants) this.dependencies.constants = true;
          if (window.SICOSIStorage) this.dependencies.storage = true;
          if (window.SICOSIDOMHelpers) this.dependencies.domHelpers = true;
          if (window.SICOSICatalogAnalyzer)
            this.dependencies.catalogAnalyzer = true;
          if (window.SICOSILLMAnalyzer) this.dependencies.llmAnalyzer = true;
          if (window.SICOSI_API_KEYS) this.dependencies.apiKeys = true;

          // Verificar se essenciais estão prontas
          const essentialsReady = this.dependencies.constants;

          if (essentialsReady || this.initAttempts >= this.maxAttempts) {
            console.log("🌱 SICOSI: Dependências carregadas");
            resolve();
          } else {
            setTimeout(checkDependencies, 100);
          }
        };

        checkDependencies();
      });
    }

    async initializeComponents() {
      // Carregar configurações do usuário
      if (window.SICOSIStorage) {
        userSettings = await window.SICOSIStorage.loadUserSettings();
      } else {
        userSettings = window.SICOSIConstants?.DEFAULT_SETTINGS || {
          enabled: true,
        };
      }

      // Inicializar analisador LLM
      if (window.SICOSILLMAnalyzer) {
        llmAnalyzer = window.SICOSILLMAnalyzer;
        await llmAnalyzer.initialize();
        console.log("🌱 SICOSI: Analisador LLM inicializado");
      }
    }

    async startMainFunctionality() {
      if (!this.isCompatiblePage()) {
        console.log("🌱 SICOSI: Página não compatível");
        return;
      }

      if (!userSettings?.enabled) {
        console.log("🌱 SICOSI: Extensão desabilitada");
        return;
      }

      // Configurar observador
      this.setupPageObserver();

      // Monitorar elementos existentes
      this.monitorExistingElements();

      console.log("🌱 SICOSI: Monitoramento ativo");
    }

    isCompatiblePage() {
      const hostname = window.location.hostname;
      return (
        hostname.includes("compras.gov.br") ||
        hostname === "localhost" ||
        hostname === "127.0.0.1"
      );
    }

    setupPageObserver() {
      if (observerInstance) {
        observerInstance.disconnect();
      }

      observerInstance = new MutationObserver((mutations) => {
        let shouldCheck = false;

        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (
                  node.tagName === "BUTTON" ||
                  node.querySelector?.("button")
                ) {
                  shouldCheck = true;
                }
              }
            });
          }
        });

        if (shouldCheck) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => this.monitorExistingElements(), 500);
        }
      });

      observerInstance.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    monitorExistingElements() {
      if (!userSettings?.enabled) return;

      const buttons = document.querySelectorAll("button");

      buttons.forEach((button) => {
        const buttonText = (button.textContent || "").toLowerCase();

        if (
          (buttonText.includes("adicionar") ||
            buttonText.includes("selecionar")) &&
          !button.hasSICOSIListener
        ) {
          button.hasSICOSIListener = true;
          button.addEventListener(
            "click",
            this.handleSelectButtonClick.bind(this),
            true
          );
        }
      });
    }

    async handleSelectButtonClick(event) {
      if (isModalVisible) return;

      const button = event.currentTarget;
      const itemRow = button.closest("tr") || button.closest(".item-row");

      if (!itemRow) return;

      // Extrair informações completas do produto
      const productInfo = this.extractCompleteProductInfo(itemRow);
      console.log("🌱 SICOSI: Analisando produto:", productInfo);

      // Análise inteligente com LLM ou local
      const analysis = await this.analyzeProduct(productInfo);

      if (!analysis.isSustainable && analysis.needsAlternatives) {
        console.log("🌱 SICOSI: Produto precisa de alternativas sustentáveis");
        event.preventDefault();
        event.stopPropagation();

        await this.showSmartSustainabilityModal(productInfo, analysis, () => {
          button.removeEventListener(
            "click",
            this.handleSelectButtonClick.bind(this),
            true
          );
          button.click();
        });

        this.logAnalytics("modal_shown", productInfo.description);
      } else if (analysis.isSustainable) {
        console.log("🌱 SICOSI: Produto já é sustentável:", analysis.reason);
        // Não interferir - deixar compra prosseguir
      }
    }

    extractCompleteProductInfo(itemRow) {
      const cells = itemRow.querySelectorAll("td");
      const info = {
        code: "",
        description: "",
        material: "",
        capacity: "",
        application: "",
        characteristics: "",
        fullText: "",
      };

      // Extrair dados de cada célula
      if (cells.length >= 3) {
        info.code = this.extractCleanText(cells[0]);
        info.description = this.extractCleanText(cells[1]);

        // Tentar extrair mais detalhes se disponíveis
        for (let i = 2; i < cells.length - 1; i++) {
          const cellText = this.extractCleanText(cells[i]);

          if (cellText.includes("material:")) {
            info.material = cellText.replace("material:", "").trim();
          } else if (cellText.includes("capacidade:")) {
            info.capacity = cellText.replace("capacidade:", "").trim();
          } else if (cellText.includes("aplicação:")) {
            info.application = cellText.replace("aplicação:", "").trim();
          } else if (cellText.includes("características")) {
            info.characteristics = cellText
              .replace(/características.*:/i, "")
              .trim();
          }
        }
      }

      // Texto completo para análise
      info.fullText = Object.values(info).join(" ").toLowerCase();

      return info;
    }

    extractCleanText(element) {
      if (!element) return "";
      const text = element.textContent || element.innerText || "";
      return text.replace(/\s+/g, " ").trim();
    }

    async analyzeProduct(productInfo) {
      // Usar LLM Analyzer se disponível
      if (llmAnalyzer) {
        return await llmAnalyzer.analyzeProduct(productInfo);
      }

      // Fallback para análise local
      return this.localProductAnalysis(productInfo);
    }

    localProductAnalysis(productInfo) {
      const fullText = productInfo.fullText;

      // Indicadores de sustentabilidade
      const sustainableTerms = [
        "biodegradável",
        "biodegradavel",
        "compostável",
        "compostavel",
        "bagaço de cana",
        "bagaco de cana",
        "bagaço",
        "bagaco",
        "bambu",
        "papel kraft",
        "reciclado",
        "reciclável",
        "fsc",
        "certificado",
        "energy star",
        "epeat",
        "atóxico",
        "atoxico",
        "ecológico",
        "ecologico",
        "sustentável",
        "sustentavel",
        "natural",
        "renovável",
      ];

      const unsustainableTerms = [
        "plástico comum",
        "plastico comum",
        "descartável comum",
        "poliestireno",
        "isopor",
        "pvc",
        "polipropileno",
        "não reciclável",
        "nao reciclavel",
      ];

      // Verificar presença de termos
      const hasSustainableTerms = sustainableTerms.some((term) =>
        fullText.includes(term)
      );
      const hasUnsustainableTerms = unsustainableTerms.some((term) =>
        fullText.includes(term)
      );

      const isSustainable = hasSustainableTerms && !hasUnsustainableTerms;

      // Gerar alternativas se não for sustentável
      const alternatives = isSustainable
        ? []
        : this.generateLocalAlternatives(productInfo);

      return {
        isSustainable,
        reason: isSustainable
          ? "Produto já possui características sustentáveis"
          : "Produto convencional sem certificação ambiental",
        sustainabilityScore: isSustainable ? 8 : 3,
        alternatives,
        needsAlternatives: !isSustainable && alternatives.length > 0,
        analysisMethod: "local",
      };
    }

    generateLocalAlternatives(productInfo) {
      const desc = productInfo.description.toLowerCase();
      const alternatives = [];

      // Mapeamento específico por tipo de produto
      if (desc.includes("copo")) {
        if (!desc.includes("biodegradável") && !desc.includes("bagaço")) {
          alternatives.push(
            {
              name: "Copo de bagaço de cana 200ml",
              description: "Copo produzido com fibra de bagaço de cana",
              benefits:
                "Resíduo agrícola reaproveitado, biodegradável em 90 dias",
              searchTerms: ["copo bagaço cana", "copo fibra natural"],
            },
            {
              name: "Copo de papel certificado FSC",
              description: "Copo de papel com certificação florestal",
              benefits: "Manejo florestal responsável, totalmente reciclável",
              searchTerms: ["copo papel FSC", "copo certificado"],
            }
          );
        }
      } else if (desc.includes("papel") && !desc.includes("reciclado")) {
        alternatives.push({
          name: "Papel A4 100% reciclado",
          description: "Papel produzido com fibras pós-consumo",
          benefits: "Zero desmatamento, economia de água e energia",
          searchTerms: ["papel reciclado A4", "resma reciclada"],
        });
      } else if (
        desc.includes("detergente") &&
        !desc.includes("biodegradável")
      ) {
        alternatives.push({
          name: "Detergente biodegradável concentrado",
          description: "Detergente com surfactantes vegetais",
          benefits: "Não contamina águas, biodegrada em 28 dias",
          searchTerms: ["detergente biodegradável", "detergente eco"],
        });
      }

      return alternatives;
    }

    async showSmartSustainabilityModal(
      productInfo,
      analysis,
      continueCallback
    ) {
      if (isModalVisible) return;

      isModalVisible = true;

      // Buscar fornecedores reais se houver alternativas
      if (
        analysis.alternatives &&
        analysis.alternatives.length > 0 &&
        llmAnalyzer
      ) {
        analysis.alternatives = await llmAnalyzer.findRealSuppliers(
          analysis.alternatives
        );
      }

      currentModal = this.createSmartModal(
        productInfo,
        analysis,
        continueCallback
      );
      document.body.appendChild(currentModal);

      setTimeout(() => {
        if (currentModal) currentModal.classList.add("sicosi-modal-visible");
      }, 50);

      // Auto-fechar após tempo configurado
      const autoCloseDelay =
        window.SICOSIConstants?.MODAL_CONFIG?.AUTO_CLOSE_DELAY || 30000;
      setTimeout(() => {
        if (currentModal) this.closeModal();
      }, autoCloseDelay);
    }

    createSmartModal(productInfo, analysis, continueCallback) {
      const modal = document.createElement("div");
      modal.id = "sicosi-modal";
      modal.className = "sicosi-modal-overlay";

      const alternativesHTML = analysis.alternatives
        .map(
          (alt) => `
        <div class="sicosi-alternative-item">
          <div class="sicosi-alt-header">
            <h4>${alt.name}</h4>
            ${
              alt.estimatedPrice
                ? `<span class="sicosi-price">${alt.estimatedPrice}</span>`
                : ""
            }
          </div>
          <p class="sicosi-alt-description">${alt.description}</p>
          <p class="sicosi-alt-benefits">✅ ${alt.benefits}</p>
          ${
            alt.suppliers && alt.suppliers.length > 0
              ? `
            <div class="sicosi-suppliers">
              <strong>Fornecedores:</strong>
              ${alt.suppliers
                .map(
                  (s) => `
                <a href="${s.website}" target="_blank" class="sicosi-supplier-link">
                  ${s.name}
                </a>
              `
                )
                .join(", ")}
            </div>
          `
              : ""
          }
          <div class="sicosi-alt-actions">
            ${(alt.searchTerms || [])
              .map(
                (term) => `
              <button class="sicosi-search-btn" data-search="${term}">
                🔍 Buscar: ${term}
              </button>
            `
              )
              .join("")}
          </div>
        </div>
      `
        )
        .join("");

      modal.innerHTML = `
        <div class="sicosi-modal-content">
          <div class="sicosi-modal-header">
            <div class="sicosi-header-left">
              <span class="sicosi-modal-icon">🌱</span>
              <div>
                <h3>Análise de Sustentabilidade</h3>
                <p class="sicosi-modal-subtitle">Sistema Inteligente de Compras Sustentáveis</p>
              </div>
            </div>
            <button class="sicosi-close-btn">&times;</button>
          </div>
          
          <div class="sicosi-modal-body">
            <div class="sicosi-product-info">
              <h4>Produto Selecionado:</h4>
              <p><strong>Código:</strong> ${productInfo.code}</p>
              <p><strong>Descrição:</strong> ${productInfo.description}</p>
              ${
                productInfo.material
                  ? `<p><strong>Material:</strong> ${productInfo.material}</p>`
                  : ""
              }
              ${
                productInfo.characteristics
                  ? `<p><strong>Características:</strong> ${productInfo.characteristics}</p>`
                  : ""
              }
            </div>

            <div class="sicosi-analysis-result">
              <div class="sicosi-score">
                <span class="sicosi-score-label">Score de Sustentabilidade:</span>
                <span class="sicosi-score-value" style="color: ${
                  analysis.sustainabilityScore >= 5 ? "#4CAF50" : "#f44336"
                }">
                  ${analysis.sustainabilityScore}/10
                </span>
              </div>
              <p class="sicosi-reason">${analysis.reason}</p>
            </div>

            ${
              analysis.needsAlternatives
                ? `
              <div class="sicosi-alternatives-section">
                <h4>🌿 Alternativas Sustentáveis Recomendadas:</h4>
                ${alternativesHTML}
              </div>
            `
                : `
              <div class="sicosi-no-alternatives">
                <p>✅ Este produto já possui características sustentáveis adequadas.</p>
              </div>
            `
            }

            <div class="sicosi-modal-footer">
              <div class="sicosi-footer-actions">
                ${
                  analysis.needsAlternatives
                    ? `
                  <button class="sicosi-btn sicosi-btn-secondary" id="continueOriginal">
                    Continuar com produto original
                  </button>
                `
                    : `
                  <button class="sicosi-btn sicosi-btn-primary" id="continueOriginal">
                    ✅ Prosseguir com a compra
                  </button>
                `
                }
              </div>
              <small class="sicosi-footer-info">
                Análise: ${
                  analysis.analysisMethod === "llm" ? "🤖 IA" : "📊 Local"
                } | 
                ${new Date().toLocaleTimeString("pt-BR")}
              </small>
            </div>
          </div>
        </div>
      `;

      this.setupModalEventListeners(modal, continueCallback);
      return modal;
    }

    setupModalEventListeners(modal, continueCallback) {
      // Botão fechar
      const closeBtn = modal.querySelector(".sicosi-close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          this.closeModal();
          this.logAnalytics("modal_dismissed", "close_button");
        });
      }

      // Botões de busca
      modal.querySelectorAll(".sicosi-search-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const searchTerm = btn.dataset.search;
          this.searchForAlternative(searchTerm);
          this.logAnalytics("alternative_search", searchTerm);
        });
      });

      // Botão continuar
      const continueBtn = modal.querySelector("#continueOriginal");
      if (continueBtn) {
        continueBtn.addEventListener("click", () => {
          this.closeModal();
          if (continueCallback) continueCallback();
          this.logAnalytics("modal_action", "continue_original");
        });
      }

      // Fechar ao clicar fora
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeModal();
          this.logAnalytics("modal_dismissed", "backdrop_click");
        }
      });
    }

    searchForAlternative(searchTerm) {
      const searchInput = document.querySelector(
        'input[type="text"], input[type="search"]'
      );

      if (searchInput) {
        searchInput.value = searchTerm;
        searchInput.focus();

        // Disparar eventos
        ["input", "change"].forEach((eventType) => {
          searchInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        });

        // Simular Enter
        const enterEvent = new KeyboardEvent("keydown", {
          key: "Enter",
          keyCode: 13,
          bubbles: true,
        });
        searchInput.dispatchEvent(enterEvent);

        console.log("🌱 SICOSI: Buscando por:", searchTerm);
        this.closeModal();
      }
    }

    closeModal() {
      if (currentModal) {
        currentModal.classList.add("sicosi-modal-closing");

        setTimeout(() => {
          if (currentModal && currentModal.parentNode) {
            currentModal.parentNode.removeChild(currentModal);
          }
          currentModal = null;
          isModalVisible = false;
        }, 300);
      }
    }

    logAnalytics(event, details) {
      if (window.SICOSIStorage) {
        window.SICOSIStorage.logAnalytics(event, details);
      }
      console.log("📊 SICOSI Analytics:", event, details);
    }
  }

  // CSS melhorado para o modal
  const style = document.createElement("style");
  style.textContent = `
    .sicosi-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .sicosi-modal-overlay.sicosi-modal-visible {
      opacity: 1;
      visibility: visible;
    }

    .sicosi-modal-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 700px;
      max-height: 85vh;
      width: 90%;
      overflow: hidden;
      transform: scale(0.95);
      transition: transform 0.3s ease;
    }

    .sicosi-modal-visible .sicosi-modal-content {
      transform: scale(1);
    }

    .sicosi-modal-header {
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sicosi-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sicosi-modal-icon {
      font-size: 28px;
    }

    .sicosi-modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .sicosi-modal-subtitle {
      margin: 2px 0 0 0;
      font-size: 13px;
      opacity: 0.95;
    }

    .sicosi-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 24px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      transition: background 0.2s;
    }

    .sicosi-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .sicosi-modal-body {
      padding: 24px;
      max-height: calc(85vh - 140px);
      overflow-y: auto;
    }

    .sicosi-product-info {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .sicosi-product-info h4 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 14px;
    }

    .sicosi-product-info p {
      margin: 6px 0;
      font-size: 13px;
      color: #555;
    }

    .sicosi-analysis-result {
      background: linear-gradient(90deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%);
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #4CAF50;
      margin-bottom: 20px;
    }

    .sicosi-score {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .sicosi-score-label {
      font-weight: 600;
      color: #333;
    }

    .sicosi-score-value {
      font-size: 20px;
      font-weight: bold;
    }

    .sicosi-reason {
      font-size: 13px;
      color: #555;
      line-height: 1.5;
    }

    .sicosi-alternatives-section h4 {
      margin: 24px 0 16px 0;
      color: #333;
      font-size: 16px;
    }

    .sicosi-alternative-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      background: #fafafa;
      transition: all 0.2s;
    }

    .sicosi-alternative-item:hover {
      border-color: #4CAF50;
      background: #f8fff8;
    }

    .sicosi-alt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .sicosi-alt-header h4 {
      margin: 0;
      color: #333;
      font-size: 15px;
    }

    .sicosi-price {
      background: #4CAF50;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .sicosi-alt-description {
      font-size: 13px;
      color: #666;
      margin: 8px 0;
    }

    .sicosi-alt-benefits {
      font-size: 13px;
      color: #4CAF50;
      font-weight: 500;
      margin: 8px 0;
    }

    .sicosi-suppliers {
      font-size: 12px;
      color: #555;
      margin: 10px 0;
    }

    .sicosi-supplier-link {
      color: #2196F3;
      text-decoration: none;
      margin: 0 4px;
    }

    .sicosi-supplier-link:hover {
      text-decoration: underline;
    }

    .sicosi-alt-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .sicosi-search-btn {
      background: white;
      color: #4CAF50;
      border: 1px solid #4CAF50;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .sicosi-search-btn:hover {
      background: #4CAF50;
      color: white;
    }

    .sicosi-no-alternatives {
      background: #e8f5e9;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }

    .sicosi-no-alternatives p {
      margin: 0;
      color: #2e7d32;
      font-size: 14px;
      font-weight: 500;
    }

    .sicosi-modal-footer {
      border-top: 1px solid #e0e0e0;
      padding: 16px 24px;
      background: #fafafa;
    }

    .sicosi-footer-actions {
      display: flex;
      justify-content: center;
      margin-bottom: 12px;
    }

    .sicosi-btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .sicosi-btn-primary {
      background: #4CAF50;
      color: white;
    }

    .sicosi-btn-primary:hover {
      background: #45a049;
    }

    .sicosi-btn-secondary {
      background: #f5f5f5;
      color: #666;
      border: 1px solid #ddd;
    }

    .sicosi-btn-secondary:hover {
      background: #e8e8e8;
    }

    .sicosi-footer-info {
      display: block;
      text-align: center;
      font-size: 11px;
      color: #888;
    }

    .sicosi-modal-closing {
      opacity: 0;
      visibility: hidden;
    }
  `;
  document.head.appendChild(style);

  // Inicializar
  const manager = new SICOSIManager();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => manager.initialize());
  } else {
    manager.initialize();
  }

  // Cleanup ao sair
  window.addEventListener("beforeunload", () => {
    if (observerInstance) observerInstance.disconnect();
    if (currentModal) manager.closeModal();
  });

  // Exportar para debug
  window.SICOSI_DEBUG = {
    isInitialized: () => isInitialized,
    isModalVisible: () => isModalVisible,
    testAnalysis: async (description) => {
      if (llmAnalyzer) {
        return await llmAnalyzer.analyzeProduct({
          description,
          fullText: description.toLowerCase(),
        });
      }
      return "LLM Analyzer não inicializado";
    },
    showTestModal: async () => {
      if (manager) {
        const testProduct = {
          code: "TEST001",
          description: "Copo descartável plástico 200ml",
          material: "Plástico comum",
          fullText: "copo descartável plástico comum 200ml",
        };
        const analysis = await manager.analyzeProduct(testProduct);
        await manager.showSmartSustainabilityModal(testProduct, analysis, null);
      }
    },
    getSettings: () => userSettings,
    getLLMStatus: () => (llmAnalyzer ? "Configurado" : "Não configurado"),
  };
})();
