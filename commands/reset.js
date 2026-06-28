const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { resetSlots } = require('../utils/eventManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Очистить все места')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await resetSlots(interaction);
  }
};
