import { config } from '../config';

export interface GameState {
    phase: 'betting' | 'in_progress' | 'crashed';
    multiplier: number;
    round_id: number;
    crash_point?: number;
}

export interface BetData {
    bet_id: string;
    amount: number;
    user: string;
    created_at: string;
}

export interface CashoutData {
    bet_id: string;
    cashout_multiplier: number;
    winnings: number;
    user: string;
}

interface WebSocketMessage {
    type: string;
    data: any;
}

class WebSocketConnection {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private url: string;
    private token: string;
    private messageHandlers: { [key: string]: (data: any) => void } = {};

    constructor(url: string, token: string) {
        this.url = url;
        this.token = token;
    }

    connect() {
        try {
            // Django Channels expects the token in the query string
            const wsUrl = `${this.url}?token=${this.token}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log(`Connected to WebSocket: ${this.url}`);
                this.reconnectAttempts = 0;
                window.dispatchEvent(new Event('websocketConnected'));
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    if (this.messageHandlers[message.type]) {
                        this.messageHandlers[message.type](message.data);
                    } else {
                        console.log('Unhandled message type:', message.type, message.data);
                    }
                    // Dispatch custom events for global listeners (for React UI sync)
                    window.dispatchEvent(new CustomEvent(message.type, { detail: message.data }));
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log(`WebSocket connection closed: ${this.url}`, event.code, event.reason);
                window.dispatchEvent(new Event('websocketDisconnected'));
                this.handleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error(`WebSocket error on ${this.url}:`, error);
                window.dispatchEvent(new Event('websocketDisconnected'));
            };
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            this.handleReconnect();
        }
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect to ${this.url} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
        }
    }

    on(messageType: string, handler: (data: any) => void) {
        this.messageHandlers[messageType] = handler;
    }

    send(type: string, data: any = {}) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type,
                data
            };
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export class GameWebSocket {
    private gameWs: WebSocketConnection;
    private bettingWs: WebSocketConnection;

    constructor(token: string) {
        const gameUrl = `${config.WS_GAME_URL}/`;
        const bettingUrl = `${config.WS_BETTING_URL}/`;
        
        this.gameWs = new WebSocketConnection(gameUrl, token);
        this.bettingWs = new WebSocketConnection(bettingUrl, token);

        this.setupGameHandlers();
        this.setupBettingHandlers();
    }

    private setupGameHandlers() {
        // Game state updates
        this.gameWs.on('game.state', (data: GameState) => {
            console.log('Game state update:', data);
            window.dispatchEvent(new CustomEvent('round_start', { detail: data }));
        });

        this.gameWs.on('game.crash', (data: GameState) => {
            console.log('Game crashed:', data);
            window.dispatchEvent(new CustomEvent('game_crash', { detail: data }));
        });

        this.gameWs.on('game.started', (data: GameState) => {
            console.log('New game started:', data);
            window.dispatchEvent(new CustomEvent('round_start', { detail: data }));
        });

        this.gameWs.on('multiplier_update', (data: any) => {
            // If your backend sends multiplier updates as a separate event
            window.dispatchEvent(new CustomEvent('multiplier_update', { detail: data }));
        });
    }

    private setupBettingHandlers() {
        // Betting events
        this.bettingWs.on('bet.placed', (data: BetData) => {
            console.log('Bet placed:', data);
        });

        this.bettingWs.on('bet.error', (error) => {
            console.error('Bet error:', error);
        });

        this.bettingWs.on('cashout.success', (data: CashoutData) => {
            console.log('Cashout successful:', data);
        });

        this.bettingWs.on('cashout.error', (error) => {
            console.error('Cashout error:', error);
        });
    }

    connect() {
        this.gameWs.connect();
        this.bettingWs.connect();
    }

    placeBet(amount: number) {
        this.bettingWs.send('bet.place', {
            amount: amount
        });
    }

    cashout(betId: string) {
        this.bettingWs.send('cashout.request', {
            bet_id: betId
        });
    }

    disconnect() {
        this.gameWs.disconnect();
        this.bettingWs.disconnect();
    }
}

export const initializeWebSocket = (token: string): GameWebSocket => {
    const gameSocket = new GameWebSocket(token);
    gameSocket.connect();
    return gameSocket;
};