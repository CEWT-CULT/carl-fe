"use client";

import { useEffect, useRef } from "react";
import { useRaceGlobal, useEnrollingRace } from "@/hooks";
import { useNowSec } from "@/hooks/useNowSec";
import { shouldOpenNextRace } from "@/utils/phases";
import { useExec } from "@/hooks/useExec";

/** Permissionless crank — opens the pipeline race when running prep closes. */
export default function OpenNextRaceCrank() {
  const { value: race } = useRaceGlobal();
  const { value: enrolling, query } = useEnrollingRace();
  const nowSec = useNowSec(!!race && !race?.is_settled);
  const { openNextRace } = useExec();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!race || inFlight.current) return;
    if (!shouldOpenNextRace(race, enrolling, nowSec)) return;

    inFlight.current = true;
    openNextRace.mutate(undefined, {
      onSettled: () => {
        inFlight.current = false;
        query.refetch();
      },
    });
  }, [race, enrolling, nowSec, openNextRace, query]);

  return null;
}
