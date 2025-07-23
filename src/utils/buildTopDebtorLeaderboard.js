import { formatNumber, pluralize } from "./utils.js";

export function leaderboardEmoji(placement) {
	if (placement > 3) return "";
	return ["🥇", "🥈", "🥉"].at(placement - 1);
}

export function leaderboardText(placement) {
	if (placement > 3) return `${getOrdinalSuffix(placement)} Place`;
	return ["**1st Place!**", "**2nd Place!**", "**3rd Place!**"].at(
		placement - 1
	);
}

export function buildTopDebtorLeaderboard(debtors, limit = 10) {
	// If no debtors found
	if (!debtors || debtors.length === 0) {
		return "🎉 **No outstanding debts found!**\n\nEveryone in this server is debt-free! 🤝";
	}

	// Sort debtors by total amount (highest first)
	const sortedDebtors = [...debtors].sort(
		(a, b) => b.totalAmount - a.totalAmount
	);

	// Build the leaderboard
	let leaderboard = "💸 **SERVER DEBT LEADERBOARD** 💸\n";
	leaderboard += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

	sortedDebtors.forEach((debtor, index) => {
		const position = index + 1;
		let positionEmoji = leaderboardEmoji(position);
		let positionText = leaderboardText(position);

		// Format the amount
		const amount = formatNumber(debtor.totalAmount);
		const transactionText = `${debtor.debtCount} ${pluralize(
			"transaction",
			debtor.debtCount
		)}`;

		// Different styling for top 3 vs others
		if (position <= 3) {
			leaderboard += `${positionEmoji} ${positionText}\n`;
			leaderboard += `└─ <@${debtor._id}>\n`;
			leaderboard += `└─ **$${amount}** (${transactionText})\n\n`;
		} else {
			leaderboard += `${positionEmoji} ${positionText} • <@${debtor._id}>\n`;
			leaderboard += `└─ **$${amount}** (${transactionText})\n\n`;
		}
	});

	// Add footer with total stats
	const totalDebt = sortedDebtors.reduce(
		(sum, debtor) => sum + debtor.totalAmount,
		0
	);
	const totalTransactions = sortedDebtors.reduce(
		(sum, debtor) => sum + debtor.debtCount,
		0
	);

	leaderboard += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
	leaderboard += `📊 **Total Server Debt:** $${totalDebt.toFixed(2)}\n`;
	leaderboard += `📈 **Total Transactions:** ${totalTransactions}\n`;
	leaderboard += `👥 **Debtors Shown:** ${sortedDebtors.length}${
		sortedDebtors.length === limit ? ` (limit: ${limit})` : ""
	}`;

	return leaderboard;
}
