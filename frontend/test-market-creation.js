// Test script to simulate market creation from frontend
const { ethers } = require('ethers');

async function testMarketCreation() {
  console.log('🎯 Testing Market Creation Flow');
  
  try {
    // Connect to Sepolia with wallet
    const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g');
    
    // Use the actual deployer private key from .env (for testing only!)
    const PRIVATE_KEY = '0xa91f3f8f429eee24be2c8417df6ea91c97d5bf81a54e24dd8525b3d08a87c98c';
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('👤 Wallet Address:', wallet.address);
    
    // Contract details
    const predictionMarketAddress = '0x0825840aA80d49100218E8B655F126D26bD24e1D';
    
    // ABI for createMarket function
    const createMarketABI = [
      'function createMarket(string _question, string _category, string _description, uint256 _endTime, string[] _outcomeDescriptions, uint8 _feePercentage) returns (uint256)',
      'function marketCounter() view returns (uint256)'
    ];
    
    // Create contract instance
    const predictionMarket = new ethers.Contract(predictionMarketAddress, createMarketABI, wallet);
    
    // Check current market counter
    const currentCounter = await predictionMarket.marketCounter();
    console.log(`📊 Current Market Counter: ${currentCounter.toString()}`);
    
    // Test market parameters
    const marketData = {
      question: "Will Ethereum reach $5000 by end of 2025?",
      category: "Crypto", 
      description: "This market resolves to YES if ETH reaches or exceeds $5000 USD on any major exchange by Dec 31, 2025",
      endTime: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      outcomes: ["Yes", "No"],
      feePercentage: 2
    };
    
    console.log('🎯 Creating test market...');
    console.log(`Question: ${marketData.question}`);
    console.log(`End Time: ${new Date(marketData.endTime * 1000).toLocaleString()}`);
    
    // Create the market
    const tx = await predictionMarket.createMarket(
      marketData.question,
      marketData.category,
      marketData.description,
      marketData.endTime,
      marketData.outcomes,
      marketData.feePercentage,
      {
        gasLimit: 500000 // Set reasonable gas limit
      }
    );
    
    console.log(`📝 Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check new market counter
    const newCounter = await predictionMarket.marketCounter();
    console.log(`📊 New Market Counter: ${newCounter.toString()}`);
    
    const marketsCreated = Number(newCounter) - Number(currentCounter);
    console.log(`🎉 Markets created: ${marketsCreated}`);
    
    if (marketsCreated > 0) {
      console.log('\n🎉 Market Creation Test PASSED!');
      console.log(`Market ID: ${newCounter.toString()}`);
      console.log(`Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
    } else {
      console.log('❌ No new markets were created');
    }
    
  } catch (error) {
    console.error('❌ Market creation failed:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

testMarketCreation();
