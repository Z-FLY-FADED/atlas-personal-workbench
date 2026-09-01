"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js?v=4", { updateViaCache: "none" }).catch(() => undefined);
    }
  }, []);
  return null;
}
