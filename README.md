# DebtCollector Bot

[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v1/monitor/212yh.svg)](https://uptime.betterstack.com/?utm_source=status_badge)
# DebtCollector Bot

[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v1/monitor/212yh.svg)](https://uptime.betterstack.com/?utm_source=status_badge)

A Discord bot that helps you track debts and IOUs within your Discord community. Keep tabs on who owes what, settle debts, and maintain accountability among friends and group members.

## Features

- **Track Debts**: Record who owes money to whom with detailed descriptions
- **View Balances**: Check individual and total debt amounts
- **Settlement Tracking**: Mark debts as paid when settled
- **Transaction History**: View complete transaction logs
- **Leaderboards**: See top debtors and creditors in your server

## Quick Start

### Option 1: Invite the Bot (Recommended)

[**Invite DebtCollector Bot to your Discord server**](https://discord.com/oauth2/authorize?client_id=1389366055314522182)
A Discord bot that helps you track debts and IOUs within your Discord community. Keep tabs on who owes what, settle debts, and maintain accountability among friends and group members.

## Features

- **Track Debts**: Record who owes money to whom with detailed descriptions
- **View Balances**: Check individual and total debt amounts
- **Settlement Tracking**: Mark debts as paid when settled
- **Transaction History**: View complete transaction logs
- **Leaderboards**: See top debtors and creditors in your server

## Quick Start

### Option 1: Invite the Bot (Recommended)

[**Invite DebtCollector Bot to your Discord server**](https://discord.com/oauth2/authorize?client_id=1389366055314522182)

Required permissions:
- `applications.commands` - For slash commands
- `bot` with "Send Messages" - For responses

### Option 2: Self-Host

Requirements:
- Node.js 18.x or higher
- MongoDB database
- Discord Bot Token

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/DebtCollectorBot.git
   cd DebtCollectorBot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
Required permissions:
- `applications.commands` - For slash commands
- `bot` with "Send Messages" - For responses

### Option 2: Self-Host

Requirements:
- Node.js 18.x or higher
- MongoDB database
- Discord Bot Token

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/DebtCollectorBot.git
   cd DebtCollectorBot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file with the following variables:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   APP_ID=your_application_id_here
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Register slash commands**
   ```bash
   npm run register
   ```
3. **Environment Setup**
   
   Create a `.env` file with the following variables:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   APP_ID=your_application_id_here
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Register slash commands**
   ```bash
   npm run register
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

   For development with hot reload:
   ```bash
   npm run dev
   ```

## Commands

### Debt Management
- `/add-debt <debtor> <amount> <description>` - Record a new debt
- `/i-owe <creditor> <amount> <description>` - Record a debt you owe someone
- `/debt <user> [amount] [description]` - Mark a debt as settled

### View Balances
- `/owed` - See all debts owed to you
- `/owes-me <user>` - Check what a specific user owes you
- `/total-owed` - Your total amount owed by others
- `/total-debt` - Your total debt amount

### Statistics
- `/top-debtors` - Server leaderboard of biggest debtors
- `/transactions [user]` - View transaction history

### General
- `/ping` - Check if the bot is responsive

## Examples

```
/add-debt @john 25.50 lunch at pizza place
/i-owe @sarah 15.00 movie ticket
/debt @john 25.50 paid back lunch money
/owed
/total-debt
```

## Development

### Project Structure
```
src/
├── app.js              # Main application entry point
├── commands/
│   └── utility/        # Slash command implementations
├── db/
│   ├── db.js          # Database connection
│   ├── dbQueries.js   # Read operations
│   └── dbUpdates.js   # Write operations
├── events/            # Discord.js event handlers
└── utils/             # Helper functions
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Database Schema

The bot uses MongoDB with a "debts" collection. Each document represents a transaction:

```javascript
{
  creditorId: "discord_user_id",
  debtorId: "discord_user_id", 
  amount: 25.50,
  description: "lunch money",
  settled: false,
  guildId: "discord_guild_id",
  timestamp: ISODate("2023-...")
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Report bugs by opening an [issue](https://github.com/your-username/DebtCollectorBot/issues)
- Check the [documentation](https://github.com/your-username/DebtCollectorBot/wiki) for detailed guides
