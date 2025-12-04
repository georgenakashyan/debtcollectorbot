import { SlashCommandBuilder } from "discord.js";
import { getUserCreditsByDebtor } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("view-owed")
		.setDescription("View who owes a user money in this server")
		.addUserOption(option =>
			option
				.setName("user")
				.setDescription("User to view what they are owed")
				.setRequired(true)
		),
	async execute(interaction) {
		// Defer reply to avoid timeout
		await interaction.deferReply();

		const targetUser = interaction.options.getUser("user");
		const guildId = interaction.guild.id;
		const credits = await getUserCreditsByDebtor(guildId, targetUser.id);

		if (credits.length === 0) {
			await interaction.editReply({
				content: `No one owes ${targetUser.username} money in this server! 💸`
			});
			return;
		}

		const totalAmount = credits.reduce((sum, credit) => sum + parseFloat(credit.totalAmount), 0);
		const totalTransactions = credits.reduce((sum, credit) => sum + credit.debtCount, 0);

		let response = `**People who owe ${targetUser.username}:**\n`;

		// Fetch debtor usernames
		for (const credit of credits) {
			let debtorName;
			try {
				const member = await interaction.guild.members.fetch(credit.debtorId);
				debtorName = member.user.username;
			} catch (error) {
				debtorName = `User ${credit.debtorId}`;
			}

			const transactionText = pluralize("transaction", credit.debtCount);
			response += `• ${debtorName}: $${credit.totalAmount} (from ${credit.debtCount} ${transactionText})\n`;
		}

		response += `\n**Total: $${totalAmount.toFixed(2)}** from ${totalTransactions} ${pluralize("transaction", totalTransactions)}`;

		await interaction.editReply({
			content: response
		});
	},
};
