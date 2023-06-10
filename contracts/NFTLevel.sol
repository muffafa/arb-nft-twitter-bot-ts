// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

//Contract address (Avalanche Fuji Testnet): 0x9Fe4b90589291989F5Ef37614b8e5a57fDCa56a6
contract TestCertificate is ERC721, Ownable {
    using Counters for Counters.Counter;


    Counters.Counter private _tokenIdCounter;

    event ChallengeSolved(address solver, address challenge, string twitterHandle);

    //set ownership to the manager contract.
    constructor() ERC721("TestCyf", "CYF") { }

    //Mint certificate button
    function mint() external {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        string memory twitterHandle = "bozaetest";
        emit ChallengeSolved(msg.sender, msg.sender, twitterHandle);
        _safeMint(msg.sender, tokenId); 
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721)
    {
        require(from == address(0), "Token not transferable");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _baseURI() internal view virtual override returns (string memory) {
       return "ipfs://QmPhNvYuKELnR64HEkBQStPsRTLrMkHakRvwGCZCACZPrB/";
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        string memory baseURI = _baseURI();
        return bytes(baseURI).length != 0 ? string(abi.encodePacked(baseURI, "vrf.json")) : '';
    }
}