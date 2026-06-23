"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const RaceViewContext = createContext(null);

export function RaceViewProvider({ enrollingRaceId, children }) {
  const [mode, setMode] = useState("live");

  useEffect(() => {
    if (!enrollingRaceId && mode === "upcoming") {
      setMode("live");
    }
  }, [enrollingRaceId, mode]);

  const value = useMemo(
    () => ({
      mode,
      enrollingRaceId: enrollingRaceId ?? null,
      showUpcoming: mode === "upcoming" && enrollingRaceId != null,
      setMode,
      showUpcomingRace: () => {
        if (enrollingRaceId != null) setMode("upcoming");
      },
      showLiveRace: () => setMode("live"),
    }),
    [mode, enrollingRaceId]
  );

  return <RaceViewContext.Provider value={value}>{children}</RaceViewContext.Provider>;
}

export function useRaceView() {
  const ctx = useContext(RaceViewContext);
  if (!ctx) {
    return {
      mode: "live",
      enrollingRaceId: null,
      showUpcoming: false,
      setMode: () => {},
      showUpcomingRace: () => {},
      showLiveRace: () => {},
    };
  }
  return ctx;
}
