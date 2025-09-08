import { ethers } from "hardhat";
import hre from "hardhat";
import fs from 'fs';
import path from 'path';

/**
 * DecentralBet Smart Contract Deployment
 * Single consolidated script for all networks (localhost, sepolia, polygon)
 * Usage: npx hardhat run scripts/deploy.js --network <network>
 */

const NETWORK_CONFIGS = {
  localhost: {
    name: "Local Hardhat",
    chainId: 1337,
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: null
  },
  sepolia: {
    name: "Ethereum Sepolia Testnet",
    chainId: 11155111,
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g",
    blockExplorer: "https://sepolia.etherscan.io"
  },
  polygon: {
    name: "Polygon Mumbai Testnet", 
    chainId: 80001,
    rpcUrl: "https://polygon-mumbai.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g",
    blockExplorer: "https://mumbai.polygonscan.com"
  }
};

async function main() {
  const network = hre.network.name;
  const config = NETWORK_CONFIGS[network];
  
  if (!config) {
    throw new Error(`Unsupported network: ${network}. Supported: ${Object.keys(NETWORK_CONFIGS).join(', ')}`);
  }

  console.log(`🚀 Deploying DecentralBet contracts to ${config.name}`);
  console.log(`Network: ${network} (Chain ID: ${config.chainId})`);
  console.log(`===============================================`);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (network !== 'localhost' && balance < ethers.parseEther("0.01")) {
    console.log(`⚠️  Low balance! Get testnet ETH from:`);
    if (network === 'sepolia') {
      console.log("   https://sepoliafaucet.com/");
      console.log("   https://www.alchemy.com/faucets/ethereum-sepolia");
    } else if (network === 'polygon') {
      console.log("   https://faucet.polygon.technology/");
    }
    console.log("");
  }

  // Deploy MockUSDC
  console.log("📦 Step 1: Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", mockUSDCAddress);

  // Deploy PredictionMarketFactory  
  console.log("\n📦 Step 2: Deploying PredictionMarketFactory...");
  const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarketFactory");
  const factory = await PredictionMarketFactory.deploy(mockUSDCAddress); // Pass MockUSDC as default betting token
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ PredictionMarketFactory deployed to:", factoryAddress);

  // Deploy main PredictionMarket
  console.log("\n📦 Step 3: Deploying PredictionMarket...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(
    mockUSDCAddress // Only betting token required
  );
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  console.log("✅ PredictionMarket deployed to:", predictionMarketAddress);

  // Save deployment info
  const deploymentInfo = {
    network: config.name,
    chainId: config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MockUSDC: mockUSDCAddress,
      PredictionMarketFactory: factoryAddress, 
      PredictionMarket: predictionMarketAddress
    },
    rpcUrl: config.rpcUrl,
    blockExplorer: config.blockExplorer
  };

  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentFile = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  // Update environment files
  updateEnvironmentFiles(network, deploymentInfo);

  // Display results
  console.log("\n🎉 Deployment completed successfully!");
  console.log("===============================================");
  console.log("📋 Contract Addresses:");
  console.log("===============================================");
  console.log("MockUSDC:               ", mockUSDCAddress);
  console.log("PredictionMarketFactory:", factoryAddress);
  console.log("PredictionMarket:       ", predictionMarketAddress);
  console.log("===============================================");
  console.log("💾 Deployment saved to:", deploymentFile);

  if (config.blockExplorer) {
    console.log("🔗 View on Block Explorer:");
    console.log(`   ${config.blockExplorer}/address/${predictionMarketAddress}`);
  }

  if (network !== 'localhost') {
    console.log("\n📱 MetaMask Configuration:");
    console.log(`Network Name: ${config.name}`);
    console.log(`RPC URL: ${config.rpcUrl}`);
    console.log(`Chain ID: ${config.chainId}`);
    console.log(`Currency: ETH`);
    if (config.blockExplorer) {
      console.log(`Block Explorer: ${config.blockExplorer}`);
    }
  }

  console.log("===============================================");
}

function updateEnvironmentFiles(network, deploymentInfo) {
  const { contracts } = deploymentInfo;
  
  // Update backend environment
  const backendEnvPath = path.join(__dirname, '../../backend/.env');
  updateEnvFile(backendEnvPath, {
    ETHEREUM_NETWORK: network,
    ETHEREUM_RPC_URL: deploymentInfo.rpcUrl,
    CHAIN_ID: deploymentInfo.chainId.toString(),
    PREDICTION_MARKET_ADDRESS: contracts.PredictionMarket,
    MOCK_USDC_ADDRESS: contracts.MockUSDC,
    PREDICTION_MARKET_FACTORY_ADDRESS: contracts.PredictionMarketFactory
  });

  // Update frontend environment
  const frontendEnvPath = path.join(__dirname, '../../frontend/.env.local');
  updateEnvFile(frontendEnvPath, {
    NEXT_PUBLIC_CHAIN_ID: deploymentInfo.chainId.toString(),
    NEXT_PUBLIC_ETHEREUM_RPC_URL: deploymentInfo.rpcUrl,
    NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS: contracts.PredictionMarket,
    NEXT_PUBLIC_MOCK_USDC_ADDRESS: contracts.MockUSDC
  });

  console.log("✅ Environment files updated");
}

function updateEnvFile(filePath, vars) {
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  }

  Object.entries(vars).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(filePath, content.trim() + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
