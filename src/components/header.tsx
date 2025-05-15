import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { CURRENCY } from '../config/env';
import logo from "../assets/images/logo.svg";
import "../index.scss";

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-container">
          <img src={logo} alt="Logo" className="logo" />
        </div>
        <div className="second-block">
          <div className="howto">
            <div className="help-logo"></div>
            <div className="help-msg">How to Play</div>
          </div>
          <div className="d-flex">
            {isAuthenticated ? (
              <>
                <div className="balance">
                  <span className="amount">{user?.balance.toFixed(2)}</span>
                  <span className="currency">{CURRENCY}</span>
                </div>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </>
            ) : (
              <div className="auth-buttons">
                <button onClick={() => navigate('/login')} className="login-btn">
                  Login
                </button>
                <button onClick={() => navigate('/signup')} className="signup-btn">
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;