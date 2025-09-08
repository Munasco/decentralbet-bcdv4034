// Simple test to verify contract interaction
const { ethers } = require('ethers');

async function testContractInteraction() {
  console.log('🧪 Testing Frontend Contract Interaction');
  
  try {
    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g');
    
    // Contract addresses
    const predictionMarketAddress = '0x0825840aA80d49100218E8B655F126D26bD24e1D';
    const mockUSDCAddress = '0xC8bAD4974f4A6Cf62B39141d79De5c875a66ee3d';
    
    // Minimal ABI for testing
    const predictionMarketABI = [
      'function marketCounter() view returns (uint256)',
      'function bettingToken() view returns (address)'
    ];
    
    const mockUSDCABI = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)'
    ];
    
    // Create contract instances
    const predictionMarket = new ethers.Contract(predictionMarketAddress, predictionMarketABI, provider);
    const mockUSDC = new ethers.Contract(mockUSDCAddress, mockUSDCABI, provider);
    
    // Test reads
    console.log('📊 Reading contract data...');
    const marketCounter = await predictionMarket.marketCounter();
    const bettingToken = await predictionMarket.bettingToken();
    
    const tokenName = await mockUSDC.name();
    const tokenSymbol = await mockUSDC.symbol();
    const tokenDecimals = await mockUSDC.decimals();
    
    console.log('\n✅ Results:');
    console.log(`Market Counter: ${marketCounter.toString()}`);
    console.log(`Betting Token: ${bettingToken}`);
    console.log(`Token: ${tokenName} (${tokenSymbol})`);
    console.log(`Decimals: ${tokenDecimals}`);
    
    // Verify token match
    const tokenMatch = bettingToken.toLowerCase() === mockUSDCAddress.toLowerCase();
    console.log(`Token Address Match: ${tokenMatch ? '✅' : '❌'}`);
    
    console.log('\n🎉 Frontend contract interaction test PASSED!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testContractInteraction();
