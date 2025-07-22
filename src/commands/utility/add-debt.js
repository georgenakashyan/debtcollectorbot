import { SlashCommandBuilder } from "discord.js";
import { addTransaction } from "../../db/dbUpdates.js";
import { formatNumber } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("add-debt")
		.setDescription("Add a debt that someone owes you")
		.addUserOption((option) =>
			option
				.setName("debtor")
				.setDescription("Who owes you?")
				.setRequired(true)
		)
		.addNumberOption((option) =>
			option
				.setName("amount")
				.setDescription("Debt amount")
				.setMinValue(0.01)
				.setMaxValue(10000)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("description")
				.setDescription("What was the money for?")
				.setRequired(true)
		),
	async execute(interaction) {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;
		const debtorId = interaction.options.getUser("debtor").id;
		const amount = formatNumber(interaction.options.getNumber("amount"));
		const description = interaction.options.getString("description");

		if (userId === debtorId) {
			await interaction.reply("You can't owe yourself money!");
			return;
		}

		await addTransaction(
			guildId,
			userId,
			debtorId,
			amount,
			description
		).then(async () => {
			await interaction.reply(
				`<@${debtorId}> now owes <@${userId}> $${amount} for "${description}"`
			);
		});
	},
};
