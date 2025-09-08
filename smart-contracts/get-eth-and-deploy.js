const https = require('https');
const { execSync } = require('child_process');

const WALLET_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

console.log('🚀 DecentralBet Auto-Deploy Script');
console.log('=================================');
console.log(`Wallet: ${WALLET_ADDRESS}`);

async function checkBalance() {
  try {
    const result = execSync(`curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["${WALLET_ADDRESS}","latest"],"id":1}' https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g`, {encoding: 'utf8'});
    const data = JSON.parse(result);
    if (data.result) {
      const balanceWei = parseInt(data.result, 16);
      const balanceEth = balanceWei / Math.pow(10, 18);
      return balanceEth;
    }
  } catch (error) {
    console.log('Error checking balance:', error.message);
  }
  return 0;
}

async function requestTestnetETH() {
  console.log('\n💰 Requesting testnet ETH from multiple faucets...');
  
  const faucets = [
    'https://sepoliafaucet.com/',
    'https://www.alchemy.com/faucets/ethereum-sepolia',
    'https://faucets.chain.link/sepolia',
    'https://sepolia-faucet.pk910.de/'
  ];
  
  console.log('📍 Please manually get testnet ETH from:');
  faucets.forEach((faucet, i) => {
    console.log(`   ${i + 1}. ${faucet}`);
  });
  
  console.log(`\n🔑 Use wallet address: ${WALLET_ADDRESS}`);
  console.log('\n⏳ Waiting for testnet ETH... (checking every 10 seconds)');
  
  // Poll for balance every 10 seconds
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    const balance = await checkBalance();
    console.log(`   Check ${attempts + 1}/${maxAttempts}: Balance = ${balance.toFixed(6)} ETH`);
    
    if (balance > 0.01) { // Need at least 0.01 ETH for deployment
      console.log('✅ Sufficient balance received!');
      return true;
    }
    
    attempts++;
  }
  
  console.log('❌ Timeout waiting for testnet ETH. Please get some manually and run deploy again.');
  return false;
}

async function deployContracts() {
  console.log('\n🔧 Deploying smart contracts to Sepolia...');
  
  try {
    const result = execSync('npm run deploy:sepolia', {
      encoding: 'utf8',
      stdio: 'inherit'
    });
    console.log('✅ Smart contracts deployed successfully!');
    return true;
  } catch (error) {
    console.log('❌ Deployment failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n⚡ Step 1: Checking current balance...');
  const currentBalance = await checkBalance();
  console.log(`Current balance: ${currentBalance.toFixed(6)} ETH`);
  
  if (currentBalance < 0.01) {
    const success = await requestTestnetETH();
    if (!success) {
      process.exit(1);
    }
  } else {
    console.log('✅ Sufficient balance available!');
  }
  
  console.log('\n⚡ Step 2: Deploying contracts...');
  const deployed = await deployContracts();
  
  if (deployed) {
    console.log('\n🎉 Deployment completed successfully!');
    console.log('Next steps:');
    console.log('1. Contract addresses have been saved to deployments/sepolia.json');
    console.log('2. Environment files have been updated');
    console.log('3. Ready to start backend and frontend!');
  }
}

main().catch(console.error);
