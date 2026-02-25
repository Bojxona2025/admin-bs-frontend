import React, { useRef, useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { useNavigate } from "react-router-dom";
import $api from "../../http/api";  // Sizning axios instansingiz

const BarcodeScannerModal = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isModalOpen) {
      stopScanner();
      setScanResult("");
      setError("");
      return;
    }

    codeReader.current = new BrowserMultiFormatReader();

    codeReader.current
      .listVideoInputDevices()
      .then((videoInputDevices) => {
        if (videoInputDevices.length === 0) {
          setError("Kamera topilmadi");
          return;
        }
        const deviceId = videoInputDevices[0].deviceId;

        codeReader.current.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, err) => {
            if (result) {
              const text = result.getText().trim();
              if (text.length === 8 && /^\d+$/.test(text)) {
                setScanResult(text);
                stopScanner();
                fetchOrderData(text);
              } else {
                setError("Scan qilingan kod noto'g'ri yoki 8 xonali raqam emas");
              }
            }
            if (err && err.name !== "NotFoundException") {
              setError(err.message);
            }
          }
        );
      })
      .catch((err) => setError(err.message));

    return () => stopScanner();
  }, [isModalOpen]);

  const stopScanner = () => {
    if (codeReader.current) {
      codeReader.current.reset();
      codeReader.current = null;
    }
  };

  const fetchOrderData = async (orderId) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await $api.get(`/order/get/scan/${orderId}`);
      if (data && data.data && data.data._id) {
        closeModal()
       return navigate(`/sales/order/${data.data._id}`);
      } else {
        setError("Buyurtma topilmadi");
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Serverda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setScanResult("");
    setError("");
    stopScanner();
  };

  return (
    <div>
      <button
        onClick={() => setIsModalOpen(true)}
        className="p-3 bg-[#249B73] cursor-pointer text-white rounded-lg hover:bg-[#379878] transition-colors flex items-center gap-2"
        title="QR / Barcode Scan"
      >
        <QrCode size={18} /> Scan QR
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 relative border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute cursor-pointer top-3 right-3 text-gray-600 hover:text-gray-900 text-2xl"
              title="Yopish"
            >
              &#10005;
            </button>

            <h2 className="text-xl font-semibold mb-4 text-center">QR / Barcode Scanner</h2>

            <video
              ref={videoRef}
              className="w-full rounded border border-gray-300"
              muted
              playsInline
              style={{ aspectRatio: "4 / 3", backgroundColor: "#000" }}
            />

            {loading && (
              <p className="mt-4 text-center text-green-600 font-semibold">Ma'lumotlar yuklanmoqda...</p>
            )}

            {error && (
              <p className="mt-4 text-center text-red-600 font-semibold break-words">{error}</p>
            )}

            {scanResult && (
              <p className="mt-4 text-center text-green-600 font-semibold break-words">
                Skanner natijasi: {scanResult}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScannerModal;