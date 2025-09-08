"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  useTokenBalance, 
  useTokenAllowance, 
  useTokenApproval,
  usePlaceBet,
  useTokenFaucet 
} from "@/hooks/usePredictionMarket";
import { formatUSDC } from "@/lib/decimals";

interface BettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: {
    id: number;
    question: string;
    outcomes: string[];
    yesPrice?: number;
    noPrice?: number;
  };
  selectedOutcome: {
    id: number;
    label: string;
    price?: number;
  } | null;
}

export default function BettingModal({
  isOpen,
  onClose,
  market,
  selectedOutcome,
}: BettingModalProps) {
  const { isConnected, address } = useAccount();
  const [betAmount, setBetAmount] = useState("");
  const [step, setStep] = useState<"bet" | "approve" | "confirm">("bet");

  // Blockchain hooks
  const { data: balance, refetch: refetchBalance } = useTokenBalance();
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance();
  const { getTokens, isLoading: isGettingTokens } = useTokenFaucet(() => {
    refetchBalance();
    toast.success("USDC tokens received! You can now place bets.");
  });
  
  const { approveTokens, isLoading: isApproving } = useTokenApproval(() => {
    refetchAllowance();
    setStep("confirm");
  });

  const { placeBet, isLoading: isBetting } = usePlaceBet(() => {
    // Success callback - close modal and reset state
    handleClose();
    refetchBalance();
    refetchAllowance();
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setBetAmount("");
      setStep("bet");
    }
  }, [isOpen]);

  const handleClose = () => {
    setBetAmount("");
    setStep("bet");
    onClose();
  };

  const balanceFormatted = balance ? formatUSDC(balance) : "0";
  const allowanceFormatted = allowance ? formatUSDC(allowance) : "0";
  
  const needsApproval = () => {
    if (!betAmount || !allowance) return true;
    try {
      const betAmountBigInt = BigInt(Math.floor(parseFloat(betAmount) * 1000000)); // 6 decimals
      return allowance < betAmountBigInt;
    } catch {
      return true;
    }
  };

  const canPlaceBet = () => {
    if (!betAmount || !balance) return false;
    try {
      const betAmountBigInt = BigInt(Math.floor(parseFloat(betAmount) * 1000000)); // 6 decimals
      return balance >= betAmountBigInt && parseFloat(betAmount) >= 0.01;
    } catch {
      return false;
    }
  };

  const handleBetSubmit = () => {
    if (!selectedOutcome || !canPlaceBet()) return;

    if (needsApproval()) {
      setStep("approve");
      approveTokens(betAmount);
    } else {
      setStep("confirm");
      placeBet(market.id, selectedOutcome.id, betAmount);
    }
  };

  const handleConfirmBet = () => {
    if (!selectedOutcome) return;
    placeBet(market.id, selectedOutcome.id, betAmount);
  };

  const expectedShares = () => {
    if (!betAmount || !selectedOutcome?.price) return "0";
    const amount = parseFloat(betAmount);
    const price = selectedOutcome.price;
    return (amount / price).toFixed(2);
  };

  const potentialPayout = () => {
    if (!betAmount || !expectedShares()) return "0";
    const shares = parseFloat(expectedShares());
    return shares.toFixed(2);
  };

  if (!isConnected) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
            <DialogDescription>
              Please connect your wallet to place bets on prediction markets.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Place Bet</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {market.question}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wallet Info */}
          <Card className="p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-gray-600">USDC Balance</Label>
                <div className="font-mono font-medium">{balanceFormatted} USDC</div>
              </div>
              <div>
                <Label className="text-gray-600">Approved</Label>
                <div className="font-mono font-medium">{allowanceFormatted} USDC</div>
              </div>
            </div>
            
            {balance && parseFloat(balanceFormatted) < 10 && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-gray-600 mb-2 block">Need more USDC?</Label>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => getTokens("100")}
                  disabled={isGettingTokens}
                  className="w-full"
                >
                  {isGettingTokens ? "Getting Tokens..." : "🚰 Get 100 USDC (Testnet)"}
                </Button>
              </div>
            )}
          </Card>

          {/* Betting Form */}
          {step === "bet" && (
            <>
              {/* Selected Outcome */}
              {selectedOutcome && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-sm">
                      {selectedOutcome.label}
                    </Badge>
                    {selectedOutcome.price && (
                      <span className="text-lg font-bold">
                        {(selectedOutcome.price * 100).toFixed(0)}¢
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    You're betting on: <strong>{selectedOutcome.label}</strong>
                  </p>
                </Card>
              )}

              {/* Bet Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="betAmount">Bet Amount (USDC)</Label>
                <Input
                  id="betAmount"
                  type="number"
                  placeholder="0.00"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
                <div className="flex gap-2">
                  {["1", "5", "10", "25", "50"].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount(amount)}
                      className="flex-1"
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bet Summary */}
              {betAmount && selectedOutcome && (
                <Card className="p-4 bg-blue-50">
                  <h4 className="font-medium mb-2">Bet Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Bet Amount:</span>
                      <span className="font-mono">{betAmount} USDC</span>
                    </div>
                    {selectedOutcome.price && (
                      <>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-mono">{(selectedOutcome.price * 100).toFixed(0)}¢</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected Shares:</span>
                          <span className="font-mono">{expectedShares()}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Potential Payout:</span>
                          <span className="font-mono">{potentialPayout()} USDC</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              )}

              {/* Action Button */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleBetSubmit}
                  disabled={!canPlaceBet()}
                  className="flex-1"
                >
                  {needsApproval() ? "Approve & Bet" : "Place Bet"}
                </Button>
              </div>

              {/* Warnings */}
              {betAmount && !canPlaceBet() && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {parseFloat(betAmount) < 0.01 
                    ? "Minimum bet amount is 0.01 USDC"
                    : "Insufficient USDC balance"
                  }
                </div>
              )}
            </>
          )}

          {/* Approval Step */}
          {step === "approve" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔐</span>
              </div>
              <div>
                <h3 className="text-lg font-medium">Approve USDC</h3>
                <p className="text-gray-600">
                  First, approve the prediction market contract to spend your USDC tokens.
                </p>
              </div>
              {isApproving && (
                <div className="text-blue-600">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Processing approval...</p>
                </div>
              )}
            </div>
          )}

          {/* Confirmation Step */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-lg font-medium">Confirm Your Bet</h3>
                <p className="text-gray-600">Review and confirm your bet details.</p>
              </div>

              {/* Final Summary */}
              <Card className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Outcome:</span>
                    <span className="font-medium">{selectedOutcome?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-mono">{betAmount} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potential Payout:</span>
                    <span className="font-mono font-medium">{potentialPayout()} USDC</span>
                  </div>
                </div>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("bet")} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleConfirmBet}
                  disabled={isBetting}
                  className="flex-1"
                >
                  {isBetting ? "Placing Bet..." : "Confirm Bet"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
