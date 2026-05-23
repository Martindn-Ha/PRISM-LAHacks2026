// @ts-nocheck
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MAP_LAYERS, type MapLayerFilter } from '../constants/appNavigation';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { mergePaletteLayer } from '../theme/demoPaletteTheme';
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
  const { layers } = useDemoPalette();
  const { activeMapLayer, setActiveMapLayer, mapLocationStatus, mapCoords, mapDiscoveryEventsLoading, mapViewRef, mapRecommendations, openEventLinkPrompt, recenterMapToCurrentLocation } = props;
  const mapRegion = useMemo(
    () =>
      mapCoords
        ? {
            latitude: mapCoords.lat,
            longitude: mapCoords.lon,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }
        : null,
    [mapCoords?.lat, mapCoords?.lon],
  );
  return (
        <View style={mergePaletteLayer(layers, 'mapScreen', styles.mapScreen)}>
          <Text style={mergePaletteLayer(layers, 'mapTitle', styles.mapTitle)}>Map</Text>
          <View style={styles.mapLayerRow}>
            {MAP_LAYERS.map((layer) => (
              <TouchableOpacity
                key={layer}
                onPress={() => setActiveMapLayer((prev) => (prev === layer ? null : layer))}
                style={[
                  mergePaletteLayer(layers, 'mapLayerChip', styles.mapLayerChip),
                  activeMapLayer === layer && mergePaletteLayer(layers, 'mapLayerChipActive', styles.mapLayerChipActive),
                ]}
              >
                <Text
                  style={[
                    mergePaletteLayer(layers, 'mapLayerChipText', styles.mapLayerChipText),
                    activeMapLayer === layer && mergePaletteLayer(layers, 'mapLayerChipTextActive', styles.mapLayerChipTextActive),
                  ]}
                >
                  {layer}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={mergePaletteLayer(layers, 'mapSubtitle', styles.mapSubtitle)}>
            {mapLocationStatus === 'granted'
              ? 'Showing your current location'
              : mapLocationStatus === 'denied'
                ? 'Location permission denied. Enable it to view your map.'
                : 'Requesting location...'}
          </Text>
          {mapCoords && mapDiscoveryEventsLoading ? (
            <Text style={mergePaletteLayer(layers, 'mapSubtitle', styles.mapSubtitle)}>
              Loading map…
            </Text>
          ) : null}
          {mapCoords && mapRegion ? (
            <View style={mergePaletteLayer(layers, 'mapContainer', styles.mapContainer)}>
              <MapView
                ref={mapViewRef}
                region={mapRegion}
                showsUserLocation
                style={styles.map}
              >
                <Marker
                  coordinate={{ latitude: mapCoords.lat, longitude: mapCoords.lon }}
                  title="You are here"
                  description=" "
                  tracksViewChanges={false}
                />
                {mapRecommendations.map((item) => (
                  <Marker
                    key={item.id}
                    coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                    pinColor={item.pinColor ?? '#22c55e'}
                    title={item.title ?? 'Event'}
                    description={item.subtitle ?? ' '}
                    tracksViewChanges={false}
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
