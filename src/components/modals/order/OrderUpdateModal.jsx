import { useEffect } from "react";
import { X, Save } from "lucide-react";

const UpdateOrderModal = ({
  showUpdateModal,
  setShowUpdateModal,
  updateData,
  setUpdateData,
  handleUpdateOrder,
  isUpdating,
}) => {
  // Scrollni bloklash
  useEffect(() => {
    if (showUpdateModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showUpdateModal]);

  if (!showUpdateModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => setShowUpdateModal(false)}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Buyurtmani tahrirlash
          </h2>
          <button
            onClick={() => setShowUpdateModal(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Yetkazib berish manzili */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yetkazib berish manzili
            </label>
            <textarea
              value={updateData.location}
              onChange={(e) =>
                setUpdateData({ ...updateData, location: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Manzilni kiriting"
            />
          </div>

          {/* Buyurtma holati */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buyurtma holati
            </label>
            <select
              value={updateData.status}
              onChange={(e) =>
                setUpdateData({ ...updateData, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="qabul_qilinmagan">Qabul qilinmagan</option>
              <option value="jarayonda">Jarayonda</option>
              <option value="yetkazish_jarayonida">Yetkazish jarayonida</option>
              <option value="yetkazilgan">Yetkazilgan</option>
            </select>
          </div>

          {/* To‘lov holati */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="paid"
                checked={updateData.paid === true}
                onChange={(e) =>
                  setUpdateData({ ...updateData, paid: e.target.checked })
                }
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="paid" className="ml-2 text-sm text-gray-700">
                To'lov amalga oshirildi
              </label>
            </div>

            {updateData.paid && (
              <div className="ml-6 space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="paymentMethodOnline"
                    checked={updateData.paymentMethodOnline === true}
                    onChange={(e) =>
                      setUpdateData({
                        ...updateData,
                        paymentMethodOnline: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="paymentMethodOnline"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Online to'lov qilindi
                  </label>
                </div>

                {/* Naqd to'lov */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="paymentMethodCash"
                    checked={updateData.paymentMethodOnline === false}
                    onChange={(e) =>
                      setUpdateData({
                        ...updateData,
                        paymentMethodOnline: !e.target.checked, 
                      })
                    }
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="paymentMethodCash"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Naqd pul to'lov qilindi
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="canceled"
                checked={updateData.canceled}
                onChange={(e) =>
                  setUpdateData({
                    ...updateData,
                    canceled: e.target.checked,
                  })
                }
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="canceled" className="ml-2 text-sm text-gray-700">
                Buyurtma bekor qilingan
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={() => setShowUpdateModal(false)}
            className="px-4 py-2 cursor-pointer text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={async () => {
              await handleUpdateOrder();
              setShowUpdateModal(false); 
            }}
            disabled={isUpdating}
            className="px-4 py-2 bg-[#2db789] text-white rounded-md cursor-pointer transition-colors disabled:bg-green-400 flex items-center space-x-2"
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Saqlash</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateOrderModal;
