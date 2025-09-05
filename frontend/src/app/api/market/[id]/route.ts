import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'
import { CONTRACTS, PREDICTION_MARKET_ABI } from '../../../../config/contracts'

// Create a public client to read from the blockchain
const publicClient = createPublicClient({
  chain: hardhat,
  transport: http('http://localhost:8545'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const marketId = parseInt(id)
    
    if (isNaN(marketId) || marketId <= 0) {
      return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 })
    }

    // Fetch market data from blockchain
    const marketData = await publicClient.readContract({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getMarket',
      args: [BigInt(marketId)],
    }) as [bigint, string, string, string, bigint, bigint, string, boolean, bigint, bigint, bigint]

    // Structure the response - convert BigInt to string for JSON serialization
    const market = {
      id: Number(marketData[0]),
      question: marketData[1],
      category: marketData[2],
      description: marketData[3],
      endTime: Number(marketData[4]),
      resolutionTime: Number(marketData[5]),
      creator: marketData[6],
      isResolved: marketData[7],
      winningOutcome: Number(marketData[8]),
      totalVolume: marketData[9].toString(), // Convert BigInt to string
      outcomeCount: Number(marketData[10]),
    }

    return NextResponse.json(market)
  } catch (error) {
    console.error('Error fetching market data:', error)
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }
}
