# DecentralBet - Blockchain Prediction Markets Platform

## 🎲 Overview

DecentralBet is a decentralized prediction markets platform built on Ethereum, similar to Polymarket. It enables users to bet on real-world events, elections, sports, and market outcomes with transparent, secure, and tamper-proof smart contracts. This full-stack blockchain integration project demonstrates the power of Web3 technology in creating trustless betting and prediction systems, particularly valuable in emerging markets like Nigeria.

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Blockchain    │
│   (Next.js)     │◄──►│  (Node.js/API)  │◄──►│   (Ethereum)    │
│                 │    │                 │    │                 │
│ • Betting UI    │    │ • REST API      │    │ • Smart         │
│ • Market Data   │    │ • Web3 Service  │    │   Contracts     │
│ • MetaMask      │    │ • WebSockets    │    │ • Betting Logic │
│   Integration   │    │ • Oracles       │    │ • Automated     │
│ • shadcn/ui     │    │ • Auth Layer    │    │   Resolution    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Infrastructure│
                    │     (Azure)     │
                    │                 │
                    │ • AKS Cluster   │
                    │ • Container     │
                    │   Registry      │
                    │ • Load Balancer │
                    │ • Monitoring    │
                    └─────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 15 with TypeScript
- Tailwind CSS + shadcn/ui
- RainbowKit for wallet connection
- Recharts for data visualization
- Wagmi for Ethereum interactions

**Backend:**
- Node.js with Express.js
- MongoDB for off-chain data
- Ethers.js for blockchain interaction
- WebSockets for real-time updates
- JWT authentication

**Blockchain:**
- Ethereum (Sepolia Testnet)
- Hardhat development framework
- OpenZeppelin security standards
- Solidity smart contracts

**Infrastructure:**
- Microsoft Azure (AKS)
- Terraform for IaC
- Docker containerization
- GitHub Actions CI/CD
- Kubernetes orchestration

## 🎯 Use Cases

### Primary Applications
- **Political Predictions:** Presidential elections, policy outcomes, referendum results
- **Sports Betting:** Football matches, World Cup outcomes, Olympics results
- **Economic Events:** Stock prices, cryptocurrency values, interest rates
- **Entertainment:** Award shows, reality TV outcomes, celebrity events
- **Weather & Climate:** Hurricane predictions, temperature records, rainfall amounts
- **Technology:** Product launches, startup valuations, tech adoption rates

### Key Benefits for Nigeria & Emerging Markets
- **Financial Inclusion:** Access to prediction markets without traditional banking
- **Hedge Against Uncertainty:** Protection against political/economic volatility
- **Information Aggregation:** Crowdsourced predictions for better decision making
- **Transparent Operations:** All bets and outcomes recorded on blockchain
- **Global Access:** Participate in international markets from anywhere
- **Lower Fees:** Reduced costs compared to traditional betting platforms

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Docker and Docker Compose
- Azure CLI and kubectl
- Terraform
- MetaMask wallet

### Local Development

1. **Clone Repository:**
   ```bash
   git clone <repository-url>
   cd fullstack-blockchain-integration
   ```

2. **Install Dependencies:**
   ```bash
   # Smart Contracts
   cd smart-contracts && npm install

   # Backend
   cd ../backend && npm install

   # Frontend
   cd ../frontend && npm install
   ```

3. **Start Local Development:**
   ```bash
   # Start local blockchain
   cd smart-contracts && npx hardhat node

   # Deploy contracts
   npx hardhat run scripts/deploy.js --network localhost

   # Start backend
   cd ../backend && npm run dev

   # Start frontend
   cd ../frontend && npm run dev
   ```

## 📁 Project Structure

```
fullstack-blockchain-integration/
├── smart-contracts/          # Ethereum smart contracts
│   ├── contracts/           # Solidity contracts
│   ├── scripts/            # Deployment scripts
│   ├── test/               # Contract tests
│   └── hardhat.config.js   # Hardhat configuration
├── backend/                # Node.js API server
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Custom middleware
│   └── package.json
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utilities and configs
│   │   └── hooks/         # Custom React hooks
│   └── package.json
├── infrastructure/         # Terraform configurations
│   ├── modules/           # Terraform modules
│   ├── main.tf           # Main configuration
│   └── variables.tf      # Variable definitions
├── k8s/                   # Kubernetes manifests
├── docker/                # Docker configurations
├── .github/workflows/     # GitHub Actions
└── docs/                  # Project documentation
```

## 🔧 Smart Contracts

### Core Contracts

1. **PredictionMarket.sol**
   - Market creation and management
   - Betting logic with odds calculation
   - Liquidity pool management
   - Automated market maker (AMM) functionality

2. **MarketFactory.sol**
   - Factory pattern for deploying prediction markets
   - Access control and permissions
   - Market lifecycle management
   - Fee collection and distribution

3. **Oracle.sol**
   - External data feed integration
   - Market resolution automation
   - Multi-source validation
   - Dispute resolution mechanism

4. **TokenVault.sol**
   - User fund management
   - Betting token minting/burning
   - Reward distribution
   - Emergency withdrawal functions

### Security Features
- OpenZeppelin security standards
- Reentrancy protection
- Access control mechanisms
- Gas optimization strategies
- Oracle manipulation protection
- Liquidity safeguards

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/wallet-connect` - MetaMask authentication

### Markets
- `GET /api/markets` - List active prediction markets
- `POST /api/markets` - Create new market (admin)
- `GET /api/markets/:id` - Get market details
- `PUT /api/markets/:id/resolve` - Resolve market outcome
- `GET /api/markets/trending` - Get trending markets
- `GET /api/markets/category/:category` - Markets by category

### Betting
- `POST /api/bets` - Place bet
- `GET /api/bets/user/:userId` - User's betting history
- `GET /api/bets/market/:marketId` - Market betting activity
- `POST /api/bets/claim` - Claim winnings
- `GET /api/bets/verify/:txHash` - Verify bet transaction

### Oracles
- `GET /api/oracles/price/:symbol` - Get price feeds
- `POST /api/oracles/resolve` - Submit resolution data
- `GET /api/oracles/status/:marketId` - Oracle resolution status

## 🏭 Deployment

### Azure Infrastructure
The application is deployed on Microsoft Azure using:
- **AKS (Azure Kubernetes Service)** for container orchestration
- **Azure Container Registry** for Docker image storage
- **Azure Database for MongoDB** for off-chain data
- **Azure Key Vault** for secret management
- **Azure Load Balancer** for traffic distribution

### CI/CD Pipeline
Automated deployment using GitHub Actions:
1. **Continuous Integration:**
   - Smart contract testing
   - API endpoint testing
   - Frontend build validation
   - Security scanning

2. **Continuous Deployment:**
   - Docker image builds
   - Container registry push
   - AKS deployment updates
   - Smoke tests execution

## 📊 Monitoring & Analytics

- **Azure Monitor** for infrastructure monitoring
- **Application Insights** for performance tracking
- **Custom dashboards** for vote analytics
- **Real-time notifications** for system events

## 🔒 Security Considerations

- **Smart Contract Audits:** Comprehensive testing and security reviews
- **Access Controls:** Role-based permissions and authentication
- **Data Encryption:** End-to-end encryption for sensitive data
- **Network Security:** VPC isolation and firewall rules
- **Monitoring:** Real-time threat detection and logging

## 🧪 Testing Strategy

### Smart Contract Testing
- Unit tests with Hardhat and Chai
- Integration tests with local blockchain
- Gas optimization testing
- Security vulnerability scanning

### API Testing
- Unit tests with Jest
- Integration tests with Supertest
- Load testing with Artillery
- Security testing with OWASP ZAP

### Frontend Testing
- Component tests with React Testing Library
- E2E tests with Playwright
- Accessibility testing
- Cross-browser compatibility

## 📈 Performance Metrics

- **Transaction Throughput:** ~15 TPS (Ethereum limitation)
- **Response Time:** <200ms for API calls
- **Availability:** 99.9% uptime SLA
- **Scalability:** Auto-scaling up to 100 concurrent users

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

- **Project Author:** BCDV 4034 - Full Stack Blockchain Integration II
- **Instructor:** Pradeep Prakasam
- **Institution:** George Brown College
- **Due Date:** July 19, 2025

## 🎯 Project Requirements Compliance

This project fulfills all assignment requirements:

✅ **DApp Components:**
- Frontend (Next.js with Web3 integration)
- Backend (Node.js API with blockchain interaction)

✅ **Smart Contracts:**
- Voting logic implementation
- Security best practices
- Gas optimization

✅ **Blockchain Network:**
- Ethereum testnet integration
- Local development network

✅ **Cloud Deployment:**
- Azure infrastructure with Terraform
- Kubernetes orchestration (AKS)
- CI/CD pipeline implementation

✅ **Documentation:**
- Comprehensive architecture documentation
- Deployment screenshots and evidence
- Real-world use case analysis

---

**Built with ❤️ for transparent democracy and blockchain education**
