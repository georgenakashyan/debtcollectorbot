import "dotenv/config";
import { InstallGlobalCommands } from "../utils/utils.js";

const TOTAL_DEBT_COMMAND = {
	name: "total-debt",
	description: "The total debt you owe to others across all servers",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const TOTAL_SERVER_DEBT_COMMAND = {
	name: "debt",
	description: "The total debt you owe to others in this server",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const TOTAL_OWED_COMMAND = {
	name: "total-owed",
	description: "The total you are owed by others across all servers",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const TOTAL_SERVER_OWED_COMMAND = {
	name: "owed",
	description: "The total you are owed by others in this server",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const OWE_TO_ME_COMMAND = {
	name: "owes-me",
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
	description: "Leaderboard of top debtors in this server",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const ADD_DEBT_COMMAND = {
	name: "add-debt",
	description: "Add a transaction where someone owes you money now",
	type: 1,
	options: [
		{
			type: 6,
			name: "debtor",
			description: "Who owes you?",
			required: true,
		},
		{
			type: 4,
			name: "amount",
			description: "How much?",
			required: true,
		},
		{
			type: 3,
			name: "description",
			description: "What was the money for",
			required: true,
		},
	],
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

const REMOVE_DEBT_COMMAND = {
	name: "remove-debt",
	description: "Mark a debt someone owes you as paid off",
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

const PARTIALLY_PAY_DEBT_COMMAND = {
	name: "paid",
	description: "Subtract a payment from a debt someone owes you",
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

const ALL_COMMANDS = [
	TOTAL_DEBT_COMMAND,
	TOTAL_SERVER_DEBT_COMMAND,
	TOTAL_OWED_COMMAND,
	TOTAL_SERVER_OWED_COMMAND,
	OWE_TO_ME_COMMAND,
	TOP_DEBTORS_COMMAND,
	ADD_DEBT_COMMAND,
	REMOVE_DEBT_COMMAND,
	PARTIALLY_PAY_DEBT_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
