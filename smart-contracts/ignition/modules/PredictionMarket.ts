import { buildModule } from "@nomicfoundation/hardhat-ignition-mocha-ethers";

const PredictionMarketModule = buildModule("PredictionMarketModule", (m) => {
  // Deploy MockUSDC first
  const mockUSDC = m.contract("MockUSDC");
  
  // Deploy PredictionMarket with MockUSDC address
  const predictionMarket = m.contract("PredictionMarket", [mockUSDC]);

  return { mockUSDC, predictionMarket };
});

export default PredictionMarketModule;
