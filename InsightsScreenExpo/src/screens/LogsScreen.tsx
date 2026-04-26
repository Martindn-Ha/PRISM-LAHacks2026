import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { DUMMY_HEALTH_LOG_EVENTS, type HealthLogEvent } from '../data/dummyLogEvents';
import { styles } from '../styles/appStyles';

const LEVEL_COLOR: Record<HealthLogEvent['level'], string> = {
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

export default function LogsScreen() {
  const rows = useMemo(
    () => [...DUMMY_HEALTH_LOG_EVENTS].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)),
    [],
  );

  return (
    <View style={styles.resourcesScreen}>
      <Text style={styles.resourcesTitle}>Health logs</Text>
      <Text style={styles.resourcesSubtitle}>
        Demo wellness feed from <Text style={{ color: '#e2e8f0' }}>src/data/dummyLogEvents.ts</Text> — sample Apple Health–style events only.
      </Text>

      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.resourcesScrollContent, { paddingBottom: 28 }]}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        style={styles.resourcesScroll}
      >
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
