const fs = require("node:fs");
const path = require("node:path");

function loadConfig() {
  const configPath = path.join(__dirname, "config.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const cfg = JSON.parse(raw);

  if (!cfg.guildId) throw new Error("config.guildId ausente em config/config.json");
  if (!Array.isArray(cfg.allowedRoleIds)) throw new Error("config.allowedRoleIds deve ser um array");
  if (!cfg.ticketPanelChannelId && !cfg.panelChannelId) {
    throw new Error("config.ticketPanelChannelId ausente em config/config.json");
  }
  if (!cfg.requestsChannelId) throw new Error("config.requestsChannelId ausente em config/config.json");
  if (!cfg.ticketCategoryId) throw new Error("config.ticketCategoryId ausente em config/config.json");

  if (cfg.onApprove) {
    if (!cfg.onApprove.policiaRoleId) {
      console.warn("[config] onApprove.policiaRoleId não definido — cargo Polícia não será aplicado.");
    }
    if (!cfg.onApprove.patentes || typeof cfg.onApprove.patentes !== "object") {
      console.warn("[config] onApprove.patentes ausente — seleção de patente desabilitada.");
    }
  }

  return cfg;
}

module.exports = { loadConfig };
