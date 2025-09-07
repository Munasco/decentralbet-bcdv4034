// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./VotingContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ElectionFactory
 * @dev Factory contract for creating and managing multiple voting contracts
 * @author BCDV 4034 - George Brown College
 */
contract ElectionFactory is Ownable, ReentrancyGuard {
    
    // Events
    event VotingContractDeployed(address indexed contractAddress, address indexed creator, string name);
    event ContractOwnershipTransferred(address indexed contractAddress, address indexed newOwner);
    
    // Struct to store contract information
    struct ContractInfo {
        address contractAddress;
        address creator;
        string name;
        string description;
        uint256 deploymentTime;
        bool isActive;
    }
    
    // State variables
    uint256 public contractCounter;
    mapping(uint256 => ContractInfo) public deployedContracts;
    mapping(address => uint256[]) public creatorContracts; // creator => contract IDs
    mapping(address => bool) public authorizedDeployers;
    
    // Arrays for iteration
    uint256[] public allContracts;
    uint256[] public activeContracts;
    
    // Modifiers
    modifier onlyAuthorizedDeployer() {
        require(
            authorizedDeployers[msg.sender] || msg.sender == owner(),
            "Not authorized to deploy contracts"
        );
        _;
    }
    
    modifier contractExists(uint256 _contractId) {
        require(
            _contractId > 0 && _contractId <= contractCounter,
            "Contract does not exist"
        );
        _;
    }
    
    constructor() Ownable(msg.sender) {
        contractCounter = 0;
        // Owner is automatically authorized
        authorizedDeployers[msg.sender] = true;
    }
    
    /**
     * @dev Deploy a new VotingContract instance
     * @param _name Name for the voting contract
     * @param _description Description of the voting contract purpose
     * @return contractId ID of the deployed contract
     * @return contractAddress Address of the deployed contract
     */
    function deployVotingContract(
        string memory _name,
        string memory _description
    ) external onlyAuthorizedDeployer nonReentrant returns (uint256 contractId, address contractAddress) {
        require(bytes(_name).length > 0, "Contract name cannot be empty");
        
        // Deploy new VotingContract
        VotingContract newVotingContract = new VotingContract();
        
        contractCounter++;
        contractId = contractCounter;
        contractAddress = address(newVotingContract);
        
        // Store contract information
        deployedContracts[contractId] = ContractInfo({
            contractAddress: contractAddress,
            creator: msg.sender,
            name: _name,
            description: _description,
            deploymentTime: block.timestamp,
            isActive: true
        });
        
        // Update tracking arrays
        allContracts.push(contractId);
        activeContracts.push(contractId);
        creatorContracts[msg.sender].push(contractId);
        
        emit VotingContractDeployed(contractAddress, msg.sender, _name);
        
        return (contractId, contractAddress);
    }
    
    /**
     * @dev Transfer ownership of a deployed voting contract
     * @param _contractId ID of the contract
     * @param _newOwner Address of the new owner
     */
    function transferContractOwnership(uint256 _contractId, address _newOwner)
        external
        contractExists(_contractId)
        nonReentrant
    {
        require(_newOwner != address(0), "New owner cannot be zero address");
        
        ContractInfo storage contractInfo = deployedContracts[_contractId];
        address contractAddress = contractInfo.contractAddress;
        
        // Only contract creator or factory owner can transfer ownership
        require(
            msg.sender == contractInfo.creator || msg.sender == owner(),
            "Not authorized to transfer ownership"
        );
        
        // Transfer ownership of the VotingContract
        VotingContract votingContract = VotingContract(contractAddress);
        votingContract.transferOwnership(_newOwner);
        
        emit ContractOwnershipTransferred(contractAddress, _newOwner);
    }
    
    /**
     * @dev Deactivate a contract (mark as inactive)
     * @param _contractId ID of the contract to deactivate
     */
    function deactivateContract(uint256 _contractId)
        external
        contractExists(_contractId)
        onlyOwner
    {
        require(deployedContracts[_contractId].isActive, "Contract already inactive");
        
        deployedContracts[_contractId].isActive = false;
        
        // Remove from active contracts array
        for (uint256 i = 0; i < activeContracts.length; i++) {
            if (activeContracts[i] == _contractId) {
                activeContracts[i] = activeContracts[activeContracts.length - 1];
                activeContracts.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Reactivate a contract
     * @param _contractId ID of the contract to reactivate
     */
    function reactivateContract(uint256 _contractId)
        external
        contractExists(_contractId)
        onlyOwner
    {
        require(!deployedContracts[_contractId].isActive, "Contract already active");
        
        deployedContracts[_contractId].isActive = true;
        activeContracts.push(_contractId);
    }
    
    /**
     * @dev Authorize an address to deploy contracts
     * @param _deployer Address to authorize
     */
    function authorizeDeployer(address _deployer) external onlyOwner {
        require(_deployer != address(0), "Invalid deployer address");
        require(!authorizedDeployers[_deployer], "Deployer already authorized");
        
        authorizedDeployers[_deployer] = true;
    }
    
    /**
     * @dev Revoke authorization for an address to deploy contracts
     * @param _deployer Address to revoke authorization
     */
    function revokeDeployer(address _deployer) external onlyOwner {
        require(authorizedDeployers[_deployer], "Deployer not authorized");
        require(_deployer != owner(), "Cannot revoke owner authorization");
        
        authorizedDeployers[_deployer] = false;
    }
    
    /**
     * @dev Get contract information
     * @param _contractId ID of the contract
     */
    function getContractInfo(uint256 _contractId)
        external
        view
        contractExists(_contractId)
        returns (ContractInfo memory)
    {
        return deployedContracts[_contractId];
    }
    
    /**
     * @dev Get contracts created by a specific address
     * @param _creator Address of the creator
     */
    function getCreatorContracts(address _creator)
        external
        view
        returns (uint256[] memory)
    {
        return creatorContracts[_creator];
    }
    
    /**
     * @dev Get all deployed contracts
     */
    function getAllContracts() external view returns (uint256[] memory) {
        return allContracts;
    }
    
    /**
     * @dev Get active contracts only
     */
    function getActiveContracts() external view returns (uint256[] memory) {
        return activeContracts;
    }
    
    /**
     * @dev Get contract addresses for active contracts
     */
    function getActiveContractAddresses() external view returns (address[] memory) {
        address[] memory addresses = new address[](activeContracts.length);
        
        for (uint256 i = 0; i < activeContracts.length; i++) {
            addresses[i] = deployedContracts[activeContracts[i]].contractAddress;
        }
        
        return addresses;
    }
    
    /**
     * @dev Check if an address is authorized to deploy contracts
     * @param _deployer Address to check
     */
    function isAuthorizedDeployer(address _deployer) external view returns (bool) {
        return authorizedDeployers[_deployer];
    }
    
    /**
     * @dev Get total number of contracts deployed
     */
    function getTotalContractsCount() external view returns (uint256) {
        return contractCounter;
    }
    
    /**
     * @dev Get number of active contracts
     */
    function getActiveContractsCount() external view returns (uint256) {
        return activeContracts.length;
    }
    
    /**
     * @dev Emergency function to pause a specific voting contract
     * @param _contractId ID of the contract to pause
     */
    function emergencyPauseContract(uint256 _contractId)
        external
        contractExists(_contractId)
        onlyOwner
    {
        address contractAddress = deployedContracts[_contractId].contractAddress;
        VotingContract votingContract = VotingContract(contractAddress);
        
        try votingContract.pause() {
            // Contract paused successfully
        } catch {
            // Handle case where contract might not support pause or is already paused
            revert("Failed to pause contract");
        }
    }
    
    /**
     * @dev Emergency function to unpause a specific voting contract
     * @param _contractId ID of the contract to unpause
     */
    function emergencyUnpauseContract(uint256 _contractId)
        external
        contractExists(_contractId)
        onlyOwner
    {
        address contractAddress = deployedContracts[_contractId].contractAddress;
        VotingContract votingContract = VotingContract(contractAddress);
        
        try votingContract.unpause() {
            // Contract unpaused successfully
        } catch {
            // Handle case where contract might not support unpause or is not paused
            revert("Failed to unpause contract");
        }
    }
}
