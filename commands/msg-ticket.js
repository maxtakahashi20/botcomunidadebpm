const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const { CATEGORIES, buildTicketPanelEmbed } = require("../utils/tickets");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("msg-ticket")
    .setDescription("Envia o painel de atendimento com menu de categorias."),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channelId = client.config.ticketPanelChannelId || client.config.panelChannelId;
    if (!channelId) {
      return interaction.editReply("❌ `ticketPanelChannelId` não configurado em `config/config.json`.");
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      return interaction.editReply("❌ Canal do painel não encontrado. Verifique o `ticketPanelChannelId`.");
    }

    const embed = buildTicketPanelEmbed();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket_select_category")
      .setPlaceholder("Selecionar categoria...")
      .addOptions(
        Object.entries(CATEGORIES).map(([value, cat]) => ({
          label: cat.label,
          description: cat.description,
          value,
          emoji: cat.emoji
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply(`✅ Painel de atendimento enviado em <#${channelId}>.`);
  }
};
