# EventBot

Discord-бот для записи на места через кнопки.

## Локальный запуск
1. Скопируй `config.example.json` в `config.json`.
2. Заполни `token`, `clientId`, `guildId`.
3. Выполни:

```bash
npm install
npm run deploy
npm start
```

## Render
Добавь Environment Variables:

- `TOKEN` — токен бота
- `CLIENT_ID` — Application ID
- `GUILD_ID` — ID сервера
- `SLOTS` — количество мест, например `20`
- `EVENT_TITLE` — название панели, например `Запись на ивент`

Build Command:

```bash
npm install && npm run deploy
```

Start Command:

```bash
npm start
```
