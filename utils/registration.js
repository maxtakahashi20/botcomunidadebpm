const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

function getPatenteOptions(config) {
  const patentes = config.onApprove?.patentes || {};
  return Object.entries(patentes)
    .sort((a, b) => (b[1].rank || 0) - (a[1].rank || 0))
    .map(([value, item]) => ({
      label: (item.insignia || item.label || value).slice(0, 100),
      value,
      description: (item.label || value).slice(0, 100),
      emoji: undefined
    }));
}

function getCategoriaBpmOptions(config) {
  const categorias = config.categoriasBpm || {};
  return Object.entries(categorias).map(([value, item]) => ({
    label: (item.label || value).slice(0, 100),
    value,
    description: `Prefixo: ${item.channelPrefix || "📁"}`,
    emoji: undefined
  }));
}

function resolveCategoriaBpm(config, categoriaKey) {
  const categorias = config.categoriasBpm || {};
  return categorias[categoriaKey] ? { key: categoriaKey, ...categorias[categoriaKey] } : null;
}

function buildPatenteSelectRow(config) {
  const options = getPatenteOptions(config);
  if (!options.length) return null;

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_select_patente")
      .setPlaceholder("Selecione sua insignia...")
    .addOptions(options.slice(0, 25));

  return new ActionRowBuilder().addComponents(menu);
}

function buildCategoriaExistenteSelectRow(config, patenteKey) {
  const options = getCategoriaBpmOptions(config);
  if (!options.length) return null;

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`ticket_select_categoria_exist_${patenteKey}`)
    .setPlaceholder("Selecione a categoria do BPM...")
    .addOptions(options.slice(0, 25));

  return new ActionRowBuilder().addComponents(menu);
}

function buildOpenFormButton(patenteKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_abrir_form__${patenteKey}`)
      .setLabel("Preencher formulário")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📋")
  );
}

function parseOpenFormButton(customId) {
  const match = customId.match(/^ticket_abrir_form__(.+)$/);
  if (!match) return null;
  return { patenteKey: match[1] };
}

function buildCadastrarBpmModalId(patenteKey) {
  return `modal_ticket_cadastrar_bpm__${patenteKey}`;
}

function parseCadastrarBpmModalId(customId) {
  const match = customId.match(/^modal_ticket_cadastrar_bpm__(.+)$/);
  if (!match) return { patenteKey: null };
  return { patenteKey: match[1] };
}

module.exports = {
  getPatenteOptions,
  getCategoriaBpmOptions,
  resolveCategoriaBpm,
  buildPatenteSelectRow,
  buildCategoriaExistenteSelectRow,
  buildOpenFormButton,
  parseOpenFormButton,
  buildCadastrarBpmModalId,
  parseCadastrarBpmModalId
};
