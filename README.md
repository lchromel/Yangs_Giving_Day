# Telegram postcard bot

Telegram bot that:

- asks for a short wish with a character limit,
- asks for a photo,
- sends a preview sheet with 9 Figma-based layouts,
- lets the user choose a layout with buttons `01` ... `09`,
- renders the final postcard and sends it back.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add the bot token to `.env` or `~/Desktop/tokens.txt`.
   Default text limit: `45` characters.

3. Start the bot:

```bash
npm start
```

## Commands

- `/start` starts a new postcard flow
- `/reset` clears the current session and asks for a new wish

## Notes

- The bot uses Telegram long polling and does not need an external Telegram SDK.
- User state is stored in memory, which is enough for a simple prototype.
- Raw Figma SVG assets are stored in `assets/raw/` and are rendered directly with `sharp`.
- `npm run render:test` generates local postcard previews and the full 3x3 selection sheet in `output/`.
