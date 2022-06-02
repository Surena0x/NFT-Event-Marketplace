//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./NFTContract.sol";

contract marketPlace is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter public _itemTracker;
    Counters.Counter public _soldItems;
    Counters.Counter public _eventCounter;

    uint256 public NFTTokenFee;
    uint256 public createEventFee;
    uint256 public sellEventTicketFee;

    event EventCreated(
        address indexed _eventOwner,
        uint256 indexed _eventID,
        uint256 indexed _eventTicketPrice
    );

    event ticketMinted(
        address indexed buyer,
        uint256 indexed _eventID,
        uint256 indexed _eventTicketPrice
    );

    event NFTItemListed(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller
    );

    event Bought(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller,
        address indexed buyer
    );

    NFTContract NFTContractInstance;

    uint256 public eventCreateFee;
    uint256 public NFTItemListFee;

    struct Event {
        address payable creator;
        uint256 price;
        uint256 eventID;
        address[] users;
        uint256 maxCap;
        uint256 startTime;
        bool isActive;
    }
    mapping(uint256 => Event) public EventMapping;

    struct NFTItem {
        uint256 itemId;
        IERC721 nft;
        uint256 tokenId;
        uint256 price;
        address payable seller;
        address payable owner;
        bool sold;
    }
    mapping(uint256 => NFTItem) public _NFTItem;

    modifier onlyCreator(uint256 _eventID) {
        Event memory _eventItem = EventMapping[_eventID];
        require(msg.sender == _eventItem.creator);
        _;
    }

    function setNFTContractInstance(address _NFTContractInstance)
        external
        onlyOwner
        returns (bool)
    {
        NFTContractInstance = NFTContract(_NFTContractInstance);
        return true;
    }

    //////////////////////////////////////////////////////////////////////////////////////// NFT SECTION
    function listNFTItem(
        IERC721 _nft,
        uint256 _tokenId,
        uint256 _price
    ) external nonReentrant returns (bool) {
        require(_price > 0, "Price must be greater than zero");
        require(
            _nft.ownerOf(_tokenId) == msg.sender,
            "You are not owner of this NFT"
        );

        _itemTracker.increment();
        uint256 _itemCount = _itemTracker.current();

        _NFTItem[_itemCount] = NFTItem(
            _itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            payable(address(this)),
            false
        );

        _nft.transferFrom(msg.sender, address(this), _tokenId);

        emit NFTItemListed(
            _itemCount,
            address(_nft),
            _tokenId,
            _price,
            address(msg.sender)
        );

        return true;
    }

    function buyNFTItem(uint256 _itemID)
        external
        payable
        nonReentrant
        returns (bool)
    {
        uint256 _itemCount = _itemTracker.current();
        require(_itemID > 0 && _itemID <= _itemCount, "Item is not existing");

        uint256 _itemPrice = getItemTotalPrice(_itemID);
        require(msg.value == _itemPrice, " not enough money to pay");

        NFTItem storage _item = _NFTItem[_itemID];
        require(_item.sold == false, "Item is not for sell !");

        uint256 _paymentToNFTSeller = _itemPrice - (_itemPrice / 10);
        _item.seller.transfer(_paymentToNFTSeller);

        _item.owner = payable(msg.sender);
        _item.seller = payable(address(0));
        _item.sold = true;

        _soldItems.increment();

        _item.nft.transferFrom(address(this), msg.sender, _item.tokenId);

        emit Bought(
            _itemID,
            address(_item.nft),
            _item.tokenId,
            _itemPrice,
            address(_item.seller),
            address(msg.sender)
        );

        return true;
    }

    //////////////////////////////////////////////////////////////////////////////////////// NFT ITEM GETTERS
    function getItemTotalPrice(uint256 _itemID) public view returns (uint256) {
        return (_NFTItem[_itemID].price);
    }

    function getTotalItemsListed() external view returns (uint256) {
        return _itemTracker.current();
    }

    function getSoldCounter() external view returns (uint256) {
        return _soldItems.current();
    }

    function getEventCounter() external view returns (uint256) {
        return _eventCounter.current();
    }

    function getMarketItems() external view returns (NFTItem[] memory) {
        uint256 totalItems = _itemTracker.current();
        uint256 unSoldItems = totalItems - _soldItems.current();

        uint256 currentIndex = 0;

        NFTItem[] memory marketItems = new NFTItem[](unSoldItems);

        for (uint256 i = 0; i < totalItems; i++) {
            if (_NFTItem[i + 1].owner == address(this)) {
                uint256 currentId = _NFTItem[i + 1].itemId;
                NFTItem storage currentItem = _NFTItem[currentId];
                marketItems[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }

        return marketItems;
    }

    function getMyNFTItems() external view returns (NFTItem[] memory) {
        uint256 totalItems = _itemTracker.current();
        uint256 itemCount = 0;

        for (uint256 i = 0; i < totalItems; i++) {
            if (_NFTItem[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }

        uint256 currentIndex = 0;
        NFTItem[] memory marketItems = new NFTItem[](itemCount);

        for (uint256 i = 0; i < totalItems; i++) {
            if (_NFTItem[i + 1].owner == msg.sender) {
                uint256 currentItemId = _NFTItem[i + 1].itemId;
                NFTItem storage currentItem = _NFTItem[currentItemId];
                marketItems[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }

        return marketItems;
    }

    function getMyNFTForSale() external view returns (NFTItem[] memory) {
        uint256 totalItems = _itemTracker.current();
        uint256 itemCount = 0;

        for (uint256 i = 0; i < totalItems; i++) {
            if (_NFTItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        uint256 currentIndex = 0;
        NFTItem[] memory marketItems = new NFTItem[](itemCount);

        for (uint256 i = 0; i < totalItems; i++) {
            if (_NFTItem[i + 1].seller == msg.sender) {
                uint256 currentItemId = _NFTItem[i + 1].itemId;
                NFTItem storage currentItem = _NFTItem[currentItemId];
                marketItems[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }

        return marketItems;
    }

    function getNFTItemFromMarket(uint256 _NFTItemCount)
        external
        view
        returns (
            uint256,
            address,
            uint256,
            uint256,
            address,
            address,
            bool
        )
    {
        NFTItem memory _item = _NFTItem[_NFTItemCount];

        return (
            _item.itemId,
            address(_item.nft),
            _item.tokenId,
            _item.price,
            _item.seller,
            _item.owner,
            _item.sold
        );
    }

    //////////////////////////////////////////////////////////////////////////////////////// EVENT SECTION
    function createEvent(
        uint256 _eventTicketPrice,
        uint256 _eventMaxCap,
        uint256 _startTime
    ) external payable nonReentrant returns (bool) {
        require(
            msg.value == (_eventTicketPrice / 10),
            "you need to pay for create event"
        );
        _eventCounter.increment();
        uint256 _newEventID = _eventCounter.current();

        Event memory _newEvent;
        _newEvent.creator = payable(msg.sender);
        _newEvent.eventID = _newEventID;
        _newEvent.price = _eventTicketPrice;
        _newEvent.maxCap = _eventMaxCap;
        _newEvent.startTime = _startTime;

        EventMapping[_newEventID] = _newEvent;

        emit EventCreated(msg.sender, _newEventID, _eventTicketPrice);

        return true;
    }

    function mintTicket(uint256 _eventID)
        external
        payable
        nonReentrant
        returns (bool)
    {
        uint256 _totalEventNumber = _eventCounter.current();
        require(_eventID <= _totalEventNumber, "Event is not exist");

        Event memory _eventItem = EventMapping[_eventID];
        require(
            msg.value == _eventItem.price,
            "Not enough money to pay ticket price"
        );

        require(
            _eventItem.users.length < _eventItem.maxCap,
            "event cap is full"
        );

        uint256 _paymentToNFTSeller = _eventItem.price -
            (_eventItem.price / 10);

        _eventItem.creator.transfer(_paymentToNFTSeller);

        string memory _ticketURI = Strings.toString(_eventID);

        address payable _userAddress = payable(msg.sender);

        uint256 _ticketID = NFTContractInstance.mintTicket(
            _userAddress,
            _ticketURI
        );
        EventMapping[_eventID].users.push(_userAddress);

        emit ticketMinted(_userAddress, _eventID, _eventItem.price);

        return true;
    }

    function eventWhiteList(uint256 _eventID)
        external
        view
        returns (address[] memory)
    {
        return EventMapping[_eventID].users;
    }

    function changeEventPrice(uint256 _eventID, uint256 _newPrice)
        external
        onlyCreator(_eventID)
        returns (bool)
    {
        Event memory _eventItem = EventMapping[_eventID];

        _eventItem.price = _newPrice;
        EventMapping[_eventID] = _eventItem;

        return true;
    }

    function startEvent(uint256 _eventID)
        external
        onlyCreator(_eventID)
        returns (bool)
    {
        Event memory _eventItem = EventMapping[_eventID];
        require(
            block.timestamp >= _eventItem.startTime &&
                _eventItem.isActive == false
        );

        _eventItem.isActive = true;
        EventMapping[_eventID] = _eventItem;
        return true;
    }

    //////////////////////////////////////////////////////////////////////////////////////// EVENT GETTERS
    function getMyEventsJoined() external view returns (Event[] memory) {
        uint256 _maxEventItems = _eventCounter.current();
        uint256 _EventArrayLength;

        for (uint256 id = 1; id <= _maxEventItems; id++) {
            Event memory _event = EventMapping[id];

            for (uint256 _capID = 0; _capID < _event.users.length; _capID++) {
                if (_event.users[_capID] == msg.sender) {
                    _EventArrayLength = _EventArrayLength + 1;
                }
            }
        }

        uint256 currentIndex = 0;
        Event[] memory _eventItems = new Event[](_EventArrayLength);

        for (uint256 id = 1; id <= _maxEventItems; ++id) {
            Event memory _event = EventMapping[id];

            for (uint256 _capID = 0; _capID < _event.users.length; _capID++) {
                if (_event.users[_capID] == msg.sender) {
                    _eventItems[currentIndex] = _event;
                    currentIndex++;
                }
            }
        }

        return _eventItems;
    }

    function getMyEventsCreated() external view returns (Event[] memory) {
        uint256 _maxEventItems = _eventCounter.current();
        uint256 _EventArrayLength;

        for (uint256 id = 1; id <= _maxEventItems; ++id) {
            Event memory _event = EventMapping[id];

            if (_event.creator == msg.sender) {
                _EventArrayLength = _EventArrayLength + 1;
            }
        }

        uint256 currentIndex = 0;
        Event[] memory _eventItems = new Event[](_EventArrayLength);

        for (uint256 id = 1; id <= _maxEventItems; ++id) {
            Event memory _event = EventMapping[id];

            if (_event.creator == msg.sender) {
                _eventItems[currentIndex] = _event;
                currentIndex++;
            }
        }

        return _eventItems;
    }

    function getEventItem(uint256 _eventID)
        external
        view
        returns (
            address,
            uint256,
            uint256,
            address[] memory,
            uint256
        )
    {
        uint256 _totalEventNumber = _eventCounter.current();
        require(_eventID <= _totalEventNumber, "Event is not exist");
        Event memory _eventItem = EventMapping[_eventID];

        return (
            _eventItem.creator,
            _eventItem.price,
            _eventItem.eventID,
            _eventItem.users,
            _eventItem.maxCap
        );
    }

    function getEventUsers(uint256 _eventID)
        public
        view
        returns (address[] memory)
    {
        Event memory _event = EventMapping[_eventID];
        return _event.users;
    }

    function getEventMaxCap(uint256 _eventID) external view returns (uint256) {
        Event memory _event = EventMapping[_eventID];
        return _event.maxCap;
    }

    function getEventTicketPrice(uint256 _eventID)
        external
        view
        returns (uint256)
    {
        Event memory _event = EventMapping[_eventID];
        return _event.price;
    }

    function getEventCreator(uint256 _eventID) external view returns (address) {
        Event memory _event = EventMapping[_eventID];
        return _event.creator;
    }

    function userIsJoined(uint256 _eventID) external view returns (bool) {
        Event memory _event = EventMapping[_eventID];
        for (uint256 _capID = 0; _capID < _event.users.length; _capID++) {
            if (_event.users[_capID] == msg.sender) {
                return true;
            }
        }
        return false;
    }

    //////////////////////////////////////////////////////////////////////////////////////// Market Balance
    function getMarketBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function withdrawContractBalance() external onlyOwner returns (bool) {
        payable(msg.sender).transfer(address(this).balance);
        return true;
    }
}
