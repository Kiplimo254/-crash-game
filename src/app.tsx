import React from "react";
import { ToastContainer } from 'react-toastify';
import Header from "./components/header";
import BetsUsers from "./components/bet-users";
import Main from "./components/Main";
import propeller from "./assets/images/propeller.png";
import Context from "./context";
import { useAuth } from "./context/AuthContext";
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const { unityLoading, currentProgress, rechargeState } = React.useContext(Context);
  const { isAuthenticated } = useAuth();

  return (
    <div className="main-container">
      {!unityLoading && (
        <div className="myloading">
          <div className="loading-container">
            <div className="rotation">
              <img alt="propeller" src={propeller} />
            </div>
            <div className="waiting">
              <div
                style={{ width: `${currentProgress * 1.111 + 0.01}%` }}
              ></div>
            </div>
            <p>{Number(currentProgress * 1.111 + 0.01).toFixed(2)}%</p>
          </div>
        </div>
      )}
      {rechargeState && isAuthenticated && (
        <div className="recharge">
          <div className="recharge-body">
            <div className="recharge-body-font">
              Insufficient balance amount
            </div>
            <a href="https://induswin.com/#/pages/recharge/recharge">
              Induswin.com
            </a>
          </div>
        </div>
      )}
      <Header />
      <div className="game-container">
        <BetsUsers />
        <Main />
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App;