"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    visible && (
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 cursor-pointer right-10 p-3 hover:shadow-2xl bg-[#249B73] text-white rounded-full shadow-lg hover:bg-[#0d7a56] transition z-50 max-[800px]:hidden"
      >
        <ArrowUp size={22} />
      </button>
    )
  );
}
