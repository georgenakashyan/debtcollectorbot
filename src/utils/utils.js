export function pluralize(word, count) {
	return count === 1 ? word : word + "s";
}

export function formatNumber(num) {
	return Math.abs(
		Math.min(Math.max(Math.round(num * 100) / 100, -100000), 100000)
	);
}
