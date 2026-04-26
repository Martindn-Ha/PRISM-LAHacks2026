// @ts-nocheck
import { Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MAP_LAYERS, type MapLayerFilter } from '../constants/appNavigation';
import { styles } from '../styles/appStyles';
import type { MapScreenPin } from '../types/experience';

type Props = {
  activeMapLayer: MapLayerFilter | null;
  setActiveMapLayer: (updater: (prev: MapLayerFilter | null) => MapLayerFilter | null) => void;
  mapLocationStatus: 'idle' | 'granted' | 'denied';
  mapCoords: { lat: number; lon: number } | null;
  mapDiscoveryEventsLoading: boolean;
  mapViewRef: React.RefObject<MapView | null>;
  mapRecommendations: MapScreenPin[];
  openEventLinkPrompt: (event: NonNullable<MapScreenPin['linkedEvent']>) => void;
  recenterMapToCurrentLocation: () => Promise<void>;
};

export default function MapScreen(props: Props) {
  const { activeMapLayer, setActiveMapLayer, mapLocationStatus, mapCoords, mapDiscoveryEventsLoading, mapViewRef, mapRecommendations, openEventLinkPrompt, recenterMapToCurrentLocation } = props;
  return (
        <View style={styles.mapScreen}>
          <Text style={styles.mapTitle}>Map</Text>
          <View style={styles.mapLayerRow}>
            {MAP_LAYERS.map((layer) => (
              <TouchableOpacity
                key={layer}
                onPress={() => setActiveMapLayer((prev) => (prev === layer ? null : layer))}
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
          {mapCoords && mapDiscoveryEventsLoading ? (
            <Text style={styles.mapSubtitle}>Loading Ticketmaster & Eventbrite listings…</Text>
          ) : null}
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
                    pinColor={item.pinColor ?? '#22c55e'}
                    title={item.title}
                    description={item.subtitle}
                    onPress={() => {
                      if (item.linkedEvent) {
                        openEventLinkPrompt(item.linkedEvent);
                      }
                    }}
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
  );
}
