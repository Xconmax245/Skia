require("dotenv").config({ path: "../.env" });
require("@nomicfoundation/hardhat-ethers");
// require("@nomicfoundation/hardhat-chai-matchers");
require("@iexec-nox/nox-hardhat-plugin");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      type: "http",
      url: process.env.RPC_URL || "https://11155111.rpc.thirdweb.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
};
