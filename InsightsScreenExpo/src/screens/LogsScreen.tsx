import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { AlertLogEvent } from '../types/experience';
import { styles } from '../styles/appStyles';

const LEVEL_COLOR: Record<AlertLogEvent['level'], string> = {
  info: '#7dd3fc',
  warn: '#fcd34d',
  error: '#fca5a5',
  debug: '#c4b5fd',
};

function formatDisplayTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

type LogsScreenProps = {
  events: AlertLogEvent[];
};

export default function LogsScreen({ events }: LogsScreenProps) {
  const rows = useMemo(
    () => [...events].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)),
    [events],
  );

  return (
    <View style={styles.resourcesScreen}>
      <Text style={styles.resourcesTitle}>Alert logs</Text>
      <Text style={styles.resourcesSubtitle}>
        Timeline of alert events from this session: high glucose, stress, or heart rate, recoveries, dismissals, and demo
        push notifications.
      </Text>

      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.resourcesScrollContent, { paddingBottom: 28 }]}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        style={styles.resourcesScroll}
      >
        {rows.length === 0 ? (
          <View style={[styles.glassCard, styles.resourcesCard, styles.logEventCard]}>
            <Text style={styles.resourcesCardBody}>
              No alert events yet. When metrics cross the advisor thresholds (glucose ≥170, stress ≥70, heart rate ≥95),
              or you use demo alerts / dismiss a card, entries will appear here.
            </Text>
          </View>
        ) : null}
        {rows.map((e) => (
          <View key={e.id} style={[styles.glassCard, styles.resourcesCard, styles.logEventCard]}>
            <View style={styles.logEventHeader}>
              <Text style={styles.logEventTime}>{formatDisplayTime(e.at)}</Text>
              <Text style={[styles.logEventLevel, { color: LEVEL_COLOR[e.level] }]}>{e.level.toUpperCase()}</Text>
            </View>
            <Text style={styles.logEventSource}>{e.source}</Text>
            <Text style={styles.resourcesCardBody}>{e.message}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
