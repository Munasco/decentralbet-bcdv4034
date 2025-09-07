const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  console.log('🚀 Starting Sepolia deployment...');
  
  // You'll need to provide your private key via environment variable
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Please set PRIVATE_KEY environment variable');
    console.log('📝 Usage: PRIVATE_KEY=0x... node deploy-sepolia.cjs');
    process.exit(1);
  }
  
  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
  const deployer = new ethers.Wallet(privateKey, provider);
  
  console.log('Deployer address:', deployer.address);
  
  // Check balance on Sepolia
  const balance = await provider.getBalance(deployer.address);
  console.log('Sepolia ETH balance:', ethers.formatEther(balance), 'ETH');
  
  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    console.error('❌ Insufficient Sepolia ETH balance. You need at least 0.01 ETH for deployment.');
    console.log('💡 Get Sepolia ETH from: https://sepoliafaucet.com/');
    process.exit(1);
  }
  
  // Load compiled contract artifacts
  const mockUSDCArtifact = JSON.parse(
    fs.readFileSync('./artifacts/contracts/MockUSDC.sol/MockUSDC.json', 'utf8')
  );
  
  const predictionMarketArtifact = JSON.parse(
    fs.readFileSync('./artifacts/contracts/PredictionMarket.sol/PredictionMarket.json', 'utf8')
  );
  
  // Deploy MockUSDC
  console.log('\n📄 Deploying MockUSDC to Sepolia...');
  const MockUSDCFactory = new ethers.ContractFactory(
    mockUSDCArtifact.abi,
    mockUSDCArtifact.bytecode,
    deployer
  );
  
  const mockUSDC = await MockUSDCFactory.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  
  console.log('✅ MockUSDC deployed at:', mockUSDCAddress);
  console.log('🔗 View on Etherscan:', `https://sepolia.etherscan.io/address/${mockUSDCAddress}`);
  
  // Deploy PredictionMarket
  console.log('\n📄 Deploying PredictionMarket to Sepolia...');
  const PredictionMarketFactory = new ethers.ContractFactory(
    predictionMarketArtifact.abi,
    predictionMarketArtifact.bytecode,
    deployer
  );
  
  const predictionMarket = await PredictionMarketFactory.deploy(mockUSDCAddress);
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  
  console.log('✅ PredictionMarket deployed at:', predictionMarketAddress);
  console.log('🔗 View on Etherscan:', `https://sepolia.etherscan.io/address/${predictionMarketAddress}`);
  
  console.log('\n🎉 Sepolia deployment completed!');
  console.log('\n📋 Contract Addresses:');
  console.log('MockUSDC:', mockUSDCAddress);
  console.log('PredictionMarket:', predictionMarketAddress);
  
  console.log('\n📝 Update your frontend .env.local:');
  console.log(`NEXT_PUBLIC_SEPOLIA_TOKEN=${mockUSDCAddress}`);
  console.log(`NEXT_PUBLIC_SEPOLIA_PREDICTION_MARKET=${predictionMarketAddress}`);
  
  return {
    mockUSDC: mockUSDCAddress,
    predictionMarket: predictionMarketAddress
  };
}

main()
  .then(() => {
    console.log('✨ All done! You can now use your own Sepolia ETH for testing.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
