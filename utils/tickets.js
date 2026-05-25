const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");
const { isSnowflake } = require("./battalion");

const CATEGORIES = {
  cadastrar_bpm: {
    label: "Cadastrar BPM",
    emoji: "👮",
    description: "Use para cadastrar o seu BPM como parceiro do servidor",
    modalTitle: "Cadastrar BPM",
    notificationTitle: "batalhão",
    approvalTitle: "Batalhão"
  },
  criador_parceiro: {
    label: "Criador Parceiro",
    emoji: "🎥",
    description: "Criadores de conteudo voltado ao mundo policial",
    modalTitle: "Criador Parceiro",
    notificationTitle: "criador parceiro",
    approvalTitle: "Criador Parceiro"
  },
  cidade_parceira: {
    label: "Cidade Parceira",
    emoji: "🏡",
    description: "Use para cadastrar sua cidade como parceira do servidor",
    modalTitle: "Cidade Parceira",
    notificationTitle: "cidade parceira",
    approvalTitle: "Cidade Parceira"
  },
  loja_parceira: {
    label: "Loja Parceira",
    emoji: "🔗",
    description: "Use para lojas/serviços voltado ao mundo policial",
    modalTitle: "Loja Parceira",
    notificationTitle: "loja parceira",
    approvalTitle: "Loja Parceira"
  },
  outros: {
    label: "Outros",
    emoji: "📄",
    description: "Use para outros assuntos",
    modalTitle: "Outros Assuntos",
    notificationTitle: "atendimento",
    approvalTitle: "Solicitação"
  }
};

function formatDatePtBR(date = new Date()) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function fieldBlock(value) {
  return `\`\`\`\n${value}\n\`\`\``;
}

function buildTicketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle("🌐 Comunidade BPM's | Atendimento")
    .setDescription(
      "Olá seja bem vindo, para solicitar um atendimento, abra um **TICKET** selecionando uma opção no menu abaixo.\n\n" +
        "Lembre-se: **não abra um chamado sem necessidade.**"
    )
    .setColor(0x2b2d31)
    .setFooter({ text: "Criado por: Takahashi Store" });
}

function addCadastroBpmFields(embed, data, categoryKey) {
  if (data.nomeEstado) {
    let nomeLabel = "🏢 Nome e Estado de atuação";
    if (categoryKey === "loja_parceira") nomeLabel = "🏪 Nome da loja/serviço";
    else if (categoryKey === "cidade_parceira") nomeLabel = "🏙️ Nome da cidade";
    else if (categoryKey === "criador_parceiro") nomeLabel = "🎥 Nome do criador / canal";
    embed.addFields({ name: nomeLabel, value: fieldBlock(data.nomeEstado), inline: false });
  }
  if (data.cidade) {
    const cidadeLabel =
      categoryKey === "loja_parceira"
        ? "🏷️ Ramo da Loja"
        : categoryKey === "cidade_parceira"
          ? "🎭 Tematica da cidade"
          : categoryKey === "criador_parceiro"
            ? "📺 Plataforma principal"
            : "🌆 Cidade";
    embed.addFields({ name: cidadeLabel, value: fieldBlock(data.cidade), inline: false });
  }
  if (data.discord) {
    const discordLabel = categoryKey === "criador_parceiro" ? "🔗 Link do canal / Discord" : "🔗 Discord";
    embed.addFields({ name: discordLabel, value: fieldBlock(data.discord), inline: false });
  }
  if (data.comandante) {
    let cmdLabel = "👑 Comandante";
    if (categoryKey === "criador_parceiro") cmdLabel = "🔗 Link do conteúdo";
    else if (categoryKey === "loja_parceira" || categoryKey === "cidade_parceira") cmdLabel = "👤 Responsável";
    embed.addFields({ name: cmdLabel, value: fieldBlock(data.comandante), inline: false });
  }
  if (data.nomeCompleto || data.qra) {
    embed.addFields({
      name: "🪪 Nome Completo",
      value: fieldBlock(data.nomeCompleto || data.qra),
      inline: false
    });
  }
  if (data.categoriaLabel || data.categoriaId) {
    const catDisplay = data.categoriaLabel
      ? `${data.categoriaLabel}${data.categoriaId ? ` (${data.categoriaId})` : ""}`
      : data.categoriaId;
    embed.addFields({ name: "📁 Categoria", value: fieldBlock(catDisplay), inline: false });
  }
  if (data.criarCategoriaNome) {
    embed.addFields({ name: "➕ Nova categoria", value: fieldBlock(data.criarCategoriaNome), inline: false });
  }
  if (data.patenteInsignia || data.patenteKey) {
    embed.addFields({ name: "⭐ Insignia", value: fieldBlock(data.patenteInsignia || "—"), inline: false });
  }
  if (data.descricao) {
    embed.addFields({ name: "📝 Descrição", value: fieldBlock(data.descricao), inline: false });
  }
  if (data.emojiLoja) {
    embed.addFields({ name: "😀 Emoji da loja", value: fieldBlock(data.emojiLoja), inline: true });
  }
}

function buildTicketChannelEmbed(categoryKey, user, data) {
  const category = CATEGORIES[categoryKey];
  const embed = new EmbedBuilder()
    .setTitle(`${category.emoji} Ticket — ${category.label}`)
    .setColor(0x5865f2)
    .addFields({ name: "👤 Solicitante", value: `<@${user.id}>`, inline: false });

  addCadastroBpmFields(embed, data, categoryKey);

  if (data.assunto) {
    embed.addFields({ name: "📌 Assunto", value: fieldBlock(data.assunto), inline: false });
  }

  embed.setFooter({ text: `Categoria: ${categoryKey} • ID: ${user.id}` }).setTimestamp();
  return embed;
}

function buildRequestNotificationEmbed(categoryKey, user) {
  const category = CATEGORIES[categoryKey];
  return new EmbedBuilder()
    .setTitle(`📢 Nova solicitação de ${category.notificationTitle}`)
    .setColor(0x5865f2)
    .addFields(
      { name: "Solicitante", value: `<@${user.id}>`, inline: true },
      { name: "Tipo", value: `\`${categoryKey}\``, inline: true }
    )
    .setTimestamp();
}

function buildGoToTicketRow(guildId, channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Ir até o atendimento")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${guildId}/${channelId}`)
      .setEmoji("🚀")
  );
}

function buildStaffActionRow(channelId, userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_aprovar_${channelId}_${userId}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`ticket_reprovar_${channelId}_${userId}`)
      .setLabel("Reprovar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );
}

function buildApprovalEmbed(categoryKey, user, approver, data, createdChannel) {
  const category = CATEGORIES[categoryKey];
  const embed = new EmbedBuilder()
    .setTitle(`✅ Um novo ${category.approvalTitle} foi aprovado`)
    .setColor(0x57f287)
    .addFields(
      { name: "Usuário", value: `<@${user.id}>`, inline: true },
      { name: "Aprovado por", value: `<@${approver.id}>`, inline: true },
      { name: "\u200b", value: "━━━━━━━━━━━━━━━━━━━━━━", inline: false }
    );

  addCadastroBpmFields(embed, data, categoryKey);

  if (data.assunto) {
    embed.addFields({ name: "📌 Assunto", value: fieldBlock(data.assunto), inline: false });
  }

  const canalValue = createdChannel ? `<#${createdChannel.id}>` : "`# desconhecido`";
  embed.addFields({ name: "📺 Canal criado", value: canalValue, inline: false });
  embed.setFooter({ text: formatDatePtBR() });

  return embed;
}

function parseTicketDataFromEmbed(embed) {
  const data = {};
  for (const field of embed.fields || []) {
    const raw = field.value.replace(/```\n?|\n?```/g, "").trim();
    if (field.name.includes("Nome e Estado") || field.name.includes("Nome do criador") || field.name.includes("Nome da loja") || field.name.includes("Nome da cidade")) {
      data.nomeEstado = raw;
    } else if (field.name.includes("Tematica da cidade") || field.name.includes("Tematica")) {
      data.cidade = raw;
    } else if (field.name.includes("Ramo da Loja")) {
      data.cidade = raw;
    } else if (field.name.includes("Plataforma")) {
      data.cidade = raw;
    } else if (field.name.includes("Cidade") && !field.name.includes("Nome da")) {
      data.cidade = raw;
    } else if (field.name.includes("Discord") || field.name.includes("Link do canal")) {
      data.discord = raw;
    } else if (
      field.name.includes("comandante") ||
      field.name.includes("Comandante") ||
      field.name.includes("Link do conteúdo") ||
      field.name.includes("Responsável")
    ) {
      data.comandante = raw;
    } else if (field.name.includes("Nome Completo") || field.name.includes("QRA")) {
      data.nomeCompleto = raw;
      data.qra = raw;
    } else if (field.name.includes("Categoria") && !field.name.includes("Patente")) {
      const catRaw = raw;
      const parenMatch = catRaw.match(/^(.+?)\s*\((\d{17,20})\)$/);
      if (parenMatch) {
        data.categoriaLabel = parenMatch[1].trim();
        data.categoriaId = parenMatch[2];
      } else if (isSnowflake(catRaw)) {
        data.categoriaId = catRaw;
      } else {
        data.categoriaLabel = catRaw;
      }
    } else if (field.name.includes("Nova categoria")) {
      data.criarCategoriaNome = raw;
    } else if (field.name.includes("Insignia") || field.name.includes("Patente")) {
      data.patenteInsignia = raw;
    } else if (field.name.includes("Assunto")) {
      data.assunto = raw;
    } else if (field.name.includes("Descrição")) {
      data.descricao = raw;
    } else if (field.name.includes("Emoji da loja")) {
      data.emojiLoja = raw;
    }
  }
  const footer = embed.footer?.text || "";

  const catMatch = footer.match(/Categoria:\s*([\w_]+)/);
  if (catMatch) data.categoryKey = catMatch[1];

  const patenteMatch = footer.match(/patente:([\w_]+)/);
  if (patenteMatch) data.patenteKey = patenteMatch[1];

  const catidMatch = footer.match(/catid:(\d+)/);
  if (catidMatch) data.categoriaId = catidMatch[1];

  const catkeyMatch = footer.match(/catkey:([\w_]+)/);
  if (catkeyMatch) data.categoriaKey = catkeyMatch[1];

  return data;
}

function buildTicketFooter(categoryKey, userId, extra = {}) {
  let text = `Categoria: ${categoryKey} • ID: ${userId}`;
  if (extra.patenteKey) text += ` | patente:${extra.patenteKey}`;
  if (extra.categoriaId) text += ` | catid:${extra.categoriaId}`;
  if (extra.categoriaKey) text += ` | catkey:${extra.categoriaKey}`;
  return text;
}

function getCategoryFromEmbedFooter(embed) {
  const footer = embed.footer?.text || "";
  const match = footer.match(/Categoria:\s*([\w_]+)/);
  return match ? match[1] : null;
}

function buildTicketChannelName(categoryKey, user) {
  const category = CATEGORIES[categoryKey];
  const tipo = category?.notificationTitle || categoryKey.replace(/_/g, "-");
  const nome = user.username.toLowerCase().replace(/[^a-z0-9_-]/g, "") || "usuario";
  return `🎫┋${tipo} ${nome}`.slice(0, 100);
}

async function createTicketChannel(guild, config, user, categoryKey) {
  const category = CATEGORIES[categoryKey];
  const staffRoleIds = config.staffRoleIds?.length ? config.staffRoleIds : config.allowedRoleIds;

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles
      ]
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  for (const roleId of staffRoleIds) {
    permissionOverwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  const channelName = buildTicketChannelName(categoryKey, user);

  return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId || undefined,
    permissionOverwrites,
    topic: `Ticket ${category.label} — ${user.tag} (${user.id})`
  });
}

module.exports = {
  CATEGORIES,
  formatDatePtBR,
  fieldBlock,
  buildTicketPanelEmbed,
  buildTicketChannelEmbed,
  buildRequestNotificationEmbed,
  buildGoToTicketRow,
  buildStaffActionRow,
  buildApprovalEmbed,
  parseTicketDataFromEmbed,
  getCategoryFromEmbedFooter,
  buildTicketFooter,
  createTicketChannel,
  buildTicketChannelName
};
