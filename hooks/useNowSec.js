"use client";

import { useEffect, useState } from "react";

/** Client clock tick — updates every second while `active`. */
export function useNowSec(active = true) {
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNowSec(Date.now() / 1000), 1000);
    return () => clearInterval(id);
  }, [active]);

  return nowSec;
}
