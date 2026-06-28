const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
      closed: Boolean(parsed.closed),
      slots: Number(parsed.slots || getConfig().slots || 20)
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

function getUserName(client, userId) {
  const user = client.users.cache.get(userId);
  return user ? (user.globalName || user.username) : 'Занято';
}

function buildButtons(client) {
  const config = getConfig();
  const data = loadData();
  const rows = [];
  const slots = data.slots || config.slots;

  for (let start = 1; start <= slots; start += 5) {
    const row = new ActionRowBuilder();

    for (let i = start; i < start + 5 && i <= slots; i++) {
      const userId = data.taken[String(i)];
      let label = String(i);

      if (userId) {
        label = `${i}. ${getUserName(client, userId)}`;
        if (label.length > 20) {
          label = label.slice(0, 17) + '...';
        }
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`slot_${i}`)
          .setLabel(label)
          .setStyle(userId ? ButtonStyle.Danger : ButtonStyle.Success)
          .setDisabled(Boolean(data.closed))
      );
    }

    rows.push(row);
  }

  return rows;
}

async function deleteOldPanel(client, panel) {
  if (!panel?.channelId || !panel?.messageId) return;

  const oldChannel = await client.channels.fetch(panel.channelId).catch(() => null);
  if (!oldChannel) return;

  const oldMessage = await oldChannel.messages.fetch(panel.messageId).catch(() => null);
  if (oldMessage) await oldMessage.delete().catch(() => {});
}

async function sendPanel(interaction) {
  const slots = interaction.options.getInteger('slots') || getConfig().slots;
  const data = loadData();

  await deleteOldPanel(interaction.client, data.panel);

  data.taken = {};
  data.closed = false;
  data.panel = null;
  data.slots = slots;
  saveData(data);

  const message = await interaction.channel.send({
    components: buildButtons(interaction.client)
  });

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

    await message.edit({
      content: '',
      embeds: [],
      components: buildButtons(client)
    });
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
  await interaction.reply({
    content: closed ? '🔒 Запись закрыта.' : '🔓 Запись открыта.',
    ephemeral: true
  });
}

module.exports = {
  getConfig,
  sendPanel,
  handleSlotButton,
  resetSlots,
  toggleClosed,
  updatePanel
};
