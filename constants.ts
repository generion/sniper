import { TargetValue } from "./types";

export const TARGET_CONFIG: Record<TargetValue, { radiusPx: number; color: string }> = {
  25: { radiusPx: 45, color: "bg-red-500" },
  50: { radiusPx: 35, color: "bg-orange-500" },
  75: { radiusPx: 25, color: "bg-yellow-500" },
  100: { radiusPx: 18, color: "bg-green-500" },
};

export const MAX_SHOTS = 5;
export const SPAWN_INTERVAL_MS = 2000;
export const BULLSEYE_RATIO = 0.3; // The inner 30% is the bullseye
export const BASE_SPEED = 0.2; // Base percentage movement per frame
