"use client";

import { useEffect, useRef, useState } from "react";
import {
  useRaceGlobal,
  useConfig,
} from "@/hooks";
import { useRaceView } from "@/context/RaceViewContext";
import { useNowSec } from "@/hooks/useNowSec";
import { isRaceLive } from "@/utils/phases";
import { diffRaceEvents } from "@/utils/raceEvents";

const MAX_EVENTS = 8;

export default function RaceEventFeed() {
  const { showUpcoming } = useRaceView();
  const { value: race } = useRaceGlobal();
  const { value: config } = useConfig();
  const [events, setEvents] = useState([]);
  const prevSnap = useRef(null);
  const lastRaceId = useRef(null);

  const raceId = race?.current_race_id ?? 0;
  const previewStep = race?.preview_step ?? 0;
  const runners = race?.total_runners ?? 0;
  const betPool = race?.total_bet_pool ?? 0;
  const nowSec = useNowSec(!!race && !race?.is_settled);
  const raceLive = isRaceLive(race, nowSec) && !race?.is_settled;

  useEffect(() => {
    if (lastRaceId.current !== raceId) {
      lastRaceId.current = raceId;
      prevSnap.current = null;
      setEvents([]);
    }
  }, [raceId]);

  useEffect(() => {
    if (!race) return;

    const snap = {
      runners,
      betPool,
      previewStep,
      raceLive,
    };

    if (prevSnap.current === null) {
      prevSnap.current = snap;
      return;
    }

    const newEvents = diffRaceEvents(prevSnap.current, snap, config);

    if (newEvents.length) {
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const unique = newEvents.filter((e) => !seen.has(e.id));
        return [...unique, ...prev].slice(0, MAX_EVENTS);
      });
    }

    prevSnap.current = snap;
  }, [race, runners, betPool, previewStep, raceLive, config]);

  const hasActivity = events.length > 0;

  if (showUpcoming || !hasActivity) return null;

  return (
    <section
      aria-label="Race activity feed"
      className="mb-4 rounded-xl border border-gray-700/80 bg-gray-950/80 overflow-hidden"
    >
      <div className="px-3 py-2.5 border-b border-gray-800 bg-gray-900/60">
        <p className="text-sm sm:text-base font-bold uppercase tracking-[0.15em] text-gray-400">
          Race feed
        </p>
      </div>

      <ul className="divide-y divide-gray-800/80 max-h-40 overflow-y-auto">
        {events.map((ev) => (
          <li key={ev.id} className="px-3 py-2.5 text-xs">
            <span className="text-gray-200 font-medium">{ev.headline}</span>
            {ev.subline && <span className="text-gray-500"> — {ev.subline}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
