const http = require('http');
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { getConfig, handleSlotButton, updatePanel } = require('./utils/eventManager');

const config = getConfig();

if (!config.token || config.token === 'TOKEN_HERE') {
  console.error('Ошибка: не указан TOKEN. Добавь переменную окружения TOKEN на Render или заполни config.json локально.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, async () => {
  console.log(`${client.user.tag} запущен!`);
  await updatePanel(client);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('slot_')) {
      await handleSlotButton(interaction);
    }
  } catch (error) {
    console.error(error);
    const content = '❌ Произошла ошибка при выполнении действия.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(config.token);
