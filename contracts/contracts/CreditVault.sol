// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Nox, euint256, ebool, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";

contract CollateralToken is ERC7984, Ownable {
    constructor() ERC7984("Skia Collateral", "cSKIA", "") Ownable(msg.sender) {}

    function mint(address to, externalEuint256 amt, bytes calldata proof) external onlyOwner returns (euint256) {
        return _mint(to, Nox.fromExternal(amt, proof));
    }
}

contract CreditVault {
    struct HedgeIntent {
        address party;
        euint256 notional;
        bool isBuyer;
        bool active;
    }

    // Reduced from 6 to 4 (max 2 buyers + 2 sellers) to stay well within
    // Sepolia block gas limits given TEE op cost per matched pair.
    uint256 public constant MAX_PARTIES = 4;
    HedgeIntent[MAX_PARTIES] public intents;
    uint256 public intentCount;
    CollateralToken public collateral;
    address public referencePosition;
    address public owner;
    address public settlementCore;
    bool public settled;

    event IntentSubmitted(address indexed party, bool isBuyer, uint256 index);
    event HedgeSettlementExecuted(address indexed referencePosition);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    /**
     * @notice Restricts settleOnDefault() to only be callable by the deployed SettlementCore contract.
     * The address is set once in the constructor and cannot be changed.
     */
    modifier onlySettlementCore() {
        require(msg.sender == settlementCore, "not settlementCore");
        _;
    }

    constructor(address _collateral, address _referencePosition) {
        collateral = CollateralToken(_collateral);
        referencePosition = _referencePosition;
        owner = msg.sender;
        // settlementCore is set separately via setSettlementCore() after SettlementCore is deployed,
        // because CreditVault is deployed before SettlementCore (circular dependency).
    }

    /**
     * @notice Called once after SettlementCore is deployed to wire the onlySettlementCore guard.
     * Can only be called once and only by the deployer.
     */
    function setSettlementCore(address _settlementCore) external onlyOwner {
        require(settlementCore == address(0), "already set");
        settlementCore = _settlementCore;
    }

    /**
     * @notice Submit a confidential hedge intent.
     * For sellers: real cSKIA collateral is pulled from msg.sender into this vault at submission time,
     * so that settleOnDefault() transfers have a real backing balance.
     * For buyers: notional is recorded but no token movement occurs (buyers receive, not post, collateral).
     * @param encNotional  Client-side encrypted notional amount (euint256 handle).
     * @param proof        Nox fromExternal proof.
     * @param isBuyer      true = protection buyer, false = protection seller.
     */
    function submitIntent(externalEuint256 encNotional, bytes calldata proof, bool isBuyer) external {
        require(intentCount < MAX_PARTIES, "vault full");
        euint256 notional = Nox.fromExternal(encNotional, proof);

        if (!isBuyer) {
            // ERC-7984 uses time-bound operator grants, NOT ERC-20-style approve().
            // The seller MUST call collateral.setOperator(address(creditVault), uint48(block.timestamp + N))
            // before calling submitIntent(). There is no approve() on this token.
            // The hedge desk UI enforces this as a pre-flight tx before submitIntent().
            require(
                collateral.isOperator(msg.sender, address(this)),
                "call collateral.setOperator(vault, expiry) first"
            );
            // confidentialTransferFrom checks isOperator again internally; this pre-check gives
            // a readable revert reason instead of the opaque ERC7984UnauthorizedSpender error.
            collateral.confidentialTransferFrom(msg.sender, address(this), notional);
        }

        intents[intentCount] = HedgeIntent(msg.sender, notional, isBuyer, true);
        emit IntentSubmitted(msg.sender, isBuyer, intentCount);
        intentCount++;
    }

    /**
     * @notice Called by SettlementCore once the reference Aave position is confirmed liquidated.
     * Performs an oblivious greedy pairwise matching of buyer notional against seller collateral.
     * All arithmetic and comparisons are done inside the Nox TEE — no plaintext amounts are disclosed.
     *
     * Access: onlySettlementCore — this cannot be triggered by the deployer or any other address.
     */
    function settleOnDefault() external onlySettlementCore {
        require(!settled, "already settled");
        settled = true;

        // Local remaining balances for oblivious subtraction. We work on copies so storage reads
        // inside the nested loop don't re-read stale handles after partial consumption.
        euint256[MAX_PARTIES] memory remaining;
        for (uint256 i = 0; i < intentCount; i++) {
            remaining[i] = intents[i].notional;
        }

        // Oblivious greedy matching: for every buyer, iterate every seller and net their notionals.
        // All branches (lt, select, sub) run unconditionally in the TEE regardless of actual values,
        // preserving the anonymity set even for parties with zero remaining balance.
        for (uint256 b = 0; b < intentCount; b++) {
            if (!intents[b].isBuyer) continue;

            for (uint256 s = 0; s < intentCount; s++) {
                if (intents[s].isBuyer) continue;

                // matched = min(remaining[b], remaining[s])
                ebool buyerLess = Nox.lt(remaining[b], remaining[s]);
                euint256 matched = Nox.select(buyerLess, remaining[b], remaining[s]);

                remaining[b] = Nox.sub(remaining[b], matched);
                remaining[s] = Nox.sub(remaining[s], matched);

                // Transfer matched collateral from this vault (which holds seller deposits) -> buyer.
                // The vault received seller collateral at submitIntent() time via confidentialTransferFrom.
                // intents[s].party has zero balance post-submission — the vault is the correct `from`.
                collateral.confidentialTransferFrom(address(this), intents[b].party, matched);
            }
        }

        emit HedgeSettlementExecuted(referencePosition);
    }
}
