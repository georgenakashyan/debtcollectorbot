import "dotenv/config";
import { getRPSChoices } from "./game.js";
import { capitalize, InstallGlobalCommands } from "./utils.js";

// Get the game choices from game.js
function createCommandChoices() {
	const choices = getRPSChoices();
	const commandChoices = [];

	for (let choice of choices) {
		commandChoices.push({
			name: capitalize(choice),
			value: choice.toLowerCase(),
		});
	}

	return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
	name: "test",
	description: "Basic command",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const TOTAL_DEBT_COMMAND = {
	name: "totaldebt",
	description: "Total debt you owe to others in the server",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const TOTAL_OWED_COMMAND = {
	name: "totalowed",
	description: "Total you are owed by others in the server",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const OWE_TO_ME_COMMAND = {
	name: "owetome",
	description: "Check how much someone owes you",
	options: [
		{
			type: 6,
			name: "debtor",
			description: "Who owes you?",
			required: true,
		},
	],
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const TOP_DEBTORS_COMMAND = {
	name: "topdebtors",
	description: "Leaderboard of top debtors in the server",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const ALL_COMMANDS = [
	TEST_COMMAND,
	TOTAL_DEBT_COMMAND,
	TOTAL_OWED_COMMAND,
	OWE_TO_ME_COMMAND,
	TOP_DEBTORS_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
