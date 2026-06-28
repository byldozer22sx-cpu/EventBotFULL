const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { toggleClosed } = require('../utils/eventManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('open')
    .setDescription('Открыть запись на ивент')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await toggleClosed(interaction, false);
  }
};
