import "dotenv/config";

export async function DiscordRequest(endpoint, options) {
	// append endpoint to root API URL
	const url = "https://discord.com/api/v10/" + endpoint;
	// Stringify payloads
	if (options.body) options.body = JSON.stringify(options.body);
	// Use fetch to make requests
	const res = await fetch(url, {
		headers: {
			Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
			"Content-Type": "application/json; charset=UTF-8",
			"User-Agent":
				"DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)", // TODO Update this
		},
		...options,
	});
	// throw API errors
	if (!res.ok) {
		const data = await res.json();
		console.log(res.status);
		throw new Error(JSON.stringify(data));
	}
	// return original response
	return res;
}

export async function InstallGlobalCommands(appId, commands) {
	// API endpoint to overwrite global commands
	const endpoint = `applications/${appId}/commands`;

	try {
		// This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
		await DiscordRequest(endpoint, { method: "PUT", body: commands });
	} catch (err) {
		console.error(err);
	}
}

export function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function pluralize(word, count) {
	return count === 1 ? word : word + "s";
}

export function getOrdinalSuffix(i) {
	var j = i % 10,
		k = i % 100;
	if (j == 1 && k != 11) {
		return i + "st";
	}
	if (j == 2 && k != 12) {
		return i + "nd";
	}
	if (j == 3 && k != 13) {
		return i + "rd";
	}
	return i + "th";
}

export function leaderboardEmoji(placement) {
	if (placement > 3) return "";
	return ["🥇", "🥈", "🥉"].at(placement - 1);
}

export function leaderboardText(placement) {
	if (placement > 3)
		return `${placement}${getOrdinalSuffix(placement)} Place`;
	return ["**1st Place!**", "**2nd Place!**", "**3rd Place!**"].at(
		placement - 1
	);
}

export function formatNumber(num) {
	return Math.abs(
		Math.min(Math.max(Math.round(num * 100) / 100, -100000), 100000)
	);
}
