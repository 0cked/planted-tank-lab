"use client";

import { useEffect, useState } from "react";

const OFFLINE_MESSAGE = "You're offline — some data may be outdated.";

export function OfflineStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const syncOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    syncOnlineStatus();
    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);

    return () => {
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
        borderColor: "rgba(146, 64, 14, 0.28)",
        backgroundColor: "rgba(254, 243, 199, 0.9)",
        color: "rgb(120, 53, 15)",
      }}
    >
      {OFFLINE_MESSAGE}
    </div>
  );
}
