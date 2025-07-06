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
	getTotalDebtFromSomeone,
	getUserCredits,
	getUserDebts,
} from "./db/dbQueries.js";
import { pluralize } from "./utils.js";

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

			if (name === "totaldebt") {
				const debt = await getUserDebts(guildId, userId);

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [
							{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content: `<@${userId}> owes others $${
									debt.totalAmount
								} in total ${
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

			if (name === "totalowed") {
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
								} in total by others ${
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

			if (name === "owetome") {
				const debtorId = req.body.data.options[0].value;
				const debt = await getTotalDebtFromSomeone(
					guildId,
					userId,
					debtorId
				);

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
