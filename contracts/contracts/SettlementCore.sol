// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AuctionVault} from "./AuctionVault.sol";
import {CreditVault} from "./CreditVault.sol";
import {euint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

interface IAavePool {
    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external;
}

/**
 * @title SettlementCore
 * @notice Shared settlement bridge linking confidential liquidation auction and confidential CDS payout.
 */
contract SettlementCore is ReentrancyGuard {
    AuctionVault public auctionVault;
    CreditVault public creditVault;
    IAavePool public aavePool;
    address public owner;

    event SettlementExecuted(address indexed borrower, address indexed winner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _auction, address _credit, address _aavePool) {
        auctionVault = AuctionVault(_auction);
        creditVault = CreditVault(_credit);
        aavePool = IAavePool(_aavePool);
        owner = msg.sender;
    }

    /**
     * @notice Single entry point called by keeper once per liquidation event.
     * Takes decrypted winning discount rate (in basis points, e.g. 850 = 8.5%) and decrypted winner address.
     * Executes Aave liquidationCall() -> pays winning liquidator their second-price discount portion -> rebates surplus collateral back to defaulted borrower -> triggers CDS settlement.
     */
    function settle(
        address collateralAsset,
        address debtAsset,
        address borrower,
        uint256 debtToCover,
        address liquidatorWinner,
        uint256 winningDiscountBps
    ) external onlyOwner nonReentrant {
        // 1. Approve Aave Pool to pull debt repayment
        IERC20(debtAsset).approve(address(aavePool), debtToCover);

        // 2. Execute real Aave liquidation call on Sepolia
        aavePool.liquidationCall(collateralAsset, debtAsset, borrower, debtToCover, false);

        // 3. Payout liquidator based on Vickrey second-price discount & rebate surplus collateral to borrower
        uint256 totalSeized = IERC20(collateralAsset).balanceOf(address(this));
        if (totalSeized > 0) {
            // Liquidator receives portion corresponding to their second-price discount rate bid
            uint256 liquidatorPayout = (totalSeized * winningDiscountBps) / 10000;
            if (liquidatorPayout > totalSeized || liquidatorPayout == 0) {
                liquidatorPayout = totalSeized; // fallback
            }

            uint256 borrowerRebate = totalSeized - liquidatorPayout;

            // Pay liquidator winner
            IERC20(collateralAsset).transfer(liquidatorWinner, liquidatorPayout);

            // Rebate excess penalty surplus back to defaulted borrower
            if (borrowerRebate > 0) {
                IERC20(collateralAsset).transfer(borrower, borrowerRebate);
            }
        }

        // 4. Trigger confidential CDS settlement referencing the same defaulted position
        creditVault.settleOnDefault();

        emit SettlementExecuted(borrower, liquidatorWinner);
    }
}
