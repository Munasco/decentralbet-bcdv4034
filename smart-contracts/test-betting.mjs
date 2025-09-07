import { ethers } from "ethers";
import fs from "fs";

async function testBetting() {
  console.log("🎰 Testing betting functionality...");
  
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Load contracts
  const mockUSDCArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/MockUSDC.sol/MockUSDC.json", "utf8"));
  const predictionMarketArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/PredictionMarket.sol/PredictionMarket.json", "utf8"));
  
  const mockUSDC = new ethers.Contract("0xc5a5C42992dECbae36851359345FE25997F5C42d", mockUSDCArtifact.abi, wallet);
  const predictionMarket = new ethers.Contract("0x67d269191c92Caf3cD7723F116c85e6E9bf55933", predictionMarketArtifact.abi, wallet);
  
  try {
    // Check current state
    console.log("📊 Current state:");
    const balance = await mockUSDC.balanceOf(wallet.address);
    const marketCounter = await predictionMarket.marketCounter();
    console.log("USDC Balance:", ethers.formatUnits(balance, 18), "USDC");
    console.log("Market count:", marketCounter.toString());
    
    // If no markets exist, create one
    if (marketCounter === 0n) {
      console.log("\n📝 Creating a test market...");
      const currentTime = Math.floor(Date.now() / 1000);
      const endTime = currentTime + 7200; // 2 hours
      
      const createTx = await predictionMarket.createMarket(
        "Will the price of ETH go up?",
        "Crypto",
        "ETH price prediction",
        endTime,
        ["Up", "Down"],
        2
      );
      await createTx.wait();
      console.log("✅ Market created!");
    }
    
    // Get market details
    const marketDetails = await predictionMarket.getMarket(1);
    console.log("\n📈 Market 1 details:");
    console.log("- Question:", marketDetails[1]);
    console.log("- End time:", new Date(Number(marketDetails[4]) * 1000).toISOString());
    console.log("- Is resolved:", marketDetails[7]);
    
    // Test different bet amounts
    const testAmounts = [
      "0.01",   // Minimum bet (should work with 18 decimals)
      "1",      // 1 USDC
      "10",     // 10 USDC
    ];
    
    for (const amountStr of testAmounts) {
      console.log(`\n💰 Testing bet of ${amountStr} USDC...`);
      
      const betAmount = ethers.parseUnits(amountStr, 18);
      console.log("Bet amount (wei):", betAmount.toString());
      
      // First, approve the PredictionMarket to spend USDC
      console.log("🔑 Approving USDC spending...");
      const approveTx = await mockUSDC.approve(await predictionMarket.getAddress(), betAmount);
      await approveTx.wait();
      console.log("✅ Approved");
      
      // Check allowance
      const allowance = await mockUSDC.allowance(wallet.address, await predictionMarket.getAddress());
      console.log("Allowance:", ethers.formatUnits(allowance, 18), "USDC");
      
      // Place bet on outcome 1 (first outcome)
      try {
        console.log("🎲 Placing bet...");
        const betTx = await predictionMarket.placeBet(1, 1, betAmount);
        const receipt = await betTx.wait();
        console.log("✅ Bet placed successfully! TX:", receipt.hash);
        
        // Check bet events
        const betEvents = receipt.logs.filter(log => {
          try {
            const parsed = predictionMarket.interface.parseLog(log);
            return parsed.name === 'BetPlaced';
          } catch {
            return false;
          }
        });
        
        if (betEvents.length > 0) {
          const event = predictionMarket.interface.parseLog(betEvents[0]);
          console.log("📊 Bet details:");
          console.log("- Market ID:", event.args.marketId.toString());
          console.log("- Outcome ID:", event.args.outcomeId.toString());
          console.log("- Bettor:", event.args.bettor);
          console.log("- Amount:", ethers.formatUnits(event.args.amount, 18), "USDC");
          console.log("- Shares:", event.args.shares.toString());
        }
        
        // Check updated balance
        const newBalance = await mockUSDC.balanceOf(wallet.address);
        console.log("New balance:", ethers.formatUnits(newBalance, 18), "USDC");
        
        // Check user position
        const position = await predictionMarket.getUserPosition(wallet.address, 1, 1);
        console.log("User position - Shares:", position[0].toString(), "Backed:", ethers.formatUnits(position[1], 18), "USDC");
        
        break; // Only test one successful bet
        
      } catch (error) {
        console.error("❌ Bet failed:", error.message);
        if (error.data) {
          console.error("Error data:", error.data);
        }
      }
    }
    
    console.log("\n🎉 Betting tests completed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testBetting().catch(console.error);
