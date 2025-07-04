import { getDB } from "./db";

// TODO
export async function getTotalOwed(DB, discordId) {
	const db = getDB();
	const collection = db.collection("debts");

	// Your database operations
	const result = await collection.find({}).toArray();
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
