#!/usr/bin/env node

/**
 * Simple webhook server for automatic deployments
 * Run this on your Azure VM to enable automatic deployments on GitHub push
 */

const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const PORT = process.env.PORT || 3333;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const DEPLOY_SCRIPT = '/opt/decentralbet/scripts/simple-cicd.sh';
const LOG_FILE = '/var/log/decentralbet-deploy.log';

// Logging function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    
    // Also write to log file
    try {
        fs.appendFileSync(LOG_FILE, logMessage);
    } catch (err) {
        console.error('Failed to write to log file:', err.message);
    }
}

// Verify webhook signature
function verifySignature(payload, signature) {
    if (!signature) {
        return false;
    }
    
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// Execute deployment
async function deploy() {
    return new Promise((resolve, reject) => {
        log('🚀 Starting deployment...');
        
        try {
            // Make sure script is executable
            execSync(`chmod +x ${DEPLOY_SCRIPT}`);
            
            // Run the deployment script
            const output = execSync(DEPLOY_SCRIPT, { 
                encoding: 'utf8',
                timeout: 600000, // 10 minutes timeout
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });
            
            log('✅ Deployment completed successfully');
            log('Output: ' + output);
            resolve(output);
            
        } catch (error) {
            log('❌ Deployment failed: ' + error.message);
            if (error.stdout) log('STDOUT: ' + error.stdout);
            if (error.stderr) log('STDERR: ' + error.stderr);
            reject(error);
        }
    });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
        return;
    }
    
    // Deployment status endpoint
    if (req.method === 'GET' && req.url === '/status') {
        try {
            const logs = fs.readFileSync(LOG_FILE, 'utf8').split('\n').slice(-50).join('\n');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(logs);
        } catch (err) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('No logs available');
        }
        return;
    }
    
    // Manual deployment trigger
    if (req.method === 'POST' && req.url === '/deploy') {
        try {
            const output = await deploy();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Deployment completed successfully',
                output: output
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Deployment failed',
                error: error.message
            }));
        }
        return;
    }
    
    // GitHub webhook endpoint
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                // Verify signature
                const signature = req.headers['x-hub-signature-256'];
                if (!verifySignature(body, signature)) {
                    log('❌ Invalid webhook signature');
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid signature' }));
                    return;
                }\n                
                const payload = JSON.parse(body);
                \n                // Only deploy on push to main branch\n                if (payload.ref === 'refs/heads/main') {\n                    log(`📦 Received push to main branch from ${payload.pusher.name}`);\n                    log(`Commits: ${payload.commits.length}`);\n                    \n                    // Trigger deployment\n                    deploy().then(() => {\n                        log('✅ Webhook deployment completed');\n                    }).catch(error => {\n                        log('❌ Webhook deployment failed: ' + error.message);\n                    });\n                    \n                    res.writeHead(200, { 'Content-Type': 'application/json' });\n                    res.end(JSON.stringify({ \n                        message: 'Deployment triggered', \n                        ref: payload.ref,\n                        commits: payload.commits.length\n                    }));\n                } else {\n                    log(`ℹ️  Ignoring push to ${payload.ref}`);\n                    res.writeHead(200, { 'Content-Type': 'application/json' });\n                    res.end(JSON.stringify({ message: 'Ignored - not main branch' }));\n                }\n                \n            } catch (error) {\n                log('❌ Webhook error: ' + error.message);\n                res.writeHead(400, { 'Content-Type': 'application/json' });\n                res.end(JSON.stringify({ error: 'Invalid payload' }));\n            }\n        });\n        \n        return;\n    }\n    \n    // 404 for other routes\n    res.writeHead(404, { 'Content-Type': 'application/json' });\n    res.end(JSON.stringify({ error: 'Not found' }));\n});\n\n// Start server\nserver.listen(PORT, '0.0.0.0', () => {\n    log(`🌐 Webhook deployment server running on port ${PORT}`);\n    log('📋 Available endpoints:');\n    log('  POST /webhook  - GitHub webhook (requires signature)');\n    log('  POST /deploy   - Manual deployment trigger');\n    log('  GET  /health   - Health check');\n    log('  GET  /status   - View recent logs');\n    log('');\n    log(`🔗 Add this webhook URL to GitHub: http://your-vm-ip:${PORT}/webhook`);\n    log(`🔑 Use webhook secret: ${WEBHOOK_SECRET}`);\n});\n\n// Graceful shutdown\nprocess.on('SIGTERM', () => {\n    log('📡 Received SIGTERM, shutting down gracefully');\n    server.close(() => {\n        log('🛑 Server closed');\n        process.exit(0);\n    });\n});\n\nprocess.on('SIGINT', () => {\n    log('📡 Received SIGINT, shutting down gracefully');\n    server.close(() => {\n        log('🛑 Server closed');\n        process.exit(0);\n    });\n});","line_range_start":1,"line_range_end":172}}
</function_calls>

<function_results>{"file_content_after_create":{"path":"/Users/munachiernest-eze/Documents/Github/personal/fullstack-blockchain-integration/scripts/webhook-deploy.js","content":"#!/usr/bin/env node\n\n/**\n * Simple webhook server for automatic deployments\n * Run this on your Azure VM to enable automatic deployments on GitHub push\n */\n\nconst http = require('http');\nconst crypto = require('crypto');\nconst { execSync } = require('child_process');\nconst fs = require('fs');\n\n// Configuration\nconst PORT = process.env.PORT || 3333;\nconst WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';\nconst DEPLOY_SCRIPT = '/opt/decentralbet/scripts/simple-cicd.sh';\nconst LOG_FILE = '/var/log/decentralbet-deploy.log';\n\n// Logging function\nfunction log(message) {\n    const timestamp = new Date().toISOString();\n    const logMessage = `[${timestamp}] ${message}\\n`;\n    console.log(logMessage.trim());\n    \n    // Also write to log file\n    try {\n        fs.appendFileSync(LOG_FILE, logMessage);\n    } catch (err) {\n        console.error('Failed to write to log file:', err.message);\n    }\n}\n\n// Verify webhook signature\nfunction verifySignature(payload, signature) {\n    if (!signature) {\n        return false;\n    }\n    \n    const expectedSignature = 'sha256=' + crypto\n        .createHmac('sha256', WEBHOOK_SECRET)\n        .update(payload)\n        .digest('hex');\n    \n    return crypto.timingSafeEqual(\n        Buffer.from(signature),\n        Buffer.from(expectedSignature)\n    );\n}\n\n// Execute deployment\nasync function deploy() {\n    return new Promise((resolve, reject) => {\n        log('🚀 Starting deployment...');\n        \n        try {\n            // Make sure script is executable\n            execSync(`chmod +x ${DEPLOY_SCRIPT}`);\n            \n            // Run the deployment script\n            const output = execSync(DEPLOY_SCRIPT, { \n                encoding: 'utf8',\n                timeout: 600000, // 10 minutes timeout\n                maxBuffer: 10 * 1024 * 1024 // 10MB buffer\n            });\n            \n            log('✅ Deployment completed successfully');\n            log('Output: ' + output);\n            resolve(output);\n            \n        } catch (error) {\n            log('❌ Deployment failed: ' + error.message);\n            if (error.stdout) log('STDOUT: ' + error.stdout);\n            if (error.stderr) log('STDERR: ' + error.stderr);\n            reject(error);\n        }\n    });\n}\n\n// Create HTTP server\nconst server = http.createServer(async (req, res) => {\n    // Set CORS headers\n    res.setHeader('Access-Control-Allow-Origin', '*');\n    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');\n    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256');\n    \n    // Handle preflight requests\n    if (req.method === 'OPTIONS') {\n        res.writeHead(200);\n        res.end();\n        return;\n    }\n    \n    // Health check endpoint\n    if (req.method === 'GET' && req.url === '/health') {\n        res.writeHead(200, { 'Content-Type': 'application/json' });\n        res.end(JSON.stringify({\n            status: 'healthy',\n            timestamp: new Date().toISOString(),\n            uptime: process.uptime()\n        }));\n        return;\n    }\n    \n    // Deployment status endpoint\n    if (req.method === 'GET' && req.url === '/status') {\n        try {\n            const logs = fs.readFileSync(LOG_FILE, 'utf8').split('\\n').slice(-50).join('\\n');\n            res.writeHead(200, { 'Content-Type': 'text/plain' });\n            res.end(logs);\n        } catch (err) {\n            res.writeHead(200, { 'Content-Type': 'text/plain' });\n            res.end('No logs available');\n        }\n        return;\n    }\n    \n    // Manual deployment trigger\n    if (req.method === 'POST' && req.url === '/deploy') {\n        try {\n            const output = await deploy();\n            res.writeHead(200, { 'Content-Type': 'application/json' });\n            res.end(JSON.stringify({\n                success: true,\n                message: 'Deployment completed successfully',\n                output: output\n            }));\n        } catch (error) {\n            res.writeHead(500, { 'Content-Type': 'application/json' });\n            res.end(JSON.stringify({\n                success: false,\n                message: 'Deployment failed',\n                error: error.message\n            }));\n        }\n        return;\n    }\n    \n    // GitHub webhook endpoint\n    if (req.method === 'POST' && req.url === '/webhook') {\n        let body = '';\n        \n        req.on('data', chunk => {\n            body += chunk.toString();\n        });\n        \n        req.on('end', async () => {\n            try {\n                // Verify signature\n                const signature = req.headers['x-hub-signature-256'];\n                if (!verifySignature(body, signature)) {\n                    log('❌ Invalid webhook signature');\n                    res.writeHead(401, { 'Content-Type': 'application/json' });\n                    res.end(JSON.stringify({ error: 'Invalid signature' }));\n                    return;\n                }\n                \n                const payload = JSON.parse(body);\n                \n                // Only deploy on push to main branch\n                if (payload.ref === 'refs/heads/main') {\n                    log(`📦 Received push to main branch from ${payload.pusher.name}`);\n                    log(`Commits: ${payload.commits.length}`);\n                    \n                    // Trigger deployment\n                    deploy().then(() => {\n                        log('✅ Webhook deployment completed');\n                    }).catch(error => {\n                        log('❌ Webhook deployment failed: ' + error.message);\n                    });\n                    \n                    res.writeHead(200, { 'Content-Type': 'application/json' });\n                    res.end(JSON.stringify({ \n                        message: 'Deployment triggered', \n                        ref: payload.ref,\n                        commits: payload.commits.length\n                    }));\n                } else {\n                    log(`ℹ️  Ignoring push to ${payload.ref}`);\n                    res.writeHead(200, { 'Content-Type': 'application/json' });\n                    res.end(JSON.stringify({ message: 'Ignored - not main branch' }));\n                }\n                \n            } catch (error) {\n                log('❌ Webhook error: ' + error.message);\n                res.writeHead(400, { 'Content-Type': 'application/json' });\n                res.end(JSON.stringify({ error: 'Invalid payload' }));\n            }\n        });\n        \n        return;\n    }\n    \n    // 404 for other routes\n    res.writeHead(404, { 'Content-Type': 'application/json' });\n    res.end(JSON.stringify({ error: 'Not found' }));\n});\n\n// Start server\nserver.listen(PORT, '0.0.0.0', () => {\n    log(`🌐 Webhook deployment server running on port ${PORT}`);\n    log('📋 Available endpoints:');\n    log('  POST /webhook  - GitHub webhook (requires signature)');\n    log('  POST /deploy   - Manual deployment trigger');\n    log('  GET  /health   - Health check');\n    log('  GET  /status   - View recent logs');\n    log('');\n    log(`🔗 Add this webhook URL to GitHub: http://your-vm-ip:${PORT}/webhook`);\n    log(`🔑 Use webhook secret: ${WEBHOOK_SECRET}`);\n});\n\n// Graceful shutdown\nprocess.on('SIGTERM', () => {\n    log('📡 Received SIGTERM, shutting down gracefully');\n    server.close(() => {\n        log('🛑 Server closed');\n        process.exit(0);\n    });\n});\n\nprocess.on('SIGINT', () => {\n    log('📡 Received SIGINT, shutting down gracefully');\n    server.close(() => {\n        log('🛑 Server closed');\n        process.exit(0);\n    });\n});","line_range_start":1,"line_range_end":197}}
</function_calls>

<function_results>{"file_content_after_create":{"path":"/Users/munachiernest-eze/Documents/Github/personal/fullstack-blockchain-integration/scripts/webhook-deploy.js","content":"#!/usr/bin/env node\n\n/**\n * Simple webhook server for automatic deployments\n * Run this on your Azure VM to enable automatic deployments on GitHub push\n */\n\nconst http = require('http');\nconst crypto = require('crypto');\nconst { execSync } = require('child_process');\nconst fs = require('fs');\n\n// Configuration\nconst PORT = process.env.PORT || 3333;\nconst WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';\nconst DEPLOY_SCRIPT = '/opt/decentralbet/scripts/simple-cicd.sh';\nconst LOG_FILE = '/var/log/decentralbet-deploy.log';\n\n// Logging function\nfunction log(message) {\n    const timestamp = new Date().toISOString();\n    const logMessage = `[${timestamp}] ${message}\\n`;\n    console.log(logMessage.trim());\n    \n    // Also write to log file\n    try {\n        fs.appendFileSync(LOG_FILE, logMessage);\n    } catch (err) {\n        console.error('Failed to write to log file:', err.message);\n    }\n}\n\n// Verify webhook signature\nfunction verifySignature(payload, signature) {\n    if (!signature) {\n        return false;\n    }\n    \n    const expectedSignature = 'sha256=' + crypto\n        .createHmac('sha256', WEBHOOK_SECRET)\n        .update(payload)\n        .digest('hex');\n    \n    return crypto.timingSafeEqual(\n        Buffer.from(signature),\n        Buffer.from(expectedSignature)\n    );\n}\n\n// Execute deployment\nasync function deploy() {\n    return new Promise((resolve, reject) => {\n        log('🚀 Starting deployment...');\n        \n        try {\n            // Make sure script is executable\n            execSync(`chmod +x ${DEPLOY_SCRIPT}`);\n            \n            // Run the deployment script\n            const output = execSync(DEPLOY_SCRIPT, { \n                encoding: 'utf8',\n                timeout: 600000, // 10 minutes timeout\n                maxBuffer: 10 * 1024 * 1024 // 10MB buffer\n            });\n            \n            log('✅ Deployment completed successfully');\n            log('Output: ' + output);\n            resolve(output);\n            \n        } catch (error) {\n            log('❌ Deployment failed: ' + error.message);\n            if (error.stdout) log('STDOUT: ' + error.stdout);\n            if (error.stderr) log('STDERR: ' + error.stderr);\n            reject(error);\n        }\n    });\n}\n\n// Create HTTP server\nconst server = http.createServer(async (req, res) => {\n    // Set CORS headers\n    res.setHeader('Access-Control-Allow-Origin', '*');\n    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');\n    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256');\n    \n    // Handle preflight requests\n    if (req.method === 'OPTIONS') {\n        res.writeHead(200);\n        res.end();\n        return;\n    }\n    \n    // Health check endpoint\n    if (req.method === 'GET' && req.url === '/health') {\n        res.writeHead(200, { 'Content-Type': 'application/json' });\n        res.end(JSON.stringify({\n            status: 'healthy',\n            timestamp: new Date().toISOString(),\n            uptime: process.uptime()\n        }));\n        return;\n    }\n    \n    // Deployment status endpoint\n    if (req.method === 'GET' && req.url === '/status') {\n        try {\n            const logs = fs.readFileSync(LOG_FILE, 'utf8').split('\\n').slice(-50).join('\\n');\n            res.writeHead(200, { 'Content-Type': 'text/plain' });\n            res.end(logs);\n        } catch (err) {\n            res.writeHead(200, { 'Content-Type': 'text/plain' });\n            res.end('No logs available');\n        }\n        return;\n    }\n    \n    // Manual deployment trigger\n    if (req.method === 'POST' && req.url === '/deploy') {\n        try {\n            const output = await deploy();\n            res.writeHead(200, { 'Content-Type': 'application/json' });\n            res.end(JSON.stringify({\n                success: true,\n                message: 'Deployment completed successfully',\n                output: output\n            }));\n        } catch (error) {\n            res.writeHead(500, { 'Content-Type': 'application/json' });\n            res.end(JSON.stringify({\n                success: false,\n                message: 'Deployment failed',\n                error: error.message\n            }));\n        }\n        return;\n    }\n    \n    // GitHub webhook endpoint\n    if (req.method === 'POST' && req.url === '/webhook') {\n        let body = '';\n        \n        req.on('data', chunk => {\n            body += chunk.toString();\n        });\n        \n        req.on('end', async () => {\n            try {\n                // Verify signature\n                const signature = req.headers['x-hub-signature-256'];\n                if (!verifySignature(body, signature)) {\n                    log('❌ Invalid webhook signature');\n                    res.writeHead(401, { 'Content-Type': 'application/json' });\n                    res.end(JSON.stringify({ error: 'Invalid signature' }));\n                    return;\n                }\n                \n                const payload = JSON.parse(body);\n                \n                // Only deploy on push to main branch\n                if (payload.ref === 'refs/heads/main') {\n                    log(`📦 Received push to main branch from ${payload.pusher.name}`);\n                    log(`Commits: ${payload.commits.length}`);\n                    \n                    // Trigger deployment\n                    deploy().then(() => {\n                        log('✅ Webhook deployment completed');\n                    }).catch(error => {\n                        log('❌ Webhook deployment failed: ' + error.message);\n                    });\n                    \n                    res.writeHead(200, { 'Content-Type': 'application/json' });\n                    res.end(JSON.stringify({ \n                        message: 'Deployment triggered', \n                        ref: payload.ref,\n                        commits: payload.commits.length\n                    }));\n                } else {\n                    log(`ℹ️  Ignoring push to ${payload.ref}`);\n                    res.writeHead(200, { 'Content-Type': 'application/json' });\n                    res.end(JSON.stringify({ message: 'Ignored - not main branch' }));\n                }\n                \n            } catch (error) {\n                log('❌ Webhook error: ' + error.message);\n                res.writeHead(400, { 'Content-Type': 'application/json' });\n                res.end(JSON.stringify({ error: 'Invalid payload' }));\n            }\n        });\n        \n        return;\n    }\n    \n    // 404 for other routes\n    res.writeHead(404, { 'Content-Type': 'application/json' });\n    res.end(JSON.stringify({ error: 'Not found' }));\n});\n\n// Start server\nserver.listen(PORT, '0.0.0.0', () => {\n    log(`🌐 Webhook deployment server running on port ${PORT}`);\n    log('📋 Available endpoints:');\n    log('  POST /webhook  - GitHub webhook (requires signature)');\n    log('  POST /deploy   - Manual deployment trigger');\n    log('  GET  /health   - Health check');\n    log('  GET  /status   - View recent logs');\n    log('');\n    log(`🔗 Add this webhook URL to GitHub: http://your-vm-ip:${PORT}/webhook`);\n    log(`🔑 Use webhook secret: ${WEBHOOK_SECRET}`);\n});\n\n// Graceful shutdown\nprocess.on('SIGTERM', () => {\n    log('📡 Received SIGTERM, shutting down gracefully');\n    server.close(() => {\n        log('🛑 Server closed');\n        process.exit(0);\n    });\n});\n\nprocess.on('SIGINT', () => {\n    log('📡 Received SIGINT, shutting down gracefully');\n    server.close(() => {\n        log('🛑 Server closed');\n        process.exit(0);\n    });\n});","line_range_start":1,"line_range_end":197}}
</function_calls>

<function_calls>
<invoke name="run_command">
<parameter name="command">chmod +x scripts/webhook-deploy.js
