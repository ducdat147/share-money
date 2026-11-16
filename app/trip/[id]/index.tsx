import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Expense, Payment, Member } from '@/utils/types';
import ExpenseItem from '@/components/ExpenseItem';
import PaymentItem from '@/components/PaymentItem';
import UserAvatar from '@/components/UserAvatar';
import MemberDetailModal from '@/components/MemberDetailModal';
import RenameTripDialog from '@/components/RenameTripDialog';
import ScalePressable from '@/components/ScalePressable';
import { useDialog } from '@/components/DialogProvider';
import {
  ActionMenu, ActionMenuItem, AppText, BottomSheet, Button, Card, FAB, ListRow, SegmentedControl,
} from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontFamily } from '@/constants/theme';
import { formatCurrency, getTotalExpenses, calculateSummary } from '@/utils/calculator';

type TabType = 'expenses' | 'payments' | 'members';

// MemberDetailModal trượt xuống 250 ms rồi mới unmount. Mở hộp thoại xác nhận trước lúc đó thì iOS
// bỏ qua nó, nên đợi Modal đóng hẳn.
const MEMBER_MODAL_CLOSE_DELAY = 300;

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    trips, loadTrip, completeTrip, deleteTrip, addMember, removeMember, updateTreasurer, updateMemberName, addPayment, updateTripName,
  } = useTripStore();

  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [isLoading, setIsLoading] = useState(true);
  const [newMemberName, setNewMemberName] = useState('');
  const [addMemberError, setAddMemberError] = useState('');
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);
  const [isRenameVisible, setIsRenameVisible] = useState(false);

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  useEffect(() => {
    (async () => { if (id) { await loadTrip(id); setIsLoading(false); } })();
  }, [id, loadTrip]);

  // Handle automatic tab switching if treasurer is removed while on payments tab
  if (activeTab === 'payments' && trip && !trip.treasurerId) {
    setActiveTab('expenses');
  }

  const treasurer = useMemo(() => trip?.members.find((m) => m.id === trip.treasurerId), [trip]);
  const totalExpenses = useMemo(() => (trip ? getTotalExpenses(trip.expenses) : 0), [trip]);
  const memberSummaries = useMemo(
    () => (trip ? calculateSummary(trip.members, trip.expenses, trip.payments, trip.treasurerId, trip.currency) : []),
    [trip],
  );
  const fundHeld = useMemo(
    () => memberSummaries.find((s) => s.memberId === trip?.treasurerId)?.fundHeld ?? 0,
    [memberSummaries, trip?.treasurerId],
  );

  const handleEditExpense = useCallback(
    (expenseId: string) => {
      router.push(`/trip/${id}/add-expense?expenseId=${expenseId}`);
    }, [id, router],
  );

  const handleEditPayment = useCallback(
    (paymentId: string) => {
      router.push(`/trip/${id}/add-payment?paymentId=${paymentId}`);
    }, [id, router],
  );

  const openAddMember = useCallback(() => {
    setNewMemberName('');
    setAddMemberError('');
    setIsAddMemberVisible(true);
  }, []);

  const closeAddMember = useCallback(() => setIsAddMemberVisible(false), []);

  const handleAddMember = useCallback(async () => {
    const name = newMemberName.trim();
    if (!name || !id) return;
    const exists = trip?.members.some((m) => m.name.toLowerCase() === name.toLowerCase());
    // Báo lỗi ngay trong bảng: hộp thoại mở chồng lên Modal của bảng dễ không hiện trên iOS.
    if (exists) { setAddMemberError(t('trip_detail.err_member_exists')); return; }
    await addMember(id, name);
    setIsAddMemberVisible(false);
  }, [newMemberName, id, trip, addMember, t]);

  const handleRemoveMember = useCallback(
    (member: Member) => {
      if (!trip || !id) return;
      const isTreasurer = member.id === trip.treasurerId;

      // Deleting a member cascades away their expense_participants rows and
      // payments, but `expenses.paid_by` has no FK and is left dangling. Either
      // way the remaining balances stop summing to zero and the settlement list
      // silently comes back empty, so a member with activity cannot be removed.
      const inExpense = trip.expenses.some(
        (e) => e.participants.includes(member.id) || e.paidBy === member.id,
      );
      const hasPayment = trip.payments.some((p) => p.memberId === member.id);
      if (inExpense || hasPayment) {
        showDialog(t('common.warning'), t('trip_detail.err_member_in_expense', { name: member.name }));
        return;
      }

      // The treasurer holds every payment in the trip, and removing them also
      // clears the role — which would leave the collected fund unattributed.
      if (isTreasurer && trip.payments.length > 0) {
        showDialog(t('common.warning'), t('trip_detail.err_treasurer_holds_fund', { name: member.name }));
        return;
      }

      const onConfirm = async () => {
        if (isTreasurer) await updateTreasurer(id, undefined);
        await removeMember(id, member.id);
      };

      showDialog(
        isTreasurer
          ? t('trip_detail.alert_remove_treasurer_title')
          : t('trip_detail.alert_remove_member_title'),
        isTreasurer
          ? t('trip_detail.alert_remove_treasurer_desc', { name: member.name })
          : t('trip_detail.alert_remove_member_desc', { name: member.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: onConfirm },
        ],
      );
    }, [id, trip, removeMember, updateTreasurer, showDialog, t],
  );

  const handleRemoveSelected = useCallback(() => {
    if (!selectedMember) return;
    const member = selectedMember;
    setIsMemberModalVisible(false);
    setTimeout(() => handleRemoveMember(member), MEMBER_MODAL_CLOSE_DELAY);
  }, [selectedMember, handleRemoveMember]);

  const handleMemberPress = useCallback((member: Member) => {
    setSelectedMember(member);
    setIsMemberModalVisible(true);
  }, []);

  const handleUpdateMemberName = useCallback(async (name: string) => {
    if (selectedMember && id) {
      await updateMemberName(id, selectedMember.id, name);
    }
  }, [selectedMember, id, updateMemberName]);

  // Tiền đã đóng được ghi là thủ quỹ hiện tại đang giữ. Đổi hoặc bỏ thủ quỹ lúc này làm lệch sổ,
  // nên chỉ cho phép khi danh sách đóng quỹ trống.
  const treasurerLocked = !!trip?.treasurerId && (trip?.payments.length ?? 0) > 0;

  const handleToggleTreasurer = useCallback(async () => {
    if (selectedMember && id && !treasurerLocked) {
      const newTreasurerId = trip?.treasurerId === selectedMember.id ? undefined : selectedMember.id;
      await updateTreasurer(id, newTreasurerId);
    }
  }, [selectedMember, id, trip?.treasurerId, treasurerLocked, updateTreasurer]);

  const handleAddFund = useCallback(async (amount: number) => {
    if (selectedMember && id) {
      await addPayment(id, selectedMember.id, amount, t('member_detail.add_fund'));
    }
  }, [selectedMember, id, addPayment, t]);

  const handleRename = useCallback(async (name: string) => {
    if (!id) return;
    try {
      await updateTripName(id, name);
      setIsRenameVisible(false);
    } catch {
      // Đóng hộp đổi tên trước: mở hộp thoại chồng lên một Modal khác dễ không hiện trên iOS.
      setIsRenameVisible(false);
      showDialog(t('common.error'), t('trip_detail.err_rename'));
    }
  }, [id, updateTripName, showDialog, t]);

  const handleCompleteTrip = useCallback(() => {
    if (!trip) return;
    showDialog(t('trip_detail.alert_complete_title'), t('trip_detail.alert_complete_desc'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('trip_detail.action_complete'), onPress: () => completeTrip(trip.id) },
    ]);
  }, [trip, completeTrip, showDialog, t]);

  const handleDeleteTrip = useCallback(() => {
    if (!trip) return;
    showDialog(t('trip_detail.alert_delete_title'), t('trip_detail.alert_delete_desc', { name: trip.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await deleteTrip(trip.id); router.back(); } },
    ]);
  }, [trip, deleteTrip, router, showDialog, t]);

  // Chuyến đã xong chỉ còn Xoá; không có "Mở lại".
  const menuItems = useMemo<ActionMenuItem[]>(
    () => (trip?.isCompleted
      ? [{ label: t('trip_detail.action_delete'), icon: 'trash-outline', destructive: true, onPress: handleDeleteTrip }]
      : [
        { label: t('trip_detail.rename_title'), icon: 'pencil-outline', onPress: () => setIsRenameVisible(true) },
        { label: t('trip_detail.action_complete'), icon: 'checkmark-done-outline', onPress: handleCompleteTrip },
      ]),
    [trip?.isCompleted, handleDeleteTrip, handleCompleteTrip, t],
  );

  const tabItems = useMemo(
    () => [
      { value: 'expenses' as const, label: t('trip_detail.tab_expenses') },
      ...(treasurer ? [{ value: 'payments' as const, label: t('trip_detail.tab_payments') }] : []),
      { value: 'members' as const, label: t('trip_detail.tab_members') },
    ],
    [treasurer, t],
  );

  const fab = useMemo(() => {
    if (activeTab === 'expenses') {
      return { label: t('trip_detail.fab_expense'), onPress: () => router.push(`/trip/${id}/add-expense`) };
    }
    if (activeTab === 'payments') {
      return { label: t('trip_detail.fab_payment'), onPress: () => router.push(`/trip/${id}/add-payment`) };
    }
    return { label: t('trip_detail.fab_member'), onPress: openAddMember };
  }, [activeTab, id, router, openAddMember, t]);

  const renderExpense = useCallback(
    ({ item }: { item: Expense }) => (
      <View style={styles.rowCard}>
        <ExpenseItem
          expense={item}
          members={trip?.members ?? []}
          treasurerId={trip?.treasurerId}
          onEdit={trip?.isCompleted ? undefined : () => handleEditExpense(item.id)}
          currencyCode={trip?.currency}
        />
      </View>
    ), [trip, handleEditExpense, styles],
  );

  const renderPayment = useCallback(
    ({ item }: { item: Payment }) => (
      <View style={styles.rowCard}>
        <PaymentItem
          payment={item}
          members={trip?.members ?? []}
          onEdit={trip?.isCompleted ? undefined : () => handleEditPayment(item.id)}
          currencyCode={trip?.currency}
        />
      </View>
    ), [trip, handleEditPayment, styles],
  );

  const renderMember = useCallback(
    ({ item }: { item: Member }) => {
      const isTreasurer = item.id === trip?.treasurerId;
      const summary = memberSummaries.find((s) => s.memberId === item.id);
      const totalShare = summary?.totalShare ?? 0;
      const totalPaid = summary?.totalPaid ?? 0;
      const progress = totalShare > 0 ? Math.min(totalPaid / totalShare, 1) : (totalPaid > 0 ? 1 : 0);
      const isPaidFull = totalShare > 0 && totalPaid >= totalShare;
      const hasPaid = totalPaid > 0;
      const canAddFund = !trip?.isCompleted && !isTreasurer && !!trip?.treasurerId;

      return (
        <View style={styles.rowCard}>
          <ListRow
            left={<UserAvatar name={item.name} isTreasurer={isTreasurer} size={36} />}
            title={item.name}
            subtitle={isTreasurer ? t('summary.treasurer') : undefined}
            onPress={trip?.isCompleted ? undefined : () => handleMemberPress(item)}
          />

          {/* Payment progress - hide for treasurer */}
          {!isTreasurer && (
            <View style={styles.memberFooter}>
              <View style={styles.paymentAmounts}>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t('trip_detail.need_pay')}{' '}
                  <AppText variant="caption" weight="semibold" numeric>
                    {formatCurrency(totalShare, trip?.currency)}
                  </AppText>
                </AppText>
                <AppText variant="caption" color={isPaidFull ? colors.success : colors.textSecondary}>
                  {t('trip_detail.paid')}{' '}
                  <AppText variant="caption" weight="semibold" numeric color={isPaidFull ? colors.success : undefined}>
                    {formatCurrency(totalPaid, trip?.currency)}
                  </AppText>
                </AppText>
              </View>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.round(progress * 100)}%` },
                      isPaidFull && styles.progressBarFull,
                      !hasPaid && styles.progressBarEmpty,
                    ]}
                  />
                </View>
                {canAddFund && (
                  <ScalePressable
                    style={styles.addPaymentBtn}
                    onPress={() => router.push(`/trip/${id}/add-payment?memberId=${item.id}`)}
                    hitSlop={4}
                    accessibilityRole="button"
                  >
                    <Ionicons name="add" size={14} color={colors.onSuccess} />
                    <AppText variant="caption" weight="semibold" color={colors.onSuccess}>
                      {t('trip_detail.member_fund_btn')}
                    </AppText>
                  </ScalePressable>
                )}
              </View>
            </View>
          )}
        </View>
      );
    }, [trip, id, memberSummaries, handleMemberPress, router, styles, colors, t],
  );

  if (isLoading || !trip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomHeader
        title={trip.name}
        rightAction={
          <View style={styles.headerRight}>
            <View style={styles.currencyBadge}>
              <AppText variant="caption" weight="bold" color={colors.primary}>
                {trip.currency || 'VND'}
              </AppText>
            </View>
            <ActionMenu items={menuItems} />
          </View>
        }
      />

      <View style={styles.top}>
        <Card style={styles.totalCard}>
          <AppText variant="label" color={colors.textSecondary}>
            {t('trip_detail.total_with_members', { count: trip.members.length })}
          </AppText>
          <AppText variant="hero" weight="bold" numeric numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(totalExpenses, trip.currency)}
          </AppText>
          {treasurer && (
            <AppText variant="label" color={colors.textSecondary} numeric>
              {t('trip_detail.fund_left', { amount: formatCurrency(fundHeld, trip.currency), name: treasurer.name })}
            </AppText>
          )}
          <View style={styles.totalAction}>
            <Button
              variant="ghost"
              title={t('trip_detail.see_settlement')}
              onPress={() => router.push(`/trip/${id}/summary`)}
            />
          </View>
        </Card>

        <SegmentedControl items={tabItems} value={activeTab} onChange={setActiveTab} />
      </View>

      {/* List */}
      {activeTab === 'expenses' ? (
        <FlatList data={trip.expenses} renderItem={renderExpense} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyTab}><AppText color={colors.textMuted}>{t('trip_detail.empty_expenses')}</AppText></View>}
        />
      ) : activeTab === 'payments' ? (
        <FlatList data={trip.payments} renderItem={renderPayment} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyTab}><AppText color={colors.textMuted}>{t('trip_detail.empty_payments')}</AppText></View>}
        />
      ) : (
        <FlatList data={trip.members} renderItem={renderMember} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
      )}

      {!trip.isCompleted && <FAB label={fab.label} onPress={fab.onPress} />}

      <BottomSheet visible={isAddMemberVisible} onRequestClose={closeAddMember}>
        <View style={styles.sheetContent}>
          <AppText variant="title" weight="bold">{t('trip_detail.add_member_title')}</AppText>
          <TextInput
            style={styles.input}
            value={newMemberName}
            onChangeText={(text) => { setNewMemberName(text); setAddMemberError(''); }}
            placeholder={t('trip_detail.add_member_placeholder')}
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleAddMember}
            returnKeyType="done"
            autoFocus
          />
          {addMemberError ? (
            <AppText variant="label" color={colors.danger}>{addMemberError}</AppText>
          ) : null}
          <Button
            title={t('trip_detail.add_member_submit')}
            onPress={handleAddMember}
            disabled={!newMemberName.trim()}
          />
        </View>
      </BottomSheet>

      <MemberDetailModal
        visible={isMemberModalVisible}
        onClose={() => setIsMemberModalVisible(false)}
        member={selectedMember}
        isTreasurer={selectedMember?.id === trip.treasurerId}
        hasTreasurer={!!trip.treasurerId}
        treasurerLocked={treasurerLocked}
        currencyCode={trip.currency}
        onUpdateName={handleUpdateMemberName}
        onToggleTreasurer={handleToggleTreasurer}
        onAddFund={handleAddFund}
        onRemove={trip.isCompleted ? undefined : handleRemoveSelected}
      />

      <RenameTripDialog
        visible={isRenameVisible}
        initialName={trip.name}
        onCancel={() => setIsRenameVisible(false)}
        onSave={handleRename}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    currencyBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    top: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.md },
    totalCard: { gap: Spacing.xs },
    totalAction: { marginTop: Spacing.xs },
    // Chừa chỗ cho FAB để dòng cuối không bị che.
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl * 3, flexGrow: 1 },
    emptyTab: { paddingTop: Spacing.xxxl * 2, alignItems: 'center' },
    rowCard: {
      backgroundColor: colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border,
      marginBottom: Spacing.sm, overflow: 'hidden',
    },
    // Payment summary per member
    memberFooter: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.xs },
    paymentAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    progressBarBg: {
      flex: 1, height: Spacing.sm, backgroundColor: colors.border, borderRadius: BorderRadius.sm, overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%', backgroundColor: colors.primary, borderRadius: BorderRadius.sm,
    },
    progressBarFull: { backgroundColor: colors.success },
    progressBarEmpty: { backgroundColor: 'transparent' },
    // Quick add payment button
    addPaymentBtn: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
      backgroundColor: colors.success, borderRadius: BorderRadius.sm,
      paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    },
    // Add member sheet
    sheetContent: { gap: Spacing.md },
    input: {
      backgroundColor: colors.background,
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
