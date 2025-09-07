// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PredictionMarket
 * @dev Decentralized prediction market smart contract similar to Polymarket
 * @author BCDV 4034 - George Brown College
 */
contract PredictionMarket is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Events
    event MarketCreated(uint256 indexed marketId, string question, uint256 endTime, address creator);
    event OutcomeAdded(uint256 indexed marketId, uint256 indexed outcomeId, string description);
    event BetPlaced(uint256 indexed marketId, uint256 indexed outcomeId, address indexed bettor, uint256 amount, uint256 shares);
    event MarketResolved(uint256 indexed marketId, uint256 winningOutcome, address resolver);
    event WinningsClaimed(address indexed user, uint256 indexed marketId, uint256 amount);
    event LiquidityAdded(uint256 indexed marketId, address indexed provider, uint256 amount);
    
    // Structs
    struct Market {
        uint256 id;
        string question;
        string category;
        string description;
        uint256 endTime;
        uint256 resolutionTime;
        address creator;
        bool isResolved;
        uint256 winningOutcome;
        uint256 totalVolume;
        uint256 totalLiquidity;
        uint256 outcomeCount;
        uint8 feePercentage; // Fee percentage (e.g., 2 = 2%)
        mapping(uint256 => Outcome) outcomes;
    }
    
    struct Outcome {
        uint256 id;
        string description;
        uint256 totalShares;
        uint256 totalBacked;
        bool isActive;
    }
    
    struct Bet {
        uint256 marketId;
        uint256 outcomeId;
        uint256 shares;
        uint256 amountBacked;
        uint256 timestamp;
        bool claimed;
    }
    
    struct UserPosition {
        uint256 totalShares;
        uint256 totalBacked;
        uint256[] betIds;
    }
    
    // State variables
    uint256 public marketCounter;
    uint256 public constant MIN_MARKET_DURATION = 1 hours;
    uint256 public constant MAX_MARKET_DURATION = 365 days;
    uint256 public constant MIN_BET_AMOUNT = 0.01 ether;
    uint256 public constant RESOLUTION_PERIOD = 7 days;
    uint256 public platformFeePercentage = 2; // 2% platform fee
    
    IERC20 public bettingToken; // Token used for betting (could be USDC, DAI, etc.)
    
    mapping(uint256 => Market) public markets;
    mapping(address => mapping(uint256 => mapping(uint256 => UserPosition))) public userPositions; // user => marketId => outcomeId => position
    mapping(address => Bet[]) public userBets;
    mapping(address => bool) public authorizedResolvers;
    
    // Arrays for iteration
    uint256[] public activeMarkets;
    uint256[] public resolvedMarkets;
    mapping(string => uint256[]) public marketsByCategory;
    
    // Modifiers
    modifier marketExists(uint256 _marketId) {
        require(_marketId > 0 && _marketId <= marketCounter, "Market does not exist");
        _;
    }
    
    modifier marketActive(uint256 _marketId) {
        require(block.timestamp < markets[_marketId].endTime, "Market has ended");
        require(!markets[_marketId].isResolved, "Market is already resolved");
        _;
    }
    
    modifier marketEnded(uint256 _marketId) {
        require(block.timestamp >= markets[_marketId].endTime, "Market is still active");
        _;
    }
    
    modifier outcomeExists(uint256 _marketId, uint256 _outcomeId) {
        require(_outcomeId > 0 && _outcomeId <= markets[_marketId].outcomeCount, "Outcome does not exist");
        require(markets[_marketId].outcomes[_outcomeId].isActive, "Outcome is not active");
        _;
    }
    
    modifier onlyAuthorizedResolver() {
        require(authorizedResolvers[msg.sender] || msg.sender == owner(), "Not authorized to resolve markets");
        _;
    }
    
    constructor(address _bettingToken) Ownable(msg.sender) {
        bettingToken = IERC20(_bettingToken);
        marketCounter = 0;
        authorizedResolvers[msg.sender] = true;
    }
    
    /**
     * @dev Create a new prediction market
     * @param _question The market question
     * @param _category Market category (e.g., "Politics", "Sports", "Crypto")
     * @param _description Detailed description
     * @param _endTime When betting ends
     * @param _outcomeDescriptions Array of possible outcomes
     * @param _feePercentage Market-specific fee percentage
     */
    function createMarket(
        string memory _question,
        string memory _category,
        string memory _description,
        uint256 _endTime,
        string[] memory _outcomeDescriptions,
        uint8 _feePercentage
    ) external whenNotPaused returns (uint256) {
        require(bytes(_question).length > 0, "Question cannot be empty");
        require(_outcomeDescriptions.length >= 2, "Must have at least 2 outcomes");
        require(_endTime > block.timestamp + MIN_MARKET_DURATION, "End time too soon");
        require(_endTime < block.timestamp + MAX_MARKET_DURATION, "End time too far");
        require(_feePercentage <= 10, "Fee percentage too high"); // Max 10%
        
        marketCounter++;
        
        Market storage newMarket = markets[marketCounter];
        newMarket.id = marketCounter;
        newMarket.question = _question;
        newMarket.category = _category;
        newMarket.description = _description;
        newMarket.endTime = _endTime;
        newMarket.creator = msg.sender;
        newMarket.feePercentage = _feePercentage;
        newMarket.outcomeCount = _outcomeDescriptions.length;
        
        // Add outcomes
        for (uint256 i = 0; i < _outcomeDescriptions.length; i++) {
            newMarket.outcomes[i + 1] = Outcome({
                id: i + 1,
                description: _outcomeDescriptions[i],
                totalShares: 0,
                totalBacked: 0,
                isActive: true
            });
            
            emit OutcomeAdded(marketCounter, i + 1, _outcomeDescriptions[i]);
        }
        
        activeMarkets.push(marketCounter);
        marketsByCategory[_category].push(marketCounter);
        
        emit MarketCreated(marketCounter, _question, _endTime, msg.sender);
        
        return marketCounter;
    }
    
    /**
     * @dev Place a bet on a specific outcome
     * @param _marketId The market to bet on
     * @param _outcomeId The outcome to bet on
     * @param _amount Amount of tokens to bet
     */
    function placeBet(uint256 _marketId, uint256 _outcomeId, uint256 _amount) 
        external 
        marketExists(_marketId)
        marketActive(_marketId)
        outcomeExists(_marketId, _outcomeId)
        nonReentrant
        whenNotPaused
    {
        require(_amount >= MIN_BET_AMOUNT, "Bet amount too small");
        
        // Transfer betting tokens from user
        bettingToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Calculate shares (simplified AMM logic)
        uint256 shares = calculateShares(_marketId, _outcomeId, _amount);
        
        // Update market data
        markets[_marketId].outcomes[_outcomeId].totalShares += shares;
        markets[_marketId].outcomes[_outcomeId].totalBacked += _amount;
        markets[_marketId].totalVolume += _amount;
        
        // Update user position
        UserPosition storage position = userPositions[msg.sender][_marketId][_outcomeId];
        position.totalShares += shares;
        position.totalBacked += _amount;
        
        // Record bet
        Bet memory newBet = Bet({
            marketId: _marketId,
            outcomeId: _outcomeId,
            shares: shares,
            amountBacked: _amount,
            timestamp: block.timestamp,
            claimed: false
        });
        
        userBets[msg.sender].push(newBet);
        position.betIds.push(userBets[msg.sender].length - 1);
        
        emit BetPlaced(_marketId, _outcomeId, msg.sender, _amount, shares);
    }
    
    /**
     * @dev Calculate shares based on current market state (simplified AMM)
     * @param _marketId Market ID
     * @param _outcomeId Outcome ID
     * @param _amount Bet amount
     */
    function calculateShares(uint256 _marketId, uint256 _outcomeId, uint256 _amount) 
        internal 
        view 
        returns (uint256) 
    {
        Outcome storage outcome = markets[_marketId].outcomes[_outcomeId];
        
        // Simplified constant product formula: shares = amount / (1 + totalBacked/1e18)
        // This creates diminishing returns as more money flows to an outcome
        uint256 currentPrice = 1e18 + (outcome.totalBacked * 1e18) / (1e18 + outcome.totalBacked);
        return (_amount * 1e18) / currentPrice;
    }
    
    /**
     * @dev Resolve a market with the winning outcome
     * @param _marketId Market to resolve
     * @param _winningOutcome The winning outcome ID
     */
    function resolveMarket(uint256 _marketId, uint256 _winningOutcome) 
        external 
        marketExists(_marketId)
        marketEnded(_marketId)
        outcomeExists(_marketId, _winningOutcome)
        onlyAuthorizedResolver
        whenNotPaused
    {
        require(!markets[_marketId].isResolved, "Market already resolved");
        
        markets[_marketId].isResolved = true;
        markets[_marketId].winningOutcome = _winningOutcome;
        markets[_marketId].resolutionTime = block.timestamp;
        
        // Move from active to resolved
        _removeFromActiveMarkets(_marketId);
        resolvedMarkets.push(_marketId);
        
        emit MarketResolved(_marketId, _winningOutcome, msg.sender);
    }
    
    /**
     * @dev Claim winnings from resolved markets
     * @param _marketId The resolved market
     */
    function claimWinnings(uint256 _marketId) 
        external 
        marketExists(_marketId)
        nonReentrant
        whenNotPaused
    {
        require(markets[_marketId].isResolved, "Market not resolved yet");
        
        uint256 winningOutcome = markets[_marketId].winningOutcome;
        UserPosition storage position = userPositions[msg.sender][_marketId][winningOutcome];
        
        require(position.totalShares > 0, "No winning position");
        
        // Calculate winnings
        uint256 winnings = calculateWinnings(_marketId, msg.sender);
        require(winnings > 0, "No winnings to claim");
        
        // Mark bets as claimed
        for (uint256 i = 0; i < position.betIds.length; i++) {
            userBets[msg.sender][position.betIds[i]].claimed = true;
        }
        
        // Reset position
        position.totalShares = 0;
        position.totalBacked = 0;
        
        // Transfer winnings
        bettingToken.safeTransfer(msg.sender, winnings);
        
        emit WinningsClaimed(msg.sender, _marketId, winnings);
    }
    
    /**
     * @dev Calculate winnings for a user on a resolved market
     * @param _marketId The market ID
     * @param _user User address
     */
    function calculateWinnings(uint256 _marketId, address _user) 
        public 
        view 
        returns (uint256) 
    {
        if (!markets[_marketId].isResolved) return 0;
        
        uint256 winningOutcome = markets[_marketId].winningOutcome;
        UserPosition storage position = userPositions[_user][_marketId][winningOutcome];
        
        if (position.totalShares == 0) return 0;
        
        Market storage market = markets[_marketId];
        Outcome storage outcome = market.outcomes[winningOutcome];
        
        // Calculate proportional share of total market volume
        uint256 userShare = (position.totalShares * 1e18) / outcome.totalShares;
        uint256 totalPrizePool = market.totalVolume;
        
        // Subtract platform fee
        uint256 platformFee = (totalPrizePool * platformFeePercentage) / 100;
        uint256 netPrizePool = totalPrizePool - platformFee;
        
        return (netPrizePool * userShare) / 1e18;
    }
    
    /**
     * @dev Get market information
     * @param _marketId Market ID
     */
    function getMarket(uint256 _marketId) 
        external 
        view 
        marketExists(_marketId)
        returns (
            uint256 id,
            string memory question,
            string memory category,
            string memory description,
            uint256 endTime,
            uint256 resolutionTime,
            address creator,
            bool isResolved,
            uint256 winningOutcome,
            uint256 totalVolume,
            uint256 outcomeCount
        )
    {
        Market storage market = markets[_marketId];
        return (
            market.id,
            market.question,
            market.category,
            market.description,
            market.endTime,
            market.resolutionTime,
            market.creator,
            market.isResolved,
            market.winningOutcome,
            market.totalVolume,
            market.outcomeCount
        );
    }
    
    /**
     * @dev Get outcome information
     * @param _marketId Market ID
     * @param _outcomeId Outcome ID
     */
    function getOutcome(uint256 _marketId, uint256 _outcomeId) 
        external 
        view 
        marketExists(_marketId)
        outcomeExists(_marketId, _outcomeId)
        returns (
            uint256 id,
            string memory description,
            uint256 totalShares,
            uint256 totalBacked,
            bool isActive
        )
    {
        Outcome storage outcome = markets[_marketId].outcomes[_outcomeId];
        return (
            outcome.id,
            outcome.description,
            outcome.totalShares,
            outcome.totalBacked,
            outcome.isActive
        );
    }
    
    /**
     * @dev Get user's position in a market outcome
     * @param _user User address
     * @param _marketId Market ID
     * @param _outcomeId Outcome ID
     */
    function getUserPosition(address _user, uint256 _marketId, uint256 _outcomeId) 
        external 
        view 
        returns (uint256 shares, uint256 backed) 
    {
        UserPosition storage position = userPositions[_user][_marketId][_outcomeId];
        return (position.totalShares, position.totalBacked);
    }
    
    /**
     * @dev Get user's betting history
     * @param _user User address
     */
    function getUserBets(address _user) 
        external 
        view 
        returns (Bet[] memory) 
    {
        return userBets[_user];
    }
    
    /**
     * @dev Get active markets
     */
    function getActiveMarkets() 
        external 
        view 
        returns (uint256[] memory) 
    {
        return activeMarkets;
    }
    
    /**
     * @dev Get markets by category
     * @param _category Category name
     */
    function getMarketsByCategory(string memory _category) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return marketsByCategory[_category];
    }
    
    // Administrative functions
    function authorizeResolver(address _resolver) external onlyOwner {
        authorizedResolvers[_resolver] = true;
    }
    
    function removeResolver(address _resolver) external onlyOwner {
        authorizedResolvers[_resolver] = false;
    }
    
    function setPlatformFee(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 10, "Fee too high");
        platformFeePercentage = _feePercentage;
    }
    
    function withdrawPlatformFees(address _to, uint256 _amount) external onlyOwner {
        bettingToken.safeTransfer(_to, _amount);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Internal helper functions
    function _removeFromActiveMarkets(uint256 _marketId) internal {
        for (uint256 i = 0; i < activeMarkets.length; i++) {
            if (activeMarkets[i] == _marketId) {
                activeMarkets[i] = activeMarkets[activeMarkets.length - 1];
                activeMarkets.pop();
                break;
            }
        }
    }
}
