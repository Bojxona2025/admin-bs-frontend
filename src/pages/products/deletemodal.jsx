import React from "react";
import { X, Trash2 } from "lucide-react";

const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Mahsulotni o'chirish",
  message = "Mahsulotni o'chirishga ishonchingiz komilmi? Bu amalni bekor qilib bo'lmaydi.",
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all duration-300 scale-100">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="px-6 pb-6">
            <p className="text-slate-600 mb-6">{message}</p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 cursor-pointer text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-500 cursor-pointer hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteModal;
