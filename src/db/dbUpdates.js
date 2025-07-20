import { getDB } from "./db.js";

export const addTransaction = async (
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

export const settleTransaction = async (userId, transactionId) => {
	const db = getDB();
	await db.debts.findOneAndUpdate(
		{ _id: transactionId, creditorId: userId },
		{ $set: { isSettled: true } }
	);
};

export const partiallySettleTransaction = async (
	userId,
	transactionId,
	amount
) => {
	const db = getDB();
	await db.debts.findOneAndUpdate(
		{ _id: transactionId, creditorId: userId },
		{ $inc: { amount: -1 * amount } }
	);
};
