/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback } from "react";
import { useUnityContext } from "react-unity-webgl";
import { toast } from "react-toastify";
import { socketService } from './services/socket';
import { 
  ContextType, 
  ContextDataType, 
  UserStatusType, 
  LoadingState as LoadingStateType, 
  BettedUserType,
  GameState,
  GameBetLimit
} from './types/context';
import { GameRound, BetPlaced, BetCashout } from './services/socket';
import { API_BASE_URL } from './config/env';
import { ConnectionStatus } from './components/ConnectionStatus';

// Create the Context
export const Context = React.createContext<ContextType>(null!);

// Debug logging
const debugLog = (message: string, data?: any) => {
    console.log(`[Context Debug] ${message}`, data || '');
};

// Add connection lifecycle logging
let connectionAttempts = 0;
const MAX_RETRIES = 5;

// Export the cashout function
export const callCashOut = (at: number, index: "f" | "s") => {
  console.log('Attempting cashout', { at, index });
  socketService.emit("cashOut", { type: index, endTarget: at });
};

const initialLoadingState: LoadingStateType = {
  unityLoaded: false,
  socketConnected: false,
  gameStateReceived: false,
  historyReceived: false,
  betLimitsReceived: false,
};

// Add interface for Provider props
interface ProviderProps {
  children: React.ReactNode;
  user?: {
    username: string;
    balance: number;
  } | null;
  isAuthenticated?: boolean;
}

export const Provider: React.FC<ProviderProps> = ({ children, user, isAuthenticated }) => {
  const unityContext = useUnityContext({
    loaderUrl: "/unity/AirCrash.loader.js",
    dataUrl: "/unity/AirCrash.data.unityweb",
    frameworkUrl: "/unity/AirCrash.framework.js.unityweb",
    codeUrl: "/unity/AirCrash.wasm.unityweb",
  });

  const { unityProvider, isLoaded, loadingProgression } = unityContext;

  const [appState, setAppState] = useState<ContextDataType>({
  myBets: [],
  width: 1500,
  userInfo: {
    balance: 0,
    userType: false,
    img: "",
    userName: "",
    f: {
      auto: false,
      betted: false,
      cashouted: false,
      cashAmount: 0,
      betAmount: 20,
      target: 2,
    },
    s: {
      auto: false,
      betted: false,
      cashouted: false,
      cashAmount: 0,
      betAmount: 20,
      target: 2,
    },
  },
  fautoCashoutState: false,
  fautoCound: 0,
  finState: false,
  fdeState: false,
  fsingle: false,
  fincrease: 0,
  fdecrease: 0,
  fsingleAmount: 0,
  fdefaultBetAmount: 20,
  sautoCashoutState: false,
  sautoCound: 0,
  sincrease: 0,
  sdecrease: 0,
  ssingleAmount: 0,
  sinState: false,
  sdeState: false,
  ssingle: false,
  sdefaultBetAmount: 20,
    unityProvider: null,
  });

  const [loadingState, setLoadingState] = useState<LoadingStateType>(initialLoadingState);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    state: 'WAITING',
    multiplier: 1,
    elapsed_time: 0
  });

  const [currentTarget, setCurrentTarget] = useState(1);
  const [bettedUsers, setBettedUsers] = useState<BettedUserType[]>([]);
  const [previousHand, setPreviousHand] = useState<BettedUserType[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [userBetState, setUserBetState] = useState<UserStatusType>({
    fbetState: false,
    fbetted: false,
    sbetState: false,
    sbetted: false,
  });
  const [betLimit, setBetLimit] = useState<GameBetLimit>({
    maxBet: 1000,
    minBet: 1,
  });
  const [rechargeState, setRechargeState] = useState(false);

  // Update bet limits from server
  useEffect(() => {
    const fetchBetLimits = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found, using default bet limits');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/game/limits`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const limits = await response.json();
          setBetLimit({
            maxBet: limits.max_bet || 1000,
            minBet: limits.min_bet || 1
          });
          setLoadingState(prev => ({ ...prev, betLimitsReceived: true }));
        } else if (response.status === 401) {
          console.log('Unauthorized, using default bet limits');
        } else {
          console.log('Failed to fetch bet limits, using defaults');
        }
      } catch (error) {
        console.error('Failed to fetch bet limits:', error);
        // Use default limits if fetch fails
        setBetLimit({
          maxBet: 1000,
          minBet: 1
        });
      }
    };
    fetchBetLimits();
  }, []);

  // Handle insufficient balance
  useEffect(() => {
    if (user?.balance === 0) {
      setRechargeState(true);
    } else {
      setRechargeState(false);
    }
  }, [user?.balance]);

  const updateUserBetState = useCallback((attrs: Partial<UserStatusType>) => {
    setUserBetState(prev => ({ ...prev, ...attrs }));
  }, []);

  const getMyBets = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/my-bets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const bets = await response.json();
        setAppState(prev => ({ ...prev, myBets: bets }));
      }
    } catch (error) {
      console.error('Failed to fetch my bets:', error);
    }
  }, []);

  // Initialize Unity
  const initializeUnity = useCallback(async () => {
    try {
      const files = [
        "/unity/AirCrash.loader.js",
        "/unity/AirCrash.data.unityweb",
        "/unity/AirCrash.framework.js.unityweb",
        "/unity/AirCrash.wasm.unityweb"
      ];

      for (const file of files) {
        const response = await fetch(file, { method: 'HEAD' });
        if (!response.ok) {
          setLoadingError(`Unity file ${file} not found`);
          return false;
        }
      }

      setLoadingState(prev => ({ ...prev, unityLoaded: true }));
      return true;
    } catch (error) {
      console.error("Error initializing Unity:", error);
      setLoadingError("Failed to initialize Unity");
      return false;
    }
  }, []);

  // Calculate loading progress
  const calculateProgress = useCallback((steps: Record<string, boolean>): number => {
    const totalSteps = Object.keys(steps).length;
    if (totalSteps === 0) return 0;
    const completedSteps = Object.values(steps).filter(Boolean).length;
    return (completedSteps / totalSteps) * 100;
  }, []);

  // Cashout function
  const cashout = useCallback(async (betId: number) => {
    if (!socketService.isConnected()) {
      toast.error('Not connected to game server');
      return;
    }
    
    socketService.emit('cashout', { bet_id: betId });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setLoadingState(prev => ({ ...prev, unityLoaded: true }));
      setAppState(prev => ({ ...prev, unityProvider }));
    }
  }, [isLoaded, unityProvider]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socketService.initialize(token);
      setLoadingState(prev => ({ ...prev, socketConnected: true }));
    }
  }, []);

  useEffect(() => {
    const handleGameState = (event: CustomEvent<GameState>) => {
      setGameState(event.detail);
      setLoadingState(prev => ({ ...prev, gameStateReceived: true }));
    };

    const handleRoundStart = (event: CustomEvent<GameRound>) => {
      setGameState({
        state: 'BETTING',
        multiplier: 1,
        elapsed_time: 0
      });
      setBettedUsers([]);
    };

    const handleRoundEnd = (event: CustomEvent<GameRound>) => {
      setPreviousHand(bettedUsers);
      if (event.detail.crash_point) {
        setHistory(prev => [event.detail.crash_point!, ...prev].slice(0, 10));
      }
    };

    const handleBetPlaced = (event: CustomEvent<BetPlaced>) => {
      const bet = event.detail;
      setBettedUsers(prev => [...prev, {
        id: bet.id,
        name: 'Anonymous',
        betAmount: bet.amount,
        cashOut: 0,
        cashouted: false,
        userId: bet.user_id,
        username: 'Anonymous',
        amount: bet.amount,
        cashoutAt: 0,
        created_at: bet.created_at,
        target: 2.0,
        balance: 0,
        userType: false,
        img: '/assets/images/default-avatar.png'
      }]);
    };

    const handleBetCashout = (event: CustomEvent<BetCashout>) => {
      const cashout = event.detail;
      setBettedUsers(prev => prev.map(user => 
        user.id === cashout.bet_id 
          ? { ...user, cashoutAt: cashout.multiplier, cashouted: true }
          : user
      ));
    };

    window.addEventListener('gameStateUpdate', handleGameState as EventListener);
    window.addEventListener('gameRoundStart', handleRoundStart as EventListener);
    window.addEventListener('gameRoundEnd', handleRoundEnd as EventListener);
    window.addEventListener('betPlaced', handleBetPlaced as EventListener);
    window.addEventListener('betCashout', handleBetCashout as EventListener);

    return () => {
      window.removeEventListener('gameStateUpdate', handleGameState as EventListener);
      window.removeEventListener('gameRoundStart', handleRoundStart as EventListener);
      window.removeEventListener('gameRoundEnd', handleRoundEnd as EventListener);
      window.removeEventListener('betPlaced', handleBetPlaced as EventListener);
      window.removeEventListener('betCashout', handleBetCashout as EventListener);
    };
  }, [bettedUsers]);

  const contextValue: ContextType = {
    state: appState,
    unityState: loadingState.unityLoaded,
    unityLoading: !loadingState.unityLoaded,
    currentProgress: loadingProgression * 100,
    loadingState,
    loadingError,
    bettedUsers,
    previousHand,
    history,
    rechargeState,
    isConnected: loadingState.socketConnected,
    currentTarget,
    setCurrentTarget,
    update: (attrs: Partial<ContextDataType>) => setAppState(prev => ({ ...prev, ...attrs })),
    getMyBets,
    updateUserBetState,
    maxBet: betLimit.maxBet,
    minBet: betLimit.minBet,
    GameState: gameState.state === 'BETTING' ? 'BET' :
              gameState.state === 'PLAYING' ? 'PLAYING' : 'GAMEEND',
    currentNum: gameState.multiplier,
    time: gameState.elapsed_time,
    currentSecondNum: 0,
    fbetted: userBetState.fbetted,
    sbetted: userBetState.sbetted,
    fbetState: userBetState.fbetState,
    sbetState: userBetState.sbetState
  };

  return (
    <Context.Provider value={contextValue}>
      <ConnectionStatus
        isConnected={loadingState.socketConnected}
        connectionError={loadingError}
        transport={socketService.getTransport()}
        reconnectHandler={() => {
          const token = localStorage.getItem('token');
          if (token) {
            socketService.initialize(token);
          }
        }}
      />
      {children}
    </Context.Provider>
  );
};

export default Context;
