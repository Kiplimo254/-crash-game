import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { socketService } from '../services/socket';

interface GameState {
  multiplier: number;
  phase: 'betting' | 'in_progress' | 'crashed';
  roundId: number | null;
  isConnected: boolean;
  error: string | null;
  balance: number;
  bets: Array<{
    id: number;
    amount: number;
    multiplier: number;
    won: boolean;
  }>;
}

interface GameContextType {
  gameState: GameState;
  placeBet: (amount: number) => Promise<void>;
  cashout: (betId: number) => Promise<void>;
  isConnected: boolean;
  error: string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider: React.FC<{ 
  children: React.ReactNode;
  user?: { username: string; balance: number } | null;
  isAuthenticated?: boolean;
}> = ({ children, user, isAuthenticated }) => {
  const [gameState, setGameState] = useState<GameState>({
    multiplier: 1.0,
    phase: 'betting',
    roundId: null,
    isConnected: false,
    error: null,
    balance: user?.balance || 0,
    bets: []
  });

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    socketService.initialize(token);

    // ✅ Unified game state from backend
    socketService.on('game_state', (data) => {
      setGameState(prev => ({
        ...prev,
        multiplier: data.multiplier ?? prev.multiplier,
        phase: data.phase ?? prev.phase,
        roundId: data.round_id ?? prev.roundId,
        isConnected: true,
        error: null
      }));
    });

    // ✅ Bet placed
    socketService.on('bet_placed', (data) => {
      setGameState(prev => ({
        ...prev,
        bets: [...prev.bets, {
          id: data.bet_id,
          amount: data.amount,
          multiplier: prev.multiplier,
          won: false
        }]
      }));
      toast.success(`Bet placed: $${data.amount}`);
    });

    socketService.on('bet_error', (data) => {
      toast.error(data.message);
    });

    // ✅ Cashout
    socketService.on('cashout_success', (data) => {
      setGameState(prev => ({
        ...prev,
        balance: data.new_balance,
        bets: prev.bets.map(bet => 
          bet.id === data.bet_id 
            ? { ...bet, won: true, multiplier: data.cashout_multiplier }
            : bet
        )
      }));
      toast.success(`Cashed out at ${data.cashout_multiplier}x`);
    });

    socketService.on('cashout_error', (data) => {
      toast.error(data.message);
    });

    // ✅ Initial connection state
    setGameState(prev => ({
      ...prev,
      isConnected: socketService.isConnected(),
      error: null
    }));

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  const placeBet = async (amount: number) => {
    if (!isAuthenticated || !user) {
      toast.error('Please log in to place a bet.');
      return;
    }
    if (!socketService.isConnected()) {
      throw new Error('Not connected to game server');
    }
    if (amount > gameState.balance) {
      toast.error('Insufficient balance');
      return;
    }
    socketService.emit('place_bet', { amount });
  };

  const cashout = async (betId: number) => {
    if (!isAuthenticated || !user) {
      toast.error('Please log in to cash out.');
      return;
    }
    if (!socketService.isConnected()) {
      throw new Error('Not connected to game server');
    }
    socketService.emit('cashout', { bet_id: betId });
  };

  return (
    <GameContext.Provider 
      value={{ 
        gameState, 
        placeBet, 
        cashout, 
        isConnected: gameState.isConnected,
        error: gameState.error
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
