import React from "react";
import { Link, Outlet } from "react-router-dom";

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Aviator Admin Panel</h1>
          <nav className="space-x-4">
            <Link to="/admin" className="text-blue-600 hover:underline font-medium">
              Dashboard
            </Link>
            {/* Add more admin links as needed */}
            <Link to="/" className="text-gray-600 hover:underline">
              Back to Game
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white shadow mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} Aviator Admin. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;