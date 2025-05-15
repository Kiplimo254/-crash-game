import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { config } from "../../config";

interface AdminRoundStatus {
  round_id: number;
  phase: string;
  multiplier: number;
  crash_point: number | null;
  total_bets: number;
  total_payout: number;
  // Add more fields as your backend provides
}

const AdminDashboard: React.FC = () => {
  const [status, setStatus] = useState<AdminRoundStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${config.API_URL}/admin-round-status/`, {
        withCredentials: true,
      });
      setStatus(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to fetch round status");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000); // Poll every 2s for live updates
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.h1
        className="text-3xl font-bold mb-6 text-gray-800"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Admin Game Monitor
      </motion.h1>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>
      ) : status ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-white rounded shadow p-6 flex flex-col items-center">
            <span className="text-gray-500">Round ID</span>
            <span className="text-2xl font-bold">{status.round_id}</span>
          </div>
          <div className="bg-white rounded shadow p-6 flex flex-col items-center">
            <span className="text-gray-500">Phase</span>
            <span className="text-xl font-semibold capitalize">{status.phase}</span>
          </div>
          <div className="bg-white rounded shadow p-6 flex flex-col items-center">
            <span className="text-gray-500">Current Multiplier</span>
            <motion.span
              className="text-2xl font-bold text-blue-600"
              key={status.multiplier}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1.2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {status.multiplier.toFixed(2)}x
            </motion.span>
          </div>
          <div className="bg-white rounded shadow p-6 flex flex-col items-center">
            <span className="text-gray-500">Crash Point</span>
            <span className="text-2xl font-bold text-red-600">
              {status.crash_point !== null ? status.crash_point.toFixed(2) : "TBD"}
            </span>
          </div>
          <div className="bg-white rounded shadow p-6 flex flex-col items-center">
            <span className="text-gray-500">Total Bets</span>
            <span className="text-2xl font-bold">{status.total_bets}</span>
          </div>
          <div className="bg-white rounded shadow p-6 flex flex-col items-center">
            <span className="text-gray-500">Total Payout</span>
            <span className="text-2xl font-bold text-green-600">
              {status.total_payout}
            </span>
          </div>
        </motion.div>
      ) : null}

      <motion.div
        className="bg-white rounded shadow p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-4">Recent Bets</h2>
        <div className="text-gray-400 italic">Coming soon: Live bets table for admins.</div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;