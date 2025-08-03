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
		{ $set: { isSettled: true } },
	);
};

export const partiallySettleTransaction = async (
	userId,
	transactionId,
	amount
) => {
	const db = getDB();
	const result = await db.debts.findOneAndUpdate(
		{ _id: transactionId, creditorId: userId },
		{ $inc: { amount: -1 * amount } },
		{ returnDocument: "after" }
	);

	// Return null if document not found (wrong creditorId)
	if (!result) {
		return null;
	}

	// If amount becomes 0 or negative, mark as settled
	if (result.amount <= 0) {
		const settledResult = await db.debts.findOneAndUpdate(
			{ _id: transactionId, creditorId: userId },
			{ $set: { isSettled: true, amount: 0 } },
			{ returnDocument: "after" }
		);
		
		// Return the updated document with settled status
		return settledResult;
	}

	return result;
};

export const deleteTransaction = async (userId, transactionId) => {
	const db = getDB();
	const result = await db.debts.findOneAndUpdate(
		{
			_id: transactionId,
			creditorId: userId,
		},
		{
			$set: { isSettled: true, amount: 0 },
		},
		{ returnDocument: "after" }
	);
	return result;
};
