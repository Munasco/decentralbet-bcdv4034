import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting DecentralBet deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy MockUSDC first
  console.log("\n📄 Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("MockUSDC deployed to:", mockUSDCAddress);

  // Deploy PredictionMarketFactory
  console.log("\n🏭 Deploying PredictionMarketFactory...");
  const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarketFactory");
  const factory = await PredictionMarketFactory.deploy(mockUSDCAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("PredictionMarketFactory deployed to:", factoryAddress);

  // Display deployment summary
  console.log("\n✅ Deployment completed!");
  console.log("=====================================");
  console.log("MockUSDC Address:               ", mockUSDCAddress);
  console.log("PredictionMarketFactory Address:", factoryAddress);
  console.log("Network:                        ", "localhost");
  console.log("Deployer:                       ", deployer.address);
  console.log("=====================================");

  return {
    mockUSDC: mockUSDCAddress,
    factory: factoryAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
