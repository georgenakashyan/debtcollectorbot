import { SlashCommandBuilder } from "discord.js";
import { getUserDebtsByCreditor } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("view-debt")
		.setDescription("View who a user owes money to in this server")
		.addUserOption(option =>
			option
				.setName("user")
				.setDescription("User to view debts for")
				.setRequired(true)
		),
	async execute(interaction) {
		// Defer reply to avoid timeout
		await interaction.deferReply();

		const targetUser = interaction.options.getUser("user");
		const guildId = interaction.guild.id;
		const debts = await getUserDebtsByCreditor(guildId, targetUser.id);

		if (debts.length === 0) {
			await interaction.editReply({
				content: `${targetUser.username} doesn't owe anyone money in this server! 🎉`
			});
			return;
		}

		const totalAmount = debts.reduce((sum, debt) => sum + parseFloat(debt.totalAmount), 0);
		const totalTransactions = debts.reduce((sum, debt) => sum + debt.debtCount, 0);

		let response = `**${targetUser.username} owes money to:**\n`;

		// Fetch creditor usernames
		for (const debt of debts) {
			let creditorName;
			try {
				const member = await interaction.guild.members.fetch(debt.creditorId);
				creditorName = member.user.username;
			} catch (error) {
				creditorName = `User ${debt.creditorId}`;
			}

			const transactionText = pluralize("transaction", debt.debtCount);
			response += `• ${creditorName}: $${debt.totalAmount} (from ${debt.debtCount} ${transactionText})\n`;
		}

		response += `\n**Total: $${totalAmount.toFixed(2)}** from ${totalTransactions} ${pluralize("transaction", totalTransactions)}`;

		await interaction.editReply({
			content: response
		});
	},
};
