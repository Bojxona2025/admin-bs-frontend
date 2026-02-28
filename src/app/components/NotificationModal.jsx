"use client";
import { useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BookOpenCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationsStore } from "../store/useNotificationsStore";
import notificationsApi from "../http/notifications.api";

export default function NotificationModal({ open, setOpen }) {
  const {
    notifications,
    setNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsStore();

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

  const syncMyNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.getMy();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error("Bildirishnomalarni olishda xatolik:", err?.message || err);
      setNotifications([]);
    }
  }, [setNotifications]);

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

  useEffect(() => {
    if (open) {
      syncMyNotifications();
    }
  }, [open, syncMyNotifications]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-70 right-4 p-0 h-[400px] overflow-y-auto">
        <div>
          <div className="flex items-center gap-38 px-4 py-2 border-b">
            <DialogTitle className="text-lg font-semibold">
              Bildirishnomalar
            </DialogTitle>
            <Button
              variant="link"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-sm text-[#249B73] hover:underline cursor-pointer"
            >
              <BookOpenCheck size={18} />
              <span>Barchasini o'qish</span>
            </Button>
          </div>

          <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {safeNotifications.length === 0 ? (
              <p className="text-gray-500 text-center">Bildirishnoma yo'q</p>
            ) : (
              safeNotifications.map((item) => (
                <div
                  key={getNotificationId(item)}
                  className={`p-3 rounded border ${
                    isRead(item)
                      ? "border-gray-200 bg-gray-50"
                      : "border-green-200 bg-green-50"
                  } hover:bg-[#EFF6FF] transition`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-medium ${
                            isRead(item) ? "text-gray-700" : "text-gray-900"
                          }`}
                        >
                          {item.title || "Bildirishnoma"}
                        </h3>
                        {!isRead(item) && (
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        )}
                      </div>
                      <p
                        className={`text-sm mt-1 ${
                          isRead(item) ? "text-gray-500" : "text-gray-700"
                        }`}
                      >
                        {item.message || item.description}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isRead(item) ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!isRead(item) && (
                        <Button
                          variant="link"
                          onClick={() => handleMarkAsRead(getNotificationId(item))}
                          className="text-[#249B73]  hover:text-green-800 text-xs cursor-pointer"
                        >
                          O'qish
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotification(getNotificationId(item))}
                        className="text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
