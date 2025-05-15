import React from 'react';
import { createRoot } from 'react-dom/client';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter } from 'react-router-dom';
import './index.scss';
import { Provider } from './context';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';

createRoot(document.getElementById("root") as HTMLElement).render(
	<BrowserRouter>
		<AuthProvider>
			<Provider>
				<AppRoutes />
				<ToastContainer position="top-center" theme="dark" />
			</Provider>
		</AuthProvider>
	</BrowserRouter>
);