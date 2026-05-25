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
import MemberSelector from '@/components/MemberSelector';
import UserAvatar from '@/components/UserAvatar';
import CustomHeader from '@/components/CustomHeader';
import SubmitButton from '@/components/SubmitButton';
import { useDialog } from '@/components/DialogProvider';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency, roundCurrency } from '@/utils/calculator';

export default function AddExpenseScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trips, addExpense, updateExpense } = useTripStore();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const { t } = useTranslation();
  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    trip?.members.map((m) => m.id) ?? [],
  );
  const [paidBy, setPaidBy] = useState<string | undefined>(
    trip?.treasurerId ?? trip?.members[0]?.id,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expenseId && trip) {
      const existingExpense = trip.expenses.find((e) => e.id === expenseId);
      if (existingExpense) {
        setDescription(existingExpense.description);
        setAmountText(existingExpense.amount.toString());
        setSelectedMembers(existingExpense.participants);
        if (existingExpense.paidBy) setPaidBy(existingExpense.paidBy);
      }
    }
  }, [expenseId, trip]);

  const amount = useMemo(() => {
    const parsed = parseFloat(amountText.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }, [amountText]);

  const perPerson = useMemo(
    () => (selectedMembers.length > 0 ? amount / selectedMembers.length : 0),
    [amount, selectedMembers.length],
  );

  const payerMember = useMemo(
    () => trip?.members.find((m) => m.id === paidBy) ?? null,
    [trip, paidBy]
  );

  const handleToggleMember = useCallback((memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedMembers(trip?.members.map((m) => m.id) ?? []);
  }, [trip]);

  const handleDeselectAll = useCallback(() => {
    setSelectedMembers([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    const desc = description.trim();
    if (!desc) { showDialog(t('common.error'), t('create_trip.err_empty_name')); return; }
    if (amount <= 0) { showDialog(t('common.error'), t('add_payment.err_invalid_amount')); return; }
    if (selectedMembers.length === 0) { showDialog(t('common.error'), t('add_expense.err_fail')); return; }

    setIsSubmitting(true);
    try {
      if (expenseId) {
        await updateExpense(id!, expenseId, desc, amount, selectedMembers, paidBy);
      } else {
        await addExpense(id!, desc, amount, selectedMembers, paidBy);
      }
      router.back();
    } catch (error) {
      showDialog(t('common.error'), t('add_expense.err_fail'));
    } finally {
      setIsSubmitting(false);
    }
  }, [description, amount, selectedMembers, paidBy, id, expenseId, updateExpense, addExpense, router]);

  if (!trip) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title={expenseId ? t('add_expense.update_title') : t('add_expense.title')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.label}>{t('add_expense.desc_label')}</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder={t('add_expense.desc_placeholder')}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('add_expense.amount_label')}</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            {amount > 0 && selectedMembers.length > 0 && (
              <View style={styles.perPersonInfo}>
                <Text style={styles.perPersonText}>
                  {t('add_expense.per_person_detail', { amount: formatCurrency(roundCurrency(perPerson, trip?.currency), trip?.currency) })}
                </Text>
                <Text style={styles.perPersonCount}>
                  ({selectedMembers.length})
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('add_expense.payer_label')}</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setDropdownOpen(true)}
              activeOpacity={0.8}
            >
              {payerMember ? (
                <View style={styles.dropdownSelected}>
                  <UserAvatar 
                    name={payerMember.name} 
                    isTreasurer={payerMember.id === trip.treasurerId} 
                    size={32} 
                  />
                  <View style={styles.dropdownSelectedText}>
                    <Text style={styles.dropdownValueText}>{payerMember.name}</Text>
                    {payerMember.id === trip.treasurerId && (
                      <Text style={styles.dropdownBadge}>{t('create_trip.treasurer')}</Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.dropdownPlaceholder}>{t('add_expense.payer_placeholder')}</Text>
              )}
              <Ionicons
                name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <MemberSelector
              members={trip.members}
              selected={selectedMembers}
              onToggle={handleToggleMember}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          </View>
        </ScrollView>

        <SubmitButton
          title={isSubmitting ? t('add_expense.submitting') : (expenseId ? t('add_expense.update_btn') : t('add_expense.submit'))}
          icon="checkmark-circle"
          onPress={handleSubmit}
          disabled={isSubmitting || amount <= 0 || selectedMembers.length === 0}
        />
      </KeyboardAvoidingView>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        >
          <View style={[styles.dropdownMenu, { paddingBottom: insets.bottom || Spacing.lg }]}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{t('add_expense.payer_placeholder')}</Text>
              <TouchableOpacity onPress={() => setDropdownOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={trip.members}
              keyExtractor={(item: { id: string }) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }: { item: { id: string; name: string } }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, paidBy === item.id && styles.dropdownItemSelected]}
                  onPress={() => {
                    setPaidBy(item.id);
                    setDropdownOpen(false);
                  }}
                >
                  <View style={styles.dropdownItemContent}>
                    <UserAvatar 
                      name={item.name} 
                      isTreasurer={item.id === trip.treasurerId} 
                      size={32} 
                    />
                    <View style={styles.dropdownSelectedText}>
                      <Text style={[styles.dropdownItemText, paidBy === item.id && styles.dropdownItemTextSelected]}>
                        {item.name}
                      </Text>
                      {item.id === trip.treasurerId && (
                        <Text style={styles.dropdownBadge}>{t('create_trip.treasurer')}</Text>
                      )}
                    </View>
                  </View>
                  {paidBy === item.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
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
    perPersonInfo: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      gap: Spacing.xs, marginTop: Spacing.sm,
    },
    perPersonText: { fontSize: FontSize.sm, color: colors.primaryLight, fontWeight: FontWeight.semibold },
    perPersonCount: { fontSize: FontSize.sm, color: colors.textMuted },
    dropdownTrigger: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surface, borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderWidth: 1, borderColor: colors.border,
    },
    dropdownSelected: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    memberAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    memberAvatarTreasurer: { backgroundColor: colors.accent },
    dropdownSelectedText: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    dropdownValueText: { fontSize: FontSize.md, color: colors.text, fontWeight: FontWeight.medium },
    dropdownBadge: { backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.bold, overflow: 'hidden' },
    dropdownPlaceholder: { fontSize: FontSize.md, color: colors.textMuted },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    dropdownMenu: { backgroundColor: colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '80%', paddingHorizontal: Spacing.lg },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
    dropdownTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.text },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    dropdownItemSelected: { borderBottomColor: colors.primary },
    dropdownItemContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    dropdownItemText: { fontSize: FontSize.md, color: colors.text },
    dropdownItemTextSelected: { fontWeight: FontWeight.bold, color: colors.primaryDark },
  });
