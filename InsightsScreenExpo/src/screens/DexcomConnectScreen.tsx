import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { useTypography } from '../context/TypographyContext';
import { clearDexcomCredentials, getDexcomCredentials, getDexcomLinked, saveDexcomCredentials } from '../lib/dexcom/dexcomConnection';
import { validateDexcomCredentials } from '../lib/dexcom/dexcomShareClient';
import type { DexcomRegion } from '../lib/dexcom/types';
import { mergePaletteLayer } from '../theme/demoPaletteTheme';
import { TrackedTouchableOpacity } from '../components/TrackedTouchableOpacity';

type Props = {
  onClose: () => void;
  onLinked?: () => void;
};

const REGION_OPTIONS: { id: DexcomRegion; label: string }[] = [
  { id: 'us', label: 'US' },
  { id: 'ous', label: 'Outside US' },
  { id: 'jp', label: 'Japan' },
];

export default function DexcomConnectScreen({ onClose, onLinked }: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const inputPlaceholderColor = theme?.textMuted ?? '#64748b';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState<DexcomRegion>('us');
  const [linked, setLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [isLinked, creds] = await Promise.all([getDexcomLinked(), getDexcomCredentials()]);
      if (cancelled) {
        return;
      }
      setLinked(isLinked);
      if (creds) {
        setUsername(creds.username);
        setRegion(creds.region);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLink = async () => {
    if (saving || !username.trim()) {
      Alert.alert('Missing fields', 'Enter your Dexcom username.');
      return;
    }

    setSaving(true);
    try {
      let passwordToUse = password;
      if (!passwordToUse.trim() && linked) {
        const existing = await getDexcomCredentials();
        passwordToUse = existing?.password ?? '';
      }
      if (!passwordToUse.trim()) {
        Alert.alert('Missing fields', 'Enter your Dexcom password.');
        return;
      }

      const credentials = { username: username.trim(), password: passwordToUse, region };
      await validateDexcomCredentials(credentials);
      await saveDexcomCredentials(credentials);
      setLinked(true);
      setPassword('');
      onLinked?.();
      Alert.alert('Dexcom connected', 'PRISM will use Dexcom Share as your primary glucose source.');
    } catch (error) {
      Alert.alert('Connection failed', error instanceof Error ? error.message : 'Could not connect to Dexcom.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = () => {
    Alert.alert('Disconnect Dexcom?', 'PRISM will fall back to Apple Health for glucose.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearDexcomCredentials();
            setLinked(false);
            setPassword('');
            onLinked?.();
          })();
        },
      },
    ]);
  };

  return (
    <View style={mergePaletteLayer(layers, 'profileShowcaseBackdrop', styles.profileShowcaseBackdrop)}>
      <View style={mergePaletteLayer(layers, 'profileShowcaseCard', styles.profileShowcaseCard)}>
        <View style={styles.profileShowcaseHeader}>
          <TrackedTouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.profileShowcaseBackBtn} trackId="dexcom.back">
            <Ionicons name="chevron-back" size={22} color={theme?.textPrimary ?? '#f8fafc'} />
          </TrackedTouchableOpacity>
          <View style={styles.profileShowcaseHeaderText}>
            <Text style={mergePaletteLayer(layers, 'profileShowcaseTitle', styles.profileShowcaseTitle)}>Connect Dexcom</Text>
          </View>
        </View>

        <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.profileShowcaseScroll}>
          <View style={styles.profileExportSection}>
            <Text style={styles.profileExportPrivacyText}>
              G6/G7 with Dexcom Share enabled (at least one follower). Other CGMs can use Apple Health automatically.
            </Text>

            {loading ? (
              <ActivityIndicator color={theme?.accent ?? '#38bdf8'} style={{ marginTop: 24 }} />
            ) : (
              <>
                <Text style={styles.profileExportOptionLabel}>Region</Text>
                <View style={styles.profileExportSegmentRow}>
                  {REGION_OPTIONS.map((option) => {
                    const active = region === option.id;
                    return (
                      <TrackedTouchableOpacity
                        key={option.id}
                        accessibilityRole="button"
                        disabled={saving}
                        onPress={() => setRegion(option.id)}
                        style={[styles.profileExportSegmentBtn, active && styles.profileExportSegmentBtnActive]}
                        trackId={`dexcom.region.${option.id}`}
                      >
                        <Text style={[styles.profileExportSegmentBtnText, active && styles.profileExportSegmentBtnTextActive]}>
                          {option.label}
                        </Text>
                      </TrackedTouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                  onChangeText={setUsername}
                  placeholder="Dexcom username (email or phone)"
                  placeholderTextColor={inputPlaceholderColor}
                  style={mergePaletteLayer(layers, 'challengeInput', styles.challengeInput)}
                  value={username}
                />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                  onChangeText={setPassword}
                  placeholder={linked ? 'Password (leave blank to keep)' : 'Dexcom password'}
                  placeholderTextColor={inputPlaceholderColor}
                  secureTextEntry
                  style={mergePaletteLayer(layers, 'challengeInput', styles.challengeInput)}
                  value={password}
                />

                <TrackedTouchableOpacity
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => {
                    void handleLink();
                  }}
                  style={[styles.profileExportPrimaryBtn, saving && styles.profileExportPrimaryBtnDisabled]}
                  trackId="dexcom.connect"
                >
                  <Text style={styles.profileExportPrimaryBtnText}>
                    {saving ? 'Connecting…' : linked ? 'Update connection' : 'Connect Dexcom'}
                  </Text>
                </TrackedTouchableOpacity>

                {linked ? (
                  <TrackedTouchableOpacity accessibilityRole="button" disabled={saving} onPress={handleUnlink} style={styles.profileExportDateBtn} trackId="dexcom.disconnect">
                    <Text style={styles.profileExportDateBtnText}>Disconnect Dexcom</Text>
                  </TrackedTouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
