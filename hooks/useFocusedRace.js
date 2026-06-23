"use client";

import { useRaceGlobal, useEnrollingRace } from "@/hooks";
import { useRaceView } from "@/context/RaceViewContext";
import { parseEnrollingRace } from "@/utils/phases";

/** Live running race, or pipeline enrolling race when the UI is in upcoming view. */
export function useFocusedRace() {
  const { value: liveRace } = useRaceGlobal();
  const { value: enrollingRaw } = useEnrollingRace();
  const enrolling = parseEnrollingRace(enrollingRaw);
  const { showUpcoming } = useRaceView();

  const isUpcomingView = showUpcoming && !!enrolling;
  const race = isUpcomingView ? enrolling : liveRace;
  const liveRaceId = liveRace?.current_race_id ?? 0;
  const raceId = race?.current_race_id ?? 0;

  return {
    race,
    raceId,
    liveRace,
    liveRaceId,
    enrolling,
    isUpcomingView,
  };
}
