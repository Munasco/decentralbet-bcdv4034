const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PredictionMarketModule", (m) => {
  // Deploy MockUSDC first
  const mockUSDC = m.contract("MockUSDC");

  // Deploy PredictionMarket with MockUSDC address
  const predictionMarket = m.contract("PredictionMarket", [mockUSDC]);

  return { mockUSDC, predictionMarket };
});
