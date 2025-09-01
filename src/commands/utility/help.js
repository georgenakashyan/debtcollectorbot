import { MessageFlags, SlashCommandBuilder } from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Shows all available commands and their descriptions"),
	async execute(interaction) {
		const commands = interaction.client.commands;
		
		let helpMessage = "**Available Commands:**\n\n";
		
		// Sort commands alphabetically by name
		const sortedCommands = Array.from(commands.values()).sort((a, b) => 
			a.data.name.localeCompare(b.data.name)
		);
		
		for (const command of sortedCommands) {
			helpMessage += `**/${command.data.name}** - ${command.data.description}\n`;
		}
		
		await interaction.reply({
			content: helpMessage,
			flags: MessageFlags.Ephemeral,
		});
	},
};