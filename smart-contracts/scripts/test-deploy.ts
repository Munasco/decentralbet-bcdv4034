import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing Hardhat deployment setup...");
  
  try {
    console.log("✅ Hardhat imported successfully");
    
    // Get signers
    const signers = await ethers.getSigners();
    console.log(`✅ Found ${signers.length} signers`);
    console.log("Deployer address:", signers[0].address);
    
    // Get balance
    const balance = await ethers.provider.getBalance(signers[0].address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
    
    // Test contract factory access
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    console.log("✅ Contract factory created successfully");
    
    // Deploy
    console.log("\n🚀 Deploying MockUSDC...");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    
    const address = await mockUSDC.getAddress();
    console.log("✅ MockUSDC deployed to:", address);
    
    // Test contract interaction
    const name = await mockUSDC.name();
    const symbol = await mockUSDC.symbol();
    console.log(`✅ Token: ${name} (${symbol})`);
    
    console.log("\n🎉 All tests passed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
