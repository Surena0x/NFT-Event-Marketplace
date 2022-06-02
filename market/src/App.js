import "./App.css";
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

// you can use event is active option from event item to show Event is running or no !

import { NFTStorage } from "nft.storage";
const API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDlENjE2Yjg4MTA4YTU5ODRDNTYyYjQwZjMyNjU5NDg1RjE5RDE4QjciLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY1MzMwMTkxMzMyNCwibmFtZSI6Ik5GVERhcHAifQ.TiwR9I7TSu9W71dHPc9KKgnAxM2f-sXr5MBRbyhLHkA";

const imagePath =
  "https://lh3.googleusercontent.com/IpC1MA57v9LzjGIkRUdM2mTQy0bCJOS5CQ32qHsJ6e6ypUylgZCMJl0HW1UR-gJkgmC9ajBxkE14Rh1NO6Y3RGF-BjwqqA5TrgGJ=w362";

const eventImagePath =
  "https://s6.uupload.ir/files/fewocious-nifty-gateway_qjv5.gif";
const marketplaceABI = require("./ABI/marketPlace.json")["abi"];
const NFTABI = require("./ABI/NFTContract.json")["abi"];

const marketplaceAddress = "0xE0AA4d06eDF5181ed3eEa2f21AB45Cc394C4B673";
const NFTAddress = "0x2D7B14Cd3ddE8F49e51D9c43C8B8C0977aCE3E0c";

function App() {
  const [userAccount, setuserAccount] = useState("");

  const [listedItems, setListedItems] = useState([]);
  const [MylistedItems, setMyListedItems] = useState([]);
  const [myOwnNFTItems, setmyOwnNFTItems] = useState([]);

  const [eventItems, seteventItems] = useState([]);
  const [eventItemsUserJoined, seteventItemsUserJoined] = useState([]);
  const [eventItemsUserCreated, seteventItemsUserCreated] = useState([]);

  const [marketETHBalance, setmarketETHBalance] = useState(0);

  const [currentBlock, setcurrentBlock] = useState(0);

  useEffect(() => {
    LoadAndCreate();
  }, []);

  async function LoadAndCreate() {
    if (typeof window.ethereum !== "undefined") {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setuserAccount(accounts[0].toString());

      window.ethereum.on("chainChanged", (chainId) => {
        window.location.reload();
      });

      window.ethereum.on("accountsChanged", async function (accounts) {
        setuserAccount(accounts[0].toString());
        await LoadAndCreate();
      });

      await getBalances();
    }
  }

  async function requestAccounts() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  }

  async function getBalances() {
    await requestAccounts();
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const NFTContract = new ethers.Contract(NFTAddress, NFTABI, provider);
    const marketplaceContract = new ethers.Contract(
      marketplaceAddress,
      marketplaceABI,
      provider
    );

    // get market eth balance
    const marketETHBalance = await provider.getBalance(marketplaceAddress);
    setmarketETHBalance(ethers.utils.formatUnits(marketETHBalance, 18));

    // get currentBlock
    const currentBlock = await provider.getBlockNumber();
    setcurrentBlock(currentBlock);

    // get all nft items
    const listedItems = await marketplaceContract.getMarketItems();
    let Items = [];

    for (let i = 0; i < listedItems.length; i++) {
      const uri = await NFTContract.tokenURI(listedItems[i].tokenId);
      const totalPrice = await marketplaceContract.getItemTotalPrice(
        listedItems[i].itemId
      );
      let item = {
        totalPrice: ethers.utils.formatUnits(totalPrice, 18),
        image: uri,
        itemID: listedItems[i].itemId,
      };
      Items.push(item);
    }
    setListedItems(Items);
    Items = [];

    // // get my own NFT Items that are for sale
    const myNFTItems = await marketplaceContract
      .connect(accounts[0])
      .getMyNFTForSale();
    for (let i = 0; i < myNFTItems.length; i++) {
      const uri = await NFTContract.tokenURI(myNFTItems[i].tokenId);
      const totalPrice = await marketplaceContract.getItemTotalPrice(
        myNFTItems[i].itemId
      );
      let item = {
        totalPrice: ethers.utils.formatUnits(totalPrice, 18),
        image: uri,
        itemID: myNFTItems[i].itemId,
      };
      Items.push(item);
    }
    setMyListedItems(Items);
    Items = [];

    // get my own NFT Items
    const myOwnNFTItems = await marketplaceContract
      .connect(accounts[0])
      .getMyNFTItems();
    for (let i = 0; i < myOwnNFTItems.length; i++) {
      const uri = await NFTContract.tokenURI(myOwnNFTItems[i].tokenId);
      const totalPrice = await marketplaceContract.getItemTotalPrice(
        myOwnNFTItems[i].itemId
      );
      let item = {
        totalPrice: ethers.utils.formatUnits(totalPrice, 18),
        image: uri,
        itemID: myOwnNFTItems[i].itemId,
      };
      Items.push(item);
    }
    setmyOwnNFTItems(Items);
    Items = [];

    // get all events / you can add filter to just evenets that are active and cap is not fill !
    const eventCount = await marketplaceContract._eventCounter();
    for (let i = 1; i <= eventCount; i++) {
      let eventItem = await marketplaceContract.EventMapping(i);
      let item = {
        eventCreator: eventItem.creator,
        eventTicketPrice: eventItem.price,
        eventID: eventItem.eventID,
        eventUsers: await marketplaceContract.getEventUsers(eventItem.eventID),
        eventMaxCap: eventItem.maxCap,
        eventStartTime: eventItem.startTime,
        eventIsActive: eventItem.isActive,
        userIsJoined: await marketplaceContract
          .connect(accounts[0])
          .userIsJoined(eventItem.eventID),
      };

      if (!item.userIsJoined) {
        Items.push(item);
      }
    }
    seteventItems(Items);
    Items = [];

    // get events that user is joined !
    const eventItemsUserJoined = await marketplaceContract
      .connect(accounts[0])
      .getMyEventsJoined();
    seteventItemsUserJoined(eventItemsUserJoined);

    // get events that user is created !
    const eventItemsUserCreated = await marketplaceContract
      .connect(accounts[0])
      .getMyEventsCreated();
    seteventItemsUserCreated(eventItemsUserCreated);
  }

  const mintNewNFT = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // create contracts
    const NFTContract = new ethers.Contract(NFTAddress, NFTABI, signer);
    const marketplaceContract = new ethers.Contract(
      marketplaceAddress,
      marketplaceABI,
      signer
    );

    // upload to IPFS
    const r = await fetch(imagePath);
    const image = await r.blob();
    const nft = {
      image, // use image Blob as `image` field
      name: "Storing the World's Most Valuable Virtual Assets with NFT.Storage",
      description: "The metaverse is here. Where is it all being stored?",
    };

    const client = new NFTStorage({ token: API_KEY });
    const metadata = await client.store(nft);

    // mint new token
    console.log("wait for minting !");
    const IPFSurl =
      "https://ipfs.io/ipfs/" + metadata.data.image.href.split("//")[1];
    console.log(IPFSurl);

    const mintNFTTX = await NFTContract.mintToken(IPFSurl);
    await mintNFTTX.wait(1);

    const NFTID = await NFTContract.NFTItemTracker();
    console.log("NFT Minted with ID !", NFTID.toString());

    // list in market
    console.log("Listing in market !");
    const listNFTTX = await marketplaceContract.listNFTItem(
      NFTContract.address,
      NFTID,
      ethers.utils.parseEther("0.01")
    );

    await listNFTTX.wait(1);
    console.log("Listed in market !");

    await getBalances();
  };

  const buyNFT = async (itemID) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // create contracts
    const marketplaceContract = new ethers.Contract(
      marketplaceAddress,
      marketplaceABI,
      signer
    );

    const buyNFTItemTX = await marketplaceContract.buyNFTItem(itemID, {
      value: ethers.utils.parseEther("0.01"),
    });
    await buyNFTItemTX.wait(1);
    await getBalances();
  };

  // create event
  const createEvent = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // create contracts
    const marketplaceContract = new ethers.Contract(
      marketplaceAddress,
      marketplaceABI,
      signer
    );

    // create event by marketplace Function
    const createEventTX = await marketplaceContract.createEvent(
      ethers.utils.parseEther("0.01"),
      1,
      10797383,
      { value: ethers.utils.parseEther("0.001") }
    );
    await createEventTX.wait(1);
    await getBalances();
  };

  const buyTicketForEvent = async (eventID) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // create contracts
    const marketplaceContract = new ethers.Contract(
      marketplaceAddress,
      marketplaceABI,
      signer
    );

    // test some functions from contract / get event price / get event max cap and get event users list !
    // we can do all in one by get event item !
    const eventTicketPrice = await marketplaceContract.getEventTicketPrice(
      eventID
    );
    const eventMaxCap = await marketplaceContract.getEventMaxCap(eventID);
    const eventUsersList = await marketplaceContract.getEventUsers(eventID);

    if (eventUsersList.length < eventMaxCap) {
      const eventBuyTicketTX = await marketplaceContract.mintTicket(eventID, {
        value: eventTicketPrice,
      });
      await eventBuyTicketTX.wait(1);
    } else {
      alert("Cap is full !");
    }
    await getBalances();
  };

  return (
    <div className="App">
      <header className="App-header">
        <div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <button
              style={{
                width: "200px",
                height: "50px",
                backgroundColor: "#2196F3",
                borderColor: "#2196F3",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "20px",
                fontWeight: 100,
                marginTop: "10px",
                marginRight: "10px",
              }}
              onClick={() => mintNewNFT()}
            >
              Mint NFT Item
            </button>
            <button
              style={{
                width: "200px",
                height: "50px",
                backgroundColor: "#2196F3",
                borderColor: "#2196F3",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "20px",
                fontWeight: 100,
                marginTop: "10px",
              }}
              onClick={() => createEvent()}
            >
              Create Event
            </button>
          </div>
          <div
            style={{ marginTop: "15px", fontSize: "20px", fontWeight: "bold" }}
          >
            Market Balance : {Number(marketETHBalance).toFixed(5)}
          </div>
        </div>
        <div style={{ justifyContent: "center" }}>
          <h3 style={{ fontSize: 30, fontWeight: 50, marginTop: "10px" }}>
            NFT Items
          </h3>
        </div>
        <div
          style={{
            backgroundColor: "#BDBDBD",
            width: "1300px",
            height: "100%",
            borderRadius: "5px",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            padding: "10px",
          }}
        >
          {listedItems.map((item) => (
            <div
              key={item.itemID}
              style={{
                display: "flex",
                flexDirection: "column",
                width: "300px",
                height: "400px",
                backgroundColor: "#283593",
                borderRadius: "10px",
                marginRight: "3px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "70%",
                }}
              >
                <img
                  src={item.image}
                  style={{
                    width: "100%",
                    height: "300px",
                    borderTopRightRadius: "10PX",
                    borderTopLeftRadius: "10PX",
                  }}
                  alt="img"
                />
              </div>
              <div style={{ marginTop: "30px" }}>
                Price {item.totalPrice} ETH
              </div>
              <div style={{ marginTop: "10px" }}>
                <button
                  style={{
                    width: "90%",
                    height: "35px",
                    fontSize: "20px",
                    fontWeight: 50,
                    borderRadius: "10px",
                    backgroundColor: "hsl(267, 85.4%, 67.8%)",
                    borderColor: "hsl(267, 85.4%, 67.8%)",
                    color: "white",
                  }}
                  onClick={() => buyNFT(item.itemID)}
                >
                  BUY
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ justifyContent: "center" }}>
          <h3 style={{ fontSize: 30, fontWeight: 50 }}>
            My NFT Items For Sale
          </h3>
        </div>
        <div
          style={{
            backgroundColor: "#BDBDBD",
            width: "1300px",
            height: "100%",
            borderRadius: "5px",
            display: "flex",
            flexWrap: "wrap",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            padding: "10px",
          }}
        >
          {MylistedItems.map((item) => (
            <div
              key={item.itemID}
              style={{
                display: "flex",
                flexDirection: "column",
                width: "300px",
                height: "400px",
                backgroundColor: "#283593",
                borderRadius: "10px",
                marginRight: "3px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "70%",
                }}
              >
                <img
                  src={item.image}
                  style={{
                    width: "100%",
                    height: "300px",
                    borderTopRightRadius: "10PX",
                    borderTopLeftRadius: "10PX",
                  }}
                  alt="img"
                />
              </div>
              <div style={{ marginTop: "30px" }}>
                Price {item.totalPrice} ETH
              </div>
            </div>
          ))}
        </div>
        <div style={{ justifyContent: "center" }}>
          <h3 style={{ fontSize: 30, fontWeight: 50 }}>My NFT Items</h3>
        </div>
        <div
          style={{
            backgroundColor: "#BDBDBD",
            width: "1300px",
            height: "100%",
            borderRadius: "5px",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            padding: "10px",
          }}
        >
          {myOwnNFTItems.map((item) => (
            <div
              key={item.itemID}
              style={{
                display: "flex",
                flexDirection: "column",
                width: "300px",
                height: "400px",
                backgroundColor: "#283593",
                borderRadius: "10px",
                marginRight: "3px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "70%",
                }}
              >
                <img
                  src={item.image}
                  style={{
                    width: "100%",
                    height: "300px",
                    borderTopRightRadius: "10PX",
                    borderTopLeftRadius: "10PX",
                  }}
                  alt="img"
                />
              </div>
              <div style={{ marginTop: "30px" }}>
                Price {item.totalPrice} ETH
              </div>
            </div>
          ))}
        </div>
        <div style={{ justifyContent: "center" }}>
          <h3 style={{ fontSize: 30, fontWeight: 50 }}>Events</h3>
        </div>
        <div
          style={{
            backgroundColor: "#BDBDBD",
            width: "1300px",
            height: "100%",
            borderRadius: "5px",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            padding: "10px",
            marginBottom: "20px",
          }}
        >
          {eventItems.map((item) => (
            <div
              key={item.eventID}
              style={{
                display: "flex",
                flexDirection: "column",
                width: "300px",
                height: "400px",
                backgroundColor: "#283593",
                borderRadius: "10px",
                marginRight: "3px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "50%",
                }}
              >
                <img
                  src={eventImagePath}
                  style={{
                    width: "100%",
                    height: "200px",
                    borderTopRightRadius: "10PX",
                    borderTopLeftRadius: "10PX",
                  }}
                  alt="img"
                />
              </div>
              <div style={{ marginTop: "5px" }}>
                Price {ethers.utils.formatUnits(item.eventTicketPrice, 18)} ETH
              </div>
              <div style={{ marginTop: "0px" }}>
                Start Time {item.eventStartTime.toString()} Block
              </div>
              <div style={{ marginTop: "5px" }}>
                MaxCap {item.eventMaxCap.toString()}
              </div>
              <div style={{ marginTop: "5px" }}>
                Users Who Joined {item.eventUsers.length}
              </div>
              <div style={{ marginTop: "10px" }}>
                {item.userIsJoined ? (
                  <button
                    style={{
                      width: "90%",
                      height: "35px",
                      fontSize: "20px",
                      fontWeight: 50,
                      borderRadius: "10px",
                      backgroundColor: "hsl(267, 85.4%, 67.8%)",
                      borderColor: "hsl(267, 85.4%, 67.8%)",
                      color: "white",
                    }}
                    onClick={() => buyTicketForEvent(item.eventID)}
                  >
                    {currentBlock.toString() ===
                    item.eventStartTime.toString() ? (
                      <text>JoinEvent</text>
                    ) : (
                      <text>You have ticket</text>
                    )}
                  </button>
                ) : (
                  <button
                    style={{
                      width: "90%",
                      height: "35px",
                      fontSize: "20px",
                      fontWeight: 50,
                      borderRadius: "10px",
                      backgroundColor: "hsl(267, 85.4%, 67.8%)",
                      borderColor: "hsl(267, 85.4%, 67.8%)",
                      color: "white",
                    }}
                    onClick={() => buyTicketForEvent(item.eventID)}
                  >
                    {item.eventUsers.length <
                    Number(item.eventMaxCap.toString()) ? (
                      <text>Buy Ticket</text>
                    ) : (
                      <text>Cap is full !</text>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ justifyContent: "center" }}>
          <h3 style={{ fontSize: 30, fontWeight: 50 }}>Events I Joined</h3>
        </div>
        <div
          style={{
            backgroundColor: "#BDBDBD",
            width: "1300px",
            height: "100%",
            borderRadius: "5px",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            padding: "10px",
            marginBottom: "20px",
          }}
        >
          {eventItemsUserJoined.map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                width: "300px",
                height: "400px",
                backgroundColor: "#283593",
                borderRadius: "10px",
                marginRight: "3px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "70%",
                }}
              >
                <img
                  src={eventImagePath}
                  style={{
                    width: "100%",
                    height: "285px",
                    borderTopRightRadius: "10PX",
                    borderTopLeftRadius: "10PX",
                  }}
                  alt="img"
                />
              </div>
              <div style={{ marginTop: "20px" }}>
                Users Who Joined {item.users.length}
              </div>
              <div style={{ marginTop: "10px" }}>
                {
                  <button
                    style={{
                      width: "90%",
                      height: "35px",
                      fontSize: "20px",
                      fontWeight: 50,
                      borderRadius: "10px",
                      backgroundColor: "hsl(267, 85.4%, 67.8%)",
                      borderColor: "hsl(267, 85.4%, 67.8%)",
                      color: "white",
                    }}
                  >
                    {currentBlock.toString() === item.startTime.toString() ? (
                      <text>JoinEvent</text>
                    ) : (
                      <text>Join at {item.startTime.toString()} Block</text>
                    )}
                  </button>
                }
              </div>
            </div>
          ))}
        </div>
        <div style={{ justifyContent: "center" }}>
          <h3 style={{ fontSize: 30, fontWeight: 50 }}>Events I Created</h3>
        </div>
        <div
          style={{
            backgroundColor: "#BDBDBD",
            width: "1300px",
            height: "100%",
            borderRadius: "5px",
            display: "flex",
            flexWrap: "wrap",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            padding: "10px",
            marginBottom: "20px",
          }}
        >
          {eventItemsUserCreated.map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                width: "300px",
                height: "400px",
                backgroundColor: "#283593",
                borderRadius: "10px",
                marginRight: "3px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "70%",
                }}
              >
                <img
                  src={eventImagePath}
                  style={{
                    width: "100%",
                    height: "285px",
                    borderTopRightRadius: "10PX",
                    borderTopLeftRadius: "10PX",
                  }}
                  alt="img"
                />
              </div>
              <div style={{ marginTop: "20px" }}>
                Users Who Joined {item.users.length}
              </div>
              <div style={{ marginTop: "10px" }}>
                {
                  <button
                    style={{
                      width: "90%",
                      height: "35px",
                      fontSize: "20px",
                      fontWeight: 50,
                      borderRadius: "10px",
                      backgroundColor: "hsl(267, 85.4%, 67.8%)",
                      borderColor: "hsl(267, 85.4%, 67.8%)",
                      color: "white",
                    }}
                  >
                    {currentBlock.toString() === item.startTime.toString() ? (
                      <text>JoinEvent</text>
                    ) : (
                      <text>Join at {item.startTime.toString()} Block</text>
                    )}
                  </button>
                }
              </div>
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;
