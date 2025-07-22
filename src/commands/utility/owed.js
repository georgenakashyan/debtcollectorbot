import { SlashCommandBuilder } from "discord.js";
import { getUserCredits } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("owed")
		.setDescription("The total you are owed by others in this server"),
	async execute(interaction) {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;
		const credit = await getUserCredits(guildId, userId);

		await interaction.reply(
			`<@${userId}> is owed $${credit.totalAmount} in this server ${
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
