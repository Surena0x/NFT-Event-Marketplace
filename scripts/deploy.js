// eslint-disable-next-line import/no-extraneous-dependencies
const hre = require("hardhat");

async function main() {
  const NFT = await hre.ethers.getContractFactory("NFTContract");
  const NFTContract = await NFT.deploy();
  await NFTContract.deployed();
  console.log("NFTContract deployed to:", NFTContract.address);

  const marketPlace = await hre.ethers.getContractFactory("marketPlace");
  const marketPlaceContract = await marketPlace.deploy();
  await marketPlaceContract.deployed();
  console.log("marketPlaceContract deployed to:", marketPlaceContract.address);

  // set marketplace address
  await NFTContract.setMarketPlace(marketPlaceContract.address);

  // set NFTContract address
  await marketPlaceContract.setNFTContractInstance(NFTContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
