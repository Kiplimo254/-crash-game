import { io, Socket } from 'socket.io-client';
import { WS_GAME_URL, SOCKET_CONFIG } from '../config/env';
import { toast } from 'react-toastify';

// Debug logging
const debugLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[Socket Service ${timestamp}] ${message}`, data || '');
};

export type GameState = {
    state: 'WAITING' | 'BETTING' | 'PLAYING' | 'CRASHED';
    multiplier: number;
    elapsed_time: number;
    crash_point?: number;
};

export interface MultiplierUpdate {
    multiplier: number;
    elapsed_time: number;
}

export interface GameCrash {
    crash_point: number;
    round_id: number;
}

export interface BetPlaced {
    id: string;
    user_id: string;
    amount: number;
    created_at: string;
}

export interface BetCashout {
    bet_id: string;
    multiplier: number;
    amount: number;
    created_at: string;
}

export interface GameRound {
    id: string;
    state: GameState;
    bets: BetPlaced[];
    cashouts: BetCashout[];
    created_at: string;
    crash_point?: number;
}

class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;
    private connectionAttempts = 0;
    private readonly MAX_RETRIES = 5;
    private readonly RECONNECT_DELAY = 1000;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private lastError: string | null = null;

    private constructor() {
        debugLog('Socket service initialized');
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    private handleOnline() {
        debugLog('Network online');
        if (!this.socket?.connected) {
            this.connect();
        }
    }

    private handleOffline() {
        debugLog('Network offline');
        this.lastError = 'Network connection lost';
        toast.warning('Network connection lost. Waiting for connection...');
    }

    public initialize(token?: string): void {
        debugLog('Initializing socket service', {
            wsUrl: WS_GAME_URL,
            config: SOCKET_CONFIG
        });
        
        if (this.socket?.connected) {
            debugLog('Socket already connected');
            return;
        }
        
        this.connectionAttempts = 0;
        this.connect();
    }

    public connect(): void {
        if (this.socket?.connected) {
            debugLog('Connection attempt blocked - already connected');
            return;
        }

        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Increment connection attempts before trying
        this.connectionAttempts++;
        
        debugLog('Attempting connection', {
            wsUrl: WS_GAME_URL,
            attempts: this.connectionAttempts,
            config: SOCKET_CONFIG
        });

        // Disconnect existing socket if any
        if (this.socket) {
            debugLog('Cleaning up existing socket');
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        try {
            const socketOptions = {
                ...SOCKET_CONFIG,
                reconnection: true,
                reconnectionAttempts: this.MAX_RETRIES - this.connectionAttempts,
                reconnectionDelay: Math.min(1000 * Math.pow(2, this.connectionAttempts - 1), 10000),
                timeout: 5000,
                forceNew: true,
                transports: ['websocket'] as ('websocket' | 'polling')[]
            };

            debugLog('Creating socket with options', {
                url: WS_GAME_URL,
                options: socketOptions
            });
            
            // Connect directly using the full WebSocket URL
            this.socket = io(WS_GAME_URL, socketOptions);
            
            // Monitor socket state
            this.socket.io.on('error', (error: Error) => {
                debugLog('Transport error', error);
            });

            this.socket.io.on('reconnect_attempt', (attempt: number) => {
                debugLog('Reconnection attempt', { attempt });
            });

            this.socket.io.on('reconnect_error', (error: Error) => {
                debugLog('Reconnection error', error);
            });

            this.socket.io.on('reconnect_failed', () => {
                debugLog('Reconnection failed');
            });

            this.setupEventHandlers();
        } catch (error) {
            debugLog('Error creating socket connection', error);
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            this.handleMaxRetries();
        }
    }

    private setupEventHandlers(): void {
        if (!this.socket) {
            debugLog('Cannot setup handlers - no socket');
            return;
        }

        // Remove any existing listeners first
        this.socket.removeAllListeners();

        // Connection events
        this.socket.on('connect', () => {
            debugLog('Socket connected successfully', {
                id: this.socket?.id,
                transport: this.socket?.io?.engine?.transport?.name,
                readyState: this.socket?.io?.engine?.readyState
            });
            this.connectionAttempts = 0;
            this.lastError = null;
            
            // Join game room after successful connection
            this.emit('game.join');
            
            toast.success('Connected to game server');
        });

        // Game state events
        this.socket.on('game_state', (state: GameState) => {
            debugLog('Game state received:', state);
            window.dispatchEvent(new CustomEvent('gameStateUpdate', { detail: state }));
        });

        // Multiplier updates
        this.socket.on('multiplier_update', (data: MultiplierUpdate) => {
            debugLog('Multiplier update:', data);
            window.dispatchEvent(new CustomEvent('multiplierUpdate', { detail: data }));
            
            // Update game state if we have an active game
            const gameState: GameState = {
                state: 'PLAYING',
                multiplier: data.multiplier,
                elapsed_time: data.elapsed_time
            };
            window.dispatchEvent(new CustomEvent('gameStateUpdate', { detail: gameState }));
        });

        this.socket.on('game_crash', (data: GameCrash) => {
            debugLog('Game crashed:', data);
            
            // Update game state to crashed
            const gameState: GameState = {
                state: 'CRASHED',
                multiplier: data.crash_point,
                elapsed_time: 0,
                crash_point: data.crash_point
            };
            
            window.dispatchEvent(new CustomEvent('gameStateUpdate', { detail: gameState }));
            window.dispatchEvent(new CustomEvent('gameCrash', { detail: data }));
            
            // Show crash notification
            toast.info(`Game crashed at ${data.crash_point.toFixed(2)}x`, {
                position: "top-center",
                autoClose: 2000
            });
        });

        this.socket.on('new_round', (round: GameRound) => {
            debugLog('New round started:', round);
            
            // Update game state to betting phase
            const gameState: GameState = {
                state: 'BETTING',
                multiplier: 1.00,
                elapsed_time: 0
            };
            
            window.dispatchEvent(new CustomEvent('gameStateUpdate', { detail: gameState }));
            window.dispatchEvent(new CustomEvent('gameRoundStart', { detail: round }));
        });

        this.socket.on('round_end', (round: GameRound) => {
            debugLog('Round ended:', round);
            window.dispatchEvent(new CustomEvent('gameRoundEnd', { detail: round }));
        });

        this.socket.on('bet_placed', (bet: BetPlaced) => {
            debugLog('Bet placed:', bet);
            window.dispatchEvent(new CustomEvent('betPlaced', { detail: bet }));
        });

        this.socket.on('bet_cashout', (cashout: BetCashout) => {
            debugLog('Bet cashed out:', cashout);
            window.dispatchEvent(new CustomEvent('betCashout', { detail: cashout }));
        });

        this.socket.on('connect_error', (error) => {
            debugLog('Connection error', {
                error,
                attempts: this.connectionAttempts,
                transport: this.socket?.io?.engine?.transport?.name
            });
            this.lastError = error.message;
            this.handleMaxRetries();
        });

        this.socket.on('disconnect', (reason) => {
            debugLog('Socket disconnected', { reason });
            if (reason === 'io server disconnect' || reason === 'io client disconnect') {
                // Server/client initiated disconnect - don't reconnect
                this.disconnect();
            } else {
                // Unexpected disconnect - attempt reconnect
                this.handleMaxRetries();
            }
        });

        // Connection monitoring
        this.socket.io.on('reconnect_attempt', (attempt) => {
            debugLog('Reconnection attempt', { attempt });
        });

        this.socket.io.on('reconnect', (attempt) => {
            debugLog('Reconnected after attempts', { attempt });
            // Request current game state after reconnection
            this.emit('get_game_state');
        });
    }

    private handleMaxRetries(): void {
        if (this.connectionAttempts >= this.MAX_RETRIES) {
            debugLog('Max reconnection attempts reached');
            this.lastError = 'Maximum reconnection attempts reached';
            toast.error('Failed to connect to game server. Please try again later.');
            this.disconnect();
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 10000);
        debugLog(`Scheduling reconnect attempt in ${delay}ms`);
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.lastError = null;
        this.connectionAttempts = 0;
    }

    public emit(event: string, data?: any): void {
        if (this.socket?.connected) {
            debugLog('Emitting event:', { event, data });
            this.socket.emit(event, data);
        } else {
            debugLog('Socket not connected, cannot emit event:', event);
            toast.error('Not connected to game server');
        }
    }

    public on(event: string, callback: (...args: any[]) => void): void {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    public off(event: string, callback?: (...args: any[]) => void): void {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    public isConnected(): boolean {
        return this.socket?.connected || false;
    }

    public getTransport(): string | null {
        return this.socket?.io?.engine?.transport?.name || null;
    }

    public getSocketId(): string | null {
        return this.socket?.id || null;
    }

    public getSocketOptions(): any {
        return SOCKET_CONFIG;
    }

    public setTransport(transports: ('polling' | 'websocket')[]): void {
        if (this.socket?.io?.opts) {
            this.socket.io.opts.transports = transports;
        }
    }

    public onAny(callback: (event: string, ...args: any[]) => void): void {
        if (this.socket) {
            this.socket.onAny(callback);
        }
    }

    public getConnectionStats(): any {
        const stats = {
            connected: this.socket?.connected || false,
            id: this.socket?.id,
            transport: this.socket?.io?.engine?.transport?.name,
            readyState: this.socket?.io?.engine?.readyState,
            attempts: this.connectionAttempts,
            lastError: this.lastError
        };
        
        debugLog('Connection stats requested', stats);
        return stats;
    }
}

export const socketService = SocketService.getInstance(); 