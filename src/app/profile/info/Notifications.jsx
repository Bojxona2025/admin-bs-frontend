"use client";
import { useCallback, useEffect } from "react";
import { Bell, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotificationsStore } from "@/app/store/useNotificationsStore";
import notificationsApi from "@/app/http/notifications.api";

const Notifications = () => {
  const {
    notifications,
    setNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsStore();

  const syncMyNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.getMy();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error("Bildirishnomalarni olishda xatolik:", err?.message || err);
      setNotifications([]);
    }
  }, [setNotifications]);

  useEffect(() => {
    syncMyNotifications();
  }, [syncMyNotifications]);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const getNotificationId = (notification) =>
    notification?._notificationId ||
    notification?.notificationId?._id ||
    notification?.notificationId?.id ||
    (typeof notification?.notificationId === "string" ? notification.notificationId : "") ||
    notification?.id ||
    notification?._id;
  const isRead = (notification) =>
    Boolean(notification?.read || notification?.readAt || notification?.is_read);
  const handleMarkAsRead = async (notificationId) => {
    if (!notificationId) return;
    try {
      await notificationsApi.getById(notificationId);
      markAsRead(notificationId);
      await syncMyNotifications();
    } catch (error) {
      console.error("Bildirishnomani o'qishda xatolik:", error?.message || error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = safeNotifications
      .filter((item) => !isRead(item))
      .map((item) => getNotificationId(item))
      .filter(Boolean);

    if (unreadIds.length === 0) return;

    try {
      await Promise.all(unreadIds.map((id) => notificationsApi.getById(id)));
      markAllAsRead();
      await syncMyNotifications();
    } catch (error) {
      console.error("Barchasini o'qishda xatolik:", error?.message || error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bildirishnomalar</CardTitle>
          {safeNotifications.length > 0 && (
            <Button
              variant="link"
              onClick={handleMarkAllAsRead}
              className="text-[#249B73]  hover:text-green-800 cursor-pointer"
            >
              Hammasini o'qigan deb belgilash
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {safeNotifications.length === 0 ? (
          <p className="text-gray-500 text-center">Bildirishnoma yo'q</p>
        ) : (
          <div className="space-y-4">
            {safeNotifications.map((notification) => (
              <div
                key={getNotificationId(notification)}
                className={`p-4 rounded-lg border ${
                  isRead(notification)
                    ? "border-gray-200 bg-gray-50"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-medium ${
                          isRead(notification) ? "text-gray-700" : "text-gray-900"
                        }`}
                      >
                        {notification.title || "Bildirishnoma"}
                      </h3>
                      {!isRead(notification) && (
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                    <p
                      className={`text-sm mt-1 ${
                        isRead(notification) ? "text-gray-500" : "text-gray-700"
                      }`}
                    >
                      {notification.description || notification.message}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isRead(notification) ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {notification.time ||
                        new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!isRead(notification) && (
                      <Button
                        variant="link"
                        onClick={() => handleMarkAsRead(getNotificationId(notification))}
                        className="text-[#249B73]  hover:text-green-800 text-xs cursor-pointer"
                      >
                        O'qish
                      </Button>
                    )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotification(getNotificationId(notification))}
                        className="text-red-600 hover:text-red-800 cursor-pointer"
                      >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Notifications;
