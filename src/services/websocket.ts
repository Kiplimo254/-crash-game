import { toast } from 'react-toastify';
import { WS_GAME_URL, WS_BETTING_URL } from '../config/env';

// Debug logging
const debugLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[WebSocket Service ${timestamp}] ${message}`, data || '');
};

const checkServerAvailability = async (url: string): Promise<boolean> => {
    try {
        const httpUrl = url.replace('ws://', 'http://').replace('wss://', 'https://');
        const baseUrl = httpUrl.split('/ws/')[0];
        const healthUrl = `${baseUrl}/health`;
        debugLog(`Checking server availability at ${healthUrl}`);
        await fetch(healthUrl, { 
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Accept': 'application/json' },
        });
        return true;
    } catch (error) {
        debugLog('Server availability check failed', error);
        return false;
    }
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

class WebSocketService {
    private static instance: WebSocketService;
    private ws: WebSocket | null = null;
    private connectionAttempts = 0;
    private readonly MAX_RETRIES = 5;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private lastError: string | null = null;

    private constructor() {
        debugLog('WebSocket service initialized');
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    private handleOnline() {
        debugLog('Network online');
        if (!this.isConnected()) {
            this.connect();
        }
    }

    private handleOffline() {
        debugLog('Network offline');
        this.lastError = 'Network connection lost';
        toast.warning('Network connection lost. Waiting for connection...');
    }

    public async initialize(): Promise<void> {
        debugLog('Initializing WebSocket service');
        if (this.isConnected()) {
            debugLog('WebSocket already connected');
            return;
        }
        this.connectionAttempts = 0;
        const isServerAvailable = await checkServerAvailability(WS_GAME_URL);
        if (!isServerAvailable) {
            debugLog('WebSocket server appears to be unavailable');
            this.lastError = 'Server unavailable - please check if the server is running';
            toast.error('Game server unavailable. Please try again later.');
            return;
        }
        this.connect();
    }

    public connect(): void {
        if (this.isConnected()) {
            debugLog('Connection attempt blocked - already connected');
            return;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.connectionAttempts++;
        const gameWsUrl = WS_GAME_URL;
        debugLog('Attempting connection', { wsUrl: gameWsUrl, attempts: this.connectionAttempts });
        if (this.ws) {
            debugLog('Cleaning up existing connection');
            this.ws.close();
            this.ws = null;
        }
        try {
            debugLog(`Creating WebSocket with URL: ${gameWsUrl}`);
            this.ws = new WebSocket(gameWsUrl);
            const connectionTimeout = setTimeout(() => {
                if (this.ws?.readyState !== WebSocket.OPEN) {
                    debugLog('Connection timeout');
                    this.lastError = 'Connection timeout';
                    this.ws?.close();
                }
            }, 5000);
            this.ws.onopen = () => {
                clearTimeout(connectionTimeout);
                debugLog('WebSocket connected successfully', {
                    readyState: this.ws?.readyState,
                    url: this.ws?.url
                });
                this.connectionAttempts = 0;
                this.lastError = null;
                toast.success('Connected to game server');
                window.dispatchEvent(new CustomEvent('websocketConnected'));
                this.emit('game.join');
            };
            this.ws.onclose = (event) => {
                clearTimeout(connectionTimeout);
                debugLog('WebSocket closed', { 
                    code: event.code, 
                    reason: event.reason || 'No reason provided',
                    wasClean: event.wasClean
                });
                switch (event.code) {
                    case 1000: this.lastError = null; break;
                    case 1006: this.lastError = 'Server unavailable'; break;
                    case 1015: this.lastError = 'TLS handshake failed'; break;
                    default: this.lastError = `Connection closed (${event.code})`;
                }
                this.handleDisconnect(event);
            };
            this.ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                debugLog('WebSocket error', {
                    error,
                    readyState: this.ws?.readyState,
                    url: this.ws?.url
                });
                this.lastError = 'Connection error';
            };
            this.ws.onmessage = this.handleMessage.bind(this);
        } catch (error) {
            debugLog('Error creating WebSocket connection', error);
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            this.handleMaxRetries();
        }
    }

    private handleMessage(event: MessageEvent) {
        try {
            debugLog('Raw message received', event.data);
            const data = JSON.parse(event.data);
            debugLog('Parsed message', data);

            // Dispatch backend events as-is for React listeners
            if (data.event) {
                window.dispatchEvent(new CustomEvent(data.event, { detail: data.data }));
            }
        } catch (error) {
            debugLog('Error handling message', {
                error,
                rawData: event.data
            });
        }
    }

    private handleDisconnect(event: CloseEvent) {
        if (event.code === 1000 || event.code === 1001) {
            this.disconnect();
        } else {
            this.handleMaxRetries();
        }
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
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.lastError = null;
        this.connectionAttempts = 0;
    }

    public emit(event: string, data?: any): void {
        if (this.isConnected()) {
            const message = JSON.stringify({
                type: event,
                payload: data
            });
            debugLog('Emitting event:', { event, data });
            this.ws!.send(message);
        } else {
            debugLog('WebSocket not connected, cannot emit event:', event);
            toast.error('Not connected to game server');
        }
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public getConnectionStats(): any {
        const stats = {
            connected: this.isConnected(),
            readyState: this.ws?.readyState,
            attempts: this.connectionAttempts,
            lastError: this.lastError
        };
        debugLog('Connection stats requested', stats);
        return stats;
    }
}

// Singleton instance for use in your CrashGame and other components
export const webSocketService = WebSocketService.getInstance();

// GameWebSocket class is left for advanced/legacy use
export class GameWebSocket {
    private gameWs: WebSocket | null = null;
    private bettingWs: WebSocket | null = null;
    private token: string;

    constructor(token: string) {
        this.token = token;
        this.connect();
    }

    public connect(): void {
        const gameUrl = WS_GAME_URL;
        const bettingUrl = WS_BETTING_URL;
        try {
            debugLog(`Connecting to game WebSocket: ${gameUrl}`);
            this.gameWs = new WebSocket(`${gameUrl}?token=${this.token}`);
            debugLog(`Connecting to betting WebSocket: ${bettingUrl}`);
            this.bettingWs = new WebSocket(`${bettingUrl}?token=${this.token}`);
            this.setupEventHandlers();
        } catch (error) {
            debugLog('Error connecting to WebSockets', error);
        }
    }
    
    private setupEventHandlers(): void {
        if (this.gameWs) {
            this.gameWs.onopen = () => {
                debugLog('Game WebSocket connected');
                this.emit(this.gameWs!, 'game.join');
            };
            this.gameWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    debugLog('Game message received', data);
                } catch (error) {
                    debugLog('Error parsing game message', error);
                }
            };
            this.gameWs.onclose = () => {
                debugLog('Game WebSocket closed');
            };
            this.gameWs.onerror = (error) => {
                debugLog('Game WebSocket error', error);
            };
        }
        if (this.bettingWs) {
            this.bettingWs.onopen = () => {
                debugLog('Betting WebSocket connected');
            };
            this.bettingWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    debugLog('Betting message received', data);
                } catch (error) {
                    debugLog('Error parsing betting message', error);
                }
            };
            this.bettingWs.onclose = () => {
                debugLog('Betting WebSocket closed');
            };
            this.bettingWs.onerror = (error) => {
                debugLog('Betting WebSocket error', error);
            };
        }
    }
    
    private emit(ws: WebSocket, event: string, data: any = {}): void {
        if (ws.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({
                type: event,
                payload: data
            });
            ws.send(message);
        }
    }
    
    public placeBet(amount: number): void {
        if (this.bettingWs?.readyState === WebSocket.OPEN) {
            this.emit(this.bettingWs, 'bet.place', { amount });
        } else {
            toast.error('Not connected to betting server');
        }
    }
    
    public cashout(): void {
        if (this.bettingWs?.readyState === WebSocket.OPEN) {
            this.emit(this.bettingWs, 'bet.cashout');
        } else {
            toast.error('Not connected to betting server');
        }
    }
    
    public disconnect(): void {
        if (this.gameWs) {
            this.gameWs.close();
            this.gameWs = null;
        }
        if (this.bettingWs) {
            this.bettingWs.close();
            this.bettingWs = null;
        }
    }
}