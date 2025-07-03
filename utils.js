import "dotenv/config";
import { MongoClient, ServerApiVersion } from "mongodb";

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

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
	const emojiList = [
		"😭",
		"😄",
		"😌",
		"🤓",
		"😎",
		"😤",
		"🤖",
		"😶‍🌫️",
		"🌏",
		"📸",
		"💿",
		"👋",
		"🌊",
		"✨",
	];
	return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getTotalDebt() {
	return 1200.0;
}

export function connectToDB() {
	const uri = process.env.MONGODB_URI;

	const client = new MongoClient(uri, {
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true,
			useNewUrlParser: true,
			useUnifiedTopology: true,
			ssl: true,
		},
	});

	async function run() {
		try {
			console.log("Connecting to MongoDB...");
			// Connect the client to the server	(optional starting in v4.7)
			await client.connect();
			// Send a ping to confirm a successful connection
			await client.db("debtcollector").command({ ping: 1 });
			console.log("Successfully connected to MongoDB!");
		} catch (e) {
			console.error("Error Connecting to MongoDB: ", e);
		} finally {
			// Ensures that the client will close when you finish/error
			await client.close();
			console.log("Closed connection to MongoDB");
		}
	}
	run();
	return client;
}
