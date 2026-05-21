import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tripName, setTripName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [treasurerIndex, setTreasurerIndex] = useState<number | undefined>(undefined);
  const [currency, setCurrency] = useState<'VND' | 'USD'>('VND');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMember = useCallback(() => {
    const name = memberName.trim();
    if (!name) return;
    if (members.includes(name)) {
      showDialog(t('common.error'), t('create_trip.err_name_exists'));
      return;
    }
    setMembers((prev) => [...prev, name]);
    setMemberName('');
  }, [memberName, members, showDialog, t]);

  const handleRemoveMember = useCallback(
    (index: number) => {
      setMembers((prev) => prev.filter((_, i) => i !== index));
      if (treasurerIndex === index) {
        setTreasurerIndex(undefined);
      } else if (treasurerIndex !== undefined && treasurerIndex > index) {
        setTreasurerIndex(treasurerIndex - 1);
      }
    },
    [treasurerIndex],
  );

  const handleSubmit = useCallback(async () => {
    const name = tripName.trim();
    if (!name) {
      showDialog(t('common.error'), t('create_trip.err_empty_name'));
      return;
    }
    if (members.length < 2) {
      showDialog(t('common.error'), t('create_trip.err_min_members'));
      return;
    }

    setIsSubmitting(true);
    try {
      const tripId = await createTrip(name, members, treasurerIndex, currency);
      router.back();
    } catch (error: any) {
      showDialog(t('common.error'), t('create_trip.err_create_fail', { msg: error?.message ?? error }));
    } finally {
      setIsSubmitting(false);
    }
  }, [tripName, members, treasurerIndex, currency, createTrip, router, showDialog, t]);

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

          {/* Add Members */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('create_trip.members_label')}</Text>
            <View style={styles.addMemberRow}>
              <TextInput
                style={[styles.input, styles.memberInput]}
                value={memberName}
                onChangeText={setMemberName}
                placeholder={t('create_trip.add_member_placeholder')}
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={handleAddMember}
                returnKeyType="done"
                id="member-name-input"
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleAddMember}
                disabled={!memberName.trim()}
                id="add-member-button"
              >
                <Ionicons
                  name="add-circle"
                  size={40}
                  color={memberName.trim() ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Member List */}
            {members.map((name, index) => (
              <View key={`${name}-${index}`} style={styles.memberRow}>
                <TouchableOpacity
                  style={[
                    styles.treasurerBtn,
                    treasurerIndex === index && styles.treasurerBtnActive,
                  ]}
                  onPress={() =>
                    setTreasurerIndex(treasurerIndex === index ? undefined : index)
                  }
                >
                  <Ionicons
                    name={treasurerIndex === index ? 'wallet' : 'wallet-outline'}
                    size={18}
                    color={
                      treasurerIndex === index ? colors.accentLight : colors.textMuted
                    }
                  />
                </TouchableOpacity>
                <Text style={styles.memberName}>{name}</Text>
                {treasurerIndex === index && (
                  <View style={styles.treasurerLabel}>
                    <Text style={styles.treasurerLabelText}>{t('create_trip.treasurer')}</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => handleRemoveMember(index)}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {members.length > 0 && treasurerIndex === undefined && (
              <Text style={styles.hint}>
                {t('create_trip.treasurer_hint')}
              </Text>
            )}
          </View>
        </ScrollView>

        <SubmitButton
          title={isSubmitting ? t('create_trip.submitting') : t('create_trip.submit')}
          icon="checkmark-circle"
          onPress={handleSubmit}
          disabled={isSubmitting || !tripName.trim() || members.length < 2}
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
      color: colors.background,
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
    addMemberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    memberInput: {
      flex: 1,
    },
    addBtn: {
      padding: Spacing.xs,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      marginTop: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.sm,
    },
    treasurerBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    treasurerBtnActive: {
      backgroundColor: colors.primaryDark,
    },
    memberName: {
      flex: 1,
      fontSize: FontSize.md,
      color: colors.text,
      fontWeight: FontWeight.medium,
    },
    treasurerLabel: {
      backgroundColor: colors.primaryDark,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
    },
    treasurerLabelText: {
      fontSize: FontSize.xs,
      color: colors.accentLight,
      fontWeight: FontWeight.bold,
    },
    hint: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
  });
