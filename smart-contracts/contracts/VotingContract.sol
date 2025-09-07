// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title VotingContract
 * @dev Smart contract for decentralized voting with transparency and security
 * @author BCDV 4034 - George Brown College
 */
contract VotingContract is Ownable, ReentrancyGuard, Pausable {
    
    // Events
    event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name);
    event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, address indexed voter);
    event ElectionEnded(uint256 indexed electionId, uint256 winningCandidateId);
    event VoterRegistered(address indexed voter, uint256 indexed electionId);
    
    // Structs
    struct Election {
        uint256 id;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isFinalized;
        uint256 totalVotes;
        uint256 candidateCount;
        address creator;
    }
    
    struct Candidate {
        uint256 id;
        string name;
        string description;
        uint256 voteCount;
        bool isActive;
    }
    
    struct Vote {
        address voter;
        uint256 electionId;
        uint256 candidateId;
        uint256 timestamp;
    }
    
    // State variables
    uint256 public electionCounter;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates; // electionId => candidateId => Candidate
    mapping(uint256 => mapping(address => bool)) public hasVoted; // electionId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) public registeredVoters; // electionId => voter => isRegistered
    mapping(address => Vote[]) public voterHistory;
    
    // Arrays for iteration
    uint256[] public activeElections;
    mapping(uint256 => uint256[]) public electionCandidates; // electionId => candidateIds
    
    // Modifiers
    modifier electionExists(uint256 _electionId) {
        require(_electionId > 0 && _electionId <= electionCounter, "Election does not exist");
        _;
    }
    
    modifier electionActive(uint256 _electionId) {
        require(elections[_electionId].isActive, "Election is not active");
        require(block.timestamp >= elections[_electionId].startTime, "Election has not started yet");
        require(block.timestamp <= elections[_electionId].endTime, "Election has ended");
        _;
    }
    
    modifier onlyRegisteredVoter(uint256 _electionId) {
        require(registeredVoters[_electionId][msg.sender], "Voter is not registered for this election");
        _;
    }
    
    modifier hasNotVoted(uint256 _electionId) {
        require(!hasVoted[_electionId][msg.sender], "Voter has already voted in this election");
        _;
    }
    
    modifier candidateExists(uint256 _electionId, uint256 _candidateId) {
        require(candidates[_electionId][_candidateId].id != 0, "Candidate does not exist");
        require(candidates[_electionId][_candidateId].isActive, "Candidate is not active");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        electionCounter = 0;
    }
    
    /**
     * @dev Create a new election
     * @param _title Title of the election
     * @param _description Description of the election
     * @param _startTime Start time of the election (Unix timestamp)
     * @param _endTime End time of the election (Unix timestamp)
     */
    function createElection(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(bytes(_title).length > 0, "Election title cannot be empty");
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        
        electionCounter++;
        
        elections[electionCounter] = Election({
            id: electionCounter,
            title: _title,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            isActive: true,
            isFinalized: false,
            totalVotes: 0,
            candidateCount: 0,
            creator: msg.sender
        });
        
        activeElections.push(electionCounter);
        
        emit ElectionCreated(electionCounter, _title, _startTime, _endTime);
        
        return electionCounter;
    }
    
    /**
     * @dev Add a candidate to an election
     * @param _electionId ID of the election
     * @param _name Name of the candidate
     * @param _description Description of the candidate
     */
    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) external onlyOwner electionExists(_electionId) whenNotPaused {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        require(block.timestamp < elections[_electionId].startTime, "Cannot add candidates after election starts");
        
        elections[_electionId].candidateCount++;
        uint256 candidateId = elections[_electionId].candidateCount;
        
        candidates[_electionId][candidateId] = Candidate({
            id: candidateId,
            name: _name,
            description: _description,
            voteCount: 0,
            isActive: true
        });
        
        electionCandidates[_electionId].push(candidateId);
        
        emit CandidateAdded(_electionId, candidateId, _name);
    }
    
    /**
     * @dev Register a voter for an election
     * @param _electionId ID of the election
     * @param _voter Address of the voter to register
     */
    function registerVoter(uint256 _electionId, address _voter) 
        external 
        onlyOwner 
        electionExists(_electionId) 
        whenNotPaused 
    {
        require(_voter != address(0), "Invalid voter address");
        require(!registeredVoters[_electionId][_voter], "Voter is already registered");
        require(block.timestamp < elections[_electionId].endTime, "Election has ended");
        
        registeredVoters[_electionId][_voter] = true;
        
        emit VoterRegistered(_voter, _electionId);
    }
    
    /**
     * @dev Cast a vote in an election
     * @param _electionId ID of the election
     * @param _candidateId ID of the candidate to vote for
     */
    function castVote(uint256 _electionId, uint256 _candidateId) 
        external 
        electionExists(_electionId)
        electionActive(_electionId)
        onlyRegisteredVoter(_electionId)
        hasNotVoted(_electionId)
        candidateExists(_electionId, _candidateId)
        nonReentrant
        whenNotPaused
    {
        // Mark voter as having voted
        hasVoted[_electionId][msg.sender] = true;
        
        // Increment candidate vote count
        candidates[_electionId][_candidateId].voteCount++;
        
        // Increment total votes for the election
        elections[_electionId].totalVotes++;
        
        // Record vote in voter history
        voterHistory[msg.sender].push(Vote({
            voter: msg.sender,
            electionId: _electionId,
            candidateId: _candidateId,
            timestamp: block.timestamp
        }));
        
        emit VoteCast(_electionId, _candidateId, msg.sender);
    }
    
    /**
     * @dev Finalize an election (can only be called after election ends)
     * @param _electionId ID of the election to finalize
     */
    function finalizeElection(uint256 _electionId) 
        external 
        onlyOwner 
        electionExists(_electionId) 
        whenNotPaused 
    {
        require(block.timestamp > elections[_electionId].endTime, "Election is still ongoing");
        require(!elections[_electionId].isFinalized, "Election already finalized");
        
        elections[_electionId].isActive = false;
        elections[_electionId].isFinalized = true;
        
        // Find winning candidate
        uint256 winningCandidateId = getWinningCandidate(_electionId);
        
        emit ElectionEnded(_electionId, winningCandidateId);
    }
    
    /**
     * @dev Get the winning candidate of an election
     * @param _electionId ID of the election
     * @return candidateId ID of the winning candidate
     */
    function getWinningCandidate(uint256 _electionId) 
        public 
        view 
        electionExists(_electionId) 
        returns (uint256) 
    {
        uint256 winningVoteCount = 0;
        uint256 winningCandidateId = 0;
        
        for (uint256 i = 1; i <= elections[_electionId].candidateCount; i++) {
            if (candidates[_electionId][i].voteCount > winningVoteCount) {
                winningVoteCount = candidates[_electionId][i].voteCount;
                winningCandidateId = i;
            }
        }
        
        return winningCandidateId;
    }
    
    /**
     * @dev Get election details
     * @param _electionId ID of the election
     */
    function getElection(uint256 _electionId) 
        external 
        view 
        electionExists(_electionId) 
        returns (Election memory) 
    {
        return elections[_electionId];
    }
    
    /**
     * @dev Get candidate details
     * @param _electionId ID of the election
     * @param _candidateId ID of the candidate
     */
    function getCandidate(uint256 _electionId, uint256 _candidateId) 
        external 
        view 
        electionExists(_electionId) 
        candidateExists(_electionId, _candidateId)
        returns (Candidate memory) 
    {
        return candidates[_electionId][_candidateId];
    }
    
    /**
     * @dev Get all candidates for an election
     * @param _electionId ID of the election
     */
    function getElectionCandidates(uint256 _electionId) 
        external 
        view 
        electionExists(_electionId) 
        returns (uint256[] memory) 
    {
        return electionCandidates[_electionId];
    }
    
    /**
     * @dev Get election results
     * @param _electionId ID of the election
     */
    function getElectionResults(uint256 _electionId) 
        external 
        view 
        electionExists(_electionId) 
        returns (uint256[] memory candidateIds, uint256[] memory voteCounts) 
    {
        uint256 candidateCount = elections[_electionId].candidateCount;
        candidateIds = new uint256[](candidateCount);
        voteCounts = new uint256[](candidateCount);
        
        for (uint256 i = 0; i < candidateCount; i++) {
            candidateIds[i] = i + 1;
            voteCounts[i] = candidates[_electionId][i + 1].voteCount;
        }
        
        return (candidateIds, voteCounts);
    }
    
    /**
     * @dev Get voter history
     * @param _voter Address of the voter
     */
    function getVoterHistory(address _voter) 
        external 
        view 
        returns (Vote[] memory) 
    {
        return voterHistory[_voter];
    }
    
    /**
     * @dev Check if voter is registered for an election
     * @param _electionId ID of the election
     * @param _voter Address of the voter
     */
    function isVoterRegistered(uint256 _electionId, address _voter) 
        external 
        view 
        returns (bool) 
    {
        return registeredVoters[_electionId][_voter];
    }
    
    /**
     * @dev Check if voter has voted in an election
     * @param _electionId ID of the election
     * @param _voter Address of the voter
     */
    function hasVoterVoted(uint256 _electionId, address _voter) 
        external 
        view 
        returns (bool) 
    {
        return hasVoted[_electionId][_voter];
    }
    
    /**
     * @dev Get active elections
     */
    function getActiveElections() 
        external 
        view 
        returns (uint256[] memory) 
    {
        return activeElections;
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
