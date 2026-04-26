import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Alert, Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  NEO_STYLE_PERSONALITY_QUESTIONNAIRE_URL,
  PROFILE_BADGES,
  PROFILE_DEMO_PERSONALITY,
} from '../constants/profileBadges';
import { styles } from '../styles/appStyles';

type Props = {
  onClose: () => void;
};

export default function ProfileShowcaseScreen({ onClose }: Props) {
  const openNeoStyleQuestionnaire = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(NEO_STYLE_PERSONALITY_QUESTIONNAIRE_URL);
      if (!supported) {
        Alert.alert('Unable to open', 'This device cannot open the questionnaire link.');
        return;
      }
      await Linking.openURL(NEO_STYLE_PERSONALITY_QUESTIONNAIRE_URL);
    } catch {
      Alert.alert('Unable to open', 'Something went wrong opening the browser.');
    }
  }, []);

  return (
    <View style={styles.profileShowcaseBackdrop}>
      <View style={styles.profileShowcaseCard}>
        <View style={styles.profileShowcaseHeader}>
          <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.profileShowcaseBackBtn}>
            <Ionicons name="chevron-back" size={22} color="#f8fafc" />
          </TouchableOpacity>
          <View style={styles.profileShowcaseHeaderText}>
            <Text style={styles.profileShowcaseTitle}>Profile</Text>
            <Text style={styles.profileShowcaseSubtitle}>Mr. Chan</Text>
          </View>
        </View>
        <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.profileShowcaseScroll}>
          <View style={styles.profileAvatarWrap}>
            <View style={styles.profileAvatarRing}>
              <Image resizeMode="cover" source={require('../../assets/chanmoji.png')} style={styles.profileAvatarImage} />
            </View>
          </View>
          <View style={styles.profilePersonalityBlock}>
            <Text style={styles.profilePersonalityLabel}>Personality type</Text>
            <Text style={styles.profilePersonalityCode}>{PROFILE_DEMO_PERSONALITY.code}</Text>
            <Text style={styles.profilePersonalityName}>{PROFILE_DEMO_PERSONALITY.name}</Text>
            <TouchableOpacity
              accessibilityHint="Opens the Big Five personality questionnaire in your browser"
              accessibilityLabel="Take NEO style personality questionnaire"
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={openNeoStyleQuestionnaire}
              style={styles.profileQuestionnaireBtn}
            >
              <View style={styles.profileQuestionnaireBtnTextWrap}>
                <Text style={styles.profileQuestionnaireBtnTitle}>Take NEO-style questionnaire</Text>
                <Text style={styles.profileQuestionnaireBtnSubtitle}>
                  Big Five (IPIP-NEO) · opens in your browser
                </Text>
              </View>
              <Ionicons name="open-outline" size={22} color="#7dd3fc" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileShowcaseDivider} />
          <Text style={styles.profileBadgesSectionLabel}>Achievements</Text>
          <Text style={styles.profileBadgesSectionHint}>Unlocked badges shine; others unlock as you progress.</Text>
          <View style={styles.profileBadgesGrid}>
            {PROFILE_BADGES.map((badge) => (
              <View key={badge.id} style={styles.profileBadgeCell}>
                <View style={[styles.profileBadgeCircle, !badge.unlocked && styles.profileBadgeCircleLocked]}>
                  <Text style={[styles.profileBadgeGlyph, !badge.unlocked && styles.profileBadgeGlyphLocked]}>{badge.glyph}</Text>
                </View>
                <Text style={[styles.profileBadgeName, !badge.unlocked && styles.profileBadgeNameLocked]} numberOfLines={2}>
                  {badge.name}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
