// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PredictionMarket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PredictionMarketFactory
 * @dev Factory contract for deploying PredictionMarket instances
 * @author BCDV 4034 - George Brown College
 */
contract PredictionMarketFactory is Ownable, Pausable {
    
    // Events
    event PredictionMarketDeployed(address indexed marketAddress, address indexed creator, address indexed bettingToken);
    event DefaultBettingTokenUpdated(address indexed oldToken, address indexed newToken);
    event MarketRegistered(address indexed marketAddress, string name, string description);
    
    // State variables
    address public defaultBettingToken;
    uint256 public totalMarketsDeployed;
    
    // Mappings
    mapping(address => bool) public isValidMarket;
    mapping(address => address[]) public userMarkets; // user => deployed markets
    mapping(string => address) public namedMarkets; // name => market address
    
    // Arrays for tracking
    address[] public allMarkets;
    address[] public activeMarkets;
    
    // Structs
    struct MarketInfo {
        address marketAddress;
        address creator;
        address bettingToken;
        string name;
        string description;
        uint256 deploymentTime;
        bool isActive;
    }
    
    mapping(address => MarketInfo) public marketInfo;
    
    constructor(address _defaultBettingToken) Ownable(msg.sender) {
        defaultBettingToken = _defaultBettingToken;
    }
    
    /**
     * @dev Deploy a new PredictionMarket contract
     * @param _bettingToken Token to use for betting (use address(0) for default)
     * @param _name Human-readable name for the market
     * @param _description Description of the market instance
     */
    function deployPredictionMarket(
        address _bettingToken,
        string memory _name,
        string memory _description
    ) external whenNotPaused returns (address) {
        require(bytes(_name).length > 0, "Market name cannot be empty");
        require(namedMarkets[_name] == address(0), "Market name already exists");
        
        // Use default token if none specified
        address tokenToUse = _bettingToken == address(0) ? defaultBettingToken : _bettingToken;
        require(tokenToUse != address(0), "Invalid betting token");
        
        // Deploy new PredictionMarket
        PredictionMarket newMarket = new PredictionMarket(tokenToUse);
        address marketAddress = address(newMarket);
        
        // Update state
        totalMarketsDeployed++;
        isValidMarket[marketAddress] = true;
        userMarkets[msg.sender].push(marketAddress);
        namedMarkets[_name] = marketAddress;
        allMarkets.push(marketAddress);
        activeMarkets.push(marketAddress);
        
        // Store market info
        marketInfo[marketAddress] = MarketInfo({
            marketAddress: marketAddress,
            creator: msg.sender,
            bettingToken: tokenToUse,
            name: _name,
            description: _description,
            deploymentTime: block.timestamp,
            isActive: true
        });
        
        emit PredictionMarketDeployed(marketAddress, msg.sender, tokenToUse);
        emit MarketRegistered(marketAddress, _name, _description);
        
        return marketAddress;
    }
    
    /**
     * @dev Deploy a standard prediction market with common configuration
     * @param _name Market name
     * @param _description Market description
     */
    function deployStandardMarket(
        string memory _name,
        string memory _description
    ) external whenNotPaused returns (address) {
        require(bytes(_name).length > 0, "Market name cannot be empty");
        require(namedMarkets[_name] == address(0), "Market name already exists");
        
        // Use default token
        address tokenToUse = defaultBettingToken;
        require(tokenToUse != address(0), "Invalid betting token");
        
        // Deploy new PredictionMarket
        PredictionMarket newMarket = new PredictionMarket(tokenToUse);
        address marketAddress = address(newMarket);
        
        // Update state
        totalMarketsDeployed++;
        isValidMarket[marketAddress] = true;
        userMarkets[msg.sender].push(marketAddress);
        namedMarkets[_name] = marketAddress;
        allMarkets.push(marketAddress);
        activeMarkets.push(marketAddress);
        
        // Store market info
        marketInfo[marketAddress] = MarketInfo({
            marketAddress: marketAddress,
            creator: msg.sender,
            bettingToken: tokenToUse,
            name: _name,
            description: _description,
            deploymentTime: block.timestamp,
            isActive: true
        });
        
        emit PredictionMarketDeployed(marketAddress, msg.sender, tokenToUse);
        emit MarketRegistered(marketAddress, _name, _description);
        
        return marketAddress;
    }
    
    /**
     * @dev Get all markets deployed by a user
     * @param _user User address
     */
    function getUserMarkets(address _user) external view returns (address[] memory) {
        return userMarkets[_user];
    }
    
    /**
     * @dev Get all deployed markets
     */
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }
    
    /**
     * @dev Get active markets
     */
    function getActiveMarkets() external view returns (address[] memory) {
        return activeMarkets;
    }
    
    /**
     * @dev Get market by name
     * @param _name Market name
     */
    function getMarketByName(string memory _name) external view returns (address) {
        return namedMarkets[_name];
    }
    
    /**
     * @dev Get market information
     * @param _marketAddress Market contract address
     */
    function getMarketInfo(address _marketAddress) 
        external 
        view 
        returns (
            address marketAddress,
            address creator,
            address bettingToken,
            string memory name,
            string memory description,
            uint256 deploymentTime,
            bool isActive
        ) 
    {
        require(isValidMarket[_marketAddress], "Invalid market address");
        MarketInfo storage info = marketInfo[_marketAddress];
        
        return (
            info.marketAddress,
            info.creator,
            info.bettingToken,
            info.name,
            info.description,
            info.deploymentTime,
            info.isActive
        );
    }
    
    /**
     * @dev Get paginated markets
     * @param _start Start index
     * @param _limit Number of markets to return
     */
    function getPaginatedMarkets(uint256 _start, uint256 _limit) 
        external 
        view 
        returns (address[] memory markets, uint256 total) 
    {
        total = allMarkets.length;
        
        if (_start >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = _start + _limit;
        if (end > total) {
            end = total;
        }
        
        markets = new address[](end - _start);
        for (uint256 i = _start; i < end; i++) {
            markets[i - _start] = allMarkets[i];
        }
        
        return (markets, total);
    }
    
    /**
     * @dev Check if market address is valid
     * @param _marketAddress Market address to check
     */
    function isMarketValid(address _marketAddress) external view returns (bool) {
        return isValidMarket[_marketAddress];
    }
    
    /**
     * @dev Deactivate a market (removes from active list)
     * @param _marketAddress Market to deactivate
     */
    function deactivateMarket(address _marketAddress) external {
        require(isValidMarket[_marketAddress], "Invalid market address");
        
        MarketInfo storage info = marketInfo[_marketAddress];
        require(msg.sender == info.creator || msg.sender == owner(), "Not authorized");
        require(info.isActive, "Market already inactive");
        
        info.isActive = false;
        
        // Remove from active markets array
        for (uint256 i = 0; i < activeMarkets.length; i++) {
            if (activeMarkets[i] == _marketAddress) {
                activeMarkets[i] = activeMarkets[activeMarkets.length - 1];
                activeMarkets.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Reactivate a market
     * @param _marketAddress Market to reactivate
     */
    function reactivateMarket(address _marketAddress) external {
        require(isValidMarket[_marketAddress], "Invalid market address");
        
        MarketInfo storage info = marketInfo[_marketAddress];
        require(msg.sender == info.creator || msg.sender == owner(), "Not authorized");
        require(!info.isActive, "Market already active");
        
        info.isActive = true;
        activeMarkets.push(_marketAddress);
    }
    
    /**
     * @dev Update default betting token
     * @param _newToken New default token address
     */
    function updateDefaultBettingToken(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Invalid token address");
        
        address oldToken = defaultBettingToken;
        defaultBettingToken = _newToken;
        
        emit DefaultBettingTokenUpdated(oldToken, _newToken);
    }
    
    /**
     * @dev Get deployment statistics
     */
    function getStats() 
        external 
        view 
        returns (
            uint256 totalDeployed,
            uint256 totalActive,
            address defaultToken
        ) 
    {
        return (
            totalMarketsDeployed,
            activeMarkets.length,
            defaultBettingToken
        );
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get markets by creator with pagination
     * @param _creator Creator address
     * @param _start Start index
     * @param _limit Number of markets to return
     */
    function getMarketsByCreator(address _creator, uint256 _start, uint256 _limit) 
        external 
        view 
        returns (address[] memory markets, uint256 total) 
    {
        address[] storage userMarketsList = userMarkets[_creator];
        total = userMarketsList.length;
        
        if (_start >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = _start + _limit;
        if (end > total) {
            end = total;
        }
        
        markets = new address[](end - _start);
        for (uint256 i = _start; i < end; i++) {
            markets[i - _start] = userMarketsList[i];
        }
        
        return (markets, total);
    }
}
