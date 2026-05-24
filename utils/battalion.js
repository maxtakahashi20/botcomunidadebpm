const { ChannelType } = require("discord.js");

function slugifyChannelName(value) {
  return (
    String(value || "bpm")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "bpm"
  );
}

function findCategoriaConfig(config, data) {
  const categorias = config.categoriasBpm || {};

  if (data.categoriaKey && categorias[data.categoriaKey]) {
    return { key: data.categoriaKey, ...categorias[data.categoriaKey] };
  }

  if (data.categoriaId) {
    const entry = Object.entries(categorias).find(([, item]) => item.categoryId === data.categoriaId);
    if (entry) return { key: entry[0], ...entry[1] };
  }

  if (data.categoriaLabel) {
    const labelLower = data.categoriaLabel.toLowerCase();
    const entry = Object.entries(categorias).find(
      ([, item]) => item.label?.toLowerCase() === labelLower
    );
    if (entry) return { key: entry[0], ...entry[1] };
  }

  return null;
}

function buildChannelName(config, data) {
  const cat = findCategoriaConfig(config, data);
  const prefix = cat?.channelPrefix || "";
  const slug = slugifyChannelName(data.nomeEstado);
  return `${prefix}${slug}`.slice(0, 100);
}

function isSnowflake(value) {
  return /^\d{17,20}$/.test(String(value || "").trim());
}

async function findRoleByName(guild, name) {
  const target = String(name || "").trim().toLowerCase();
  if (!target) return null;
  return guild.roles.cache.find((r) => r.name.toLowerCase() === target) || null;
}

async function getOrCreateBattalionRole(guild, nomeEstado, config) {
  const roleName = String(nomeEstado || "").trim().slice(0, 100);
  if (!roleName) return { role: null, error: "Nome e Estado de atuação vazio." };

  const existing = await findRoleByName(guild, roleName);
  if (existing) return { role: existing, created: false };

  try {
    const role = await guild.roles.create({
      name: roleName,
      color: config.onApprove?.batalhaoRoleColor ?? 0x3498db,
      reason: "BPM: cargo de batalhão criado na aprovação",
      mentionable: false
    });
    return { role, created: true };
  } catch (err) {
    return { role: null, error: err?.message || "Erro ao criar cargo do batalhão." };
  }
}

async function resolveChannelCategory(guild, data, config) {
  const changes = [];

  if (data.categoriaId && isSnowflake(data.categoriaId)) {
    const found = await guild.channels.fetch(data.categoriaId).catch(() => null);
    if (found?.type === ChannelType.GuildCategory) {
      return { category: found, changes };
    }
    changes.push(`- Categoria \`${data.categoriaId}\` não encontrada no servidor.`);
    return { category: null, changes };
  }

  // Resolve pelo label salvo no ticket (compatibilidade com tickets antigos)
  if (data.categoriaLabel && config.categoriasBpm) {
    const match = Object.values(config.categoriasBpm).find(
      (item) => item.label?.toLowerCase() === data.categoriaLabel.toLowerCase()
    );
    if (match?.categoryId) {
      const found = await guild.channels.fetch(match.categoryId).catch(() => null);
      if (found?.type === ChannelType.GuildCategory) {
        changes.push(`- Categoria resolvida pelo nome: **${match.label}**`);
        return { category: found, changes };
      }
    }
  }

  changes.push("- Categoria não informada no ticket. O usuário deve selecionar uma categoria ao abrir o cadastro.");
  return { category: null, changes };
}

async function createBattalionChannel(guild, config, data, category, batalhaoRole, member) {
  const channelName = buildChannelName(config, data);
  const topic = [data.discord, data.cidade].filter(Boolean).join(" • ").slice(0, 1024);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: topic || `Batalhão: ${data.nomeEstado || "Comunidade BPM's"}`,
    reason: `BPM: canal criado na aprovação — ${data.nomeEstado || "cadastro"}`
  });

  const overwrites = [];

  if (batalhaoRole) {
    overwrites.push(
      channel.permissionOverwrites.edit(batalhaoRole, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      }).catch(() => {})
    );
  }

  if (member) {
    overwrites.push(
      channel.permissionOverwrites.edit(member, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      }).catch(() => {})
    );
  }

  await Promise.all(overwrites);
  return channel;
}

function parseCategoriaField(raw) {
  const value = String(raw || "").trim();
  if (!value) return {};

  if (isSnowflake(value)) {
    return { categoriaId: value };
  }

  const criarMatch = value.match(/^CRIAR\s*[:.\-]?\s*(.+)$/i);
  if (criarMatch) {
    return { criarCategoriaNome: criarMatch[1].trim() };
  }

  return { categoriaRaw: value };
}

module.exports = {
  slugifyChannelName,
  buildChannelName,
  findCategoriaConfig,
  isSnowflake,
  getOrCreateBattalionRole,
  resolveChannelCategory,
  createBattalionChannel,
  parseCategoriaField
};
