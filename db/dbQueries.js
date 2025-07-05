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
// TODO
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

/**
 * Get all unsettled debts for a specific user (what they owe to others).
 *
 * @param {string} userId - The ID of the user whose debts are being retrieved.
 * @returns {Promise<number>} - A promise that resolves to the total amount the user owes.
 */
export async function getUserDebts(userId, guildId) {
	const db = getDB();

	const pipeline = [
		{
			$match: {
				debtorId: userId,
				guildId: guildId,
				isSettled: false,
			},
		},
		{
			$group: {
				_id: null,
				totalAmount: { $sum: "$amount" },
			},
		},
	];

	const queryResults = await db.debts.aggregate(pipeline).toArray();

	return queryResults[0]?.totalAmount || 0;
}

/**
 * Get all unsettled credits for a specific user (what others owe to them).
 *
 * @param {string} userId - The ID of the user whose debts are being retrieved.
 * @returns {Promise<number>} - A promise that resolves to the total amount the user is owed.
 */
export async function getUserCredits(userId, guildId) {
	const db = getDB();

	const pipeline = [
		{
			$match: {
				creditorId: userId,
				guildId: guildId,
				isSettled: false,
			},
		},
		{
			$group: {
				_id: null,
				totalAmount: { $sum: "$amount" },
			},
		},
	];

	const queryResults = await db.debts.aggregate(pipeline).toArray();

	return queryResults[0]?.totalAmount || 0;
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
