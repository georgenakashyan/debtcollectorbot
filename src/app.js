import {
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	MessageFlags,
	REST,
	Routes,
} from "discord.js";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectToDB } from "./db/db.js";

// Initialize database connection
const DB = await connectToDB();

// Proper ES module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.APP_ID;

client.commands = new Collection();

// Load commands
const commandPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(commandPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith(".js"));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		try {
			const fileUrl = `file://${filePath.replace(/\\/g, "/")}`;
			const command = await import(fileUrl);

			if ("data" in command.default && "execute" in command.default) {
				client.commands.set(command.default.data.name, command.default);
				console.log(`Loaded command: ${command.default.data.name}`);
			} else if ("data" in command && "execute" in command) {
				client.commands.set(command.data.name, command);
				console.log(`Loaded command: ${command.data.name}`);
			} else {
				console.log(
					`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
				);
			}
		} catch (error) {
			console.error(
				`[ERROR] Failed to load command at ${filePath}:`,
				error
			);
		}
	}
}

// Load events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
	.readdirSync(eventsPath)
	.filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const fileUrl = `file://${filePath.replace(/\\/g, "/")}`;
	const event = await import(fileUrl);

	if (event.once) {
		console.log(`Loading once event: ${event.name}`);
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		console.log(`Loading event: ${event.name}`);
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// Wait for the client to be ready before registering commands
client.once(Events.ClientReady, async () => {
	console.log(`Logged in as ${client.user.tag}!`);

	// Construct and prepare an instance of the REST module
	const rest = new REST().setToken(token);

	try {
		console.log("Started refreshing application (/) commands.");
		console.log(`Registering ${client.commands.size} commands...`);

		const commandsData = client.commands.map((command) =>
			command.data.toJSON()
		);
		console.log(
			"Commands to register:",
			commandsData.map((cmd) => cmd.name)
		);

		// Update all commands to Discord
		const data = await rest.put(Routes.applicationCommands(clientId), {
			body: commandsData,
		});

		console.log(
			`Successfully reloaded ${data.length} application (/) commands.`
		);
	} catch (error) {
		console.error("Error registering commands:", error);
	}
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isChatInputCommand()) {
		console.log(`Received command: ${interaction.commandName}`);

		const command = interaction.client.commands.get(
			interaction.commandName
		);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`
			);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error("Command execution error:", error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	}
});

// Login to Discord
client.login(token);
