import {
	InteractionResponseFlags,
	InteractionResponseType,
	InteractionType,
	MessageComponentTypes,
	verifyKeyMiddleware,
} from "discord-interactions";
import { ButtonStyle, ComponentType, TextInputStyle } from "discord.js";
import "dotenv/config";
import express from "express";
import { connectToDB } from "./db/db.js";
import {
	getAllUnsettledTransactionsFromSomeone,
	getTopDebtors,
	getTotalDebtFromSomeone,
	getUserCredits,
	getUserDebts,
} from "./db/dbQueries.js";
import { addTransaction } from "./db/dbUpdates.js";
import {
	formatNumber,
	leaderboardEmoji,
	leaderboardText,
	pluralize,
} from "./utils/utils.js";

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
		 * Handle verification requests
		 */
		if (type === InteractionType.PING) {
			return res.send({ type: InteractionResponseType.PONG });
		}

		/**
		 * Handle slash command requests
		 * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
		 */
		if (type === InteractionType.APPLICATION_COMMAND) {
			const { name } = data;
			const context = req.body.context;
			const userId =
				context === 0 ? req.body.member.user.id : req.body.user.id;
			const guildId = req.body.guild_id;

			if (name === "total-debt") {
				const debt = await getUserDebts(null, userId);

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [
							{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content: `<@${userId}> owes others $${
									debt.totalAmount
								} ${
									debt.debtCount > 0
										? pluralize(
												`from ${debt.debtCount} transaction`,
												debt.debtCount
										  )
										: ""
								}`,
							},
						],
					},
				});
			}

			if (name === "debt") {
				const debt = await getUserDebts(guildId, userId);

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [
							{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content: `<@${userId}> owes $${
									debt.totalAmount
								} in this server ${
									debt.debtCount > 0
										? pluralize(
												`from ${debt.debtCount} transaction`,
												debt.debtCount
										  )
										: ""
								}`,
							},
						],
					},
				});
			}

			if (name === "total-owed") {
				const credit = await getUserCredits(null, userId);

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [
							{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content: `<@${userId}> is owed $${
									credit.totalAmount
								} ${
									credit.debtCount > 0
										? pluralize(
												`from ${credit.debtCount} transaction`,
												credit.debtCount
										  )
										: ""
								}`,
							},
						],
					},
				});
			}

			if (name === "owed") {
				const credit = await getUserCredits(guildId, userId);

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [
							{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content: `<@${userId}> is owed $${
									credit.totalAmount
								} in this server ${
									credit.debtCount > 0
										? pluralize(
												`from ${credit.debtCount} transaction`,
												credit.debtCount
										  )
										: ""
								}`,
							},
						],
					},
				});
			}

			if (name === "owes-me") {
				const debtorId = req.body.data.options[0].value;
				if (userId === debtorId) {
					return res.send({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "You cannot owe yourself money!",
							flags: 64,
						},
					});
				}
				const debt = await getTotalDebtFromSomeone(userId, debtorId);

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [
							{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content: `<@${debtorId}> owes <@${userId}> $${
									debt.totalAmount
								} ${
									debt.debtCount > 0
										? pluralize(
												`from ${debt.debtCount} transaction`,
												debt.debtCount
										  )
										: ""
								}`,
							},
						],
					},
				});
			}

			if (name === "i-owe") {
				const creditorId = req.body.data.options[0].value;
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

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [
							{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content: `<@${userId}> owes <@${creditorId}> $${
									debt.totalAmount
								} ${
									debt.debtCount > 0
										? pluralize(
												`from ${debt.debtCount} transaction`,
												debt.debtCount
										  )
										: ""
								}`,
							},
						],
					},
				});
			}

			if (name === "top-debtors") {
				const limit = 10;
				const debtors = await getTopDebtors(guildId, limit);

				// If no debtors found
				if (!debtors || debtors.length === 0) {
					return res.send({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content:
								"🎉 **No outstanding debts found!**\n\nEveryone in this server is debt-free! 🤝",
							//flags: 64,
						},
					});
				}

				// Build the leaderboard
				let leaderboard = "💸 **SERVER DEBT LEADERBOARD** 💸\n";
				leaderboard += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
				debtors.sort((a, b) => {
					return b.totalAmount - a.totalAmount;
				});
				debtors.forEach((debtor, index) => {
					const position = index + 1;
					let positionEmoji = leaderboardEmoji(position);
					let positionText = leaderboardText(position);

					// Format the amount
					const amount = debtor.totalAmount;
					const transactionText = `${debtor.debtCount} ${pluralize(
						"transaction",
						debtor.debtCount
					)}`;

					// Different styling for top 3 vs others
					if (position <= 3) {
						leaderboard += `${positionEmoji} ${positionText}\n`;
						leaderboard += `└─ <@${debtor._id}>\n`;
						leaderboard += `└─ **$${amount}** *(${transactionText})*\n\n`;
					} else {
						leaderboard += `${positionEmoji} ${positionText} • <@${debtor._id}>\n`;
						leaderboard += `└─ **$${amount}** *(${transactionText})*\n\n`;
					}
				});

				// Add footer with total stats
				const totalDebt = debtors.reduce(
					(sum, debtor) => sum + debtor.totalAmount,
					0
				);
				const totalTransactions = debtors.reduce(
					(sum, debtor) => sum + debtor.debtCount,
					0
				);

				leaderboard += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
				leaderboard += `📊 **Total Server Debt:** $${totalDebt.toFixed(
					2
				)}\n`;
				leaderboard += `📈 **Total Transactions:** ${totalTransactions}\n`;
				leaderboard += `👥 **Debtors Shown:** ${debtors.length}${
					debtors.length === limit ? ` (limit: ${limit})` : ""
				}`;

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: leaderboard,
						//flags: 64,
					},
				});
			}

			if (name === "add-debt") {
				const debtorId = req.body.data.options[0].value;
				const amount = formatNumber(req.body.data.options[1].value);
				const description = req.body.data.options[2].value;
				await addTransaction(
					guildId,
					userId,
					debtorId,
					amount,
					description
				);
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: `<@${debtorId}> now owes <@${userId}> $${amount} for "${description}"`,
						//flags: 64,
					},
				});
			}

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
