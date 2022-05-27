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
    });

    // eslint-disable-next-line no-undef
    it("Should track newly created item, transfer NFT from seller to marketplace and emit Offered event", async () => {
      // addr1 offers their nft at a price of 1 ether
      await expect(
        MarketplaceContarct.connect(addr1).listNFTItem(
          NFTContract.address,
          1,
          toWei(price)
        )
      )
        .to.emit(MarketplaceContarct, "NFTItemListed")
        .withArgs(1, NFTContract.address, 1, toWei(price), addr1.address);
      // Owner of NFT should now be the marketplace
      expect(await NFTContract.ownerOf(1)).to.equal(
        MarketplaceContarct.address
      );
      // Item count should now equal 1
      // eslint-disable-next-line no-underscore-dangle
      expect(await MarketplaceContarct._itemTracker()).to.equal(1);
      // Get item from items mapping then check fields to ensure they are correct
      // eslint-disable-next-line no-underscore-dangle
      const item = await MarketplaceContarct._NFTItem(1);
      expect(item.itemId).to.equal(1);
      expect(item.nft).to.equal(NFTContract.address);
      expect(item.tokenId).to.equal(1);
      expect(item.price).to.equal(toWei(price));
      expect(item.sold).to.equal(false);
    });

    // eslint-disable-next-line no-undef
    it("Should fail if price is set to zero", async () => {
      await expect(
        MarketplaceContarct.connect(addr1).listNFTItem(
          NFTContract.address,
          1,
          0
        )
      ).to.be.revertedWith("Price must be greater than zero");
    });
  });

  // eslint-disable-next-line no-undef
  describe("Purchasing marketplace items", () => {
    const price = 2;
    let totalPriceInWei;
    // eslint-disable-next-line no-undef
    beforeEach(async () => {
      // addr1 mints an nft
      await NFTContract.connect(addr1).mintToken(URI);
      // addr1 makes their nft a marketplace item.
      await MarketplaceContarct.connect(addr1).listNFTItem(
        NFTContract.address,
        1,
        toWei(price)
      );
    });
    // eslint-disable-next-line no-undef
    it("Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Bought event", async () => {
      const sellerInitalEthBal = await addr1.getBalance();

      totalPriceInWei = await MarketplaceContarct.getItemTotalPrice(1);
      // addr 2 purchases item.
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
          addr1.address,
          addr2.address
        );
      const sellerFinalEthBal = await addr1.getBalance();
      // Item should be marked as sold
      // eslint-disable-next-line no-underscore-dangle
      expect((await MarketplaceContarct._NFTItem(1)).sold).to.equal(true);
      // Seller should receive payment for the price of the NFT sold.
      expect(+fromWei(sellerFinalEthBal)).to.greaterThan(
        +fromWei(sellerInitalEthBal)
      );
      console.log(
        "Market balance after get 10% fee from NFT price : ",
        (await MarketplaceContarct.getMarketBalance()).toString()
      );
      // The buyer should now own the nft
      expect(await NFTContract.ownerOf(1)).to.equal(addr2.address);
    });
    // eslint-disable-next-line no-undef
    it("Should fail for invalid item ids, sold items and when not enough ether is paid", async () => {
      // fails for invalid item ids
      await expect(
        MarketplaceContarct.connect(addr2).buyNFTItem(2, {
          value: totalPriceInWei,
        })
      ).to.be.revertedWith("Item is not existing");
      await expect(
        MarketplaceContarct.connect(addr2).buyNFTItem(0, {
          value: totalPriceInWei,
        })
      ).to.be.revertedWith("Item is not existing");
      // Fails when not enough ether is paid with the transaction.
      // In this instance, fails when buyer only sends enough ether to cover the price of the nft
      // not the additional market fee.
      await expect(
        MarketplaceContarct.connect(addr2).buyNFTItem(1, { value: toWei(1) })
      ).to.be.revertedWith("not enough money to pay");
      // addr2 purchases item 1
      await MarketplaceContarct.connect(addr2).buyNFTItem(1, {
        value: totalPriceInWei,
      });
      // addr3 tries purchasing item 1 after its been sold
      await expect(
        MarketplaceContarct.connect(addr3).buyNFTItem(1, {
          value: totalPriceInWei,
        })
      ).to.be.revertedWith("item is sold");
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
        { value: toWei(eventTicketPrice / 10) }
      );

      const item = await MarketplaceContarct.EventMapping(1);

      // eslint-disable-next-line no-underscore-dangle
      expect(await MarketplaceContarct._eventCounter()).to.equal(1);
      expect(item.creator).to.equal(addr1.address);
      expect(item.price).to.equal(toWei(eventTicketPrice));
      expect(item.maxCap).to.equal(eventMaxCap);
    });

    // eslint-disable-next-line no-undef
    it("should buy ticket for event and get whitelist for event", async () => {
      // addr1 create new event
      await MarketplaceContarct.connect(addr1).createEvent(
        toWei(eventTicketPrice),
        eventMaxCap,
        { value: toWei(eventTicketPrice / 10) }
      );

      // buy ticket addr1
      await MarketplaceContarct.connect(addr2).mintTicket(1, {
        value: toWei(eventTicketPrice),
      });

      // now user array of event 1 should has only 1 user
      expect(await MarketplaceContarct.getEventUsers(1)).to.have.length(1);

      // buy ticket addr2
      await MarketplaceContarct.connect(addr3).mintTicket(1, {
        value: toWei(eventTicketPrice),
      });

      // now user array of event 1 should has only 2 user
      expect(await MarketplaceContarct.getEventUsers(1)).to.have.length(2);
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
