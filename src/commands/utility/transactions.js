import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageFlags,
	ModalBuilder,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { ObjectId } from "mongodb";
import { getAllUnsettledTransactionsFromSomeone } from "../../db/dbQueries.js";
import {
	partiallySettleTransaction,
	settleTransaction,
} from "../../db/dbUpdates.js";
import { formatNumber } from "../../utils/utils.js";
const TRANSACTIONS_PER_PAGE = 10;

// Utility function to safely handle interaction responses
async function safeInteractionResponse(
	interaction,
	content,
	ephemeral = false
) {
	const response = {
		content,
		...(ephemeral && { flags: MessageFlags.Ephemeral }),
	};

	try {
		if (!interaction.replied && !interaction.deferred) {
			return await interaction.reply(response);
		} else {
			return await interaction.followUp(response);
		}
	} catch (error) {
		console.error("Failed to respond to interaction:", error);
		return null;
	}
}

function buildTransactionEmbed(
	transactions,
	debtorId,
	page,
	totalPages,
	startIndex
) {
	const embed = new EmbedBuilder()
		.setTitle(`Transactions with <@${debtorId}>`)
		.setDescription(
			transactions.length === 0
				? "No unsettled transactions."
				: transactions
						.map((tx, idx) => {
							const txNumber = startIndex + idx + 1;
							const date = new Date(
								tx.createdAt
							).toLocaleDateString();
							return `**${txNumber}.** $${formatNumber(
								tx.amount
							)} - ${
								tx.description || "*No description*"
							} *(${date})*`;
						})
						.join("\n")
		)
		.setFooter({
			text: `Page ${
				page + 1
			} of ${totalPages} | Select a transaction number and choose an action`,
		});
	return embed;
}

function buildActionRows(
	transactions,
	page,
	totalPages,
	startIndex,
	buttonsEnabled = false
) {
	const rows = [];

	// Transaction select menu (if there are transactions)
	if (transactions.length > 0) {
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("select_transaction")
			.setPlaceholder("Select a transaction...")
			.addOptions(
				transactions.map((tx, idx) => {
					const txNumber = startIndex + idx + 1;
					const shortDesc =
						tx.description && tx.description.length > 30
							? tx.description.substring(0, 30) + "..."
							: tx.description || "No description";
					return new StringSelectMenuOptionBuilder()
						.setLabel(
							`${txNumber}. $${formatNumber(
								tx.amount
							)} - ${shortDesc}`
						)
						.setValue(tx._id.toString())
						.setDescription(
							`Created: ${new Date(
								tx.createdAt
							).toLocaleDateString()}`
						);
				})
			);

		const selectRow = new ActionRowBuilder().addComponents(selectMenu);
		rows.push(selectRow);

		// Action buttons row
		const actionRow = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId("partial_pay_selected")
				.setLabel("Partial Payment")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(!buttonsEnabled),
			new ButtonBuilder()
				.setCustomId("settle_selected")
				.setLabel("Settle Full Amount")
				.setStyle(ButtonStyle.Success)
				.setDisabled(!buttonsEnabled)
		);
		rows.push(actionRow);
	}

	// Pagination row
	if (totalPages > 1) {
		const paginationRow = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId("prev_page")
				.setLabel("Previous")
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === 0),
			new ButtonBuilder()
				.setCustomId("next_page")
				.setLabel("Next")
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === totalPages - 1)
		);
		rows.push(paginationRow);
	}

	return rows;
}

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

		// Defer the response to give us more time for database operations
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const allTransactions = await getAllUnsettledTransactionsFromSomeone(
			userId,
			debtorId
		);

		if (allTransactions.length === 0) {
			console.error("No transactions found, sending empty response");
			return await interaction.editReply({
				content: `<@${debtorId}> owes you nothing`,
			});
		}

		let page = 0;
		let totalPages = Math.ceil(
			allTransactions.length / TRANSACTIONS_PER_PAGE
		);

		const getPageTransactions = (page) =>
			allTransactions.slice(
				page * TRANSACTIONS_PER_PAGE,
				(page + 1) * TRANSACTIONS_PER_PAGE
			);

		const getStartIndex = (page) => page * TRANSACTIONS_PER_PAGE;

		const embed = buildTransactionEmbed(
			getPageTransactions(page),
			debtorId,
			page,
			totalPages,
			getStartIndex(page)
		);
		const rows = buildActionRows(
			getPageTransactions(page),
			page,
			totalPages,
			getStartIndex(page)
		);

		const reply = await interaction.editReply({
			embeds: [embed],
			components: rows,
		});

		// Collector for all component interactions
		const collector = reply.createMessageComponentCollector({
			time: 5 * 60 * 1000, // 5 minutes
		});

		let selectedTransactionId = null;

		collector.on("collect", async (componentInt) => {
			if (componentInt.user.id !== interaction.user.id) {
				console.error(
					"UNAUTHORIZED: Different user tried to use components"
				);
				return componentInt.reply({
					content: "Only the command user can use these components.",
					flags: MessageFlags.Ephemeral,
				});
			}

			// Handle select menu interactions
			if (componentInt.customId === "select_transaction") {
				selectedTransactionId = componentInt.values[0];

				// Enable action buttons
				const currentPageTransactions = getPageTransactions(page);
				const newRows = buildActionRows(
					currentPageTransactions,
					page,
					totalPages,
					getStartIndex(page),
					true
				);

				await componentInt.update({
					components: newRows,
				});
				return;
			}

			// Handle pagination
			if (componentInt.customId === "prev_page" && page > 0) {
				page--;
				selectedTransactionId = null;
			} else if (
				componentInt.customId === "next_page" &&
				page < totalPages - 1
			) {
				page++;
				selectedTransactionId = null;
			} else if (componentInt.customId === "partial_pay_selected") {
				if (!selectedTransactionId) {
					console.error(
						"ERROR: No transaction selected for partial payment"
					);
					return componentInt.reply({
						content: "Please select a transaction first.",
						flags: MessageFlags.Ephemeral,
					});
				}

				// Find the selected transaction
				const selectedTransaction = allTransactions.find(
					(tx) => tx._id.toString() === selectedTransactionId
				);
				if (!selectedTransaction) {
					console.error(
						"ERROR: Selected transaction not found in current list"
					);
					return componentInt.reply({
						content: "Transaction not found.",
						flags: MessageFlags.Ephemeral,
					});
				}

				// Create partial payment modal
				const modal = new ModalBuilder()
					.setCustomId(`partial_payment_${selectedTransactionId}`)
					.setTitle("Partial Payment");

				const amountInput = new TextInputBuilder()
					.setCustomId("payment_amount")
					.setLabel("Payment Amount")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder(
						`Max: $${formatNumber(selectedTransaction.amount)}`
					)
					.setRequired(true)
					.setMaxLength(10);

				const firstActionRow = new ActionRowBuilder().addComponents(
					amountInput
				);
				modal.addComponents(firstActionRow);

				await componentInt.showModal(modal);

				// Handle modal submission
				try {
					const modalSubmission = await componentInt.awaitModalSubmit(
						{
							filter: (i) =>
								i.customId ===
									`partial_payment_${selectedTransactionId}` &&
								i.user.id === interaction.user.id,
							time: 60_000, // 60 seconds timeout
						}
					);

					const paymentAmount = parseFloat(
						modalSubmission.fields.getTextInputValue(
							"payment_amount"
						)
					);

					if (isNaN(paymentAmount) || paymentAmount <= 0) {
						return await safeInteractionResponse(
							modalSubmission,
							"Please enter a valid payment amount.",
							true
						);
					}

					if (paymentAmount > selectedTransaction.amount) {
						return await safeInteractionResponse(
							modalSubmission,
							`Payment amount ($${formatNumber(
								paymentAmount
							)}) cannot exceed the debt amount ($${formatNumber(
								selectedTransaction.amount
							)}).`,
							true
						);
					}

					try {
						const updatedTransaction =
							await partiallySettleTransaction(
								userId,
								new ObjectId(selectedTransactionId),
								paymentAmount
							);

						if (!updatedTransaction) {
							return await safeInteractionResponse(
								modalSubmission,
								"Transaction not found or you don't have permission to modify it.",
								true
							);
						}

						// Refresh transaction list
						const updatedTransactions =
							await getAllUnsettledTransactionsFromSomeone(
								userId,
								debtorId
							);
						allTransactions.splice(
							0,
							allTransactions.length,
							...updatedTransactions
						);

						if (allTransactions.length === 0) {
							await safeInteractionResponse(
								modalSubmission,
								`✅ Payment processed! <@${debtorId}> has paid off all their debts to <@${userId}>.`,
								true
							);
							collector.stop();
							return;
						}

						// Recalculate pagination
						const newTotalPages = Math.ceil(
							allTransactions.length / TRANSACTIONS_PER_PAGE
						);
						if (page >= newTotalPages) {
							page = Math.max(0, newTotalPages - 1);
						}
						totalPages = newTotalPages;
						selectedTransactionId = null;

						const wasFullyPaid = updatedTransaction.isSettled;
						const remainingAmount = updatedTransaction.amount;

						await safeInteractionResponse(
							modalSubmission,
							wasFullyPaid
								? `✅ Payment processed! <@${debtorId}> paid $${formatNumber(
										paymentAmount
								  )} and fully settled the debt.`
								: `✅ Partial payment processed! <@${debtorId}> paid $${formatNumber(
										paymentAmount
								  )}. Remaining balance: $${formatNumber(
										remainingAmount.toFixed(2)
								  )}.`,
							true
						);

						// Update main message
						const newEmbed = buildTransactionEmbed(
							getPageTransactions(page),
							debtorId,
							page,
							totalPages,
							getStartIndex(page)
						);
						const newRows = buildActionRows(
							getPageTransactions(page),
							page,
							totalPages,
							getStartIndex(page),
							false
						);

						try {
							await reply.edit({
								embeds: [newEmbed],
								components: newRows,
							});
						} catch (editError) {
							if (editError.code === 10008) {
								console.log(
									"Original message was deleted, skipping edit"
								);
							} else {
								console.error(
									"Failed to edit message:",
									editError
								);
							}
						}
					} catch (error) {
						console.error(
							"ERROR processing partial payment:",
							error
						);
						await safeInteractionResponse(
							modalSubmission,
							"An error occurred while processing the payment.",
							true
						);
					}
				} catch (modalError) {
					if (modalError.code === "InteractionCollectorError") {
						console.log("Modal submission timed out");
					} else {
						console.error(
							"Unexpected error in modal handling:",
							modalError
						);
					}
				}
				return;
			} else if (componentInt.customId === "settle_selected") {
				if (!selectedTransactionId) {
					console.error(
						"ERROR: No transaction selected for settlement"
					);
					return componentInt.reply({
						content: "Please select a transaction first.",
						flags: MessageFlags.Ephemeral,
					});
				}

				try {
					const settledTransaction = await settleTransaction(
						userId,
						new ObjectId(selectedTransactionId)
					);

					if (!settledTransaction) {
						console.error(
							"ERROR: Transaction not found or permission denied for settlement"
						);
						return componentInt.reply({
							content:
								"Transaction not found or you don't have permission to settle it.",
							flags: MessageFlags.Ephemeral,
						});
					}

					// Refresh transaction list
					const updatedTransactions =
						await getAllUnsettledTransactionsFromSomeone(
							userId,
							debtorId
						);

					// Update the main transactions array
					allTransactions.splice(
						0,
						allTransactions.length,
						...updatedTransactions
					);

					if (allTransactions.length === 0) {
						await componentInt.reply({
							content: `✅ Transaction settled! <@${debtorId}> has paid off all their debts to <@${userId}>. `,
						});
						collector.stop();
						return;
					}

					// Recalculate pagination
					const newTotalPages = Math.ceil(
						allTransactions.length / TRANSACTIONS_PER_PAGE
					);
					if (page >= newTotalPages) {
						page = Math.max(0, newTotalPages - 1);
					}
					totalPages = newTotalPages;
					selectedTransactionId = null;

					await componentInt.reply({
						content: `✅ Transaction settled! <@${debtorId}> paid off $${formatNumber(
							settledTransaction.amount
						)} for '${settledTransaction.description}'.`,
					});

					// Update main message
					const newEmbed = buildTransactionEmbed(
						getPageTransactions(page),
						debtorId,
						page,
						totalPages,
						getStartIndex(page)
					);
					const newRows = buildActionRows(
						getPageTransactions(page),
						page,
						totalPages,
						getStartIndex(page),
						false
					);

					try {
						await reply.edit({
							embeds: [newEmbed],
							components: newRows,
						});
					} catch (editError) {
						if (editError.code === 10008) {
							console.log(
								"Original message was deleted, skipping edit"
							);
						} else {
							console.error("Failed to edit message:", editError);
						}
					}
				} catch (error) {
					console.error("ERROR settling transaction:", error);
					await componentInt.followUp({
						content:
							"An error occurred while settling the transaction.",
						flags: MessageFlags.Ephemeral,
					});
				}
				return;
			} else {
				console.error(`Unknown interaction: ${componentInt.customId}`);
				return;
			}

			// Update page display for pagination
			const newEmbed = buildTransactionEmbed(
				getPageTransactions(page),
				debtorId,
				page,
				totalPages,
				getStartIndex(page)
			);
			const newRows = buildActionRows(
				getPageTransactions(page),
				page,
				totalPages,
				getStartIndex(page),
				false
			);

			await componentInt.update({
				embeds: [newEmbed],
				components: newRows,
			});
		});

		collector.on("end", async () => {
			console.log("Component collector ended, disabling components...");
			try {
				await reply.edit({ components: [] });
			} catch (error) {
				console.error("Failed to disable components:", error.message);
			}
		});
	},
};
