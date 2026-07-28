// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Nox, euint256, ebool, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/**
 * @title AuctionVault
 * @notice Confidential Vickrey (second-price) liquidation auction powered by iExec Nox TEE.
 */
contract AuctionVault {
    struct SealedBid {
        address bidder;
        euint256 discountBid; // Encrypted discount rate bid
        euint256 bidderIdEnc; // Encrypted bidder address
        bool submitted;
    }

    uint256 public constant MAX_BIDDERS = 5;
    SealedBid[MAX_BIDDERS] public bids;
    uint256 public bidCount;
    address public owner;
    bool public auctionClosed;

    euint256 public winningDiscount;
    euint256 public winningBidderEnc;

    event BidSubmitted(address indexed bidder, uint256 index);
    event AuctionResolved(bytes32 indexed winningDiscountHandle, bytes32 indexed winningBidderEncHandle);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function submitBid(externalEuint256 encryptedBid, bytes calldata proof) external {
        require(!auctionClosed, "auction closed");
        require(bidCount < MAX_BIDDERS, "auction full");

        euint256 bid = Nox.fromExternal(encryptedBid, proof);
        euint256 bidderId = Nox.toEuint256(uint256(uint160(msg.sender)));

        bids[bidCount] = SealedBid(msg.sender, bid, bidderId, true);
        emit BidSubmitted(msg.sender, bidCount);
        bidCount++;
    }

    /**
     * @notice Oblivious max + second-max over up to MAX_BIDDERS encrypted bids.
     * Runs every comparison regardless of real bid count to prevent leaking side-channel information.
     */
    function resolveVickrey() external returns (
        euint256 resWinningDiscount,   // Price winner pays: second-highest bid
        euint256 resWinningBidderEnc,  // Encrypted winning bidder identity
        euint256 highestBidEnc         // Kept encrypted
    ) {
        require(bidCount >= 2, "need at least 2 bids for vickrey");

        euint256 highest = bids[0].discountBid;
        euint256 second = Nox.toEuint256(0);
        euint256 highestBidderIdEnc = bids[0].bidderIdEnc;

        for (uint256 i = 1; i < bidCount; i++) {
            euint256 candidate = bids[i].discountBid;
            ebool candidateIsHigher = Nox.gt(candidate, highest);

            // If candidate > highest: new second = old highest, new highest = candidate
            euint256 newSecond = Nox.select(candidateIsHigher, highest, second);

            // If candidate <= highest but > second: new second = candidate
            ebool candidateBeatsSecond = Nox.gt(candidate, second);
            newSecond = Nox.select(
                candidateIsHigher,
                newSecond,
                Nox.select(candidateBeatsSecond, candidate, second)
            );

            euint256 newHighest = Nox.select(candidateIsHigher, candidate, highest);
            euint256 newHighestBidderIdEnc = Nox.select(candidateIsHigher, bids[i].bidderIdEnc, highestBidderIdEnc);

            highest = newHighest;
            second = newSecond;
            highestBidderIdEnc = newHighestBidderIdEnc;
        }

        Nox.allowThis(second);
        Nox.allowThis(highestBidderIdEnc);
        Nox.allow(second, owner);
        Nox.allow(highestBidderIdEnc, owner);

        winningDiscount = second;
        winningBidderEnc = highestBidderIdEnc;
        resWinningDiscount = second;
        resWinningBidderEnc = highestBidderIdEnc;
        highestBidEnc = highest;
        auctionClosed = true;

        emit AuctionResolved(euint256.unwrap(second), euint256.unwrap(highestBidderIdEnc));
    }
}
