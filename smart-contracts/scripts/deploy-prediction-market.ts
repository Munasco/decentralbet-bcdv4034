import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying PredictionMarket contract...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // First check if MockUSDC exists at expected address
  const mockUSDCAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const mockUSDCCode = await hre.ethers.provider.getCode(mockUSDCAddress);
  
  let usdcAddress = mockUSDCAddress;
  
  if (mockUSDCCode === "0x") {
    // Deploy MockUSDC if it doesn't exist
    console.log("📄 MockUSDC not found, deploying new one...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    usdcAddress = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", usdcAddress);
  } else {
    console.log("📄 Using existing MockUSDC at:", mockUSDCAddress);
  }

  // Deploy PredictionMarket
  console.log("\n🎯 Deploying PredictionMarket...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(usdcAddress);
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  console.log("PredictionMarket deployed to:", predictionMarketAddress);

  // Test basic functions
  console.log("\n🧪 Testing contract functions...");
  const marketCount = await predictionMarket.marketCounter();
  console.log("Initial market count:", marketCount.toString());

  // Display deployment summary
  console.log("\n✅ Deployment completed!");
  console.log("=====================================");
  console.log("MockUSDC Address:        ", usdcAddress);
  console.log("PredictionMarket Address:", predictionMarketAddress);
  console.log("Network:                 ", "localhost");
  console.log("Deployer:                ", deployer.address);
  console.log("=====================================");

  return {
    mockUSDC: usdcAddress,
    predictionMarket: predictionMarketAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
