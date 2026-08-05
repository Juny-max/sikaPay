require("@nomicfoundation/hardhat-toolbox");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const privateKey = process.env.SEPOLIA_PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: privateKey ? [privateKey] : []
    }
  }
};
