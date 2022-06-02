// eslint-disable-next-line import/no-extraneous-dependencies
require("dotenv").config();

// eslint-disable-next-line import/no-extraneous-dependencies
require("@nomiclabs/hardhat-etherscan");
// eslint-disable-next-line import/no-extraneous-dependencies
require("@nomiclabs/hardhat-waffle");
// eslint-disable-next-line import/no-extraneous-dependencies
require("hardhat-gas-reporter");
// eslint-disable-next-line import/no-extraneous-dependencies
require("solidity-coverage");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
// eslint-disable-next-line no-undef
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  // eslint-disable-next-line no-restricted-syntax
  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  networks: {
    hardhat: {
      chain: 1337,
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    rinkeby: {
      url: "https://eth-rinkeby.alchemyapi.io/v2/95OwDP0G10kuCoIhZHr5axVyvE15Yvo_",
      accounts:
        process.env.RINKEBY_PRIVATE_KEY !== undefined
          ? [process.env.RINKEBY_PRIVATE_KEY]
          : [],
    },
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    gasPrice: 21,
    coinmarketcap: process.env.COIN_MARKET_CAP_API,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
