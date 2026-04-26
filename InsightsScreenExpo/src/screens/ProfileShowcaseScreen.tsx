import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { PROFILE_BADGES } from '../constants/profileBadges';
import { styles } from '../styles/appStyles';

type Props = {
  onClose: () => void;
};

export default function ProfileShowcaseScreen({ onClose }: Props) {
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
