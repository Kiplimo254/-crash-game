import { GameWebSocket } from '../socket';
import { API_ENDPOINTS, makeApiCall } from '../api';

export class Game {
    private gameSocket: GameWebSocket | null = null;
    private token: string | null = null;

    constructor() {
        this.token = localStorage.getItem('token');
        this.initialize(); // Always initialize, even if no token
    }

    async initialize() {
        // Connect to WebSocket, pass token if available
        this.gameSocket = new GameWebSocket(this.token || "");        
        this.gameSocket.connect();
        return this.gameSocket;
    }

    async placeBet(amount: number) {
        if (!this.gameSocket) {
            throw new Error('Not connected to game server');
        }
        this.gameSocket.placeBet(amount);
    }

    async cashout(betId: string) {
        if (!this.gameSocket) {
            throw new Error('Not connected to game server');
        }
        this.gameSocket.cashout(betId);
    }

    async login(username: string, password: string) {
        try {
            const response = await makeApiCall(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response.token) {
                localStorage.setItem('token', response.token);
                this.token = response.token;
                // Re-initialize WebSocket connection after successful login
                await this.initialize();
            }

            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async getUserProfile() {
        try {
            return await makeApiCall(API_ENDPOINTS.USER_PROFILE, {
                method: 'GET'
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    }

    async getBetHistory() {
        try {
            return await makeApiCall(API_ENDPOINTS.MY_BETS, {
                method: 'GET'
            });
        } catch (error) {
            console.error('Error fetching bets:', error);
            throw error;
        }
    }

    disconnect() {
        if (this.gameSocket) {
            this.gameSocket.disconnect();
            this.gameSocket = null;
        }
    }
}