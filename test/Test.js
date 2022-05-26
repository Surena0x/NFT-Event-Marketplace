const { expect } = require("chai");
const { ethers } = require("hardhat");

// eslint-disable-next-line no-undef
describe("NFT", () => {
  // eslint-disable-next-line no-undef
  it("EVENT TICKET", async () => {
    const [deployer, user1, user2, user3, user4] = await ethers.getSigners();

    /// deploy contarct

    const NFT = await ethers.getContractFactory("NFTContract");
    const NFTContract = await NFT.deploy();
    await NFTContract.deployed();

    const marketPlace = await ethers.getContractFactory("marketPlace");
    const marketPlaceContract = await marketPlace.deploy();
    await marketPlaceContract.deployed();

    // set marketplace address
    await NFTContract.setMarketPlace(marketPlaceContract.address);

    /// mint new nft
    await NFTContract.connect(deployer).mintToken("Test");

    // list nft in market
    await expect(
      marketPlaceContract
        .connect(deployer)
        .listNFTItem(NFTContract.address, 1, ethers.utils.parseEther("1"))
    )
      .to.emit(marketPlaceContract, "NFTItemListed")
      .withArgs(
        1,
        NFTContract.address,
        1,
        ethers.utils.parseEther("1"),
        deployer.address
      );

    // buy nft item 1 in market
    await expect(
      await marketPlaceContract
        .connect(user1)
        .buyNFTItem(1, { value: ethers.utils.parseEther("1") })
    )
      .to.emit(marketPlaceContract, "Bought")
      .withArgs(
        1,
        NFTContract.address,
        1,
        ethers.utils.parseEther("1"),
        deployer.address,
        user1.address
      );

    expect(await NFTContract.ownerOf(1)).equal(user1.address);

    // set NFT Contract address
    await marketPlaceContract.setNFTContractInstance(NFTContract.address);

    // create new event by admin !
    await expect(marketPlaceContract.createEvent(ethers.utils.parseEther("1")))
      .to.emit(marketPlaceContract, "EventCreated")
      .withArgs(deployer.address, 1, ethers.utils.parseEther("1"));

    // create new event by user1 !
    await expect(
      marketPlaceContract
        .connect(user1)
        .createEvent(ethers.utils.parseEther("0.1"))
    )
      .to.emit(marketPlaceContract, "EventCreated")
      .withArgs(user1.address, 2, ethers.utils.parseEther("0.1"));

    // buy ticket by user1 for event id 1
    await expect(
      marketPlaceContract.connect(user1).mintTicket(1, {
        value: ethers.utils.parseEther("1"),
      })
    )
      .to.emit(marketPlaceContract, "ticketMinted")
      .withArgs(user1.address, 1, ethers.utils.parseEther("1"));

    // buy ticket by depoyer for event id 2
    await expect(
      marketPlaceContract.mintTicket(2, {
        value: ethers.utils.parseEther("0.1"),
      })
    )
      .to.emit(marketPlaceContract, "ticketMinted")
      .withArgs(deployer.address, 2, ethers.utils.parseEther("0.1"));

    // buy ticket by user3 for event id 2
    await expect(
      marketPlaceContract.connect(user2).mintTicket(2, {
        value: ethers.utils.parseEther("0.1"),
      })
    )
      .to.emit(marketPlaceContract, "ticketMinted")
      .withArgs(user2.address, 2, ethers.utils.parseEther("0.1"));

    // buy ticket by user3 for event id 1
    await expect(
      marketPlaceContract.connect(user3).mintTicket(1, {
        value: ethers.utils.parseEther("1"),
      })
    )
      .to.emit(marketPlaceContract, "ticketMinted")
      .withArgs(user3.address, 1, ethers.utils.parseEther("1"));

    // buy ticket by user4 for event id 1
    await expect(
      marketPlaceContract.connect(user4).mintTicket(1, {
        value: ethers.utils.parseEther("1"),
      })
    )
      .to.emit(marketPlaceContract, "ticketMinted")
      .withArgs(user4.address, 1, ethers.utils.parseEther("1"));

    console.log(
      "List of accounts that bought ticket for event id 1 :",
      (await marketPlaceContract.eventWhiteList(1)).toString()
    );

    console.log(
      "List of accounts that bought ticket for event id 2 :",
      (await marketPlaceContract.eventWhiteList(2)).toString()
    );

    const myEventsJoined = await marketPlaceContract
      .connect(user1)
      .getMyEventsJoined();
    console.log("event that user 1 joined !", myEventsJoined.toString());

    const myEventsCreated = await marketPlaceContract.getMyEventsCreated();
    console.log("event that deployer created : ", myEventsCreated.toString());
  });
});
