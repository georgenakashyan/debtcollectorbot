import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

const TOTAL_DEBT_COMMAND = {
	name: "total-debt",
	description: "Total debt you owe to others in the server",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const TOTAL_OWED_COMMAND = {
	name: "total-owed",
	description: "Total you are owed by others in the server",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const OWE_TO_ME_COMMAND = {
	name: "owed",
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
	name: "top-debtors",
	description: "Leaderboard of top debtors in the server",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const ALL_COMMANDS = [
	TOTAL_DEBT_COMMAND,
	TOTAL_OWED_COMMAND,
	OWE_TO_ME_COMMAND,
	TOP_DEBTORS_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
