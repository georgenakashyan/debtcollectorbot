import { MessageFlags, SlashCommandBuilder } from "discord.js";
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
		const debtorId = interaction.options.getUser("debtor").id;

		if (userId === debtorId) {
			return await interaction.reply({
				content: "You can't owe yourself money!",
				flags: MessageFlags.Ephemeral,
			});
		}

		const debt = await getTotalDebtFromSomeone(userId, debtorId);

		await interaction.reply({
			content: `<@${debtorId}> owes you $${debt.totalAmount} ${
				debt.debtCount > 0
					? pluralize(
							`from ${debt.debtCount} transaction`,
							debt.debtCount
					  )
					: ""
			}`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
