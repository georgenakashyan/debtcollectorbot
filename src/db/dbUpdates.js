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
		amount: parseFloat(amount),
		description: description,
		guildId: guildId,
		createdAt: Date.now(),
		isSettled: false,
		currency: "USD",
	});
};

export const settleTransaction = async (userId, transactionId) => {
	const db = getDB();
	const result = await db.debts.findOneAndUpdate(
		{ _id: transactionId, creditorId: userId },
		{ $set: { isSettled: true } },
		{ returnDocument: "after" }
	);

	if (!result) {
		return null;
	}

	return result;
};

export const adjustTransactionAmount = async (
	userId,
	transactionId,
	adjustmentAmount
) => {
	const db = getDB();
	const result = await db.debts.findOneAndUpdate(
		{ _id: transactionId, creditorId: userId },
		{ $inc: { amount: adjustmentAmount } },
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

// Keep the old function name for backward compatibility
export const partiallySettleTransaction = async (
	userId,
	transactionId,
	amount
) => {
	// Convert positive payment amounts to negative adjustments
	return await adjustTransactionAmount(userId, transactionId, -1 * amount);
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

// Migration function to convert string amounts to numbers
export const migrateStringAmountsToNumbers = async () => {
	const db = getDB();

	// Find all documents where amount is a string
	const stringAmountDocs = await db.debts
		.find({
			amount: { $type: "string" },
		})
		.toArray();

	console.log(
		`Found ${stringAmountDocs.length} documents with string amounts to migrate`
	);

	// Update each document to convert string amount to number
	for (const doc of stringAmountDocs) {
		const numericAmount = parseFloat(doc.amount);
		if (!isNaN(numericAmount)) {
			await db.debts.updateOne(
				{ _id: doc._id },
				{ $set: { amount: numericAmount } }
			);
			console.log(
				`Migrated document ${doc._id}: "${doc.amount}" -> ${numericAmount}`
			);
		} else {
			console.warn(
				`Skipping document ${doc._id}: invalid amount "${doc.amount}"`
			);
		}
	}

	console.log("Migration completed");
};
