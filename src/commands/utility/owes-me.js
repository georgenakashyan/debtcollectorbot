import { SlashCommandBuilder } from "discord.js";
import { getTotalDebtFromSomeone } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

export default {
	data: new SlashCommandBuilder()
		.setName("owes-me")
		.setDescription("Check how much someone owes you")
		.addUserOption((option) =>
			option
				.setName("debtor")
				.setDescription("Who owes you?")
				.setRequired(true)
		),
	async execute(interaction) {
		const userId = interaction.user.id;
		const debtorId = interaction.options.getUser("debtor");
		const debt = await getTotalDebtFromSomeone(userId, debtorId);
		// interaction.guild is the object representing the Guild in which the command was run
		await interaction.reply(
			`<@${debtorId}> owes <@${userId}> $${debt.totalAmount} ${
				debt.debtCount > 0
					? pluralize(
							`from ${debt.debtCount} transaction`,
							debt.debtCount
					  )
					: ""
			}`
		);
	},
};
