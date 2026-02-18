"use client";

import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js";

function canRegisterServiceWorker(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return process.env.NODE_ENV === "production" && "serviceWorker" in navigator;
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!canRegisterServiceWorker()) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
          scope: "/",
        });

        await registration.update();
      } catch {
        // Registration failures should not block normal app usage.
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}
