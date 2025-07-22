import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { getTotalDebtFromSomeone } from "../../db/dbQueries.js";
import { pluralize } from "../../utils/utils.js";

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

		const debt = await getTotalDebtFromSomeone(creditorId, userId);

		await interaction.reply({
			content: `You owe <@${creditorId}> $${debt.totalAmount} ${
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
