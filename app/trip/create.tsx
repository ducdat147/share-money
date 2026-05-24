import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import CustomHeader from '@/components/CustomHeader';
import SubmitButton from '@/components/SubmitButton';
import { useDialog } from '@/components/DialogProvider';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export default function CreateTripScreen() {
  const router = useRouter();
  const { createTrip } = useTripStore();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tripName, setTripName] = useState('');
  const [memberCount, setMemberCount] = useState('2');
  const [currency, setCurrency] = useState<'VND' | 'USD'>('VND');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const name = tripName.trim();
    const count = parseInt(memberCount, 10);

    if (!name) {
      showDialog(t('common.error'), t('create_trip.err_empty_name'));
      return;
    }
    if (isNaN(count) || count < 2) {
      showDialog(t('common.error'), t('create_trip.err_min_members'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate names like "User 1", "User 2", ...
      const members = Array.from({ length: count }, (_, i) => `User ${i + 1}`);
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
  }, [tripName, memberCount, currency, createTrip, router, showDialog, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title={t('create_trip.title')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Trip Name */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('create_trip.trip_name_label')}</Text>
            <TextInput
              style={styles.input}
              value={tripName}
              onChangeText={setTripName}
              placeholder={t('create_trip.trip_name_placeholder')}
              placeholderTextColor={colors.textMuted}
              autoFocus
              id="trip-name-input"
            />
          </View>

          {/* Currency Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('create_trip.currency_label')}</Text>
            <View style={styles.currencySelector}>
              {(['VND', 'USD'] as const).map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyOption,
                    currency === curr && styles.currencyOptionActive,
                  ]}
                  onPress={() => setCurrency(curr)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.currencyText,
                      currency === curr && styles.currencyTextActive,
                    ]}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Member Count */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('create_trip.members_label')}</Text>
            <TextInput
              style={styles.input}
              value={memberCount}
              onChangeText={(text) => setMemberCount(text.replace(/[^0-9]/g, ''))}
              placeholder={t('create_trip.member_count_placeholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              id="member-count-input"
            />
          </View>
        </ScrollView>

        <SubmitButton
          title={isSubmitting ? t('create_trip.submitting') : t('create_trip.submit')}
          icon="checkmark-circle"
          onPress={handleSubmit}
          disabled={isSubmitting || !tripName.trim() || parseInt(memberCount, 10) < 2}
        />
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
    label: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.sm,
    },
    currencySelector: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencyOption: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.sm,
    },
    currencyOptionActive: {
      backgroundColor: colors.primary,
    },
    currencyText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.textSecondary,
    },
    currencyTextActive: {
      color: colors.onPrimary,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: FontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
