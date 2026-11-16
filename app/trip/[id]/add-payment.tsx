import React, { useState, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, TextInput, ScrollView, Pressable, FlatList, Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppText, BottomSheet, Button, NumPad } from '@/components/ui';
import { useDialog } from '@/components/DialogProvider';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontFamily } from '@/constants/theme';
import { DEFAULT_CURRENCY, formatCurrency, parseAmountInput } from '@/utils/currency';
import { Member } from '@/utils/types';

export default function AddPaymentScreen() {
  const { id, memberId: preselectedMemberId, paymentId } = useLocalSearchParams<{
    id: string;
    memberId?: string;
    paymentId?: string;
  }>();
  const router = useRouter();
  const { trips, addPayment, updatePayment, removePayment } = useTripStore();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  // Màn sửa: chỉ dùng để điền sẵn form ở lần render đầu.
  const existingPayment = useMemo(
    () => (paymentId ? trip?.payments.find((p) => p.id === paymentId) : undefined),
    [paymentId, trip],
  );

  // Giữ giá trị ban đầu để biết người dùng đã sửa dở hay chưa khi đóng bảng.
  const [initialMemberId] = useState<string | null>(
    () => existingPayment?.memberId ?? preselectedMemberId ?? null,
  );
  const [initialAmountText] = useState(() => existingPayment?.amount.toString() ?? '');
  const [initialNote] = useState(() => existingPayment?.note ?? '');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId);
  const [amountText, setAmountText] = useState(initialAmountText);
  const [note, setNote] = useState(initialNote);
  const [numPadOpen, setNumPadOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amount = useMemo(
    () => parseAmountInput(amountText, trip?.currency),
    [amountText, trip?.currency],
  );

  // Thủ quỹ giữ quỹ nên không nằm trong danh sách người đóng; chỉ giữ lại khi khoản đang sửa là của họ.
  const payers = useMemo(() => {
    if (!trip) return [];
    return trip.members.filter((m) => m.id !== trip.treasurerId || m.id === selectedMemberId);
  }, [trip, selectedMemberId]);

  const handleShowNumPad = useCallback(() => {
    Keyboard.dismiss();
    setNumPadOpen(true);
  }, []);

  // Ô ghi chú dùng bàn phím hệ thống, nên thu NumPad lại cho bảng gọn.
  const handleHideNumPad = useCallback(() => setNumPadOpen(false), []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    if (amountText === initialAmountText && note === initialNote && selectedMemberId === initialMemberId) {
      router.back();
      return;
    }
    showDialog(t('common.discard_title'), t('common.discard_desc'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: () => router.back() },
    ]);
  }, [
    isSubmitting, amountText, initialAmountText, note, initialNote, selectedMemberId, initialMemberId,
    router, showDialog, t,
  ]);

  const handleDelete = useCallback(() => {
    if (!paymentId) return;
    showDialog(t('trip_detail.alert_delete_payment_title'), t('trip_detail.alert_delete_payment_desc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removePayment(id!, paymentId);
          router.back();
        },
      },
    ]);
  }, [paymentId, id, removePayment, router, showDialog, t]);

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
    } catch {
      showDialog(t('common.error'), t('add_payment.err_fail'));
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMemberId, amount, note, id, paymentId, updatePayment, addPayment, router, showDialog, t]);

  const renderPayerChip = useCallback(({ item }: { item: Member }) => {
    const selected = item.id === selectedMemberId;
    return (
      <Pressable
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={() => setSelectedMemberId(item.id)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        <AppText variant="label" weight="semibold" color={selected ? colors.onPrimary : colors.textSecondary}>
          {item.name}
        </AppText>
      </Pressable>
    );
  }, [selectedMemberId, styles, colors]);

  if (!trip) return null;
  const currency = trip.currency ?? DEFAULT_CURRENCY;

  return (
    <BottomSheet visible onRequestClose={handleClose} scrollable={false}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.amount}
          onPress={handleShowNumPad}
          accessibilityRole="button"
          accessibilityLabel={t('add_payment.amount_label')}
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

        <AppText variant="label" weight="semibold" color={colors.textSecondary} style={styles.sectionLabel}>
          {t('add_payment.member_label')}
        </AppText>
        <FlatList
          horizontal
          data={payers}
          keyExtractor={(item) => item.id}
          renderItem={renderPayerChip}
          extraData={selectedMemberId}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
        />

        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          onFocus={handleHideNumPad}
          placeholder={t('add_payment.note_placeholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('add_payment.note_label')}
          returnKeyType="done"
        />
      </ScrollView>

      <View style={styles.footer}>
        {numPadOpen && <NumPad value={amountText} currency={currency} onChange={setAmountText} />}
        <View style={styles.actions}>
          {paymentId && (
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
              disabled={amount <= 0 || !selectedMemberId}
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
    sectionLabel: { marginBottom: Spacing.sm },
    chips: { gap: Spacing.sm },
    chip: {
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    noteInput: {
      backgroundColor: colors.background, borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, marginTop: Spacing.lg,
      fontSize: FontSize.md, fontFamily: FontFamily.regular, color: colors.text,
      borderWidth: 1, borderColor: colors.border,
    },
    footer: { gap: Spacing.lg, paddingTop: Spacing.lg },
    actions: { flexDirection: 'row', gap: Spacing.md },
    action: { flex: 1 },
  });
