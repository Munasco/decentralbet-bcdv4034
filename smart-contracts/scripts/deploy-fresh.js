import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying fresh contracts to Hardhat local network...");
  
  // Get signers
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy MockUSDC first
  console.log("\n📄 Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", mockUSDCAddress);

  // Test MockUSDC
  const name = await mockUSDC.name();
  const symbol = await mockUSDC.symbol();
  const decimals = await mockUSDC.decimals();
  console.log(`Token: ${name} (${symbol}) with ${decimals} decimals`);

  // Deploy PredictionMarket
  console.log("\n🎯 Deploying PredictionMarket...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(mockUSDCAddress);
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  console.log("✅ PredictionMarket deployed to:", predictionMarketAddress);

  // Test PredictionMarket
  const marketCounter = await predictionMarket.marketCounter();
  const bettingToken = await predictionMarket.bettingToken();
  console.log(`Market counter: ${marketCounter}, Betting token: ${bettingToken}`);

  // Display final addresses
  console.log("\n🎉 Deployment Summary:");
  console.log("=====================================");
  console.log("MockUSDC:         ", mockUSDCAddress);
  console.log("PredictionMarket: ", predictionMarketAddress);
  console.log("Network:          ", "localhost (Hardhat)");
  console.log("Deployer:         ", deployer.address);
  console.log("=====================================");
  
  console.log("\n💡 Update your frontend config with these addresses:");
  console.log("MOCK_USDC:", mockUSDCAddress);
  console.log("PREDICTION_MARKET:", predictionMarketAddress);

  return {
    mockUSDC: mockUSDCAddress,
    predictionMarket: predictionMarketAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
