export interface PlayerInfo {
  auto: boolean;
  betted: boolean;
  cashouted: boolean;
  betAmount: number;
  cashAmount: number;
  target: number;
}

export interface UserType {
  balance: number;
  userType: boolean;
  img: string;
  userName: string;
  f: PlayerInfo;
  s: PlayerInfo;
}

export interface GameHistory {
  _id: number;
  name: string;
  betAmount: number;
  cashoutAt: number;
  cashouted: boolean;
  date: number;
}

export interface BettedUserType {
  id: string;
  name: string;
  betAmount: number;
  cashOut: number;
  cashouted: boolean;
  userId: string;
  username: string;
  amount: number;
  cashoutAt: number;
  created_at: string;
  target: number;
  balance: number;
  userType: boolean;
  img: string;
}

export interface UserStatusType {
  fbetState: boolean;
  fbetted: boolean;
  sbetState: boolean;
  sbetted: boolean;
}

export interface GameState {
  state: 'WAITING' | 'BETTING' | 'PLAYING' | 'CRASHED';
  multiplier: number;
  elapsed_time: number;
  crash_point?: number;
}

export interface GameBetLimit {
  maxBet: number;
  minBet: number;
}

export interface ContextDataType {
  myBets: GameHistory[];
  width: number;
  userInfo: UserType;
  fautoCashoutState: boolean;
  fautoCound: number;
  finState: boolean;
  fdeState: boolean;
  fsingle: boolean;
  fincrease: number;
  fdecrease: number;
  fsingleAmount: number;
  fdefaultBetAmount: number;
  sautoCashoutState: boolean;
  sautoCound: number;
  sincrease: number;
  sdecrease: number;
  ssingleAmount: number;
  sinState: boolean;
  sdeState: boolean;
  ssingle: boolean;
  sdefaultBetAmount: number;
  unityProvider: any;
  [key: `${string}${string}`]: any;
}

export interface LoadingState {
  unityLoaded: boolean;
  socketConnected: boolean;
  gameStateReceived: boolean;
  historyReceived: boolean;
  betLimitsReceived: boolean;
}

export interface ContextType {
  state: ContextDataType;
  unityState: boolean;
  unityLoading: boolean;
  currentProgress: number;
  loadingState: LoadingState;
  loadingError: string | null;
  bettedUsers: BettedUserType[];
  previousHand: BettedUserType[];
  history: number[];
  rechargeState: boolean;
  isConnected: boolean;
  currentTarget: number;
  setCurrentTarget: (value: number) => void;
  update: (attrs: Partial<ContextDataType>) => void;
  getMyBets: () => Promise<void>;
  updateUserBetState: (attrs: Partial<UserStatusType>) => void;
  maxBet: number;
  minBet: number;
  GameState: "BET" | "PLAYING" | "GAMEEND";
  currentNum: number;
  time: number;
  currentSecondNum: number;
  fbetted: boolean;
  sbetted: boolean;
  fbetState: boolean;
  sbetState: boolean;
} 