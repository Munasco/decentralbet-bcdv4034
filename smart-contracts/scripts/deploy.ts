import hre from "hardhat";

async function main() {
  console.log("🚀 Starting deployment of DecentralVote contracts...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📋 Deploying contracts with account:", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy VotingContract
  console.log("📋 Deploying VotingContract...");
  const VotingContractFactory = await hre.ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContractFactory.deploy();
  await votingContract.waitForDeployment();
  
  const votingContractAddress = await votingContract.getAddress();
  console.log("✅ VotingContract deployed to:", votingContractAddress);

  // Deploy ElectionFactory
  console.log("\n📋 Deploying ElectionFactory...");
  const ElectionFactoryFactory = await hre.ethers.getContractFactory("ElectionFactory");
  const electionFactory = await ElectionFactoryFactory.deploy();
  await electionFactory.waitForDeployment();
  
  const electionFactoryAddress = await electionFactory.getAddress();
  console.log("✅ ElectionFactory deployed to:", electionFactoryAddress);

  // Verify ownership
  console.log("\n🔍 Verifying contract ownership...");
  const votingContractOwner = await votingContract.owner();
  const electionFactoryOwner = await electionFactory.owner();
  
  console.log("📋 VotingContract owner:", votingContractOwner);
  console.log("📋 ElectionFactory owner:", electionFactoryOwner);

  // Create a sample election (optional - comment out for production)
  if (process.env.CREATE_SAMPLE_DATA === "true") {
    console.log("\n🗳️ Creating sample election...");
    
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = currentTime + (5 * 60); // 5 minutes from now
    const endTime = currentTime + (60 * 60); // 1 hour from now
    
    const createElectionTx = await votingContract.createElection(
      "Sample University Election 2024",
      "Election for Student Council President",
      startTime,
      endTime
    );
    
    await createElectionTx.wait();
    console.log("✅ Sample election created with ID: 1");

    // Add sample candidates
    console.log("👥 Adding sample candidates...");
    
    const addCandidate1Tx = await votingContract.addCandidate(
      1,
      "Alice Johnson",
      "Computer Science student with leadership experience in various clubs"
    );
    await addCandidate1Tx.wait();
    
    const addCandidate2Tx = await votingContract.addCandidate(
      1,
      "Bob Smith", 
      "Business student focused on improving campus facilities"
    );
    await addCandidate2Tx.wait();
    
    const addCandidate3Tx = await votingContract.addCandidate(
      1,
      "Charlie Brown",
      "Engineering student passionate about sustainability initiatives"
    );
    await addCandidate3Tx.wait();
    
    console.log("✅ Sample candidates added to election");

    // Register some sample voters (using deployer as sample voter)
    console.log("👤 Registering sample voter...");
    const registerVoterTx = await votingContract.registerVoter(1, deployer.address);
    await registerVoterTx.wait();
    console.log("✅ Sample voter registered");
  }

  // Display network information
  const network = await hre.ethers.provider.getNetwork();
  console.log("\n📡 Network Information:");
  console.log("   Network Name:", network.name);
  console.log("   Chain ID:", network.chainId);
  console.log("   Block Number:", await hre.ethers.provider.getBlockNumber());

  // Save deployment information
  const deploymentInfo = {
    network: {
      name: network.name,
      chainId: Number(network.chainId),
    },
    contracts: {
      VotingContract: {
        address: votingContractAddress,
        owner: votingContractOwner,
        deploymentBlock: await hre.ethers.provider.getBlockNumber(),
      },
      ElectionFactory: {
        address: electionFactoryAddress,
        owner: electionFactoryOwner,
        deploymentBlock: await hre.ethers.provider.getBlockNumber(),
      },
    },
    deployer: {
      address: deployer.address,
      balance: hre.ethers.formatEther(balance),
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n📄 Deployment Summary:");
  console.log("=====================================");
  console.log("VotingContract:    ", votingContractAddress);
  console.log("ElectionFactory:   ", electionFactoryAddress);
  console.log("Network:           ", network.name);
  console.log("Chain ID:          ", network.chainId);
  console.log("Deployer:          ", deployer.address);
  console.log("=====================================\n");

  // Save deployment info to file (useful for integration)
  const fs = require("fs");
  const path = require("path");
  
  const deploymentFilePath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.dirname(deploymentFilePath);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment information saved to:", deploymentFilePath);

  // Instructions for next steps
  console.log("\n🎯 Next Steps:");
  console.log("1. Verify contracts on Etherscan (if on testnet/mainnet):");
  console.log(`   npx hardhat verify ${votingContractAddress} --network ${network.name}`);
  console.log(`   npx hardhat verify ${electionFactoryAddress} --network ${network.name}`);
  console.log("\n2. Update frontend configuration with contract addresses");
  console.log("\n3. Update backend configuration with contract addresses");
  
  if (network.name === "localhost" || network.name === "hardhat") {
    console.log("\n🔧 Local Development:");
    console.log("   - Contract addresses are available for frontend integration");
    console.log("   - Use these addresses in your Next.js app configuration");
    console.log("   - Run 'npm test' to verify contract functionality");
  }

  console.log("\n✨ Deployment completed successfully!");
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
