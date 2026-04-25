import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import MapView, { Marker } from 'react-native-maps';
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
const INSIGHTS_TABS = QUICK_ACTIONS.map((action) => action.label) as [
  'Log Glucose',
  'Log Heart Rate',
  'Log Stress',
  'Track Meal',
  'Track Activity',
  'How am I feeling',
];
type InsightTab = (typeof INSIGHTS_TABS)[number];

const INSIGHTS_TAB_CONTENT: Record<InsightTab, { title: string; summary: string; trend: string; recommendation: string }> = {
  'Log Glucose': {
    title: 'Glucose Pattern',
    summary: 'Post-lunch values are trending above baseline this week.',
    trend: 'Trend: +8% vs last 7 days',
    recommendation: 'Try a 10-minute walk after meals to reduce spikes.',
  },
  'Log Heart Rate': {
    title: 'Heart Rate Recovery',
    summary: 'Resting heart rate is stable with slight improvement overnight.',
    trend: 'Trend: -2 bpm average',
    recommendation: 'Maintain hydration and keep bedtime consistent.',
  },
  'Log Stress': {
    title: 'Stress Signals',
    summary: 'Stress peaks most often between 2pm and 5pm on weekdays.',
    trend: 'Trend: 3 high-stress windows this week',
    recommendation: 'Schedule a 5-minute breathing break before afternoon workload.',
  },
  'Track Meal': {
    title: 'Meal Quality Snapshot',
    summary: 'Balanced meals correlate with better evening energy scores.',
    trend: 'Trend: 4/6 days balanced',
    recommendation: 'Add protein + fiber to late-day meals to avoid crashes.',
  },
  'Track Activity': {
    title: 'Movement Consistency',
    summary: 'You are most active on Tuesdays and Thursdays.',
    trend: 'Trend: 6,842 avg daily steps',
    recommendation: 'Set a short walk reminder for lower-activity days.',
  },
  'How am I feeling': {
    title: 'Mood Reflection',
    summary: 'Mood entries improve after higher sleep quality nights.',
    trend: 'Trend: Positive mood 5/7 days',
    recommendation: 'Continue evening wind-down to support mood stability.',
  },
};

const ACTIVITY = [
  { label: 'STEPS', value: '6,842', fill: 85, color: '#22c55e' },
  { label: 'SLEEP', value: '7h 15m', fill: 95, color: '#22c55e' },
  { label: 'MEDS', value: '2/2', fill: 100, color: '#22c55e' },
  { label: 'WATER', value: '6gl', fill: 75, color: '#3b82f6' },
];

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

const GOALS_CHALLENGES = [
  { title: 'Campus Hydration Week', detail: 'Community goal: 10k cups logged', members: '248 joined', type: 'community' },
  { title: 'Indoor Movement Streak', detail: 'When AQI is rough, move inside', members: '132 joined', type: 'community' },
  { title: '7-Day Sleep Wind-Down', detail: 'Power down screens 30 minutes before bed', members: 'Solo plan', type: 'personal' },
] as const;

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

const COMMUNITY_OVERVIEW_DESCRIPTION =
  'This community helps members build consistent wellness habits through shared accountability, weekly events, and progress updates.';

const toShareSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

type InviteContact = {
  id: string;
  name: string;
  phone: string | null;
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

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthScore, setHealthScore] = useState(72);
  const [demoScoreDriftEnabled, setDemoScoreDriftEnabled] = useState(false);
  const [demoFastDriftEnabled, setDemoFastDriftEnabled] = useState(false);
  const [useDeviceLocation, setUseDeviceLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'off' | 'granted' | 'denied'>('off');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapLocationStatus, setMapLocationStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [activeMapLayer, setActiveMapLayer] = useState<MapLayer>('Indoor');
  const [activeInsightTab, setActiveInsightTab] = useState<InsightTab>('Log Glucose');
  const [goalsTab, setGoalsTab] = useState<GoalsTab>('Communities');
  const [challengeFilter, setChallengeFilter] = useState<ChallengeFilter>('All');
  const [joinedCommunityNames, setJoinedCommunityNames] = useState<string[]>([]);
  const [selectedJoinedCommunityName, setSelectedJoinedCommunityName] = useState<string | null>(null);
  const [selectedCommunityAction, setSelectedCommunityAction] = useState('Progress Board');
  const [eventsTab, setEventsTab] = useState<'Upcoming' | 'Past'>('Upcoming');
  const [isInteractingWithEventsList, setIsInteractingWithEventsList] = useState(false);
  const [showOverviewPopup, setShowOverviewPopup] = useState(false);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [inviteContacts, setInviteContacts] = useState<InviteContact[]>([]);
  const [loadingInviteContacts, setLoadingInviteContacts] = useState(false);
  const [weatherF, setWeatherF] = useState(72);
  const [weatherLabel, setWeatherLabel] = useState('Sunny');
  const [foodSuggestionCollapsed, setFoodSuggestionCollapsed] = useState(false);
  const scoreDirectionRef = useRef<1 | -1>(1);
  const displayScore = Math.round(healthScore);
  const scorePresentation = getScorePresentation(displayScore);
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
  const joinedCommunities = COMMUNITY_DISCOVERY.filter((community) => joinedCommunityNames.includes(community.name));
  const selectedJoinedCommunity = selectedJoinedCommunityName
    ? joinedCommunities.find((community) => community.name === selectedJoinedCommunityName) ?? null
    : null;
  const filteredChallenges = GOALS_CHALLENGES.filter((challenge) => {
    if (challengeFilter === 'All') {
      return true;
    }
    return challengeFilter === 'Personal' ? challenge.type === 'personal' : challenge.type === 'community';
  });
  const selectedInsightContent = INSIGHTS_TAB_CONTENT[activeInsightTab];
  const selectedCommunityShareLink = selectedJoinedCommunity
    ? `https://connectedwellness.app/community/${toShareSlug(selectedJoinedCommunity.name)}?invite=demo2026`
    : null;

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
          <Text style={styles.insightsTitle}>Insights</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsTabScroll} contentContainerStyle={styles.insightsTabRow}>
            {INSIGHTS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveInsightTab(tab)}
                style={[styles.insightsTab, activeInsightTab === tab && styles.insightsTabActive]}
              >
                <Text style={[styles.insightsTabText, activeInsightTab === tab && styles.insightsTabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.insightsCard}>
            <Text style={styles.insightsCardTitle}>{selectedInsightContent.title}</Text>
            <Text style={styles.insightsCardSummary}>{selectedInsightContent.summary}</Text>
            <Text style={styles.insightsCardTrend}>{selectedInsightContent.trend}</Text>
          </View>
          <View style={styles.insightsCard}>
            <Text style={styles.insightsCardSection}>Recommendation</Text>
            <Text style={styles.insightsCardSummary}>{selectedInsightContent.recommendation}</Text>
          </View>
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
                        <TouchableOpacity style={styles.createPostBtn}>
                          <Text style={styles.createPostBtnText}>+ Create Post</Text>
                        </TouchableOpacity>
                      </View>
                      {COMMUNITY_PROGRESS_POSTS.map((post) => (
                        <View key={`${selectedJoinedCommunity.name}-${post.id}`} style={styles.progressPostCard}>
                          <View style={styles.progressPostHeader}>
                            <Text style={styles.progressPostAuthor}>{post.author}</Text>
                            <Text style={styles.progressPostTime}>{post.time}</Text>
                          </View>
                          <Text style={styles.progressPostCaption}>{post.caption}</Text>
                          <View style={styles.progressPostImage}>
                            <Text style={styles.progressPostImageText}>{post.imageLabel}</Text>
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
              {filteredChallenges.map((c) => (
                <View
                  key={c.title}
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
                <Text style={styles.communitySearchText}>Search communities, city, or focus area</Text>
              </View>
              <Text style={styles.communitySectionTitle}>Popular communities near you</Text>
              <View style={styles.communityGrid}>
                {COMMUNITY_DISCOVERY.map((community) => (
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
              </View>
            </ScrollView>
          ) : null}
        </View>
      ) : (
        <>
        <ScrollView bounces={false} contentContainerStyle={styles.content} overScrollMode="never" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.alertBlock}>
            <View style={styles.alertIconWrap}>
              <Svg height={28} viewBox="0 0 48 32" width={40}>
                <Path
                  d="M9 8h4l3-3h16l3 3h4l3 4v11l-3 3h-4l-2 2H15l-2-2H9l-3-3V12l3-4zm7 4c-4 0-7 3-7 7s3 7 7 7h16c4 0 7-3 7-7s-3-7-7-7H16zm7 2h6v3h-6v-3z"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth={2.2}
                />
              </Svg>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>2</Text>
              </View>
            </View>
            <Text style={styles.alertText}>2 Alerts {'>'}</Text>
          </View>
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
          <Text style={styles.scoreHeart}>♥</Text>
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
          {METRICS.map((item) => (
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
          {QUICK_ACTIONS.map((action) => (
            <View key={action.label} style={styles.quickItem}>
              <View style={styles.quickIcon}>
                <Text style={styles.quickIconGlyph}>{action.icon}</Text>
              </View>
              <Text numberOfLines={1} style={styles.quickText}>
                {action.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.activityContainer}>
          {ACTIVITY.map((item, index) => (
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
              {index < ACTIVITY.length - 1 ? <View style={styles.activityDivider} /> : null}
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
            <Text style={[styles.navIcon, activeTab === item.label && styles.navActive]}>{item.icon}</Text>
            <Text style={[styles.navText, activeTab === item.label && styles.navActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>Demo Tools</Text>
              <TouchableOpacity onPress={() => setDemoScoreDriftEnabled((v: boolean) => !v)} style={styles.demoToggleRow}>
                <Text style={styles.demoToggleLabel}>Live Health Score Drift</Text>
                <View style={[styles.demoTogglePill, demoScoreDriftEnabled && styles.demoTogglePillActive]}>
                  <Text style={[styles.demoTogglePillText, demoScoreDriftEnabled && styles.demoTogglePillTextActive]}>
                    {demoScoreDriftEnabled ? 'ON' : 'OFF'}
                  </Text>
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
              <TouchableOpacity onPress={() => setUseDeviceLocation((v: boolean) => !v)} style={styles.demoToggleRow}>
                <Text style={styles.demoToggleLabel}>Use Device Location</Text>
                <View style={[styles.demoTogglePill, useDeviceLocation && styles.demoTogglePillActive]}>
                  <Text style={[styles.demoTogglePillText, useDeviceLocation && styles.demoTogglePillTextActive]}>
                    {useDeviceLocation ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.demoHelperText}>
                {locationStatus === 'granted'
                  ? 'Location: granted'
                  : locationStatus === 'denied'
                    ? 'Location: denied (using fallback)'
                    : ''}
              </Text>
            </View>
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
    backgroundColor: '#050505',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#050505',
    opacity: 0.45,
  },
  topGlow: {
    position: 'absolute',
    top: -140,
    left: '20%',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0,255,65,0.08)',
  },
  content: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 90,
    gap: 8,
  },
  mapScreen: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 84,
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
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 84,
  },
  insightsTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  insightsTabScroll: {
    marginTop: 14,
    marginBottom: 12,
  },
  insightsTabRow: {
    gap: 8,
    paddingRight: 12,
  },
  insightsTab: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(15,23,42,0.32)',
  },
  insightsTabActive: {
    borderColor: 'rgba(59,130,246,0.7)',
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  insightsTabText: {
    color: '#9ca3af',
    fontSize: 12,
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
  goalsScreen: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 84,
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
    borderColor: 'rgba(34,197,94,0.65)',
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  goalsTabText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  goalsTabTextActive: {
    color: '#bbf7d0',
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
    borderColor: 'rgba(16,185,129,0.55)',
    backgroundColor: 'rgba(6,78,59,0.2)',
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
    color: '#86efac',
    borderColor: 'rgba(52,211,153,0.7)',
    backgroundColor: 'rgba(6,95,70,0.45)',
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
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.45)',
  },
  challengeFilterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  challengeFilterTextActive: {
    color: '#dcfce7',
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
    color: '#4ade80',
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
    backgroundColor: '#22c55e',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  communityJoinText: {
    color: '#022c22',
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
    color: '#bbf7d0',
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
    borderColor: 'rgba(34,197,94,0.45)',
    borderRadius: 14,
    backgroundColor: 'rgba(6,18,14,0.96)',
    padding: 14,
  },
  communityOverviewPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  communityOverviewPopupTitle: {
    color: '#bbf7d0',
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
    color: '#d1fae5',
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
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inviteContactBtnText: {
    color: '#022c22',
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
    borderColor: 'rgba(34,197,94,0.6)',
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  createPostBtnText: {
    color: '#bbf7d0',
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
  progressPostImage: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(30,41,59,0.7)',
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPostImageText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
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
    transform: [{ translateX: -24 }],
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
    backgroundColor: '#050505',
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
    gap: 2,
  },
  navIcon: {
    color: '#52525b',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
  navText: {
    color: '#52525b',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 11,
  },
  navActive: {
    color: '#3b82f6',
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
    fontSize: 16,
    fontWeight: '700',
  },
  sidebarClose: {
    color: '#f3f4f6',
    fontSize: 24,
    lineHeight: 24,
  },
  sidebarItem: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  sidebarItemText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  demoToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  demoToggleLabel: {
    color: '#d1d5db',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  demoTogglePill: {
    minWidth: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  demoTogglePillActive: {
    backgroundColor: 'rgba(59,130,246,0.22)',
    borderColor: 'rgba(59,130,246,0.7)',
  },
  demoTogglePillText: {
    color: '#e5e7eb',
    fontSize: 11,
    fontWeight: '700',
  },
  demoTogglePillTextActive: {
    color: '#93c5fd',
  },
  demoHelperText: {
    marginTop: 8,
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
  },
});
