// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing prediction markets
 * @author BCDV 4034 - George Brown College
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private _decimals;
    
    constructor() ERC20("Mock USD Coin", "USDC") Ownable(msg.sender) {
        _decimals = 18; // Changed to 18 decimals to match PredictionMarket expectations
        
        // Mint initial supply to deployer (1 million USDC)
        _mint(msg.sender, 1000000 * 10**_decimals);
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mint tokens (for testing purposes)
     * @param _to Recipient address
     * @param _amount Amount to mint
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }
    
    /**
     * @dev Faucet function - anyone can get test tokens
     * @param _amount Amount to request (max 1000 USDC per call)
     */
    function faucet(uint256 _amount) external {
        require(_amount <= 1000 * 10**_decimals, "Amount too large");
        _mint(msg.sender, _amount);
    }
    
    /**
     * @dev Burn tokens
     * @param _amount Amount to burn
     */
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
}
