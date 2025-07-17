import {
	InteractionResponseFlags,
	InteractionResponseType,
	InteractionType,
	MessageComponentTypes,
	verifyKeyMiddleware,
} from "discord-interactions";
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
import { addTransaction, settleTransaction } from "./db/dbUpdates.js";
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

			// TODO
			if (name === "transactions") {
				const debtorId = req.body.data.options[0].value;
				const transactions =
					await getAllUnsettledTransactionsFromSomeone(
						userId,
						debtorId
					);

				if (transactions.length === 0) {
					return res.send({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "🎉 You have no outstanding debts!",
							flags: 64,
						},
					});
				}

				let transactionMessages = [];
				transactions.forEach((transaction) => {
					transactionMessages.push(
						`<@${transaction.debtorId}> owes <@${transaction.creditorId}> $${transaction.amount} for "${transaction.description}"\n`
					);
				});

				return res.send({
					type: InteractionResponseType.IS_COMPONENTS_V2,
					components: transactionMessages.map((message) => [
						{
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.TEXT_DISPLAY,
									content: {
										content: message,
									},
								},
								{
									type: ComponentType.ACTION_ROW,
									components: [
										{
											type: ComponentType.BUTTON,
											customId: "delete",
											label: "Delete",
											style: ComponentStyle.DANGER,
										},
										{
											type: ComponentType.BUTTON,
											customId: "change-amount",
											label: "Partial Payment",
											style: ComponentStyle.PRIMARY,
										},
									],
								},
							],
						},
					]),
				});
			}

			// TODO might not need this command if its built into transactions method. Tho it could be called from buttons but then it wont be in the interactions requests maybe?
			if (name === "remove-debt") {
				const transactionId = req.body.data.options[0].value;
				await settleTransaction(userId, transactionId);
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: `<@${debtorId}> no longer owes <@${userId}> $${amount} for "${description}"`,
						//flags: 64,
					},
				});
			}

			// TODO
			if (name === "paid") {
			}

			console.error(`unknown command: ${name}`);
			return res.status(400).json({ error: "unknown command" });
		}

		console.error("unknown interaction type", type);
		return res.status(400).json({ error: "unknown interaction type" });
	}
);

app.listen(PORT, () => {
	console.log("Listening on port", PORT);
});
