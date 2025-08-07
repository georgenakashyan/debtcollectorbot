export function pluralize(word, count) {
	return count === 1 ? word : word + "s";
}

export function formatNumber(num) {
	// Handle null and undefined
	if (num === null) return 0;
	if (num === undefined) return NaN;

	// Convert string to number if needed
	const numValue = typeof num === "string" ? parseFloat(num) : num;

	// Handle edge cases
	if (isNaN(numValue)) return NaN;
	if (!isFinite(numValue)) return numValue.toString();

	// Format to 2 decimal places
	return parseFloat(numValue.toFixed(2));
}
