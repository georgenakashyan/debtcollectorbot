import { formatNumber } from "../utils/utils.js";
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
export async function getTotalDebtFromSomeone(creditorId, debtorId) {
	const db = getDB();

	const pipeline = [
		{
			$match: {
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
	if (result[0]) result[0].totalAmount = formatNumber(result[0].totalAmount);
	return result[0] || { totalAmount: 0, debtCount: 0 };
}

/**
 * Get the top debtors for a guild.
 *
 * @param {string} guildId - The guild ID.
 * @param {number} limit - The number of debtors to return.
 * @returns {Object} An object containing the total debt, debt count, and creditors.
 */
export async function getTopDebtors(guildId, limit = 10) {
	const db = getDB();
	const pipeline = [
		{
			$match: { guildId: guildId, isSettled: false },
		},
		{
			$group: {
				_id: "$debtorId",
				totalAmount: { $sum: "$amount" },
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
	return result || [];
}

/**
 * Get all unsettled debts for a specific user (what they owe to others).
 *
 * @param {string} guildId - The guild ID in which the debt exists.
 * @param {string} userId - The ID of the user whose debts are being retrieved.
 * @returns {Array} An array of debt objects.
 */
export async function getUserDebts(guildId = null, userId) {
	const db = getDB();
	const match = { debtorId: userId, isSettled: false };
	if (guildId) {
		match.guildId = guildId;
	}

	const pipeline = [
		{
			$match: match,
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

	const match = { creditorId: userId, isSettled: false };
	if (guildId) {
		match.guildId = guildId;
	}

	const pipeline = [
		{
			$match: match,
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

export async function getAllUnsettledTransactionsFromSomeone(
	creditorId,
	debtorId
) {
	const db = getDB();
	const results = await db.debts
		.find({ creditorId: creditorId, debtorId: debtorId, isSettled: false })
		.toArray();
	return results || [];
}
