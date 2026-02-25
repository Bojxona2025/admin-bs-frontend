import "./index.css";
import axios from "axios";
import App from "./App.jsx";
import store from "./store/index.js";
import { Provider } from "react-redux";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// axios.defaults.baseURL = "http://192.168.1.112:10101";
// let access_token = localStorage.getItem("access_token");

// if (access_token) {
//   axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
// }

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
