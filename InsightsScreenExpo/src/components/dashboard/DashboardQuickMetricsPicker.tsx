import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  DASHBOARD_QUICK_ACTION_MEDICATIONS,
  dashboardQuickActionLabel,
  dashboardQuickActionThemeColor,
  isDashboardQuickActionMedications,
  normalizeDashboardQuickActions,
  type DashboardQuickAction,
} from '../../constants/dashboardQuickActions';
import { MEDICATIONS_SECTION_COLOR } from '../../constants/medications';
import {
  DASHBOARD_QUICK_ACTION_SLOTS,
  DASHBOARD_QUICK_METRIC_PICKER_SECTIONS,
  QUICK_ACTION_THEME_COLOR_BY_TAB,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightTabIcon } from '../icons/InsightTabIcon';

type Props = {
  visible: boolean;
  selected: DashboardQuickAction[];
  onClose: () => void;
  onApply: (actions: DashboardQuickAction[]) => void;
};

function toggleAction(selected: DashboardQuickAction[], action: DashboardQuickAction): DashboardQuickAction[] {
  if (selected.includes(action)) {
    return selected.filter((item) => item !== action);
  }
  if (selected.length < DASHBOARD_QUICK_ACTION_SLOTS) {
    return [...selected, action];
  }
  return [...selected.slice(1), action];
}

export function DashboardQuickMetricsPicker({ visible, selected, onClose, onApply }: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const mutedColor = theme?.textMuted ?? '#94a3b8';
  const textColor = theme?.textPrimary ?? '#f8fafc';
  const [draft, setDraft] = useState<DashboardQuickAction[]>(selected);

  useEffect(() => {
    if (visible) {
      setDraft(selected);
    }
  }, [visible, selected]);

  const handleDone = () => {
    onApply(normalizeDashboardQuickActions(draft));
    onClose();
  };

  const renderRow = (action: DashboardQuickAction, accent: string) => {
    const isSelected = draft.includes(action);
    return (
      <TouchableOpacity
        key={action}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        onPress={() => setDraft(toggleAction(draft, action))}
        style={[
          mergePaletteLayer(layers, 'quickMetricsPickerRow', styles.quickMetricsPickerRow),
          isSelected && styles.quickMetricsPickerRowSelected,
        ]}
      >
        <View style={[styles.quickMetricsPickerRowIcon, { borderColor: accent }]}>
          {isDashboardQuickActionMedications(action) ? (
            <Ionicons color={mutedColor} name="medkit-outline" size={18} />
          ) : (
            <InsightTabIcon color={mutedColor} metric={action} size={18} />
          )}
        </View>
        <Text
          numberOfLines={2}
          style={[styles.quickMetricsPickerRowLabel, { color: textColor }, isSelected && styles.quickMetricsPickerRowLabelSelected]}
        >
          {dashboardQuickActionLabel(action)}
        </Text>
        <Ionicons color={isSelected ? accent : mutedColor} name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={22} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={mergePaletteLayer(layers, 'quickMetricsPickerBackdrop', styles.quickMetricsPickerBackdrop)}>
        <Pressable onPress={() => {}} style={mergePaletteLayer(layers, 'quickMetricsPickerCard', styles.quickMetricsPickerCard)}>
          <View style={styles.quickMetricsPickerHeader}>
            <View style={styles.quickMetricsPickerHeaderText}>
              <Text style={mergePaletteLayer(layers, 'quickMetricsPickerTitle', styles.quickMetricsPickerTitle)}>
                Quick actions
              </Text>
              <Text style={mergePaletteLayer(layers, 'quickMetricsPickerHint', styles.quickMetricsPickerHint)}>
                Choose {DASHBOARD_QUICK_ACTION_SLOTS} shortcuts for your dashboard
              </Text>
            </View>
            <TouchableOpacity accessibilityLabel="Close metric picker" onPress={onClose} style={styles.quickMetricsPickerCloseBtn}>
              <Ionicons color={mutedColor} name="close" size={22} />
            </TouchableOpacity>
          </View>

          <Text style={mergePaletteLayer(layers, 'quickMetricsPickerCount', styles.quickMetricsPickerCount)}>
            {draft.length}/{DASHBOARD_QUICK_ACTION_SLOTS} selected
          </Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.quickMetricsPickerScroll}
          >
            {DASHBOARD_QUICK_METRIC_PICKER_SECTIONS.map((section) => (
              <View key={section.title} style={styles.quickMetricsPickerSection}>
                <View style={styles.quickMetricsPickerSectionHeader}>
                  <View style={[styles.quickMetricsPickerSectionAccent, { backgroundColor: section.color }]} />
                  <Text style={mergePaletteLayer(layers, 'quickMetricsPickerSectionTitle', styles.quickMetricsPickerSectionTitle)}>
                    {section.title}
                  </Text>
                </View>
                {section.tabs.map((metric) => renderRow(metric, QUICK_ACTION_THEME_COLOR_BY_TAB[metric] ?? section.color))}
              </View>
            ))}
            <View style={styles.quickMetricsPickerSection}>
              <View style={styles.quickMetricsPickerSectionHeader}>
                <View style={[styles.quickMetricsPickerSectionAccent, { backgroundColor: MEDICATIONS_SECTION_COLOR }]} />
                <Text style={mergePaletteLayer(layers, 'quickMetricsPickerSectionTitle', styles.quickMetricsPickerSectionTitle)}>
                  Logged in PRISM
                </Text>
              </View>
              {renderRow(DASHBOARD_QUICK_ACTION_MEDICATIONS, dashboardQuickActionThemeColor(DASHBOARD_QUICK_ACTION_MEDICATIONS))}
            </View>
          </ScrollView>

          <TouchableOpacity onPress={handleDone} style={mergePaletteLayer(layers, 'quickMetricsPickerDoneBtn', styles.quickMetricsPickerDoneBtn)}>
            <Text style={mergePaletteLayer(layers, 'quickMetricsPickerDoneText', styles.quickMetricsPickerDoneText)}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
