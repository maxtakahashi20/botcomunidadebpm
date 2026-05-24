const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { assertAllowed, memberHasAnyRole } = require("../utils/permissions");
const {
  CATEGORIES,
  buildTicketChannelEmbed,
  buildRequestNotificationEmbed,
  buildGoToTicketRow,
  buildStaffActionRow,
  buildApprovalEmbed,
  parseTicketDataFromEmbed,
  getCategoryFromEmbedFooter,
  buildTicketFooter,
  createTicketChannel
} = require("../utils/tickets");
const { applyCadastrarBpmApproval, resolvePatente } = require("../utils/approve");
const { applyParceiroApproval, isParceiroCategory } = require("../utils/partners");
const { closeTicketAfterDelay } = require("../utils/transcript");
const {
  buildPatenteSelectRow,
  buildCategoriaExistenteSelectRow,
  buildOpenFormButton,
  buildCadastrarBpmModalId,
  parseCadastrarBpmModalId,
  parseOpenFormButton,
  resolveCategoriaBpm
} = require("../utils/registration");

async function safeReply(interaction, options) {
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(options).catch(() => {});
  }
  return interaction.reply(options).catch(() => {});
}

function isStaff(interaction, config) {
  const staffRoleIds = config.staffRoleIds?.length ? config.staffRoleIds : config.allowedRoleIds;
  return memberHasAnyRole(interaction.member, staffRoleIds);
}

function buildCadastrarBpmMainModal(patenteKey) {
  return new ModalBuilder()
    .setCustomId(buildCadastrarBpmModalId(patenteKey))
    .setTitle("Cadastrar BPM")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_nome_estado")
          .setLabel("Nome e Estado de atuação")
          .setPlaceholder("Ex: 25 BPM - SP (vira cargo e canal)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_cidade")
          .setLabel("Cidade")
          .setPlaceholder("Ex: Nazaré paulista")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_discord")
          .setLabel("Discord (link do servidor)")
          .setPlaceholder("Ex: https://discord.gg/xxxxx")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(200)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_comandante")
          .setLabel("É comandante de batalhão?")
          .setPlaceholder("Sim ou Não")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_nome_completo")
          .setLabel("Nome Completo")
          .setPlaceholder("Ex: Max Takahashi")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      )
    );
}

function buildModalForCategory(categoryKey) {
  const category = CATEGORIES[categoryKey];
  if (!category) return null;

  const modal = new ModalBuilder()
    .setCustomId(`modal_ticket_${categoryKey}`)
    .setTitle(category.modalTitle);

  if (categoryKey === "criador_parceiro") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_nome_estado")
          .setLabel("Nome do criador / canal")
          .setPlaceholder("Ex: PM Vitor Hugo")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_cidade")
          .setLabel("Plataforma principal")
          .setPlaceholder("Ex: YouTube, Twitch, TikTok")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_discord")
          .setLabel("Link do canal / Discord")
          .setPlaceholder("Ex: https://discord.gg/xxxxx")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(200)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_comandante")
          .setLabel("Link do conteúdo")
          .setPlaceholder("Ex: https://youtube.com/@canal")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(200)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_qra")
          .setLabel("Descrição breve")
          .setPlaceholder("Descreva seu conteúdo policial")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
      )
    );
    return modal;
  }

  if (categoryKey === "cidade_parceira") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_nome_estado")
          .setLabel("Nome da cidade")
          .setPlaceholder("Ex: Cidade Alta RP")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_cidade")
          .setLabel("Tematica da cidade")
          .setPlaceholder("Tema RJ, Tema SP, Tema Próprio")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_discord")
          .setLabel("Discord (link do servidor)")
          .setPlaceholder("Ex: https://discord.gg/xxxxx")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(200)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_comandante")
          .setLabel("Responsável")
          .setPlaceholder("Ex: Nome do responsável")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_qra")
          .setLabel("Informações adicionais")
          .setPlaceholder("Detalhes sobre parceria")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
      )
    );
    return modal;
  }

  if (categoryKey === "loja_parceira") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_nome_estado")
          .setLabel("Nome da loja/serviço")
          .setPlaceholder("Ex: Cidade Alta RP")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_cidade")
          .setLabel("Ramo da Loja")
          .setPlaceholder("Ex: Uniformes, equipamentos, scripts...")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_discord")
          .setLabel("Discord (link do servidor)")
          .setPlaceholder("Ex: https://discord.gg/xxxxx")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(200)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_comandante")
          .setLabel("Responsável")
          .setPlaceholder("Ex: Nome do responsável")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("campo_emoji_loja")
          .setLabel("Emoji da loja (opcional)")
          .setPlaceholder("Ex: 🛒 ou 🔗")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(10)
      )
    );
    return modal;
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("campo_assunto")
        .setLabel("Assunto")
        .setPlaceholder("Ex: Dúvida sobre parceria")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("campo_descricao")
        .setLabel("Descrição detalhada")
        .setPlaceholder("Descreva sua solicitação")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000)
    )
  );
  return modal;
}

function extractModalData(interaction, categoryKey, client) {
  if (categoryKey === "outros") {
    return {
      assunto: interaction.fields.getTextInputValue("campo_assunto"),
      descricao: interaction.fields.getTextInputValue("campo_descricao")
    };
  }

  if (categoryKey === "cadastrar_bpm") {
    const { patenteKey } = parseCadastrarBpmModalId(interaction.customId);
    const patente = resolvePatente(client.config, patenteKey);
    const draft = client.registrationDraft.get(interaction.user.id) || {};

    const data = {
      patenteKey: patenteKey || draft.patenteKey,
      patenteLabel: patente?.label || patenteKey,
      patenteInsignia: patente?.insignia || "",
      nomeEstado: interaction.fields.getTextInputValue("campo_nome_estado"),
      cidade: interaction.fields.getTextInputValue("campo_cidade"),
      discord: interaction.fields.getTextInputValue("campo_discord"),
      comandante: interaction.fields.getTextInputValue("campo_comandante"),
      qra: interaction.fields.getTextInputValue("campo_nome_completo"),
      nomeCompleto: interaction.fields.getTextInputValue("campo_nome_completo")
    };

    if (draft.categoriaId) data.categoriaId = draft.categoriaId;
    if (draft.categoriaLabel) data.categoriaLabel = draft.categoriaLabel;
    if (draft.categoriaKey) data.categoriaKey = draft.categoriaKey;

    client.registrationDraft.delete(interaction.user.id);
    return data;
  }

  const data = {
    nomeEstado: interaction.fields.getTextInputValue("campo_nome_estado"),
    cidade: interaction.fields.getTextInputValue("campo_cidade"),
    discord: interaction.fields.getTextInputValue("campo_discord"),
    comandante: interaction.fields.getTextInputValue("campo_comandante")
  };

  if (categoryKey === "loja_parceira") {
    try {
      data.emojiLoja = interaction.fields.getTextInputValue("campo_emoji_loja") || "";
    } catch {
      data.emojiLoja = "";
    }
  }

  if (categoryKey === "criador_parceiro") {
    data.descricao = interaction.fields.getTextInputValue("campo_qra");
  }

  if (categoryKey === "cidade_parceira") {
    try {
      const extra = interaction.fields.getTextInputValue("campo_qra");
      if (extra) data.descricao = extra;
    } catch {
      /* optional */
    }
  }

  return data;
}

async function handleSlashCommand(client, interaction) {
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    assertAllowed(interaction, client.config);
    await cmd.execute(client, interaction);
  } catch (err) {
    if (err?.code === "FORBIDDEN") {
      return safeReply(interaction, {
        content: "🚫 Você não tem permissão para usar este comando.",
        ephemeral: true
      });
    }
    console.error("[SLASH]", err);
    return safeReply(interaction, {
      content: "❌ Ocorreu um erro ao executar o comando.",
      ephemeral: true
    });
  }
}

async function handleSelectMenu(client, interaction) {
  if (interaction.customId === "ticket_select_category") {
    const categoryKey = interaction.values[0];

    if (categoryKey === "cadastrar_bpm") {
      const row = buildPatenteSelectRow(client.config);
      if (!row) {
        return interaction.reply({
          content: "❌ Nenhuma patente configurada em `config.onApprove.patentes`.",
          ephemeral: true
        });
      }
      return interaction.reply({
        content: "⭐ Selecione sua **insignia** para continuar:",
        components: [row],
        ephemeral: true
      });
    }

    const modal = buildModalForCategory(categoryKey);
    if (!modal) {
      return interaction.reply({ content: "❌ Categoria inválida.", ephemeral: true });
    }
    return interaction.showModal(modal);
  }

  if (interaction.customId === "ticket_select_patente") {
    const patenteKey = interaction.values[0];
    const row = buildCategoriaExistenteSelectRow(client.config, patenteKey);
    const patente = resolvePatente(client.config, patenteKey);

    if (!row) {
      return interaction.update({
        content: "❌ Nenhuma categoria configurada em `config.categoriasBpm`.",
        components: []
      });
    }

    return interaction.update({
      content:
        `📋 Insignia **${patente?.insignia || "—"}** selecionada.\n` +
        "📁 Selecione a **categoria** onde o canal de texto do BPM será criado:",
      components: [row]
    });
  }

  if (interaction.customId.startsWith("ticket_select_categoria_exist_")) {
    const patenteKey = interaction.customId.replace("ticket_select_categoria_exist_", "");
    const categoriaKey = interaction.values[0];
    const categoria = resolveCategoriaBpm(client.config, categoriaKey);

    if (!categoria?.categoryId) {
      return interaction.update({
        content: "❌ Categoria selecionada sem ID configurado.",
        components: []
      });
    }

    client.registrationDraft.set(interaction.user.id, {
      patenteKey,
      categoriaKey,
      categoriaId: categoria.categoryId,
      categoriaLabel: categoria.label || categoriaKey
    });

    return interaction.update({
      content:
        `✅ Categoria **${categoria.label}** selecionada.\n` +
        "Será criado um **canal de texto** com o nome da atuação dentro desta categoria.\n" +
        "Clique abaixo para preencher o formulário:",
      components: [buildOpenFormButton(patenteKey)]
    });
  }
}

async function handleButton(client, interaction) {
  const { customId } = interaction;

  if (customId.startsWith("ticket_abrir_form__")) {
    const parsed = parseOpenFormButton(customId);
    if (!parsed) {
      return interaction.reply({ content: "❌ Sessão inválida. Refaça o cadastro.", ephemeral: true });
    }
    const draft = client.registrationDraft.get(interaction.user.id);
    if (!draft?.categoriaId) {
      return interaction.reply({
        content: "❌ Selecione uma categoria antes de preencher o formulário.",
        ephemeral: true
      });
    }
    return interaction.showModal(buildCadastrarBpmMainModal(parsed.patenteKey));
  }

  if (!customId.startsWith("ticket_aprovar_") && !customId.startsWith("ticket_reprovar_")) return;

  if (!isStaff(interaction, client.config)) {
    return interaction.reply({
      content: "🚫 Você não tem permissão para realizar esta ação.",
      ephemeral: true
    });
  }

  const isAprovado = customId.startsWith("ticket_aprovar_");
  const parts = customId.replace(/^ticket_(aprovar|reprovar)_/, "").split("_");
  const channelId = parts[0];
  const userId = parts.slice(1).join("_");

  await interaction.deferUpdate();

  const originalEmbed = interaction.message.embeds[0];
  const categoryKey = getCategoryFromEmbedFooter(originalEmbed);
  const data = parseTicketDataFromEmbed(originalEmbed);

  const statusLabel = isAprovado ? "✅ APROVADO" : "❌ REPROVADO";
  const statusColor = isAprovado ? 0x57f287 : 0xed4245;

  const updatedEmbed = EmbedBuilder.from(originalEmbed)
    .setColor(statusColor)
    .setTitle(`${originalEmbed.title} — ${statusLabel}`);

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("_noop_aprovar")
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("_noop_reprovar")
      .setLabel("Reprovar")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true)
  );

  await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

  const approvalChanges = [];
  let createdChannel = null;

  if (isAprovado && categoryKey) {
    if (categoryKey === "cadastrar_bpm") {
      try {
        const member = await interaction.guild.members.fetch(userId);
        const result = await applyCadastrarBpmApproval(
          member,
          client.config,
          data,
          interaction.guild
        );
        approvalChanges.push(...result.changes);
        createdChannel = result.createdChannel;
      } catch (err) {
        console.error("[APROVAR BPM]", err);
        approvalChanges.push("- Erro ao aplicar cargos/canal/apelido.");
      }
    } else if (isParceiroCategory(categoryKey)) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        const result = await applyParceiroApproval(
          member,
          client.config,
          data,
          interaction.guild,
          categoryKey
        );
        approvalChanges.push(...result.changes);
        createdChannel = result.createdChannel;
      } catch (err) {
        console.error("[APROVAR PARCEIRO]", err);
        approvalChanges.push("- Erro ao aplicar cargos/canal do parceiro.");
      }
    }

    const approvedChannelId = client.config.approvedChannelId;
    if (approvedChannelId) {
      const approvedChannel = await interaction.guild.channels.fetch(approvedChannelId).catch(() => null);
      if (approvedChannel) {
        const solicitante = await client.users.fetch(userId).catch(() => ({ id: userId }));
        const approvalEmbed = buildApprovalEmbed(
          categoryKey,
          solicitante,
          interaction.user,
          data,
          createdChannel
        );
        await approvedChannel.send({ embeds: [approvalEmbed] });
      }
    }

    try {
      const ticketChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (ticketChannel) {
        await ticketChannel.send(
          `✅ Solicitação **aprovada** por <@${interaction.user.id}>.${
            createdChannel ? `\n📺 Canal criado: <#${createdChannel.id}>` : ""
          }`
        );

        if (categoryKey === "cadastrar_bpm" || isParceiroCategory(categoryKey)) {
          const solicitante = await client.users.fetch(userId).catch(() => null);
          void closeTicketAfterDelay(client, interaction.guild, client.config, channelId, {
            status: "aprovado",
            userId,
            userTag: solicitante?.tag,
            staffId: interaction.user.id,
            staffTag: interaction.user.tag,
            categoryKey,
            data,
            createdChannelId: createdChannel?.id,
            approvalChanges
          });
        }
      }
    } catch {
      /* ignore */
    }
  } else if (!isAprovado) {
    try {
      const ticketChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (ticketChannel) {
        await ticketChannel.send(`❌ Solicitação **reprovada** por <@${interaction.user.id}>.`);
      }
    } catch {
      /* ignore */
    }
  }

  let dmEnviada = false;
  try {
    const candidato = await client.users.fetch(userId);
    const dmMsg = isAprovado
      ? "✅ **Sua solicitação na Comunidade BPM's foi APROVADA!**\n\nEm breve você receberá mais informações."
      : "❌ **Sua solicitação na Comunidade BPM's foi REPROVADA.**\n\nEntre em contato com a equipe se tiver dúvidas.";
    await candidato.send(dmMsg);
    dmEnviada = true;
  } catch {
    dmEnviada = false;
  }

  await interaction.followUp({
    content:
      `${statusLabel} para <@${userId}>.\n` +
      (approvalChanges.length ? `${approvalChanges.join("\n")}\n` : "") +
      (dmEnviada ? "📨 DM enviada ao solicitante." : "⚠️ Não consegui enviar DM (usuário com DMs fechadas)."),
    ephemeral: true
  });
}

async function handleModalSubmit(client, interaction) {
  if (!interaction.customId.startsWith("modal_ticket_")) return;

  let categoryKey = interaction.customId.replace(/^modal_ticket_/, "").split("__")[0];
  if (interaction.customId.startsWith("modal_ticket_cadastrar_bpm__")) {
    categoryKey = "cadastrar_bpm";
  }

  if (!CATEGORIES[categoryKey]) return;

  await interaction.deferReply({ ephemeral: true });

  const user = interaction.user;
  const data = extractModalData(interaction, categoryKey, client);

  let ticketChannel;
  try {
    ticketChannel = await createTicketChannel(interaction.guild, client.config, user, categoryKey);
  } catch (err) {
    console.error("[TICKET CREATE]", err);
    return interaction.editReply("❌ Não foi possível criar o canal de atendimento. Verifique permissões do bot.");
  }

  const ticketEmbed = buildTicketChannelEmbed(categoryKey, user, data);
  ticketEmbed.setFooter({
    text: buildTicketFooter(categoryKey, user.id, {
      patenteKey: data.patenteKey,
      categoriaId: data.categoriaId,
      categoriaKey: data.categoriaKey
    })
  });

  const staffRow = buildStaffActionRow(ticketChannel.id, user.id);

  await ticketChannel.send({
    content: `<@${user.id}> — aguarde o atendimento da equipe.`,
    embeds: [ticketEmbed],
    components: [staffRow]
  });

  const requestsChannelId = client.config.requestsChannelId;
  if (requestsChannelId) {
    const requestsChannel = await interaction.guild.channels.fetch(requestsChannelId).catch(() => null);
    if (requestsChannel) {
      const notificationEmbed = buildRequestNotificationEmbed(categoryKey, user);
      const goRow = buildGoToTicketRow(interaction.guild.id, ticketChannel.id);
      await requestsChannel.send({ embeds: [notificationEmbed], components: [goRow] });
    }
  }

  await interaction.editReply(
    `✅ Seu ticket foi aberto com sucesso!\nAcesse o atendimento em <#${ticketChannel.id}>.\nAguarde a análise da equipe.`
  );
}

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isChatInputCommand()) return handleSlashCommand(client, interaction);
      if (interaction.isStringSelectMenu()) return handleSelectMenu(client, interaction);
      if (interaction.isButton()) return handleButton(client, interaction);
      if (interaction.isModalSubmit()) return handleModalSubmit(client, interaction);
    } catch (err) {
      console.error("[interactionCreate]", err);
      await safeReply(interaction, {
        content: "❌ Ocorreu um erro inesperado.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
