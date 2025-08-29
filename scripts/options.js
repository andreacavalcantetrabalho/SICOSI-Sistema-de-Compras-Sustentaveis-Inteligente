/**
 * Options Script - SICOSI
 * JavaScript para gerenciar a página de configurações da extensão
 */
class OptionsManager {
  constructor() {
    this.currentTab = "general";
    this.settings = null;
    this.statistics = null;
    this.hasUnsavedChanges = false;
    this.init = this.init.bind(this);
    this.switchTab = this.switchTab.bind(this);
    this.saveAllSettings = this.saveAllSettings.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
  }
  async init() {
    try {
      this.showLoading(true);
      await Promise.all([
        this.loadSettings(),
        this.loadStatistics(),
        this.loadStorageInfo(),
      ]);
      this.setupEventListeners();
      this.setupTabNavigation();
      this.updateUI();
    } catch (e) {
      console.error("Options: Erro na inicialização:", e),
        this.showToast("Erro ao carregar configurações", "error");
    } finally {
      this.showLoading(false);
    }
  }
  async loadSettings() {
    try {
      const e = await chrome.runtime.sendMessage({ type: "GET_USER_SETTINGS" });
      if (e.error) throw new Error(e.error);
      this.settings = e || window.SICOSIConstants.DEFAULT_SETTINGS;
    } catch (e) {
      console.error("Options: Erro ao carregar configurações:", e),
        (this.settings = window.SICOSIConstants.DEFAULT_SETTINGS);
    }
  }
  async loadStatistics() {
    try {
      const e = await chrome.runtime.sendMessage({ type: "GET_STATISTICS" });
      if (e.error) throw new Error(e.error);
      this.statistics = e.usage || {};
    } catch (e) {
      console.error("Options: Erro ao carregar estatísticas:", e),
        (this.statistics = {});
    }
  }
  async loadStorageInfo() {
    try {
      const [e, t] = await Promise.all([
        chrome.storage.sync.getBytesInUse(),
        chrome.storage.local.getBytesInUse(),
      ]);
      this.storageInfo = {
        sync: Math.round((e / 1024) * 100) / 100,
        local: Math.round((t / 1024) * 100) / 100,
      };
    } catch (e) {
      console.error("Options: Erro ao carregar info de storage:", e),
        (this.storageInfo = { sync: 0, local: 0 });
    }
  }
  setupEventListeners() {
    document
      .getElementById("saveAllBtn")
      .addEventListener("click", this.saveAllSettings),
      document
        .getElementById("exportBtn")
        .addEventListener("click", this.exportData),
      document
        .getElementById("extensionEnabled")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("debugMode")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("modalPosition")
        .addEventListener("change", this.handleSettingChange),
      this.setupRangeSliders(),
      document
        .querySelectorAll(".category-toggle")
        .forEach((e) => {
          e.addEventListener("change", this.handleCategoryChange.bind(this));
        }),
      document.getElementById("enableAllCategories").addEventListener("click", () => {
        this.toggleAllCategories(true);
      }),
      document.getElementById("disableAllCategories").addEventListener("click", () => {
        this.toggleAllCategories(false);
      }),
      document
        .getElementById("resetCategories")
        .addEventListener("click", this.resetCategories.bind(this)),
      document
        .getElementById("modalNotifications")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("soundNotifications")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("browserNotifications")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("detectionDelay")
        .addEventListener("input", this.handleSettingChange),
      document
        .getElementById("maxSuggestions")
        .addEventListener("change", this.handleSettingChange),
      document.getElementById("testModal").addEventListener("click", this.testModal),
      document.getElementById("testSound").addEventListener("click", this.testSound),
      document
        .getElementById("testBrowser")
        .addEventListener("click", this.testBrowserNotification),
      document
        .getElementById("autoSearch")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("externalSearch")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("cacheEnabled")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("searchTimeout")
        .addEventListener("input", this.handleSettingChange),
      document
        .getElementById("clearCache")
        .addEventListener("click", this.clearCache.bind(this)),
      document
        .getElementById("clearLogs")
        .addEventListener("click", this.clearLogs.bind(this)),
      document
        .getElementById("clearAllData")
        .addEventListener("click", this.clearAllData.bind(this)),
      document
        .getElementById("analyticsEnabled")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("errorLogging")
        .addEventListener("change", this.handleSettingChange),
      document
        .getElementById("viewPrivacyPolicy")
        .addEventListener("click", this.viewPrivacyPolicy),
      document
        .getElementById("downloadData")
        .addEventListener("click", this.downloadUserData),
      document
        .getElementById("helpLink")
        .addEventListener("click", this.openHelpPage),
      document.addEventListener("change", () => {
        (this.hasUnsavedChanges = true), this.updateSaveButton();
      }),
      window.addEventListener("beforeunload", (e) => {
        this.hasUnsavedChanges && (e.preventDefault(), (e.returnValue = ""));
      });
  }
  setupTabNavigation() {
    document.querySelectorAll(".nav-tab").forEach((e) => {
      e.addEventListener("click", (t) => {
        this.switchTab(t.target.dataset.tab);
      });
    });
  }
  setupRangeSliders() {
    document.querySelectorAll(".range-slider").forEach((e) => {
      const t = () => {
        const t = e.parentElement.querySelector(".range-value");
        if (t) {
          let n = e.value,
            o = "";
          "autoCloseTime" === e.id
            ? (o = "s")
            : "detectionDelay" === e.id
            ? (o = "ms")
            : "searchTimeout" === e.id && (o = "s"),
            (t.textContent = n + o);
        }
      };
      e.addEventListener("input", t), t();
    });
  }
  switchTab(e) {
    document.querySelectorAll(".nav-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === e);
    }),
      document.querySelectorAll(".tab-content").forEach((t) => {
        t.classList.toggle("active", t.id === `${e}-tab`);
      }),
      (this.currentTab = e),
      chrome.storage.local.set({ lastActiveTab: e });
  }
  updateUI() {
    var e, t, n, o, i, a, s, l, r;
    (document.getElementById("extensionEnabled").checked =
      this.settings.enabled !== false),
      (document.getElementById("debugMode").checked =
        (null === (e = this.settings.advanced) || void 0 === e
          ? void 0
          : e.debugMode) || false),
      (document.getElementById("modalPosition").value =
        (null === (t = this.settings.notifications) || void 0 === t
          ? void 0
          : t.position) || "center"),
      (document.getElementById("autoCloseTime").value =
        ((null === (n = this.settings.timing) || void 0 === n
          ? void 0
          : n.autoCloseDelay) || 15e3) / 1e3);
    const c = this.settings.categories || {};
    document.querySelectorAll(".category-toggle").forEach((e) => {
      const t = e.dataset.category;
      (e.checked = c[t] !== false), this.updateCategoryCard(t, e.checked);
    }),
      (document.getElementById("modalNotifications").checked =
        (null === (o = this.settings.notifications) || void 0 === o
          ? void 0
          : o.modal) !== false),
      (document.getElementById("soundNotifications").checked =
        (null === (i = this.settings.notifications) || void 0 === i
          ? void 0
          : i.sound) || false),
      (document.getElementById("browserNotifications").checked =
        (null === (a = this.settings.notifications) || void 0 === a
          ? void 0
          : a.browser) || false),
      (document.getElementById("detectionDelay").value =
        (null === (s = this.settings.timing) || void 0 === s
          ? void 0
          : s.debounceDelay) || 800),
      (document.getElementById("maxSuggestions").value =
        (null === (l = this.settings.notifications) || void 0 === l
          ? void 0
          : l.maxPerSession) || 10),
      (document.getElementById("autoSearch").checked =
        (null === (r = this.settings.advanced) || void 0 === r
          ? void 0
          : r.autoSearch) !== false);
    const d = this.settings.advanced;
    (document.getElementById("externalSearch").checked =
      (null == d ? void 0 : d.externalSearch) !== false),
      (document.getElementById("cacheEnabled").checked =
        (null == d ? void 0 : d.cacheEnabled) !== false);
    const u = this.settings.timing;
    (document.getElementById("searchTimeout").value =
      ((null == u ? void 0 : u.searchTimeout) || 5e3) / 1e3);
    const m = this.settings.privacy;
    (document.getElementById("analyticsEnabled").checked =
      (null == m ? void 0 : m.analytics) !== false),
      (document.getElementById("errorLogging").checked =
        (null == m ? void 0 : m.errorLogging) !== false),
      (document.getElementById(
        "syncStorage"
      ).textContent = `${this.storageInfo.sync} KB`),
      (document.getElementById(
        "localStorage"
      ).textContent = `${this.storageInfo.local} KB`),
      (document.getElementById("totalSuggestions").textContent =
        this.statistics.totalModalShown || 0),
      (document.getElementById("totalAlternatives").textContent =
        this.statistics.totalAlternativesSelected || 0);
    const g = this.statistics.impactMetrics;
    (document.getElementById("co2Impact").textContent = `${(
      (null == g ? void 0 : g.estimatedCO2Saved) || 0
    ).toFixed(2)}kg`),
      this.restoreActiveTab();
  }
  async restoreActiveTab() {
    try {
      const e = await chrome.storage.local.get(["lastActiveTab"]);
      this.switchTab(e.lastActiveTab || "general");
    } catch (e) {
      this.switchTab("general");
    }
  }
  handleSettingChange(e) {
    (this.hasUnsavedChanges = true),
      this.updateSaveButton(),
      ["extensionEnabled"].includes(e.target.id) && this.saveAllSettings();
  }
  handleCategoryChange(e) {
    const t = e.target.dataset.category,
      n = e.target.checked;
    this.updateCategoryCard(t, n), this.handleSettingChange(e);
  }
  updateCategoryCard(e, t) {
    const n = document.querySelector(`[data-category="${e}"]`);
    n && n.classList.toggle("enabled", t);
  }
  toggleAllCategories(e) {
    document.querySelectorAll(".category-toggle").forEach((t) => {
      t.checked = e;
      const n = t.dataset.category;
      this.updateCategoryCard(n, e);
    }),
      (this.hasUnsavedChanges = true),
      this.updateSaveButton();
  }
  resetCategories() {
    if (confirm("Restaurar configurações de categoria para o padrão?")) {
      const e = window.SICOSIConstants.DEFAULT_SETTINGS.categories;
      document.querySelectorAll(".category-toggle").forEach((t) => {
        const n = t.dataset.category,
          o = e[n] !== false;
        (t.checked = o), this.updateCategoryCard(n, o);
      }),
        (this.hasUnsavedChanges = true),
        this.updateSaveButton();
    }
  }
  async saveAllSettings() {
    try {
      this.showLoading(true);
      const e = {
        enabled: document.getElementById("extensionEnabled").checked,
        categories: {},
        notifications: {
          modal: document.getElementById("modalNotifications").checked,
          sound: document.getElementById("soundNotifications").checked,
          browser: document.getElementById("browserNotifications").checked,
          position: document.getElementById("modalPosition").value,
          maxPerSession: parseInt(
            document.getElementById("maxSuggestions").value
          ),
        },
        advanced: {
          autoSearch: document.getElementById("autoSearch").checked,
          externalSearch: document.getElementById("externalSearch").checked,
          cacheEnabled: document.getElementById("cacheEnabled").checked,
          debugMode: document.getElementById("debugMode").checked,
        },
        timing: {
          autoCloseDelay:
            1e3 * parseInt(document.getElementById("autoCloseTime").value),
          debounceDelay: parseInt(
            document.getElementById("detectionDelay").value
          ),
          searchTimeout:
            1e3 * parseInt(document.getElementById("searchTimeout").value),
        },
        privacy: {
          analytics: document.getElementById("analyticsEnabled").checked,
          errorLogging: document.getElementById("errorLogging").checked,
        },
      };
      document.querySelectorAll(".category-toggle").forEach((t) => {
        e.categories[t.dataset.category] = t.checked;
      });
      const t = await chrome.runtime.sendMessage({
        type: "UPDATE_USER_SETTINGS",
        data: e,
      });
      if (t.error) throw new Error(t.error);
      (this.settings = e),
        (this.hasUnsavedChanges = false),
        this.updateSaveButton(),
        this.showToast("Configurações salvas com sucesso!", "success");
    } catch (e) {
      console.error("Options: Erro ao salvar:", e),
        this.showToast("Erro ao salvar configurações", "error");
    } finally {
      this.showLoading(false);
    }
  }
  updateSaveButton() {
    const e = document.getElementById("saveAllBtn");
    this.hasUnsavedChanges
      ? ((e.textContent = "💾 Salvar Alterações"),
        e.classList.add("btn-warning"),
        e.classList.remove("btn-primary"))
      : ((e.textContent = "💾 Salvar Tudo"),
        e.classList.add("btn-primary"),
        e.classList.remove("btn-warning"));
  }
  async exportData() {
    try {
      const e = await chrome.runtime.sendMessage({ type: "EXPORT_DATA" });
      if (e.error) throw new Error(e.error);
      const t = JSON.stringify(e, null, 2),
        n = new Blob([t], { type: "application/json" }),
        o = URL.createObjectURL(n),
        i = document.createElement("a");
      (i.href = o),
        (i.download = `SICOSI-backup-${new Date()
          .toISOString()
          .split("T")[0]}.json`),
        document.body.appendChild(i),
        i.click(),
        document.body.removeChild(i),
        URL.revokeObjectURL(o),
        this.showToast("Dados exportados com sucesso!", "success");
    } catch (e) {
      console.error("Options: Erro no export:", e),
        this.showToast("Erro ao exportar dados", "error");
    }
  }
  testModal() {
    alert(
      'Modal de teste: Esta seria uma sugestão sustentável para "copo descartável" → "copo biodegradável"'
    );
  }
  testSound() {
    new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMbBj2Y2/LLdSgFIHzL8N2SQgkPVLjo6qZVFAg+lt/xwmsiCzm06PCxWh0MGmK+7+WgWA4dTaXh6rFdGAg5kNT4znkfBSJ/yO7ZkzwIM06q5+OtXR0WOwgTOh"
    )
      .play()
      .catch(() => {
        this.showToast("Som de teste reproduzido (silencioso)", "success");
      });
  }
  async testBrowserNotification() {
    try {
      if (!("Notification" in window))
        throw new Error("Notificações não suportadas neste browser");
      let e = Notification.permission;
      "default" === e && (e = await Notification.requestPermission()),
        "granted" === e
          ? (new Notification("SICOSI - Teste", {
              body: "Esta é uma notificação de teste da extensão SICOSI",
              icon: chrome.runtime.getURL("assets/icons/icon48.png"),
            }),
            this.showToast("Notificação de teste enviada!", "success"))
          : new Error("Permissão de notificação negada");
    } catch (e) {
      this.showToast(`Erro no teste: ${e.message}`, "error");
    }
  }
  async clearCache() {
    if (
      confirm(
        "Limpar todo o cache da extensão? Isso pode reduzir a performance temporariamente."
      )
    )
      try {
        await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }),
          await this.loadStorageInfo(),
          this.updateUI(),
          this.showToast("Cache limpo com sucesso!", "success");
      } catch (e) {
        this.showToast("Erro ao limpar cache", "error");
      }
  }
  async clearLogs() {
    if (confirm("Limpar todos os logs da extensão?"))
      try {
        await chrome.storage.local.remove(["SICOSI-logs"]),
          await this.loadStorageInfo(),
          this.updateUI(),
          this.showToast("Logs limpos com sucesso!", "success");
      } catch (e) {
        this.showToast("Erro ao limpar logs", "error");
      }
  }
  async clearAllData() {
    if (
      confirm(
        "ATENÇÃO: Isso vai apagar TODOS os dados da extensão, incluindo configurações, estatísticas e cache.\n\nEsta ação não pode ser desfeita. Deseja continuar?"
      )
    )
      try {
        await Promise.all([
          chrome.storage.sync.clear(),
          chrome.storage.local.clear(),
        ]),
          this.showToast(
            "Todos os dados foram limpos. A página será recarregada.",
            "success"
          ),
          setTimeout(() => {
            window.location.reload();
          }, 2e3);
      } catch (e) {
        this.showToast("Erro ao limpar dados", "error");
      }
  }
  viewPrivacyPolicy() {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/privacy.html") });
  }
  async downloadUserData() {
    try {
      const e = await chrome.runtime.sendMessage({ type: "EXPORT_DATA" }),
        t = {
          settings: e.sync,
          statistics: e.local.SICOSIStatistics,
          exportDate: e.exportDate,
          version: e.version,
        },
        n = JSON.stringify(t, null, 2),
        o = new Blob([n], { type: "application/json" }),
        i = URL.createObjectURL(o),
        a = document.createElement("a");
      (a.href = i),
        (a.download = `SICOSI-meus-dados-${new Date()
          .toISOString()
          .split("T")[0]}.json`),
        document.body.appendChild(a),
        a.click(),
        document.body.removeChild(a),
        URL.revokeObjectURL(i),
        this.showToast("Seus dados foram baixados!", "success");
    } catch (e) {
      this.showToast("Erro ao baixar dados", "error");
    }
  }
  openHelpPage() {
    chrome.tabs.create({
      url: "https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente#readme",
    });
  }
  showLoading(e) {
    document.getElementById("loadingOverlay").classList.toggle("hidden", !e);
  }
  showToast(e, t = "success") {
    const n = "success" === t ? "successToast" : "errorToast",
      o = document.getElementById(n);
    (o.querySelector(".toast-message").textContent = e),
      o.classList.remove("hidden"),
      setTimeout(() => {
        o.classList.add("hidden");
      }, 3e3);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  new OptionsManager().init();
});
