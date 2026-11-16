import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, StyleSheet, TextInput, ScrollView, Pressable, FlatList, Keyboard, type ScrollViewInstance,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import MemberSelector from '@/components/MemberSelector';
import { AppText, BottomSheet, Button, NumPad } from '@/components/ui';
import { useDialog } from '@/components/DialogProvider';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontFamily } from '@/constants/theme';
import { getCustomSharesError, getExpenseShares } from '@/utils/calculator';
import { DEFAULT_CURRENCY, formatCurrency, parseAmountInput } from '@/utils/currency';
import { autoExpenseDescription, getDefaultPayerId } from '@/utils/defaults';
import { Member } from '@/utils/types';

export default function AddExpenseScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
  const router = useRouter();
  const { trips, addExpense, updateExpense, removeExpense } = useTripStore();
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
  // Giữ giá trị ban đầu để biết người dùng đã nhập số dở hay chưa khi đóng bảng.
  const [initialAmountText] = useState(() => existingExpense?.amount.toString() ?? '');
  const [amountText, setAmountText] = useState(initialAmountText);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    existingExpense?.participants ?? trip?.members.map((m) => m.id) ?? [],
  );
  // Chuỗi đang gõ của người bị khoá; có key nghĩa là đang khoá.
  const [shareTexts, setShareTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(existingExpense?.customShares ?? {}).map(([memberId, share]) => [memberId, share.toString()]),
    ),
  );
  // Khoản cũ chưa có người chi (trước migration) là khoản chi từ quỹ, nên rơi về thủ quỹ như trước,
  // không lấy người chi gần nhất.
  const [paidBy, setPaidBy] = useState<string | undefined>(() =>
    existingExpense
      ? existingExpense.paidBy || (trip?.treasurerId ?? trip?.members[0]?.id)
      : trip && getDefaultPayerId(trip),
  );
  const [splitOpen, setSplitOpen] = useState(false);
  const [numPadOpen, setNumPadOpen] = useState(true);
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

  const sharesErrorMessage = useMemo(() => {
    if (hasNegativeShare) return t('add_payment.err_invalid_amount');
    if (sharesError === 'exceeds_total') return t('add_expense.err_shares_exceed');
    if (sharesError === 'mismatch_total') return t('add_expense.err_shares_mismatch');
    if (sharesError === 'no_remainder') return t('add_expense.err_shares_no_remainder');
    return undefined;
  }, [hasNegativeShare, sharesError, t]);

  const payerMember = useMemo(
    () => trip?.members.find((m) => m.id === paidBy) ?? null,
    [trip, paidBy]
  );

  const splitLabel = useMemo(() => {
    const n = selectedMembers.length;
    if (Object.keys(customShares).length > 0) return t('add_expense.split_custom', { n });
    if (n === trip?.members.length) return t('add_expense.split_all', { n });
    return t('add_expense.split_some', { n });
  }, [selectedMembers, customShares, trip?.members.length, t]);
  // Nhãn "Cả nhóm" đã có sẵn ▾ nên chỉ thêm mũi tên cho các nhãn còn lại hoặc khi đang mở.
  const isSplitAll = Object.keys(customShares).length === 0 && selectedMembers.length === trip?.members.length;

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
  // cả ngay lúc focus lẫn sau khi bàn phím mở xong và bảng đã né bàn phím.
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

  // Ô phần tiền dùng bàn phím hệ thống, nên thu NumPad lại cho bảng gọn.
  const handleShareFocus = useCallback((offsetY: number) => {
    setNumPadOpen(false);
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

  const handleShowNumPad = useCallback(() => {
    Keyboard.dismiss();
    setNumPadOpen(true);
  }, []);

  const handleHideNumPad = useCallback(() => setNumPadOpen(false), []);

  const handleToggleSplit = useCallback(() => {
    if (splitOpen) {
      Keyboard.dismiss();
      setSplitOpen(false);
      setNumPadOpen(true);
    } else {
      setSplitOpen(true);
      setNumPadOpen(false);
    }
  }, [splitOpen]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    if (amountText === initialAmountText) {
      router.back();
      return;
    }
    showDialog(t('common.discard_title'), t('common.discard_desc'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: () => router.back() },
    ]);
  }, [isSubmitting, amountText, initialAmountText, router, showDialog, t]);

  const handleDelete = useCallback(() => {
    if (!expenseId) return;
    showDialog(t('trip_detail.alert_delete_expense_title'), t('trip_detail.alert_delete_expense_desc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removeExpense(id!, expenseId);
          router.back();
        },
      },
    ]);
  }, [expenseId, id, removeExpense, router, showDialog, t]);

  const handleSubmit = useCallback(async () => {
    if (amount <= 0) { showDialog(t('common.error'), t('add_payment.err_invalid_amount')); return; }
    if (!payerMember) { showDialog(t('common.error'), t('add_expense.err_no_payer')); return; }
    if (selectedMembers.length === 0) { showDialog(t('common.error'), t('add_expense.err_no_participants')); return; }
    if (sharesErrorMessage) { showDialog(t('common.error'), sharesErrorMessage); return; }
    const desc = description.trim()
      || autoExpenseDescription(new Date(), (time) => t('add_expense.auto_desc', { time }));
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
  }, [description, amount, payerMember, selectedMembers, sharesErrorMessage, customShares, paidBy, id, expenseId, updateExpense, addExpense, router, showDialog, t]);

  const treasurerId = trip?.treasurerId;
  const renderPayerChip = useCallback(({ item }: { item: Member }) => {
    const selected = item.id === paidBy;
    return (
      <Pressable
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={() => setPaidBy(item.id)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        <AppText variant="label" weight="semibold" color={selected ? colors.onPrimary : colors.textSecondary}>
          {item.id === treasurerId ? t('add_expense.payer_fund', { name: item.name }) : item.name}
        </AppText>
      </Pressable>
    );
  }, [paidBy, treasurerId, styles, colors, t]);

  if (!trip) return null;
  const currency = trip.currency ?? DEFAULT_CURRENCY;

  return (
    <BottomSheet visible onRequestClose={handleClose} scrollable={false}>
      {/* Sheet không cuộn hộ: ScrollView riêng để cuộn tới ô phần tiền đang nhập, NumPad và nút ở
          ngoài nên luôn nằm sát đáy. */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.amount}
          onPress={handleShowNumPad}
          accessibilityRole="button"
          accessibilityLabel={t('add_expense.amount_label')}
        >
          <AppText
            variant="hero"
            weight="bold"
            numeric
            color={amount > 0 ? colors.text : colors.textMuted}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(amount, currency)}
          </AppText>
        </Pressable>

        <TextInput
          style={styles.descInput}
          value={description}
          onChangeText={setDescription}
          onFocus={handleHideNumPad}
          placeholder={t('add_expense.desc_optional')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
        />

        <AppText variant="label" weight="semibold" color={colors.textSecondary} style={styles.sectionLabel}>
          {t('add_expense.payer_label')}
        </AppText>
        <FlatList
          horizontal
          data={trip.members}
          keyExtractor={(item) => item.id}
          renderItem={renderPayerChip}
          extraData={paidBy}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
        />

        <Pressable
          style={styles.splitToggle}
          onPress={handleToggleSplit}
          accessibilityRole="button"
          accessibilityState={{ expanded: splitOpen }}
        >
          <AppText variant="label" weight="semibold" color={colors.textSecondary}>
            {t('add_expense.split_label')}
          </AppText>
          <View style={styles.splitValue}>
            <AppText weight="semibold" color={sharesErrorMessage ? colors.danger : colors.text}>
              {splitLabel}
            </AppText>
            {(splitOpen || !isSplitAll) && (
              <Ionicons name={splitOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text} />
            )}
          </View>
        </Pressable>

        {splitOpen && (
          <View onLayout={(e) => { membersY.current = e.nativeEvent.layout.y; }}>
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
              error={sharesErrorMessage}
              currencyCode={trip.currency}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {numPadOpen && <NumPad value={amountText} currency={currency} onChange={setAmountText} />}
        <View style={styles.actions}>
          {expenseId && (
            <View style={styles.action}>
              <Button title={t('common.delete')} variant="danger" icon="trash-outline" onPress={handleDelete} />
            </View>
          )}
          <View style={styles.action}>
            <Button
              title={t('common.save')}
              icon="checkmark"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={amount <= 0 || !payerMember || selectedMembers.length === 0 || sharesErrorMessage !== undefined}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexShrink: 1 },
    amount: { alignItems: 'center', paddingBottom: Spacing.lg },
    descInput: {
      backgroundColor: colors.background, borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      fontSize: FontSize.md, fontFamily: FontFamily.regular, color: colors.text,
      borderWidth: 1, borderColor: colors.border,
    },
    sectionLabel: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
    chips: { gap: Spacing.sm },
    chip: {
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    splitToggle: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: Spacing.lg,
    },
    splitValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    footer: { gap: Spacing.lg, paddingTop: Spacing.sm },
    actions: { flexDirection: 'row', gap: Spacing.md },
    action: { flex: 1 },
  });
