const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');

const dataPath = path.join(__dirname, '..', 'data.json');

function loadData() {
  try {
    if (!fs.existsSync(dataPath)) return { taken: {}, panel: null, closed: false };
    const parsed = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return {
      taken: parsed.taken || {},
      panel: parsed.panel || null,
      closed: Boolean(parsed.closed)
    };
  } catch {
    return { taken: {}, panel: null, closed: false };
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function getConfig() {
  let fileConfig = {};
  try {
    fileConfig = require('../config.json');
  } catch {}

  return {
    token: process.env.TOKEN || fileConfig.token,
    clientId: process.env.CLIENT_ID || fileConfig.clientId,
    guildId: process.env.GUILD_ID || fileConfig.guildId,
    slots: Number(process.env.SLOTS || fileConfig.slots || 20),
    eventTitle: process.env.EVENT_TITLE || fileConfig.eventTitle || 'Запись на ивент'
  };
}

function buildEmbed(client) {
  const config = getConfig();
  const data = loadData();
  const slots = config.slots;
  const takenCount = Object.keys(data.taken).length;
  const freeCount = slots - takenCount;

  const lines = [];
  for (let i = 1; i <= slots; i++) {
    const userId = data.taken[String(i)];
    lines.push(`**${i}.** ${userId ? `<@${userId}>` : 'свободно'}`);
  }

  return new EmbedBuilder()
    .setTitle(`📋 ${config.eventTitle}`)
    .setDescription(`${data.closed ? '🔒 **Запись закрыта**\n\n' : ''}🟢 **Свободно:** ${freeCount}\n🔴 **Занято:** ${takenCount}\n\n${lines.join('\n')}`)
    .setFooter({ text: `${client.user.username} • запись на места` })
    .setTimestamp();
}

function buildButtons() {
  const config = getConfig();
  const data = loadData();
  const rows = [];
  const slots = config.slots;

  for (let start = 1; start <= slots; start += 5) {
    const row = new ActionRowBuilder();
    for (let i = start; i < start + 5 && i <= slots; i++) {
      const taken = Boolean(data.taken[String(i)]);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`slot_${i}`)
          .setLabel(String(i))
          .setStyle(taken ? ButtonStyle.Danger : ButtonStyle.Success)
          .setDisabled(Boolean(data.closed))
      );
    }
    rows.push(row);
  }

  return rows;
}

async function sendPanel(interaction) {
  const embed = buildEmbed(interaction.client);
  const rows = buildButtons();
  const message = await interaction.channel.send({ embeds: [embed], components: rows });

  const data = loadData();
  data.panel = {
    channelId: message.channel.id,
    messageId: message.id
  };
  saveData(data);

  await interaction.reply({ content: '✅ Панель записи создана.', ephemeral: true });
}

async function updatePanel(client) {
  const data = loadData();
  if (!data.panel) return;

  try {
    const channel = await client.channels.fetch(data.panel.channelId);
    const message = await channel.messages.fetch(data.panel.messageId);
    await message.edit({ embeds: [buildEmbed(client)], components: buildButtons() });
  } catch (error) {
    console.error('Не удалось обновить панель:', error.message);
  }
}

async function handleSlotButton(interaction) {
  const slot = interaction.customId.replace('slot_', '');
  const data = loadData();

  if (data.closed) {
    await interaction.reply({ content: '🔒 Запись закрыта.', ephemeral: true });
    return;
  }

  const currentOwner = data.taken[slot];
  if (currentOwner && currentOwner !== interaction.user.id) {
    await interaction.reply({ content: `❌ Место ${slot} уже занято.`, ephemeral: true });
    return;
  }

  for (const [takenSlot, userId] of Object.entries(data.taken)) {
    if (userId === interaction.user.id) {
      delete data.taken[takenSlot];
    }
  }

  if (currentOwner === interaction.user.id) {
    delete data.taken[slot];
    saveData(data);
    await updatePanel(interaction.client);
    await interaction.reply({ content: `✅ Ты освободил место ${slot}.`, ephemeral: true });
    return;
  }

  data.taken[slot] = interaction.user.id;
  saveData(data);
  await updatePanel(interaction.client);
  await interaction.reply({ content: `✅ Ты занял место ${slot}.`, ephemeral: true });
}

async function resetSlots(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Эта команда только для администраторов.', ephemeral: true });
    return;
  }

  const data = loadData();
  data.taken = {};
  data.closed = false;
  saveData(data);
  await updatePanel(interaction.client);
  await interaction.reply({ content: '✅ Все места очищены.', ephemeral: true });
}

async function toggleClosed(interaction, closed) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Эта команда только для администраторов.', ephemeral: true });
    return;
  }

  const data = loadData();
  data.closed = closed;
  saveData(data);
  await updatePanel(interaction.client);
  await interaction.reply({ content: closed ? '🔒 Запись закрыта.' : '🔓 Запись открыта.', ephemeral: true });
}

module.exports = {
  getConfig,
  sendPanel,
  handleSlotButton,
  resetSlots,
  toggleClosed,
  updatePanel
};
