const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Starting contract deployment...');
  
  // Connect to Hardhat local node
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  
  // Use first Hardhat account
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const deployer = new ethers.Wallet(privateKey, provider);
  
  console.log('Deployer address:', deployer.address);
  
  const balance = await provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  
  // Load compiled contract artifacts
  const mockUSDCArtifact = JSON.parse(
    fs.readFileSync('./artifacts/contracts/MockUSDC.sol/MockUSDC.json', 'utf8')
  );
  
  const predictionMarketArtifact = JSON.parse(
    fs.readFileSync('./artifacts/contracts/PredictionMarket.sol/PredictionMarket.json', 'utf8')
  );
  
  // Deploy MockUSDC
  console.log('\n📄 Deploying MockUSDC...');
  const MockUSDCFactory = new ethers.ContractFactory(
    mockUSDCArtifact.abi,
    mockUSDCArtifact.bytecode,
    deployer
  );
  
  const mockUSDC = await MockUSDCFactory.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  
  console.log('✅ MockUSDC deployed at:', mockUSDCAddress);
  
  // Deploy PredictionMarket
  console.log('\n📄 Deploying PredictionMarket...');
  
  // Get current nonce to ensure proper ordering
  const currentNonce = await provider.getTransactionCount(deployer.address);
  console.log('Current nonce:', currentNonce);
  
  const PredictionMarketFactory = new ethers.ContractFactory(
    predictionMarketArtifact.abi,
    predictionMarketArtifact.bytecode,
    deployer
  );
  
  const predictionMarket = await PredictionMarketFactory.deploy(mockUSDCAddress, {
    nonce: currentNonce
  });
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  
  console.log('✅ PredictionMarket deployed at:', predictionMarketAddress);
  
  // Create a sample market
  console.log('\n📄 Creating sample market...');
  const endTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now
  const outcomeDescriptions = ['Yes', 'No'];
  
  try {
    const createMarketTx = await predictionMarket.createMarket(
      'Will Bitcoin reach $100K by end of 2025?',
      'Crypto',
      'A prediction market about Bitcoin price reaching $100,000 USD',
      endTime,
      outcomeDescriptions,
      5 // 5% fee
    );
    
    await createMarketTx.wait();
    console.log('✅ Sample market created');
  } catch (error) {
    console.log('⚠️ Sample market creation failed:', error.message);
  }
  
  console.log('\n🎉 Deployment completed!');
  console.log('\n📋 Contract Addresses:');
  console.log('MockUSDC:', mockUSDCAddress);
  console.log('PredictionMarket:', predictionMarketAddress);
  
  console.log('\n📝 Update your frontend .env.local:');
  console.log(`NEXT_PUBLIC_HARDHAT_TOKEN=${mockUSDCAddress}`);
  console.log(`NEXT_PUBLIC_HARDHAT_PREDICTION_MARKET=${predictionMarketAddress}`);
  
  return {
    mockUSDC: mockUSDCAddress,
    predictionMarket: predictionMarketAddress
  };
}

main()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
