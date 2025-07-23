import { SlashCommandBuilder } from "discord.js";
import { getTopDebtors } from "../../db/dbQueries.js";
import { buildTopDebtorLeaderboard } from "../../utils/buildTopDebtorLeaderboard.js";

export default {
	data: new SlashCommandBuilder()
		.setName("top-debtors")
		.setDescription("Leaderboard of top debtors in this server"),
	async execute(interaction) {
		const guildId = interaction.guild.id;
		const limit = 10;
		const debtors = await getTopDebtors(guildId, limit);
		const leaderboardContent = buildTopDebtorLeaderboard(debtors, limit);

		await interaction.reply(leaderboardContent);
	},
};
