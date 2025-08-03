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
import { deleteTransaction, settleTransaction } from "../../db/dbUpdates.js";
const TRANSACTIONS_PER_PAGE = 10;

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
							return `**${txNumber}.** $${tx.amount} - ${
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
						.setLabel(`${txNumber}. $${tx.amount} - ${shortDesc}`)
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
				.setCustomId("delete_selected")
				.setLabel("Delete Transaction")
				.setStyle(ButtonStyle.Danger)
				.setDisabled(!buttonsEnabled),
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
		console.log("=== TRANSACTIONS COMMAND STARTED ===");
		const userId = interaction.user.id;
		const debtorId = interaction.options.getUser("debtor").id;
		console.log(`User ID: ${userId}, Debtor ID: ${debtorId}`);

		if (userId === debtorId) {
			console.log("ERROR: User tried to select themselves as debtor");
			return await interaction.reply({
				content: "You can't owe yourself money!",
				flags: MessageFlags.Ephemeral
			});
		}

		// Defer the response to give us more time for database operations
		console.log("Deferring reply...");
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		console.log("Reply deferred successfully");

		console.log("Fetching unsettled transactions from database...");
		const allTransactions = await getAllUnsettledTransactionsFromSomeone(
			userId,
			debtorId
		);
		console.log(`Found ${allTransactions.length} unsettled transactions`);

		if (allTransactions.length === 0) {
			console.log("No transactions found, sending empty response");
			return await interaction.editReply({
				content: `<@${debtorId}> owes you nothing`,
			});
		}

		let page = 0;
		const totalPages = Math.ceil(
			allTransactions.length / TRANSACTIONS_PER_PAGE
		);
		console.log(
			`Pagination setup: ${totalPages} total pages, ${TRANSACTIONS_PER_PAGE} per page`
		);

		const getPageTransactions = (page) =>
			allTransactions.slice(
				page * TRANSACTIONS_PER_PAGE,
				(page + 1) * TRANSACTIONS_PER_PAGE
			);

		const getStartIndex = (page) => page * TRANSACTIONS_PER_PAGE;

		console.log("Building initial embed and action rows...");
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
		console.log("Embed and action rows built successfully");

		console.log("Sending initial reply...");
		const reply = await interaction.editReply({
			embeds: [embed],
			components: rows,
		});
		console.log("Initial reply sent successfully");

		// Collector for all component interactions
		console.log("Creating message component collector...");
		const collector = reply.createMessageComponentCollector({
			time: 10 * 60 * 1000, // 10 minutes
		});
		console.log("Collector created, listening for interactions...");

		let selectedTransactionId = null;

		collector.on("collect", async (componentInt) => {
			console.log(
				`Component interaction received: ${componentInt.customId} from user ${componentInt.user.id}`
			);
			if (componentInt.user.id !== interaction.user.id) {
				console.log(
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
				console.log(`Transaction selected: ${selectedTransactionId}`);

				// Enable action buttons
				const currentPageTransactions = getPageTransactions(page);
				const newRows = buildActionRows(
					currentPageTransactions,
					page,
					totalPages,
					getStartIndex(page),
					true
				);

				console.log("Updating components to enable action buttons...");
				await componentInt.update({
					components: newRows,
				});
				console.log("Components updated successfully");
				return;
			}

			// Handle pagination
			if (componentInt.customId === "prev_page" && page > 0) {
				console.log(`Going to previous page: ${page - 1}`);
				page--;
				selectedTransactionId = null;
			} else if (
				componentInt.customId === "next_page" &&
				page < totalPages - 1
			) {
				console.log(`Going to next page: ${page + 1}`);
				page++;
				selectedTransactionId = null;
			} else if (componentInt.customId === "delete_selected") {
				console.log("Delete transaction button clicked");
				if (!selectedTransactionId) {
					console.log("ERROR: No transaction selected for deletion");
					return componentInt.reply({
						content: "Please select a transaction first.",
						flags: MessageFlags.Ephemeral,
					});
				}

				// Show confirmation
				const confirmationRow = new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId(`confirm_delete_${selectedTransactionId}`)
						.setLabel("Yes, Delete")
						.setStyle(ButtonStyle.Danger),
					new ButtonBuilder()
						.setCustomId("cancel_delete")
						.setLabel("Cancel")
						.setStyle(ButtonStyle.Secondary)
				);

				console.log("Showing delete confirmation dialog...");
				await componentInt.reply({
					content:
						"⚠️ Are you sure you want to delete this transaction? This action cannot be undone.",
					components: [confirmationRow],
					flags: MessageFlags.Ephemeral,
				});
				return;
			} else if (componentInt.customId.startsWith("confirm_delete_")) {
				const transactionIdToDelete = componentInt.customId.replace(
					"confirm_delete_",
					""
				);
				console.log(
					`Confirming deletion of transaction: ${transactionIdToDelete}`
				);

				try {
					console.log(
						"Attempting to delete transaction from database..."
					);
					const deletedTransaction = await deleteTransaction(
						userId,
						new ObjectId(transactionIdToDelete)
					);
					console.log(
						"Delete operation result:",
						deletedTransaction ? "SUCCESS" : "FAILED"
					);

					if (!deletedTransaction) {
						console.log(
							"ERROR: Transaction not found or permission denied"
						);
						return componentInt.reply({
							content:
								"Transaction not found or you don't have permission to delete it.",
							flags: MessageFlags.Ephemeral,
						});
					}

					// Refresh transaction list
					console.log(
						"Refreshing transaction list after deletion..."
					);
					allTransactions =
						await getAllUnsettledTransactionsFromSomeone(
							userId,
							debtorId
						);
					console.log(
						`Updated transaction count: ${allTransactions.length}`
					);

					if (allTransactions.length === 0) {
						console.log(
							"All transactions cleared, stopping collector"
						);
						await componentInt.update({
							content: `✅ Transaction deleted! <@${debtorId}> now owes you nothing.`,
							embeds: [],
							components: [],
						});
						collector.stop();
						return;
					}

					// Recalculate pagination
					console.log("Recalculating pagination after deletion...");
					const newTotalPages = Math.ceil(
						allTransactions.length / TRANSACTIONS_PER_PAGE
					);
					if (page >= newTotalPages) {
						page = Math.max(0, newTotalPages - 1);
						console.log(`Adjusted page to: ${page}`);
					}
					totalPages = newTotalPages;
					selectedTransactionId = null;
					console.log(
						`New pagination: page ${page} of ${totalPages}`
					);

					console.log("Updating confirmation message...");
					await componentInt.update({
						content: "✅ Transaction deleted successfully!",
						components: [],
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
						true
					);

					console.log(
						"Updating main message with new transaction list..."
					);
					await reply.edit({
						embeds: [newEmbed],
						components: newRows,
					});
					console.log("Main message updated successfully");
				} catch (error) {
					console.error("ERROR deleting transaction:", error);
					console.error("Error stack:", error.stack);
					await componentInt.reply({
						content:
							"An error occurred while deleting the transaction.",
						flags: MessageFlags.Ephemeral,
					});
				}
				return;
			} else if (componentInt.customId === "cancel_delete") {
				console.log("Delete operation cancelled by user");
				await componentInt.update({
					content: "❌ Delete cancelled.",
					components: [],
				});
				return;
			} else if (componentInt.customId === "partial_pay_selected") {
				console.log("Partial payment button clicked");
				if (!selectedTransactionId) {
					console.log(
						"ERROR: No transaction selected for partial payment"
					);
					return componentInt.reply({
						content: "Please select a transaction first.",
						flags: MessageFlags.Ephemeral,
					});
				}

				// Find the selected transaction
				console.log(
					`Looking for transaction: ${selectedTransactionId}`
				);
				const selectedTransaction = allTransactions.find(
					(tx) => tx._id.toString() === selectedTransactionId
				);
				if (!selectedTransaction) {
					console.log(
						"ERROR: Selected transaction not found in current list"
					);
					return componentInt.reply({
						content: "Transaction not found.",
						flags: MessageFlags.Ephemeral,
					});
				}
				console.log(
					`Found transaction: $${selectedTransaction.amount} - ${selectedTransaction.description}`
				);

				// Create partial payment modal
				const modal = new ModalBuilder()
					.setCustomId(`partial_payment_${selectedTransactionId}`)
					.setTitle("Partial Payment");

				const amountInput = new TextInputBuilder()
					.setCustomId("payment_amount")
					.setLabel("Payment Amount")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder(`Max: $${selectedTransaction.amount}`)
					.setRequired(true)
					.setMaxLength(10);

				const firstActionRow = new ActionRowBuilder().addComponents(
					amountInput
				);
				modal.addComponents(firstActionRow);

				console.log("Showing partial payment modal...");
				await componentInt.showModal(modal);
				console.log("Modal shown successfully");
				return;
			} else if (componentInt.customId === "settle_selected") {
				console.log("Settle full amount button clicked");
				if (!selectedTransactionId) {
					console.log(
						"ERROR: No transaction selected for settlement"
					);
					return componentInt.reply({
						content: "Please select a transaction first.",
						flags: MessageFlags.Ephemeral,
					});
				}

				try {
					console.log(
						`Attempting to fully settle transaction: ${selectedTransactionId}`
					);
					const settledTransaction = await settleTransaction(
						userId,
						selectedTransactionId
					);
					console.log(
						"Settlement operation result:",
						settledTransaction ? "SUCCESS" : "FAILED"
					);

					if (!settledTransaction) {
						console.log(
							"ERROR: Transaction not found or permission denied for settlement"
						);
						return componentInt.reply({
							content:
								"Transaction not found or you don't have permission to settle it.",
							flags: MessageFlags.Ephemeral,
						});
					}

					// Refresh transaction list
					console.log(
						"Refreshing transaction list after settlement..."
					);
					const allTransactions =
						await getAllUnsettledTransactionsFromSomeone(
							userId,
							debtorId
						);
					console.log(
						`Updated transaction count after settlement: ${allTransactions.length}`
					);

					if (allTransactions.length === 0) {
						console.log(
							"All transactions settled, stopping collector"
						);
						await componentInt.update({
							content: `✅ Transaction settled! <@${debtorId}> now owes you nothing.`,
							embeds: [],
							components: [],
						});
						collector.stop();
						return;
					}

					// Recalculate pagination
					console.log("Recalculating pagination after settlement...");
					const newTotalPages = Math.ceil(
						allTransactions.length / TRANSACTIONS_PER_PAGE
					);
					if (page >= newTotalPages) {
						page = Math.max(0, newTotalPages - 1);
						console.log(`Adjusted page to: ${page}`);
					}
					totalPages = newTotalPages;
					selectedTransactionId = null;
					console.log(
						`New pagination after settlement: page ${page} of ${totalPages}`
					);

					console.log("Sending settlement success message...");
					await componentInt.reply({
						content: "✅ Transaction settled successfully!",
						flags: MessageFlags.Ephemeral,
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
						true
					);

					console.log(
						"Updating main message with settled transaction list..."
					);
					await reply.edit({
						embeds: [newEmbed],
						components: newRows,
					});
					console.log("Main message updated after settlement");
				} catch (error) {
					console.error("ERROR settling transaction:", error);
					console.error("Error stack:", error.stack);
					await componentInt.reply({
						content:
							"An error occurred while settling the transaction.",
						flags: MessageFlags.Ephemeral,
					});
				}
				return;
			} else {
				console.log(`Unknown interaction: ${componentInt.customId}`);
				return;
			}

			// Update page display for pagination
			console.log(`Updating page display for page ${page}...`);
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
				true
			);

			console.log("Updating pagination display...");
			await componentInt.update({
				embeds: [newEmbed],
				components: newRows,
			});
			console.log("Pagination display updated successfully");
		});

		collector.on("end", async () => {
			console.log("Component collector ended, disabling components...");
			try {
				await reply.edit({ components: [] });
				console.log("Components disabled successfully");
			} catch (error) {
				console.log("Failed to disable components:", error.message);
			}
			console.log("=== TRANSACTIONS COMMAND ENDED ===");
		});
	},
};
