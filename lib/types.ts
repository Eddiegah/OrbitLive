export interface TimeSpeed {
  label: string;
  secondsPerSecond: number; // simulated seconds advanced per real second; 0 = paused/live
}

export const TIME_SPEEDS: TimeSpeed[] = [
  { label: "Now (live)", secondsPerSecond: 0 },
  { label: "1 hour / sec", secondsPerSecond: 3600 },
  { label: "1 day / sec", secondsPerSecond: 86400 },
  { label: "1 month / sec", secondsPerSecond: 2629800 },
  { label: "1 year / sec", secondsPerSecond: 31557600 },
];
