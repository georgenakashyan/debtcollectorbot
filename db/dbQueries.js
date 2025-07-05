import { getDB } from "./db.js";

export const indexes = [
	// Compound index for user-to-user debt queries
	{ creditorId: 1, debtorId: 1 },

	// Individual user indexes for total debt calculations
	{ creditorId: 1, isSettled: 1 },
	{ debtorId: 1, isSettled: 1 },

	// Guild-based queries
	{ guildId: 1, isSettled: 1 },

	// Time-based queries
	{ createdAt: -1 },

	// Settlement status
	{ isSettled: 1 },
];

// TODO
export async function getTotalOwed(discordId) {
	const db = getDB();
	const collection = db.collection("debts");

	// Your database operations
	const result = await collection
		.find({ creditorId: "226710459766669312", isSettled: false })
		.sort({ createdAt: -1 })
		.toArray();
	// Handle the result
	return result;
}

// TODO
export async function getAllDebtors(discordId) {
	const db = getDB();
	const collection = db.collection("debts");

	// Your database operations
	const result = await collection.find({}).toArray();
	// Handle the result
	return result;
}

// TODO
export async function getAllCreditors(discordId) {
	const db = getDB();
	const collection = db.collection("debts");

	// Your database operations
	const result = await collection.find({}).toArray();
	// Handle the result
	return result;
}

//##################################################################################

// 1. Get total amount user A owes to user B
export async function getTotalDebtBetweenUsers(debtorId, creditorId) {
	const db = getDB();

	const result = await db.debts.aggregate([
		{
			$match: {
				debtorId: debtorId,
				creditorId: creditorId,
				isSettled: false,
			},
		},
		{
			$group: {
				_id: null,
				totalAmount: { $sum: "$amount" },
				debtCount: { $sum: 1 },
			},
		},
	]);
	return result[0] || { totalAmount: 0, debtCount: 0 };
}

// 2. Get who owes the most money overall (top debtors)
export async function getTopDebtors(limit = 10) {
	const db = getDB();

	return await db.debts.aggregate([
		{
			$match: { isSettled: false },
		},
		{
			$group: {
				_id: "$debtorId",
				totalDebt: { $sum: "$amount" },
				debtCount: { $sum: 1 },
				creditors: { $addToSet: "$creditorId" },
			},
		},
		{
			$sort: { totalDebt: -1 },
		},
		{
			$limit: limit,
		},
	]);
}

// 3. Get all debts for a specific user (what they owe to others)
export async function getUserDebts(userId) {
	const db = getDB();

	return await db.debts
		.find({
			debtorId: userId,
			isSettled: false,
		})
		.sort({ createdAt: -1 });
}

// 4. Get all credits for a specific user (what others owe to them)
export async function getUserCredits(userId) {
	const db = getDB();

	return await db.debts
		.find({
			creditorId: userId,
			isSettled: false,
		})
		.sort({ createdAt: -1 });
}

// 5. Get debt summary for a user (both debts and credits)
export async function getUserDebtSummary(userId) {
	const db = getDB();

	const summary = await db.debts.aggregate([
		{
			$match: {
				$or: [{ debtorId: userId }, { creditorId: userId }],
				isSettled: false,
			},
		},
		{
			$group: {
				_id: null,
				totalOwed: {
					$sum: {
						$cond: [{ $eq: ["$debtorId", userId] }, "$amount", 0],
					},
				},
				totalOwedToMe: {
					$sum: {
						$cond: [{ $eq: ["$creditorId", userId] }, "$amount", 0],
					},
				},
			},
		},
	]);
	return summary[0] || { totalOwed: 0, totalOwedToMe: 0 };
}

// 6. Settle a debt (mark as paid)
export async function settleDebt(debtId, settlementMethod = null) {
	const db = getDB();

	return await db.debts.updateOne(
		{ _id: debtId },
		{
			$set: {
				isSettled: true,
				settledAt: new Date(),
				"metadata.settlementMethod": settlementMethod,
			},
		}
	);
}

// 7. Get guild debt leaderboard
export async function getGuildDebtLeaderboard(guildId, limit = 10) {
	const db = getDB();

	return await db.debts.aggregate([
		{
			$match: {
				guildId: guildId,
				isSettled: false,
			},
		},
		{
			$group: {
				_id: "$debtorId",
				totalDebt: { $sum: "$amount" },
				debtCount: { $sum: 1 },
			},
		},
		{
			$sort: { totalDebt: -1 },
		},
		{
			$limit: limit,
		},
	]);
}
