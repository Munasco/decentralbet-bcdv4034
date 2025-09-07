import hre from "hardhat";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

async function main() {
  console.log("🚀 Deploying MockUSDC token...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy MockUSDC
  console.log("\n📄 Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  
  console.log("✅ MockUSDC deployed to:", mockUSDCAddress);

  // Verify deployment
  const name = await mockUSDC.name();
  const symbol = await mockUSDC.symbol();
  const decimals = await mockUSDC.decimals();
  const totalSupply = await mockUSDC.totalSupply();

  console.log("\n📊 Token Details:");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Decimals:", decimals);
  console.log("Total Supply:", hre.ethers.formatUnits(totalSupply, decimals));

  // Create deployments directory if it doesn't exist
  const deploymentsDir = join(__dirname, "../deployments");
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentInfo = {
    network: (await hre.ethers.provider.getNetwork()).name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    contracts: {
      MockUSDC: {
        address: mockUSDCAddress,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        constructorArgs: [],
        tokenDetails: {
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: totalSupply.toString()
        }
      }
    }
  };

  const deploymentPath = join(deploymentsDir, `mockusdc-${Date.now()}.json`);
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);

  // Create or update latest deployment file
  const latestPath = join(deploymentsDir, "latest-mockusdc.json");
  writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Latest deployment info saved to:", latestPath);

  console.log("\n🎉 MockUSDC deployment completed successfully!");
  console.log("\n💡 Next steps:");
  console.log("1. Verify the contract on Etherscan (if on a public network)");
  console.log("2. Use the faucet function to mint test tokens");
  console.log("3. Deploy the PredictionMarketFactory with this token address");

  return {
    mockUSDC: mockUSDCAddress,
  };
}

// Execute deployment if this file is run directly
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

export default main;
