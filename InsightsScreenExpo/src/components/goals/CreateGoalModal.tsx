import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  buildGoalPickerSections,
  defaultConfigForMetric,
  formatGoalTarget,
  GOAL_ELIGIBLE_METRICS,
  goalMetricUnit,
  isGoalEligibleMetric,
  isRangeTarget,
  type GoalDirection,
  type GoalPeriod,
  type GoalTarget,
} from '../../constants/goals';
import { insightTabLabel, QUICK_ACTION_THEME_COLOR_BY_TAB, type InsightContent, type InsightTab } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import type { CreateGoalInput } from '../../lib/goalsStorage';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightTabIcon } from '../icons/InsightTabIcon';
import { TrackedPressable } from '../TrackedPressable';
import { TrackedTouchableOpacity } from '../TrackedTouchableOpacity';

type Props = {
  visible: boolean;
  insightContentByTab: Record<InsightTab, InsightContent>;
  healthKitReady: boolean;
  onClose: () => void;
  onCreate: (input: CreateGoalInput) => void;
};

const DIRECTION_LABEL: Record<GoalDirection, string> = {
  increase: 'Reach at least',
  decrease: 'Stay at or below',
  in_range: 'Stay within range',
};

export function CreateGoalModal({ visible, insightContentByTab, healthKitReady, onClose, onCreate }: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const mutedColor = theme?.textMuted ?? '#94a3b8';
  const textColor = theme?.textPrimary ?? '#f8fafc';
  const inputPlaceholderColor = theme?.textMuted ?? '#64748b';

  const goalPickerSections = useMemo(
    () => buildGoalPickerSections(insightContentByTab, healthKitReady),
    [healthKitReady, insightContentByTab],
  );

  const [selectedMetric, setSelectedMetric] = useState<(typeof GOAL_ELIGIBLE_METRICS)[number] | null>(null);
  const [direction, setDirection] = useState<GoalDirection>('increase');
  const [period, setPeriod] = useState<GoalPeriod>('daily');
  const [targetText, setTargetText] = useState('');
  const [targetMaxText, setTargetMaxText] = useState('');
  const [label, setLabel] = useState('');

  const config = selectedMetric ? defaultConfigForMetric(selectedMetric) : null;

  useEffect(() => {
    if (!visible) {
      return;
    }
    setSelectedMetric(null);
    setDirection('increase');
    setPeriod('daily');
    setTargetText('');
    setTargetMaxText('');
    setLabel('');
  }, [visible]);

  useEffect(() => {
    if (!selectedMetric) {
      return;
    }
    const stillAvailable = goalPickerSections.some((section) => section.tabs.includes(selectedMetric));
    if (!stillAvailable) {
      setSelectedMetric(null);
    }
  }, [goalPickerSections, selectedMetric]);

  useEffect(() => {
    if (!selectedMetric || !config) {
      return;
    }
    setDirection(config.defaultDirection);
    setPeriod(config.defaultPeriod);
    if (isRangeTarget(config.defaultTarget)) {
      setTargetText(String(config.defaultTarget.min));
      setTargetMaxText(String(config.defaultTarget.max));
    } else {
      setTargetText(String(config.defaultTarget));
      setTargetMaxText('');
    }
  }, [config, selectedMetric]);

  const previewTarget = useMemo((): GoalTarget | null => {
    if (!selectedMetric) {
      return null;
    }
    if (direction === 'in_range') {
      const min = Number(targetText);
      const max = Number(targetMaxText);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
        return null;
      }
      return { min, max };
    }
    const value = Number(targetText);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  }, [direction, selectedMetric, targetMaxText, targetText]);

  const canCreate = selectedMetric != null && previewTarget != null;

  const handleCreate = () => {
    if (!selectedMetric || previewTarget == null) {
      return;
    }
    onCreate({
      metric: selectedMetric,
      direction,
      target: previewTarget,
      period,
      label: label.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <TrackedPressable onPress={onClose} style={mergePaletteLayer(layers, 'quickMetricsPickerBackdrop', styles.quickMetricsPickerBackdrop)} trackId="goalModal.backdrop">
        <Pressable onPress={() => {}} style={mergePaletteLayer(layers, 'quickMetricsPickerCard', styles.quickMetricsPickerCard)}>
          <View style={styles.quickMetricsPickerHeader}>
            <View style={styles.quickMetricsPickerHeaderText}>
              <Text style={mergePaletteLayer(layers, 'quickMetricsPickerTitle', styles.quickMetricsPickerTitle)}>New goal</Text>
              <Text style={mergePaletteLayer(layers, 'quickMetricsPickerHint', styles.quickMetricsPickerHint)}>
                Pick a metric PRISM already tracks from Apple Health
              </Text>
            </View>
            <TrackedTouchableOpacity accessibilityLabel="Close goal creator" onPress={onClose} style={styles.quickMetricsPickerCloseBtn} trackId="goalModal.close">
              <Text style={{ color: mutedColor, fontSize: 22 }}>×</Text>
            </TrackedTouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.quickMetricsPickerScroll}>
            {goalPickerSections.length === 0 ? (
              <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.goalsEmptyText)}>
                Connect Apple Health and wait for metric data before creating goals.
              </Text>
            ) : null}
            {goalPickerSections.map((section) => (
              <View key={section.title} style={styles.quickMetricsPickerSection}>
                <View style={styles.quickMetricsPickerSectionHeader}>
                  <View style={[styles.quickMetricsPickerSectionAccent, { backgroundColor: section.color }]} />
                  <Text style={mergePaletteLayer(layers, 'quickMetricsPickerSectionTitle', styles.quickMetricsPickerSectionTitle)}>
                    {section.title}
                  </Text>
                </View>
                {section.tabs.map((metric) => {
                  const isSelected = selectedMetric === metric;
                  const accent = QUICK_ACTION_THEME_COLOR_BY_TAB[metric] ?? section.color;
                  return (
                    <TrackedTouchableOpacity
                      key={metric}
                      onPress={() => setSelectedMetric(metric)}
                      style={[
                        mergePaletteLayer(layers, 'quickMetricsPickerRow', styles.quickMetricsPickerRow),
                        isSelected && styles.quickMetricsPickerRowSelected,
                      ]}
                      trackId={`goalModal.metric.${metric}`}
                    >
                      <View style={[styles.quickMetricsPickerRowIcon, { borderColor: accent }]}>
                        <InsightTabIcon color={mutedColor} metric={metric} size={18} />
                      </View>
                      <Text
                        numberOfLines={2}
                        style={[styles.quickMetricsPickerRowLabel, { color: textColor }, isSelected && styles.quickMetricsPickerRowLabelSelected]}
                      >
                        {insightTabLabel(metric)}
                      </Text>
                    </TrackedTouchableOpacity>
                  );
                })}
              </View>
            ))}

            {selectedMetric ? (
              <View style={styles.goalCreateSection}>
                <Text style={mergePaletteLayer(layers, 'goalsCardTitle', styles.goalCreateSectionTitle)}>Target</Text>
                <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.goalCreateHint)}>{DIRECTION_LABEL[direction]}</Text>

                <View style={styles.goalPeriodRow}>
                  {(['daily', 'weekly'] as GoalPeriod[]).map((option) => (
                    <TrackedTouchableOpacity
                      key={option}
                      onPress={() => setPeriod(option)}
                      style={[
                        mergePaletteLayer(layers, 'goalsTab', styles.goalsTab),
                        period === option && mergePaletteLayer(layers, 'goalsTabActive', styles.goalsTabActive),
                      ]}
                      trackId={`goalModal.period.${option}`}
                    >
                      <Text
                        style={[
                          mergePaletteLayer(layers, 'goalsTabText', styles.goalsTabText),
                          period === option && mergePaletteLayer(layers, 'goalsTabTextActive', styles.goalsTabTextActive),
                        ]}
                      >
                        {option === 'daily' ? 'Daily' : 'Weekly'}
                      </Text>
                    </TrackedTouchableOpacity>
                  ))}
                </View>

                {direction === 'in_range' ? (
                  <View style={styles.goalTargetRow}>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={setTargetText}
                      placeholder="Min"
                      placeholderTextColor={inputPlaceholderColor}
                      style={[mergePaletteLayer(layers, 'challengeInput', styles.challengeInput), styles.goalTargetInput]}
                      value={targetText}
                    />
                    <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.goalTargetDash)}>–</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={setTargetMaxText}
                      placeholder="Max"
                      placeholderTextColor={inputPlaceholderColor}
                      style={[mergePaletteLayer(layers, 'challengeInput', styles.challengeInput), styles.goalTargetInput]}
                      value={targetMaxText}
                    />
                    <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.goalTargetUnit)}>{goalMetricUnit(selectedMetric)}</Text>
                  </View>
                ) : (
                  <View style={styles.goalTargetRow}>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={setTargetText}
                      placeholder="Target"
                      placeholderTextColor={inputPlaceholderColor}
                      style={[mergePaletteLayer(layers, 'challengeInput', styles.challengeInput), styles.goalTargetInputWide]}
                      value={targetText}
                    />
                    <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.goalTargetUnit)}>{goalMetricUnit(selectedMetric)}</Text>
                  </View>
                )}

                {previewTarget ? (
                  <Text style={mergePaletteLayer(layers, 'goalsCardMeta', styles.goalCreatePreview)}>
                    {formatGoalTarget({
                      id: 'preview',
                      metric: selectedMetric,
                      direction,
                      target: previewTarget,
                      period,
                      createdAt: new Date().toISOString(),
                      deletedAt: null,
                    })}
                  </Text>
                ) : null}

                <TextInput
                  onChangeText={setLabel}
                  placeholder="Optional label"
                  placeholderTextColor={inputPlaceholderColor}
                  style={mergePaletteLayer(layers, 'challengeInput', styles.challengeInput)}
                  value={label}
                />
              </View>
            ) : null}
          </ScrollView>

          <TrackedTouchableOpacity
            disabled={!canCreate}
            onPress={handleCreate}
            style={[
              mergePaletteLayer(layers, 'quickMetricsPickerDoneBtn', styles.quickMetricsPickerDoneBtn),
              !canCreate && styles.goalCreateBtnDisabled,
            ]}
            trackId="goalModal.create"
          >
            <Text style={mergePaletteLayer(layers, 'quickMetricsPickerDoneText', styles.quickMetricsPickerDoneText)}>Create goal</Text>
          </TrackedTouchableOpacity>
        </Pressable>
      </TrackedPressable>
    </Modal>
  );
}

export function isCreateGoalMetric(metric: InsightTab): metric is CreateGoalInput['metric'] {
  return isGoalEligibleMetric(metric);
}