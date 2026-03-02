import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Bridge() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      navigate("/login"); // yoki o'zingni login page
      return;
    }

    // Tokenni admin panel localStorage'iga yozamiz
    localStorage.setItem("admin_token", token);
    localStorage.setItem("accessToken", token);

    // URL'dan tokenni olib tashlaymiz (historyda qolmasin)
    window.history.replaceState({}, document.title, "/indicators/general");

    navigate("/indicators/general");
  }, [searchParams, navigate]);

  return (
    <div style={{ padding: 20 }}>
      Admin panelga kirilmoqda...
    </div>
  );
}