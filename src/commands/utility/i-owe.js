import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { getTransactionDetailsFromSomeone } from "../../db/dbQueries.js";
import { pluralize, formatNumber } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("i-owe")
		.setDescription("Check how much you owe someone")
		.addUserOption((option) =>
			option
				.setName("creditor")
				.setDescription("Who do you owe?")
				.setRequired(true)
		),
	async execute(interaction) {
		const userId = interaction.user.id;
		const creditorId = interaction.options.getUser("creditor").id;

		if (userId === creditorId) {
			return await interaction.reply({
				content: "You can't owe yourself money!",
				flags: MessageFlags.Ephemeral,
			});
		}

		const debtDetails = await getTransactionDetailsFromSomeone(creditorId, userId);

		if (debtDetails.debtCount === 0) {
			return await interaction.reply({
				content: `You don't owe <@${creditorId}> anything!`,
				flags: MessageFlags.Ephemeral,
			});
		}

		// Build transaction list
		let transactionList = debtDetails.transactions.map(tx => {
			const date = new Date(tx.createdAt).toLocaleDateString();
			const description = tx.description || "*No description*";
			const amount = (tx.amount || 0).toFixed(2);
			return `• $${amount} - ${description} (${date})`;
		}).join('\n');

		// Keep message under Discord's 2000 character limit
		const totalAmount = (debtDetails.totalAmount || 0).toFixed(2);
		const headerText = `You owe <@${creditorId}> $${totalAmount} ${pluralize(`from ${debtDetails.debtCount} transaction`, debtDetails.debtCount)}:\n\n`;
		const maxListLength = 2000 - headerText.length - 50; // buffer for safety

		if (transactionList.length > maxListLength) {
			// Truncate and add continuation message
			const truncatedList = transactionList.substring(0, maxListLength);
			const lastNewlineIndex = truncatedList.lastIndexOf('\n');
			transactionList = truncatedList.substring(0, lastNewlineIndex) + '\n\n*...and more transactions*';
		}

		await interaction.reply({
			content: headerText + transactionList,
			flags: MessageFlags.Ephemeral,
		});
	},
};
