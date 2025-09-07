import { ethers } from "ethers";
import fs from "fs";

async function testContracts() {
  console.log("🧪 Testing deployed contracts...");
  
  // Connect to local Hardhat node
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  
  // Use the first Hardhat account
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Tester address:", wallet.address);
  
  // Load contracts
  const mockUSDCArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/MockUSDC.sol/MockUSDC.json", "utf8"));
  const predictionMarketArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/PredictionMarket.sol/PredictionMarket.json", "utf8"));
  
  // Contract addresses
  const mockUSDCAddress = "0xc5a5C42992dECbae36851359345FE25997F5C42d";
  const predictionMarketAddress = "0x67d269191c92Caf3cD7723F116c85e6E9bf55933";
  
  // Create contract instances
  const mockUSDC = new ethers.Contract(mockUSDCAddress, mockUSDCArtifact.abi, wallet);
  const predictionMarket = new ethers.Contract(predictionMarketAddress, predictionMarketArtifact.abi, wallet);
  
  try {
    // Test MockUSDC
    console.log("\n📄 Testing MockUSDC...");
    const decimals = await mockUSDC.decimals();
    const name = await mockUSDC.name();
    const symbol = await mockUSDC.symbol();
    console.log(`${name} (${symbol}) with ${decimals} decimals`);
    
    const balance = await mockUSDC.balanceOf(wallet.address);
    console.log("Balance:", ethers.formatUnits(balance, decimals), symbol);
    
    // Test PredictionMarket
    console.log("\n🎯 Testing PredictionMarket...");
    const isPaused = await predictionMarket.paused();
    console.log("Is paused:", isPaused);
    
    const marketCounter = await predictionMarket.marketCounter();
    console.log("Market counter:", marketCounter.toString());
    
    const bettingToken = await predictionMarket.bettingToken();
    console.log("Betting token:", bettingToken);
    
    // Test faucet functionality
    console.log("\n💰 Testing faucet...");
    const faucetAmount = ethers.parseUnits("100", decimals); // 100 USDC
    const faucetTx = await mockUSDC.faucet(faucetAmount);
    await faucetTx.wait();
    
    const newBalance = await mockUSDC.balanceOf(wallet.address);
    console.log("New balance after faucet:", ethers.formatUnits(newBalance, decimals), symbol);
    
    // Test creating a market
    console.log("\n📊 Testing market creation...");
    const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const outcomeDescriptions = ["Yes", "No"];
    const feePercentage = 2; // 2%
    
    const createMarketTx = await predictionMarket.createMarket(
      "Will it rain tomorrow?",
      "Weather",
      "A simple weather prediction market",
      endTime,
      outcomeDescriptions,
      feePercentage
    );
    const createMarketReceipt = await createMarketTx.wait();
    console.log("Market created, tx hash:", createMarketReceipt.hash);
    
    const newMarketCounter = await predictionMarket.marketCounter();
    console.log("New market counter:", newMarketCounter.toString());
    
    // Get market details
    if (newMarketCounter > 0n) {
      const marketDetails = await predictionMarket.getMarket(1);
      console.log("Market 1 details:", {
        id: marketDetails[0].toString(),
        question: marketDetails[1],
        category: marketDetails[2],
        description: marketDetails[3],
        endTime: new Date(Number(marketDetails[4]) * 1000).toISOString(),
        creator: marketDetails[6]
      });
    }
    
    console.log("\n✅ All tests passed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

testContracts().catch(console.error);
