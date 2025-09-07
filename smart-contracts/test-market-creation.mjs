import { ethers } from "ethers";
import fs from "fs";

async function testMarketCreation() {
  console.log("🧪 Testing market creation specifically...");
  
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);
  
  const predictionMarketArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/PredictionMarket.sol/PredictionMarket.json", "utf8"));
  const predictionMarket = new ethers.Contract("0x67d269191c92Caf3cD7723F116c85e6E9bf55933", predictionMarketArtifact.abi, wallet);
  
  try {
    // Check constants
    const MIN_MARKET_DURATION = 3600; // 1 hour in seconds
    const MAX_MARKET_DURATION = 365 * 24 * 3600; // 1 year in seconds
    
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = currentTime + MIN_MARKET_DURATION + 100; // Add some buffer
    
    console.log("Current time:", new Date(currentTime * 1000).toISOString());
    console.log("End time:", new Date(endTime * 1000).toISOString());
    console.log("Duration (hours):", (endTime - currentTime) / 3600);
    
    // Check if contract is paused
    const isPaused = await predictionMarket.paused();
    console.log("Contract paused:", isPaused);
    
    // Try with very simple data first
    const question = "Test?";
    const category = "Test";
    const description = "Test market";
    const outcomeDescriptions = ["Yes", "No"];
    const feePercentage = 2;
    
    console.log("Attempting to create market with:");
    console.log("- Question:", question);
    console.log("- Category:", category);
    console.log("- Description:", description);
    console.log("- End time:", endTime);
    console.log("- Outcomes:", outcomeDescriptions);
    console.log("- Fee:", feePercentage, "%");
    
    // Try to estimate gas first
    const gasEstimate = await predictionMarket.createMarket.estimateGas(
      question,
      category,
      description,
      endTime,
      outcomeDescriptions,
      feePercentage
    );
    
    console.log("Gas estimate:", gasEstimate.toString());
    
    const createMarketTx = await predictionMarket.createMarket(
      question,
      category,
      description,
      endTime,
      outcomeDescriptions,
      feePercentage,
      { gasLimit: gasEstimate * 120n / 100n } // 20% buffer
    );
    
    console.log("Transaction sent:", createMarketTx.hash);
    const receipt = await createMarketTx.wait();
    console.log("✅ Market created successfully!");
    
    const newMarketCounter = await predictionMarket.marketCounter();
    console.log("New market counter:", newMarketCounter.toString());
    
  } catch (error) {
    console.error("❌ Failed:", error);
    
    // Try to get more specific error info
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    // Try to decode the revert reason
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
    
    // Check if it's a time-related issue by trying different end times
    console.log("\n🔍 Testing different end times...");
    
    const testTimes = [
      currentTime + 3600,  // 1 hour
      currentTime + 7200,  // 2 hours
      currentTime + 86400, // 1 day
    ];
    
    for (const testTime of testTimes) {
      try {
        console.log(`Testing with end time: ${new Date(testTime * 1000).toISOString()}`);
        await predictionMarket.createMarket.staticCall(
          "Test?",
          "Test",
          "Test",
          testTime,
          ["Yes", "No"],
          2
        );
        console.log("✅ This time works!");
        break;
      } catch (testError) {
        console.log("❌ This time fails:", testError.message);
      }
    }
  }
}

testMarketCreation().catch(console.error);
