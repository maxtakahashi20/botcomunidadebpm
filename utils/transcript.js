const { EmbedBuilder } = require("discord.js");
const { CATEGORIES } = require("./tickets");
const { resolvePatente } = require("./approve");
const { isParceiroCategory } = require("./partners");

function partnerNomeLabel(categoryKey) {
  if (categoryKey === "criador_parceiro") return "🎥 Nome do criador / canal";
  if (categoryKey === "cidade_parceira") return "🏙️ Nome da cidade";
  if (categoryKey === "loja_parceira") return "🏪 Nome da loja/serviço";
  return "🏢 Nome e Estado de atuação";
}

function partnerSecondaryLabel(categoryKey) {
  if (categoryKey === "loja_parceira") return "🏷️ Ramo da Loja";
  if (categoryKey === "cidade_parceira") return "🎭 Tematica da cidade";
  if (categoryKey === "criador_parceiro") return "📺 Plataforma principal";
  return "🌆 Cidade";
}

function fieldValue(value) {
  const text = String(value || "—").trim() || "—";
  return `\`\`\`\n${text.slice(0, 1000)}\n\`\`\``;
}

function buildTicketLogEmbed(config, meta, ticketChannel) {
  const data = meta.data || {};
  const category = CATEGORIES[meta.categoryKey];
  const patente = data.patenteKey ? resolvePatente(config, data.patenteKey) : null;
  const isAprovado = meta.status === "aprovado";
  const isParceiro = isParceiroCategory(meta.categoryKey);

  const embed = new EmbedBuilder()
    .setTitle(isAprovado ? "✅ Ticket aprovado e encerrado" : "📋 Log de ticket")
    .setColor(isAprovado ? 0x57f287 : 0xed4245)
    .setDescription(
      isAprovado
        ? isParceiro
          ? "Parceiro cadastrado. Resumo do atendimento abaixo."
          : meta.categoryKey === "cadastrar_bpm"
            ? "Cadastro BPM concluído. Resumo do atendimento abaixo."
            : "Atendimento concluído. Resumo abaixo."
        : "Registro de encerramento do ticket."
    )
    .addFields(
      { name: "👤 Solicitante", value: meta.userId ? `<@${meta.userId}>\n\`${meta.userTag || meta.userId}\`` : "—", inline: true },
      { name: "🛡️ Staff", value: meta.staffId ? `<@${meta.staffId}>\n\`${meta.staffTag || meta.staffId}\`` : "—", inline: true },
      { name: "📂 Tipo", value: category ? `${category.emoji} ${category.label}` : meta.categoryKey || "—", inline: true },
      { name: "🎫 Ticket", value: ticketChannel ? `<#${ticketChannel.id}>\n\`${ticketChannel.name}\`` : "—", inline: false }
    )
    .setFooter({ text: `Comunidade BPM's • Log de atendimento` })
    .setTimestamp();

  if (data.patenteInsignia || patente?.insignia) {
    embed.addFields({ name: "⭐ Insignia", value: fieldValue(data.patenteInsignia || patente?.insignia), inline: true });
  }

  if (data.nomeEstado) {
    embed.addFields({
      name: isParceiro ? partnerNomeLabel(meta.categoryKey) : "🏢 Nome e Estado de atuação",
      value: fieldValue(data.nomeEstado),
      inline: false
    });
  }

  if (data.cidade) {
    embed.addFields({
      name: isParceiro ? partnerSecondaryLabel(meta.categoryKey) : "🌆 Cidade",
      value: fieldValue(data.cidade),
      inline: true
    });
  }

  if (data.emojiLoja) {
    embed.addFields({ name: "😀 Emoji da loja", value: fieldValue(data.emojiLoja), inline: true });
  }

  if (data.discord) {
    embed.addFields({ name: "🔗 Discord", value: fieldValue(data.discord), inline: true });
  }

  if (data.comandante) {
    embed.addFields({ name: "👑 Comandante", value: fieldValue(data.comandante), inline: true });
  }

  if (data.nomeCompleto || data.qra) {
    embed.addFields({ name: "🪪 Nome Completo", value: fieldValue(data.nomeCompleto || data.qra), inline: false });
  }

  if (data.categoriaLabel) {
    embed.addFields({ name: "📁 Categoria", value: fieldValue(data.categoriaLabel), inline: true });
  }

  if (meta.createdChannelId) {
    embed.addFields({ name: "📺 Canal criado", value: `<#${meta.createdChannelId}>`, inline: true });
  }

  if (meta.approvalChanges?.length) {
    embed.addFields({
      name: "⚙️ Ações executadas",
      value: meta.approvalChanges.map((line) => line.replace(/^- /, "• ")).join("\n").slice(0, 1024),
      inline: false
    });
  }

  return embed;
}

async function sendTicketLog(client, guild, config, meta, ticketChannel) {
  const logsChannelId = config.ticketLogsChannelId || config.requestsChannelId;
  if (!logsChannelId) return;

  const logsChannel = await guild.channels.fetch(logsChannelId).catch(() => null);
  if (!logsChannel?.isTextBased()) return;

  const embed = buildTicketLogEmbed(config, meta, ticketChannel);
  await logsChannel.send({ embeds: [embed] });
}

async function closeTicketAfterDelay(client, guild, config, channelId, meta, delayMs = 5000) {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  await channel
    .send(`🔒 Este ticket será **fechado automaticamente** em ${delayMs / 1000} segundos...`)
    .catch(() => {});

  setTimeout(async () => {
    try {
      const freshChannel = await guild.channels.fetch(channelId).catch(() => null);
      if (!freshChannel?.isTextBased()) return;

      await sendTicketLog(client, guild, config, meta, freshChannel);
      await freshChannel.delete("Ticket aprovado — encerramento automático");
    } catch (err) {
      console.error("[TICKET CLOSE]", err);
    }
  }, delayMs);
}

module.exports = {
  buildTicketLogEmbed,
  sendTicketLog,
  closeTicketAfterDelay
};
