import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { formatGoalTarget, goalDisplayTitle, type MetricGoal } from '../constants/goals';
import type { InsightContent, InsightTab } from '../constants/insights';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { useTypography } from '../context/TypographyContext';
import { computeGoalProgressFromInsight } from '../lib/goalProgress';
import { mergePaletteLayer } from '../theme/demoPaletteTheme';
import { TrackedPressable } from '../components/TrackedPressable';
import { TrackedTouchableOpacity } from '../components/TrackedTouchableOpacity';

type Props = {
  goals: MetricGoal[];
  insightContentByTab: Record<InsightTab, InsightContent>;
  onCreatePress: () => void;
  onDeleteGoal: (goalId: string) => void;
};

export default function GoalsScreen({ goals, insightContentByTab, onCreatePress, onDeleteGoal }: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const [selectedGoal, setSelectedGoal] = useState<MetricGoal | null>(null);

  const confirmDelete = (goal: MetricGoal) => {
    Alert.alert('Delete goal?', `${goalDisplayTitle(goal)} will be archived and kept in exports.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDeleteGoal(goal.id);
          setSelectedGoal(null);
        },
      },
    ]);
  };

  return (
    <View style={mergePaletteLayer(layers, 'goalsScreen', styles.goalsScreen)}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.goalsScrollContent}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        style={styles.goalsScroll}
      >
        <TrackedTouchableOpacity onPress={onCreatePress} style={styles.createPersonalChallengeBtn} trackId="goals.create">
          <Text style={styles.createPersonalChallengeBtnText}>+ New goal</Text>
        </TrackedTouchableOpacity>

        {goals.length === 0 ? (
          <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.goalsEmptyText)}>
            No goals yet. Pick a health metric and set a target.
          </Text>
        ) : (
          goals.map((goal) => {
            const progress = computeGoalProgressFromInsight(goal, insightContentByTab[goal.metric]);
            const progressPct = progress.progress != null ? Math.round(progress.progress * 100) : 0;
            return (
              <TrackedTouchableOpacity
                key={goal.id}
                activeOpacity={0.85}
                onPress={() => setSelectedGoal(goal)}
                style={mergePaletteLayer(layers, 'goalsCard', styles.goalsCard)}
                trackId={`goals.card.${goal.id}`}
              >
                <Text numberOfLines={2} style={mergePaletteLayer(layers, 'goalsCardTitle', styles.goalsCardTitle)}>
                  {goalDisplayTitle(goal)}
                </Text>
                <Text numberOfLines={2} style={mergePaletteLayer(layers, 'goalsCardDetail', styles.goalsCardDetail)}>
                  {progress.summary}
                </Text>
                <Text style={mergePaletteLayer(layers, 'goalsCardMeta', styles.goalsCardMeta)}>{formatGoalTarget(goal)}</Text>
                {progress.progress != null ? (
                  <View style={styles.challengeProgressRow}>
                    <View style={styles.challengeProgressTrack}>
                      <View style={[styles.challengeProgressFill, { width: `${progressPct}%` }]} />
                    </View>
                    <Text style={styles.challengeProgressLabel}>{progressPct}%</Text>
                  </View>
                ) : null}
              </TrackedTouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setSelectedGoal(null)} transparent visible={selectedGoal != null}>
        <TrackedPressable onPress={() => setSelectedGoal(null)} style={styles.challengeDetailBackdrop} trackId="goals.detail.backdrop">
          <Pressable onPress={() => {}} style={mergePaletteLayer(layers, 'challengeModalCard', styles.challengeModalCard)}>
            {selectedGoal ? (
              <>
                <Text style={mergePaletteLayer(layers, 'challengeModalTitle', styles.challengeModalTitle)}>
                  {goalDisplayTitle(selectedGoal)}
                </Text>
                <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.challengeModalHint)}>
                  {computeGoalProgressFromInsight(selectedGoal, insightContentByTab[selectedGoal.metric]).summary}
                </Text>
                <Text style={mergePaletteLayer(layers, 'goalsCardMeta', styles.challengeModalHint)}>{formatGoalTarget(selectedGoal)}</Text>
                <View style={styles.challengeModalActions}>
                  <TrackedTouchableOpacity
                    onPress={() => confirmDelete(selectedGoal)}
                    style={mergePaletteLayer(layers, 'challengeModalCancelBtn', styles.challengeModalCancelBtn)}
                    trackId={`goals.detail.delete.${selectedGoal.id}`}
                  >
                    <Text style={mergePaletteLayer(layers, 'challengeModalCancelText', styles.challengeModalCancelText)}>Delete</Text>
                  </TrackedTouchableOpacity>
                  <TrackedTouchableOpacity
                    onPress={() => setSelectedGoal(null)}
                    style={mergePaletteLayer(layers, 'challengeModalCreateBtn', styles.challengeModalCreateBtn)}
                    trackId="goals.detail.close"
                  >
                    <Text style={mergePaletteLayer(layers, 'challengeModalCreateText', styles.challengeModalCreateText)}>Close</Text>
                  </TrackedTouchableOpacity>
                </View>
              </>
            ) : null}
          </Pressable>
        </TrackedPressable>
      </Modal>
    </View>
  );
}
