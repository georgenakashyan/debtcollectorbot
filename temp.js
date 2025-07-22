import {
	InteractionResponseType,
	InteractionType,
	verifyKeyMiddleware,
} from "discord-interactions";
import { ButtonStyle, ComponentType, TextInputStyle } from "discord.js";
import "dotenv/config";
import express from "express";
import { connectToDB } from "./db/db.js";
import { getAllUnsettledTransactionsFromSomeone } from "./db/dbQueries.js";
import { addTransaction } from "./db/dbUpdates.js";
import { formatNumber } from "./utils/utils.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Initialize database connection
const DB = await connectToDB();

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
	"/interactions",
	verifyKeyMiddleware(process.env.PUBLIC_KEY),
	async function (req, res) {
		// Interaction type and data
		const { type, id, data } = req.body;

		/**
		 * Handle slash command requests
		 * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
		 */
		if (type === InteractionType.APPLICATION_COMMAND) {
			const { name } = data;
			const context = req.body.context;
			const userId =
				context === 0 ? req.body.member.user.id : req.body.user.id;

			if (name === "transactions") {
				try {
					const debtorId = req.body.data.options[0].value;
					const transactions =
						await getAllUnsettledTransactionsFromSomeone(
							userId,
							debtorId
						);

					if (transactions.length === 0) {
						return res.json({
							type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
							data: {
								content: `<@${debtorId}> owes you nothing`,
								flags: 64,
							},
						});
					}

					// Pagination setup
					const itemsPerPage = 3; // Show 3 transactions per page
					const totalPages = Math.ceil(
						transactions.length / itemsPerPage
					);
					const currentPage = 1; // Start at page 1

					// Get transactions for current page
					const startIndex = (currentPage - 1) * itemsPerPage;
					const endIndex = startIndex + itemsPerPage;
					const pageTransactions = transactions.slice(
						startIndex,
						endIndex
					);

					// Create components array - each transaction gets its own action row
					const components = [];

					// Add transaction action rows
					pageTransactions.forEach((transaction, index) => {
						const actualIndex = startIndex + index;
						components.push({
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									custom_id: `delete_${
										transaction.id || actualIndex
									}`,
									label: `Delete #${actualIndex + 1}`,
									style: ButtonStyle.Danger,
								},
								{
									type: ComponentType.Button,
									custom_id: `partial_${
										transaction.id || actualIndex
									}`,
									label: `Partial Payment #${
										actualIndex + 1
									}`,
									style: ButtonStyle.Primary,
								},
							],
						});
					});

					// Add pagination controls if needed
					if (totalPages > 1) {
						const paginationButtons = [];

						if (currentPage > 1) {
							paginationButtons.push({
								type: ComponentType.Button,
								custom_id: `transactions_page_${
									currentPage - 1
								}_${debtorId}`,
								label: "◀ Previous",
								style: ButtonStyle.Secondary,
							});
						}

						paginationButtons.push({
							type: ComponentType.Button,
							custom_id: `transactions_refresh_${currentPage}_${debtorId}`,
							label: `Page ${currentPage}/${totalPages}`,
							style: ButtonStyle.Secondary,
							disabled: true,
						});

						if (currentPage < totalPages) {
							paginationButtons.push({
								type: ComponentType.Button,
								custom_id: `transactions_page_${
									currentPage + 1
								}_${debtorId}`,
								label: "Next ▶",
								style: ButtonStyle.Secondary,
							});
						}

						components.push({
							type: ComponentType.ActionRow,
							components: paginationButtons,
						});
					}

					// Create content with transaction details
					let content = `**Debts <@${debtorId}> owes <@${userId}>:** (${transactions.length} total)\n\n`;

					pageTransactions.forEach((transaction, index) => {
						const actualIndex = startIndex + index;
						content += `**Transaction #${actualIndex + 1}**\n`;
						content += `💰 Amount: ${transaction.amount}\n`;
						content += `📝 Description: "${transaction.description}"\n`;
						content += `🆔 ID: ${
							transaction.id || actualIndex
						}\n\n`;
					});

					return res.json({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: content,
							components: components,
						},
					});
				} catch (e) {
					console.error("Error in transactions handler:", e);
					return res.json({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content:
								"An error occurred while fetching transactions.",
							flags: 64,
						},
					});
				}
			}

			// Handler for pagination button interactions
			if (req.body.data.custom_id?.startsWith("transactions_page_")) {
				try {
					const [, , pageNum, debtorId] =
						req.body.data.custom_id.split("_");
					const currentPage = parseInt(pageNum);

					const transactions =
						await getAllUnsettledTransactionsFromSomeone(
							userId,
							debtorId
						);

					const itemsPerPage = 3;
					const totalPages = Math.ceil(
						transactions.length / itemsPerPage
					);

					// Get transactions for current page
					const startIndex = (currentPage - 1) * itemsPerPage;
					const endIndex = startIndex + itemsPerPage;
					const pageTransactions = transactions.slice(
						startIndex,
						endIndex
					);

					// Create components array
					const components = [];

					// Add transaction action rows
					pageTransactions.forEach((transaction, index) => {
						const actualIndex = startIndex + index;
						components.push({
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									custom_id: `delete_${
										transaction.id || actualIndex
									}`,
									label: `Delete #${actualIndex + 1}`,
									style: ButtonStyle.Danger,
								},
								{
									type: ComponentType.Button,
									custom_id: `partial_${
										transaction.id || actualIndex
									}`,
									label: `Partial Payment #${
										actualIndex + 1
									}`,
									style: ButtonStyle.Primary,
								},
							],
						});
					});

					// Add pagination controls
					if (totalPages > 1) {
						const paginationButtons = [];

						if (currentPage > 1) {
							paginationButtons.push({
								type: ComponentType.Button,
								custom_id: `transactions_page_${
									currentPage - 1
								}_${debtorId}`,
								label: "◀ Previous",
								style: ButtonStyle.Secondary,
							});
						}

						paginationButtons.push({
							type: ComponentType.Button,
							custom_id: `transactions_refresh_${currentPage}_${debtorId}`,
							label: `Page ${currentPage}/${totalPages}`,
							style: ButtonStyle.Secondary,
							disabled: true,
						});

						if (currentPage < totalPages) {
							paginationButtons.push({
								type: ComponentType.Button,
								custom_id: `transactions_page_${
									currentPage + 1
								}_${debtorId}`,
								label: "Next ▶",
								style: ButtonStyle.Secondary,
							});
						}

						components.push({
							type: ComponentType.ActionRow,
							components: paginationButtons,
						});
					}

					// Create content
					let content = `**Debts <@${debtorId}> owes <@${userId}>:** (${transactions.length} total)\n\n`;

					pageTransactions.forEach((transaction, index) => {
						const actualIndex = startIndex + index;
						content += `**Transaction #${actualIndex + 1}**\n`;
						content += `💰 Amount: ${transaction.amount}\n`;
						content += `📝 Description: "${transaction.description}"\n`;
						content += `🆔 ID: ${
							transaction.id || actualIndex
						}\n\n`;
					});

					return res.json({
						type: InteractionResponseType.UPDATE_MESSAGE,
						data: {
							content: content,
							components: components,
						},
					});
				} catch (e) {
					console.error("Error in pagination handler:", e);
					return res.json({
						type: InteractionResponseType.UPDATE_MESSAGE,
						data: {
							content:
								"An error occurred while updating the page.",
							components: [],
						},
					});
				}
			}

			// TODO
			if (name === "paid") {
			}

			console.error(`unknown command: ${name}`);
			return res.status(400).json({ error: "unknown command" });
		}

		if (type === InteractionType.MESSAGE_COMPONENT) {
			// Delete transaction handler
			if (req.body.data.custom_id?.startsWith("delete_")) {
				const transactionId = req.body.data.custom_id.split("_")[1];
				console.log("Deleting transaction:", transactionId);
				// Your delete logic here
				// Then refresh the page or show success message
				return res.json({
					type: InteractionResponseType.UPDATE_MESSAGE,
					data: {
						// add more info into content
						content: `Transaction id: ${transactionId} has been deleted`,
						components: [],
					},
				});
			}

			// Partial payment handler
			if (req.body.data.custom_id?.startsWith("partial_")) {
				const transactionId = req.body.data.custom_id.split("_")[1];
				console.log("Partial payment for transaction:", transactionId);
				// Show a modal for entering the payment amount
				// Or handle the partial payment logic
				return res.json({
					type: InteractionResponseType.MODAL,
					data: {
						title: "Partial Payment",
						custom_id: transactionId,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.TextInput,
										custom_id: "amount",
										label: "Amount",
										style: TextInputStyle.Short,
										required: true,
									},
								],
							},
						],
					},
				});
			}
		}

		console.error("unknown interaction type", type);
		return res.status(400).json({ error: "unknown interaction type" });
	}
);

app.listen(PORT, () => {
	console.log("Listening on port", PORT);
});
