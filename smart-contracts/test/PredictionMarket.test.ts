import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { Contract, Signer } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("PredictionMarket", function () {
  let predictionMarket: Contract;
  let mockUSDC: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let resolver: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let resolverAddress: string;

  const INITIAL_USDC_BALANCE = ethers.parseUnits("10000", 6); // 10,000 USDC
  const MIN_BET_AMOUNT = ethers.parseEther("0.01");

  async function deployFixture() {
    // Get signers
    [owner, user1, user2, resolver] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    resolverAddress = await resolver.getAddress();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy PredictionMarket
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PredictionMarket.deploy(await mockUSDC.getAddress());
    await predictionMarket.waitForDeployment();

    // Mint USDC to test users
    await mockUSDC.mint(user1Address, INITIAL_USDC_BALANCE);
    await mockUSDC.mint(user2Address, INITIAL_USDC_BALANCE);

    // Approve PredictionMarket to spend USDC
    await mockUSDC.connect(user1).approve(await predictionMarket.getAddress(), ethers.MaxUint256);
    await mockUSDC.connect(user2).approve(await predictionMarket.getAddress(), ethers.MaxUint256);

    // Authorize resolver
    await predictionMarket.authorizeResolver(resolverAddress);

    return { predictionMarket, mockUSDC, owner, user1, user2, resolver };
  }

  beforeEach(async function () {
    ({ predictionMarket, mockUSDC, owner, user1, user2, resolver } = await loadFixture(deployFixture));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await predictionMarket.owner()).to.equal(ownerAddress);
    });

    it("Should set the correct betting token", async function () {
      expect(await predictionMarket.bettingToken()).to.equal(await mockUSDC.getAddress());
    });

    it("Should initialize market counter to 0", async function () {
      expect(await predictionMarket.marketCounter()).to.equal(0);
    });

    it("Should set default platform fee to 2%", async function () {
      expect(await predictionMarket.platformFeePercentage()).to.equal(2);
    });
  });

  describe("Market Creation", function () {
    it("Should create a market with valid parameters", async function () {
      const question = "Will BTC reach $100,000 by end of 2024?";
      const category = "Crypto";
      const description = "Prediction on Bitcoin price";
      const endTime = (await time.latest()) + 86400; // 1 day from now
      const outcomes = ["Yes", "No"];
      const feePercentage = 3;

      await expect(
        predictionMarket.createMarket(question, category, description, endTime, outcomes, feePercentage)
      )
        .to.emit(predictionMarket, "MarketCreated")
        .withArgs(1, question, endTime, ownerAddress);

      const market = await predictionMarket.getMarket(1);
      expect(market.question).to.equal(question);
      expect(market.category).to.equal(category);
      expect(market.outcomeCount).to.equal(2);
    });

    it("Should increment market counter", async function () {
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Question 1", "Category", "Description", endTime, ["Yes", "No"], 2);
      expect(await predictionMarket.marketCounter()).to.equal(1);

      await predictionMarket.createMarket("Question 2", "Category", "Description", endTime, ["Yes", "No"], 2);
      expect(await predictionMarket.marketCounter()).to.equal(2);
    });

    it("Should fail with empty question", async function () {
      const endTime = (await time.latest()) + 86400;
      await expect(
        predictionMarket.createMarket("", "Category", "Description", endTime, ["Yes", "No"], 2)
      ).to.be.revertedWith("Question cannot be empty");
    });

    it("Should fail with less than 2 outcomes", async function () {
      const endTime = (await time.latest()) + 86400;
      await expect(
        predictionMarket.createMarket("Question", "Category", "Description", endTime, ["Yes"], 2)
      ).to.be.revertedWith("Must have at least 2 outcomes");
    });

    it("Should fail with end time too soon", async function () {
      const endTime = (await time.latest()) + 1800; // 30 minutes
      await expect(
        predictionMarket.createMarket("Question", "Category", "Description", endTime, ["Yes", "No"], 2)
      ).to.be.revertedWith("End time too soon");
    });

    it("Should fail with fee percentage too high", async function () {
      const endTime = (await time.latest()) + 86400;
      await expect(
        predictionMarket.createMarket("Question", "Category", "Description", endTime, ["Yes", "No"], 15)
      ).to.be.revertedWith("Fee percentage too high");
    });
  });

  describe("Betting", function () {
    let marketId: number;
    let endTime: number;

    beforeEach(async function () {
      endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Test Market", "Test", "Test Description", endTime, ["Yes", "No"], 2);
      marketId = 1;
    });

    it("Should allow users to place bets", async function () {
      const betAmount = ethers.parseUnits("100", 6); // 100 USDC
      const outcomeId = 1;

      await expect(
        predictionMarket.connect(user1).placeBet(marketId, outcomeId, betAmount)
      )
        .to.emit(predictionMarket, "BetPlaced")
        .withArgs(marketId, outcomeId, user1Address, betAmount, expect.any(String));

      const position = await predictionMarket.getUserPosition(user1Address, marketId, outcomeId);
      expect(position.backed).to.equal(betAmount);
    });

    it("Should update market volume after bet", async function () {
      const betAmount = ethers.parseUnits("100", 6);
      await predictionMarket.connect(user1).placeBet(marketId, 1, betAmount);

      const market = await predictionMarket.getMarket(marketId);
      expect(market.totalVolume).to.equal(betAmount);
    });

    it("Should fail with bet amount too small", async function () {
      const betAmount = ethers.parseUnits("0.005", 6); // 0.005 USDC (less than 0.01 ETH equivalent)
      await expect(
        predictionMarket.connect(user1).placeBet(marketId, 1, betAmount)
      ).to.be.revertedWith("Bet amount too small");
    });

    it("Should fail betting on non-existent market", async function () {
      const betAmount = ethers.parseUnits("100", 6);
      await expect(
        predictionMarket.connect(user1).placeBet(999, 1, betAmount)
      ).to.be.revertedWith("Market does not exist");
    });

    it("Should fail betting on non-existent outcome", async function () {
      const betAmount = ethers.parseUnits("100", 6);
      await expect(
        predictionMarket.connect(user1).placeBet(marketId, 999, betAmount)
      ).to.be.revertedWith("Outcome does not exist");
    });

    it("Should fail betting after market ends", async function () {
      await time.increaseTo(endTime + 1);
      const betAmount = ethers.parseUnits("100", 6);
      await expect(
        predictionMarket.connect(user1).placeBet(marketId, 1, betAmount)
      ).to.be.revertedWith("Market has ended");
    });
  });

  describe("Market Resolution", function () {
    let marketId: number;
    let endTime: number;

    beforeEach(async function () {
      endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Test Market", "Test", "Test Description", endTime, ["Yes", "No"], 2);
      marketId = 1;

      // Place some bets
      const betAmount = ethers.parseUnits("100", 6);
      await predictionMarket.connect(user1).placeBet(marketId, 1, betAmount);
      await predictionMarket.connect(user2).placeBet(marketId, 2, betAmount);

      // Fast forward past end time
      await time.increaseTo(endTime + 1);
    });

    it("Should allow authorized resolver to resolve market", async function () {
      const winningOutcome = 1;

      await expect(
        predictionMarket.connect(resolver).resolveMarket(marketId, winningOutcome)
      )
        .to.emit(predictionMarket, "MarketResolved")
        .withArgs(marketId, winningOutcome, resolverAddress);

      const market = await predictionMarket.getMarket(marketId);
      expect(market.isResolved).to.be.true;
      expect(market.winningOutcome).to.equal(winningOutcome);
    });

    it("Should fail if market hasn't ended", async function () {
      // Create new market with future end time
      const futureEndTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Future Market", "Test", "Description", futureEndTime, ["Yes", "No"], 2);
      
      await expect(
        predictionMarket.connect(resolver).resolveMarket(2, 1)
      ).to.be.revertedWith("Market is still active");
    });

    it("Should fail if not authorized resolver", async function () {
      await expect(
        predictionMarket.connect(user1).resolveMarket(marketId, 1)
      ).to.be.revertedWith("Not authorized to resolve markets");
    });

    it("Should fail resolving with invalid outcome", async function () {
      await expect(
        predictionMarket.connect(resolver).resolveMarket(marketId, 999)
      ).to.be.revertedWith("Outcome does not exist");
    });

    it("Should fail resolving already resolved market", async function () {
      await predictionMarket.connect(resolver).resolveMarket(marketId, 1);
      
      await expect(
        predictionMarket.connect(resolver).resolveMarket(marketId, 2)
      ).to.be.revertedWith("Market already resolved");
    });
  });

  describe("Claims and Winnings", function () {
    let marketId: number;
    let endTime: number;

    beforeEach(async function () {
      endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Test Market", "Test", "Test Description", endTime, ["Yes", "No"], 2);
      marketId = 1;
    });

    it("Should calculate correct winnings", async function () {
      const betAmount = ethers.parseUnits("100", 6);
      
      // User1 bets on outcome 1 (winner)
      await predictionMarket.connect(user1).placeBet(marketId, 1, betAmount);
      // User2 bets on outcome 2 (loser)
      await predictionMarket.connect(user2).placeBet(marketId, 2, betAmount);

      await time.increaseTo(endTime + 1);
      await predictionMarket.connect(resolver).resolveMarket(marketId, 1);

      const winnings = await predictionMarket.calculateWinnings(marketId, user1Address);
      
      // Total pool: 200 USDC
      // Platform fee (2%): 4 USDC
      // Net pool: 196 USDC
      // User1 should get the full net pool since they're the only winner
      const expectedWinnings = ethers.parseUnits("196", 6);
      expect(winnings).to.equal(expectedWinnings);
    });

    it("Should allow winners to claim their winnings", async function () {
      const betAmount = ethers.parseUnits("100", 6);
      const initialBalance = await mockUSDC.balanceOf(user1Address);
      
      await predictionMarket.connect(user1).placeBet(marketId, 1, betAmount);
      await predictionMarket.connect(user2).placeBet(marketId, 2, betAmount);

      await time.increaseTo(endTime + 1);
      await predictionMarket.connect(resolver).resolveMarket(marketId, 1);

      await expect(
        predictionMarket.connect(user1).claimWinnings(marketId)
      ).to.emit(predictionMarket, "WinningsClaimed");

      const finalBalance = await mockUSDC.balanceOf(user1Address);
      expect(finalBalance).to.be.gt(initialBalance - betAmount); // Should have more than they put in
    });

    it("Should fail claiming on unresolved market", async function () {
      const betAmount = ethers.parseUnits("100", 6);
      await predictionMarket.connect(user1).placeBet(marketId, 1, betAmount);

      await expect(
        predictionMarket.connect(user1).claimWinnings(marketId)
      ).to.be.revertedWith("Market not resolved yet");
    });

    it("Should fail claiming with no winning position", async function () {
      const betAmount = ethers.parseUnits("100", 6);
      await predictionMarket.connect(user1).placeBet(marketId, 2, betAmount); // Bet on losing outcome

      await time.increaseTo(endTime + 1);
      await predictionMarket.connect(resolver).resolveMarket(marketId, 1); // Outcome 1 wins

      await expect(
        predictionMarket.connect(user1).claimWinnings(marketId)
      ).to.be.revertedWith("No winning position");
    });
  });

  describe("Market Queries", function () {
    it("Should return correct active markets", async function () {
      const endTime = (await time.latest()) + 86400;
      
      await predictionMarket.createMarket("Market 1", "Test", "Description", endTime, ["Yes", "No"], 2);
      await predictionMarket.createMarket("Market 2", "Test", "Description", endTime, ["Yes", "No"], 2);

      const activeMarkets = await predictionMarket.getActiveMarkets();
      expect(activeMarkets.length).to.equal(2);
      expect(activeMarkets[0]).to.equal(1);
      expect(activeMarkets[1]).to.equal(2);
    });

    it("Should return markets by category", async function () {
      const endTime = (await time.latest()) + 86400;
      
      await predictionMarket.createMarket("Market 1", "Sports", "Description", endTime, ["Yes", "No"], 2);
      await predictionMarket.createMarket("Market 2", "Politics", "Description", endTime, ["Yes", "No"], 2);
      await predictionMarket.createMarket("Market 3", "Sports", "Description", endTime, ["Yes", "No"], 2);

      const sportsMarkets = await predictionMarket.getMarketsByCategory("Sports");
      const politicsMarkets = await predictionMarket.getMarketsByCategory("Politics");

      expect(sportsMarkets.length).to.equal(2);
      expect(politicsMarkets.length).to.equal(1);
    });

    it("Should return user betting history", async function () {
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Market 1", "Test", "Description", endTime, ["Yes", "No"], 2);
      
      const betAmount = ethers.parseUnits("100", 6);
      await predictionMarket.connect(user1).placeBet(1, 1, betAmount);

      const userBets = await predictionMarket.getUserBets(user1Address);
      expect(userBets.length).to.equal(1);
      expect(userBets[0].marketId).to.equal(1);
      expect(userBets[0].outcomeId).to.equal(1);
      expect(userBets[0].amountBacked).to.equal(betAmount);
    });
  });

  describe("Administrative Functions", function () {
    it("Should allow owner to set platform fee", async function () {
      await predictionMarket.setPlatformFee(5);
      expect(await predictionMarket.platformFeePercentage()).to.equal(5);
    });

    it("Should fail setting platform fee too high", async function () {
      await expect(
        predictionMarket.setPlatformFee(15)
      ).to.be.revertedWith("Fee too high");
    });

    it("Should allow owner to authorize/remove resolvers", async function () {
      const newResolver = user1Address;
      
      await predictionMarket.authorizeResolver(newResolver);
      expect(await predictionMarket.authorizedResolvers(newResolver)).to.be.true;

      await predictionMarket.removeResolver(newResolver);
      expect(await predictionMarket.authorizedResolvers(newResolver)).to.be.false;
    });

    it("Should allow owner to pause/unpause contract", async function () {
      await predictionMarket.pause();
      
      const endTime = (await time.latest()) + 86400;
      await expect(
        predictionMarket.createMarket("Market", "Test", "Description", endTime, ["Yes", "No"], 2)
      ).to.be.revertedWith("Pausable: paused");

      await predictionMarket.unpause();
      
      // Should work after unpause
      await expect(
        predictionMarket.createMarket("Market", "Test", "Description", endTime, ["Yes", "No"], 2)
      ).to.not.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero winnings correctly", async function () {
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Market", "Test", "Description", endTime, ["Yes", "No"], 2);
      
      const winnings = await predictionMarket.calculateWinnings(1, user1Address);
      expect(winnings).to.equal(0);
    });

    it("Should handle multiple bets from same user on same outcome", async function () {
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Market", "Test", "Description", endTime, ["Yes", "No"], 2);
      
      const betAmount1 = ethers.parseUnits("50", 6);
      const betAmount2 = ethers.parseUnits("75", 6);
      
      await predictionMarket.connect(user1).placeBet(1, 1, betAmount1);
      await predictionMarket.connect(user1).placeBet(1, 1, betAmount2);

      const position = await predictionMarket.getUserPosition(user1Address, 1, 1);
      expect(position.backed).to.equal(betAmount1 + betAmount2);

      const userBets = await predictionMarket.getUserBets(user1Address);
      expect(userBets.length).to.equal(2);
    });
  });
});
