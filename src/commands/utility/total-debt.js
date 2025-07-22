import { SlashCommandBuilder } from "discord.js";
import { getUserDebts } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("total-debt")
		.setDescription("The total debt you owe to others across all servers"),
	async execute(interaction) {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;
		const debt = await getUserDebts(null, userId);
		// interaction.guild is the object representing the Guild in which the command was run
		await interaction.reply(
			`<@${userId}> owes others $${debt.totalAmount} ${
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
