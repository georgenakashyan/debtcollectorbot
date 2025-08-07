import { SlashCommandBuilder } from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName("coinflip")
		.setDescription("Flip a coin"),
	async execute(interaction) {
		const userId = interaction.user.id;

		const headsOrTails =
			Math.floor(Math.random() * 2) === 0 ? "Heads" : "Tails";

		await interaction.reply({
			content: `<@${userId}> flipped a ${headsOrTails}.`,
		});
	},
};
