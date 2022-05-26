//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./NFTContract.sol";

contract marketPlace is Ownable {
    using Counters for Counters.Counter;

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

    Counters.Counter private _itemTracker;
    Counters.Counter private _soldItems;
    Counters.Counter private _eventCounter;

    NFTContract NFTContractInstance;

    struct Event {
        address payable creator;
        uint256 price;
        uint256 eventID;
        address[] users;
        uint256 maxCap;
    }
    mapping(uint256 => Event) EventMapping;

    struct NFTItem {
        uint256 itemId;
        IERC721 nft;
        uint256 tokenId;
        uint256 price;
        address payable seller;
        address payable owner;
        bool sold;
    }
    mapping(uint256 => NFTItem) private _NFTItem;

    function setNFTContractInstance(address _NFTContractInstance)
        external
        onlyOwner
    {
        NFTContractInstance = NFTContract(_NFTContractInstance);
    }

    function createEvent(uint256 _eventTicketPrice) external {
        _eventCounter.increment();
        uint256 _newEventID = _eventCounter.current();

        Event memory _newEvent;
        _newEvent.creator = payable(msg.sender);
        _newEvent.eventID = _newEventID;
        _newEvent.price = _eventTicketPrice;
        _newEvent.maxCap = 2;

        EventMapping[_newEventID] = _newEvent;

        emit EventCreated(msg.sender, _newEventID, _eventTicketPrice);
    }

    function mintTicket(uint256 _eventID) external payable {
        uint256 _totalEventNumber = _eventCounter.current();
        require(_eventID <= _totalEventNumber);

        Event memory _eventItem = EventMapping[_eventID];
        require(msg.value == _eventItem.price);

        _eventItem.creator.transfer(_eventItem.price);

        string memory _ticketURI = Strings.toString(_eventID);

        address payable _userAddress = payable(msg.sender);

        NFTContractInstance.mintTicket(_userAddress, _ticketURI);
        EventMapping[_eventID].users.push(_userAddress);

        emit ticketMinted(_userAddress, _eventID, _eventItem.price);
    }

    function eventWhiteList(uint256 _eventID)
        external
        view
        returns (address[] memory)
    {
        return EventMapping[_eventID].users;
    }

    function getMyEventsJoined() external view returns (Event[] memory) {
        uint256 _maxEventItems = _eventCounter.current();
        uint256 _EventArrayLength;

        for (uint256 id = 0; id <= _maxEventItems; ++id) {
            Event memory _event = EventMapping[id];

            for (uint256 _maxCap = 0; _maxCap < _event.maxCap; ++_maxCap) {
                if (_event.users[_maxCap] == msg.sender) {
                    _EventArrayLength = _EventArrayLength + 1;
                }
            }
        }

        uint256 currentIndex = 0;
        Event[] memory _eventItems = new Event[](_EventArrayLength);

        for (uint256 id = 0; id <= _maxEventItems; ++id) {
            Event memory _event = EventMapping[id];

            for (uint256 _maxCap = 0; _maxCap < _event.maxCap; ++_maxCap) {
                if (_event.users[_maxCap] == msg.sender) {
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

        for (uint256 id = 0; id <= _maxEventItems; ++id) {
            Event memory _event = EventMapping[id];

            if (_event.creator == msg.sender) {
                _EventArrayLength = _EventArrayLength + 1;
            }
        }

        uint256 currentIndex = 0;
        Event[] memory _eventItems = new Event[](_EventArrayLength);

        for (uint256 id = 0; id <= _maxEventItems; ++id) {
            Event memory _event = EventMapping[id];

            if (_event.creator == msg.sender) {
                _eventItems[currentIndex] = _event;
                currentIndex++;
            }
        }

        return _eventItems;
    }
}
