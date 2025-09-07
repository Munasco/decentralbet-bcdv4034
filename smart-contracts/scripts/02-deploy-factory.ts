import hre from "hardhat";
const { ethers } = hre;
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("🚀 Deploying PredictionMarketFactory...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Try to get MockUSDC address from previous deployment
  let mockUSDCAddress: string;
  try {
    const latestMockUSDCPath = join(__dirname, "../deployments/latest-mockusdc.json");
    if (existsSync(latestMockUSDCPath)) {
      const latestDeployment = JSON.parse(readFileSync(latestMockUSDCPath, "utf8"));
      mockUSDCAddress = latestDeployment.contracts.MockUSDC.address;
      console.log("📋 Using MockUSDC from previous deployment:", mockUSDCAddress);
    } else {
      throw new Error("MockUSDC deployment not found");
    }
  } catch (error) {
    console.log("⚠️  MockUSDC deployment not found. Deploying new MockUSDC first...");
    
    // Deploy MockUSDC first
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    mockUSDCAddress = await mockUSDC.getAddress();
    
    console.log("✅ MockUSDC deployed to:", mockUSDCAddress);
  }

  // Deploy PredictionMarketFactory
  console.log("\n🏭 Deploying PredictionMarketFactory...");
  const Factory = await ethers.getContractFactory("PredictionMarketFactory");
  const factory = await Factory.deploy(mockUSDCAddress);
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log("✅ PredictionMarketFactory deployed to:", factoryAddress);

  // Verify deployment
  const defaultBettingToken = await factory.defaultBettingToken();
  const owner = await factory.owner();
  const totalMarketsDeployed = await factory.totalMarketsDeployed();

  console.log("\n📊 Factory Details:");
  console.log("Owner:", owner);
  console.log("Default Betting Token:", defaultBettingToken);
  console.log("Total Markets Deployed:", totalMarketsDeployed.toString());

  // Create deployments directory if it doesn't exist
  const deploymentsDir = join(__dirname, "../deployments");
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      MockUSDC: {
        address: mockUSDCAddress,
        note: "Betting token for prediction markets"
      },
      PredictionMarketFactory: {
        address: factoryAddress,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        constructorArgs: [mockUSDCAddress],
        factoryDetails: {
          owner,
          defaultBettingToken,
          totalMarketsDeployed: Number(totalMarketsDeployed)
        }
      }
    }
  };

  const deploymentPath = join(deploymentsDir, `factory-${Date.now()}.json`);
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);

  // Create or update latest deployment file
  const latestPath = join(deploymentsDir, "latest-factory.json");
  writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Latest deployment info saved to:", latestPath);

  // Update main deployments file
  const mainDeploymentsPath = join(deploymentsDir, "deployments.json");
  const mainDeployments = existsSync(mainDeploymentsPath) 
    ? JSON.parse(readFileSync(mainDeploymentsPath, "utf8"))
    : { networks: {} };

  const networkName = (await ethers.provider.getNetwork()).name;
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  mainDeployments.networks[chainId.toString()] = {
    name: networkName,
    chainId: Number(chainId),
    contracts: deploymentInfo.contracts,
    lastUpdated: new Date().toISOString()
  };

  writeFileSync(mainDeploymentsPath, JSON.stringify(mainDeployments, null, 2));
  console.log("📄 Main deployments file updated:", mainDeploymentsPath);

  console.log("\n🎉 PredictionMarketFactory deployment completed successfully!");
  console.log("\n💡 Next steps:");
  console.log("1. Verify contracts on Etherscan (if on a public network)");
  console.log("2. Deploy some test prediction markets using the factory");
  console.log("3. Test the end-to-end betting workflow");
  console.log("4. Set up the backend API to interact with these contracts");

  console.log("\n📝 Contract Addresses:");
  console.log("MockUSDC:", mockUSDCAddress);
  console.log("PredictionMarketFactory:", factoryAddress);

  return {
    mockUSDC: mockUSDCAddress,
    factory: factoryAddress,
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
