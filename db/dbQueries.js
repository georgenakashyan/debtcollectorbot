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

/**
 * Get the total debt owed by a user to another user.
 *
 * @param {string} guildId - The guild ID.
 * @param {number} creditorId - The ID of the creditor.
 * @param {number} debtorId - The ID of the debtor.
 * @returns {Object} An object containing the total debt and debt count.
 */
export async function getTotalDebtFromSomeone(guildId, creditorId, debtorId) {
	const db = getDB();

	const pipeline = [
		{
			$match: {
				guildId: guildId,
				creditorId: creditorId,
				debtorId: debtorId,
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
	];

	const result = await db.debts.aggregate(pipeline).toArray();
	return result[0] || { totalAmount: 0, debtCount: 0 };
}

/**
 * Get the top debtors for a guild.
 *
 * @param {string} guildId - The guild ID.
 * @param {number} limit - The number of debtors to return.
 * @returns {Object} An object containing the total debt, debt count, and creditors.
 */

// TODO DO THIS IT NOT DONE YET ARGGGGGGGGGGGG
export async function getTopDebtors(guildId, limit = 10) {
	const db = getDB();

	const pipeline = [
		{
			$match: { guildId: guildId, isSettled: false },
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
	];

	const result = await db.debts.aggregate(pipeline).toArray();

	return result[0] || { totalDebt: 0, debtCount: 0, creditors: [] };
}

/**
 * Get all unsettled debts for a specific user (what they owe to others).
 *
 * @param {string} guildId - The guild ID in which the debt exists.
 * @param {string} userId - The ID of the user whose debts are being retrieved.
 * @returns {Array} An array of debt objects.
 */
export async function getUserDebts(guildId, userId) {
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
				debtCount: { $sum: 1 },
			},
		},
	];

	const results = await db.debts.aggregate(pipeline).toArray();
	return results[0] || { totalAmount: 0, debtCount: 0 };
}

/**
 * Get all unsettled credits for a specific user (what others owe to them).
 *
 * @param {string} guildId - The guild ID in which the debt exists.
 * @param {string} userId - The ID of the user whose debts are being retrieved.
 * @returns {Array} An array of debt objects.
 */
export async function getUserCredits(guildId, userId) {
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
				debtCount: { $sum: 1 },
			},
		},
	];

	const results = await db.debts.aggregate(pipeline).toArray();

	return results[0] || { totalAmount: 0, debtCount: 0 };
}

// 5. Get debt summary for a user (both debts and credits)
// TODO
export async function getUserDebtSummary(guildId, userId) {
	const db = getDB();

	const summary = await db.debts.aggregate([
		{
			$match: {
				$or: [{ debtorId: userId }, { creditorId: userId }],
				guildId: guildId,
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
// TODO
export async function settleDebt(guildId, debtId, settlementMethod = null) {
	const db = getDB();

	return await db.debts.updateOne(
		{ _id: debtId },
		{
			$set: {
				guildId: guildId,
				isSettled: true,
				settledAt: new Date(),
				"metadata.settlementMethod": settlementMethod,
			},
		}
	);
}

// 7. Get guild debt leaderboard
// TODO
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
