import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { installDemoNetworkGuard } from "./demo/networkGuard.js";
import { routerBasename } from "./lib/assetUrl.js";
import App from "./App.jsx";
import "./styles/clone.css";

installDemoNetworkGuard();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename()}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
