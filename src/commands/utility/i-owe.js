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
		const creditorId = interaction.options.getUser("creditor");

		if (userId === creditorId) {
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: "You cannot owe yourself money!",
					flags: 64,
				},
			});
		}

		const debt = await getTotalDebtFromSomeone(creditorId, userId);

		// interaction.guild is the object representing the Guild in which the command was run
		await interaction.reply({
			content: `You owe ${creditorId} $${debt.totalAmount} ${
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
