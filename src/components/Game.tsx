import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { toast } from 'react-toastify';

const Game: React.FC = () => {
  const { gameState, placeBet, cashout, error } = useGame();
  const [betAmount, setBetAmount] = useState(10);
  const [activeBetId, setActiveBetId] = useState<number | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Monitor connection attempts
  useEffect(() => {
    if (!gameState.isConnected && !error) {
      setConnectionAttempts(prev => prev + 1);
    } else if (gameState.isConnected) {
      setConnectionAttempts(0);
    }
  }, [gameState.isConnected, error]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1633]">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg max-w-md text-center">
          <strong className="font-bold block mb-2">Connection Error</strong>
          <span className="block mb-4">{error}</span>
          <p className="text-sm text-red-600">
            Please ensure the game server is running and accessible.
          </p>
        </div>
      </div>
    );
  }

  if (!gameState.isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1633]">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-xl mb-2">Connecting to game server...</p>
          <p className="text-sm text-gray-400">
            Attempt {connectionAttempts} of 5
          </p>
          {connectionAttempts > 2 && (
            <p className="text-sm text-yellow-400 mt-4 max-w-md mx-auto">
              Connection taking longer than expected. Please ensure the game server is running and accessible.
            </p>
          )}
        </div>
      </div>
    );
  }

  const handlePlaceBet = async () => {
    try {
      await placeBet(betAmount);
      // Store the bet ID when a bet is placed
      const latestBet = gameState.bets[gameState.bets.length - 1];
      if (latestBet) {
        setActiveBetId(latestBet.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place bet');
    }
  };

  const handleCashout = async () => {
    if (!activeBetId) {
      toast.error('No active bet to cash out');
      return;
    }
    try {
      await cashout(activeBetId);
      setActiveBetId(null); // Clear the active bet after successful cashout
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cash out');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Game Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">
              {gameState.multiplier.toFixed(2)}x
            </h2>
            <p className="text-gray-600 text-lg capitalize">
              {gameState.phase}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-gray-600">Balance</p>
              <p className="text-xl font-semibold">${gameState.balance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Round</p>
              <p className="text-xl font-semibold">#{gameState.roundId || '-'}</p>
            </div>
          </div>
        </div>

        {/* Betting Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {gameState.phase === 'betting' && (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Bet Amount
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  min="1"
                />
              </div>
              <button
                onClick={handlePlaceBet}
                className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Place Bet
              </button>
            </div>
          )}

          {gameState.phase === 'in_progress' && (
            <button
              onClick={handleCashout}
              className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cash Out @ {gameState.multiplier.toFixed(2)}x
            </button>
          )}

          {gameState.phase === 'crashed' && (
            <div className="text-center text-red-600 font-bold text-xl">
              Crashed @ {gameState.multiplier.toFixed(2)}x
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;