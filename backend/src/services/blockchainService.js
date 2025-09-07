const { ethers } = require('ethers');
const config = require('../config/config');
const logger = require('../utils/logger');

// Smart contract ABIs (simplified for example - in production, import from build artifacts)
const VOTING_CONTRACT_ABI = [
  // Events
  "event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime)",
  "event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name)",
  "event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, address indexed voter)",
  "event VoterRegistered(address indexed voter, uint256 indexed electionId)",
  "event ElectionEnded(uint256 indexed electionId, uint256 winningCandidateId)",
  
  // Read functions
  "function electionCounter() view returns (uint256)",
  "function getElection(uint256 electionId) view returns (tuple(uint256 id, string title, string description, uint256 startTime, uint256 endTime, bool isActive, bool isFinalized, uint256 totalVotes, uint256 candidateCount, address creator))",
  "function getCandidate(uint256 electionId, uint256 candidateId) view returns (tuple(uint256 id, string name, string description, uint256 voteCount, bool isActive))",
  "function getElectionResults(uint256 electionId) view returns (uint256[] memory candidateIds, uint256[] memory voteCounts)",
  "function getWinningCandidate(uint256 electionId) view returns (uint256)",
  "function isVoterRegistered(uint256 electionId, address voter) view returns (bool)",
  "function hasVoterVoted(uint256 electionId, address voter) view returns (bool)",
  "function getActiveElections() view returns (uint256[] memory)",
  "function getElectionCandidates(uint256 electionId) view returns (uint256[] memory)",
  
  // Write functions
  "function createElection(string memory title, string memory description, uint256 startTime, uint256 endTime) returns (uint256)",
  "function addCandidate(uint256 electionId, string memory name, string memory description)",
  "function registerVoter(uint256 electionId, address voter)",
  "function castVote(uint256 electionId, uint256 candidateId)",
  "function finalizeElection(uint256 electionId)",
  
  // Admin functions
  "function pause()",
  "function unpause()",
  "function owner() view returns (address)"
];

const ELECTION_FACTORY_ABI = [
  "event VotingContractDeployed(address indexed contractAddress, address indexed creator, string name)",
  "function deployVotingContract(string memory name, string memory description) returns (uint256 contractId, address contractAddress)",
  "function getContractInfo(uint256 contractId) view returns (tuple(address contractAddress, address creator, string name, string description, uint256 deploymentTime, bool isActive))",
  "function getActiveContracts() view returns (uint256[] memory)",
  "function contractCounter() view returns (uint256)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.votingContract = null;
    this.electionFactory = null;
    this.isInitialized = false;
    this.networkInfo = null;
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        logger.info('Blockchain service already initialized');
        return;
      }

      // Setup provider
      const rpcUrl = config.ethereum.network === 'sepolia' 
        ? config.ethereum.sepoliaRpcUrl 
        : config.ethereum.rpcUrl;
      
      if (!rpcUrl) {
        throw new Error('No RPC URL configured for the selected network');
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Setup signer if private key is provided
      if (config.ethereum.privateKey) {
        this.signer = new ethers.Wallet(config.ethereum.privateKey, this.provider);
        logger.info(`🔐 Wallet connected: ${this.signer.address}`);
      } else {
        logger.warn('⚠️  No private key provided. Read-only mode.');
      }

      // Get network information
      this.networkInfo = await this.provider.getNetwork();
      logger.info(`🌐 Connected to network: ${this.networkInfo.name} (Chain ID: ${this.networkInfo.chainId})`);

      // Initialize contracts if addresses are provided
      if (config.contracts.votingContract) {
        this.votingContract = new ethers.Contract(
          config.contracts.votingContract,
          VOTING_CONTRACT_ABI,
          this.signer || this.provider
        );
        logger.info(`📄 VotingContract initialized: ${config.contracts.votingContract}`);
      }

      if (config.contracts.electionFactory) {
        this.electionFactory = new ethers.Contract(
          config.contracts.electionFactory,
          ELECTION_FACTORY_ABI,
          this.signer || this.provider
        );
        logger.info(`🏭 ElectionFactory initialized: ${config.contracts.electionFactory}`);
      }

      this.isInitialized = true;
      logger.info('✅ Blockchain service initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  // Network and connection methods
  async getNetworkInfo() {
    if (!this.provider) await this.initialize();
    
    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();
    const gasPrice = await this.provider.getFeeData();
    
    return {
      name: network.name,
      chainId: network.chainId.toString(),
      blockNumber,
      gasPrice: gasPrice.gasPrice?.toString(),
      maxFeePerGas: gasPrice.maxFeePerGas?.toString()
    };
  }

  async getAccountBalance(address) {
    if (!this.provider) await this.initialize();
    
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  // Election management methods
  async createElection(title, description, startTime, endTime) {
    if (!this.votingContract || !this.signer) {
      throw new Error('Voting contract not initialized or no signer available');
    }

    try {
      logger.info('Creating election on blockchain', { title, startTime, endTime });

      const tx = await this.votingContract.createElection(
        title,
        description,
        Math.floor(startTime.getTime() / 1000),
        Math.floor(endTime.getTime() / 1000),
        {
          gasLimit: config.ethereum.gasLimit
        }
      );

      logger.logTransaction(tx.hash, 'CreateElection', { title });
      const receipt = await tx.wait();
      
      // Parse the event to get election ID
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.votingContract.interface.parseLog(log);
          return parsed.name === 'ElectionCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedEvent = this.votingContract.interface.parseLog(event);
        const electionId = parsedEvent.args.electionId.toString();
        
        logger.info('Election created successfully', { 
          electionId, 
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString()
        });
        
        return {
          electionId: parseInt(electionId),
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        };
      } else {
        throw new Error('ElectionCreated event not found in transaction receipt');
      }

    } catch (error) {
      logger.error('Failed to create election on blockchain:', error);
      throw error;
    }
  }

  async addCandidate(electionId, name, description) {
    if (!this.votingContract || !this.signer) {
      throw new Error('Voting contract not initialized or no signer available');
    }

    try {
      logger.info('Adding candidate to election', { electionId, name });

      const tx = await this.votingContract.addCandidate(
        electionId,
        name,
        description,
        {
          gasLimit: config.ethereum.gasLimit
        }
      );

      logger.logTransaction(tx.hash, 'AddCandidate', { electionId, name });
      const receipt = await tx.wait();

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Failed to add candidate:', error);
      throw error;
    }
  }

  async registerVoter(electionId, voterAddress) {
    if (!this.votingContract || !this.signer) {
      throw new Error('Voting contract not initialized or no signer available');
    }

    try {
      logger.info('Registering voter', { electionId, voterAddress });

      const tx = await this.votingContract.registerVoter(
        electionId,
        voterAddress,
        {
          gasLimit: config.ethereum.gasLimit
        }
      );

      logger.logTransaction(tx.hash, 'RegisterVoter', { electionId, voterAddress });
      const receipt = await tx.wait();

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Failed to register voter:', error);
      throw error;
    }
  }

  async castVote(electionId, candidateId, voterWallet) {
    try {
      logger.info('Casting vote', { electionId, candidateId, voter: voterWallet.address });

      // Create contract instance with voter's wallet
      const votingContractWithVoter = new ethers.Contract(
        config.contracts.votingContract,
        VOTING_CONTRACT_ABI,
        voterWallet
      );

      const tx = await votingContractWithVoter.castVote(
        electionId,
        candidateId,
        {
          gasLimit: config.ethereum.gasLimit
        }
      );

      logger.logTransaction(tx.hash, 'CastVote', { electionId, candidateId });
      const receipt = await tx.wait();

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Failed to cast vote:', error);
      throw error;
    }
  }

  // Read methods
  async getElection(electionId) {
    if (!this.votingContract) await this.initialize();
    
    try {
      const election = await this.votingContract.getElection(electionId);
      
      return {
        id: election.id.toString(),
        title: election.title,
        description: election.description,
        startTime: new Date(Number(election.startTime) * 1000),
        endTime: new Date(Number(election.endTime) * 1000),
        isActive: election.isActive,
        isFinalized: election.isFinalized,
        totalVotes: election.totalVotes.toString(),
        candidateCount: election.candidateCount.toString(),
        creator: election.creator
      };
    } catch (error) {
      logger.error('Failed to get election from blockchain:', error);
      throw error;
    }
  }

  async getCandidate(electionId, candidateId) {
    if (!this.votingContract) await this.initialize();
    
    try {
      const candidate = await this.votingContract.getCandidate(electionId, candidateId);
      
      return {
        id: candidate.id.toString(),
        name: candidate.name,
        description: candidate.description,
        voteCount: candidate.voteCount.toString(),
        isActive: candidate.isActive
      };
    } catch (error) {
      logger.error('Failed to get candidate from blockchain:', error);
      throw error;
    }
  }

  async getElectionResults(electionId) {
    if (!this.votingContract) await this.initialize();
    
    try {
      const [candidateIds, voteCounts] = await this.votingContract.getElectionResults(electionId);
      
      const results = candidateIds.map((id, index) => ({
        candidateId: id.toString(),
        voteCount: voteCounts[index].toString()
      }));

      return results;
    } catch (error) {
      logger.error('Failed to get election results from blockchain:', error);
      throw error;
    }
  }

  async getActiveElections() {
    if (!this.votingContract) await this.initialize();
    
    try {
      const activeElectionIds = await this.votingContract.getActiveElections();
      return activeElectionIds.map(id => id.toString());
    } catch (error) {
      logger.error('Failed to get active elections from blockchain:', error);
      throw error;
    }
  }

  async isVoterRegistered(electionId, voterAddress) {
    if (!this.votingContract) await this.initialize();
    
    try {
      return await this.votingContract.isVoterRegistered(electionId, voterAddress);
    } catch (error) {
      logger.error('Failed to check voter registration:', error);
      throw error;
    }
  }

  async hasVoterVoted(electionId, voterAddress) {
    if (!this.votingContract) await this.initialize();
    
    try {
      return await this.votingContract.hasVoterVoted(electionId, voterAddress);
    } catch (error) {
      logger.error('Failed to check if voter has voted:', error);
      throw error;
    }
  }

  // Utility methods
  async getTransactionReceipt(txHash) {
    if (!this.provider) await this.initialize();
    
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      logger.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  async waitForTransaction(txHash, confirmations = 1) {
    if (!this.provider) await this.initialize();
    
    try {
      return await this.provider.waitForTransaction(txHash, confirmations);
    } catch (error) {
      logger.error('Failed to wait for transaction:', error);
      throw error;
    }
  }

  // Event listening
  async setupEventListeners(eventHandlers = {}) {
    if (!this.votingContract) {
      logger.warn('Cannot setup event listeners: voting contract not initialized');
      return;
    }

    try {
      // Election Created events
      this.votingContract.on('ElectionCreated', (electionId, title, startTime, endTime, event) => {
        logger.info('ElectionCreated event received', { electionId: electionId.toString(), title });
        if (eventHandlers.onElectionCreated) {
          eventHandlers.onElectionCreated(electionId.toString(), title, startTime, endTime, event);
        }
      });

      // Vote Cast events
      this.votingContract.on('VoteCast', (electionId, candidateId, voter, event) => {
        logger.info('VoteCast event received', { 
          electionId: electionId.toString(), 
          candidateId: candidateId.toString(),
          voter
        });
        if (eventHandlers.onVoteCast) {
          eventHandlers.onVoteCast(electionId.toString(), candidateId.toString(), voter, event);
        }
      });

      // Election Ended events
      this.votingContract.on('ElectionEnded', (electionId, winningCandidateId, event) => {
        logger.info('ElectionEnded event received', { 
          electionId: electionId.toString(), 
          winningCandidateId: winningCandidateId.toString()
        });
        if (eventHandlers.onElectionEnded) {
          eventHandlers.onElectionEnded(electionId.toString(), winningCandidateId.toString(), event);
        }
      });

      logger.info('✅ Event listeners setup successfully');

    } catch (error) {
      logger.error('Failed to setup event listeners:', error);
      throw error;
    }
  }

  // Cleanup
  removeAllListeners() {
    if (this.votingContract) {
      this.votingContract.removeAllListeners();
      logger.info('🧹 All event listeners removed');
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.provider) {
        return { status: 'disconnected', error: 'Provider not initialized' };
      }

      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const balance = this.signer ? await this.provider.getBalance(this.signer.address) : null;

      return {
        status: 'connected',
        network: network.name,
        chainId: network.chainId.toString(),
        blockNumber,
        signerAddress: this.signer?.address,
        signerBalance: balance ? ethers.formatEther(balance) : null,
        votingContractAddress: config.contracts.votingContract,
        factoryContractAddress: config.contracts.electionFactory
      };
    } catch (error) {
      logger.error('Blockchain health check failed:', error);
      return { status: 'error', error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new BlockchainService();
