// App-wide data: tariffs (bundled or verified download) and the current home's live status.
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { bundledTariffs, type TariffFile } from 'eg-electricity-tariff';
import { GRACE } from './content/holidays';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { queries } from './db/repo';
import { homeStatus, type HomeStatus } from './domain/status';
import { currentTariffs, refreshTariffs, type RefreshResult } from './services/tariffs';
import { useSettings } from './settings';

interface TariffState {
  tariffs: TariffFile;
  refresh: () => Promise<RefreshResult>;
}

const TariffContext = createContext<TariffState>({
  tariffs: bundledTariffs,
  refresh: async () => 'up-to-date',
});

export function TariffProvider({ children }: { children: ReactNode }) {
  const [tariffs, setTariffs] = useState(bundledTariffs);
  const refresh = useCallback(async () => {
    const result = await refreshTariffs();
    setTariffs(await currentTariffs());
    return result;
  }, []);
  useEffect(() => {
    currentTariffs().then(setTariffs);
    // Background check on start; failures silently keep the last verified data.
    void refresh();
  }, [refresh]);
  const value = useMemo(() => ({ tariffs, refresh }), [tariffs, refresh]);
  return <TariffContext.Provider value={value}>{children}</TariffContext.Provider>;
}

export const useTariffs = () => useContext(TariffContext);

/** Re-render every minute so "now"-based numbers (days left, run-out) stay current. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function useCurrentHome() {
  const settings = useSettings();
  // useLiveQuery returns data: [] before the first query completes; only `updatedAt` tells
  // "not loaded yet" apart from "loaded, no homes" (otherwise the dashboard bounces to setup).
  const { data: homes, updatedAt } = useLiveQuery(queries.homes());
  const home = homes.find((h) => h.id === settings.currentHomeId) ?? homes[0] ?? null;
  return { homes, home, loaded: updatedAt !== undefined };
}

export function useHomeData() {
  const { home, homes, loaded } = useCurrentHome();
  const homeId = home?.id ?? -1;
  const { data: readings } = useLiveQuery(queries.readings(homeId), [homeId]);
  const { data: recharges } = useLiveQuery(queries.recharges(homeId), [homeId]);
  const { data: appliances } = useLiveQuery(queries.appliances(homeId), [homeId]);
  const { tariffs } = useTariffs();
  const now = useNow();
  const status: HomeStatus | null = useMemo(
    () => (home && readings ? homeStatus({ home, readings, tariffs, now, grace: GRACE }) : null),
    [home, readings, tariffs, now],
  );
  return {
    home,
    homes,
    loaded,
    readings: readings ?? [],
    recharges: recharges ?? [],
    appliances: appliances ?? [],
    status,
    tariffs,
    now,
  };
}
