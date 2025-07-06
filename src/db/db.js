import "dotenv/config";
import { MongoClient, ServerApiVersion } from "mongodb";

let client = null;
let db = null;

export async function connectToDB() {
	const uri = process.env.MONGODB_URI;

	if (!client) {
		try {
			console.log("Connecting to MongoDB...");
			client = new MongoClient(uri, {
				serverApi: {
					version: ServerApiVersion.v1,
					strict: true,
					deprecationErrors: true,
					useNewUrlParser: true,
					useUnifiedTopology: true,
					ssl: true,
				},
			});
			await client.connect();
			console.log("Connected to MongoDB");
		} catch (e) {
			console.error(e);
			return;
		}
	}
	if (!db) {
		db = client.db("debtcollector");
		db.debts = db.collection("debts");
	}
	return db;
}

export function getDB() {
	if (!db) throw new Error("Database not initialized");
	return db;
}

export async function closeDB() {
	if (client) {
		await client.close();
		client = null;
		db = null;
	}
}
