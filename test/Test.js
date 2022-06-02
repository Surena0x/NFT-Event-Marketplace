const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (num) => ethers.utils.parseEther(num.toString());
const fromWei = (num) => ethers.utils.formatEther(num);

// eslint-disable-next-line no-undef
describe("NFTMarketplace", () => {
  let NFTContract;
  let MarketplaceContarct;
  let deployer;
  let addr1;
  let addr2;
  let addr3;
  const URI = "sample URI";

  // eslint-disable-next-line no-undef
  beforeEach(async () => {
    [deployer, addr1, addr2, addr3] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFTContract");
    NFTContract = await NFT.deploy();
    await NFTContract.deployed();

    const marketPlace = await ethers.getContractFactory("marketPlace");
    MarketplaceContarct = await marketPlace.deploy();
    await MarketplaceContarct.deployed();

    // set marketplace address
    await NFTContract.setMarketPlace(MarketplaceContarct.address);

    // set NFTContract address
    await MarketplaceContarct.setNFTContractInstance(NFTContract.address);
  });

  // eslint-disable-next-line no-undef
  describe("Deployment", () => {
    // eslint-disable-next-line no-undef
    it("Should track name and symbol of the nft collection", async () => {
      // This test expects the owner variable stored in the contract to be equal
      // to our Signer's owner.
      const nftName = "DAPP";
      const nftSymbol = "DAPP";
      expect(await NFTContract.name()).to.equal(nftName);
      expect(await NFTContract.symbol()).to.equal(nftSymbol);
    });
  });

  // eslint-disable-next-line no-undef
  describe("Minting NFTs", () => {
    // eslint-disable-next-line no-undef
    it("Should track each minted NFT", async () => {
      // addr1 mints an nft
      await NFTContract.connect(addr1).mintToken("sample URI");
      expect(await NFTContract.NFTItemTracker()).to.equal(1);
      expect(await NFTContract.balanceOf(addr1.address)).to.equal(1);
      expect(await NFTContract.tokenURI(1)).to.equal(URI);
      // addr2 mints an nft
      await NFTContract.connect(addr2).mintToken("sample URI");
      expect(await NFTContract.NFTItemTracker()).to.equal(2);
      expect(await NFTContract.balanceOf(addr2.address)).to.equal(1);
      expect(await NFTContract.tokenURI(2)).to.equal(URI);
    });
  });

  // eslint-disable-next-line no-undef
  describe("Making marketplace items", () => {
    const price = 1;
    let result;
    // eslint-disable-next-line no-undef
    beforeEach(async () => {
      // addr1 mints an nft
      await NFTContract.connect(addr1).mintToken(URI);
      await NFTContract.connect(addr2).mintToken(URI);
    });

    // eslint-disable-next-line no-undef
    it("Should track newly created item, transfer NFT from seller to marketplace and emit Offered event", async () => {
      // addr1 list his NFT in market
      await expect(
        MarketplaceContarct.connect(addr1).listNFTItem(
          NFTContract.address,
          1,
          toWei(price)
        )
      )
        .to.emit(MarketplaceContarct, "NFTItemListed")
        .withArgs(1, NFTContract.address, 1, toWei(price), addr1.address);

      // addr2 list his NFT in market
      await expect(
        MarketplaceContarct.connect(addr2).listNFTItem(
          NFTContract.address,
          2,
          toWei(price)
        )
      )
        .to.emit(MarketplaceContarct, "NFTItemListed")
        .withArgs(2, NFTContract.address, 2, toWei(price), addr2.address);
      // Owner of NFT should now be the marketplace
      expect(await NFTContract.ownerOf(1)).to.equal(
        MarketplaceContarct.address
      );

      expect(await NFTContract.ownerOf(2)).to.equal(
        MarketplaceContarct.address
      );
      // Item count in marketplace should now equal 2 because we listed 2 NFT
      // eslint-disable-next-line no-underscore-dangle
      expect(await MarketplaceContarct._itemTracker()).to.equal(2);
      // now check somethings from NFT item 1
      // eslint-disable-next-line no-underscore-dangle
      const item = await MarketplaceContarct._NFTItem(1);
      expect(item.itemId).to.equal(1);
      expect(item.nft).to.equal(NFTContract.address);
      expect(item.tokenId).to.equal(1);
      expect(item.price).to.equal(toWei(price));
      expect(item.sold).to.equal(false);
      expect(item.seller).to.equal(addr1.address);
    });

    // eslint-disable-next-line no-undef
    it("Should fail", async () => {
      // problem with price
      await expect(
        MarketplaceContarct.connect(addr1).listNFTItem(
          NFTContract.address,
          1,
          0
        )
      ).to.be.revertedWith("Price must be greater than zero");

      // problem with owner of NFT
      await expect(
        MarketplaceContarct.connect(addr2).listNFTItem(
          NFTContract.address,
          1,
          toWei(price)
        )
      ).to.be.revertedWith("You are not owner of this NFT");
    });
  });

  // eslint-disable-next-line no-undef
  describe("Purchasing marketplace items", () => {
    const price = 2;
    let totalPriceInWei;
    // eslint-disable-next-line no-undef
    beforeEach(async () => {
      // addr1 mints 2 nfts
      await NFTContract.connect(addr1).mintToken(URI);
      await NFTContract.connect(addr1).mintToken(URI);
      // addr1 makes their nft a marketplace item.
      await MarketplaceContarct.connect(addr1).listNFTItem(
        NFTContract.address,
        1,
        toWei(price)
      );
      await MarketplaceContarct.connect(addr1).listNFTItem(
        NFTContract.address,
        2,
        toWei(price)
      );
    });
    // eslint-disable-next-line no-undef
    it("Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Bought event", async () => {
      // 2 NFT tokens should listed !
      expect(await MarketplaceContarct.getTotalItemsListed()).to.equal(2);

      // get seller info before make any sell
      let sellerBalanceBeforeMakeSell = await addr1.getBalance();
      totalPriceInWei = await MarketplaceContarct.getItemTotalPrice(1);
      // addr 2 purchases NFT 1.
      await expect(
        MarketplaceContarct.connect(addr2).buyNFTItem(1, {
          value: totalPriceInWei,
        })
      )
        .to.emit(MarketplaceContarct, "Bought")
        .withArgs(
          1,
          NFTContract.address,
          1,
          toWei(price),
          "0x0000000000000000000000000000000000000000",
          addr2.address
        );

      let sellerBalanceAfterMakeSell = await addr1.getBalance();
      expect(sellerBalanceAfterMakeSell).to.be.above(
        sellerBalanceBeforeMakeSell
      );
      // Item should be marked as sold
      // eslint-disable-next-line no-underscore-dangle
      expect((await MarketplaceContarct._NFTItem(1)).sold).to.equal(true);
      // sold item counter in marketplace should be 1 now
      // eslint-disable-next-line no-underscore-dangle
      expect(await MarketplaceContarct.getSoldCounter()).to.equal(1);
      // The buyer should now own the nft
      expect(await NFTContract.ownerOf(1)).to.equal(addr2.address);

      // make another sell
      sellerBalanceBeforeMakeSell = await addr1.getBalance();

      await expect(
        MarketplaceContarct.connect(addr2).buyNFTItem(2, {
          value: totalPriceInWei,
        })
      )
        .to.emit(MarketplaceContarct, "Bought")
        .withArgs(
          2,
          NFTContract.address,
          2,
          toWei(price),
          "0x0000000000000000000000000000000000000000",
          addr2.address
        );
      sellerBalanceAfterMakeSell = await addr1.getBalance();
      expect(sellerBalanceAfterMakeSell).to.be.above(
        sellerBalanceBeforeMakeSell
      );
    });
    // eslint-disable-next-line no-undef
    it("Should fail for invalid item ids, sold items and when not enough ether is paid", async () => {
      // fails for invalid item ids / we listed 2 items but client want to buy item #3 and #0
      await expect(
        MarketplaceContarct.connect(addr2).buyNFTItem(3, {
          value: totalPriceInWei,
        })
      ).to.be.revertedWith("Item is not existing");

      await expect(
        MarketplaceContarct.connect(addr2).buyNFTItem(0, {
          value: totalPriceInWei,
        })
      ).to.be.revertedWith("Item is not existing");
      // Fails when not enough ether is paid with the transaction. price is 2 eth but client is paying 1 eth
      await expect(
        MarketplaceContarct.connect(addr2).buyNFTItem(1, { value: toWei(1) })
      ).to.be.revertedWith("not enough money to pay");

      // addr2 purchases item 1
      await MarketplaceContarct.connect(addr2).buyNFTItem(1, {
        value: totalPriceInWei,
      });
      // // addr3 tries purchasing item 1 after its been sold
      await expect(
        MarketplaceContarct.connect(addr3).buyNFTItem(1, {
          value: totalPriceInWei,
        })
      ).to.be.revertedWith("Item is not for sell !");
    });
  });

  // eslint-disable-next-line no-undef
  describe("Create Event / buy ticket", () => {
    const eventTicketPrice = 1;
    const eventMaxCap = 30;
    // eslint-disable-next-line no-undef
    it("should create new event and increase _eventCounter", async () => {
      // addr1 create new event
      await MarketplaceContarct.connect(addr1).createEvent(
        toWei(eventTicketPrice),
        eventMaxCap,
        1,
        { value: toWei(eventTicketPrice / 10) }
      );

      // get event #1 and check details
      const item = await MarketplaceContarct.getEventItem(1);

      // eslint-disable-next-line no-underscore-dangle
      expect(await MarketplaceContarct._eventCounter()).to.equal(1);
      expect(item[0]).to.equal(addr1.address);
      expect(item[1]).to.equal(toWei(eventTicketPrice));
      expect(item[2]).to.equal(1);
      expect(item[3].length).to.equal(0);
      expect(item[4]).to.equal(eventMaxCap);

      // get events that add1 created and check details
      const eventsIcreatedArray = await MarketplaceContarct.connect(
        addr1
      ).getMyEventsCreated();

      expect(eventsIcreatedArray[0][0]).to.equal(addr1.address);
      expect(eventsIcreatedArray[0][1]).to.equal(toWei(eventTicketPrice));
      expect(eventsIcreatedArray[0][2]).to.equal(1);
    });

    // eslint-disable-next-line no-undef
    it("should buy ticket for event and get whitelist for event", async () => {
      // addr1 create new event
      await MarketplaceContarct.connect(addr1).createEvent(
        toWei(eventTicketPrice),
        eventMaxCap,
        1,
        { value: toWei(eventTicketPrice / 10) }
      );

      // buy ticket for event #1
      await MarketplaceContarct.connect(addr2).mintTicket(1, {
        value: toWei(eventTicketPrice),
      });

      // get event #1 and check details
      const item = await MarketplaceContarct.getEventItem(1);
      expect(item[3].length).to.equal(1);
      expect(item[3][0]).to.equal(addr2.address);

      const eventsIjoinedArray = await MarketplaceContarct.connect(
        addr2
      ).getMyEventsJoined();

      // add2 joined event #1
      expect(eventsIjoinedArray[0][2]).to.equal(1);
      expect(eventsIjoinedArray[0][3]).to.contain(addr2.address);
    });

    // eslint-disable-next-line no-undef
    it("should revert ! in some cases", async () => {
      // revert because event with id 1 is not exist
      await expect(
        MarketplaceContarct.connect(addr1).mintTicket(1)
      ).to.be.revertedWith("Event is not exist");

      // addr1 create new event with max cap 0 !
      await MarketplaceContarct.connect(addr1).createEvent(
        toWei(eventTicketPrice),
        0,
        1,
        { value: toWei(eventTicketPrice / 10) }
      );

      // revert because we pay low money to buy ticket
      await expect(
        MarketplaceContarct.connect(addr2).mintTicket(1, {
          value: toWei(0.1),
        })
      ).to.be.revertedWith("Not enough money to pay ticket price");

      // revert because cap is full !
      await expect(
        MarketplaceContarct.connect(addr2).mintTicket(1, {
          value: toWei(eventTicketPrice),
        })
      ).to.be.revertedWith("event cap is full");
    });
  });
});
