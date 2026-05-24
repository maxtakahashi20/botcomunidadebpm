const { ChannelType } = require("discord.js");
const { slugifyChannelName, isSnowflake } = require("./battalion");

const PARTNER_KEYS = ["criador_parceiro", "cidade_parceira", "loja_parceira"];

function isParceiroCategory(categoryKey) {
  return PARTNER_KEYS.includes(categoryKey);
}

function getParceiroConfig(config, categoryKey) {
  return config.parceiros?.[categoryKey] || null;
}

async function resolveParceiroCategory(guild, config, categoryKey) {
  const changes = [];
  const parceiro = getParceiroConfig(config, categoryKey);

  if (!parceiro?.categoryId) {
    changes.push(`- Categoria não configurada para \`${categoryKey}\` em config.parceiros.`);
    return { category: null, changes };
  }

  const found = await guild.channels.fetch(parceiro.categoryId).catch(() => null);
  if (found?.type === ChannelType.GuildCategory) {
    return { category: found, changes };
  }

  changes.push(`- Categoria \`${parceiro.categoryId}\` não encontrada.`);
  return { category: null, changes };
}

function buildParceiroChannelName(categoryKey, data) {
  const nome = slugifyChannelName(data.nomeEstado || "parceiro");

  if (categoryKey === "criador_parceiro") {
    return `📹┋${nome}`.slice(0, 100);
  }

  if (categoryKey === "cidade_parceira") {
    return `🏢┋${nome}`.slice(0, 100);
  }

  if (categoryKey === "loja_parceira") {
    const emoji = String(data.emojiLoja || "").trim();
    return `${emoji}${emoji ? "" : ""}┋${nome}`.slice(0, 100);
  }

  return nome.slice(0, 100);
}

async function createParceiroChannel(guild, config, categoryKey, data, category, member) {
  const channelName = buildParceiroChannelName(categoryKey, data);
  const topic = [data.discord, data.cidade, data.comandante].filter(Boolean).join(" • ").slice(0, 1024);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: topic || `Parceiro — ${data.nomeEstado || categoryKey}`,
    reason: `Parceiro: canal criado na aprovação — ${categoryKey}`
  });

  if (member) {
    await channel.permissionOverwrites
      .edit(member, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      })
      .catch(() => {});
  }

  return channel;
}

async function applyParceiroApproval(member, config, data, guild, categoryKey) {
  const { addRolesSafely } = require("./approve");
  const changes = [];
  const roleIds = [];

  const globalRoleId = config.parceiros?.globalRoleId;
  if (globalRoleId) {
    roleIds.push(globalRoleId);
  }

  const parceiroCfg = getParceiroConfig(config, categoryKey);
  if (parceiroCfg?.roleId) {
    roleIds.push(parceiroCfg.roleId);
  } else {
    changes.push(`- Cargo de \`${categoryKey}\` não configurado em config.parceiros.`);
  }

  await addRolesSafely(member, roleIds, `Parceiro: aprovação — ${categoryKey}`, changes);

  const { category, changes: catChanges } = await resolveParceiroCategory(guild, config, categoryKey);
  changes.push(...catChanges);

  let createdChannel = null;
  if (category) {
    try {
      createdChannel = await createParceiroChannel(guild, config, categoryKey, data, category, member);
      changes.push(`- Canal **#${createdChannel.name}** criado em **${category.name}**`);
    } catch (err) {
      changes.push(`- Erro ao criar canal: ${err?.message || "permissão/hierarquia"}`);
    }
  }

  return { changes, createdChannel };
}

module.exports = {
  PARTNER_KEYS,
  isParceiroCategory,
  getParceiroConfig,
  buildParceiroChannelName,
  applyParceiroApproval
};
