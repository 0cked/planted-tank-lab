"use client";

import { useEffect, useState } from "react";

const OFFLINE_MESSAGE = "You're offline — some data may be outdated.";

export function OfflineStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const syncOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const syncTimer = window.setTimeout(syncOnlineStatus, 0);
    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);

    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b px-4 py-2 text-center text-xs font-medium sm:px-6"
      style={{
        borderColor: "rgba(205, 189, 165, 0.32)",
        backgroundColor: "rgba(59, 48, 35, 0.82)",
        color: "rgb(239, 226, 203)",
      }}
    >
      {OFFLINE_MESSAGE}
    </div>
  );
}
