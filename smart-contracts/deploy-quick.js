import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 Deploying DecentralBet Prediction Market Contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy MockUSDC first (needed for PredictionMarket)
  console.log("\n📄 Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", usdcAddress);

  // Deploy PredictionMarket
  console.log("\n🎯 Deploying PredictionMarket...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(usdcAddress);
  await predictionMarket.waitForDeployment();
  const marketAddress = await predictionMarket.getAddress();
  console.log("✅ PredictionMarket deployed to:", marketAddress);

  // Create a sample market for testing
  console.log("\n🏗️ Creating sample market...");
  const endTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days from now
  const outcomes = ["Yes", "No"];
  
  const tx = await predictionMarket.createMarket(
    "Will Bitcoin reach $100K by end of 2025?",
    "Crypto",
    "A prediction market about Bitcoin's price reaching $100,000 USD by December 31, 2025. Resolution will be based on major exchange prices (Coinbase, Binance, Kraken average).",
    endTime,
    outcomes,
    2 // 2% fee
  );
  
  await tx.wait();
  console.log("✅ Sample market created!");

  // Display summary
  console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=====================================");
  console.log("📋 Contract Addresses:");
  console.log("  MockUSDC:", usdcAddress);
  console.log("  PredictionMarket:", marketAddress);
  console.log("📋 Network:", await ethers.provider.getNetwork());
  console.log("=====================================");
  
  // Update the frontend config
  console.log("\n📝 Update your frontend config with these addresses:");
  console.log(`NEXT_PUBLIC_HARDHAT_PREDICTION_MARKET=${marketAddress}`);
  console.log(`NEXT_PUBLIC_HARDHAT_TOKEN=${usdcAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
