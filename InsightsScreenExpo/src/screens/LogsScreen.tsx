import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { AlertLogEvent } from '../types/experience';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { useTypography } from '../context/TypographyContext';
import { mergePaletteLayer } from '../theme/demoPaletteTheme';

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
  /** Hide title block when embedded (e.g. home alert button modal). */
  omitHeading?: boolean;
};

export default function LogsScreen({ events, omitHeading = false }: LogsScreenProps) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const rows = useMemo(
    () => [...events].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)),
    [events],
  );

  return (
    <View style={[mergePaletteLayer(layers, 'resourcesScreen', styles.resourcesScreen), omitHeading ? styles.resourcesScreenModalEmbed : null]}>
      {omitHeading ? null : (
        <Text style={mergePaletteLayer(layers, 'resourcesTitle', styles.resourcesTitle)}>Event Logs</Text>
      )}

      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.resourcesScrollContent, { paddingBottom: 28 }]}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        style={styles.resourcesScroll}
      >
        {rows.length === 0 ? (
          <Text style={[mergePaletteLayer(layers, 'resourcesCardBody', styles.resourcesCardBody), styles.eventsEmptyText]}>
            No events yet.
          </Text>
        ) : null}
        {rows.map((e) => (
          <View key={e.id} style={[mergePaletteLayer(layers, 'glassCard', styles.glassCard), styles.resourcesCard, styles.logEventCard]}>
            <View style={styles.logEventHeader}>
              <Text style={mergePaletteLayer(layers, 'logEventTime', styles.logEventTime)}>{formatDisplayTime(e.at)}</Text>
              <Text style={[styles.logEventLevel, { color: LEVEL_COLOR[e.level] }]}>{e.level.toUpperCase()}</Text>
            </View>
            <Text style={mergePaletteLayer(layers, 'logEventSource', styles.logEventSource)}>{e.source}</Text>
            <Text style={mergePaletteLayer(layers, 'resourcesCardBody', styles.resourcesCardBody)}>{e.message}</Text>
            {e.glucoseAt ? (
              <Text style={mergePaletteLayer(layers, 'logEventSource', styles.logEventSource)}>
                Glucose time: {formatDisplayTime(e.glucoseAt)}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
