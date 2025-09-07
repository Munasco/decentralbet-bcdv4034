"""
Load Testing Suite for DecentralBet Application
Using Locust for performance testing and auto-scaling validation
"""

import json
import random
import time
from locust import HttpUser, task, between
from locust.contrib.fasthttp import FastHttpUser


class DecentralBetUser(HttpUser):
    """
    Simulates a user interacting with the DecentralBet application
    Tests various endpoints to validate performance and auto-scaling
    """
    
    wait_time = between(1, 5)  # Wait 1-5 seconds between requests
    
    def on_start(self):
        """Initialize user session and authenticate"""
        self.client.verify = False  # For testing with self-signed certs
        
        # Test user credentials
        self.test_user = {
            "email": f"testuser{random.randint(1, 1000)}@test.com",
            "password": "TestPassword123!"
        }
        
        # Register and login test user
        self.register_user()
        self.login()
    
    def register_user(self):
        """Register a test user"""
        response = self.client.post("/api/v1/auth/register", json={
            "email": self.test_user["email"],
            "password": self.test_user["password"],
            "name": "Test User"
        })
        
        if response.status_code == 201:
            print(f"✅ User registered: {self.test_user['email']}")
        elif response.status_code == 400 and "already exists" in response.text:
            print(f"ℹ️  User already exists: {self.test_user['email']}")
        else:
            print(f"❌ Registration failed: {response.status_code}")
    
    def login(self):
        """Login and store authentication token"""
        response = self.client.post("/api/v1/auth/login", json={
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        })
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get("token")
            self.client.headers.update({"Authorization": f"Bearer {self.auth_token}"})
            print(f"✅ User logged in: {self.test_user['email']}")
        else:
            print(f"❌ Login failed: {response.status_code}")
    
    @task(3)
    def get_markets(self):
        """Get list of prediction markets (high frequency task)"""
        self.client.get("/api/v1/markets", name="GET /markets")
    
    @task(2)
    def get_market_details(self):
        """Get details of a specific market"""
        market_id = random.randint(1, 10)  # Assuming market IDs 1-10 exist
        self.client.get(f"/api/v1/markets/{market_id}", name="GET /markets/:id")
    
    @task(1)
    def create_market(self):
        """Create a new prediction market (lower frequency)"""
        market_data = {
            "title": f"Test Market {random.randint(1, 1000)}",
            "description": "This is a test market created during load testing",
            "category": "Technology",
            "endDate": int(time.time()) + 86400,  # 24 hours from now
            "options": ["Yes", "No"]
        }
        
        self.client.post("/api/v1/markets", json=market_data, name="POST /markets")
    
    @task(2)
    def place_bet(self):
        """Place a bet on a market"""
        bet_data = {
            "marketId": random.randint(1, 10),
            "option": random.choice(["Yes", "No"]),
            "amount": random.uniform(0.001, 0.1),  # ETH amount
            "prediction": random.choice([True, False])
        }
        
        self.client.post("/api/v1/bets", json=bet_data, name="POST /bets")
    
    @task(1)
    def get_user_bets(self):
        """Get user's betting history"""
        self.client.get("/api/v1/bets/my-bets", name="GET /bets/my-bets")
    
    @task(1)
    def get_dashboard(self):
        """Get user dashboard data"""
        self.client.get("/api/v1/dashboard", name="GET /dashboard")
    
    @task(5)
    def health_check(self):
        """Health check endpoint (highest frequency)"""
        self.client.get("/health", name="GET /health")
    
    @task(1)
    def get_blockchain_status(self):
        """Check blockchain connection status"""
        self.client.get("/api/v1/oracle/blockchain-status", name="GET /blockchain-status")


class AdminUser(HttpUser):
    """
    Simulates admin operations for testing admin endpoints
    """
    
    wait_time = between(2, 8)
    weight = 1  # Lower weight means fewer admin users
    
    def on_start(self):
        """Login as admin user"""
        self.client.verify = False
        
        # Admin credentials (should be configured in environment)
        admin_data = {
            "email": "admin@decentralbet.com",
            "password": "AdminPassword123!"
        }
        
        response = self.client.post("/api/v1/auth/login", json=admin_data)
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get("token")
            self.client.headers.update({"Authorization": f"Bearer {self.auth_token}"})
    
    @task(1)
    def get_all_users(self):
        """Get all users (admin only)"""
        self.client.get("/api/v1/users", name="ADMIN - GET /users")
    
    @task(1)
    def get_system_metrics(self):
        """Get system metrics (admin only)"""
        self.client.get("/api/v1/dashboard/admin", name="ADMIN - GET /admin")


class WebsocketUser(HttpUser):
    """
    Tests WebSocket connections for real-time features
    Note: This is a simplified version - real WebSocket testing would need additional libraries
    """
    
    wait_time = between(5, 15)
    weight = 2
    
    @task
    def test_websocket_endpoint(self):
        """Test WebSocket upgrade endpoint"""
        headers = {
            "Connection": "Upgrade",
            "Upgrade": "websocket",
            "Sec-WebSocket-Key": "x3JJHMbDL1EzLkh9GBhXDw==",
            "Sec-WebSocket-Version": "13"
        }
        
        self.client.get("/socket.io/", headers=headers, name="WebSocket Connection")


# Custom load testing scenarios
class StressTestUser(FastHttpUser):
    """
    High-performance user for stress testing using FastHttpUser
    """
    
    wait_time = between(0.1, 0.5)  # Very fast requests
    weight = 1
    
    @task
    def rapid_market_requests(self):
        """Rapid-fire requests to test auto-scaling"""
        self.client.get("/api/v1/markets")
    
    @task
    def rapid_health_checks(self):
        """Rapid health check requests"""
        self.client.get("/health")


# Test configuration
class LoadTestConfig:
    """Configuration for different load testing scenarios"""
    
    @staticmethod
    def get_config():
        return {
            "scenarios": {
                "normal_load": {
                    "users": 50,
                    "spawn_rate": 5,
                    "duration": "5m",
                    "description": "Normal user load simulation"
                },
                "peak_load": {
                    "users": 200,
                    "spawn_rate": 20,
                    "duration": "10m",
                    "description": "Peak traffic simulation"
                },
                "stress_test": {
                    "users": 500,
                    "spawn_rate": 50,
                    "duration": "15m",
                    "description": "Stress test to validate auto-scaling"
                },
                "spike_test": {
                    "users": 1000,
                    "spawn_rate": 100,
                    "duration": "2m",
                    "description": "Sudden traffic spike test"
                }
            }
        }


# Custom event listeners for metrics collection
from locust import events

@events.request.add_listener
def log_request(request_type, name, response_time, response_length, exception, context, **kwargs):
    """Log request details for analysis"""
    if exception:
        print(f"❌ Request failed: {request_type} {name} - {exception}")
    elif response_time > 1000:  # Log slow requests (>1s)
        print(f"⚠️  Slow request: {request_type} {name} - {response_time}ms")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Log test start information"""
    print("🚀 Starting DecentralBet load test...")
    print(f"Target host: {environment.host}")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Log test completion and summary"""
    print("🏁 Load test completed!")
    print(f"Total requests: {environment.stats.total.num_requests}")
    print(f"Total failures: {environment.stats.total.num_failures}")
    print(f"Average response time: {environment.stats.total.avg_response_time}ms")
    print(f"95th percentile response time: {environment.stats.total.get_response_time_percentile(0.95)}ms")
