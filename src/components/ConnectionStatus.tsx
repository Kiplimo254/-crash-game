import React from 'react';
import { toast } from 'react-toastify';

interface ConnectionStatusProps {
  isConnected: boolean;
  connectionError: string | null;
  transport: string | null;
  reconnectHandler: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  connectionError,
  transport,
  reconnectHandler
}) => {
  React.useEffect(() => {
    if (connectionError) {
      toast.error(connectionError, {
        toastId: 'connection-status',
        autoClose: false,
      });
    } else if (isConnected) {
      toast.success(`Connected via ${transport}`, {
        toastId: 'connection-status',
        autoClose: 3000,
      });
    }
  }, [isConnected, connectionError, transport]);

  if (!isConnected) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
        <p className="font-semibold">Disconnected from server</p>
        {connectionError && (
          <p className="text-sm mt-1">{connectionError}</p>
        )}
        <button
          onClick={reconnectHandler}
          className="mt-2 bg-white text-red-500 px-4 py-2 rounded hover:bg-red-100 transition-colors"
        >
          Reconnect
        </button>
      </div>
    );
  }

  return null;
}; 