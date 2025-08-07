import { Events, MessageFlags } from "discord.js";

export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// Modal submissions are now handled by individual command collectors
		// This allows for better UI updates and state management

		// Handle button interactions
		if (interaction.isButton()) {
			// These interactions are handled by the transactions command collector
			// We don't need to handle them here as they're component interactions
			return;
		}

		if (!interaction.isChatInputCommand()) return;

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
			console.error(error);
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
	},
};
