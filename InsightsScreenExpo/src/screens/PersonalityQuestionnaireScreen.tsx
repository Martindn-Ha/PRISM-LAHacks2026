// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import {
  IPIP_ANSWER_SCALE,
  IPIP_QUESTION_COUNT,
  IPIP_QUESTIONNAIRE_INTRO_LINES,
  IPIP_QUESTIONNAIRE_TITLE,
  buildIpipRawReport,
} from '../ipip';
import { useIpipQuestionnaire } from '../hooks/useIpipQuestionnaire';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { useTypography } from '../context/TypographyContext';
import { mergePaletteLayer } from '../theme/demoPaletteTheme';
import { TrackedPressable } from '../components/TrackedPressable';
import { TrackedTouchableOpacity } from '../components/TrackedTouchableOpacity';

function confirmRetakeQuestionnaire(onConfirm: () => void) {
  Alert.alert(
    'Retake questionnaire?',
    'Your current answers and results will be replaced.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Retake', style: 'destructive', onPress: onConfirm },
    ],
  );
}

export default function PersonalityQuestionnaireScreen() {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const {
    phase,
    answers,
    currentIndex,
    currentQuestion,
    answeredCount,
    progressPct,
    results,
    startQuestionnaire,
    resumeQuestionnaire,
    answerCurrent,
    goBack,
    restart,
    viewResults,
  } = useIpipQuestionnaire();

  if (phase === 'loading') {
    return (
      <View style={[mergePaletteLayer(layers, 'wellnessScreen', styles.wellnessScreen), styles.wellnessCentered]}>
        <ActivityIndicator color={theme?.accent ?? '#93c5fd'} size="small" />
      </View>
    );
  }

  if (phase === 'intro') {
    const hasProgress = answeredCount > 0 && answeredCount < IPIP_QUESTION_COUNT;
    const isDone = answeredCount >= IPIP_QUESTION_COUNT;

    return (
      <View style={mergePaletteLayer(layers, 'wellnessScreen', styles.wellnessScreen)}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.wellnessIntroContent}
          showsVerticalScrollIndicator={false}
          style={styles.wellnessScroll}
        >
          <Text style={mergePaletteLayer(layers, 'wellnessTitle', styles.wellnessTitle)}>{IPIP_QUESTIONNAIRE_TITLE}</Text>
          {IPIP_QUESTIONNAIRE_INTRO_LINES.map((line) => (
            <Text key={line} style={mergePaletteLayer(layers, 'wellnessBody', styles.wellnessBody)}>
              {line}
            </Text>
          ))}

          {hasProgress ? (
            <View style={mergePaletteLayer(layers, 'wellnessResumeCard', styles.wellnessResumeCard)}>
              <Text style={mergePaletteLayer(layers, 'wellnessResumeTitle', styles.wellnessResumeTitle)}>Pick up where you left off</Text>
              <Text style={mergePaletteLayer(layers, 'wellnessBody', styles.wellnessBody)}>
                {answeredCount} of {IPIP_QUESTION_COUNT} answered
              </Text>
              <TrackedTouchableOpacity onPress={resumeQuestionnaire} style={styles.wellnessPrimaryBtn} trackId="personality.resume">
                <Text style={mergePaletteLayer(layers, 'wellnessPrimaryBtnText', styles.wellnessPrimaryBtnText)}>Resume</Text>
              </TrackedTouchableOpacity>
            </View>
          ) : null}

          {!hasProgress ? (
            <TrackedTouchableOpacity onPress={startQuestionnaire} style={styles.wellnessPrimaryBtn} trackId="personality.begin">
              <Text style={mergePaletteLayer(layers, 'wellnessPrimaryBtnText', styles.wellnessPrimaryBtnText)}>Begin</Text>
            </TrackedTouchableOpacity>
          ) : (
            <TrackedTouchableOpacity
              onPress={() => {
                confirmRetakeQuestionnaire(() => {
                  void restart().then(() => startQuestionnaire());
                });
              }}
              style={styles.wellnessSecondaryBtn}
              trackId="personality.startOver"
            >
              <Text style={mergePaletteLayer(layers, 'wellnessSecondaryBtnText', styles.wellnessSecondaryBtnText)}>Start over</Text>
            </TrackedTouchableOpacity>
          )}

          {isDone ? (
            <TrackedTouchableOpacity onPress={viewResults} style={styles.wellnessSecondaryBtn} trackId="personality.viewResults">
              <Text style={mergePaletteLayer(layers, 'wellnessSecondaryBtnText', styles.wellnessSecondaryBtnText)}>View your results</Text>
            </TrackedTouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  if (phase === 'results' && results?.isComplete) {
    const report = buildIpipRawReport(results);
    return (
      <View style={mergePaletteLayer(layers, 'wellnessScreen', styles.wellnessScreen)}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.wellnessResultsContent}
          showsVerticalScrollIndicator={false}
          style={styles.wellnessScroll}
        >
          <Text style={mergePaletteLayer(layers, 'wellnessTitle', styles.wellnessTitle)}>{IPIP_QUESTIONNAIRE_TITLE}</Text>

          {report.domains.map((domain) => (
            <View key={domain.code} style={mergePaletteLayer(layers, 'wellnessInsightCard', styles.wellnessInsightCard)}>
              <Text style={mergePaletteLayer(layers, 'wellnessInsightTitle', styles.wellnessInsightTitle)}>
                {domain.label} ({domain.code}): {domain.rawTotal} / {domain.rawMax}
              </Text>

              {domain.facets.map((facet) => (
                <View key={facet.key} style={styles.wellnessFacetRow}>
                  <Text style={mergePaletteLayer(layers, 'wellnessBody', styles.wellnessBody)}>
                    {facet.code} {facet.label}: {facet.rawTotal} / {facet.rawMax}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <TrackedTouchableOpacity
            onPress={() => confirmRetakeQuestionnaire(() => void restart())}
            style={styles.wellnessSecondaryBtn}
            trackId="personality.retake"
          >
            <Text style={mergePaletteLayer(layers, 'wellnessSecondaryBtnText', styles.wellnessSecondaryBtnText)}>Retake questionnaire</Text>
          </TrackedTouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <View style={mergePaletteLayer(layers, 'wellnessScreen', styles.wellnessScreen)}>
      <View style={styles.wellnessQuestionHeader}>
        <View style={styles.wellnessProgressTrack}>
          <View style={[styles.wellnessProgressFill, { width: `${Math.round(progressPct * 100)}%` }]} />
        </View>
        <View style={styles.wellnessQuestionMetaRow}>
          {currentIndex > 0 ? (
            <TrackedPressable accessibilityRole="button" hitSlop={8} onPress={goBack} style={styles.wellnessBackBtn} trackId="personality.back">
              <Ionicons color={theme?.textSecondary ?? '#94a3b8'} name="chevron-back" size={20} />
              <Text style={mergePaletteLayer(layers, 'wellnessHint', styles.wellnessHint)}>Back</Text>
            </TrackedPressable>
          ) : (
            <View />
          )}
          <Text style={mergePaletteLayer(layers, 'wellnessHint', styles.wellnessHint)}>
            {currentIndex + 1} / {IPIP_QUESTION_COUNT}
          </Text>
        </View>
      </View>

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.wellnessQuestionContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.wellnessScroll}
      >
        <Text style={mergePaletteLayer(layers, 'wellnessQuestionText', styles.wellnessQuestionText)}>{currentQuestion?.text}</Text>

        <View style={styles.wellnessAnswerList}>
          {IPIP_ANSWER_SCALE.map((option) => {
            const selected = currentAnswer === option.value;
            return (
              <TrackedTouchableOpacity
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                activeOpacity={0.85}
                onPress={() => void answerCurrent(option.value)}
                style={[
                  mergePaletteLayer(layers, 'wellnessAnswerBtn', styles.wellnessAnswerBtn),
                  selected && mergePaletteLayer(layers, 'wellnessAnswerBtnSelected', styles.wellnessAnswerBtnSelected),
                ]}
                trackId={`personality.answer.${option.value}`}
              >
                <Text
                  style={[
                    mergePaletteLayer(layers, 'wellnessAnswerBtnText', styles.wellnessAnswerBtnText),
                    selected && mergePaletteLayer(layers, 'wellnessAnswerBtnTextSelected', styles.wellnessAnswerBtnTextSelected),
                  ]}
                >
                  {option.label}
                </Text>
              </TrackedTouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
