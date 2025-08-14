import { SlashCommandBuilder } from "discord.js";
import { getUserCreditsByDebtor } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("owed")
		.setDescription("Shows who owes you money in this server"),
	async execute(interaction) {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;
		const credits = await getUserCreditsByDebtor(guildId, userId);

		if (credits.length === 0) {
			await interaction.reply({
				content: "No one owes you money in this server! 💸",
				ephemeral: true
			});
			return;
		}

		const totalAmount = credits.reduce((sum, credit) => sum + parseFloat(credit.totalAmount), 0);
		const totalTransactions = credits.reduce((sum, credit) => sum + credit.debtCount, 0);

		let response = "**People who owe you:**\n";
		credits.forEach(credit => {
			const transactionText = pluralize("transaction", credit.debtCount);
			response += `• <@${credit.debtorId}>: $${credit.totalAmount} (from ${credit.debtCount} ${transactionText})\n`;
		});
		
		response += `\n**Total: $${totalAmount.toFixed(2)}** from ${totalTransactions} ${pluralize("transaction", totalTransactions)}`;

		await interaction.reply({
			content: response,
			ephemeral: true
		});
	},
};
