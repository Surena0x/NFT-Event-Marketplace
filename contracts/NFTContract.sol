//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTContract is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter public NFTItemTracker;
    mapping(uint256 => string) public NFTIDToURI;

    address marketPlace;

    constructor() ERC721("DAPP", "DAPP") {}

    function setMarketPlace(address _marketPlaceAddress) external onlyOwner {
        marketPlace = _marketPlaceAddress;
    }

    function mintToken(string memory _URIStorage) external returns (uint256) {
        NFTItemTracker.increment();
        uint256 _NFTID = NFTItemTracker.current();

        _mint(msg.sender, _NFTID);
        _setTokenURI(_NFTID, _URIStorage);

        setApprovalForAll(marketPlace, true);

        return _NFTID;
    }

    function mintTicket(address _userAddress, string memory _URIStorage)
        external
        returns (uint256)
    {
        NFTItemTracker.increment();
        uint256 _NFTID = NFTItemTracker.current();
        _mint(_userAddress, _NFTID);
        _setTokenURI(_NFTID, _URIStorage);

        return _NFTID;
    }
}
