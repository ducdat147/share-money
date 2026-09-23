import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput,
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
import { useDialog } from '@/components/DialogProvider';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency, getTotalExpenses, getTotalPayments, calculateSummary } from '@/utils/calculator';

type TabType = 'expenses' | 'payments' | 'members';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    trips, loadTrip, removeExpense, removePayment, completeTrip, deleteTrip, addMember, removeMember, updateTreasurer, updateMemberName, addPayment, updateTripName,
  } = useTripStore();

  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [isLoading, setIsLoading] = useState(true);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);
  const [isRenameVisible, setIsRenameVisible] = useState(false);

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  useEffect(() => {
    (async () => { if (id) { await loadTrip(id); setIsLoading(false); } })();
  }, [id, loadTrip]);

  // Handle automatic tab switching if treasurer is removed while on payments tab
  useEffect(() => {
    if (activeTab === 'payments' && trip && !trip.treasurerId) {
      setActiveTab('expenses');
    }
  }, [trip?.treasurerId, activeTab]);

  const treasurer = useMemo(() => trip?.members.find((m) => m.id === trip.treasurerId), [trip]);
  const totalExpenses = useMemo(() => (trip ? getTotalExpenses(trip.expenses) : 0), [trip]);
  const totalPayments = useMemo(() => (trip ? getTotalPayments(trip.payments) : 0), [trip]);
  const memberSummaries = useMemo(
    () => (trip ? calculateSummary(trip.members, trip.expenses, trip.payments, trip.treasurerId, trip.currency) : []),
    [trip],
  );

  const handleDeleteExpense = useCallback(
    (expenseId: string) => {
      showDialog(t('trip_detail.alert_delete_expense_title'), t('trip_detail.alert_delete_expense_desc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removeExpense(id!, expenseId) },
      ]);
    }, [id, removeExpense, showDialog, t],
  );

  const handleDeletePayment = useCallback(
    (paymentId: string) => {
      showDialog(t('trip_detail.alert_delete_payment_title'), t('trip_detail.alert_delete_payment_desc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removePayment(id!, paymentId) },
      ]);
    }, [id, removePayment, showDialog, t],
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

  const handleAddMember = useCallback(async () => {
    const name = newMemberName.trim();
    if (!name || !id) return;
    const exists = trip?.members.some((m) => m.name.toLowerCase() === name.toLowerCase());
    if (exists) { showDialog(t('common.error'), t('trip_detail.err_member_exists')); return; }
    await addMember(id, name);
    setNewMemberName('');
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

  const renderExpense = useCallback(
    ({ item }: { item: Expense }) => (
      <ExpenseItem
        expense={item}
        members={trip?.members ?? []}
        onDelete={trip?.isCompleted ? undefined : () => handleDeleteExpense(item.id)}
        onEdit={trip?.isCompleted ? undefined : () => handleEditExpense(item.id)}
        currencyCode={trip?.currency}
      />
    ), [trip, handleDeleteExpense, handleEditExpense],
  );

  const renderPayment = useCallback(
    ({ item }: { item: Payment }) => (
      <PaymentItem
        payment={item}
        members={trip?.members ?? []}
        onDelete={trip?.isCompleted ? undefined : () => handleDeletePayment(item.id)}
        onEdit={trip?.isCompleted ? undefined : () => handleEditPayment(item.id)}
        currencyCode={trip?.currency}
      />
    ), [trip, handleDeletePayment, handleEditPayment],
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

      return (
        <TouchableOpacity
          style={styles.memberRow}
          onPress={() => handleMemberPress(item)}
          disabled={trip?.isCompleted}
          activeOpacity={0.7}
        >
          {/* Header row */}
          <View style={styles.memberHeader}>
            <View style={styles.memberLeft}>
              <UserAvatar 
                name={item.name} 
                isTreasurer={isTreasurer} 
                size={36} 
              />
              <View>
                <Text style={styles.memberName}>{item.name}</Text>
                {isTreasurer && <Text style={styles.memberBadge}>{t('summary.treasurer')}</Text>}
              </View>
            </View>
            <View style={styles.memberActions}>
              {!trip?.isCompleted && !isTreasurer && trip?.treasurerId && (
                <TouchableOpacity
                  style={styles.addPaymentBtn}
                  onPress={() => router.push(`/trip/${id}/add-payment?memberId=${item.id}`)}
                  hitSlop={4}
                >
                  <Ionicons name="add" size={14} color={colors.onSuccess} />
                  <Text style={styles.addPaymentBtnText}>{t('trip_detail.member_fund_btn')}</Text>
                </TouchableOpacity>
              )}
              {!trip?.isCompleted && (

                <TouchableOpacity onPress={() => handleRemoveMember(item)} hitSlop={8}>
                  <Ionicons name="close-circle-outline" size={22} color={isTreasurer ? colors.textMuted : colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Payment progress - hide for treasurer */}
          {!isTreasurer && (
            <View style={styles.paymentSummary}>
              <View style={styles.paymentAmounts}>
                <Text style={styles.paymentLabel}>
                  {t('trip_detail.need_pay')} <Text style={styles.paymentValue}>{formatCurrency(totalShare, trip?.currency)}</Text>
                </Text>
                <Text style={[styles.paymentLabel, isPaidFull && styles.paymentPaidFull]}>
                  {t('trip_detail.paid')} <Text style={[styles.paymentValue, isPaidFull && styles.paymentPaidFull]}>{formatCurrency(totalPaid, trip?.currency)}</Text>
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.round(progress * 100)}%` as any },
                    isPaidFull && styles.progressBarFull,
                    !hasPaid && styles.progressBarEmpty,
                  ]}
                />
              </View>
            </View>
          )}
        </TouchableOpacity>
      );
    }, [trip, id, memberSummaries, handleRemoveMember, handleMemberPress, router, styles, colors],
  );

  if (isLoading || !trip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader
        title={trip.name}
        // Chuyến đã kết thúc thì khoá đổi tên, như các thao tác sửa khác.
        onTitlePress={trip.isCompleted ? undefined : () => setIsRenameVisible(true)}
        rightAction={
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>
              {trip.currency || 'VND'}
            </Text>
          </View>
        }
      />
      {/* Stats Header: mỗi thẻ là một tab, bấm thẻ nào thì danh sách bên dưới hiện nội dung của thẻ đó */}
      <View style={styles.statsContainer} accessibilityRole="tablist">
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => setActiveTab('expenses')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'expenses' }}
        >
          <Ionicons name="receipt-outline" size={20} color={colors.accent} />
          <Text style={styles.statValue}>{formatCurrency(totalExpenses, trip.currency)}</Text>
          <Text style={styles.statLabel}>{t('trip_detail.total_expense')}</Text>
          <Text style={styles.statCount}>{t('trip_detail.expense_items', { count: trip.expenses.length })}</Text>
          {activeTab === 'expenses' && <View style={styles.statIndicator} />}
        </TouchableOpacity>
        {treasurer && (
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => setActiveTab('payments')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'payments' }}
          >
            <Ionicons name="cash-outline" size={20} color={colors.success} />
            <Text style={styles.statValue}>{formatCurrency(totalPayments, trip.currency)}</Text>
            <Text style={styles.statLabel}>{t('trip_detail.total_payment')}</Text>
            <Text style={styles.statCount}>{t('trip_detail.payment_items', { count: trip.payments.length })}</Text>
            {activeTab === 'payments' && <View style={styles.statIndicator} />}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => setActiveTab('members')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'members' }}
        >
          <Ionicons name="people-outline" size={20} color={colors.primaryLight} />
          <Text style={styles.statValue}>{trip.members.length}</Text>
          <Text style={styles.statLabel}>{t('trip_detail.members_count_label')}</Text>
          {activeTab === 'members' && <View style={styles.statIndicator} />}
        </TouchableOpacity>
      </View>

      {treasurer && (
        <View style={styles.treasurerInfo}>
          <Ionicons name="wallet" size={16} color={colors.accentLight} />
          <Text style={styles.treasurerText}>{t('summary.treasurer')}: {treasurer.name}</Text>
        </View>
      )}

      {/* List */}
      {activeTab === 'expenses' ? (
        <FlatList data={trip.expenses} renderItem={renderExpense} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyTab}><Text style={styles.emptyTabText}>{t('trip_detail.empty_expenses')}</Text></View>}
        />
      ) : activeTab === 'payments' ? (
        <FlatList data={trip.payments} renderItem={renderPayment} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyTab}><Text style={styles.emptyTabText}>{t('trip_detail.empty_payments')}</Text></View>}
        />
      ) : (
        <FlatList data={trip.members} renderItem={renderMember} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            !trip.isCompleted ? (
              <View style={styles.addMemberRow}>
                <TextInput style={styles.addMemberInput} value={newMemberName} onChangeText={setNewMemberName}
                  placeholder={t('trip_detail.add_member_placeholder')} placeholderTextColor={colors.textMuted} onSubmitEditing={handleAddMember} returnKeyType="done" />
                <TouchableOpacity onPress={handleAddMember} disabled={!newMemberName.trim()}>
                  <Ionicons name="add-circle" size={36} color={newMemberName.trim() ? colors.primary : colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {!trip.isCompleted && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.expenseBtn, styles.primaryBtn]} 
            onPress={() => router.push(`/trip/${id}/add-expense`)} 
            activeOpacity={0.8} 
          >
            <Ionicons name="add-circle" size={24} color={colors.onPrimary} />
            <Text style={[styles.actionBtnText, styles.primaryBtnText, { color: colors.onPrimary }]}>
              {t('trip_detail.action_add_expense')}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.secondaryActionsRow}>
          {treasurer && !trip.isCompleted && (
            <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn, styles.paymentBtn]} onPress={() => router.push(`/trip/${id}/add-payment`)} activeOpacity={0.8}>
              <Ionicons name="cash" size={18} color={colors.onSuccess} />
              <Text style={[styles.actionBtnText, { color: colors.onSuccess }]}>{t('trip_detail.action_add_payment')}</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn, styles.summaryBtn]} onPress={() => router.push(`/trip/${id}/summary`)} activeOpacity={0.8}>
            <Ionicons name="bar-chart" size={18} color={colors.onSurfaceElevated} />
            <Text style={[styles.actionBtnText, { color: colors.onSurfaceElevated }]}>{t('trip_detail.action_summary')}</Text>
          </TouchableOpacity>

          {!trip.isCompleted ? (
            <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn, styles.completeBtn]} onPress={handleCompleteTrip} activeOpacity={0.8}>
              <Ionicons name="checkmark-done" size={18} color={colors.onDanger} />
              <Text style={[styles.actionBtnText, { color: colors.onDanger }]}>{t('trip_detail.action_complete')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn, styles.deleteBtnStyle]} onPress={handleDeleteTrip} activeOpacity={0.8}>
              <Ionicons name="trash" size={18} color={colors.onDanger} />
              <Text style={[styles.actionBtnText, { color: colors.onDanger }]}>{t('trip_detail.action_delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
    currencyBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: Spacing.xs,
    },
    currencyBadgeText: {
      fontSize: FontSize.xs,
      fontWeight: 'bold',
      color: colors.primary,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    statsContainer: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
      alignItems: 'center', gap: Spacing.xs, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.onSurface },
    statLabel: { fontSize: FontSize.xs, color: colors.onSurfaceSecondary },
    statCount: { fontSize: FontSize.xs, color: colors.onSurfaceMuted },
    // Vạch dưới thẻ đang chọn; overflow của statCard cắt nó theo góc bo.
    statIndicator: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: colors.primary },
    treasurerInfo: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm, backgroundColor: colors.surfaceElevated,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm,
    },
    treasurerText: { fontSize: FontSize.sm, color: colors.accentLight, fontWeight: FontWeight.medium },
    listContent: { paddingHorizontal: Spacing.lg, flexGrow: 1 },
    emptyTab: { paddingTop: 60, alignItems: 'center' },
    emptyTabText: { fontSize: FontSize.md, color: colors.onSurfaceMuted },
    addMemberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    addMemberInput: {
      flex: 1, backgroundColor: colors.surface, borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md,
      color: colors.onSurface, borderWidth: 1, borderColor: colors.border,
    },
    // Member card
    memberRow: {
      backgroundColor: colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
      marginBottom: Spacing.sm, borderWidth: 1, borderColor: colors.border, gap: Spacing.sm,
    },
    memberHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    memberLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    memberActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    memberName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.onSurface },
    memberBadge: { fontSize: FontSize.xs, color: colors.accentLight, fontWeight: FontWeight.bold, marginTop: 2 },
    // Quick add payment button
    addPaymentBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: colors.success, borderRadius: BorderRadius.sm,
      paddingHorizontal: Spacing.sm, paddingVertical: 4,
    },
    addPaymentBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: colors.onSuccess },
    // Payment summary per member
    paymentSummary: { gap: Spacing.xs },
    paymentAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
    paymentLabel: { fontSize: FontSize.xs, color: colors.onSurfaceSecondary },
    paymentValue: { fontWeight: FontWeight.semibold, color: colors.onSurface },
    paymentPaidFull: { color: colors.success },
    progressBarBg: {
      height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%', backgroundColor: colors.primary, borderRadius: 3,
    },
    progressBarFull: { backgroundColor: colors.success },
    progressBarEmpty: { backgroundColor: 'transparent' },
    // Bottom actions
    bottomActions: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    secondaryActionsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
    },
    secondaryBtn: {
      flex: 1,
    },
    primaryBtn: {
      width: '100%',
      paddingVertical: Spacing.md,
      marginBottom: Spacing.xs,
    },
    actionBtnText: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
    },
    primaryBtnText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
    },
    expenseBtn: { backgroundColor: colors.primary },
    paymentBtn: { backgroundColor: colors.success },
    summaryBtn: { backgroundColor: colors.surfaceElevated },
    completeBtn: { backgroundColor: colors.danger },
    deleteBtnStyle: { backgroundColor: colors.danger },
  });

