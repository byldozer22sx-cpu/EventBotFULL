const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { getConfig } = require('./utils/eventManager');

const config = getConfig();

if (!config.token || !config.clientId || !config.guildId) {
  console.error('Ошибка: нужны TOKEN, CLIENT_ID и GUILD_ID. На Render добавь Environment Variables.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Регистрирую ${commands.length} slash-команды...`);
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log('Команды успешно зарегистрированы!');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
