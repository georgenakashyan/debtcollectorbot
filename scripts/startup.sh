#!/bin/bash

# Navigate to project directory
cd /root/debtcollectorbot

# Set NODE_ENV if not set
export NODE_ENV=production

# Start the bot
echo "Starting DebtCollectorBot..."
npm run start