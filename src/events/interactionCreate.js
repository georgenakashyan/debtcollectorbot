import { Events, MessageFlags } from "discord.js";
import { ObjectId } from "mongodb";
import { partiallySettleTransaction } from "../db/dbUpdates.js";

export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// Handle modal submissions for partial payments
		if (interaction.isModalSubmit()) {
			if (interaction.customId.startsWith("partial_payment_")) {
				const transactionId = interaction.customId.replace(
					"partial_payment_",
					""
				);
				// Get raw input and truncate to 2 decimal places
				const rawInput =
					interaction.fields.getTextInputValue("payment_amount");
				const parsedAmount = parseFloat(rawInput);

				// Truncate to 2 decimal places by converting to fixed and back to float
				const paymentAmount = isNaN(parsedAmount)
					? NaN
					: parseFloat(parsedAmount.toFixed(2));

				// Validate payment amount
				if (isNaN(paymentAmount) || paymentAmount <= 0) {
					return interaction.reply({
						content: "Please enter a valid positive number.",
						flags: MessageFlags.Ephemeral,
					});
				}

				try {
					// Apply partial payment
					const userId = interaction.user.id;
					const updatedTransaction = await partiallySettleTransaction(
						userId,
						new ObjectId(transactionId),
						paymentAmount
					);

					if (!updatedTransaction) {
						return interaction.reply({
							content:
								"Transaction not found or you don't have permission to update it.",
							flags: MessageFlags.Ephemeral,
						});
					}

					const remainingAmount = updatedTransaction.amount;
					const wasFullySettled = remainingAmount <= 0;

					await interaction.reply({
						content: wasFullySettled
							? `✅ Partial payment of $${paymentAmount} applied! Transaction fully paid off!`
							: `✅ Partial payment of $${paymentAmount} applied! Remaining: $${remainingAmount.toFixed(
									2
							  )}`,
						flags: MessageFlags.Ephemeral,
					});
				} catch (error) {
					console.error("Error processing partial payment:", error);
					await interaction.reply({
						content:
							"An error occurred while processing the partial payment.",
						flags: MessageFlags.Ephemeral,
					});
				}
			}
			return;
		}

		// Handle button interactions
		if (interaction.isButton()) {
			// These interactions are handled by the transactions command collector
			// We don't need to handle them here as they're component interactions
			return;
		}

		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(
			interaction.commandName
		);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`
			);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
