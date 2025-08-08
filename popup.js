/**
 * ZENDESK MONITOR PROFESSIONAL - POPUP
 * Interface principal da extensão
 */

class ZendeskPopup {
  constructor() {
    this.isConnected = false;
    this.currentTab = null;
    this.data = {
      tickets: { new: 0, open: 0, pending: 0, hold: 0 },
      views: {},
      status: {
        isPaused: false,
        isMuted: false,
        lastUpdate: null,
        enableViewMonitoring: true,
      },
      settings: {
        interval: 5,
        volume: 0.7,
        darkTheme: false,
      },
    };

    this.init();
  }

  async init() {
    await this.setupElements();
    await this.loadSettings();
    await this.checkConnection();
    this.setupEventListeners();
    this.startDataPolling();
  }

  setupElements() {
    // Estados
    this.loadingState = document.getElementById("loading-state");
    this.mainContent = document.getElementById("main-content");
    this.errorState = document.getElementById("error-state");

    // Conexão
    this.connectionDot = document.getElementById("connection-dot");
    this.connectionText = document.getElementById("connection-text");

    // Status
    this.statusInfo = document.getElementById("status-info");

    // Tickets
    this.newCount = document.getElementById("new-count");
    this.openCount = document.getElementById("open-count");
    this.pendingCount = document.getElementById("pending-count");
    this.holdCount = document.getElementById("hold-count");

    // Views
    this.viewsContent = document.getElementById("views-content");
    this.viewSelection = document.getElementById("view-selection");
    this.viewCheckboxes = document.getElementById("view-checkboxes");

    // Controles
    this.pauseBtn = document.getElementById("pause-btn");
    this.muteBtn = document.getElementById("mute-btn");
    this.intervalInput = document.getElementById("interval-input");
    this.volumeSlider = document.getElementById("volume-slider");
    this.volumeDisplay = document.getElementById("volume-display");
    this.toggleThemeBtn = document.getElementById("toggle-theme");
    this.configureViewsBtn = document.getElementById("configure-views");
    this.closeViewSelectionBtn = document.getElementById(
      "close-view-selection"
    );
    this.retryBtn = document.getElementById("retry-btn");
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get({
        interval: 5,
        volume: 0.7,
        darkTheme: false,
        isPaused: false,
        isMuted: false,
        enableViewMonitoring: true,
      });

      this.data.settings = {
        interval: result.interval,
        volume: result.volume,
        darkTheme: result.darkTheme,
      };

      this.data.status = {
        isPaused: result.isPaused,
        isMuted: result.isMuted,
        enableViewMonitoring: result.enableViewMonitoring,
        lastUpdate: null,
      };

      this.applyTheme();
      this.updateControls();
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        interval: this.data.settings.interval,
        volume: this.data.settings.volume,
        darkTheme: this.data.settings.darkTheme,
        isPaused: this.data.status.isPaused,
        isMuted: this.data.status.isMuted,
        enableViewMonitoring: this.data.status.enableViewMonitoring,
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
    }
  }

  async checkConnection() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.url.includes("zendesk.com")) {
        this.showErrorState("Abra uma página do Zendesk para usar a extensão");
        return;
      }

      this.currentTab = tab;

      // Injeta o content script se necessário
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      // Tenta conectar com o content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "ping",
      });

      if (response && response.success) {
        this.isConnected = true;
        this.showMainContent();
        this.updateConnectionStatus(true);
      } else {
        throw new Error("Content script não respondeu");
      }
    } catch (error) {
      console.error("Erro na conexão:", error);
      this.showErrorState("Erro ao conectar com o Zendesk");
    }
  }

  showLoadingState() {
    this.loadingState.classList.remove("hidden");
    this.mainContent.classList.add("hidden");
    this.errorState.classList.add("hidden");
  }

  showMainContent() {
    this.loadingState.classList.add("hidden");
    this.mainContent.classList.remove("hidden");
    this.errorState.classList.add("hidden");
  }

  showErrorState(message) {
    this.loadingState.classList.add("hidden");
    this.mainContent.classList.add("hidden");
    this.errorState.classList.remove("hidden");
    this.errorState.querySelector("p").textContent = message;
  }

  updateConnectionStatus(connected) {
    this.isConnected = connected;

    if (connected) {
      this.connectionDot.classList.add("connected");
      this.connectionText.textContent = "Conectado ao Zendesk";
    } else {
      this.connectionDot.classList.remove("connected");
      this.connectionDot.classList.add("error");
      this.connectionText.textContent = "Desconectado";
    }
  }

  applyTheme() {
    document.body.className = this.data.settings.darkTheme ? "dark" : "light";
    this.toggleThemeBtn.textContent = this.data.settings.darkTheme
      ? "Tema Claro"
      : "Tema Escuro";
  }

  updateControls() {
    // Botão de pausa
    this.pauseBtn.textContent = this.data.status.isPaused
      ? "Retomar"
      : "Pausar";
    this.pauseBtn.className = this.data.status.isPaused
      ? "btn success"
      : "btn warning";

    // Botão de silenciar
    this.muteBtn.textContent = this.data.status.isMuted
      ? "Desilenciar"
      : "Silenciar";
    this.muteBtn.className = this.data.status.isMuted
      ? "btn success"
      : "btn danger";

    // Controles de configuração
    this.intervalInput.value = this.data.settings.interval;
    this.volumeSlider.value = Math.floor(this.data.settings.volume * 100);
    this.volumeDisplay.textContent = `${Math.floor(
      this.data.settings.volume * 100
    )}%`;
  }

  updateTicketStats() {
    const { tickets } = this.data;
    this.newCount.textContent = tickets.new;
    this.openCount.textContent = tickets.open;
    this.pendingCount.textContent = tickets.pending;
    this.holdCount.textContent = tickets.hold;
  }

  updateViewsDisplay() {
    const { views } = this.data;
    const viewNames = Object.keys(views);

    if (viewNames.length === 0 || !this.data.status.enableViewMonitoring) {
      this.viewsContent.innerHTML =
        '<p class="empty-state">Nenhuma view sendo monitorada</p>';
      return;
    }

    const totalViews = Object.values(views).reduce(
      (sum, count) => sum + count,
      0
    );

    let html = `<div style="margin-bottom: 8px; font-weight: 500;">Total: ${totalViews} tickets</div>`;

    viewNames.forEach((name) => {
      const cleanName = name.replace("👀", "").trim();
      html += `
                <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px;">
                    <span>${cleanName}</span>
                    <span style="font-weight: 500;">${views[name]}</span>
                </div>
            `;
    });

    this.viewsContent.innerHTML = html;
  }

  updateStatusInfo() {
    if (!this.data.status.lastUpdate) {
      this.statusInfo.textContent = "Aguardando primeira atualização...";
      return;
    }

    const diffSec = Math.floor(
      (new Date() - new Date(this.data.status.lastUpdate)) / 1000
    );
    let status = `Última atualização: ${diffSec}s atrás`;

    if (this.data.status.isMuted) status += " | Silenciado";
    if (this.data.status.isPaused) status += " | Pausado";

    this.statusInfo.textContent = status;
  }

  setupEventListeners() {
    // Controles principais
    this.pauseBtn.addEventListener("click", () => this.togglePause());
    this.muteBtn.addEventListener("click", () => this.toggleMute());

    // Configurações
    this.intervalInput.addEventListener("change", (e) =>
      this.updateInterval(e.target.value)
    );
    this.volumeSlider.addEventListener("input", (e) =>
      this.updateVolume(e.target.value)
    );
    this.toggleThemeBtn.addEventListener("click", () => this.toggleTheme());

    // Views
    this.configureViewsBtn.addEventListener("click", () =>
      this.showViewSelection()
    );
    this.closeViewSelectionBtn.addEventListener("click", () =>
      this.hideViewSelection()
    );

    // Reconectar
    this.retryBtn.addEventListener("click", () => {
      this.showLoadingState();
      this.checkConnection();
    });
  }

  async sendMessage(action, data = {}) {
    if (!this.isConnected || !this.currentTab) return null;

    try {
      return await chrome.tabs.sendMessage(this.currentTab.id, {
        action,
        ...data,
      });
    } catch (error) {
      console.error(`Erro ao enviar mensagem ${action}:`, error);
      this.updateConnectionStatus(false);
      return null;
    }
  }

  async togglePause() {
    const response = await this.sendMessage("togglePause");
    if (response && response.success) {
      this.data.status.isPaused = response.isPaused;
      this.updateControls();
      this.saveSettings();
    }
  }

  async toggleMute() {
    const response = await this.sendMessage("toggleMute");
    if (response && response.success) {
      this.data.status.isMuted = response.isMuted;
      this.updateControls();
      this.saveSettings();
    }
  }

  async updateInterval(newInterval) {
    const interval = parseInt(newInterval);
    if (interval < 1 || interval > 60) {
      this.intervalInput.value = this.data.settings.interval;
      return;
    }

    const response = await this.sendMessage("updateInterval", { interval });
    if (response && response.success) {
      this.data.settings.interval = interval;
      this.saveSettings();
    }
  }

  async updateVolume(newVolume) {
    const volume = parseInt(newVolume) / 100;
    this.data.settings.volume = volume;
    this.volumeDisplay.textContent = `${Math.floor(volume * 100)}%`;

    await this.sendMessage("updateVolume", { volume });
    this.saveSettings();
  }

  toggleTheme() {
    this.data.settings.darkTheme = !this.data.settings.darkTheme;
    this.applyTheme();
    this.saveSettings();
  }

  async showViewSelection() {
    const response = await this.sendMessage("getAvailableViews");
    if (!response || !response.success) return;

    this.updateViewSelectionList(response.views, response.selectedViews);
    this.viewSelection.style.display = "block";
  }

  hideViewSelection() {
    this.viewSelection.style.display = "none";
  }

  updateViewSelectionList(availableViews, selectedViews) {
    this.viewCheckboxes.innerHTML = "";

    Object.keys(availableViews).forEach((viewName) => {
      const isSelected = selectedViews[viewName] !== false;
      const cleanName = viewName.replace("👀", "").trim();

      const item = document.createElement("div");
      item.className = `view-item ${isSelected ? "selected" : ""}`;

      item.innerHTML = `
                <span class="view-name">${cleanName}</span>
                <span class="view-toggle ${isSelected ? "selected" : ""}">${
        isSelected ? "✓" : "×"
      }</span>
            `;

      item.addEventListener("click", async () => {
        const response = await this.sendMessage("toggleView", { viewName });
        if (response && response.success) {
          this.showViewSelection(); // Refresh the list
        }
      });

      this.viewCheckboxes.appendChild(item);
    });
  }

  async fetchData() {
    if (!this.isConnected) return;

    const response = await this.sendMessage("getData");
    if (!response || !response.success) {
      this.updateConnectionStatus(false);
      return;
    }

    // Atualiza dados locais
    this.data.tickets = response.data.tickets;
    this.data.views = response.data.views;
    this.data.status.lastUpdate = response.data.lastUpdate;
    this.data.status.isPaused = response.data.isPaused;
    this.data.status.isMuted = response.data.isMuted;
    this.data.status.enableViewMonitoring = response.data.enableViewMonitoring;

    // Atualiza interface
    this.updateTicketStats();
    this.updateViewsDisplay();
    this.updateStatusInfo();
    this.updateControls();
    this.updateConnectionStatus(true);
  }

  startDataPolling() {
    // Busca dados imediatamente
    this.fetchData();

    // Depois a cada 2 segundos
    setInterval(() => {
      this.fetchData();
    }, 2000);
  }
}

// Inicializa o popup quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  new ZendeskPopup();
});

// Atualiza badge da extensão baseado no estado
async function updateBadge(tickets) {
  try {
    const criticalCount = tickets.new + tickets.open;

    if (criticalCount > 0) {
      await chrome.action.setBadgeText({
        text: criticalCount > 99 ? "99+" : criticalCount.toString(),
      });
      await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    console.error("Erro ao atualizar badge:", error);
  }
}
