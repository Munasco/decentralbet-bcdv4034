import { ethers } from "ethers";
import fs from "fs";

async function main() {
  console.log("🚀 Direct deployment to Hardhat node...");
  
  // Connect to local Hardhat node
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  
  // Use the first Hardhat account (with known private key)
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deployer address:", wallet.address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH");
  
  // Read compiled contracts
  const mockUSDCArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/MockUSDC.sol/MockUSDC.json", "utf8"));
  const predictionMarketArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/PredictionMarket.sol/PredictionMarket.json", "utf8"));
  
  // Deploy MockUSDC
  console.log("\n📄 Deploying MockUSDC...");
  const MockUSDCFactory = new ethers.ContractFactory(
    mockUSDCArtifact.abi,
    mockUSDCArtifact.bytecode,
    wallet
  );
  const mockUSDC = await MockUSDCFactory.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", mockUSDCAddress);
  
  // Test MockUSDC
  const name = await mockUSDC.name();
  const symbol = await mockUSDC.symbol();
  console.log(`Token: ${name} (${symbol})`);
  
  // Deploy PredictionMarket
  console.log("\n🎯 Deploying PredictionMarket...");
  
  // Get current nonce to avoid conflicts
  const currentNonce = await provider.getTransactionCount(wallet.address);
  console.log("Using nonce:", currentNonce);
  
  const PredictionMarketFactory = new ethers.ContractFactory(
    predictionMarketArtifact.abi,
    predictionMarketArtifact.bytecode,
    wallet
  );
  const predictionMarket = await PredictionMarketFactory.deploy(mockUSDCAddress, { nonce: currentNonce });
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  console.log("✅ PredictionMarket deployed to:", predictionMarketAddress);
  
  // Test PredictionMarket
  const marketCount = await predictionMarket.marketCounter();
  const bettingToken = await predictionMarket.bettingToken();
  console.log(`Market count: ${marketCount}, Betting token: ${bettingToken}`);
  
  console.log("\n🎉 Deployment Complete!");
  console.log("=====================================");
  console.log("MockUSDC:         ", mockUSDCAddress);
  console.log("PredictionMarket: ", predictionMarketAddress);
  console.log("=====================================");
  
  console.log("\n💡 Update your frontend config:");
  console.log(`MOCK_USDC: '${mockUSDCAddress}' as Address,`);
  console.log(`PREDICTION_MARKET: '${predictionMarketAddress}' as Address,`);
  
  return { mockUSDC: mockUSDCAddress, predictionMarket: predictionMarketAddress };
}

main().catch(console.error);
