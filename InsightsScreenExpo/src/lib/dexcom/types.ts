export type DexcomRegion = 'us' | 'ous' | 'jp';

export type GlucoseSource = 'dexcom' | 'healthkit' | 'none';

export type GlucoseSample = {
  valueMgDl: number;
  timestampMs: number;
  trendDirection?: string;
  trendArrow?: string;
};

export type DexcomCredentials = {
  username: string;
  password: string;
  region: DexcomRegion;
};
