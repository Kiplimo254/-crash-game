/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import propeller from "../../assets/images/propeller.png";
import { webSocketService } from "../../services/websocket";
import type { GameState, GameRound } from "../../services/websocket";
import "./crash.scss";

const debugLog = (message: string, data?: any) => {
    console.log(`[Crash Component] ${message}`, data || '');
};

// SVG curve and animated plane
function CrashCurve({ multiplier, crashed }: { multiplier: number; crashed: boolean }) {
    const width = 600;
    const height = 260;
    const points = Array.from({ length: 100 }, (_, i) => {
        const x = (i / 99) * width;
        const y = height - Math.pow(multiplier, i / 99) * 30;
        return { x, y };
    });
    const plane = points[points.length - 1];
    return (
        <svg width={width} height={height} style={{ background: "#18181a", borderRadius: 16, display: "block", margin: "0 auto" }}>
            <polyline
                fill="none"
                stroke={crashed ? "#ff3333" : "#ff0055"}
                strokeWidth="6"
                points={points.map(p => `${p.x},${p.y}`).join(" ")}
            />
            {/* Animated plane/propeller */}
            {!crashed && (
                <image
                    href={propeller}
                    x={plane.x - 32}
                    y={plane.y - 32}
                    width="64"
                    height="64"
                />
            )}
            {/* On crash, show faded plane at last position */}
            {crashed && (
                <image
                    href={propeller}
                    x={plane.x - 32}
                    y={plane.y - 32}
                    width="64"
                    height="64"
                    style={{ opacity: 0.5, filter: "grayscale(1)" }}
                />
            )}
        </svg>
    );
}

export default function CrashGame() {
    const [waiting, setWaiting] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const [initializationError, setInitializationError] = useState<string | null>(null);

    // Initialize WebSocket connection
    useEffect(() => {
        debugLog('Initializing WebSocket connection');
        (async () => {
            try {
                await webSocketService.initialize();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to initialize WebSocket';
                debugLog('WebSocket initialization error', { error: errorMessage });
                setInitializationError(errorMessage);
            }
        })();
        return () => {
            debugLog('Component unmounting, cleaning up WebSocket (DISCONNECT CALLED)');
            webSocketService.disconnect();
        };
    }, []);

    // Set up event listeners for backend events
    useEffect(() => {
        debugLog('Setting up event listeners');

        // round_start: Betting phase begins
        const handleRoundStart = (event: CustomEvent<any>) => {
            debugLog('round_start event', event.detail);
            setGameState({
                state: 'BETTING',
                multiplier: 1,
                elapsed_time: 0,
                crash_point: undefined
            });
            setWaiting(0);
        };

        // multiplier_update: Game is in progress, update multiplier
        const handleMultiplierUpdate = (event: CustomEvent<any>) => {
            debugLog('multiplier_update event', event.detail);
            setGameState(prev => ({
                ...prev,
                state: 'PLAYING',
                multiplier: event.detail.multiplier,
                elapsed_time: event.detail.elapsed_time ?? 0,
            }));
        };

        // game_crash: Game crashed, show crash point
        const handleGameCrash = (event: CustomEvent<any>) => {
            debugLog('game_crash event', event.detail);
            setGameState(prev => ({
                ...prev,
                state: 'CRASHED',
                multiplier: event.detail.crash_point,
                crash_point: event.detail.crash_point,
                elapsed_time: prev?.elapsed_time ?? 0
            }));
        };

        // betting_closed: Treat as start of game (PLAYING)
        const handleBettingClosed = (event: CustomEvent<any>) => {
            debugLog('betting_closed event', event.detail);
            setGameState(prev => ({
                ...prev,
                state: 'PLAYING',
                multiplier: event.detail.multiplier ?? prev?.multiplier ?? 1,
                elapsed_time: event.detail.elapsed_time ?? prev?.elapsed_time ?? 0,
            }));
        };

        const handleWebsocketConnected = () => {
            debugLog('websocketConnected event received, setting isConnected to true');
            setIsConnected(true);
        };

        const handleWebsocketDisconnected = () => {
            debugLog('websocketDisconnected event received, setting isConnected to false');
            setIsConnected(false);
        };

        window.addEventListener('round_start', handleRoundStart as EventListener);
        window.addEventListener('multiplier_update', handleMultiplierUpdate as EventListener);
        window.addEventListener('game_crash', handleGameCrash as EventListener);
        window.addEventListener('betting_closed', handleBettingClosed as EventListener);
        window.addEventListener('websocketConnected', handleWebsocketConnected);
        window.addEventListener('websocketDisconnected', handleWebsocketDisconnected);

        // Check connection status periodically
        const checkConnection = setInterval(() => {
            const stats = webSocketService.getConnectionStats();
            debugLog('Connection status check', stats);
            setConnectionAttempts(stats.attempts);
            setIsConnected(stats.connected);
            if (stats.lastError) {
                setInitializationError(stats.lastError);
            }
        }, 5000);

        return () => {
            debugLog('Cleaning up event listeners');
            window.removeEventListener('round_start', handleRoundStart as EventListener);
            window.removeEventListener('multiplier_update', handleMultiplierUpdate as EventListener);
            window.removeEventListener('game_crash', handleGameCrash as EventListener);
            window.removeEventListener('betting_closed', handleBettingClosed as EventListener);
            window.removeEventListener('websocketConnected', handleWebsocketConnected);
            window.removeEventListener('websocketDisconnected', handleWebsocketDisconnected);
            clearInterval(checkConnection);
        };
    }, []);

    useEffect(() => {
        let myInterval: NodeJS.Timeout | undefined;
        if (gameState?.state === 'WAITING' || gameState?.state === 'BETTING') {
            setWaiting(0);
            const startTime = Date.now();
            myInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                if (elapsed >= 5000) {
                    clearInterval(myInterval);
                } else {
                    setWaiting(elapsed);
                }
            }, 10);
        }
        return () => {
            if (myInterval) {
                clearInterval(myInterval);
            }
        };
    }, [gameState?.state]);

    const progressWidth = Math.max(0, Math.min(100, ((5000 - waiting) / 5000) * 100));

    if (initializationError) {
        return (
            <div className="crash-container">
                <div className="crash-text-container">
                    <div className="crashtext wait font-9">
                        <div className="rotate">
                            <img src={propeller} alt="propeller" />
                        </div>
                        <div className="waiting-font error">
                            {initializationError}
                        </div>
                        <div className="waiting">
                            <div style={{ width: '100%' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isConnected) {
        debugLog('Rendering connection screen', {
            attempts: connectionAttempts,
            socketState: webSocketService.getConnectionStats()
        });
        return (
            <div className="crash-container">
                <div className="crash-text-container">
                    <div className="crashtext wait font-9">
                        <div className="rotate">
                            <img src={propeller} alt="propeller" />
                        </div>
                        <div className="waiting-font">
                            {connectionAttempts > 3
                                ? "Connection failed. Retrying..."
                                : "CONNECTING TO SERVER..."}
                        </div>
                        <div className="waiting">
                            <div style={{ width: '100%' }}></div>
                        </div>
                        <div className="connection-status">
                            Attempt {connectionAttempts + 1}
                            {webSocketService.getConnectionStats().lastError && (
                                <div className="error-message">
                                    Error: {webSocketService.getConnectionStats().lastError}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const roundInfo = currentRound ? (
        <div className="round-info">
            <span>Round #{currentRound.id}</span>
            {currentRound.crash_point && (
                <span className="crash-point">Crashed at {currentRound.crash_point.toFixed(2)}x</span>
            )}
        </div>
    ) : null;

    debugLog('RENDER: current gameState', gameState);

    return (
        <div className="crash-container">
            <div className="crash-text-container">
                {(gameState?.state === 'PLAYING' || gameState?.state === 'CRASHED') && (
                    <CrashCurve multiplier={gameState.multiplier} crashed={gameState.state === 'CRASHED'} />
                )}
                {gameState && gameState.state === 'PLAYING' ? (
                    <div className="crashtext">
                        <div className="multiplier" style={{ fontSize: 64, color: "#fff", textShadow: "0 0 16px #000" }}>
                            {gameState.multiplier.toFixed(2)}<span className="font-[900]">x</span>
                        </div>
                    </div>
                ) : gameState && gameState.state === 'CRASHED' ? (
                    <div className="crashtext crashed">
                        <div className="flew-away" style={{ fontSize: 32, color: "#ff3333", fontWeight: 700, marginBottom: 12 }}>
                            FLEW AWAY!
                        </div>
                        <div className="multiplier" style={{ fontSize: 64, color: "#ff3333", textShadow: "0 0 16px #000" }}>
                            {gameState.crash_point?.toFixed(2)}x
                        </div>
                    </div>
                ) : (
                    <div className="crashtext wait font-9">
                        <div className="rotate">
                            <img src={propeller} alt="propeller" />
                        </div>
                        <div className="waiting-font">
                            {gameState?.state === 'BETTING' ? 'PLACE YOUR BETS' : 'WAITING FOR NEXT ROUND'}
                        </div>
                        <div className="waiting">
                            <div style={{ width: `${progressWidth}%` }}></div>
                        </div>
                    </div>
                )}
                {roundInfo}
            </div>
        </div>
    );
}