import { beforeEach, describe, expect, jest, test } from "@jest/globals";

// Mock the database functions
jest.mock("../../src/db/dbQueries.js", () => ({
	getTopDebtors: jest.fn(),
}));

jest.mock("../../src/utils/buildTopDebtorLeaderboard.js", () => ({
	buildTopDebtorLeaderboard: jest.fn(),
}));

import { getTopDebtors } from "../../src/db/dbQueries.js";
import { buildTopDebtorLeaderboard } from "../../src/utils/buildTopDebtorLeaderboard.js";

// Import the command after mocking
import topDebtorsCommand from "../../src/commands/utility/top-debtors.js";

describe("Top Debtors Command", () => {
	let mockInteraction;

	beforeEach(() => {
		jest.clearAllMocks();

		mockInteraction = {
			guild: { id: "guild456" },
			reply: jest.fn(),
		};
	});

	describe("Command Data", () => {
		test("should have correct command structure", () => {
			expect(topDebtorsCommand.data.name).toBe("top-debtors");
			expect(topDebtorsCommand.data.description).toBe(
				"Leaderboard of top debtors in this server"
			);
		});
	});

	describe("Execute Function", () => {
		test("should fetch and display top debtors leaderboard", async () => {
			const mockDebtors = [
				{ userId: "user1", totalAmount: 100.5, debtCount: 3 },
				{ userId: "user2", totalAmount: 75.25, debtCount: 2 },
				{ userId: "user3", totalAmount: 50.0, debtCount: 1 },
			];
			const mockLeaderboardContent =
				"📊 **Top Debtors Leaderboard**\n\n1. <@user1> - $100.50\n2. <@user2> - $75.25\n3. <@user3> - $50.00";

			getTopDebtors.mockResolvedValue(mockDebtors);
			buildTopDebtorLeaderboard.mockReturnValue(mockLeaderboardContent);

			await topDebtorsCommand.execute(mockInteraction);

			expect(getTopDebtors).toHaveBeenCalledWith("guild456", 10);
			expect(buildTopDebtorLeaderboard).toHaveBeenCalledWith(
				mockDebtors,
				10
			);
			expect(mockInteraction.reply).toHaveBeenCalledWith(
				mockLeaderboardContent
			);
		});

		test("should handle empty debtors list", async () => {
			const mockDebtors = [];
			const mockLeaderboardContent = "No debtors found in this server!";

			getTopDebtors.mockResolvedValue(mockDebtors);
			buildTopDebtorLeaderboard.mockReturnValue(mockLeaderboardContent);

			await topDebtorsCommand.execute(mockInteraction);

			expect(getTopDebtors).toHaveBeenCalledWith("guild456", 10);
			expect(buildTopDebtorLeaderboard).toHaveBeenCalledWith(
				mockDebtors,
				10
			);
			expect(mockInteraction.reply).toHaveBeenCalledWith(
				mockLeaderboardContent
			);
		});

		test("should use correct limit of 10", async () => {
			const mockDebtors = [];
			buildTopDebtorLeaderboard.mockReturnValue("No debtors");
			getTopDebtors.mockResolvedValue(mockDebtors);

			await topDebtorsCommand.execute(mockInteraction);

			expect(getTopDebtors).toHaveBeenCalledWith("guild456", 10);
			expect(buildTopDebtorLeaderboard).toHaveBeenCalledWith(
				mockDebtors,
				10
			);
		});

		test("should handle database errors", async () => {
			getTopDebtors.mockRejectedValue(new Error("Database error"));

			await expect(
				topDebtorsCommand.execute(mockInteraction)
			).rejects.toThrow("Database error");
		});
	});

	describe("Utility Function Integration", () => {
		test("should pass correct parameters to utility functions", async () => {
			const mockDebtors = [
				{ userId: "user1", totalAmount: 50, debtCount: 1 },
			];
			getTopDebtors.mockResolvedValue(mockDebtors);
			buildTopDebtorLeaderboard.mockReturnValue("leaderboard content");

			await topDebtorsCommand.execute(mockInteraction);

			expect(getTopDebtors).toHaveBeenCalledWith("guild456", 10);
			expect(buildTopDebtorLeaderboard).toHaveBeenCalledWith(
				mockDebtors,
				10
			);
		});
	});
});
