import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import CustomHeader from '@/components/CustomHeader';
import UserAvatar from '@/components/UserAvatar';
import SubmitButton from '@/components/SubmitButton';
import { useDialog } from '@/components/DialogProvider';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency } from '@/utils/calculator';
import { Member } from '@/utils/types';

export default function AddPaymentScreen() {
  const { id, memberId: preselectedMemberId, paymentId } = useLocalSearchParams<{
    id: string;
    memberId?: string;
    paymentId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trips, addPayment, updatePayment } = useTripStore();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(preselectedMemberId ?? null);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (paymentId && trip) {
      const existingPayment = trip.payments.find((p) => p.id === paymentId);
      if (existingPayment) {
        setSelectedMemberId(existingPayment.memberId);
        setAmountText(existingPayment.amount.toString());
        setNote(existingPayment.note ?? '');
      }
    }
  }, [paymentId, trip]);

  const amount = useMemo(() => {
    const parsed = parseFloat(amountText.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }, [amountText]);

  const allMembers = useMemo(() => {
    if (!trip) return [];
    return trip.members.filter(m => m.id !== trip.treasurerId || m.id === selectedMemberId);
  }, [trip, selectedMemberId]);

  const selectedMember = useMemo(
    () => allMembers.find((m) => m.id === selectedMemberId) ?? null,
    [allMembers, selectedMemberId],
  );

  const handleSelectMember = useCallback((member: Member) => {
    setSelectedMemberId(member.id);
    setDropdownOpen(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedMemberId) { showDialog(t('common.error'), t('add_payment.err_no_member')); return; }
    if (amount <= 0) { showDialog(t('common.error'), t('add_payment.err_invalid_amount')); return; }

    setIsSubmitting(true);
    try {
      if (paymentId) {
        await updatePayment(id!, paymentId, selectedMemberId, amount, note.trim() || undefined);
      } else {
        await addPayment(id!, selectedMemberId, amount, note.trim() || undefined);
      }
      router.back();
    } catch (error) {
      showDialog(t('common.error'), t('add_payment.err_fail'));
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMemberId, amount, note, id, paymentId, updatePayment, addPayment, router]);

  if (!trip) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title={paymentId ? t('add_payment.update_title') : t('add_payment.title')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Dropdown */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('add_payment.member_label')}</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setDropdownOpen(true)}
              activeOpacity={0.8}
            >
              {selectedMember ? (
                <View style={styles.dropdownSelected}>
                  <UserAvatar 
                    name={selectedMember.name} 
                    isTreasurer={selectedMember.id === trip.treasurerId} 
                    size={34} 
                  />
                  <View style={styles.dropdownSelectedText}>
                    <Text style={styles.dropdownValueText}>{selectedMember.name}</Text>
                    {selectedMember.id === trip.treasurerId && (
                      <Text style={styles.dropdownBadge}>{t('create_trip.treasurer')}</Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.dropdownPlaceholder}>{t('add_payment.member_label')}...</Text>
              )}
              <Ionicons
                name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('add_payment.amount_label')}</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('add_payment.note_label')}</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder={t('add_payment.note_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </ScrollView>

        <SubmitButton
          title={
            isSubmitting ? t('add_payment.submitting')
              : paymentId ? t('add_payment.update_btn')
              : amount > 0 ? t('add_payment.submit', { amount: formatCurrency(amount, trip?.currency) })
                : t('add_payment.btn_receive')
          }
          icon="checkmark-circle"
          onPress={handleSubmit}
          disabled={isSubmitting || !selectedMemberId || amount <= 0}
          color="success"
        />
      </KeyboardAvoidingView>

      {/* Dropdown Modal — bottom sheet style */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('add_payment.select_member')}</Text>
            <FlatList
              data={allMembers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedMemberId;
                const isTreasurer = item.id === trip.treasurerId;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => handleSelectMember(item)}
                    activeOpacity={0.7}
                  >
                    <UserAvatar 
                      name={item.name} 
                      isTreasurer={isTreasurer} 
                      size={34} 
                    />
                    <View style={styles.modalItemText}>
                      <Text style={[styles.modalItemName, isSelected && styles.modalItemNameSelected]}>
                        {item.name}
                      </Text>
                      {isTreasurer && <Text style={styles.dropdownBadge}>{t('create_trip.treasurer')}</Text>}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: { padding: Spacing.lg },
    section: { marginBottom: Spacing.xxl },
    label: {
      fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: colors.textSecondary,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm,
    },
    input: {
      backgroundColor: colors.surface, borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      fontSize: FontSize.md, color: colors.text, borderWidth: 1, borderColor: colors.border,
    },
    amountInput: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
    // Dropdown trigger
    dropdownTrigger: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surface, borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderWidth: 1, borderColor: colors.border, minHeight: 54,
    },
    dropdownSelected: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    dropdownSelectedText: { flex: 1 },
    dropdownValueText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.text },
    dropdownPlaceholder: { fontSize: FontSize.md, color: colors.textMuted, flex: 1 },
    dropdownBadge: { fontSize: FontSize.xs, color: colors.accentLight, fontWeight: FontWeight.bold, marginTop: 2 },
    memberAvatar: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center', alignItems: 'center',
    },
    memberAvatarTreasurer: { backgroundColor: colors.primaryDark },
    // Bottom sheet modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingTop: Spacing.md, maxHeight: '70%',
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: 'center', marginBottom: Spacing.md,
    },
    modalTitle: {
      fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.text,
      paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    },
    modalItem: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalItemSelected: { backgroundColor: colors.surfaceElevated },
    modalItemText: { flex: 1 },
    modalItemName: { fontSize: FontSize.md, color: colors.text, fontWeight: FontWeight.medium },
    modalItemNameSelected: { fontWeight: FontWeight.bold, color: colors.primary },
  });
