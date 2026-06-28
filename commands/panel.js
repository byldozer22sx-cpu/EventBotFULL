const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendPanel } = require('../utils/eventManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Создать панель записи на ивент')
    .addIntegerOption(option =>
      option
        .setName('slots')
        .setDescription('Сколько мест создать')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(25)
    )
    .addAttachmentOption(option =>
      option
        .setName('image')
        .setDescription('Фото для панели')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await sendPanel(interaction);
  }
};
