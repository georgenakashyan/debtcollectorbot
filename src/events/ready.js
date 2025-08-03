import { Events, REST, Routes } from "discord.js";

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		// Construct and prepare an instance of the REST module
		const rest = new REST().setToken(process.env.DISCORD_TOKEN);

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
			const data = await rest.put(
				Routes.applicationCommands(process.env.APP_ID),
				{
					body: commandsData,
				}
			);

			console.log(
				`Successfully reloaded ${data.length} application (/) commands.`
			);
		} catch (error) {
			console.error("Error registering commands:", error);
		}
	},
};
