import React, { useEffect } from "react";
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react";

const Toast = ({ message, type = "error", duration = 500, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-700" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return "bg-green-100 border-green-300 text-green-800";
      case "warning":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "info":
        return "bg-blue-100 border-blue-300 text-blue-800";
      default:
        return "bg-red-100 border-red-300 text-red-800";
    }
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-in-out mb-3 animate-slideIn`}
    >
      <div
        className={`${getColors()} border rounded-xl shadow-md px-4 py-3 flex items-start gap-3`}
      >
        <div className="mt-0.5">{getIcon()}</div>

        <div className="flex-1 text-sm leading-relaxed">
          {Array.isArray(message) ? (
            <div>
              <p className="font-semibold mb-1">
                Quyidagi maydonlarni to'ldiring:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {message.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : (
            message
          )}
        </div>

        <button
          className="text-gray-400 hover:text-gray-600 transition"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export { Toast, ToastContainer };
export default Toast;
