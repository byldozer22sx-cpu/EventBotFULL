const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendPanel } = require('../utils/eventManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Создать панель записи на ивент')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await sendPanel(interaction);
  }
};
