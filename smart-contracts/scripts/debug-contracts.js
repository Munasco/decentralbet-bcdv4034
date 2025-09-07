import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const MOCK_USDC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const PREDICTION_MARKET_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // Get contracts
  const mockUSDC = await ethers.getContractAt("MockUSDC", MOCK_USDC_ADDRESS);
  const predictionMarket = await ethers.getContractAt("PredictionMarket", PREDICTION_MARKET_ADDRESS);

  // Check USDC details
  console.log("=== MockUSDC Details ===");
  const name = await mockUSDC.name();
  const symbol = await mockUSDC.symbol();
  const decimals = await mockUSDC.decimals();
  const totalSupply = await mockUSDC.totalSupply();
  
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);

  // Check user balance (first hardhat account)
  const [deployer] = await ethers.getSigners();
  const balance = await mockUSDC.balanceOf(deployer.address);
  console.log(`Deployer Balance: ${ethers.formatUnits(balance, decimals)} USDC`);

  // Check prediction market details
  console.log("\n=== PredictionMarket Details ===");
  const marketCount = await predictionMarket.marketCounter();
  console.log(`Market Count: ${marketCount}`);

  // List all markets
  if (marketCount > 0) {
    for (let i = 1; i <= marketCount; i++) {
      try {
        const market = await predictionMarket.getMarket(i);
        console.log(`\nMarket ${i}:`);
        console.log(`  Question: ${market.question}`);
        console.log(`  Category: ${market.category}`);
        console.log(`  Creator: ${market.creator}`);
        console.log(`  End Time: ${new Date(Number(market.endTime) * 1000).toISOString()}`);
        console.log(`  Total Volume: ${ethers.formatUnits(market.totalVolume, decimals)} USDC`);
        console.log(`  Outcome Count: ${market.outcomeCount}`);
      } catch (error) {
        console.log(`  Error fetching market ${i}: ${error.message}`);
      }
    }
  } else {
    console.log("No markets found. Create some markets first!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
