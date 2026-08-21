import { useQuery } from "@tanstack/react-query";
import { DEFAULT_SETTINGS, settingsQuery } from "@/lib/queries";
import type { SettingsMap } from "@/lib/types";

export function useSettings(): SettingsMap {
  const { data } = useQuery(settingsQuery);
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}
