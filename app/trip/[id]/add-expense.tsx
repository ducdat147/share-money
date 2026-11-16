import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Platform, Modal, FlatList, Keyboard, type ScrollViewInstance,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import MemberSelector from '@/components/MemberSelector';
import UserAvatar from '@/components/UserAvatar';
import CustomHeader from '@/components/CustomHeader';
import KeyboardAvoidingView from '@/components/KeyboardAvoidingView';
import SubmitButton from '@/components/SubmitButton';
import { useDialog } from '@/components/DialogProvider';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { getCustomSharesError, getExpenseShares } from '@/utils/calculator';
import { parseAmountInput } from '@/utils/currency';

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

  // Màn sửa: chỉ dùng để điền sẵn form ở lần render đầu.
  const existingExpense = useMemo(
    () => (expenseId ? trip?.expenses.find((e) => e.id === expenseId) : undefined),
    [expenseId, trip],
  );

  const [description, setDescription] = useState(existingExpense?.description ?? '');
  const [amountText, setAmountText] = useState(existingExpense?.amount.toString() ?? '');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    existingExpense?.participants ?? trip?.members.map((m) => m.id) ?? [],
  );
  // Chuỗi đang gõ của người bị khoá; có key nghĩa là đang khoá.
  const [shareTexts, setShareTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(existingExpense?.customShares ?? {}).map(([memberId, share]) => [memberId, share.toString()]),
    ),
  );
  const [paidBy, setPaidBy] = useState<string | undefined>(
    existingExpense?.paidBy || (trip?.treasurerId ?? trip?.members[0]?.id),
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amount = useMemo(
    () => parseAmountInput(amountText, trip?.currency),
    [amountText, trip?.currency],
  );

  const customShares = useMemo(
    () => Object.fromEntries(
      Object.entries(shareTexts)
        .filter(([memberId]) => selectedMembers.includes(memberId))
        .map(([memberId, text]) => [memberId, parseAmountInput(text, trip?.currency)]),
    ),
    [shareTexts, selectedMembers, trip?.currency],
  );

  const shares = useMemo(
    () => getExpenseShares({ amount, participants: selectedMembers, customShares }),
    [amount, selectedMembers, customShares],
  );

  const sharesError = useMemo(
    () => getCustomSharesError(amount, selectedMembers, customShares),
    [amount, selectedMembers, customShares],
  );

  const hasNegativeShare = useMemo(
    () => Object.values(customShares).some((share) => share < 0),
    [customShares],
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
    // Bỏ chọn hay chọn lại đều bắt đầu từ chia đều.
    setShareTexts(({ [memberId]: _removed, ...rest }) => rest);
  }, []);

  // Ô nhập phần tiền nằm cuối form nên dễ bị bàn phím che: cuộn dòng đang nhập lên đầu vùng nhìn thấy,
  // cả ngay lúc focus lẫn sau khi bàn phím mở xong và KeyboardAvoidingView đã co lại.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const membersY = useRef(0);
  const focusedShareY = useRef<number | null>(null);

  const scrollToShare = useCallback(() => {
    if (focusedShareY.current === null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, membersY.current + focusedShareY.current - Spacing.lg), animated: true });
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      timer = setTimeout(() => {
        scrollToShare();
        focusedShareY.current = null;
      }, 50);
    });
    // Ô tiền đã mất focus khi bàn phím đóng; không để lần mở bàn phím sau (từ ô khác) cuộn về dòng cũ.
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      focusedShareY.current = null;
    });
    return () => {
      sub.remove();
      hideSub.remove();
      clearTimeout(timer);
    };
  }, [scrollToShare]);

  const handleShareFocus = useCallback((offsetY: number) => {
    focusedShareY.current = offsetY;
    scrollToShare();
  }, [scrollToShare]);

  const handleChangeShare = useCallback((memberId: string, text: string) => {
    setShareTexts(({ [memberId]: _removed, ...rest }) => (text.trim() ? { ...rest, [memberId]: text } : rest));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedMembers(trip?.members.map((m) => m.id) ?? []);
  }, [trip]);

  const handleDeselectAll = useCallback(() => {
    setSelectedMembers([]);
    setShareTexts({});
  }, []);

  const handleSubmit = useCallback(async () => {
    const desc = description.trim();
    if (!desc) { showDialog(t('common.error'), t('add_expense.err_no_description')); return; }
    if (amount <= 0) { showDialog(t('common.error'), t('add_payment.err_invalid_amount')); return; }
    if (!payerMember) { showDialog(t('common.error'), t('add_expense.err_no_payer')); return; }
    if (selectedMembers.length === 0) { showDialog(t('common.error'), t('add_expense.err_no_participants')); return; }
    if (hasNegativeShare) { showDialog(t('common.error'), t('add_payment.err_invalid_amount')); return; }
    if (sharesError) {
      showDialog(t('common.error'), t(sharesError === 'exceeds_total' ? 'add_expense.err_shares_exceed' : 'add_expense.err_shares_mismatch'));
      return;
    }
    const lockedShares = Object.keys(customShares).length > 0 ? customShares : undefined;

    setIsSubmitting(true);
    try {
      if (expenseId) {
        await updateExpense(id!, expenseId, desc, amount, selectedMembers, paidBy, lockedShares);
      } else {
        await addExpense(id!, desc, amount, selectedMembers, paidBy, lockedShares);
      }
      router.back();
    } catch {
      showDialog(t('common.error'), t('add_expense.err_fail'));
    } finally {
      setIsSubmitting(false);
    }
  }, [description, amount, payerMember, selectedMembers, hasNegativeShare, sharesError, customShares, paidBy, id, expenseId, updateExpense, addExpense, router]);

  if (!trip) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title={expenseId ? t('add_expense.update_title') : t('add_expense.title')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
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

          <View style={styles.section} onLayout={(e) => { membersY.current = e.nativeEvent.layout.y; }}>
            <MemberSelector
              members={trip.members}
              selected={selectedMembers}
              onToggle={handleToggleMember}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              treasurerId={trip.treasurerId}
              shares={shares}
              shareTexts={shareTexts}
              onChangeShare={handleChangeShare}
              onShareFocus={handleShareFocus}
              error={sharesError
                ? t(sharesError === 'exceeds_total' ? 'add_expense.err_shares_exceed' : 'add_expense.err_shares_mismatch')
                : hasNegativeShare ? t('add_payment.err_invalid_amount') : undefined}
              currencyCode={trip.currency}
            />
          </View>
        </ScrollView>

        <SubmitButton
          title={isSubmitting ? t('add_expense.submitting') : (expenseId ? t('add_expense.update_btn') : t('add_expense.submit'))}
          icon="checkmark-circle"
          onPress={handleSubmit}
          disabled={isSubmitting || !description.trim() || amount <= 0 || !payerMember || selectedMembers.length === 0 || hasNegativeShare || sharesError !== null}
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
              keyExtractor={(item) => item.id}
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
    dropdownTrigger: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surface, borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderWidth: 1, borderColor: colors.border,
    },
    dropdownSelected: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
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
