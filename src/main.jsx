import "./index.css";
import axios from "axios";
import App from "./App.jsx";
import store from "./store/index.js";
import { Provider } from "react-redux";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

const inIframe = window.self !== window.top;

// parentdan token qabul qilish (Next /admin sahifadan yuboriladi)
window.addEventListener("message", (event) => {
  const data = event?.data || {};
  if (data.type !== "ADMIN_AUTH_TOKEN") return;

  const token = data.accessToken || data.token || data.access_token || data.admin_token;
  if (token) {
    localStorage.setItem("access_token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }
});

// iframe bo'lmasa oldingi logikangizni ishlatishingiz mumkin
if (!inIframe) {
  const token = localStorage.getItem("access_token");
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }
}

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
