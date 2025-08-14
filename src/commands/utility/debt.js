import { SlashCommandBuilder } from "discord.js";
import { getUserDebtsByCreditor } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("debt")
		.setDescription("Shows who you owe money to in this server"),
	async execute(interaction) {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;
		const debts = await getUserDebtsByCreditor(guildId, userId);

		if (debts.length === 0) {
			await interaction.reply({
				content: "You don't owe anyone money in this server! 🎉",
				ephemeral: true
			});
			return;
		}

		const totalAmount = debts.reduce((sum, debt) => sum + parseFloat(debt.totalAmount), 0);
		const totalTransactions = debts.reduce((sum, debt) => sum + debt.debtCount, 0);

		let response = "**You owe money to:**\n";
		debts.forEach(debt => {
			const transactionText = pluralize("transaction", debt.debtCount);
			response += `• <@${debt.creditorId}>: $${debt.totalAmount} (from ${debt.debtCount} ${transactionText})\n`;
		});
		
		response += `\n**Total: $${totalAmount.toFixed(2)}** from ${totalTransactions} ${pluralize("transaction", totalTransactions)}`;

		await interaction.reply({
			content: response,
			ephemeral: true
		});
	},
};
