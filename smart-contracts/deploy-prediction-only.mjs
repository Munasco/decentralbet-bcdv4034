import { ethers } from 'ethers';
import { readFileSync } from 'fs';

async function deployPredictionMarket() {
  console.log('🎯 Deploying PredictionMarket contract...');

  // Connect to local Hardhat node
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  
  // Use first account with correct nonce
  const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  
  console.log('📝 Deploying with account:', wallet.address);
  console.log('💰 Account balance:', ethers.formatEther(await wallet.provider.getBalance(wallet.address)), 'ETH');

  // Get current nonce
  const nonce = await provider.getTransactionCount(wallet.address);
  console.log('🔢 Current nonce:', nonce);

  // MockUSDC is already deployed at this address
  const usdcAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  console.log('📄 Using existing MockUSDC at:', usdcAddress);

  // Load PredictionMarket contract artifact
  const predictionMarketArtifact = JSON.parse(readFileSync('./artifacts/contracts/PredictionMarket.sol/PredictionMarket.json', 'utf8'));

  // Deploy PredictionMarket with explicit nonce
  console.log('🎯 Deploying PredictionMarket...');
  const PredictionMarketFactory = new ethers.ContractFactory(predictionMarketArtifact.abi, predictionMarketArtifact.bytecode, wallet);
  
  const predictionMarket = await PredictionMarketFactory.deploy(usdcAddress, {
    nonce: nonce
  });
  
  await predictionMarket.waitForDeployment();
  const marketAddress = await predictionMarket.getAddress();
  console.log('✅ PredictionMarket deployed to:', marketAddress);

  // Create a sample market
  console.log('🏗️ Creating sample market...');
  const endTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days from now
  const tx = await predictionMarket.createMarket(
    "Will Bitcoin reach $100K by end of 2025?",
    "Crypto", 
    "A prediction market about Bitcoin's price reaching $100,000 USD by December 31, 2025.",
    endTime,
    ["Yes", "No"],
    2 // 2% fee
  );
  await tx.wait();
  console.log('✅ Sample market created!');

  // Get market count to verify
  const marketCount = await predictionMarket.marketCounter();
  console.log('📊 Total markets:', marketCount.toString());

  // Display final summary
  console.log('\\n🎉 DEPLOYMENT COMPLETE!');
  console.log('=====================================');
  console.log('📋 Contract Addresses:');
  console.log('  MockUSDC:', usdcAddress);
  console.log('  PredictionMarket:', marketAddress);
  console.log('📋 Network: Hardhat Local (Chain ID: 31337)');
  console.log('=====================================');
  
  // Instructions for frontend
  console.log('\\n📝 Update your frontend .env.local:');
  console.log(`NEXT_PUBLIC_HARDHAT_PREDICTION_MARKET=${marketAddress}`);
  console.log(`NEXT_PUBLIC_HARDHAT_TOKEN=${usdcAddress}`);
  
  return { marketAddress, usdcAddress };
}

deployPredictionMarket()
  .then(({ marketAddress, usdcAddress }) => {
    console.log('✅ PredictionMarket deployment successful!');
    console.log('🔗 Market Address:', marketAddress);
    console.log('🪙 Token Address:', usdcAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:');
    console.error(error);
    process.exit(1);
  });
