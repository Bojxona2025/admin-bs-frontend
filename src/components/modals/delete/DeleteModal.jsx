import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import UpdateNotificationModal from "../update/UpdateNotificationModal";

export default function DeleteModal({
  isOpen,
  position,
  onClose,
  onDelete,
  productId,
  onUpdate,
  isDelete = false, // Agar delete modal bo'lsa
  isUpdate = false, // Agar update modal bo'lsa
  content = "notification", // Modal ichidagi kontent
}) {
  const modalRef = useRef(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Modal yopilganda confirmation holatini ham reset qilish
  useEffect(() => {
    if (!isOpen) {
      setShowConfirmation(false);
    }
  }, [isOpen]);

  const handleDeleteClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmDelete = () => {
    onDelete(productId);
    setShowConfirmation(false);
    onClose();
  };

  const handleCancelDelete = () => {
    setShowConfirmation(false);
  };

  const handleEditClick = () => {
    setShowUpdateModal(content);
    onClose(); // Asosiy modalni yopamiz
  };

  const handleUpdateModalClose = () => {
    console.log("Update modal yopildi"); // Debug uchun
    setShowUpdateModal(false);
  };

  const handleProductUpdate = (updatedProduct) => {
    console.log("Mahsulot yangilandi:", updatedProduct); // Debug uchun
    // Mahsulot yangilangandan keyin parent komponentga xabar berish
    if (onUpdate) {
      onUpdate(updatedProduct);
    }
    setShowUpdateModal(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-50"
            style={{ top: position.top, right: position.right }}
          >
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white border-[1.4px] border-[#c4bebe] rounded p-2"
            >
              {!showConfirmation ? (
                // Birinchi modal - asosiy tugmalar
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEditClick}
                    className="text-[12px] underline cursor-pointer text-[#2db789] font-[400]"
                    style={{ display: isUpdate ? "inline" : "none" }}
                  >
                    Taxrirlash
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="text-[12px] underline cursor-pointer text-[#2db789] font-[400]"
                    style={{ display: isDelete ? "inline" : "none" }}
                  >
                    O'chirish
                  </button>
                  <button
                    onClick={onClose}
                    className="text-[12px] underline cursor-pointer text-[#2db789] font-[400]"
                  >
                    Bekor qilish
                  </button>
                </div>
              ) : (
                // Ikkinchi modal - tasdiqlash
                <div className="p-2">
                  <div className="text-center mb-3">
                    <p className="text-gray-700 text-sm">
                      Haqiqatan ham o'chirmoqchimisiz?
                    </p>
                  </div>
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={handleConfirmDelete}
                      className="px-3 py-1 cursor-pointer bg-[#bc0000] text-white rounded hover:bg-red-600 text-sm"
                    >
                      Ha, o'chiraman
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      className="px-3 py-1 cursor-pointer bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                    >
                      Yo'q, o'chirmayman
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showUpdateModal === "notification" && (
        <UpdateNotificationModal
          isOpen={showUpdateModal}
          onClose={handleUpdateModalClose}
          productId={productId}
          onUpdate={handleProductUpdate}
        />
      )}
    </>
  );
}
