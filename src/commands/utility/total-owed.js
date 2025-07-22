import { SlashCommandBuilder } from "discord.js";
import { getUserCredits } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("total-owed")
		.setDescription("The total you are owed by others across all servers"),
	async execute(interaction) {
		const userId = interaction.user.id;
		const credit = await getUserCredits(null, userId);
		// interaction.guild is the object representing the Guild in which the command was run
		await interaction.reply(
			`<@${userId}> is owed $${credit.totalAmount} ${
				credit.debtCount > 0
					? pluralize(
							`from ${credit.debtCount} transaction`,
							credit.debtCount
					  )
					: ""
			}`
		);
	},
};
