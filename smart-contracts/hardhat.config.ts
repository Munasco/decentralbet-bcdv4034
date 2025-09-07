import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gas: 6000000,
      gasPrice: 20000000000, // 20 gwei
    },
    polygon: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
      gas: 6000000,
      gasPrice: 20000000000,
    }
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
