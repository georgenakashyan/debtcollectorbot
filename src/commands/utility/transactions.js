import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { getAllUnsettledTransactionsFromSomeone } from "../../db/dbQueries.js";

export default {
	data: new SlashCommandBuilder()
		.setName("transactions")
		.setDescription("Show and manage all transactions with a user")
		.addUserOption((option) =>
			option
				.setName("debtor")
				.setDescription("Who owes you?")
				.setRequired(true)
		),
	async execute(interaction) {
		const userId = interaction.user.id;
		const debtorId = interaction.options.getUser("debtor").id;

		if (userId === debtorId) {
			return await interaction.reply({
				content: "You can't owe yourself money!",
				flags: MessageFlags.Ephemeral,
			});
		}

		const transactions = await getAllUnsettledTransactionsFromSomeone(
			userId,
			debtorId
		);

		if (transactions.length === 0) {
			return await interaction.reply({
				content: `<@${debtorId}> owes you nothing`,
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.reply({
			content: `<@${debtorId}> owes you ${transactions.length} transaction(s)`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
