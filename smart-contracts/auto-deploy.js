#!/usr/bin/env node

const { execSync } = require('child_process');

const WALLET_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

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
    console.log('❌ Error checking balance:', error.message);
  }
  return 0;
}

async function deployContracts() {
  console.log('\n🚀 Deploying DecentralBet to Sepolia...');
  
  try {
    execSync('npm run deploy:sepolia', {
      stdio: 'inherit'
    });
    console.log('\n✅ Deployment completed successfully!');
    
    // Show deployment info
    console.log('\n📋 Next Steps:');
    console.log('1. Check deployments/sepolia.json for contract addresses');
    console.log('2. Environment files have been updated automatically');
    console.log('3. Start the backend: cd ../backend && npm start');
    console.log('4. Start the frontend: cd ../frontend && npm run dev');
    
    return true;
  } catch (error) {
    console.log('\n❌ Deployment failed. Please check the error above.');
    return false;
  }
}

async function main() {
  console.log('🎯 DecentralBet Auto-Deploy Monitor');
  console.log('==================================');
  console.log(`👛 Wallet: ${WALLET_ADDRESS}`);
  console.log('🔗 Network: Sepolia Testnet');
  console.log('⚡ Provider: Alchemy');
  
  console.log('\n⏳ Checking current balance...');
  
  let attempts = 0;
  const maxAttempts = 60; // 10 minutes with 10-second intervals
  
  while (attempts < maxAttempts) {
    const balance = await checkBalance();
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`[${timestamp}] Balance: ${balance.toFixed(6)} ETH`);
    
    if (balance >= 0.01) { // Need at least 0.01 ETH for deployment
      console.log('\n💰 Sufficient balance detected!');
      const success = await deployContracts();
      
      if (success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    }
    
    if (attempts === 0) {
      console.log('\n💡 No balance yet. Please get Sepolia ETH from:');
      console.log('   🔗 https://www.alchemy.com/faucets/ethereum-sepolia');
      console.log(`   📋 Address: ${WALLET_ADDRESS}`);
      console.log('\n⌛ Monitoring every 10 seconds...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    attempts++;
  }
  
  console.log('\n⏰ Timeout reached. Please get testnet ETH and run again.');
  console.log('💡 Once you have ETH, simply run: npm run deploy:sepolia');
}

if (require.main === module) {
  main().catch(console.error);
}
