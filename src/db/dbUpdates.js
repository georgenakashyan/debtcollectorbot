import { getDB } from "./db.js";

export const addDebt = async (
	guildId,
	userId,
	debtorId,
	amount,
	description
) => {
	const db = getDB();
	await db.debts.insertOne({
		creditorId: userId,
		debtorId: debtorId,
		amount: amount,
		description: description,
		guildId: guildId,
		createdAt: Date.now(),
		isSettled: false,
		currency: "USD",
	});
};
