/**
 * ZENDESK MONITOR PROFESSIONAL - BACKGROUND SCRIPT
 * Service Worker para gerenciar notificações e badge da extensão
 */

class ZendeskBackground {
  constructor() {
    this.currentData = {
      tickets: { new: 0, open: 0, pending: 0, hold: 0 },
      views: {},
      lastUpdate: null,
    };

    this.init();
  }

  init() {
    console.log("🏗️ Background script inicializado");

    // Configura listeners
    this.setupMessageListener();
    this.setupInstallListener();

    // Inicializa badge
    this.updateBadge(this.currentData.tickets);
  }

  setupInstallListener() {
    // Listener para quando a extensão é instalada
    chrome.runtime.onInstalled.addListener((details) => {
      console.log("✅ Zendesk Monitor Professional instalado");

      if (details.reason === "install") {
        // Configurações padrão na primeira instalação
        chrome.storage.local.set({
          interval: 5,
          volume: 0.7,
          darkTheme: false,
          isPaused: false,
          isMuted: false,
          enableViewMonitoring: true,
          selectedViews: {},
        });

        // Abre uma aba de boas-vindas (opcional)
        // chrome.tabs.create({ url: 'https://example.com/welcome' });
      }
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("📨 Background recebeu:", request.action);

      switch (request.action) {
        case "updateData":
          this.handleDataUpdate(request.data);
          sendResponse({ success: true });
          break;

        case "showNotification":
          this.showNotification(request.message, request.title);
          sendResponse({ success: true });
          break;

        case "getBadgeText":
          chrome.action.getBadgeText({}, (text) => {
            sendResponse({ success: true, text: text });
          });
          return true; // Indica resposta assíncrona

        default:
          sendResponse({ success: false, error: "Ação não reconhecida" });
      }

      return true;
    });
  }

  handleDataUpdate(data) {
    // Atualiza dados internos
    this.currentData = {
      tickets: data.tickets,
      views: data.views,
      lastUpdate: data.lastUpdate,
    };

    // Atualiza badge da extensão
    this.updateBadge(data.tickets);

    console.log("📊 Dados atualizados:", data);
  }

  async updateBadge(tickets) {
    try {
      const criticalCount = tickets.new + tickets.open;

      if (criticalCount > 0) {
        // Exibe contagem de tickets críticos
        const badgeText = criticalCount > 99 ? "99+" : criticalCount.toString();

        await chrome.action.setBadgeText({ text: badgeText });
        await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" }); // Vermelho

        // Atualiza título do badge
        const title = `Zendesk Monitor - ${criticalCount} ticket(s) crítico(s)`;
        await chrome.action.setTitle({ title: title });
      } else {
        // Remove badge quando não há tickets críticos
        await chrome.action.setBadgeText({ text: "" });
        await chrome.action.setTitle({ title: "Zendesk Monitor Professional" });
      }
    } catch (error) {
      console.error("Erro ao atualizar badge:", error);
    }
  }

  async showNotification(message, title = "Zendesk Monitor") {
    try {
      // Verifica se as notificações estão permitidas
      const permission = await chrome.notifications.getPermissionLevel();

      if (permission === "granted") {
        const notificationId = "zendesk-" + Date.now();

        await chrome.notifications.create(notificationId, {
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: title,
          message: message,
          priority: 1,
        });

        // Remove a notificação após 5 segundos
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, 5000);

        console.log("🔔 Notificação enviada:", message);
      }
    } catch (error) {
      console.error("Erro ao mostrar notificação:", error);
    }
  }

  // Método para obter dados atuais (útil para debugging)
  getCurrentData() {
    return this.currentData;
  }
}

// Inicializa o background script
const zendeskBackground = new ZendeskBackground();

// Expose globalmente para debugging (opcional)
if (typeof globalThis !== "undefined") {
  globalThis.zendeskBackground = zendeskBackground;
}
