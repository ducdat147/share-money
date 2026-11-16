import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, TextInput, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import CustomHeader from '@/components/CustomHeader';
import KeyboardAvoidingView from '@/components/KeyboardAvoidingView';
import { AppText, Button, SegmentedControl, Stepper } from '@/components/ui';
import { useDialog } from '@/components/DialogProvider';
import { useTranslation } from 'react-i18next';
import { fillMemberNames } from '@/utils/defaults';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontFamily } from '@/constants/theme';

type Currency = 'VND' | 'USD';

const MIN_MEMBERS = 2;
const CURRENCY_ITEMS: { value: Currency; label: string }[] = [
  { value: 'VND', label: 'VND' },
  { value: 'USD', label: 'USD' },
];

export default function CreateTripScreen() {
  const router = useRouter();
  const { createTrip } = useTripStore();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tripName, setTripName] = useState('');
  const [names, setNames] = useState<string[]>(() => Array<string>(MIN_MEMBERS).fill(''));
  const [currency, setCurrency] = useState<Currency>('VND');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Chỉ đọc trong event handler (focus ô kế), không đọc lúc render.
  const memberInputs = useRef<(React.ComponentRef<typeof TextInput> | null)[]>([]);

  const handleCountChange = useCallback((count: number) => {
    setNames((prev) =>
      count > prev.length
        ? [...prev, ...Array<string>(count - prev.length).fill('')]
        : prev.slice(0, count),
    );
  }, []);

  const handleNameChange = useCallback((index: number, text: string) => {
    setNames((prev) => prev.map((name, i) => (i === index ? text : name)));
  }, []);

  const focusMember = useCallback((index: number) => {
    memberInputs.current[index]?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    const name = tripName.trim();

    if (!name) {
      showDialog(t('common.error'), t('create_trip.err_empty_name'));
      return;
    }

    setIsSubmitting(true);
    try {
      const members = fillMemberNames(names, (n) => t('create_trip.member_placeholder', { n }));
      const tripId = await createTrip(name, members, undefined, currency);

      if (tripId) {
        router.replace(`/trip/${tripId}`);
      } else {
        router.back();
      }
    } catch (error: any) {
      showDialog(t('common.error'), t('create_trip.err_create_fail', { msg: error?.message ?? error }));
    } finally {
      setIsSubmitting(false);
    }
  }, [tripName, names, currency, createTrip, router, showDialog, t]);

  const renderMember = useCallback(
    ({ item, index }: { item: string; index: number }) => {
      const isLast = index === names.length - 1;
      return (
        <View style={styles.memberRow}>
          <AppText
            variant="label"
            weight="semibold"
            color={colors.textSecondary}
            numeric
            style={styles.memberIndex}
          >
            {index + 1}
          </AppText>
          <TextInput
            ref={(el) => {
              memberInputs.current[index] = el;
            }}
            style={[styles.input, styles.memberInput]}
            value={item}
            onChangeText={(text) => handleNameChange(index, text)}
            placeholder={t('create_trip.member_placeholder', { n: index + 1 })}
            placeholderTextColor={colors.textMuted}
            returnKeyType={isLast ? 'done' : 'next'}
            submitBehavior={isLast ? 'blurAndSubmit' : 'submit'}
            onSubmitEditing={isLast ? undefined : () => focusMember(index + 1)}
          />
        </View>
      );
    },
    [names.length, styles, colors, t, handleNameChange, focusMember],
  );

  const keyExtractor = useCallback((_: string, index: number) => String(index), []);

  const header = (
    <View>
      <View style={styles.section}>
        <AppText variant="caption" weight="bold" color={colors.textSecondary} style={styles.label}>
          {t('create_trip.trip_name_label')}
        </AppText>
        <TextInput
          style={styles.input}
          value={tripName}
          onChangeText={setTripName}
          placeholder={t('create_trip.trip_name_placeholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => focusMember(0)}
          autoFocus
        />
      </View>

      <View style={styles.section}>
        <AppText variant="caption" weight="bold" color={colors.textSecondary} style={styles.label}>
          {t('create_trip.members_label')}
        </AppText>
        <Stepper value={names.length} min={MIN_MEMBERS} onChange={handleCountChange} />
      </View>
    </View>
  );

  const footer = (
    <View style={styles.currencySection}>
      <AppText variant="caption" weight="bold" color={colors.textSecondary} style={styles.label}>
        {t('create_trip.currency_label')}
      </AppText>
      <SegmentedControl items={CURRENCY_ITEMS} value={currency} onChange={setCurrency} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title={t('create_trip.title')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <FlatList
          style={styles.flex}
          contentContainerStyle={styles.content}
          data={names}
          keyExtractor={keyExtractor}
          renderItem={renderMember}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.footer}>
          <Button
            title={isSubmitting ? t('create_trip.submitting') : t('create_trip.submit')}
            icon="checkmark-circle"
            onPress={handleSubmit}
            disabled={isSubmitting || !tripName.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: Spacing.lg,
    },
    section: {
      marginBottom: Spacing.xxl,
    },
    currencySection: {
      marginTop: Spacing.lg,
    },
    label: {
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.sm,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.sm,
    },
    memberIndex: {
      width: 24,
      textAlign: 'center',
    },
    memberInput: {
      flex: 1,
    },
    footer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: FontSize.md,
      fontFamily: FontFamily.regular,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
