import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, NativeModules, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import * as AppleHealthKitModule from 'react-native-health';
import MapView, { Marker } from 'react-native-maps';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { addDoc, collection, getFirestore, serverTimestamp, type Firestore } from 'firebase/firestore';
import { getNextDemoScore, getScorePresentation } from './src/services/scoringService';
import { fetchCurrentWeather } from './src/services/weatherService';

const METRICS = [
  { label: 'GLUCOSE', value: '142', unit: 'MG/DL', status: 'HIGH', statusColor: '#ef4444' },
  { label: 'STRESS LEVEL', value: '78', unit: '/100', status: 'HIGH', statusColor: '#f97316' },
  { label: 'HEART RATE', value: '68', unit: 'BPM', status: 'NORMAL', statusColor: '#22c55e' },
];

const QUICK_ACTIONS = [
  { label: 'Log Glucose', icon: '◍' },
  { label: 'Log Heart Rate', icon: '♥' },
  { label: 'Log Stress', icon: '◔' },
  { label: 'Track Meal', icon: '◒' },
  { label: 'Track Activity', icon: '↟' },
  { label: 'How am I feeling', icon: '☺' },
];
const INSIGHTS_TABS = [
  'Heart Rate',
  'Resting Heart Rate',
  'Heart Rate Variability',
  'Respiratory Rate',
  'Blood Oxygen',
  'Steps',
  'Walking + Running Distance',
  'Flights Climbed',
  'Active Energy',
  'Basal Energy',
  'Exercise Time',
  'Stand Time',
  'Sleep',
  'Mindfulness',
  'Body Temperature',
  'Weight',
  'VO2 Max',
  'Blood Glucose',
] as const;
type InsightTab = (typeof INSIGHTS_TABS)[number];

const INSIGHT_GROUPS = [
  {
    id: 'cardio',
    title: 'Cardiovascular',
    subtitle: 'Heart rhythm, oxygen delivery, and breathing efficiency.',
    color: '#7DA2C7',
    tabs: ['Heart Rate', 'Resting Heart Rate', 'Heart Rate Variability', 'Blood Oxygen', 'Respiratory Rate'] as InsightTab[],
  },
  {
    id: 'activity',
    title: 'Activity + Energy',
    subtitle: 'Movement volume, effort, and daily energy expenditure.',
    color: '#7CB89B',
    tabs: [
      'Steps',
      'Walking + Running Distance',
      'Flights Climbed',
      'Active Energy',
      'Basal Energy',
      'Exercise Time',
      'Stand Time',
      'VO2 Max',
    ] as InsightTab[],
  },
  {
    id: 'recovery',
    title: 'Recovery + Mind',
    subtitle: 'Sleep quality, stress reset, and mental recovery signals.',
    color: '#9B8FC6',
    tabs: ['Sleep', 'Mindfulness'] as InsightTab[],
  },
  {
    id: 'body',
    title: 'Body Metrics',
    subtitle: 'Core physiological measures and metabolic health markers.',
    color: '#C7A77D',
    tabs: ['Body Temperature', 'Weight', 'Blood Glucose'] as InsightTab[],
  },
] as const;

type InsightContent = {
  title: string;
  summary: string;
  trend: string;
  recommendation: string;
  trendPoints: number[];
  trendLabels: string[];
  trendUnit: string;
};

const INSIGHT_UNITS: Record<InsightTab, string> = {
  'Heart Rate': 'bpm',
  'Resting Heart Rate': 'bpm',
  'Heart Rate Variability': 'ms',
  'Respiratory Rate': 'br/min',
  'Blood Oxygen': '%',
  Steps: 'steps',
  'Walking + Running Distance': 'mi',
  'Flights Climbed': 'floors',
  'Active Energy': 'kcal',
  'Basal Energy': 'kcal',
  'Exercise Time': 'min',
  'Stand Time': 'min',
  Sleep: 'h',
  Mindfulness: 'sessions',
  'Body Temperature': 'degF',
  Weight: 'lb',
  'VO2 Max': 'mL/kg/min',
  'Blood Glucose': 'mg/dL',
};

const INSIGHTS_TAB_CONTENT: Record<InsightTab, InsightContent> = INSIGHTS_TABS.reduce((acc, tab) => {
  acc[tab] = {
    title: tab,
    summary: `Connect Apple Health to view ${tab.toLowerCase()} data.`,
    trend: 'Trend: unavailable',
    recommendation: `Track ${tab.toLowerCase()} consistently for stronger trends.`,
    trendPoints: [0, 0, 0, 0, 0, 0, 0],
    trendLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    trendUnit: INSIGHT_UNITS[tab],
  };
  return acc;
}, {} as Record<InsightTab, InsightContent>);

const QUICK_ACTION_METRIC_OPTIONS: InsightTab[] = [
  'Heart Rate',
  'Steps',
  'Sleep',
  'Active Energy',
  'Mindfulness',
  'Blood Glucose',
  'Resting Heart Rate',
  'Walking + Running Distance',
  'Exercise Time',
  'Blood Oxygen',
];
const DASHBOARD_QUICK_ACTION_SLOTS = 6;
const QUICK_ACTION_ICON_BY_TAB: Record<InsightTab, string> = {
  'Heart Rate': '♥',
  'Resting Heart Rate': '♡',
  'Heart Rate Variability': '≈',
  'Respiratory Rate': '◔',
  'Blood Oxygen': '◉',
  Steps: '↟',
  'Walking + Running Distance': '⇄',
  'Flights Climbed': '⇡',
  'Active Energy': '⚡',
  'Basal Energy': '◌',
  'Exercise Time': '⌛',
  'Stand Time': '↕',
  Sleep: '☾',
  Mindfulness: '☯',
  'Body Temperature': '◍',
  Weight: '◒',
  'VO2 Max': '◎',
  'Blood Glucose': '◈',
};

let Notifications: typeof import('expo-notifications') | null = null;
try {
  // If the current binary was built before expo-notifications was added,
  // requiring it can fail with missing native module errors.
  const notificationsModule = require('expo-notifications') as typeof import('expo-notifications');
  Notifications = notificationsModule;
  notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  Notifications = null;
}
const QUICK_ACTION_THEME_COLOR_BY_TAB: Record<InsightTab, string> = {
  'Heart Rate': '#7DA2C7',
  'Resting Heart Rate': '#7DA2C7',
  'Heart Rate Variability': '#7DA2C7',
  'Respiratory Rate': '#7DA2C7',
  'Blood Oxygen': '#7DA2C7',
  Steps: '#7CB89B',
  'Walking + Running Distance': '#7CB89B',
  'Flights Climbed': '#7CB89B',
  'Active Energy': '#7CB89B',
  'Basal Energy': '#7CB89B',
  'Exercise Time': '#7CB89B',
  'Stand Time': '#7CB89B',
  Sleep: '#9B8FC6',
  Mindfulness: '#9B8FC6',
  'Body Temperature': '#C7A77D',
  Weight: '#C7A77D',
  'VO2 Max': '#7CB89B',
  'Blood Glucose': '#C7A77D',
};

const ACTIVITY = [
  { label: 'STEPS', value: '6,842', fill: 85, color: '#22c55e' },
  { label: 'SLEEP', value: '7h 15m', fill: 95, color: '#22c55e' },
  { label: 'MEDS', value: '2/2', fill: 100, color: '#22c55e' },
  { label: 'WATER', value: '6gl', fill: 75, color: '#3b82f6' },
];

type DashboardValueDriftToggles = {
  glucose: boolean;
  stress: boolean;
  heartRateCard: boolean;
  steps: boolean;
  sleep: boolean;
  meds: boolean;
  water: boolean;
};

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '◉' },
  { label: 'Insights', icon: '◌' },
  { label: 'Resources', icon: '▤' },
  { label: 'Map', icon: '⌖' },
  { label: 'Goals', icon: '◎' },
];

const MAP_LAYERS = ['Indoor', 'Recovery', 'Energy', 'Stress Reset'] as const;
type MapLayer = (typeof MAP_LAYERS)[number];

const GOALS_TABS = ['Active', 'Challenges', 'Communities'] as const;
type GoalsTab = (typeof GOALS_TABS)[number];
const CHALLENGE_FILTERS = ['All', 'Personal', 'Community'] as const;
type ChallengeFilter = (typeof CHALLENGE_FILTERS)[number];

type GoalChallenge = {
  title: string;
  detail: string;
  members: string;
  type: 'personal' | 'community';
};

const GOALS_CHALLENGES: GoalChallenge[] = [
  { title: 'Campus Hydration Week', detail: 'Community goal: 10k cups logged', members: '248 joined', type: 'community' },
  { title: 'Indoor Movement Streak', detail: 'When AQI is rough, move inside', members: '132 joined', type: 'community' },
  { title: '7-Day Sleep Wind-Down', detail: 'Power down screens 30 minutes before bed', members: 'Solo plan', type: 'personal' },
];

const COMMUNITY_DISCOVERY = [
  { name: 'Sleep Better Crew', city: 'Los Angeles, CA', members: '16,302 members' },
  { name: 'Mindful Minutes', city: 'Los Angeles, CA', members: '36,285 members' },
  { name: 'Hydration Squad', city: 'Los Angeles, CA', members: '20,217 members' },
  { name: 'Campus Recovery Club', city: 'Los Angeles, CA', members: '19,784 members' },
  { name: 'Morning Reset Group', city: 'Santa Monica, CA', members: '12,904 members' },
  { name: 'Sunset Walk Circle', city: 'Pasadena, CA', members: '9,846 members' },
  { name: 'Breathwork Collective', city: 'Irvine, CA', members: '14,119 members' },
  { name: 'Focus & Flow Crew', city: 'Long Beach, CA', members: '8,672 members' },
  { name: 'Weekly Wellness Wins', city: 'Glendale, CA', members: '11,530 members' },
  { name: 'Healthy Habits Hub', city: 'Burbank, CA', members: '13,407 members' },
  { name: 'Balanced Students Network', city: 'Westwood, CA', members: '7,994 members' },
  { name: 'Recover & Recharge', city: 'Culver City, CA', members: '10,288 members' },
] as const;

const COMMUNITY_ACTIONS = [
  { label: 'Invite', icon: '+' },
  { label: 'Share', icon: '↗' },
  { label: 'Overview', icon: 'i' },
  { label: 'Events', icon: '◫' },
  { label: 'Progress Board', icon: '▤' },
] as const;

const COMMUNITY_PROGRESS_POSTS = [
  { id: '1', author: 'Maya R.', time: '2h ago', caption: 'Hit my hydration target for 5 straight days. Feeling sharp.', imageLabel: 'Hydration check-in photo' },
  { id: '2', author: 'Ethan K.', time: 'Yesterday', caption: 'Morning walk streak keeps growing. 7 days in a row.', imageLabel: 'Morning walk snapshot' },
  { id: '3', author: 'Nora P.', time: '2d ago', caption: 'Sleep score improved after reducing caffeine at night.', imageLabel: 'Sleep stats screenshot' },
] as const;

type ProgressPostStatus = 'processing' | 'ready' | 'failed';
type ProgressBoardPost = {
  id: string;
  author: string;
  time: string;
  caption: string;
  imageLabel: string;
  imageUrl: string | null;
  mediaPublicId: string | null;
  mediaType: 'image';
  status: ProgressPostStatus;
  processingError: string | null;
};

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';
const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const hasFirebaseConfig = Object.values(FIREBASE_CONFIG).every((value) => value.trim().length > 0);
const hasCloudinaryConfig = CLOUDINARY_CLOUD_NAME.trim().length > 0 && CLOUDINARY_UPLOAD_PRESET.trim().length > 0;

let firestoreInstance: Firestore | null = null;
const getFirestoreInstance = (): Firestore | null => {
  if (!hasFirebaseConfig) {
    return null;
  }
  if (firestoreInstance) {
    return firestoreInstance;
  }
  const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  firestoreInstance = getFirestore(app);
  return firestoreInstance;
};

const cloudinaryUploadEndpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const deriveImageName = (uri: string) => {
  const lastSegment = uri.split('/').pop();
  if (lastSegment && lastSegment.includes('.')) {
    return lastSegment;
  }
  return `post-${Date.now()}.jpg`;
};

const uploadImageToCloudinary = async (imageUri: string): Promise<{ secureUrl: string; publicId: string }> => {
  if (!hasCloudinaryConfig) {
    throw new Error('Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }
  const formData = new FormData();
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('file', {
    uri: imageUri,
    name: deriveImageName(imageUri),
    type: 'image/jpeg',
  } as unknown as Blob);
  const response = await fetch(cloudinaryUploadEndpoint, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }
  const json = await response.json() as { secure_url?: string; public_id?: string };
  if (!json.secure_url || !json.public_id) {
    throw new Error('Cloudinary upload response is missing secure_url/public_id.');
  }
  return {
    secureUrl: json.secure_url,
    publicId: json.public_id,
  };
};

const COMMUNITY_OVERVIEW_DESCRIPTION =
  'This community helps members build consistent wellness habits through shared accountability, weekly events, and progress updates.';

const toShareSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toErrorText = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

type InviteContact = {
  id: string;
  name: string;
  phone: string | null;
};

const moduleHealthKit = (AppleHealthKitModule as unknown as { default?: unknown; HealthKit?: unknown }).default
  ?? (AppleHealthKitModule as unknown as { HealthKit?: unknown }).HealthKit
  ?? AppleHealthKitModule;
const nativeHealthKit = (NativeModules as { AppleHealthKit?: unknown }).AppleHealthKit;
const rawHealthKit = (nativeHealthKit ?? moduleHealthKit) as Record<string, unknown>;
const moduleConstants = (moduleHealthKit as { Constants?: unknown })?.Constants;
if (!rawHealthKit.Constants && moduleConstants) {
  rawHealthKit.Constants = moduleConstants;
}

const healthKit = rawHealthKit as {
  Constants?: {
    Permissions?: Record<string, string>;
    Units?: Record<string, string>;
  };
  initHealthKit?: (config: unknown, callback: (error?: string) => void) => void;
  getLatestHeartRate?: (options: unknown, callback: (error?: string, result?: { value?: number }) => void) => void;
  getHeartRateSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getRestingHeartRateSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getHeartRateVariabilitySamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getRespiratoryRateSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getOxygenSaturationSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getStepCount?: (options: unknown, callback: (error?: string, result?: { value?: number }) => void) => void;
  getDailyDistanceWalkingRunningSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getDailyFlightsClimbedSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getSleepSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: string; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getActiveEnergyBurned?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getBasalEnergyBurned?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getAppleExerciseTime?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getAppleStandTime?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getBodyTemperatureSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getWeightSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getVo2MaxSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getBloodGlucoseSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getMindfulSession?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ startDate?: string; endDate?: string }>) => void,
  ) => void;
};

const COMMUNITY_UPCOMING_EVENTS = [
  { id: 'u1', month: 'Apr', day: '27', dow: 'Sun', title: 'Beach Recovery Walk', meta: 'Social · 2400 Ocean Front Walk, Venice', rsvp: "18 RSVP'd" },
  { id: 'u2', month: 'May', day: '02', dow: 'Fri', title: 'Hydration Accountability Meetup', meta: 'Community · 600 W 7th St, Los Angeles', rsvp: "31 RSVP'd" },
  { id: 'u3', month: 'May', day: '09', dow: 'Fri', title: 'Morning Mobility Session', meta: 'Wellness · 200 Santa Monica Pier, Santa Monica', rsvp: "24 RSVP'd" },
  { id: 'u4', month: 'May', day: '14', dow: 'Wed', title: 'Community 5k Checkpoint', meta: 'Run Club · Exposition Park, Los Angeles', rsvp: "42 RSVP'd" },
  { id: 'u5', month: 'May', day: '21', dow: 'Wed', title: 'Night Wind-Down Walk', meta: 'Mindfulness · Echo Park Lake, Los Angeles', rsvp: "16 RSVP'd" },
  { id: 'u6', month: 'May', day: '28', dow: 'Wed', title: 'Rest + Stretch Session', meta: 'Recovery · 151 S Grand Ave, Los Angeles', rsvp: "27 RSVP'd" },
] as const;

const COMMUNITY_PAST_EVENTS = [
  { id: 'p1', month: 'Apr', day: '12', dow: 'Sat', title: 'Sunrise Run + Breathwork', meta: 'Social · Griffith Park, Los Angeles', rsvp: "46 RSVP'd" },
  { id: 'p2', month: 'Mar', day: '29', dow: 'Sat', title: 'Sleep Score Sprint Week Wrap', meta: 'Community · UCLA Campus, Westwood', rsvp: "39 RSVP'd" },
  { id: 'p3', month: 'Mar', day: '15', dow: 'Sat', title: 'Stress Reset Outdoor Circle', meta: 'Wellness · 200 N Grand Ave, Los Angeles', rsvp: "27 RSVP'd" },
  { id: 'p4', month: 'Mar', day: '08', dow: 'Sat', title: 'Hydration Week Kickoff', meta: 'Community · 900 W Olympic Blvd, Los Angeles', rsvp: "52 RSVP'd" },
  { id: 'p5', month: 'Feb', day: '24', dow: 'Mon', title: 'Evening Mobility Flow', meta: 'Recovery · Runyon Canyon, Los Angeles', rsvp: "21 RSVP'd" },
  { id: 'p6', month: 'Feb', day: '11', dow: 'Tue', title: 'Mindful Miles Meetup', meta: 'Social · Dockweiler Beach, Los Angeles', rsvp: "33 RSVP'd" },
] as const;

function ActivityMiniIcon({ label }: { label: string }) {
  if (label === 'STEPS') {
    return (
      <Svg height={14} viewBox="0 0 12 12" width={14}>
        <Path d="M2 9l2-3l2 1l2-4l2 1" fill="none" stroke="#a1a1aa" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
      </Svg>
    );
  }
  if (label === 'SLEEP') {
    return (
      <Svg height={14} viewBox="0 0 12 12" width={14}>
        <Path d="M8 2.2A3.9 3.9 0 1 0 9.8 8A3 3 0 1 1 8 2.2z" fill="none" stroke="#a1a1aa" strokeWidth={1.3} />
      </Svg>
    );
  }
  if (label === 'MEDS') {
    return (
      <Svg height={14} viewBox="0 0 12 12" width={14}>
        <Path d="M6 2v8M2 6h8" fill="none" stroke="#a1a1aa" strokeLinecap="round" strokeWidth={1.5} />
      </Svg>
    );
  }
  return (
    <Svg height={14} viewBox="0 0 12 12" width={14}>
      <Path d="M6 1.8c-1.4 2.2-2.4 3.6-2.4 5A2.4 2.4 0 1 0 8.4 6.8c0-1.4-1-2.8-2.4-5z" fill="none" stroke="#a1a1aa" strokeWidth={1.3} />
    </Svg>
  );
}

function InsightsBulbIcon({ active }: { active: boolean }) {
  const color = active ? '#3b82f6' : '#52525b';
  return (
    <Svg height={26} viewBox="0 0 24 24" width={26}>
      <Path
        d="M12 3.2a6.4 6.4 0 0 0-4.3 11.1c.9.8 1.6 1.9 1.9 3h4.8c.3-1.1 1-2.2 1.9-3A6.4 6.4 0 0 0 12 3.2Z"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path
        d="M9.7 19h4.6M10.3 21h3.4"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

export default function App() {
  const mapViewRef = useRef<MapView | null>(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthScore, setHealthScore] = useState(72);
  const [demoScoreDriftEnabled, setDemoScoreDriftEnabled] = useState(false);
  const [demoFastDriftEnabled, setDemoFastDriftEnabled] = useState(false);
  const [demoAlertEnabled, setDemoAlertEnabled] = useState(false);
  const [demoToolsDropdownOpen, setDemoToolsDropdownOpen] = useState(false);
  const [demoDashboardValueDrift, setDemoDashboardValueDrift] = useState<DashboardValueDriftToggles>({
    glucose: false,
    stress: false,
    heartRateCard: false,
    steps: false,
    sleep: false,
    meds: false,
    water: false,
  });
  const [glucoseValue, setGlucoseValue] = useState(142);
  const [stressValue, setStressValue] = useState(78);
  const [heartRateCardValue, setHeartRateCardValue] = useState(68);
  const [activitySteps, setActivitySteps] = useState(6842);
  const [activitySleepMinutes, setActivitySleepMinutes] = useState(435);
  const [activityMedsTaken, setActivityMedsTaken] = useState(2);
  const [activityWaterGlasses, setActivityWaterGlasses] = useState(6);
  const [useDeviceLocation, setUseDeviceLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'off' | 'granted' | 'denied'>('off');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapLocationStatus, setMapLocationStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [activeMapLayer, setActiveMapLayer] = useState<MapLayer>('Indoor');
  const [activeInsightTab, setActiveInsightTab] = useState<InsightTab | null>(null);
  const [dashboardQuickMetrics, setDashboardQuickMetrics] = useState<InsightTab[]>(() =>
    QUICK_ACTION_METRIC_OPTIONS.slice(0, DASHBOARD_QUICK_ACTION_SLOTS),
  );
  const [quickMetricSearchQuery, setQuickMetricSearchQuery] = useState('');
  const [expandedInsightGroups, setExpandedInsightGroups] = useState<Record<string, boolean>>(
    () => INSIGHT_GROUPS.reduce((acc, group) => ({ ...acc, [group.id]: true }), {}),
  );
  const [insightContentByTab, setInsightContentByTab] = useState<Record<InsightTab, InsightContent>>(INSIGHTS_TAB_CONTENT);
  const [healthKitStatus, setHealthKitStatus] = useState<'idle' | 'ready' | 'denied' | 'unsupported'>('idle');
  const [healthKitLoading, setHealthKitLoading] = useState(false);
  const [healthKitLastError, setHealthKitLastError] = useState<string | null>(null);
  const [goalsTab, setGoalsTab] = useState<GoalsTab>('Communities');
  const [challengeFilter, setChallengeFilter] = useState<ChallengeFilter>('All');
  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [personalChallenges, setPersonalChallenges] = useState<GoalChallenge[]>([]);
  const [showCreatePersonalChallengeModal, setShowCreatePersonalChallengeModal] = useState(false);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeDetail, setNewChallengeDetail] = useState('');
  const [joinedCommunityNames, setJoinedCommunityNames] = useState<string[]>([]);
  const [selectedJoinedCommunityName, setSelectedJoinedCommunityName] = useState<string | null>(null);
  const [selectedCommunityAction, setSelectedCommunityAction] = useState('Progress Board');
  const [eventsTab, setEventsTab] = useState<'Upcoming' | 'Past'>('Upcoming');
  const [isInteractingWithEventsList, setIsInteractingWithEventsList] = useState(false);
  const [showOverviewPopup, setShowOverviewPopup] = useState(false);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [showCreateProgressPostModal, setShowCreateProgressPostModal] = useState(false);
  const [createPostCaption, setCreatePostCaption] = useState('');
  const [createPostImageUri, setCreatePostImageUri] = useState<string | null>(null);
  const [isPublishingProgressPost, setIsPublishingProgressPost] = useState(false);
  const [communityCustomPostsByName, setCommunityCustomPostsByName] = useState<Record<string, ProgressBoardPost[]>>({});
  const [showAlertsScreen, setShowAlertsScreen] = useState(false);
  const [inviteContacts, setInviteContacts] = useState<InviteContact[]>([]);
  const [loadingInviteContacts, setLoadingInviteContacts] = useState(false);
  const [startupPermissionsRequested, setStartupPermissionsRequested] = useState(false);
  const [weatherF, setWeatherF] = useState(72);
  const [weatherLabel, setWeatherLabel] = useState('Sunny');
  const [foodSuggestionCollapsed, setFoodSuggestionCollapsed] = useState(false);
  const scoreDirectionRef = useRef<1 | -1>(1);
  const previousAlertDemoEnabledRef = useRef(false);
  const heartPulseAnim = useRef(new Animated.Value(0)).current;
  const alertBadgeBounceAnim = useRef(new Animated.Value(0)).current;
  const displayScore = Math.round(healthScore);
  const scorePresentation = getScorePresentation(displayScore);
  const alertCount = demoAlertEnabled ? 3 : 0;
  const allDemoToolsEnabled =
    demoScoreDriftEnabled && Object.values(demoDashboardValueDrift).every(Boolean);
  const alertItems = demoAlertEnabled
    ? [
        { id: 'a1', title: 'Abnormal Glucose', detail: 'Glucose measured at 192 mg/dL.', severity: 'High' },
        { id: 'a2', title: 'Elevated Stress', detail: 'Stress index reached 84/100.', severity: 'High' },
        { id: 'a3', title: 'Abnormal Heart Rate', detail: 'Resting heart rate detected at 104 bpm.', severity: 'High' },
      ]
    : [];
  const toggleDashboardValueDrift = (key: keyof DashboardValueDriftToggles) => {
    setDemoDashboardValueDrift((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleAllDemoTools = () => {
    const next = !allDemoToolsEnabled;
    setDemoScoreDriftEnabled(next);
    setDemoDashboardValueDrift({
      glucose: next,
      stress: next,
      heartRateCard: next,
      steps: next,
      sleep: next,
      meds: next,
      water: next,
    });
  };
  const dashboardMetrics = [
    {
      label: 'GLUCOSE',
      value: Math.round(glucoseValue).toString(),
      unit: 'MG/DL',
      status: glucoseValue >= 170 ? 'HIGH' : glucoseValue <= 85 ? 'LOW' : 'NORMAL',
      statusColor: glucoseValue >= 170 ? '#ef4444' : glucoseValue <= 85 ? '#f59e0b' : '#7CB89B',
    },
    {
      label: 'STRESS LEVEL',
      value: Math.round(stressValue).toString(),
      unit: '/100',
      status: stressValue >= 70 ? 'HIGH' : stressValue <= 35 ? 'LOW' : 'NORMAL',
      statusColor: stressValue >= 70 ? '#f97316' : stressValue <= 35 ? '#7DA2C7' : '#7CB89B',
    },
    {
      label: 'HEART RATE',
      value: Math.round(heartRateCardValue).toString(),
      unit: 'BPM',
      status: heartRateCardValue >= 95 ? 'HIGH' : heartRateCardValue <= 52 ? 'LOW' : 'NORMAL',
      statusColor: heartRateCardValue >= 95 ? '#f59e0b' : heartRateCardValue <= 52 ? '#7DA2C7' : '#7CB89B',
    },
  ];
  const dashboardActivity = [
    {
      label: 'STEPS',
      value: activitySteps.toLocaleString(),
      fill: Math.max(8, Math.min(100, Math.round((activitySteps / 8000) * 100))),
      color: '#7CB89B',
    },
    {
      label: 'SLEEP',
      value: `${Math.floor(activitySleepMinutes / 60)}h ${String(activitySleepMinutes % 60).padStart(2, '0')}m`,
      fill: Math.max(8, Math.min(100, Math.round((activitySleepMinutes / (8 * 60)) * 100))),
      color: '#9B8FC6',
    },
    {
      label: 'MEDS',
      value: `${activityMedsTaken}/2`,
      fill: Math.max(8, Math.min(100, Math.round((activityMedsTaken / 2) * 100))),
      color: '#7DA2C7',
    },
    {
      label: 'WATER',
      value: `${activityWaterGlasses}gl`,
      fill: Math.max(8, Math.min(100, Math.round((activityWaterGlasses / 8) * 100))),
      color: '#C7A77D',
    },
  ];
  const centerX = 160;
  const centerY = 174;
  const startDeg = 205;
  const endDeg = -25;
  const startAngle = (startDeg * Math.PI) / 180;
  const endAngle = (endDeg * Math.PI) / 180;
  const angleForPct = (pct: number) => startAngle - (pct / 100) * (startAngle - endAngle);
  const pointOnArc = (radius: number, pct: number) => {
    const a = angleForPct(pct);
    return { x: centerX + Math.cos(a) * radius, y: centerY - Math.sin(a) * radius };
  };
  const arcPath = (radius: number, startPct: number, endPct: number, largeArc = 0) => {
    const p1 = pointOnArc(radius, startPct);
    const p2 = pointOnArc(radius, endPct);
    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
  };

  const needleRadians = angleForPct(healthScore);
  const tipRadius = 96;
  const tipX = centerX + Math.cos(needleRadians) * tipRadius;
  const tipY = centerY - Math.sin(needleRadians) * tipRadius;
  const arrowLength = 10;
  const arrowHalfWidth = 4;
  const dirX = Math.cos(needleRadians);
  const dirY = -Math.sin(needleRadians);
  const baseCenterX = tipX - dirX * arrowLength;
  const baseCenterY = tipY - dirY * arrowLength;
  const perpX = -dirY;
  const perpY = dirX;
  const leftX = baseCenterX + perpX * arrowHalfWidth;
  const leftY = baseCenterY + perpY * arrowHalfWidth;
  const rightX = baseCenterX - perpX * arrowHalfWidth;
  const rightY = baseCenterY - perpY * arrowHalfWidth;

  const mapLayerOffsets: Record<MapLayer, Array<{ dLat: number; dLon: number; title: string; subtitle: string }>> = {
    Indoor: [
      { dLat: 0.0012, dLon: -0.0014, title: 'Indoor Gym', subtitle: 'Best for AQI-safe movement' },
      { dLat: -0.0011, dLon: 0.0015, title: 'Hydration Station', subtitle: 'Quick refill stop' },
    ],
    Recovery: [
      { dLat: 0.0015, dLon: 0.0008, title: 'Quiet Study Lounge', subtitle: 'Low-stimulus recovery spot' },
      { dLat: -0.0012, dLon: -0.0009, title: 'Wellness Center', subtitle: 'Recovery-focused support' },
    ],
    Energy: [
      { dLat: 0.001, dLon: 0.0014, title: 'Healthy Dining', subtitle: 'Balanced meal options' },
      { dLat: -0.0014, dLon: 0.001, title: 'Campus Walk Loop', subtitle: 'Quick energy boost route' },
    ],
    'Stress Reset': [
      { dLat: 0.0009, dLon: -0.0012, title: 'Meditation Room', subtitle: '2-min breathing reset' },
      { dLat: -0.001, dLon: -0.0014, title: 'Garden Bench', subtitle: 'Low-noise decompression' },
    ],
  };

  const mapRecommendations: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    subtitle: string;
  }> =
    mapCoords == null
      ? []
      : mapLayerOffsets[activeMapLayer as MapLayer].map((item: { dLat: number; dLon: number; title: string; subtitle: string }, idx: number) => ({
          id: `${activeMapLayer}-${idx}`,
          latitude: mapCoords.lat + item.dLat,
          longitude: mapCoords.lon + item.dLon,
          title: item.title,
          subtitle: item.subtitle,
        }));
  const recenterMapToCurrentLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setMapLocationStatus('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoords = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      };
      setMapLocationStatus('granted');
      setMapCoords(nextCoords);
      mapViewRef.current?.animateToRegion(
        {
          latitude: nextCoords.lat,
          longitude: nextCoords.lon,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        500,
      );
    } catch {
      setMapLocationStatus('denied');
    }
  };
  const joinedCommunities = COMMUNITY_DISCOVERY.filter((community) => joinedCommunityNames.includes(community.name));
  const selectedJoinedCommunity = selectedJoinedCommunityName
    ? joinedCommunities.find((community) => community.name === selectedJoinedCommunityName) ?? null
    : null;
  const filteredCommunities = COMMUNITY_DISCOVERY.filter((community) => {
    const query = communitySearchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return (
      community.name.toLowerCase().includes(query) ||
      community.city.toLowerCase().includes(query) ||
      community.members.toLowerCase().includes(query)
    );
  });
  const allChallenges = [...personalChallenges, ...GOALS_CHALLENGES];
  const filteredChallenges = allChallenges.filter((challenge) => {
    if (challengeFilter === 'All') {
      return true;
    }
    return challengeFilter === 'Personal' ? challenge.type === 'personal' : challenge.type === 'community';
  });
  const selectedInsightContent = activeInsightTab ? insightContentByTab[activeInsightTab] : null;
  const selectedCommunityShareLink = selectedJoinedCommunity
    ? `https://connectedwellness.app/community/${toShareSlug(selectedJoinedCommunity.name)}?invite=demo2026`
    : null;
  const progressPostsForSelectedCommunity: ProgressBoardPost[] = selectedJoinedCommunity == null
    ? []
    : [
        ...(communityCustomPostsByName[selectedJoinedCommunity.name] ?? []),
        ...COMMUNITY_PROGRESS_POSTS.map((post) => ({
          id: `seed-${post.id}`,
          author: post.author,
          time: post.time,
          caption: post.caption,
          imageLabel: post.imageLabel,
          imageUrl: null,
          mediaPublicId: null,
          mediaType: 'image' as const,
          status: 'ready' as const,
          processingError: null,
        })),
      ];
  const filteredQuickMetricOptions = QUICK_ACTION_METRIC_OPTIONS.filter((metric) => {
    const query = quickMetricSearchQuery.trim().toLowerCase();
    if (!query) {
      return dashboardQuickMetrics.includes(metric);
    }
    return metric.toLowerCase().includes(query);
  });
  const toggleDashboardQuickMetric = (metric: InsightTab) => {
    setDashboardQuickMetrics((prev) => {
      if (prev.includes(metric)) {
        return prev.filter((m) => m !== metric);
      }
      if (prev.length < DASHBOARD_QUICK_ACTION_SLOTS) {
        return [...prev, metric];
      }
      return [...prev.slice(1), metric];
    });
  };

  const openInviteContacts = async () => {
    if (!selectedCommunityShareLink || !selectedJoinedCommunity) {
      return;
    }
    setLoadingInviteContacts(true);
    const permission = await Contacts.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      setLoadingInviteContacts(false);
      Alert.alert('Contacts permission required', 'Enable contacts access to invite people directly.');
      return;
    }
    const result = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName,
    });
    const mapped: InviteContact[] = result.data.slice(0, 60).map((contact: Contacts.Contact, index: number) => ({
      id: `${contact.name ?? 'contact'}-${index}`,
      name: contact.name ?? 'Unknown Contact',
      phone: contact.phoneNumbers?.[0]?.number ?? null,
    }));
    setInviteContacts(mapped);
    setLoadingInviteContacts(false);
    setShowInvitePopup(true);
  };

  const createPersonalChallenge = () => {
    const title = newChallengeTitle.trim();
    const detail = newChallengeDetail.trim();
    if (!title || !detail) {
      Alert.alert('Missing details', 'Please add a title and details for your personal challenge.');
      return;
    }
    setPersonalChallenges((prev) => [{ title, detail, members: 'Personal', type: 'personal' }, ...prev]);
    setChallengeFilter('Personal');
    setNewChallengeTitle('');
    setNewChallengeDetail('');
    setShowCreatePersonalChallengeModal(false);
  };

  const pickProgressPostImage = async (source: 'library' | 'camera') => {
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            // iOS camera editing can crash on some native stacks; keep capture path stable.
            allowsEditing: false,
            quality: 0.86,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.86,
          });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      setCreatePostImageUri(result.assets[0].uri);
      setCreatePostCaption('');
      setShowCreateProgressPostModal(true);
    } catch (error) {
      Alert.alert('Camera error', toErrorText(error));
    }
  };

  const launchCreatePostFromSource = async (source: 'library' | 'camera') => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Camera permission required', 'Enable camera access to take a photo for your post.');
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Photos permission required', 'Enable photo library access to add an image post.');
        return;
      }
    }
    // Defer presentation so iOS finishes dismissing the alert first.
    setTimeout(() => {
      pickProgressPostImage(source).catch((error) => {
        Alert.alert('Media picker error', toErrorText(error));
      });
    }, 250);
  };

  const openCreateProgressPostModal = async () => {
    if (!selectedJoinedCommunity) {
      Alert.alert('Select a community', 'Open a joined community before creating a post.');
      return;
    }
    Alert.alert('Create Post', 'Choose how you want to add a photo.', [
      {
        text: 'Take Photo',
        onPress: () => {
          launchCreatePostFromSource('camera').catch((error) => {
            Alert.alert('Camera error', toErrorText(error));
          });
        },
      },
      {
        text: 'Photo Library',
        onPress: () => {
          launchCreatePostFromSource('library').catch((error) => {
            Alert.alert('Photo library error', toErrorText(error));
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const updateCommunityPost = (communityName: string, postId: string, patch: Partial<ProgressBoardPost>) => {
    setCommunityCustomPostsByName((prev) => {
      const posts = prev[communityName] ?? [];
      return {
        ...prev,
        [communityName]: posts.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
      };
    });
  };

  const createProgressPost = async () => {
    if (!selectedJoinedCommunity || !createPostImageUri) {
      return;
    }
    const trimmedCaption = createPostCaption.trim();
    const resolvedCaption = trimmedCaption.length > 0 ? trimmedCaption : 'Shared a progress photo.';
    setIsPublishingProgressPost(true);
    const communityName = selectedJoinedCommunity.name;
    const localPostId = `local-${Date.now()}`;
    const optimisticPost: ProgressBoardPost = {
      id: localPostId,
      author: 'You',
      time: 'Just now',
      caption: resolvedCaption,
      imageLabel: 'Uploading progress photo...',
      imageUrl: createPostImageUri,
      mediaPublicId: null,
      mediaType: 'image',
      status: 'processing',
      processingError: null,
    };
    setCommunityCustomPostsByName((prev) => ({
      ...prev,
      [communityName]: [optimisticPost, ...(prev[communityName] ?? [])],
    }));
    try {
      const cloudinaryResult = await uploadImageToCloudinary(createPostImageUri);
      const firestore = getFirestoreInstance();
      if (firestore) {
        await addDoc(collection(firestore, 'progress_posts'), {
          communityId: toShareSlug(communityName),
          communityName,
          authorId: 'demo-user',
          authorName: 'You',
          caption: resolvedCaption,
          mediaUrl: cloudinaryResult.secureUrl,
          mediaPublicId: cloudinaryResult.publicId,
          mediaType: 'image',
          status: 'processing',
          autoDescription: '',
          autoTags: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      updateCommunityPost(communityName, localPostId, {
        imageLabel: 'Uploaded progress photo',
        imageUrl: cloudinaryResult.secureUrl,
        mediaPublicId: cloudinaryResult.publicId,
        status: 'ready',
      });
      setShowCreateProgressPostModal(false);
      setCreatePostCaption('');
      setCreatePostImageUri(null);
      if (!hasFirebaseConfig) {
        Alert.alert('Local-only mode', 'Post uploaded to Cloudinary. Add EXPO_PUBLIC_FIREBASE_* vars to also write Firestore records.');
      }
    } catch (error) {
      updateCommunityPost(communityName, localPostId, {
        imageLabel: 'Upload failed',
        status: 'failed',
        processingError: toErrorText(error),
      });
      Alert.alert('Post upload failed', toErrorText(error));
    } finally {
      setIsPublishingProgressPost(false);
    }
  };

  const inviteContactBySms = async (contact: InviteContact) => {
    if (!selectedCommunityShareLink || !selectedJoinedCommunity) {
      return;
    }
    if (!contact.phone) {
      Alert.alert('No phone number', `${contact.name} does not have a phone number saved.`);
      return;
    }
    const message = encodeURIComponent(
      `Join me in ${selectedJoinedCommunity.name} on Connected Wellness: ${selectedCommunityShareLink}`,
    );
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const smsUrl = `sms:${contact.phone}${separator}body=${message}`;
    const canOpen = await Linking.canOpenURL(smsUrl);
    if (!canOpen) {
      Alert.alert('Unable to open messaging app', 'Please try again on a device with SMS support.');
      return;
    }
    await Linking.openURL(smsUrl);
  };

  const initHealthKitAsync = async () => {
    if (healthKitLoading) {
      return;
    }
    setHealthKitLoading(true);
    setHealthKitLastError(null);
    try {
      if (Platform.OS !== 'ios') {
        setHealthKitStatus('unsupported');
        setHealthKitLastError('HealthKit is only available on iOS devices.');
        return;
      }
      if (!healthKit.initHealthKit || !healthKit.Constants?.Permissions) {
        setHealthKitStatus('unsupported');
        setHealthKitLastError('Native HealthKit module unavailable in current build.');
        return;
      }

      const readPermissions = healthKit.Constants.Permissions;
      const permissions = {
        permissions: {
          read: [
            readPermissions.HeartRate,
            readPermissions.RestingHeartRate,
            readPermissions.HeartRateVariability,
            readPermissions.RespiratoryRate,
            readPermissions.OxygenSaturation,
            readPermissions.StepCount,
            readPermissions.DistanceWalkingRunning,
            readPermissions.FlightsClimbed,
            readPermissions.SleepAnalysis,
            readPermissions.ActiveEnergyBurned,
            readPermissions.BasalEnergyBurned,
            readPermissions.AppleExerciseTime,
            readPermissions.AppleStandTime,
            readPermissions.MindfulSession,
            readPermissions.BodyTemperature,
            readPermissions.Weight,
            readPermissions.Vo2Max,
            readPermissions.BloodGlucose,
          ].filter(Boolean),
          write: [],
        },
      };

      let initErrorMessage: unknown = null;
      const initialized = await new Promise<boolean>((resolve) => {
        healthKit.initHealthKit?.(permissions, (error?: unknown) => {
          initErrorMessage = error ?? null;
          resolve(!error);
        });
      });

      if (!initialized) {
        const readableError = toErrorText(initErrorMessage ?? 'HealthKit authorization failed.');
        setHealthKitStatus('denied');
        setHealthKitLastError(readableError);
        Alert.alert('Apple Health connection failed', readableError);
        return;
      }

      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const yesterdayStart = new Date(dayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const fourteenDaysStart = new Date(dayStart);
      fourteenDaysStart.setDate(fourteenDaysStart.getDate() - 14);

      const formatTrend = (current: number, previous: number, suffix: string) => {
        if (current <= 0 && previous <= 0) {
          return 'Trend: collecting baseline data';
        }
        if (previous <= 0) {
          return `Trend: +${current.toFixed(1)}${suffix} vs baseline`;
        }
        const deltaPct = ((current - previous) / previous) * 100;
        const sign = deltaPct >= 0 ? '+' : '';
        return `Trend: ${sign}${deltaPct.toFixed(1)}% vs previous period`;
      };
      const dayLabel = (value: Date) => value.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
      const getLastNDays = (n: number) =>
        Array.from({ length: n }, (_, index) => {
          const d = new Date(dayStart);
          d.setDate(dayStart.getDate() - (n - 1 - index));
          return d;
        });
      const sevenDayDates = getLastNDays(7);
      const sevenDayLabels = sevenDayDates.map(dayLabel);
      const toDayKey = (value: Date) => value.toISOString().slice(0, 10);
      const zeroSeries = () => [0, 0, 0, 0, 0, 0, 0];
      const latest = (series: number[]) => series[series.length - 1] ?? 0;
      const previous = (series: number[]) => series[series.length - 2] ?? 0;
      const loadSeriesFromSamples = async (
        getter: ((options: unknown, callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void) => void) | undefined,
        options: Record<string, unknown>,
        mode: 'sum' | 'avg' = 'sum',
        valueMapper?: (value: number) => number,
      ) => {
        if (!getter) {
          return zeroSeries();
        }
        return new Promise<number[]>((resolve) => {
          getter(options, (_error, result) => {
            const samples = result ?? [];
            const byDay = new Map<string, { sum: number; count: number }>();
            samples.forEach((sample) => {
              const raw = sample.value ?? 0;
              const mapped = valueMapper ? valueMapper(raw) : raw;
              if (!Number.isFinite(mapped)) {
                return;
              }
              const ts = sample.startDate
                ? new Date(sample.startDate).getTime()
                : sample.endDate
                  ? new Date(sample.endDate).getTime()
                  : 0;
              if (!ts || ts < sevenDayDates[0].getTime()) {
                return;
              }
              const key = toDayKey(new Date(ts));
              const prevVal = byDay.get(key) ?? { sum: 0, count: 0 };
              prevVal.sum += mapped;
              prevVal.count += 1;
              byDay.set(key, prevVal);
            });
            const series = sevenDayDates.map((d) => {
              const day = byDay.get(toDayKey(d));
              if (!day || day.count === 0) {
                return 0;
              }
              const value = mode === 'avg' ? day.sum / day.count : day.sum;
              return Number(value.toFixed(1));
            });
            resolve(series);
          });
        });
      };

      let heartRateValue = 0;
      let heartRatePrevious = 0;
      let stepCountValue = 0;
      let stepCountPrevious = 0;
      let sleepHours = 0;
      let sleepHoursPrevious = 0;
      let activeEnergyKcal = 0;
      let activeEnergyPrevious = 0;
      let mindfulSessions = 0;
      let mindfulSessionsPrevious = 0;
      let heartRateTrendPoints = new Array(7).fill(0);
      let stepTrendPoints = new Array(7).fill(0);
      let sleepTrendPoints = new Array(7).fill(0);
      let activeEnergyTrendPoints = new Array(7).fill(0);
      let mindfulnessTrendPoints = new Array(7).fill(0);
      let restingHeartRateTrendPoints = zeroSeries();
      let hrvTrendPoints = zeroSeries();
      let respiratoryTrendPoints = zeroSeries();
      let bloodOxygenTrendPoints = zeroSeries();
      let distanceTrendPoints = zeroSeries();
      let flightsTrendPoints = zeroSeries();
      let basalEnergyTrendPoints = zeroSeries();
      let exerciseTimeTrendPoints = zeroSeries();
      let standTimeTrendPoints = zeroSeries();
      let bodyTemperatureTrendPoints = zeroSeries();
      let weightTrendPoints = zeroSeries();
      let vo2MaxTrendPoints = zeroSeries();
      let bloodGlucoseTrendPoints = zeroSeries();

      if (healthKit.getLatestHeartRate) {
        await new Promise<void>((resolve) => {
          healthKit.getLatestHeartRate?.({}, (_error, result) => {
            heartRateValue = Math.round(result?.value ?? 0);
            resolve();
          });
        });
      }
      if (healthKit.getHeartRateSamples) {
        await new Promise<void>((resolve) => {
          healthKit.getHeartRateSamples?.(
            {
              startDate: fourteenDaysStart.toISOString(),
              endDate: now.toISOString(),
            },
            (_error, result) => {
              const samples = result ?? [];
              const previousSamples = samples.filter((sample) => {
                const ts = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                return ts >= yesterdayStart.getTime() && ts < dayStart.getTime();
              });
              const vals = previousSamples.map((s) => s.value ?? 0).filter((v) => v > 0);
              if (vals.length > 0) {
                heartRatePrevious = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
              }
              const byDay = new Map<string, number[]>();
              samples.forEach((sample) => {
                const ts = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                if (!ts || ts < sevenDayDates[0].getTime()) {
                  return;
                }
                const key = toDayKey(new Date(ts));
                const prev = byDay.get(key) ?? [];
                if ((sample.value ?? 0) > 0) {
                  prev.push(sample.value ?? 0);
                  byDay.set(key, prev);
                }
              });
              heartRateTrendPoints = sevenDayDates.map((d) => {
                const valsForDay = byDay.get(toDayKey(d)) ?? [];
                if (valsForDay.length === 0) {
                  return 0;
                }
                const avg = valsForDay.reduce((a, b) => a + b, 0) / valsForDay.length;
                return Math.round(avg);
              });
              resolve();
            },
          );
        });
      }
      if (healthKit.getStepCount) {
        const stepResults: number[] = [];
        for (const date of sevenDayDates) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolve) => {
            const rangeStart = new Date(date);
            const rangeEnd = new Date(date);
            rangeEnd.setDate(rangeEnd.getDate() + 1);
            const isToday = toDayKey(date) === toDayKey(dayStart);
            healthKit.getStepCount?.(
              {
                date: date.toISOString(),
                startDate: rangeStart.toISOString(),
                endDate: isToday ? now.toISOString() : rangeEnd.toISOString(),
              },
              (_error, result) => {
                stepResults.push(Math.round(result?.value ?? 0));
                resolve();
              },
            );
          });
        }
        stepTrendPoints = stepResults;
        stepCountValue = stepResults[stepResults.length - 1] ?? 0;
        stepCountPrevious = stepResults[stepResults.length - 2] ?? 0;
      }
      if (healthKit.getSleepSamples) {
        await new Promise<void>((resolve) => {
          healthKit.getSleepSamples?.(
            {
              startDate: fourteenDaysStart.toISOString(),
              endDate: now.toISOString(),
            },
            (_error, result) => {
              const samples = result ?? [];
              const sleepByDay = new Map<string, number>();
              samples.forEach((sample) => {
                const value = sample.value?.toLowerCase() ?? '';
                if (!value.includes('asleep')) {
                  return;
                }
                const start = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                const end = sample.endDate ? new Date(sample.endDate).getTime() : 0;
                if (!start || !end || end <= start) {
                  return;
                }
                const key = toDayKey(new Date(end));
                const prev = sleepByDay.get(key) ?? 0;
                sleepByDay.set(key, prev + (end - start) / (1000 * 60));
              });
              sleepTrendPoints = sevenDayDates.map((d) => Number(((sleepByDay.get(toDayKey(d)) ?? 0) / 60).toFixed(1)));

              const midpoint = new Date(dayStart);
              midpoint.setDate(midpoint.getDate() - 7);
              const currentMinutes = samples.reduce((acc, sample) => {
                const value = sample.value?.toLowerCase() ?? '';
                if (!value.includes('asleep')) {
                  return acc;
                }
                const start = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                const end = sample.endDate ? new Date(sample.endDate).getTime() : 0;
                if (!start || !end || end <= start || end < midpoint.getTime()) {
                  return acc;
                }
                return acc + (end - start) / (1000 * 60);
              }, 0);
              const totalMinutes = samples.reduce((acc, sample) => {
                const value = sample.value?.toLowerCase() ?? '';
                if (!value.includes('asleep')) {
                  return acc;
                }
                const start = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                const end = sample.endDate ? new Date(sample.endDate).getTime() : 0;
                if (!start || !end || end <= start) {
                  return acc;
                }
                return acc + (end - start) / (1000 * 60);
              }, 0);
              const previousMinutes = totalMinutes - currentMinutes;

              sleepHours = Number((currentMinutes / 60 / 7).toFixed(1));
              sleepHoursPrevious = Number((previousMinutes / 60 / 7).toFixed(1));
              resolve();
            },
          );
        });
      }
      if (healthKit.getActiveEnergyBurned) {
        await new Promise<void>((resolve) => {
          healthKit.getActiveEnergyBurned?.(
            {
              unit: healthKit.Constants?.Units?.kcal ?? 'kcal',
              startDate: yesterdayStart.toISOString(),
              endDate: now.toISOString(),
            },
            (_error, result) => {
              const samples = result ?? [];
              const byDay = new Map<string, number>();
              samples.forEach((sample) => {
                const dt = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                if (!dt) {
                  return;
                }
                const key = toDayKey(new Date(dt));
                byDay.set(key, (byDay.get(key) ?? 0) + (sample.value ?? 0));
              });
              activeEnergyTrendPoints = sevenDayDates.map((d) => Math.round(byDay.get(toDayKey(d)) ?? 0));
              const split = dayStart.getTime();
              activeEnergyKcal = Math.round(
                samples
                  .filter((sample) => {
                    const dt = sample.startDate ? new Date(sample.startDate).getTime() : split;
                    return dt >= split;
                  })
                  .reduce((acc, sample) => acc + (sample.value ?? 0), 0),
              );
              activeEnergyPrevious = Math.round(
                samples
                  .filter((sample) => {
                    const dt = sample.startDate ? new Date(sample.startDate).getTime() : split - 1;
                    return dt < split;
                  })
                  .reduce((acc, sample) => acc + (sample.value ?? 0), 0),
              );
              resolve();
            },
          );
        });
      }
      if (healthKit.getMindfulSession) {
        await new Promise<void>((resolve) => {
          healthKit.getMindfulSession?.(
            {
              startDate: fourteenDaysStart.toISOString(),
              endDate: now.toISOString(),
            },
            (_error, result) => {
              const sessions = result ?? [];
              const byDay = new Map<string, number>();
              sessions.forEach((sample) => {
                const ts = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                if (!ts) {
                  return;
                }
                const key = toDayKey(new Date(ts));
                byDay.set(key, (byDay.get(key) ?? 0) + 1);
              });
              mindfulnessTrendPoints = sevenDayDates.map((d) => byDay.get(toDayKey(d)) ?? 0);
              mindfulSessions = sessions.filter((sample) => {
                const start = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                return start >= weekStart.getTime();
              }).length;
              mindfulSessionsPrevious = sessions.length - mindfulSessions;
              resolve();
            },
          );
        });
      }

      const baseRange = {
        startDate: sevenDayDates[0].toISOString(),
        endDate: now.toISOString(),
      };

      restingHeartRateTrendPoints = await loadSeriesFromSamples(healthKit.getRestingHeartRateSamples, baseRange, 'avg');
      hrvTrendPoints = await loadSeriesFromSamples(healthKit.getHeartRateVariabilitySamples, baseRange, 'avg');
      respiratoryTrendPoints = await loadSeriesFromSamples(healthKit.getRespiratoryRateSamples, baseRange, 'avg');
      bloodOxygenTrendPoints = await loadSeriesFromSamples(
        healthKit.getOxygenSaturationSamples,
        baseRange,
        'avg',
        (v) => (v <= 1 ? v * 100 : v),
      );
      distanceTrendPoints = await loadSeriesFromSamples(
        healthKit.getDailyDistanceWalkingRunningSamples,
        {
          ...baseRange,
          unit: healthKit.Constants?.Units?.mile ?? 'mile',
        },
        'sum',
      );
      flightsTrendPoints = await loadSeriesFromSamples(healthKit.getDailyFlightsClimbedSamples, baseRange, 'sum');
      basalEnergyTrendPoints = await loadSeriesFromSamples(
        healthKit.getBasalEnergyBurned,
        {
          ...baseRange,
          unit: healthKit.Constants?.Units?.kcal ?? 'kcal',
        },
        'sum',
      );
      exerciseTimeTrendPoints = await loadSeriesFromSamples(
        healthKit.getAppleExerciseTime,
        {
          ...baseRange,
          unit: healthKit.Constants?.Units?.minute ?? 'minute',
        },
        'sum',
      );
      standTimeTrendPoints = await loadSeriesFromSamples(
        healthKit.getAppleStandTime,
        {
          ...baseRange,
          unit: healthKit.Constants?.Units?.minute ?? 'minute',
        },
        'sum',
      );
      bodyTemperatureTrendPoints = await loadSeriesFromSamples(
        healthKit.getBodyTemperatureSamples,
        {
          ...baseRange,
          unit: healthKit.Constants?.Units?.fahrenheit ?? 'fahrenheit',
        },
        'avg',
      );
      weightTrendPoints = await loadSeriesFromSamples(
        healthKit.getWeightSamples,
        {
          ...baseRange,
          unit: healthKit.Constants?.Units?.pound ?? 'pound',
        },
        'avg',
      );
      vo2MaxTrendPoints = await loadSeriesFromSamples(healthKit.getVo2MaxSamples, baseRange, 'avg');
      bloodGlucoseTrendPoints = await loadSeriesFromSamples(
        healthKit.getBloodGlucoseSamples,
        {
          ...baseRange,
          unit: healthKit.Constants?.Units?.mgPerdL ?? 'mgPerdL',
        },
        'avg',
      );

      setInsightContentByTab({
        'Heart Rate': {
          title: 'Latest Heart Rate',
          summary: heartRateValue > 0 ? `${heartRateValue} bpm (latest sample from Apple Health)` : 'No recent heart rate sample found.',
          trend: formatTrend(heartRateValue, heartRatePrevious, ' bpm'),
          recommendation: 'Track heart rate daily for stronger baseline trends.',
          trendPoints: heartRateTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'bpm',
        },
        'Resting Heart Rate': {
          title: 'Resting Heart Rate',
          summary: latest(restingHeartRateTrendPoints) > 0
            ? `${latest(restingHeartRateTrendPoints)} bpm most recent day`
            : 'No resting heart-rate samples found.',
          trend: formatTrend(latest(restingHeartRateTrendPoints), previous(restingHeartRateTrendPoints), ' bpm'),
          recommendation: 'A lower, stable resting heart rate often reflects good recovery.',
          trendPoints: restingHeartRateTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'bpm',
        },
        'Heart Rate Variability': {
          title: 'Heart Rate Variability',
          summary: latest(hrvTrendPoints) > 0 ? `${latest(hrvTrendPoints)} ms recent average` : 'No HRV samples found.',
          trend: formatTrend(latest(hrvTrendPoints), previous(hrvTrendPoints), ' ms'),
          recommendation: 'Consistent sleep and stress management can improve HRV over time.',
          trendPoints: hrvTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'ms',
        },
        'Respiratory Rate': {
          title: 'Respiratory Rate',
          summary: latest(respiratoryTrendPoints) > 0
            ? `${latest(respiratoryTrendPoints)} breaths/min recent average`
            : 'No respiratory-rate samples found.',
          trend: formatTrend(latest(respiratoryTrendPoints), previous(respiratoryTrendPoints), ' br/min'),
          recommendation: 'Watch for sustained shifts and pair with recovery signals.',
          trendPoints: respiratoryTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'br/min',
        },
        'Blood Oxygen': {
          title: 'Blood Oxygen',
          summary: latest(bloodOxygenTrendPoints) > 0 ? `${latest(bloodOxygenTrendPoints)}% recent average` : 'No blood-oxygen samples found.',
          trend: formatTrend(latest(bloodOxygenTrendPoints), previous(bloodOxygenTrendPoints), '%'),
          recommendation: 'Regular sleep and cardio activity can support oxygen efficiency.',
          trendPoints: bloodOxygenTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: '%',
        },
        Steps: {
          title: 'Today Steps',
          summary: `${stepCountValue.toLocaleString()} steps today from Apple Health`,
          trend: formatTrend(stepCountValue, stepCountPrevious, ' steps'),
          recommendation: 'Aim for short walking breaks to increase daily steps.',
          trendPoints: stepTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'steps',
        },
        'Walking + Running Distance': {
          title: 'Walking + Running Distance',
          summary: `${latest(distanceTrendPoints).toFixed(2)} mi today`,
          trend: formatTrend(latest(distanceTrendPoints), previous(distanceTrendPoints), ' mi'),
          recommendation: 'Steady distance growth usually follows small daily consistency.',
          trendPoints: distanceTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'mi',
        },
        'Flights Climbed': {
          title: 'Flights Climbed',
          summary: `${latest(flightsTrendPoints).toFixed(0)} floors climbed today`,
          trend: formatTrend(latest(flightsTrendPoints), previous(flightsTrendPoints), ' floors'),
          recommendation: 'Short stair sessions are an easy way to increase intensity.',
          trendPoints: flightsTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'floors',
        },
        Sleep: {
          title: 'Sleep Duration',
          summary: sleepHours > 0 ? `${sleepHours} avg hours/night over last 7 days` : 'No sleep samples found for the selected period.',
          trend: formatTrend(sleepHours, sleepHoursPrevious, 'h'),
          recommendation: 'Maintain consistent wind-down to improve sleep duration.',
          trendPoints: sleepTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'h',
        },
        'Active Energy': {
          title: 'Active Energy',
          summary: `${activeEnergyKcal} kcal burned today`,
          trend: formatTrend(activeEnergyKcal, activeEnergyPrevious, ' kcal'),
          recommendation: 'Add brief activity intervals to increase active energy burn.',
          trendPoints: activeEnergyTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'kcal',
        },
        'Basal Energy': {
          title: 'Basal Energy',
          summary: `${latest(basalEnergyTrendPoints).toFixed(0)} kcal most recent day`,
          trend: formatTrend(latest(basalEnergyTrendPoints), previous(basalEnergyTrendPoints), ' kcal'),
          recommendation: 'Basal energy reflects foundational metabolism and body needs.',
          trendPoints: basalEnergyTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'kcal',
        },
        'Exercise Time': {
          title: 'Exercise Time',
          summary: `${latest(exerciseTimeTrendPoints).toFixed(0)} active minutes today`,
          trend: formatTrend(latest(exerciseTimeTrendPoints), previous(exerciseTimeTrendPoints), ' min'),
          recommendation: 'Short exercise blocks compound well over a week.',
          trendPoints: exerciseTimeTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'min',
        },
        'Stand Time': {
          title: 'Stand Time',
          summary: `${latest(standTimeTrendPoints).toFixed(0)} stand minutes today`,
          trend: formatTrend(latest(standTimeTrendPoints), previous(standTimeTrendPoints), ' min'),
          recommendation: 'Break up sitting every hour to improve stand trends.',
          trendPoints: standTimeTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'min',
        },
        Mindfulness: {
          title: 'Mindful Sessions',
          summary: `${mindfulSessions} mindful session${mindfulSessions === 1 ? '' : 's'} in last 7 days`,
          trend: formatTrend(mindfulSessions, mindfulSessionsPrevious, ' sessions'),
          recommendation: 'A short daily mindful session can support stress recovery.',
          trendPoints: mindfulnessTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'sessions',
        },
        'Body Temperature': {
          title: 'Body Temperature',
          summary: latest(bodyTemperatureTrendPoints) > 0
            ? `${latest(bodyTemperatureTrendPoints)} degF recent average`
            : 'No body-temperature samples found.',
          trend: formatTrend(latest(bodyTemperatureTrendPoints), previous(bodyTemperatureTrendPoints), ' degF'),
          recommendation: 'Use trends, not single points, to interpret temperature changes.',
          trendPoints: bodyTemperatureTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'degF',
        },
        Weight: {
          title: 'Weight',
          summary: latest(weightTrendPoints) > 0 ? `${latest(weightTrendPoints)} lb recent value` : 'No weight samples found.',
          trend: formatTrend(latest(weightTrendPoints), previous(weightTrendPoints), ' lb'),
          recommendation: 'Weekly averages are more meaningful than daily fluctuations.',
          trendPoints: weightTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'lb',
        },
        'VO2 Max': {
          title: 'VO2 Max',
          summary: latest(vo2MaxTrendPoints) > 0 ? `${latest(vo2MaxTrendPoints)} mL/kg/min recent estimate` : 'No VO2 max samples found.',
          trend: formatTrend(latest(vo2MaxTrendPoints), previous(vo2MaxTrendPoints), ' mL/kg/min'),
          recommendation: 'Cardio consistency is key for meaningful VO2 max improvements.',
          trendPoints: vo2MaxTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'mL/kg/min',
        },
        'Blood Glucose': {
          title: 'Blood Glucose',
          summary: latest(bloodGlucoseTrendPoints) > 0 ? `${latest(bloodGlucoseTrendPoints)} mg/dL recent average` : 'No blood-glucose samples found.',
          trend: formatTrend(latest(bloodGlucoseTrendPoints), previous(bloodGlucoseTrendPoints), ' mg/dL'),
          recommendation: 'Pair glucose trends with meals and activity for context.',
          trendPoints: bloodGlucoseTrendPoints,
          trendLabels: sevenDayLabels,
          trendUnit: 'mg/dL',
        },
      });
      setHealthKitStatus('ready');
    } catch (error) {
      const errorMessage = toErrorText(error);
      setHealthKitStatus('denied');
      setHealthKitLastError(errorMessage);
      Alert.alert('Apple Health connection failed', errorMessage);
    } finally {
      setHealthKitLoading(false);
    }
  };

  useEffect(() => {
    if (startupPermissionsRequested) {
      return;
    }
    let cancelled = false;
    async function requestStartupPermissions() {
      setStartupPermissionsRequested(true);
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch {
        // Ignore startup permission failures; user can retry in feature flows.
      }
      try {
        await Contacts.requestPermissionsAsync();
      } catch {
        // Ignore startup permission failures; user can retry in feature flows.
      }
      if (Notifications?.requestPermissionsAsync) {
        try {
          await Notifications.requestPermissionsAsync();
        } catch {
          // Ignore startup permission failures; user can retry in feature flows.
        }
      }
      if (!cancelled) {
        void initHealthKitAsync();
      }
    }
    void requestStartupPermissions();
    return () => {
      cancelled = true;
    };
  }, [startupPermissionsRequested]);

  useEffect(() => {
    if (!useDeviceLocation) {
      setLocationStatus('off');
      setLocationCoords(null);
      return;
    }

    let cancelled = false;
    async function resolveDeviceLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (!cancelled) {
            setLocationStatus('denied');
            setLocationCoords(null);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setLocationStatus('granted');
          setLocationCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        }
      } catch {
        if (!cancelled) {
          setLocationStatus('denied');
          setLocationCoords(null);
        }
      }
    }

    void resolveDeviceLocation();
    return () => {
      cancelled = true;
    };
  }, [useDeviceLocation]);

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      try {
        const fallbackCoords = { lat: 34.0689, lon: -118.4452 };
        const coords = useDeviceLocation && locationCoords ? locationCoords : fallbackCoords;
        const snapshot = await fetchCurrentWeather(coords.lat, coords.lon);
        if (!cancelled) {
          setWeatherF(snapshot.temperatureF);
          setWeatherLabel(snapshot.conditionLabel);
        }
      } catch {
        // Keep existing fallback values on failure.
      }
    }
    void loadWeather();
    const refresh = setInterval(loadWeather, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, [useDeviceLocation, locationCoords]);

  useEffect(() => {
    if (!demoScoreDriftEnabled) {
      return;
    }
    const intervalMs = demoFastDriftEnabled ? 380 : 700;
    const interval = setInterval(() => {
      setHealthScore((prev: number) => {
        const result = getNextDemoScore(prev, scoreDirectionRef.current, demoFastDriftEnabled);
        scoreDirectionRef.current = result.nextDirection;
        return result.next;
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [demoScoreDriftEnabled, demoFastDriftEnabled]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(heartPulseAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [heartPulseAnim]);

  useEffect(() => {
    if (alertCount <= 0) {
      alertBadgeBounceAnim.setValue(0);
      return;
    }
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(alertBadgeBounceAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(alertBadgeBounceAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.delay(560),
      ]),
    );
    bounceLoop.start();
    return () => bounceLoop.stop();
  }, [alertCount, alertBadgeBounceAnim]);

  useEffect(() => {
    const anyDashboardDriftEnabled = Object.values(demoDashboardValueDrift).some(Boolean);
    if (!anyDashboardDriftEnabled) {
      return;
    }
    const intervalMs = demoFastDriftEnabled ? 380 : 760;
    const interval = setInterval(() => {
      const jitter = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
      if (demoDashboardValueDrift.glucose) {
        setGlucoseValue((prev) => Math.max(70, Math.min(240, prev + jitter(-5, 6))));
      }
      if (demoDashboardValueDrift.stress) {
        setStressValue((prev) => Math.max(0, Math.min(100, prev + jitter(-4, 5))));
      }
      if (demoDashboardValueDrift.heartRateCard) {
        setHeartRateCardValue((prev) => Math.max(45, Math.min(130, prev + jitter(-3, 4))));
      }
      if (demoDashboardValueDrift.steps) {
        setActivitySteps((prev) => Math.max(0, Math.min(25000, prev + jitter(40, 280))));
      }
      if (demoDashboardValueDrift.sleep) {
        setActivitySleepMinutes((prev) => Math.max(180, Math.min(600, prev + jitter(-12, 14))));
      }
      if (demoDashboardValueDrift.meds) {
        setActivityMedsTaken((prev) => {
          const next = prev + jitter(-1, 1);
          return Math.max(0, Math.min(2, next));
        });
      }
      if (demoDashboardValueDrift.water) {
        setActivityWaterGlasses((prev) => Math.max(0, Math.min(12, prev + jitter(-1, 1))));
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [demoDashboardValueDrift, demoFastDriftEnabled]);

  useEffect(() => {
    const wasEnabled = previousAlertDemoEnabledRef.current;
    previousAlertDemoEnabledRef.current = demoAlertEnabled;
    if (!demoAlertEnabled || wasEnabled) {
      return;
    }
    async function sendAlertDemoNotifications() {
      if (
        !Notifications?.getPermissionsAsync ||
        !Notifications?.requestPermissionsAsync ||
        !Notifications?.scheduleNotificationAsync ||
        !Notifications?.SchedulableTriggerInputTypes
      ) {
        return;
      }
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (!permission.granted) {
          const asked = await Notifications.requestPermissionsAsync();
          if (!asked.granted) {
            return;
          }
        }
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Abnormal Glucose',
            body: 'Glucose at 192 mg/dL.',
            sound: 'default',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, repeats: false },
        });
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Elevated Stress',
            body: 'Stress index reached 84/100.',
            sound: 'default',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, repeats: false },
        });
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Abnormal Heart Rate',
            body: 'Resting heart rate at 104 bpm.',
            sound: 'default',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, repeats: false },
        });
      } catch {
        // Ignore notification failures in demo mode.
      }
    }
    void sendAlertDemoNotifications();
  }, [demoAlertEnabled]);

  useEffect(() => {
    if (activeTab !== 'Map') {
      return;
    }
    let cancelled = false;
    async function loadMapLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (!cancelled) {
            setMapLocationStatus('denied');
            setMapCoords(null);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setMapLocationStatus('granted');
          setMapCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        }
      } catch {
        if (!cancelled) {
          setMapLocationStatus('denied');
          setMapCoords(null);
        }
      }
    }
    void loadMapLocation();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'Goals') {
      setGoalsTab('Communities');
    }
  }, [activeTab]);

  useEffect(() => {
    if (goalsTab !== 'Active') {
      setSelectedJoinedCommunityName(null);
    }
  }, [goalsTab]);

  useEffect(() => {
    if (activeTab !== 'Insights' || healthKitStatus === 'ready' || healthKitLoading) {
      return;
    }
    void initHealthKitAsync();
  }, [activeTab, healthKitStatus, healthKitLoading]);

  useEffect(() => {
    if (selectedJoinedCommunityName == null) {
      setSelectedCommunityAction('Progress Board');
      setEventsTab('Upcoming');
      setIsInteractingWithEventsList(false);
      setShowOverviewPopup(false);
      setShowInvitePopup(false);
    }
  }, [selectedJoinedCommunityName]);

  return (
    <View style={styles.container}>
      <View style={styles.gridOverlay} />
      <View style={styles.topGlow} />
      <StatusBar style="light" />
      {activeTab === 'Map' ? (
        <View style={styles.mapScreen}>
          <Text style={styles.mapTitle}>Map</Text>
          <View style={styles.mapLayerRow}>
            {MAP_LAYERS.map((layer) => (
              <TouchableOpacity
                key={layer}
                onPress={() => setActiveMapLayer(layer)}
                style={[styles.mapLayerChip, activeMapLayer === layer && styles.mapLayerChipActive]}
              >
                <Text style={[styles.mapLayerChipText, activeMapLayer === layer && styles.mapLayerChipTextActive]}>{layer}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.mapSubtitle}>
            {mapLocationStatus === 'granted'
              ? 'Showing your current location'
              : mapLocationStatus === 'denied'
                ? 'Location permission denied. Enable it to view your map.'
                : 'Requesting location...'}
          </Text>
          {mapCoords ? (
            <View style={styles.mapContainer}>
              <MapView
                ref={mapViewRef}
                region={{
                  latitude: mapCoords.lat,
                  longitude: mapCoords.lon,
                  latitudeDelta: 0.012,
                  longitudeDelta: 0.012,
                }}
                showsUserLocation
                style={styles.map}
              >
                <Marker coordinate={{ latitude: mapCoords.lat, longitude: mapCoords.lon }} title="You are here" />
                {mapRecommendations.map((item) => (
                  <Marker
                    key={item.id}
                    coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                    pinColor="#22c55e"
                    title={item.title}
                    description={item.subtitle}
                  />
                ))}
              </MapView>
              <TouchableOpacity onPress={() => void recenterMapToCurrentLocation()} style={styles.mapRecenterBtn}>
                <Text style={styles.mapRecenterBtnText}>Locate Me</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mapFallbackCard}>
              <Text style={styles.mapFallbackText}>
                {mapLocationStatus === 'denied'
                  ? 'Map unavailable without location permission.'
                  : 'Locating device...'}
              </Text>
            </View>
          )}
        </View>
      ) : activeTab === 'Insights' ? (
        <View style={styles.insightsScreen}>
          {activeInsightTab == null ? (
            <>
              <Text style={styles.insightsTitle}>Insights</Text>
              <Text style={styles.insightsStatusText}>
                {Platform.OS !== 'ios'
                  ? 'Apple Health is available on iOS only.'
                  : healthKitLoading
                    ? 'Connecting to Apple Health...'
                  : healthKitStatus === 'ready'
                    ? 'Connected to Apple Health.'
                    : healthKitStatus === 'denied'
                      ? 'Apple Health permission denied.'
                      : healthKitStatus === 'unsupported'
                        ? 'Apple Health unavailable in this build.'
                        : 'Requesting Apple Health access...'}
              </Text>
              {Platform.OS === 'ios' && healthKitStatus !== 'ready' ? (
                <TouchableOpacity
                  disabled={healthKitLoading}
                  onPress={() => {
                    setHealthKitStatus('idle');
                    void initHealthKitAsync();
                  }}
                  style={[styles.healthConnectBtn, healthKitLoading && styles.healthConnectBtnDisabled]}
                >
                  <Text style={styles.healthConnectBtnText}>{healthKitLoading ? 'Connecting...' : 'Connect Apple Health'}</Text>
                </TouchableOpacity>
              ) : null}
              {healthKitLastError ? <Text style={styles.healthErrorText}>{healthKitLastError}</Text> : null}
              <TextInput
                onChangeText={setQuickMetricSearchQuery}
                placeholder="Search and star metrics for Dashboard quick actions"
                placeholderTextColor="#64748b"
                style={styles.quickMetricSearchInput}
                value={quickMetricSearchQuery}
              />
              <View style={styles.quickMetricSearchResults}>
                {filteredQuickMetricOptions.slice(0, 6).map((metric) => {
                  const isSelected = dashboardQuickMetrics.includes(metric);
                  return (
                    <TouchableOpacity
                      key={`search-${metric}`}
                      onPress={() => toggleDashboardQuickMetric(metric)}
                      style={[styles.quickMetricOptionChip, isSelected && styles.quickMetricOptionChipActive]}
                    >
                      <Text style={[styles.quickMetricOptionText, isSelected && styles.quickMetricOptionTextActive]}>
                        {isSelected ? '★' : '☆'} {metric}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.insightsQuickToThemesDivider} />
              <ScrollView
                bounces={false}
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
                style={styles.insightsTabScroll}
              >
                <View style={styles.insightsTabStack}>
                  {INSIGHT_GROUPS.map((group) => {
                    const isExpanded = expandedInsightGroups[group.id] ?? true;
                    return (
                      <View key={group.id} style={styles.insightsGroupCard}>
                        <View style={[styles.insightsGroupBand, { backgroundColor: group.color }]} />
                        <TouchableOpacity
                          onPress={() =>
                            setExpandedInsightGroups((prev) => ({
                              ...prev,
                              [group.id]: !isExpanded,
                            }))}
                          style={styles.insightsGroupHeader}
                        >
                          <View style={styles.insightsGroupHeaderText}>
                            <Text style={styles.insightsGroupTitle}>{group.title}</Text>
                            <Text style={styles.insightsGroupSubtitle}>{group.subtitle}</Text>
                          </View>
                          <Text style={styles.insightsGroupChevron}>{isExpanded ? '−' : '+'}</Text>
                        </TouchableOpacity>
                        {isExpanded ? (
                          <View style={styles.insightsGroupBody}>
                            {group.tabs.map((tab) => (
                              <View key={`${group.id}-${tab}`} style={styles.insightsTab}>
                                <View style={[styles.insightsSubTabBand, { backgroundColor: group.color }]} />
                                <TouchableOpacity onPress={() => setActiveInsightTab(tab)} style={styles.insightsTabMainPress}>
                                  <Text style={styles.insightsTabText}>{tab}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => toggleDashboardQuickMetric(tab)}
                                  style={[
                                    styles.insightsTabStarBtn,
                                    dashboardQuickMetrics.includes(tab) && styles.insightsTabStarBtnActive,
                                  ]}
                                >
                                  <Text style={styles.insightsTabStarText}>{dashboardQuickMetrics.includes(tab) ? '★' : '☆'}</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          ) : (
            <View style={styles.insightsDetailScreen}>
              <View style={styles.insightsDetailHeader}>
                <TouchableOpacity onPress={() => setActiveInsightTab(null)} style={styles.insightsBackBtn}>
                  <Text style={styles.insightsBackText}>{'<'}</Text>
                </TouchableOpacity>
                <View style={styles.insightsDetailHeaderText}>
                  <Text style={styles.insightsTitle}>{activeInsightTab}</Text>
                  <Text style={styles.insightsDetailSubtitle}>Dedicated insight screen</Text>
                </View>
              </View>
              {selectedInsightContent ? (
                <>
                  <View style={styles.insightsCard}>
                    <Text style={styles.insightsCardTitle}>{selectedInsightContent.title}</Text>
                    <Text style={styles.insightsCardSummary}>{selectedInsightContent.summary}</Text>
                    <Text style={styles.insightsCardTrend}>{selectedInsightContent.trend}</Text>
                  </View>
                  <View style={styles.insightsCard}>
                    <View style={styles.insightsChartHeader}>
                      <Text style={styles.insightsCardSection}>7-Day Trend</Text>
                      <Text style={styles.insightsChartUnit}>Unit: {selectedInsightContent.trendUnit}</Text>
                    </View>
                    <View style={styles.insightsLineChartWrap}>
                      {(() => {
                        const points = selectedInsightContent.trendPoints ?? [0, 0, 0, 0, 0, 0, 0];
                        const labels = selectedInsightContent.trendLabels ?? ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                        const chartWidth = 320;
                        const chartHeight = 120;
                        const graphPaddingX = 16;
                        const graphPaddingY = 14;
                        const max = Math.max(...points, 1);
                        const usableWidth = chartWidth - graphPaddingX * 2;
                        const usableHeight = chartHeight - graphPaddingY * 2;
                        const stepX = points.length > 1 ? usableWidth / (points.length - 1) : usableWidth;
                        const coords = points.map((value, idx) => {
                          const x = graphPaddingX + idx * stepX;
                          const y = graphPaddingY + (1 - value / max) * usableHeight;
                          return { x, y, value };
                        });
                        const pathD = coords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

                        return (
                          <>
                            <Svg height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%">
                              <Path d={`M ${graphPaddingX} ${chartHeight - graphPaddingY} L ${chartWidth - graphPaddingX} ${chartHeight - graphPaddingY}`} stroke="rgba(148,163,184,0.25)" strokeWidth={1.2} />
                              <Path d={pathD} fill="none" stroke="#38bdf8" strokeWidth={2.6} />
                              {coords.map((pt, idx) => (
                                <Circle
                                  key={`${selectedInsightContent.title}-dot-${idx}`}
                                  cx={pt.x}
                                  cy={pt.y}
                                  fill="#0f172a"
                                  r={3.8}
                                  stroke="#38bdf8"
                                  strokeWidth={2}
                                />
                              ))}
                            </Svg>
                            <View style={styles.insightsLineLabelsRow}>
                              {labels.map((label, idx) => (
                                <View key={`${selectedInsightContent.title}-label-${idx}`} style={styles.insightsLineLabelItem}>
                                  <Text style={styles.insightsChartValue}>{points[idx] > 0 ? points[idx].toFixed(1).replace('.0', '') : '0'}</Text>
                                  <Text style={styles.insightsChartLabel}>{label}</Text>
                                </View>
                              ))}
                            </View>
                          </>
                        );
                      })()}
                    </View>
                  </View>
                  <View style={styles.insightsCard}>
                    <Text style={styles.insightsCardSection}>Recommendation</Text>
                    <Text style={styles.insightsCardSummary}>{selectedInsightContent.recommendation}</Text>
                  </View>
                </>
              ) : null}
            </View>
          )}
        </View>
      ) : activeTab === 'Goals' ? (
        <View style={styles.goalsScreen}>
          <Text style={styles.goalsTitle}>Goals</Text>
          <View style={styles.goalsTabRow}>
            {GOALS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setGoalsTab(tab)}
                style={[styles.goalsTab, goalsTab === tab && styles.goalsTabActive]}
              >
                <Text style={[styles.goalsTabText, goalsTab === tab && styles.goalsTabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {goalsTab === 'Active' ? (
            <ScrollView
              bounces={false}
              overScrollMode="never"
              showsVerticalScrollIndicator={false}
              style={styles.goalsScroll}
              scrollEnabled={!isInteractingWithEventsList}
            >
              {selectedJoinedCommunity ? (
                <View>
                  <View style={styles.communityHero}>
                    <View style={styles.communityHeroActions}>
                      <TouchableOpacity onPress={() => setSelectedJoinedCommunityName(null)} style={styles.communityHeroIconBtn}>
                        <Text style={styles.communityHeroIconText}>{'<'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.communityHeroIconBtn}>
                        <Text style={styles.communityHeroIconText}>⚙</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.communityHeroTag}>Community Spotlight</Text>
                  </View>
                  <View style={styles.communityDetailCard}>
                    <Text style={styles.communityDetailTitle}>{selectedJoinedCommunity.name}</Text>
                    <Text style={styles.communityDetailMeta}>Multisport • {selectedJoinedCommunity.members} • Public</Text>
                    <Text style={styles.communityDetailSub}>Built for daily progress and mutual accountability.</Text>
                    <View style={styles.communityActionsRow}>
                      {COMMUNITY_ACTIONS.map((action) => (
                        <View key={action.label} style={styles.communityActionItem}>
                          <TouchableOpacity
                            onPress={() => {
                              if (action.label === 'Overview') {
                                setShowOverviewPopup(true);
                                setSelectedCommunityAction('Progress Board');
                                return;
                              }
                              if (action.label === 'Invite') {
                                setShowOverviewPopup(false);
                                void openInviteContacts();
                                setSelectedCommunityAction('Progress Board');
                                return;
                              }
                              if (action.label === 'Share' && selectedJoinedCommunity && selectedCommunityShareLink) {
                                void Share.share({
                                  message: `Join me in ${selectedJoinedCommunity.name} on Connected Wellness: ${selectedCommunityShareLink}`,
                                  url: selectedCommunityShareLink,
                                  title: `Share ${selectedJoinedCommunity.name}`,
                                });
                                setShowOverviewPopup(false);
                                setSelectedCommunityAction('Progress Board');
                                return;
                              }
                              setShowOverviewPopup(false);
                              setSelectedCommunityAction(action.label);
                            }}
                            style={[
                              styles.communityActionIconBtn,
                              selectedCommunityAction === action.label && styles.communityActionIconBtnActive,
                            ]}
                          >
                            <Text style={styles.communityActionIcon}>{action.icon}</Text>
                          </TouchableOpacity>
                          <Text style={styles.communityActionLabel}>{action.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Modal
                    animationType="fade"
                    onRequestClose={() => setShowOverviewPopup(false)}
                    transparent
                    visible={showOverviewPopup}
                  >
                    <Pressable onPress={() => setShowOverviewPopup(false)} style={styles.communityOverviewBackdrop}>
                      <Pressable onPress={() => {}} style={styles.communityOverviewPopup}>
                        <View style={styles.communityOverviewPopupHeader}>
                          <Text style={styles.communityOverviewPopupTitle}>Community Overview</Text>
                          <TouchableOpacity onPress={() => setShowOverviewPopup(false)} style={styles.communityOverviewCloseBtn}>
                            <Text style={styles.communityOverviewCloseText}>×</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.communityOverviewPopupText}>
                          {selectedJoinedCommunity.name} is based in {selectedJoinedCommunity.city}. {COMMUNITY_OVERVIEW_DESCRIPTION}
                        </Text>
                      </Pressable>
                    </Pressable>
                  </Modal>
                  <Modal
                    animationType="fade"
                    onRequestClose={() => setShowInvitePopup(false)}
                    transparent
                    visible={showInvitePopup}
                  >
                    <Pressable onPress={() => setShowInvitePopup(false)} style={styles.communityOverviewBackdrop}>
                      <Pressable onPress={() => {}} style={styles.communityOverviewPopup}>
                        <View style={styles.communityOverviewPopupHeader}>
                          <Text style={styles.communityOverviewPopupTitle}>Invite Contacts</Text>
                          <TouchableOpacity onPress={() => setShowInvitePopup(false)} style={styles.communityOverviewCloseBtn}>
                            <Text style={styles.communityOverviewCloseText}>×</Text>
                          </TouchableOpacity>
                        </View>
                        {loadingInviteContacts ? (
                          <Text style={styles.communityOverviewPopupText}>Loading contacts...</Text>
                        ) : (
                          <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.inviteContactsList}>
                            {inviteContacts.map((contact: InviteContact) => (
                              <View key={contact.id} style={styles.inviteContactRow}>
                                <View style={styles.inviteContactInfo}>
                                  <Text style={styles.inviteContactName}>{contact.name}</Text>
                                  <Text style={styles.inviteContactPhone}>{contact.phone ?? 'No phone number'}</Text>
                                </View>
                                <TouchableOpacity onPress={() => void inviteContactBySms(contact)} style={styles.inviteContactBtn}>
                                  <Text style={styles.inviteContactBtnText}>Invite</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        )}
                      </Pressable>
                    </Pressable>
                  </Modal>
                  {selectedCommunityAction === 'Events' ? (
                    <View>
                      <Text style={styles.progressBoardTitle}>Events</Text>
                      <View style={styles.eventsTabRow}>
                        {(['Upcoming', 'Past'] as const).map((tab) => (
                          <TouchableOpacity
                            key={tab}
                            onPress={() => setEventsTab(tab)}
                            style={[styles.eventsTabBtn, eventsTab === tab && styles.eventsTabBtnActive]}
                          >
                            <Text style={[styles.eventsTabText, eventsTab === tab && styles.eventsTabTextActive]}>{tab}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View
                        onTouchCancel={() => setIsInteractingWithEventsList(false)}
                        onTouchEnd={() => setIsInteractingWithEventsList(false)}
                        onTouchStart={() => setIsInteractingWithEventsList(true)}
                        style={styles.eventsListContainer}
                      >
                        <ScrollView bounces={false} nestedScrollEnabled overScrollMode="never" showsVerticalScrollIndicator={false}>
                          {(eventsTab === 'Upcoming' ? COMMUNITY_UPCOMING_EVENTS : COMMUNITY_PAST_EVENTS).map((event, index, arr) => (
                            <View key={`${selectedJoinedCommunity.name}-${event.id}`}>
                              <View style={styles.eventRow}>
                                <View style={styles.eventDateCol}>
                                  <Text style={styles.eventDateMonth}>{event.month}</Text>
                                  <Text style={styles.eventDateDay}>{event.day}</Text>
                                  <Text style={styles.eventDateDow}>{event.dow}</Text>
                                </View>
                                <View style={styles.eventInfoCol}>
                                  <Text style={styles.eventTitle}>{event.title}</Text>
                                  <Text style={styles.eventMeta}>{event.meta}</Text>
                                  <Text style={styles.eventRsvp}>{event.rsvp}</Text>
                                </View>
                              </View>
                              {index < arr.length - 1 ? <View style={styles.eventDivider} /> : null}
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.progressBoardHeader}>
                        <Text style={styles.progressBoardTitle}>Progress Board</Text>
                        <TouchableOpacity onPress={openCreateProgressPostModal} style={styles.createPostBtn}>
                          <Text style={styles.createPostBtnText}>+ Create Post</Text>
                        </TouchableOpacity>
                      </View>
                      {progressPostsForSelectedCommunity.map((post) => (
                        <View key={`${selectedJoinedCommunity.name}-${post.id}`} style={styles.progressPostCard}>
                          <View style={styles.progressPostHeader}>
                            <Text style={styles.progressPostAuthor}>{post.author}</Text>
                            <Text style={styles.progressPostTime}>{post.time}</Text>
                          </View>
                          <Text style={styles.progressPostCaption}>{post.caption}</Text>
                          {post.status !== 'ready' ? (
                            <Text style={styles.progressPostStatus}>
                              {post.status === 'processing' ? 'Analyzing image...' : 'Upload failed. Tap Create Post to retry.'}
                            </Text>
                          ) : null}
                          <View style={styles.progressPostImage}>
                            {post.imageUrl ? (
                              <Image resizeMode="cover" source={{ uri: post.imageUrl }} style={styles.progressPostImageActual} />
                            ) : (
                              <Text style={styles.progressPostImageText}>{post.imageLabel}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : joinedCommunities.length === 0 ? (
                <View style={styles.goalsCard}>
                  <Text style={styles.goalsCardTitle}>No joined communities yet</Text>
                  <Text style={styles.goalsCardDetail}>Go to Communities and press Join to add one here.</Text>
                </View>
              ) : (
                joinedCommunities.map((community) => (
                  <TouchableOpacity key={community.name} onPress={() => setSelectedJoinedCommunityName(community.name)} style={styles.goalsCard}>
                    <Text style={styles.goalsCardTitle}>{community.name}</Text>
                    <Text style={styles.goalsCardDetail}>{community.city}</Text>
                    <Text style={styles.goalsCardMeta}>{`Joined • ${community.members}`}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          ) : null}
          {goalsTab === 'Challenges' ? (
            <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.goalsScroll}>
              <View style={styles.challengeFilterRow}>
                {CHALLENGE_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setChallengeFilter(filter)}
                    style={[styles.challengeFilterTab, challengeFilter === filter && styles.challengeFilterTabActive]}
                  >
                    <Text style={[styles.challengeFilterText, challengeFilter === filter && styles.challengeFilterTextActive]}>{filter}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {challengeFilter === 'Personal' ? (
                <TouchableOpacity onPress={() => setShowCreatePersonalChallengeModal(true)} style={styles.createPersonalChallengeBtn}>
                  <Text style={styles.createPersonalChallengeBtnText}>+ Create Personal Challenge</Text>
                </TouchableOpacity>
              ) : null}
              {filteredChallenges.map((c, index) => (
                <View
                  key={`${c.type}-${c.title}-${index}`}
                  style={[styles.goalsCard, c.type === 'community' ? styles.challengeCommunityCard : styles.challengePersonalCard]}
                >
                  <View style={styles.challengeHeaderRow}>
                    <Text style={[styles.challengeTypeBadge, c.type === 'community' ? styles.challengeTypeCommunity : styles.challengeTypePersonal]}>
                      {c.type === 'community' ? 'Community Challenge' : 'Personal Challenge'}
                    </Text>
                  </View>
                  <Text style={styles.goalsCardTitle}>{c.title}</Text>
                  <Text style={styles.goalsCardDetail}>{c.detail}</Text>
                  <Text style={styles.goalsCardMeta}>{c.members}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
          {goalsTab === 'Communities' ? (
            <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.goalsScroll}>
              <View style={styles.communitySearchBar}>
                <TextInput
                  onChangeText={setCommunitySearchQuery}
                  placeholder="Search communities, city, or focus area"
                  placeholderTextColor="#6b7280"
                  style={styles.communitySearchText}
                  value={communitySearchQuery}
                />
              </View>
              <Text style={styles.communitySectionTitle}>Popular communities near you</Text>
              <View style={styles.communityGrid}>
                {filteredCommunities.map((community) => (
                  <View key={community.name} style={styles.communityCard}>
                    <Text style={styles.communityCardBadge}>●</Text>
                    <Text style={styles.communityCardTitle}>{community.name}</Text>
                    <Text style={styles.communityCardMeta}>{community.city}</Text>
                    <Text style={styles.communityCardMeta}>{community.members}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setJoinedCommunityNames((prev: string[]) =>
                          prev.includes(community.name) ? prev : [...prev, community.name],
                        )
                      }
                      style={styles.communityJoinBtn}
                    >
                      <Text style={styles.communityJoinText}>
                        {joinedCommunityNames.includes(community.name) ? 'Joined' : 'Join'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {filteredCommunities.length === 0 ? (
                  <View style={styles.goalsCard}>
                    <Text style={styles.goalsCardTitle}>No communities found</Text>
                    <Text style={styles.goalsCardDetail}>Try a different name or city in search.</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          ) : null}
        </View>
      ) : (
        <>
        <ScrollView bounces={false} contentContainerStyle={styles.content} overScrollMode="never" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowAlertsScreen(true)} style={styles.alertBlock}>
            <View style={styles.alertIconWrap}>
              <Svg height={28} viewBox="0 0 48 32" width={40}>
                <Path
                  d="M9 8h4l3-3h16l3 3h4l3 4v11l-3 3h-4l-2 2H15l-2-2H9l-3-3V12l3-4zm7 4c-4 0-7 3-7 7s3 7 7 7h16c4 0 7-3 7-7s-3-7-7-7H16zm7 2h6v3h-6v-3z"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth={2.2}
                />
              </Svg>
              {alertCount > 0 ? (
                <Animated.View
                  style={[
                    styles.alertBadge,
                    {
                      transform: [
                        {
                          translateY: alertBadgeBounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -10],
                          }),
                        },
                        {
                          scale: alertBadgeBounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.22],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.alertBadgeText}>{alertCount}</Text>
                </Animated.View>
              ) : null}
            </View>
            <Text style={styles.alertText}>{alertCount > 0 ? `${alertCount} Alerts` : 'No alerts'}</Text>
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </TouchableOpacity>
            <View>
              <Text style={styles.greeting}>Good morning!</Text>
              <Text style={styles.date}>April 24, 2026 • Friday</Text>
            </View>
          </View>
          <View style={styles.weatherBlock}>
            <View style={styles.weatherTopRow}>
              <Svg height={26} viewBox="0 0 24 24" width={26}>
                <Path
                  d="M12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10zm0-5v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m9.98 9.98l2.12 2.12m0-14.2l-2.12 2.1M7 17l-2.1 2.12"
                  fill="none"
                  stroke="#facc15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                />
              </Svg>
              <Text style={styles.weatherText}>{weatherF}°F</Text>
            </View>
            <Text style={styles.weatherSubText}>{weatherLabel}</Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.gaugeWrap}>
            <Svg height={236} viewBox="0 0 320 236" width="100%">
              <Defs>
                <LinearGradient id="healthGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                  <Stop offset="0%" stopColor="#ef4444" />
                  <Stop offset="50%" stopColor="#eab308" />
                  <Stop offset="100%" stopColor="#22c55e" />
                </LinearGradient>
                <LinearGradient id="outerGradA" x1="0%" x2="100%" y1="0%" y2="0%">
                  <Stop offset="0%" stopColor="#ef4444" stopOpacity="0.36" />
                  <Stop offset="50%" stopColor="#eab308" stopOpacity="0.3" />
                  <Stop offset="100%" stopColor="#22c55e" stopOpacity="0.36" />
                </LinearGradient>
              </Defs>
              <Path
                d={arcPath(138, -4, 104, 1)}
                fill="none"
                stroke="url(#outerGradA)"
                strokeLinecap="round"
                strokeWidth={1.6}
              />
              <Path
                d="M -40 22 C 0 22 22 22 44 22 C 68 22 84 19 102 14 C 114 10 120 8 126 8"
                fill="none"
                stroke="rgba(255,255,255,0.36)"
                strokeLinecap="round"
                strokeWidth={1.35}
              />
              <Path
                d="M 194 8 C 200 8 206 10 218 14 C 236 19 252 22 276 22 C 298 22 320 22 360 22"
                fill="none"
                stroke="rgba(255,255,255,0.36)"
                strokeLinecap="round"
                strokeWidth={1.35}
              />
              <Path
                d="M -36 38 C 8 38 30 38 50 38 C 74 38 92 34 110 30 C 120 26 126 24 132 24"
                fill="none"
                stroke="rgba(255,255,255,0.24)"
                strokeLinecap="round"
                strokeWidth={1.05}
              />
              <Path
                d="M 188 24 C 194 24 200 26 210 30 C 228 34 246 38 270 38 C 290 38 312 38 356 38"
                fill="none"
                stroke="rgba(255,255,255,0.24)"
                strokeLinecap="round"
                strokeWidth={1.05}
              />
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((startPct, idx) => {
                const endPct = startPct + 9;
                const colors = [
                  '#ef4444',
                  '#f4511e',
                  '#fb6200',
                  '#f98b00',
                  '#f2b000',
                  '#eab308',
                  '#d0c400',
                  '#a4d400',
                  '#6edf00',
                  '#22c55e',
                ];
                return (
                  <Path
                    key={`seg-${startPct}`}
                    d={arcPath(126, startPct, endPct)}
                    fill="none"
                    stroke={colors[idx]}
                    strokeLinecap="butt"
                    strokeWidth={12}
                  />
                );
              })}
              {Array.from({ length: 41 }, (_, i) => i * 2.5).map((mark) => {
                const angle = angleForPct(mark);
                if (mark <= 7.5 || mark >= 92.5) {
                  return null;
                }
                const major = mark % 10 === 0;
                const x1 = centerX + Math.cos(angle) * 106;
                const y1 = centerY - Math.sin(angle) * 106;
                const tickLength = major ? 12 : 6;
                const x2 = centerX + Math.cos(angle) * (106 + tickLength);
                const y2 = centerY - Math.sin(angle) * (106 + tickLength);
                return (
                  <Path
                    key={`tick-${mark}`}
                    d={`M ${x1} ${y1} L ${x2} ${y2}`}
                    fill="none"
                    stroke={major ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)'}
                    strokeLinecap="round"
                    strokeWidth={major ? 2.6 : 1.15}
                  />
                );
              })}
              <Path d={`M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`} fill="#ffffff" />
              <SvgText
                fill="#f8fafc"
                fontSize="13"
                fontWeight="700"
                x={pointOnArc(118, 0).x + 8}
                y={pointOnArc(118, 0).y - 10}
              >
                0
              </SvgText>
              <SvgText
                fill="#f8fafc"
                fontSize="13"
                fontWeight="700"
                textAnchor="end"
                x={pointOnArc(118, 100).x - 8}
                y={pointOnArc(118, 100).y - 10}
              >
                100
              </SvgText>
            </Svg>
          </View>
          <Animated.Text
            style={[
              styles.scoreHeart,
              {
                opacity: heartPulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.75, 1],
                }),
                transform: [
                  {
                    scale: heartPulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1.08],
                    }),
                  },
                ],
              },
            ]}
          >
            ♥
          </Animated.Text>
          <Text style={styles.scoreLabel}>HEALTH SCORE</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{displayScore}</Text>
            <Text style={styles.scoreUnit}>/100</Text>
          </View>
          <Text
            style={[
              styles.scoreState,
              scorePresentation.band === 'good' ? styles.scoreStateGood : scorePresentation.band === 'poor' ? styles.scoreStatePoor : null,
            ]}
          >
            {scorePresentation.label}
          </Text>
          <Text style={styles.scoreSub}>{scorePresentation.subtitle}</Text>
        </View>

        <View style={styles.grid}>
          {dashboardMetrics.map((item) => (
            <View key={item.label} style={styles.glassCard}>
              <Text style={styles.metricLabel}>{item.label}</Text>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{item.value}</Text>
                <Text style={styles.metricUnit}>{item.unit}</Text>
              </View>
              <Text style={[styles.metricStatus, { color: item.statusColor }]}>{item.status}</Text>
            </View>
          ))}
        </View>

        <View style={styles.glassCardLarge}>
          <Text style={styles.cardBadge}>NEURAL AI ADVISOR</Text>
          <Text style={styles.cardTitle}>Chan</Text>
          <Text style={styles.cardText}>Glucose high. Need recommendations?</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Suggestions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.glassCardLarge, styles.foodCard]}>
          <View style={styles.foodCardHeader}>
            <Text style={[styles.cardBadge, { color: '#EAB308' }]}>FOOD SUGGESTION</Text>
            <TouchableOpacity onPress={() => setFoodSuggestionCollapsed((prev) => !prev)} style={styles.foodToggleBtn}>
              <Text style={styles.foodToggleText}>{foodSuggestionCollapsed ? 'Expand' : 'Collapse'}</Text>
            </TouchableOpacity>
          </View>
          {!foodSuggestionCollapsed ? (
            <>
              <Text style={styles.cardText}>Orange Chicken is available. Want a healthier option?</Text>
              <TouchableOpacity style={styles.foodBtn}>
                <Text style={styles.foodBtnText}>View Options</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickRow}>
          {dashboardQuickMetrics.map((metric) => (
            <View key={metric} style={styles.quickItem}>
              <View style={[styles.quickIcon, { borderColor: QUICK_ACTION_THEME_COLOR_BY_TAB[metric] }]}>
                <Text style={styles.quickIconGlyph}>{QUICK_ACTION_ICON_BY_TAB[metric]}</Text>
              </View>
              <Text numberOfLines={1} style={styles.quickText}>
                {metric}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.activityContainer}>
          {dashboardActivity.map((item, index) => (
            <View key={item.label} style={styles.activityItem}>
              <View style={styles.activityTopRow}>
                <ActivityMiniIcon label={item.label} />
                <View style={styles.activityTextStack}>
                  <Text style={styles.activityLabel}>{item.label}</Text>
                  <Text style={styles.activityValue}>{item.value}</Text>
                </View>
              </View>
              <View style={styles.activityTrack}>
                <View style={[styles.activityFill, { flex: item.fill, backgroundColor: item.color }]} />
                <View style={[styles.activityTrackRemainder, { flex: 100 - item.fill }]} />
              </View>
              {index < dashboardActivity.length - 1 ? <View style={styles.activityDivider} /> : null}
            </View>
          ))}
        </View>
        </ScrollView>
        </>
      )}

      <View style={styles.bottomNav}>
        <Svg pointerEvents="none" style={styles.navDividerSvg} viewBox="0 0 390 18">
          <Path
            d="M0 14 C 14 14 22 8 34 2 L356 2 C 368 8 376 14 390 14"
            fill="none"
            stroke="rgba(255,255,255,0.42)"
            strokeLinecap="round"
            strokeWidth={1.2}
          />
        </Svg>
        {NAV_ITEMS.map((item: { label: string; icon: string }) => (
          <TouchableOpacity key={item.label} onPress={() => setActiveTab(item.label)} style={styles.navItem}>
            {item.label === 'Dashboard' && alertCount > 0 ? (
              <Animated.View
                style={[
                  styles.navAlertBadge,
                  {
                    transform: [
                      {
                        translateY: alertBadgeBounceAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6],
                        }),
                      },
                      {
                        scale: alertBadgeBounceAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.16],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.navAlertBadgeText}>{alertCount}</Text>
              </Animated.View>
            ) : null}
            {item.label === 'Insights' ? (
              <InsightsBulbIcon active={activeTab === item.label} />
            ) : (
              <Text style={[styles.navIcon, activeTab === item.label && styles.navActive]}>{item.icon}</Text>
            )}
            <Text style={[styles.navText, activeTab === item.label && styles.navActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={showCreatePersonalChallengeModal}
        onRequestClose={() => setShowCreatePersonalChallengeModal(false)}
      >
        <Pressable onPress={() => setShowCreatePersonalChallengeModal(false)} style={styles.challengeModalBackdrop}>
          <Pressable onPress={() => {}} style={styles.challengeModalCard}>
            <Text style={styles.challengeModalTitle}>Create Personal Challenge</Text>
            <Text style={styles.challengeModalHint}>Add a challenge just for you.</Text>
            <TextInput
              onChangeText={setNewChallengeTitle}
              placeholder="Challenge title"
              placeholderTextColor="#64748b"
              style={styles.challengeInput}
              value={newChallengeTitle}
            />
            <TextInput
              multiline
              onChangeText={setNewChallengeDetail}
              placeholder="Challenge details"
              placeholderTextColor="#64748b"
              style={[styles.challengeInput, styles.challengeInputMultiline]}
              value={newChallengeDetail}
            />
            <View style={styles.challengeModalActions}>
              <TouchableOpacity onPress={() => setShowCreatePersonalChallengeModal(false)} style={styles.challengeModalCancelBtn}>
                <Text style={styles.challengeModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createPersonalChallenge} style={styles.challengeModalCreateBtn}>
                <Text style={styles.challengeModalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={showCreateProgressPostModal}
        onRequestClose={() => setShowCreateProgressPostModal(false)}
      >
        <Pressable onPress={() => setShowCreateProgressPostModal(false)} style={styles.challengeModalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
            style={styles.createPostKeyboardAvoiding}
          >
            <Pressable onPress={Keyboard.dismiss} style={styles.challengeModalCard}>
              <Text style={styles.challengeModalTitle}>Create Progress Post</Text>
              <Text style={styles.challengeModalHint}>Upload a photo and caption your update.</Text>
              {createPostImageUri ? (
                <Image resizeMode="cover" source={{ uri: createPostImageUri }} style={styles.createPostPreviewImage} />
              ) : null}
              <TextInput
                multiline
                onChangeText={setCreatePostCaption}
                placeholder="What progress did you make today?"
                placeholderTextColor="#64748b"
                style={[styles.challengeInput, styles.challengeInputMultiline]}
                value={createPostCaption}
              />
              <View style={styles.challengeModalActions}>
                <TouchableOpacity
                  disabled={isPublishingProgressPost}
                  onPress={() => setShowCreateProgressPostModal(false)}
                  style={styles.challengeModalCancelBtn}
                >
                  <Text style={styles.challengeModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isPublishingProgressPost}
                  onPress={createProgressPost}
                  style={styles.challengeModalCreateBtn}
                >
                  <Text style={styles.challengeModalCreateText}>
                    {isPublishingProgressPost ? 'Publishing...' : 'Publish'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={showAlertsScreen}
        onRequestClose={() => setShowAlertsScreen(false)}
      >
        <View style={styles.alertsModalBackdrop}>
          <View style={styles.alertsModalCard}>
            <View style={styles.alertsModalHeader}>
              <TouchableOpacity onPress={() => setShowAlertsScreen(false)} style={styles.alertsBackBtn}>
                <Text style={styles.alertsBackText}>{'<'}</Text>
              </TouchableOpacity>
              <View style={styles.alertsHeaderTextWrap}>
                <Text style={styles.alertsTitle}>Alerts</Text>
                <Text style={styles.alertsSubtitle}>Health notifications</Text>
              </View>
            </View>
            {alertItems.length === 0 ? (
              <View style={styles.alertsEmptyCard}>
                <Text style={styles.alertsEmptyText}>No new alerts</Text>
              </View>
            ) : (
              <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false}>
                {alertItems.map((alert) => (
                  <View key={alert.id} style={styles.alertsCard}>
                    <Text style={styles.alertsCardTitle}>{alert.title}</Text>
                    <Text style={styles.alertsCardDetail}>{alert.detail}</Text>
                    <Text style={styles.alertsCardSeverity}>{alert.severity}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {sidebarOpen ? (
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebarPanel}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                <Text style={styles.sidebarClose}>×</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.sidebarItem}>
              <Text style={styles.sidebarItemText}>Profile</Text>
            </TouchableOpacity>
            <View style={styles.sidebarDivider} />
            <Text style={styles.sidebarSectionTitle}>Demo Tools</Text>
            <TouchableOpacity onPress={toggleAllDemoTools} style={styles.demoToggleRow}>
              <Text style={styles.demoToggleLabel}>All Demo Tools</Text>
              <View style={styles.demoToggleRowRight}>
                <View style={[styles.demoTogglePill, allDemoToolsEnabled && styles.demoTogglePillActive]}>
                  <Text style={[styles.demoTogglePillText, allDemoToolsEnabled && styles.demoTogglePillTextActive]}>
                    {allDemoToolsEnabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation?.();
                    setDemoToolsDropdownOpen((v) => !v);
                  }}
                  style={styles.demoDropdownBtn}
                >
                  <Text style={styles.demoDropdownText}>{demoToolsDropdownOpen ? '▾' : '▸'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDemoFastDriftEnabled((v: boolean) => !v)} style={styles.demoToggleRow}>
              <Text style={styles.demoToggleLabel}>Fast Drift Mode</Text>
              <View style={[styles.demoTogglePill, demoFastDriftEnabled && styles.demoTogglePillActive]}>
                <Text style={[styles.demoTogglePillText, demoFastDriftEnabled && styles.demoTogglePillTextActive]}>
                  {demoFastDriftEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDemoAlertEnabled((v: boolean) => !v)} style={styles.demoToggleRow}>
              <Text style={styles.demoToggleLabel}>Alert</Text>
              <View style={[styles.demoTogglePill, demoAlertEnabled && styles.demoTogglePillActive]}>
                <Text style={[styles.demoTogglePillText, demoAlertEnabled && styles.demoTogglePillTextActive]}>
                  {demoAlertEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
            {demoToolsDropdownOpen ? (
              <View style={styles.demoDropdownList}>
                <TouchableOpacity onPress={() => setDemoScoreDriftEnabled((v: boolean) => !v)} style={styles.demoToggleRow}>
                  <Text style={styles.demoToggleLabel}>Live Health Score Drift</Text>
                  <View style={[styles.demoTogglePill, demoScoreDriftEnabled && styles.demoTogglePillActive]}>
                    <Text style={[styles.demoTogglePillText, demoScoreDriftEnabled && styles.demoTogglePillTextActive]}>
                      {demoScoreDriftEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('glucose')} style={styles.demoToggleRow}>
                  <Text style={styles.demoToggleLabel}>Glucose Card Drift</Text>
                  <View style={[styles.demoTogglePill, demoDashboardValueDrift.glucose && styles.demoTogglePillActive]}>
                    <Text style={[styles.demoTogglePillText, demoDashboardValueDrift.glucose && styles.demoTogglePillTextActive]}>
                      {demoDashboardValueDrift.glucose ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('stress')} style={styles.demoToggleRow}>
                  <Text style={styles.demoToggleLabel}>Stress Card Drift</Text>
                  <View style={[styles.demoTogglePill, demoDashboardValueDrift.stress && styles.demoTogglePillActive]}>
                    <Text style={[styles.demoTogglePillText, demoDashboardValueDrift.stress && styles.demoTogglePillTextActive]}>
                      {demoDashboardValueDrift.stress ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('heartRateCard')} style={styles.demoToggleRow}>
                  <Text style={styles.demoToggleLabel}>Heart Rate Card Drift</Text>
                  <View style={[styles.demoTogglePill, demoDashboardValueDrift.heartRateCard && styles.demoTogglePillActive]}>
                    <Text style={[styles.demoTogglePillText, demoDashboardValueDrift.heartRateCard && styles.demoTogglePillTextActive]}>
                      {demoDashboardValueDrift.heartRateCard ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('steps')} style={styles.demoToggleRow}>
                  <Text style={styles.demoToggleLabel}>Steps Activity Drift</Text>
                  <View style={[styles.demoTogglePill, demoDashboardValueDrift.steps && styles.demoTogglePillActive]}>
                    <Text style={[styles.demoTogglePillText, demoDashboardValueDrift.steps && styles.demoTogglePillTextActive]}>
                      {demoDashboardValueDrift.steps ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('sleep')} style={styles.demoToggleRow}>
                  <Text style={styles.demoToggleLabel}>Sleep Activity Drift</Text>
                  <View style={[styles.demoTogglePill, demoDashboardValueDrift.sleep && styles.demoTogglePillActive]}>
                    <Text style={[styles.demoTogglePillText, demoDashboardValueDrift.sleep && styles.demoTogglePillTextActive]}>
                      {demoDashboardValueDrift.sleep ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('meds')} style={styles.demoToggleRow}>
                  <Text style={styles.demoToggleLabel}>Meds Activity Drift</Text>
                  <View style={[styles.demoTogglePill, demoDashboardValueDrift.meds && styles.demoTogglePillActive]}>
                    <Text style={[styles.demoTogglePillText, demoDashboardValueDrift.meds && styles.demoTogglePillTextActive]}>
                      {demoDashboardValueDrift.meds ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('water')} style={styles.demoToggleRow}>
                  <Text style={styles.demoToggleLabel}>Water Activity Drift</Text>
                  <View style={[styles.demoTogglePill, demoDashboardValueDrift.water && styles.demoTogglePillActive]}>
                    <Text style={[styles.demoTogglePillText, demoDashboardValueDrift.water && styles.demoTogglePillTextActive]}>
                      {demoDashboardValueDrift.water ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => setSidebarOpen(false)} style={styles.sidebarScrim} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#111827',
    opacity: 0.3,
  },
  topGlow: {
    position: 'absolute',
    top: -140,
    left: '20%',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(125,162,199,0.1)',
  },
  content: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 90,
    gap: 8,
    backgroundColor: '#111827',
  },
  mapScreen: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 84,
    backgroundColor: '#111827',
  },
  mapTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  mapSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  mapLayerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  mapLayerChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(15,23,42,0.32)',
  },
  mapLayerChipActive: {
    borderColor: 'rgba(59,130,246,0.75)',
    backgroundColor: 'rgba(59,130,246,0.25)',
  },
  mapLayerChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  mapLayerChipTextActive: {
    color: '#bfdbfe',
  },
  mapContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  map: {
    flex: 1,
  },
  mapRecenterBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.7)',
    backgroundColor: 'rgba(15,23,42,0.86)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapRecenterBtnText: {
    color: '#bfdbfe',
    fontSize: 12,
    fontWeight: '700',
  },
  mapFallbackCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  mapFallbackText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  insightsScreen: {
    flex: 1,
    paddingTop: 54,
    paddingHorizontal: 12,
    paddingBottom: 78,
    backgroundColor: '#111827',
  },
  insightsTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  insightsStatusText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
    fontWeight: '600',
  },
  healthConnectBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.6)',
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 6,
  },
  healthConnectBtnDisabled: {
    opacity: 0.55,
  },
  healthConnectBtnText: {
    color: '#bfdbfe',
    fontSize: 13,
    fontWeight: '800',
  },
  healthErrorText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
    fontWeight: '600',
  },
  quickMetricSearchInput: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    backgroundColor: 'rgba(2,6,23,0.55)',
    borderRadius: 10,
    color: '#e2e8f0',
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  quickMetricSearchResults: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 16,
  },
  insightsQuickToThemesDivider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.28)',
    width: '100%',
    marginBottom: 10,
  },
  quickMetricOptionChip: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
    backgroundColor: 'rgba(15,23,42,0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickMetricOptionChipActive: {
    borderColor: 'rgba(96,165,250,0.75)',
    backgroundColor: 'rgba(59,130,246,0.3)',
  },
  quickMetricOptionText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  quickMetricOptionTextActive: {
    color: '#eff6ff',
  },
  insightsTabStack: {
    flex: 1,
    gap: 6,
  },
  insightsTabScroll: {
    marginTop: 8,
    marginBottom: 6,
  },
  insightsGroupCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.32)',
    overflow: 'hidden',
    position: 'relative',
    paddingLeft: 10,
  },
  insightsGroupBand: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 10,
    height: 56,
    borderBottomRightRadius: 8,
  },
  insightsGroupHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  insightsGroupHeaderText: {
    flex: 1,
    paddingRight: 10,
  },
  insightsGroupTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  insightsGroupSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    fontWeight: '600',
  },
  insightsGroupChevron: {
    color: '#93c5fd',
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '700',
  },
  insightsGroupBody: {
    gap: 6,
    padding: 8,
  },
  insightsTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  insightsTab: {
    width: '100%',
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 20,
    backgroundColor: 'rgba(15,23,42,0.32)',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  insightsTabMainPress: {
    flex: 1,
    justifyContent: 'center',
  },
  insightsSubTabBand: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 10,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    opacity: 0.95,
  },
  insightsTabStarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  insightsTabStarBtnActive: {
    borderColor: 'rgba(251,191,36,0.7)',
    backgroundColor: 'rgba(251,191,36,0.18)',
  },
  insightsTabStarText: {
    color: '#fcd34d',
    fontSize: 17,
    lineHeight: 17,
    fontWeight: '700',
  },
  insightsTabActive: {
    borderColor: 'rgba(59,130,246,0.7)',
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  insightsTabText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '700',
  },
  insightsTabTextActive: {
    color: '#bfdbfe',
  },
  insightsCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(15,23,42,0.4)',
    marginBottom: 10,
  },
  insightsCardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  insightsCardSection: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  insightsCardSummary: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  insightsCardTrend: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
  },
  insightsChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsChartUnit: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  insightsLineChartWrap: {
    marginTop: 10,
  },
  insightsLineLabelsRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  insightsLineLabelItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightsChartValue: {
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: '700',
  },
  insightsChartLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  insightsPromptCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  insightsPromptText: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  insightsDetailScreen: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  insightsDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  insightsBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(2,6,23,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsBackText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  insightsDetailHeaderText: {
    flex: 1,
  },
  insightsDetailSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  goalsScreen: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 84,
    backgroundColor: '#111827',
  },
  goalsTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  goalsTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  goalsTab: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.32)',
  },
  goalsTabActive: {
    borderColor: 'rgba(125,162,199,0.72)',
    backgroundColor: 'rgba(125,162,199,0.2)',
  },
  goalsTabText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  goalsTabTextActive: {
    color: '#dbeafe',
  },
  goalsScroll: {
    flex: 1,
  },
  goalsCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  challengeCommunityCard: {
    borderColor: 'rgba(59,130,246,0.55)',
    backgroundColor: 'rgba(30,58,138,0.2)',
  },
  challengePersonalCard: {
    borderColor: 'rgba(124,184,155,0.55)',
    backgroundColor: 'rgba(24,59,47,0.28)',
  },
  challengeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  challengeTypeBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  challengeTypeCommunity: {
    color: '#93c5fd',
    borderColor: 'rgba(96,165,250,0.7)',
    backgroundColor: 'rgba(30,64,175,0.45)',
  },
  challengeTypePersonal: {
    color: '#d1fae5',
    borderColor: 'rgba(124,184,155,0.68)',
    backgroundColor: 'rgba(38,84,67,0.52)',
  },
  challengeFilterRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,14,24,0.78)',
    padding: 4,
    marginBottom: 12,
    gap: 6,
  },
  challengeFilterTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingVertical: 7,
  },
  challengeFilterTabActive: {
    backgroundColor: 'rgba(125,162,199,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(125,162,199,0.5)',
  },
  challengeFilterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  challengeFilterTextActive: {
    color: '#e2e8f0',
  },
  createPersonalChallengeBtn: {
    borderWidth: 1,
    borderColor: 'rgba(124,184,155,0.55)',
    backgroundColor: 'rgba(38,84,67,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  createPersonalChallengeBtnText: {
    color: '#d1fae5',
    fontSize: 12,
    fontWeight: '700',
  },
  challengeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.68)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  challengeModalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(15,23,42,0.98)',
    padding: 14,
  },
  createPostKeyboardAvoiding: {
    width: '100%',
  },
  challengeModalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  challengeModalHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  challengeInput: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#e2e8f0',
    fontSize: 13,
    marginBottom: 10,
    backgroundColor: 'rgba(2,6,23,0.4)',
  },
  challengeInputMultiline: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  challengeModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  challengeModalCancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  challengeModalCancelText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  challengeModalCreateBtn: {
    borderWidth: 1,
    borderColor: 'rgba(124,184,155,0.62)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(38,84,67,0.56)',
  },
  challengeModalCreateText: {
    color: '#d1fae5',
    fontSize: 12,
    fontWeight: '700',
  },
  goalsCardTitle: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
  },
  goalsCardDetail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  goalsCardMeta: {
    color: '#9ccfc7',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  communitySearchBar: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(10,14,24,0.72)',
  },
  communitySearchText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  communitySectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  communityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 6,
  },
  communityCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(10,14,24,0.8)',
    padding: 12,
    minHeight: 194,
  },
  communityCardBadge: {
    color: '#f97316',
    fontSize: 12,
    marginBottom: 8,
  },
  communityCardTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  communityCardMeta: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 4,
  },
  communityJoinBtn: {
    marginTop: 'auto',
    backgroundColor: '#7CB89B',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  communityJoinText: {
    color: '#0f2a22',
    fontSize: 12,
    fontWeight: '800',
  },
  communityHero: {
    borderRadius: 16,
    height: 178,
    backgroundColor: 'rgba(31,41,55,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 12,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  communityHeroActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  communityHeroIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(3,7,18,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  communityHeroIconText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  communityHeroTag: {
    color: '#d1fae5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  communityDetailCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    backgroundColor: 'rgba(10,14,24,0.82)',
    padding: 14,
    marginBottom: 12,
  },
  communityDetailTitle: {
    color: '#f8fafc',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
  },
  communityDetailMeta: {
    color: '#d1d5db',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '600',
  },
  communityDetailSub: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  communityActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  communityActionItem: {
    width: 64,
    alignItems: 'center',
  },
  communityActionIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(30,41,59,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityActionIconBtnActive: {
    borderColor: 'rgba(255,255,255,0.42)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  communityActionIcon: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  communityActionLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  communityOverviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  communityOverviewPopup: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(124,184,155,0.45)',
    borderRadius: 14,
    backgroundColor: 'rgba(10,20,18,0.96)',
    padding: 14,
  },
  communityOverviewPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  communityOverviewPopupTitle: {
    color: '#d1fae5',
    fontSize: 14,
    fontWeight: '800',
  },
  communityOverviewCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityOverviewCloseText: {
    color: '#e2e8f0',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  communityOverviewPopupText: {
    color: '#dbe7e3',
    fontSize: 12,
    lineHeight: 18,
  },
  inviteContactsList: {
    maxHeight: 320,
  },
  inviteContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    gap: 10,
  },
  inviteContactInfo: {
    flex: 1,
  },
  inviteContactName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  inviteContactPhone: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2,
  },
  inviteContactBtn: {
    borderRadius: 999,
    backgroundColor: '#7CB89B',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inviteContactBtnText: {
    color: '#0f2a22',
    fontSize: 11,
    fontWeight: '800',
  },
  progressBoardTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  progressBoardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  createPostBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(124,184,155,0.62)',
    backgroundColor: 'rgba(124,184,155,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  createPostBtnText: {
    color: '#d1fae5',
    fontSize: 11,
    fontWeight: '800',
  },
  eventsTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  eventsTabBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  eventsTabBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  eventsTabText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
  },
  eventsTabTextActive: {
    color: '#f8fafc',
  },
  eventsListContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    backgroundColor: 'rgba(10,14,24,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
    height: 318,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  eventDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    width: '78%',
    alignSelf: 'center',
  },
  eventDateCol: {
    width: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(2,6,23,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  eventDateMonth: {
    color: '#e5e7eb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventDateDay: {
    color: '#f8fafc',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    marginVertical: 1,
  },
  eventDateDow: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
  },
  eventInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    color: '#f8fafc',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  eventMeta: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 3,
  },
  eventRsvp: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  progressPostCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    backgroundColor: 'rgba(10,14,24,0.82)',
    padding: 12,
    marginBottom: 10,
  },
  progressPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPostAuthor: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  progressPostTime: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  progressPostCaption: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 10,
  },
  progressPostStatus: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
    marginTop: -2,
    marginBottom: 8,
  },
  progressPostImage: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(30,41,59,0.7)',
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressPostImageActual: {
    width: '100%',
    height: '100%',
  },
  progressPostImageText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  createPostPreviewImage: {
    width: '100%',
    height: 144,
    borderRadius: 12,
    marginBottom: 12,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  leaderRank: {
    width: 28,
    color: '#86efac',
    fontSize: 16,
    fontWeight: '800',
  },
  leaderMid: {
    flex: 1,
    paddingHorizontal: 8,
  },
  leaderName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  leaderNote: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  leaderPts: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  menuBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  menuLine: {
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#fafafa',
  },
  greeting: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  alertBlock: {
    position: 'absolute',
    top: 30,
    left: '50%',
    width: 92,
    transform: [{ translateX: -46 }],
    alignItems: 'center',
  },
  alertIconWrap: {
    position: 'relative',
  },
  alertBadge: {
    position: 'absolute',
    right: -8,
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#111827',
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  alertText: {
    color: '#eab308',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  alertsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 36,
  },
  alertsModalCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#111827',
    padding: 12,
  },
  alertsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  alertsBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  alertsBackText: {
    color: '#f8fafc',
    fontSize: 15,
    lineHeight: 15,
    fontWeight: '800',
  },
  alertsHeaderTextWrap: {
    flex: 1,
  },
  alertsTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  alertsSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  alertsEmptyCard: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.45)',
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertsEmptyText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
  },
  alertsCard: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
    borderRadius: 12,
    backgroundColor: 'rgba(127,29,29,0.22)',
    padding: 12,
    marginBottom: 10,
  },
  alertsCardTitle: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '800',
  },
  alertsCardDetail: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  alertsCardSeverity: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 7,
  },
  weatherText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  weatherBlock: {
    alignItems: 'flex-end',
  },
  weatherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherSubText: {
    color: '#e5e7eb',
    fontSize: 10,
    marginTop: -1,
    fontWeight: '500',
  },
  date: {
    color: '#71717A',
    fontSize: 9,
    marginTop: 1,
  },
  scoreCard: {
    borderRadius: 18,
    borderColor: 'transparent',
    borderWidth: 0,
    padding: 14,
    backgroundColor: 'transparent',
    overflow: 'visible',
    minHeight: 238,
    shadowColor: '#ffffff',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  gaugeWrap: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
  },
  scoreLabel: {
    color: '#52525b',
    fontSize: 9,
    letterSpacing: 2.2,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  scoreHeart: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 64,
    fontSize: 17,
    lineHeight: 17,
    fontWeight: '700',
  },
  scoreRow: {
    marginTop: -4,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  score: {
    color: '#fff',
    fontSize: 66,
    fontWeight: '700',
  },
  scoreUnit: {
    color: '#71717a',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 4,
  },
  scoreState: {
    color: '#facc15',
    letterSpacing: 5.6,
    fontWeight: '700',
    marginTop: 1,
    fontSize: 15,
    textAlign: 'center',
  },
  scoreStateGood: {
    color: '#22c55e',
  },
  scoreStatePoor: {
    color: '#ef4444',
  },
  scoreSub: {
    color: '#71717a',
    marginTop: 3,
    fontSize: 11,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
  },
  glassCard: {
    width: '31.5%',
    borderRadius: 12,
    borderColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    backgroundColor: 'transparent',
    padding: 11,
    overflow: 'visible',
    shadowColor: '#ffffff',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 9,
  },
  metricLabel: {
    color: '#a1a1aa',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  metricUnit: {
    color: '#71717a',
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricStatus: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  glassCardLarge: {
    borderRadius: 16,
    borderColor: 'rgba(255,255,255,0.38)',
    borderWidth: 1,
    backgroundColor: 'transparent',
    padding: 13,
    gap: 8,
    shadowColor: '#ffffff',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 9,
  },
  foodCard: {
    borderColor: 'rgba(255,255,255,0.24)',
  },
  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  foodToggleBtn: {
    borderColor: 'rgba(202,138,4,0.4)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  foodToggleText: {
    color: '#EAB308',
    fontSize: 10,
    fontWeight: '700',
  },
  cardBadge: {
    color: '#60A5FA',
    fontSize: 8,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  cardText: {
    color: '#d4d4d8',
    fontSize: 12,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  secondaryBtn: {
    flex: 1,
    borderColor: '#3f3f46',
    borderWidth: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#a1a1aa',
    fontWeight: '700',
    fontSize: 11,
  },
  foodBtn: {
    alignSelf: 'flex-start',
    borderColor: 'rgba(202,138,4,0.5)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  foodBtnText: {
    color: '#EAB308',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionLabel: {
    color: '#52525b',
    fontSize: 9,
    letterSpacing: 0.9,
    fontWeight: '700',
    marginTop: 2,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
  },
  quickItem: {
    width: '16%',
    alignItems: 'center',
    gap: 7,
  },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  quickIconGlyph: {
    color: '#a1a1aa',
    fontSize: 20,
    fontWeight: '700',
  },
  quickText: {
    color: '#71717a',
    fontSize: 7,
    width: '100%',
    textAlign: 'center',
  },
  activityContainer: {
    marginTop: 4,
    borderRadius: 12,
    borderColor: 'rgba(255,255,255,0.36)',
    borderWidth: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#ffffff',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  activityItem: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    gap: 8,
    position: 'relative',
  },
  activityDivider: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  activityLabel: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityTextStack: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
  },
  activityValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  activityTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: '#27272a',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  activityFill: {
    height: 6,
    borderRadius: 999,
  },
  activityTrackRemainder: {
    height: 6,
    backgroundColor: 'transparent',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: '#111827',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  navDividerSvg: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 18,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  navIcon: {
    color: '#52525b',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 26,
  },
  navText: {
    color: '#52525b',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 13,
  },
  navActive: {
    color: '#3b82f6',
  },
  navAlertBadge: {
    position: 'absolute',
    top: -8,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#111827',
    zIndex: 2,
  },
  navAlertBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 11,
  },
  sidebarOverlay: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'row',
  },
  sidebarScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sidebarPanel: {
    width: 250,
    backgroundColor: '#0a0f1a',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.18)',
    paddingTop: 56,
    paddingHorizontal: 14,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sidebarTitle: {
    color: '#f3f4f6',
    fontSize: 22,
    fontWeight: '800',
  },
  sidebarClose: {
    color: '#f3f4f6',
    fontSize: 24,
    lineHeight: 24,
  },
  sidebarItem: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  sidebarItemText: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.25)',
    marginVertical: 8,
  },
  sidebarSection: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    padding: 10,
  },
  sidebarSectionTitle: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    textDecorationLine: 'underline',
  },
  demoToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 52,
    paddingVertical: 10,
    marginBottom: 6,
  },
  demoToggleRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoToggleLabel: {
    color: '#d1d5db',
    fontSize: 15,
    flex: 1,
    fontWeight: '700',
  },
  demoTogglePill: {
    minWidth: 66,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  demoTogglePillActive: {
    backgroundColor: 'rgba(59,130,246,0.22)',
    borderColor: 'rgba(59,130,246,0.7)',
  },
  demoTogglePillText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '700',
  },
  demoTogglePillTextActive: {
    color: '#93c5fd',
  },
  demoDropdownBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  demoDropdownText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 13,
  },
  demoDropdownList: {
    marginTop: 2,
    marginLeft: 10,
  },
  demoHelperText: {
    marginTop: 10,
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
});
