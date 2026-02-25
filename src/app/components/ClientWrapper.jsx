'use client';

import { useEffect } from "react";

export default function ClientWrapper({ children }) {
  useEffect(() => {
    console.log("Mounted on client");
  }, []);

  return <>{children}</>;
}
