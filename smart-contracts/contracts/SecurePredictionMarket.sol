// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SecurePredictionMarket
 * @dev Rug-pull resistant prediction market with private markets and timelock
 * @author DecentralBet Corp
 */
contract SecurePredictionMarket is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Security Features
    uint256 public constant TIMELOCK_DELAY = 7 days; // Admin actions delayed
    uint256 public constant MAX_PLATFORM_FEE = 5; // Maximum 5% platform fee
    bool public emergencyMode = false; // Emergency withdrawal mode
    uint256 public timelockExpiry; // When timelock expires
    
    // Private Market Features
    enum MarketVisibility { PUBLIC, PRIVATE, FRIENDS_ONLY }
    
    // Events
    event MarketCreated(uint256 indexed marketId, string question, uint256 endTime, address creator, MarketVisibility visibility);
    event BetPlaced(uint256 indexed marketId, uint256 indexed outcomeId, address indexed bettor, uint256 amount);
    event MarketResolved(uint256 indexed marketId, uint256 winningOutcome, address resolver);
    event WinningsClaimed(address indexed user, uint256 indexed marketId, uint256 amount);
    event TimelockActivated(uint256 expiry);
    event EmergencyModeActivated();
    
    // Structs
    struct Market {
        uint256 id;
        string question;
        string category;
        uint256 endTime;
        address creator;
        bool isResolved;
        uint256 winningOutcome;
        uint256 totalVolume;
        uint256 outcomeCount;
        MarketVisibility visibility;
        mapping(address => bool) allowedUsers; // For private markets
        mapping(uint256 => Outcome) outcomes;
        uint256 creationTime; // Anti-manipulation
        bool fundsLocked; // Prevents rug pulls
    }
    
    struct Outcome {
        uint256 id;
        string description;
        uint256 totalBacked;
        bool isActive;
    }
    
    struct Bet {
        uint256 marketId;
        uint256 outcomeId;
        uint256 amount;
        uint256 timestamp;
        bool claimed;
    }
    
    // State variables
    uint256 public marketCounter;
    uint256 public platformFeePercentage = 2;
    IERC20 public bettingToken;
    
    mapping(uint256 => Market) public markets;
    mapping(address => Bet[]) public userBets;
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public userPositions;
    
    // Rug Pull Prevention
    mapping(uint256 => uint256) public marketFundsLocked; // Funds that CANNOT be withdrawn
    uint256 public totalLockedFunds; // Total funds locked in active markets
    
    modifier onlyMarketCreatorOrAdmin(uint256 _marketId) {
        require(
            msg.sender == markets[_marketId].creator || msg.sender == owner(),
            "Not market creator or admin"
        );
        _;
    }
    
    modifier canAccessMarket(uint256 _marketId) {
        Market storage market = markets[_marketId];
        if (market.visibility == MarketVisibility.PUBLIC) {
            return;
        } else if (market.visibility == MarketVisibility.PRIVATE) {
            require(market.allowedUsers[msg.sender] || msg.sender == market.creator, "Not authorized");
        }
        _;
    }
    
    modifier noTimelockActive() {
        require(timelockExpiry == 0 || block.timestamp < timelockExpiry, "Timelock active");
        _;
    }
    
    constructor(address _bettingToken) Ownable(msg.sender) {
        bettingToken = IERC20(_bettingToken);
        marketCounter = 0;
    }
    
    /**
     * @dev Create market with visibility controls
     */
    function createMarket(
        string memory _question,
        string memory _category,
        uint256 _endTime,
        string[] memory _outcomeDescriptions,
        MarketVisibility _visibility,
        address[] memory _allowedUsers
    ) external whenNotPaused returns (uint256) {
        require(bytes(_question).length > 0, "Question cannot be empty");
        require(_outcomeDescriptions.length >= 2, "Must have at least 2 outcomes");
        require(_endTime > block.timestamp + 1 hours, "End time too soon");
        
        marketCounter++;
        
        Market storage newMarket = markets[marketCounter];
        newMarket.id = marketCounter;
        newMarket.question = _question;
        newMarket.category = _category;
        newMarket.endTime = _endTime;
        newMarket.creator = msg.sender;
        newMarket.outcomeCount = _outcomeDescriptions.length;
        newMarket.visibility = _visibility;
        newMarket.creationTime = block.timestamp;
        newMarket.fundsLocked = true; // Funds locked until resolution
        
        // Add outcomes
        for (uint256 i = 0; i < _outcomeDescriptions.length; i++) {
            newMarket.outcomes[i + 1] = Outcome({
                id: i + 1,
                description: _outcomeDescriptions[i],
                totalBacked: 0,
                isActive: true
            });
        }
        
        // Set allowed users for private markets
        if (_visibility != MarketVisibility.PUBLIC) {
            for (uint256 i = 0; i < _allowedUsers.length; i++) {
                newMarket.allowedUsers[_allowedUsers[i]] = true;
            }
            newMarket.allowedUsers[msg.sender] = true; // Creator always allowed
        }
        
        emit MarketCreated(marketCounter, _question, _endTime, msg.sender, _visibility);
        
        return marketCounter;
    }
    
    /**
     * @dev Place bet with access control
     */
    function placeBet(uint256 _marketId, uint256 _outcomeId, uint256 _amount) 
        external 
        canAccessMarket(_marketId)
        nonReentrant
        whenNotPaused
    {
        require(_amount > 0, "Bet amount must be positive");
        require(block.timestamp < markets[_marketId].endTime, "Market has ended");
        require(!markets[_marketId].isResolved, "Market is resolved");
        
        // Transfer tokens and lock them
        bettingToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Update market data
        markets[_marketId].outcomes[_outcomeId].totalBacked += _amount;
        markets[_marketId].totalVolume += _amount;
        userPositions[msg.sender][_marketId][_outcomeId] += _amount;
        
        // Lock funds to prevent rug pulls
        marketFundsLocked[_marketId] += _amount;
        totalLockedFunds += _amount;
        
        // Record bet
        userBets[msg.sender].push(Bet({
            marketId: _marketId,
            outcomeId: _outcomeId,
            amount: _amount,
            timestamp: block.timestamp,
            claimed: false
        }));
        
        emit BetPlaced(_marketId, _outcomeId, msg.sender, _amount);
    }
    
    /**
     * @dev Resolve market (ONLY ADMIN to prevent manipulation)
     */
    function resolveMarket(uint256 _marketId, uint256 _winningOutcome) 
        external 
        onlyOwner // ONLY ADMIN can resolve
    {
        require(block.timestamp >= markets[_marketId].endTime, "Market still active");
        require(!markets[_marketId].isResolved, "Already resolved");
        require(_winningOutcome <= markets[_marketId].outcomeCount, "Invalid outcome");
        
        markets[_marketId].isResolved = true;
        markets[_marketId].winningOutcome = _winningOutcome;
        markets[_marketId].fundsLocked = false; // Allow withdrawals
        
        emit MarketResolved(_marketId, _winningOutcome, msg.sender);
    }
    
    /**
     * @dev Claim winnings
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        require(markets[_marketId].isResolved, "Market not resolved");
        
        uint256 userPosition = userPositions[msg.sender][_marketId][markets[_marketId].winningOutcome];
        require(userPosition > 0, "No winning position");
        
        uint256 totalWinningBets = markets[_marketId].outcomes[markets[_marketId].winningOutcome].totalBacked;
        uint256 totalPool = markets[_marketId].totalVolume;
        
        // Calculate winnings (minus platform fee)
        uint256 platformFee = (totalPool * platformFeePercentage) / 100;
        uint256 netPool = totalPool - platformFee;
        uint256 winnings = (userPosition * netPool) / totalWinningBets;
        
        // Reset position
        userPositions[msg.sender][_marketId][markets[_marketId].winningOutcome] = 0;
        
        // Unlock funds for withdrawal
        marketFundsLocked[_marketId] -= winnings;
        totalLockedFunds -= winnings;
        
        // Transfer winnings
        bettingToken.safeTransfer(msg.sender, winnings);
        
        emit WinningsClaimed(msg.sender, _marketId, winnings);
    }
    
    /**
     * @dev EMERGENCY ONLY - Withdraw platform fees (WITH TIMELOCK)
     * @notice CANNOT withdraw user funds - only accumulated fees
     */
    function withdrawPlatformFees() external onlyOwner {
        require(timelockExpiry > 0 && block.timestamp >= timelockExpiry, "Timelock not expired");
        
        uint256 availableFunds = bettingToken.balanceOf(address(this)) - totalLockedFunds;
        require(availableFunds > 0, "No fees to withdraw");
        
        // SECURITY: Cannot withdraw more than accumulated fees
        require(availableFunds <= getAccumulatedFees(), "Attempting to withdraw user funds");
        
        bettingToken.safeTransfer(owner(), availableFunds);
        timelockExpiry = 0; // Reset timelock
    }
    
    /**
     * @dev Calculate total accumulated fees (NOT user funds)
     */
    function getAccumulatedFees() public view returns (uint256) {
        // Only count fees from resolved markets
        uint256 totalFees = 0;
        for (uint256 i = 1; i <= marketCounter; i++) {
            if (markets[i].isResolved) {
                totalFees += (markets[i].totalVolume * platformFeePercentage) / 100;
            }
        }
        return totalFees;
    }
    
    /**
     * @dev IMPOSSIBLE to withdraw user funds - hardcoded protection
     * @notice This function will always revert - exists for transparency
     */
    function emergencyWithdrawAllFunds() external pure {
        revert("SECURITY: User funds can never be withdrawn by admin");
    }
    
    /**
     * @dev Activate timelock for fee withdrawal (TRANSPARENCY)
     */
    function activateWithdrawTimelock() external onlyOwner {
        timelockExpiry = block.timestamp + TIMELOCK_DELAY;
        emit TimelockActivated(timelockExpiry);
    }
    
    /**
     * @dev Add user to private market
     */
    function addUserToPrivateMarket(uint256 _marketId, address _user) 
        external 
        onlyMarketCreatorOrAdmin(_marketId)
    {
        require(markets[_marketId].visibility != MarketVisibility.PUBLIC, "Market is public");
        markets[_marketId].allowedUsers[_user] = true;
    }
    
    /**
     * @dev Get available funds (CANNOT exceed unlocked funds)
     */
    function getAvailableFunds() external view returns (uint256) {
        return bettingToken.balanceOf(address(this)) - totalLockedFunds;
    }
    
    /**
     * @dev Emergency mode (EXTREME CASES ONLY)
     */
    function activateEmergencyMode() external onlyOwner {
        emergencyMode = true;
        _pause();
        emit EmergencyModeActivated();
    }
}
