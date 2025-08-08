/**
 * ZENDESK MONITOR PROFESSIONAL - CONTENT SCRIPT
 * Script que roda nas páginas do Zendesk
 */

class ZendeskMonitor {
  constructor() {
    // Configurações
    this.SELECTORS = {
      REFRESH_BUTTON: 'button[data-test-id="views_views-list_header-refresh"]',
      NEW_BADGE: 'div[data-test-id="status-badge-new"]',
      OPEN_BADGE: 'div[data-test-id="status-badge-open"]',
      PENDING_BADGE: 'div[data-test-id="status-badge-pending"]',
      HOLD_BADGE: 'div[data-test-id="status-badge-hold"]',
      VIEW_COUNT: 'div[data-test-id="views_views-list_item_count"]',
      VIEW_NAME: 'div[class*="sc-7eoxjw-0"]',
    };

    this.VIEWS_CONTAINER_XPATH =
      '//*[@id=":r4:--primary-pane"]/div[1]/nav/ul/div/li/div/ul';

    // Estado do sistema
    this.lastCounts = { new: 0, open: 0, pending: 0, hold: 0 };
    this.lastViewCounts = {};
    this.lastUpdate = new Date();
    this.isPaused = false;
    this.isMuted = false;
    this.currentInterval = 5000;
    this.enableViewMonitoring = true;
    this.selectedViews = {};
    this.allAvailableViews = {};
    this.intervalId = null;
    this.volume = 0.7;

    // Audio para notificações
    this.audio = null;
    this.initAudio();

    this.init();
  }

  async init() {
    console.log("🔧 Zendesk Monitor Professional iniciando...");

    // Carrega configurações
    await this.loadSettings();

    // Configura listener para mensagens
    this.setupMessageListener();

    // Aguarda a página carregar
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.start());
    } else {
      setTimeout(() => this.start(), 2000);
    }
  }

  initAudio() {
    try {
      // Usa um som de notificação padrão ou CDN público
      this.audio = new Audio(
        "https://notificationsounds.com/storage/sounds/file-sounds-1147-that-was-quick.ogg"
      );
      this.audio.volume = this.volume;
    } catch (error) {
      console.warn("Erro ao inicializar áudio:", error);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get({
        interval: 5,
        volume: 0.7,
        isPaused: false,
        isMuted: false,
        enableViewMonitoring: true,
        selectedViews: {},
      });

      this.currentInterval = result.interval * 1000;
      this.volume = result.volume;
      this.isPaused = result.isPaused;
      this.isMuted = result.isMuted;
      this.enableViewMonitoring = result.enableViewMonitoring;
      this.selectedViews = result.selectedViews;

      if (this.audio) {
        this.audio.volume = this.volume;
      }

      console.log("⚙️ Configurações carregadas:", {
        interval: this.currentInterval / 1000,
        volume: this.volume,
        isPaused: this.isPaused,
        isMuted: this.isMuted,
        enableViewMonitoring: this.enableViewMonitoring,
      });
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        interval: this.currentInterval / 1000,
        volume: this.volume,
        isPaused: this.isPaused,
        isMuted: this.isMuted,
        enableViewMonitoring: this.enableViewMonitoring,
        selectedViews: this.selectedViews,
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("📨 Mensagem recebida:", request.action);

      switch (request.action) {
        case "ping":
          sendResponse({ success: true, message: "Content script ativo" });
          break;

        case "getData":
          sendResponse({
            success: true,
            data: {
              tickets: this.lastCounts,
              views: this.lastViewCounts,
              lastUpdate: this.lastUpdate.toISOString(),
              isPaused: this.isPaused,
              isMuted: this.isMuted,
              enableViewMonitoring: this.enableViewMonitoring,
            },
          });
          break;

        case "togglePause":
          this.togglePause();
          sendResponse({ success: true, isPaused: this.isPaused });
          break;

        case "toggleMute":
          this.toggleMute();
          sendResponse({ success: true, isMuted: this.isMuted });
          break;

        case "updateInterval":
          this.updateInterval(request.interval);
          sendResponse({ success: true });
          break;

        case "updateVolume":
          this.updateVolume(request.volume);
          sendResponse({ success: true });
          break;

        case "getAvailableViews":
          sendResponse({
            success: true,
            views: this.allAvailableViews,
            selectedViews: this.selectedViews,
          });
          break;

        case "toggleView":
          this.toggleViewSelection(request.viewName);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: "Ação não reconhecida" });
      }

      return true; // Mantém a conexão aberta para respostas assíncronas
    });
  }

  start() {
    console.log("🚀 Iniciando monitoramento...");

    // Captura estado inicial
    this.lastCounts = this.getCurrentCounts();
    this.lastViewCounts = this.enableViewMonitoring ? this.getViewCounts() : {};

    console.log("📊 Estado inicial:", {
      tickets: this.lastCounts,
      views: Object.keys(this.lastViewCounts).length,
    });

    // Inicia ciclo de monitoramento
    this.restartInterval();

    // Primeiro ciclo após 2 segundos
    setTimeout(() => this.cycle(), 2000);
  }

  // ========================================================================
  // FUNÇÕES UTILITÁRIAS PARA DOM
  // ========================================================================

  getElementByXPath(xpath) {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    } catch (error) {
      console.warn("Erro ao avaliar XPath:", xpath, error);
      return null;
    }
  }

  // ========================================================================
  // MONITORAMENTO DE TICKETS
  // ========================================================================

  getCurrentCounts() {
    const counts = {
      new: document.querySelectorAll(this.SELECTORS.NEW_BADGE).length,
      open: 0,
      pending: document.querySelectorAll(this.SELECTORS.PENDING_BADGE).length,
      hold: document.querySelectorAll(this.SELECTORS.HOLD_BADGE).length,
    };

    // Processa badges de tickets "Aberto" e "Cliente Respondeu"
    document.querySelectorAll(this.SELECTORS.OPEN_BADGE).forEach((badge) => {
      const text = badge.textContent.trim();
      if (text === "Aberto" || text === "Cliente Respondeu") {
        counts.open++;
      }
    });

    return counts;
  }

  // ========================================================================
  // MONITORAMENTO DE VIEWS
  // ========================================================================

  getViewCounts() {
    const viewCounts = {};

    try {
      const viewsContainer = this.getElementByXPath(this.VIEWS_CONTAINER_XPATH);
      if (!viewsContainer) {
        console.log("Container de views não encontrado");
        return viewCounts;
      }

      const viewItems = viewsContainer.querySelectorAll("li > div");
      console.log(`🔍 Encontradas ${viewItems.length} views`);

      viewItems.forEach((item, index) => {
        try {
          const nameElement = item.querySelector(this.SELECTORS.VIEW_NAME);
          const countElement = item.querySelector(this.SELECTORS.VIEW_COUNT);

          if (nameElement && countElement) {
            const viewName = nameElement.textContent.trim();
            const countText = countElement.textContent.trim();
            const count = parseInt(countText) || 0;

            if (viewName) {
              // Registra como view disponível
              this.allAvailableViews[viewName] = true;

              // Inclui apenas se selecionada para monitoramento
              if (this.selectedViews[viewName] !== false) {
                viewCounts[viewName] = count;
              }
            }
          }
        } catch (itemError) {
          console.warn(`Erro ao processar view ${index + 1}:`, itemError);
        }
      });

      console.log(`📊 Views monitoradas: ${Object.keys(viewCounts).length}`);
    } catch (error) {
      console.error("Erro ao buscar contadores das views:", error);
    }

    return viewCounts;
  }

  // ========================================================================
  // NOTIFICAÇÕES
  // ========================================================================

  async notifyUser(message) {
    // Notificação do navegador
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("Zendesk Monitor", {
          body: message,
          icon: chrome.runtime.getURL("icons/icon48.png"),
          requireInteraction: false,
          silent: false,
        });
      }
    } catch (error) {
      console.warn("Erro ao enviar notificação:", error);
    }

    // Som de notificação
    if (this.audio) {
      try {
        await this.audio.play();
      } catch (error) {
        console.warn("Erro ao reproduzir som:", error);
      }
    }

    // Notificação da extensão
    try {
      chrome.runtime.sendMessage({
        action: "showNotification",
        message: message,
      });
    } catch (error) {
      console.warn("Erro ao enviar notificação para background:", error);
    }
  }

  // ========================================================================
  // CONTROLES
  // ========================================================================

  togglePause() {
    this.isPaused = !this.isPaused;
    console.log(`⏸️ Monitor ${this.isPaused ? "pausado" : "retomado"}`);
    this.saveSettings();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    console.log(`🔇 Notificações ${this.isMuted ? "silenciadas" : "ativadas"}`);
    this.saveSettings();
  }

  updateInterval(newInterval) {
    this.currentInterval = newInterval * 1000;
    console.log(`⏱️ Intervalo alterado para ${newInterval}s`);
    this.restartInterval();
    this.saveSettings();
  }

  updateVolume(newVolume) {
    this.volume = newVolume;
    if (this.audio) {
      this.audio.volume = newVolume;
    }
    console.log(`🔊 Volume alterado para ${Math.floor(newVolume * 100)}%`);
    this.saveSettings();
  }

  toggleViewSelection(viewName) {
    if (this.selectedViews[viewName] === false) {
      this.selectedViews[viewName] = true;
    } else {
      this.selectedViews[viewName] = false;
    }

    console.log(
      `👀 View "${viewName}" ${
        this.selectedViews[viewName] ? "ativada" : "desativada"
      }`
    );
    this.saveSettings();
  }

  // ========================================================================
  // INTERAÇÃO COM ZENDESK
  // ========================================================================

  clickRefresh() {
    const refreshButton = document.querySelector(this.SELECTORS.REFRESH_BUTTON);
    if (refreshButton) {
      refreshButton.click();
      return true;
    }
    console.warn("Botão de atualização não encontrado");
    return false;
  }

  // ========================================================================
  // LÓGICA PRINCIPAL
  // ========================================================================

  checkForUpdates() {
    const currentCounts = this.getCurrentCounts();
    const currentViewCounts = this.enableViewMonitoring
      ? this.getViewCounts()
      : {};

    if (!this.isMuted) {
      const notifications = [];

      // Verifica mudanças nos tickets
      const statusTypes = [
        { key: "new", label: "Novo" },
        { key: "open", label: "Aberto/Cliente Respondeu" },
        { key: "pending", label: "Pendente" },
        { key: "hold", label: "Em espera" },
      ];

      statusTypes.forEach(({ key, label }) => {
        if (currentCounts[key] > this.lastCounts[key]) {
          const difference = currentCounts[key] - this.lastCounts[key];
          const message = `${difference} novo(s) ticket(s) "${label}"`;
          notifications.push(message);
        }
      });

      // Verifica mudanças nas views
      if (this.enableViewMonitoring) {
        Object.keys(currentViewCounts).forEach((viewName) => {
          const currentCount = currentViewCounts[viewName];
          const lastCount = this.lastViewCounts[viewName] || 0;

          if (currentCount > lastCount) {
            const difference = currentCount - lastCount;
            const cleanViewName = viewName.replace("👀", "").trim();
            const message = `${difference} novo(s) ticket(s) em "${cleanViewName}"`;
            notifications.push(message);
          }
        });
      }

      // Envia notificações
      notifications.forEach((message) => {
        console.log("🔔", message);
        this.notifyUser(message);
      });
    }

    // Atualiza estados
    this.lastCounts = currentCounts;
    this.lastViewCounts = currentViewCounts;

    // Envia dados atualizados para o background script
    try {
      chrome.runtime.sendMessage({
        action: "updateData",
        data: {
          tickets: currentCounts,
          views: currentViewCounts,
          lastUpdate: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.warn("Erro ao enviar dados para background:", error);
    }
  }

  cycle() {
    if (this.isPaused) return;

    console.log("🔄 Executando ciclo de monitoramento...");

    if (this.clickRefresh()) {
      this.lastUpdate = new Date();
      // Aguarda 2 segundos para a página carregar
      setTimeout(() => this.checkForUpdates(), 2000);
    }
  }

  restartInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => this.cycle(), this.currentInterval);
    console.log(
      `⏰ Intervalo configurado para ${this.currentInterval / 1000}s`
    );
  }
}

// Inicializa apenas uma instância
if (!window.zendeskMonitor) {
  window.zendeskMonitor = new ZendeskMonitor();
}
