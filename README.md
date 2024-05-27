# Blockchain Scanning Telegram Bot

## Description

This is a Express server that runs Telegram bot to interact with users and fetches token information from the EVM blockchain.

## Installation

1. Clone the repository:
```
git clone git@github.com:cryptodev523/blockchain-scan-bot.git
```

2. Install the dependencies:
```
yarn
```

3. Create a `.env` file in the root directory and add your environment variables:

You can refer the `.env.example` file and replace with your variables.

4. Run the server (Local)
```
yarn dev
```

## Endpoints

- `GET /`: Returns a simple message indicating the server is running.
- `POST /bs_webhook`: Receives a webhook from a Telegram bot and responds with token information.

## Connect webhook with the Telegram bot.

- Contact the `BotFather` Telegram Bot and create a new bot.
- Set Webhook url to the Telegram bot with the token.
```
https://api.telegram.org/${BOT_TOKEN}/setWebhook?url=${SERVER_URL}/bs_webhook
```

## Interact with the bot.

- Type the `/bs ${ERC20_TOKEN_ADDRESS}` in the bot.
![Screenshot at May 27 15-53-09](https://github.com/cryptodev523/blockchain-scan-bot/assets/3051782/c2bbe106-5a78-41ba-91b1-d233410e0176)

- Bot will reply in 20 seconds.
![Screenshot at May 27 15-53-24](https://github.com/cryptodev523/blockchain-scan-bot/assets/3051782/8ebffd49-7c9d-495e-a740-0b70a94da639)
![Screenshot at May 27 15-53-33](https://github.com/cryptodev523/blockchain-scan-bot/assets/3051782/0373f510-a18f-4c15-9077-b7832553ca8b)

