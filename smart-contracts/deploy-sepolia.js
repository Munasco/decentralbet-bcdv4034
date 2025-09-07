const { ethers } = require("hardhat");
require('dotenv').config({ path: '../.env.production' });

async function main() {
  console.log("🚀 Deploying DecentralBet contracts to Sepolia testnet via Alchemy...");
  console.log("Network:", "Sepolia Testnet");
  console.log("RPC URL:", "https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Low balance! Get Sepolia ETH from: https://sepoliafaucet.com/");
    console.log("⚠️  Or use: https://www.alchemy.com/faucets/ethereum-sepolia");
  }

  console.log("\n📦 Step 1: Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", mockUSDCAddress);

  console.log("\n📦 Step 2: Deploying PredictionMarketFactory...");
  const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarketFactory");
  const factory = await PredictionMarketFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ PredictionMarketFactory deployed to:", factoryAddress);

  console.log("\n📦 Step 3: Deploying main PredictionMarket...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(
    mockUSDCAddress, // USDC token address
    deployer.address, // Oracle address (deployer for now)
    300 // 5 minute resolution time for testing
  );
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  console.log("✅ PredictionMarket deployed to:", predictionMarketAddress);

  console.log("\n📦 Step 4: Deploying ElectionFactory...");
  const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
  const electionFactory = await ElectionFactory.deploy();
  await electionFactory.waitForDeployment();
  const electionFactoryAddress = await electionFactory.getAddress();
  console.log("✅ ElectionFactory deployed to:", electionFactoryAddress);

  // Update configuration files
  console.log("\n📝 Updating configuration files...");
  
  const contractConfig = {
    network: "sepolia",
    chainId: 11155111,
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MockUSDC: mockUSDCAddress,
      PredictionMarketFactory: factoryAddress,
      PredictionMarket: predictionMarketAddress,
      ElectionFactory: electionFactoryAddress
    },
    gasUsed: {
      MockUSDC: "Estimated",
      PredictionMarketFactory: "Estimated", 
      PredictionMarket: "Estimated",
      ElectionFactory: "Estimated"
    }
  };

  // Save to deployed contracts file
  const fs = require('fs');
  const path = require('path');
  
  const deployedContractsPath = path.join(__dirname, 'deployed-contracts-sepolia.json');
  fs.writeFileSync(deployedContractsPath, JSON.stringify(contractConfig, null, 2));
  console.log("✅ Contract addresses saved to:", deployedContractsPath);

  // Update backend environment
  const backendEnvPath = path.join(__dirname, '../backend/.env');
  let envContent = '';
  if (fs.existsSync(backendEnvPath)) {
    envContent = fs.readFileSync(backendEnvPath, 'utf8');
  }
  
  // Update or add contract addresses
  const updateEnvVar = (content, key, value) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    } else {
      return content + `\n${key}=${value}`;
    }
  };

  envContent = updateEnvVar(envContent, 'ETHEREUM_NETWORK', 'sepolia');
  envContent = updateEnvVar(envContent, 'ETHEREUM_RPC_URL', 'https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g');
  envContent = updateEnvVar(envContent, 'CHAIN_ID', '11155111');
  envContent = updateEnvVar(envContent, 'VOTING_CONTRACT_ADDRESS', predictionMarketAddress);
  envContent = updateEnvVar(envContent, 'ELECTION_FACTORY_ADDRESS', electionFactoryAddress);
  envContent = updateEnvVar(envContent, 'PREDICTION_MARKET_ADDRESS', predictionMarketAddress);
  envContent = updateEnvVar(envContent, 'MOCK_USDC_ADDRESS', mockUSDCAddress);

  fs.writeFileSync(backendEnvPath, envContent);
  console.log("✅ Backend environment updated");

  // Update frontend environment
  const frontendEnvPath = path.join(__dirname, '../frontend/.env.local');
  let frontendEnvContent = '';
  if (fs.existsSync(frontendEnvPath)) {
    frontendEnvContent = fs.readFileSync(frontendEnvPath, 'utf8');
  }

  frontendEnvContent = updateEnvVar(frontendEnvContent, 'NEXT_PUBLIC_CHAIN_ID', '11155111');
  frontendEnvContent = updateEnvVar(frontendEnvContent, 'NEXT_PUBLIC_ETHEREUM_RPC_URL', 'https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g');
  frontendEnvContent = updateEnvVar(frontendEnvContent, 'NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS', predictionMarketAddress);
  frontendEnvContent = updateEnvVar(frontendEnvContent, 'NEXT_PUBLIC_ELECTION_FACTORY_ADDRESS', electionFactoryAddress);

  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log("✅ Frontend environment updated");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("==========================================");
  console.log("📋 Contract Addresses (Sepolia Testnet):");
  console.log("==========================================");
  console.log("MockUSDC:", mockUSDCAddress);
  console.log("PredictionMarketFactory:", factoryAddress);
  console.log("PredictionMarket:", predictionMarketAddress);
  console.log("ElectionFactory:", electionFactoryAddress);
  console.log("==========================================");
  console.log("🔗 View on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${predictionMarketAddress}`);
  console.log("==========================================");
  console.log("📱 MetaMask Configuration:");
  console.log("Network Name: Sepolia Testnet");
  console.log("RPC URL: https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g");
  console.log("Chain ID: 11155111");
  console.log("Currency: ETH");
  console.log("Block Explorer: https://sepolia.etherscan.io");
  console.log("==========================================");
  
  // Verify contracts on Etherscan (if API key is available)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 Verifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: predictionMarketAddress,
        constructorArguments: [mockUSDCAddress, deployer.address, 300],
      });
      console.log("✅ PredictionMarket verified on Etherscan");
    } catch (error) {
      console.log("⚠️  Verification failed (this is normal for new deployments):", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
