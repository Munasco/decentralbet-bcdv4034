import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { Contract, Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("PredictionMarketFactory", function () {
  let factory: Contract;
  let mockUSDC: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;

  async function deployFactoryFixture() {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy Factory
    const Factory = await ethers.getContractFactory("PredictionMarketFactory");
    factory = await Factory.deploy(await mockUSDC.getAddress());
    await factory.waitForDeployment();

    return { factory, mockUSDC, owner, user1, user2 };
  }

  beforeEach(async function () {
    ({ factory, mockUSDC, owner, user1, user2 } = await loadFixture(deployFactoryFixture));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await factory.owner()).to.equal(ownerAddress);
    });

    it("Should set the correct default betting token", async function () {
      expect(await factory.defaultBettingToken()).to.equal(await mockUSDC.getAddress());
    });

    it("Should initialize with zero deployed markets", async function () {
      expect(await factory.totalMarketsDeployed()).to.equal(0);
    });
  });

  describe("Market Deployment", function () {
    it("Should deploy a prediction market with custom token", async function () {
      const name = "Test Market";
      const description = "A test prediction market";
      
      await expect(
        factory.connect(user1).deployPredictionMarket(await mockUSDC.getAddress(), name, description)
      )
        .to.emit(factory, "PredictionMarketDeployed")
        .to.emit(factory, "MarketRegistered")
        .withArgs(expect.any(String), name, description);

      expect(await factory.totalMarketsDeployed()).to.equal(1);
    });

    it("Should deploy a standard market with default token", async function () {
      const name = "Standard Market";
      const description = "A standard prediction market";
      
      const tx = await factory.connect(user1).deployStandardMarket(name, description);
      const receipt = await tx.wait();

      expect(await factory.totalMarketsDeployed()).to.equal(1);
    });

    it("Should deploy market using default token when zero address provided", async function () {
      const name = "Default Token Market";
      const description = "Market using default token";
      
      await factory.connect(user1).deployPredictionMarket(ethers.ZeroAddress, name, description);
      
      const userMarkets = await factory.getUserMarkets(user1Address);
      const marketAddress = userMarkets[0];
      
      const marketInfo = await factory.getMarketInfo(marketAddress);
      expect(marketInfo.bettingToken).to.equal(await mockUSDC.getAddress());
    });

    it("Should fail with empty market name", async function () {
      await expect(
        factory.connect(user1).deployPredictionMarket(await mockUSDC.getAddress(), "", "Description")
      ).to.be.revertedWith("Market name cannot be empty");
    });

    it("Should fail with duplicate market name", async function () {
      const name = "Duplicate Market";
      const description = "First market";
      
      await factory.connect(user1).deployPredictionMarket(await mockUSDC.getAddress(), name, description);
      
      await expect(
        factory.connect(user2).deployPredictionMarket(await mockUSDC.getAddress(), name, "Second market")
      ).to.be.revertedWith("Market name already exists");
    });

    it("Should track deployed markets correctly", async function () {
      await factory.connect(user1).deployStandardMarket("Market 1", "Description 1");
      await factory.connect(user2).deployStandardMarket("Market 2", "Description 2");
      
      const allMarkets = await factory.getAllMarkets();
      const activeMarkets = await factory.getActiveMarkets();
      
      expect(allMarkets.length).to.equal(2);
      expect(activeMarkets.length).to.equal(2);
      expect(await factory.totalMarketsDeployed()).to.equal(2);
    });

    it("Should store correct market info", async function () {
      const name = "Info Test Market";
      const description = "Testing market info storage";
      
      await factory.connect(user1).deployPredictionMarket(await mockUSDC.getAddress(), name, description);
      
      const userMarkets = await factory.getUserMarkets(user1Address);
      const marketAddress = userMarkets[0];
      
      const marketInfo = await factory.getMarketInfo(marketAddress);
      expect(marketInfo.name).to.equal(name);
      expect(marketInfo.description).to.equal(description);
      expect(marketInfo.creator).to.equal(user1Address);
      expect(marketInfo.bettingToken).to.equal(await mockUSDC.getAddress());
      expect(marketInfo.isActive).to.be.true;
    });
  });

  describe("Market Management", function () {
    let marketAddress: string;

    beforeEach(async function () {
      await factory.connect(user1).deployStandardMarket("Test Market", "Description");
      const userMarkets = await factory.getUserMarkets(user1Address);
      marketAddress = userMarkets[0];
    });

    it("Should allow market creator to deactivate market", async function () {
      await factory.connect(user1).deactivateMarket(marketAddress);
      
      const marketInfo = await factory.getMarketInfo(marketAddress);
      expect(marketInfo.isActive).to.be.false;
      
      const activeMarkets = await factory.getActiveMarkets();
      expect(activeMarkets.length).to.equal(0);
    });

    it("Should allow owner to deactivate any market", async function () {
      await factory.connect(owner).deactivateMarket(marketAddress);
      
      const marketInfo = await factory.getMarketInfo(marketAddress);
      expect(marketInfo.isActive).to.be.false;
    });

    it("Should fail deactivation by unauthorized user", async function () {
      await expect(
        factory.connect(user2).deactivateMarket(marketAddress)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow reactivating deactivated market", async function () {
      await factory.connect(user1).deactivateMarket(marketAddress);
      await factory.connect(user1).reactivateMarket(marketAddress);
      
      const marketInfo = await factory.getMarketInfo(marketAddress);
      expect(marketInfo.isActive).to.be.true;
      
      const activeMarkets = await factory.getActiveMarkets();
      expect(activeMarkets.length).to.equal(1);
    });

    it("Should fail reactivating active market", async function () {
      await expect(
        factory.connect(user1).reactivateMarket(marketAddress)
      ).to.be.revertedWith("Market already active");
    });

    it("Should fail deactivating inactive market", async function () {
      await factory.connect(user1).deactivateMarket(marketAddress);
      await expect(
        factory.connect(user1).deactivateMarket(marketAddress)
      ).to.be.revertedWith("Market already inactive");
    });
  });

  describe("Market Queries", function () {
    beforeEach(async function () {
      // Deploy multiple markets
      await factory.connect(user1).deployStandardMarket("User1 Market1", "Description 1");
      await factory.connect(user1).deployStandardMarket("User1 Market2", "Description 2");
      await factory.connect(user2).deployStandardMarket("User2 Market1", "Description 3");
    });

    it("Should return correct user markets", async function () {
      const user1Markets = await factory.getUserMarkets(user1Address);
      const user2Markets = await factory.getUserMarkets(user2Address);
      
      expect(user1Markets.length).to.equal(2);
      expect(user2Markets.length).to.equal(1);
    });

    it("Should return market by name", async function () {
      const marketAddress = await factory.getMarketByName("User1 Market1");
      expect(marketAddress).to.not.equal(ethers.ZeroAddress);
      
      const marketInfo = await factory.getMarketInfo(marketAddress);
      expect(marketInfo.name).to.equal("User1 Market1");
    });

    it("Should return zero address for non-existent market name", async function () {
      const marketAddress = await factory.getMarketByName("Non-existent Market");
      expect(marketAddress).to.equal(ethers.ZeroAddress);
    });

    it("Should validate market addresses correctly", async function () {
      const user1Markets = await factory.getUserMarkets(user1Address);
      const validMarket = user1Markets[0];
      const invalidAddress = ethers.ZeroAddress;
      
      expect(await factory.isMarketValid(validMarket)).to.be.true;
      expect(await factory.isMarketValid(invalidAddress)).to.be.false;
    });

    it("Should return correct paginated markets", async function () {
      const [markets, total] = await factory.getPaginatedMarkets(0, 2);
      
      expect(total).to.equal(3);
      expect(markets.length).to.equal(2);
    });

    it("Should return empty array for out-of-range pagination", async function () {
      const [markets, total] = await factory.getPaginatedMarkets(10, 5);
      
      expect(total).to.equal(3);
      expect(markets.length).to.equal(0);
    });

    it("Should return markets by creator with pagination", async function () {
      const [markets, total] = await factory.getMarketsByCreator(user1Address, 0, 10);
      
      expect(total).to.equal(2);
      expect(markets.length).to.equal(2);
    });
  });

  describe("Administrative Functions", function () {
    it("Should allow owner to update default betting token", async function () {
      // Deploy another token
      const MockToken2 = await ethers.getContractFactory("MockUSDC");
      const mockToken2 = await MockToken2.deploy();
      await mockToken2.waitForDeployment();
      
      await expect(
        factory.updateDefaultBettingToken(await mockToken2.getAddress())
      )
        .to.emit(factory, "DefaultBettingTokenUpdated")
        .withArgs(await mockUSDC.getAddress(), await mockToken2.getAddress());
      
      expect(await factory.defaultBettingToken()).to.equal(await mockToken2.getAddress());
    });

    it("Should fail updating default token to zero address", async function () {
      await expect(
        factory.updateDefaultBettingToken(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should fail updating default token by non-owner", async function () {
      await expect(
        factory.connect(user1).updateDefaultBettingToken(await mockUSDC.getAddress())
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should return correct deployment statistics", async function () {
      await factory.connect(user1).deployStandardMarket("Market 1", "Description");
      await factory.connect(user2).deployStandardMarket("Market 2", "Description");
      
      const [totalDeployed, totalActive, defaultToken] = await factory.getStats();
      
      expect(totalDeployed).to.equal(2);
      expect(totalActive).to.equal(2);
      expect(defaultToken).to.equal(await mockUSDC.getAddress());
    });

    it("Should allow owner to pause/unpause factory", async function () {
      await factory.pause();
      
      await expect(
        factory.connect(user1).deployStandardMarket("Paused Market", "Description")
      ).to.be.revertedWithCustomError(factory, "EnforcedPause");
      
      await factory.unpause();
      
      await expect(
        factory.connect(user1).deployStandardMarket("Unpaused Market", "Description")
      ).to.not.be.reverted;
    });
  });

  describe("Integration with PredictionMarket", function () {
    it("Should deploy functional PredictionMarket contracts", async function () {
      await factory.connect(user1).deployStandardMarket("Functional Test", "Testing functionality");
      
      const userMarkets = await factory.getUserMarkets(user1Address);
      const marketAddress = userMarkets[0];
      
      // Get deployed PredictionMarket contract
      const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
      const deployedMarket = PredictionMarket.attach(marketAddress);
      
      // Test basic functionality
      expect(await deployedMarket.bettingToken()).to.equal(await mockUSDC.getAddress());
      expect(await deployedMarket.owner()).to.equal(user1Address);
      expect(await deployedMarket.marketCounter()).to.equal(0);
    });

    it("Should maintain proper ownership of deployed contracts", async function () {
      await factory.connect(user1).deployStandardMarket("Ownership Test", "Testing ownership");
      
      const userMarkets = await factory.getUserMarkets(user1Address);
      const marketAddress = userMarkets[0];
      
      const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
      const deployedMarket = PredictionMarket.attach(marketAddress);
      
      expect(await deployedMarket.owner()).to.equal(user1Address);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple markets with same creator correctly", async function () {
      for (let i = 0; i < 5; i++) {
        await factory.connect(user1).deployStandardMarket(`Market ${i}`, `Description ${i}`);
      }
      
      const userMarkets = await factory.getUserMarkets(user1Address);
      expect(userMarkets.length).to.equal(5);
      
      expect(await factory.totalMarketsDeployed()).to.equal(5);
    });

    it("Should handle deactivation of multiple markets", async function () {
      await factory.connect(user1).deployStandardMarket("Market 1", "Description 1");
      await factory.connect(user1).deployStandardMarket("Market 2", "Description 2");
      
      const userMarkets = await factory.getUserMarkets(user1Address);
      
      await factory.connect(user1).deactivateMarket(userMarkets[0]);
      await factory.connect(user1).deactivateMarket(userMarkets[1]);
      
      const activeMarkets = await factory.getActiveMarkets();
      expect(activeMarkets.length).to.equal(0);
    });

    it("Should fail getting info for invalid market", async function () {
      await expect(
        factory.getMarketInfo(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid market address");
    });

    it("Should handle pagination edge cases", async function () {
      // Test with no markets
      const [emptyMarkets, emptyTotal] = await factory.getPaginatedMarkets(0, 10);
      expect(emptyMarkets.length).to.equal(0);
      expect(emptyTotal).to.equal(0);
      
      // Deploy one market
      await factory.connect(user1).deployStandardMarket("Single Market", "Description");
      
      // Test pagination with limit larger than total
      const [singleMarket, singleTotal] = await factory.getPaginatedMarkets(0, 10);
      expect(singleMarket.length).to.equal(1);
      expect(singleTotal).to.equal(1);
    });
  });
});
