import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, X } from 'lucide-react';

const NotificationSystem = () => {
    const [notifications, setNotifications] = useState([]);

    // Notification turlarini aniqlash
    const notificationTypes = {
        success: {
            icon: CheckCircle,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            iconColor: 'text-green-600',
            titleColor: 'text-green-800',
            messageColor: 'text-green-700'
        },
        error: {
            icon: XCircle,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            iconColor: 'text-red-600',
            titleColor: 'text-red-800',
            messageColor: 'text-red-700'
        },
        confirm: {
            icon: AlertCircle,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            iconColor: 'text-green-600',
            titleColor: 'text-green-800',
            messageColor: 'text-green-700'
        }
    };

    // Notification qo'shish funksiyasi
    const addNotification = (type, title, message, duration = 5000) => {
        const id = Date.now() + Math.random();
        const notification = {
            id,
            type,
            title,
            message,
            duration
        };

        setNotifications(prev => [...prev, notification]);

        // Avtomatik o'chirish
        setTimeout(() => {
            removeNotification(id);
        }, duration);
    };

    // Notification o'chirish funksiyasi
    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    };

    // Test notification yaratish funksiyalari
    const showSuccess = () => {
        addNotification('success', 'Muvaffaqiyat!', 'Amal muvaffaqiyatli bajarildi. Barcha o\'zgarishlar saqlandi.');
    };

    const showError = () => {
        addNotification('error', 'Xatolik yuz berdi!', 'Ma\'lumotlarni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    };

    const showConfirm = () => {
        addNotification('confirm', 'Tasdiqlash kerak', 'Ushbu amalni bajarish uchun tasdiqlash talab qilinadi. Davom etishni xohlaysizmi?', 8000);
    };

    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
            {/* Notification Container */}
            <div className="fixed top-4 right-4 z-50 space-y-4 w-96">
                {notifications.map((notification) => {
                    const config = notificationTypes[notification.type];
                    const IconComponent = config.icon;

                    return (
                        <div
                            key={notification.id}
                            className={`${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out animate-slide-in`}
                        >
                            <div className="flex items-start">
                                <div className={`${config.iconColor} mr-3 mt-0.5`}>
                                    <IconComponent size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className={`${config.titleColor} font-semibold text-sm mb-1`}>
                                        {notification.title}
                                    </h3>
                                    <p className={`${config.messageColor} text-sm leading-relaxed`}>
                                        {notification.message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeNotification(notification.id)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Notification Guidelines */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4" style={{ color: '#101828' }}>
                        Notification Turlari
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center">
                                <CheckCircle className="text-green-600 mr-2" size={20} />
                                <h3 className="font-semibold text-green-800">Success</h3>
                            </div>
                            <p className="text-sm text-gray-600">
                                Muvaffaqiyatli bajarilgan amallar uchun ishlatiladi. Masalan: ma'lumotlar saqlandi, fayl yuklandi.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center">
                                <XCircle className="text-red-600 mr-2" size={20} />
                                <h3 className="font-semibold text-red-800">Error</h3>
                            </div>
                            <p className="text-sm text-gray-600">
                                Xatoliklar va muammolar haqida xabar berish uchun. Masalan: validation xatoliklari, server xatoliklari.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center">
                                <AlertCircle className="text-green-600 mr-2" size={20} />
                                <h3 className="font-semibold text-green-800">Confirm</h3>
                            </div>
                            <p className="text-sm text-gray-600">
                                Tasdiqlash va ogohlantirish uchun. Masalan: o'chirish amalidan oldin tasdiqlash.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
        </div>
    );
};

export default NotificationSystem;
