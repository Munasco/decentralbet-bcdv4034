const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying contracts...");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  
  console.log("MockUSDC deployed to:", await mockUSDC.getAddress());
  
  // Deploy Factory
  const Factory = await ethers.getContractFactory("PredictionMarketFactory");
  const factory = await Factory.deploy(await mockUSDC.getAddress());
  await factory.waitForDeployment();
  
  console.log("Factory deployed to:", await factory.getAddress());
  
  console.log("✅ Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
