import { SlashCommandBuilder } from "discord.js";
import { getUserDebts } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("debt")
		.setDescription("The total debt you owe to others in this server"),
	async execute(interaction) {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;
		const debt = await getUserDebts(guildId, userId);

		await interaction.reply(
			`<@${userId}> owes $${debt.totalAmount} in this server ${
				debt.debtCount > 0
					? pluralize(
							`from ${debt.debtCount} transaction`,
							debt.debtCount
					  )
					: ""
			}`
		);
	},
};
