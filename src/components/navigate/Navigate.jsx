import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const Navigator = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login"); // effect ichida chaqirish
  }, [navigate]);

  return null; // hech narsa render qilinmaydi
};
