const ConfirmExitModal = ({ isOpen, onConfirm, onCancel, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Sahifani yopish
          </h3>

          <p className="text-sm text-gray-600 text-center mb-6">
            {message ||
              "Haqiqatdan ham bu sahifani yopmoqchimisiz? Saqlanmagan o'zgarishlar yo'qolishi mumkin."}
          </p>

          <div className="flex items-center justify-center flex-col-reverse sm:flex-row sm:gap-3">
            <button
              onClick={onCancel}
              className="w-full cursor-pointer sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Yo'q, qolish
            </button>
            <button
              onClick={onConfirm}
              className="w-full cursor-pointer sm:w-auto px-4 py-2 mb-3 sm:mb-0 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
              Ha, chiqish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmExitModal;
