// Test real blockchain market data loading
const { ethers } = require('ethers');

async function testBlockchainMarkets() {
  console.log('🔗 Testing Blockchain Market Data Loading');
  
  try {
    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g');
    
    // Contract address and ABI
    const predictionMarketAddress = '0x0825840aA80d49100218E8B655F126D26bD24e1D';
    
    const getMarketABI = [
      'function marketCounter() view returns (uint256)',
      'function getMarket(uint256 _marketId) view returns (uint256 id, string question, string category, string description, uint256 endTime, uint256 resolutionTime, address creator, bool isResolved, uint256 winningOutcome, uint256 totalVolume, uint256 outcomeCount)'
    ];
    
    const predictionMarket = new ethers.Contract(predictionMarketAddress, getMarketABI, provider);
    
    // Get market count
    console.log('📊 Getting market count...');
    const marketCount = await predictionMarket.marketCounter();
    console.log(`Market Count: ${marketCount.toString()}`);
    
    if (Number(marketCount) === 0) {
      console.log('❌ No markets found on blockchain');
      return;
    }
    
    // Get all markets
    const markets = [];
    for (let i = 1; i <= Number(marketCount); i++) {
      try {
        console.log(`📋 Getting market ${i}...`);
        const market = await predictionMarket.getMarket(i);
        
        const marketData = {
          id: Number(market[0]),
          question: market[1],
          category: market[2], 
          description: market[3],
          endTime: Number(market[4]),
          resolutionTime: Number(market[5]),
          creator: market[6],
          isResolved: market[7],
          winningOutcome: Number(market[8]),
          totalVolume: market[9],
          outcomeCount: Number(market[10])
        };
        
        markets.push(marketData);
        console.log(`✅ Market ${i}:`, {
          question: marketData.question,
          category: marketData.category,
          endTime: new Date(marketData.endTime * 1000).toLocaleDateString(),
          totalVolume: ethers.formatEther(marketData.totalVolume) + ' USDC',
          isResolved: marketData.isResolved
        });
        
      } catch (error) {
        console.error(`❌ Failed to get market ${i}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully loaded ${markets.length} markets from blockchain!`);
    
    if (markets.length > 0) {
      console.log('\n📋 Summary:');
      markets.forEach(market => {
        console.log(`- ${market.question} (${market.category})`);
      });
    }
    
    return markets;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return [];
  }
}

testBlockchainMarkets();
