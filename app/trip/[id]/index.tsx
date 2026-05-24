import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Trip, Expense, Payment, Member } from '@/utils/types';
import ExpenseItem from '@/components/ExpenseItem';
import PaymentItem from '@/components/PaymentItem';
import UserAvatar from '@/components/UserAvatar';
import MemberDetailModal from '@/components/MemberDetailModal';
import { useDialog } from '@/components/DialogProvider';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency, getTotalExpenses, getTotalPayments, calculateSummary } from '@/utils/calculator';

type TabType = 'expenses' | 'payments' | 'members';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    trips, loadTrip, removeExpense, removePayment, completeTrip, deleteTrip, addMember, removeMember, updateTreasurer, updateTripCurrency, updateMemberName, addPayment,
  } = useTripStore();

  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [isLoading, setIsLoading] = useState(true);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);

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
      const isTreasurer = member.id === trip?.treasurerId;
      const inExpense = trip?.expenses.some((e) => e.participants.includes(member.id));
      
      const onConfirm = async () => {
        if (isTreasurer) await updateTreasurer(id!, undefined);
        await removeMember(id!, member.id);
      };

      let title = t('trip_detail.alert_remove_member_title');
      let message = t('trip_detail.alert_remove_member_desc', { name: member.name });

      if (isTreasurer) {
        title = t('trip_detail.alert_remove_treasurer_title', { defaultValue: 'Xóa thủ quỹ' });
        message = t('trip_detail.alert_remove_treasurer_desc', { name: member.name, defaultValue: '{{name}} đang là thủ quỹ. Xóa thành viên này sẽ gỡ bỏ vai trò thủ quỹ của chuyến đi. Tiếp tục?' });
      } else if (inExpense) {
        title = t('common.warning');
        message = t('trip_detail.err_member_in_expense', { name: member.name });
      }

      showDialog(title, message, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: onConfirm },
      ]);
    }, [id, trip, removeMember, updateTreasurer, showDialog, t],
  );

  const handleSetTreasurer = useCallback((member: Member) => {
    if (trip?.isCompleted || !id) return;
    
    if (trip?.treasurerId === member.id) {
      showDialog(t('trip_detail.alert_unset_treasurer_title', { defaultValue: 'Bỏ quyền thủ quỹ' }), t('trip_detail.alert_unset_treasurer_desc', { name: member.name, defaultValue: 'Bạn muốn bỏ quyền thủ quỹ của {{name}}?' }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: () => updateTreasurer(id, undefined) },
      ]);
      return;
    }

    showDialog(t('trip_detail.alert_change_treasurer_title'), t('trip_detail.alert_change_treasurer_desc', { name: member.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: () => updateTreasurer(id, member.id) },
    ]);
  }, [trip, id, updateTreasurer, showDialog, t]);

  const handleMemberPress = useCallback((member: Member) => {
    setSelectedMember(member);
    setIsMemberModalVisible(true);
  }, []);

  const handleUpdateMemberName = useCallback(async (name: string) => {
    if (selectedMember && id) {
      await updateMemberName(id, selectedMember.id, name);
    }
  }, [selectedMember, id, updateMemberName]);

  const handleToggleTreasurer = useCallback(async () => {
    if (selectedMember && id) {
      const newTreasurerId = trip?.treasurerId === selectedMember.id ? undefined : selectedMember.id;
      await updateTreasurer(id, newTreasurerId);
    }
  }, [selectedMember, id, trip?.treasurerId, updateTreasurer]);

  const handleAddFund = useCallback(async (amount: number) => {
    if (selectedMember && id) {
      await addPayment(id, selectedMember.id, amount, t('member_detail.add_fund'));
    }
  }, [selectedMember, id, addPayment, t]);

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

  const handleChangeCurrency = useCallback(() => {
    if (!trip || !id) return;
    const nextCurrency = trip.currency === 'USD' ? 'VND' : 'USD';
    showDialog(
      t('trip_detail.change_currency_title', { defaultValue: 'Đổi đơn vị tiền tệ' }),
      t('trip_detail.change_currency_desc', {
        from: trip.currency || 'VND',
        to: nextCurrency,
        defaultValue: 'Bạn có muốn chuyển đổi đơn vị tiền tệ của chuyến đi này từ {{from}} sang {{to}}? Các số tiền đã nhập sẽ được giữ nguyên và đổi cách hiển thị.'
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            await updateTripCurrency(id, nextCurrency);
          }
        },
      ]
    );
  }, [trip, id, updateTripCurrency, showDialog, t]);

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
        rightAction={
          <TouchableOpacity onPress={handleChangeCurrency} hitSlop={8} style={styles.currencyToggleBtn}>
            <Text style={styles.currencyToggleText}>
              {trip.currency || 'VND'}
            </Text>
          </TouchableOpacity>
        }
      />
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="receipt-outline" size={20} color={colors.accent} />
          <Text style={styles.statValue}>{formatCurrency(totalExpenses, trip.currency)}</Text>
          <Text style={styles.statLabel}>{t('trip_detail.total_expense')}</Text>
        </View>
        {treasurer && (
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={20} color={colors.success} />
            <Text style={styles.statValue}>{formatCurrency(totalPayments, trip.currency)}</Text>
            <Text style={styles.statLabel}>{t('trip_detail.total_payment')}</Text>
          </View>
        )}
        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={20} color={colors.primaryLight} />
          <Text style={styles.statValue}>{trip.members.length}</Text>
          <Text style={styles.statLabel}>{t('trip_detail.members_count_label')}</Text>
        </View>
      </View>

      {treasurer && (
        <View style={styles.treasurerInfo}>
          <Ionicons name="wallet" size={16} color={colors.accentLight} />
          <Text style={styles.treasurerText}>{t('summary.treasurer')}: {treasurer.name}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'expenses' && styles.tabActive]} onPress={() => setActiveTab('expenses')}>
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>{t('trip_detail.tab_expenses', { count: trip.expenses.length })}</Text>
        </TouchableOpacity>
        {treasurer && (
          <TouchableOpacity style={[styles.tab, activeTab === 'payments' && styles.tabActive]} onPress={() => setActiveTab('payments')}>
            <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>{t('trip_detail.tab_payments', { count: trip.payments.length })}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.tab, activeTab === 'members' && styles.tabActive]} onPress={() => setActiveTab('members')}>
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>{t('trip_detail.tab_members', { count: trip.members.length })}</Text>
        </TouchableOpacity>
      </View>

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
        <FlatList data={trip.members} renderItem={renderMember} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
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
            id="add-expense-button"
          >
            <Ionicons name="add-circle" size={24} color={colors.onPrimary} />
            <Text style={[styles.actionBtnText, styles.primaryBtnText, { color: colors.onPrimary }]}>
              {t('trip_detail.action_add_expense')}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.secondaryActionsRow}>
          {treasurer && !trip.isCompleted && (
            <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn, styles.paymentBtn]} onPress={() => router.push(`/trip/${id}/add-payment`)} activeOpacity={0.8} id="add-payment-button">
              <Ionicons name="cash" size={18} color={colors.onSuccess} />
              <Text style={[styles.actionBtnText, { color: colors.onSuccess }]}>{t('trip_detail.action_add_payment')}</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn, styles.summaryBtn]} onPress={() => router.push(`/trip/${id}/summary`)} activeOpacity={0.8} id="view-summary-button">
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
        onUpdateName={handleUpdateMemberName}
        onToggleTreasurer={handleToggleTreasurer}
        onAddFund={handleAddFund}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    currencyToggleBtn: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: Spacing.xs,
    },
    currencyToggleText: {
      fontSize: FontSize.xs,
      fontWeight: 'bold',
      color: colors.primary,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    statsContainer: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
      alignItems: 'center', gap: Spacing.xs, borderWidth: 1, borderColor: colors.border,
    },
    statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.onSurface },
    statLabel: { fontSize: FontSize.xs, color: colors.onSurfaceSecondary },
    treasurerInfo: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm, backgroundColor: colors.surfaceElevated,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm,
    },
    treasurerText: { fontSize: FontSize.sm, color: colors.accentLight, fontWeight: FontWeight.medium },
    tabsContainer: {
      flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
      backgroundColor: colors.surface, borderRadius: BorderRadius.md, padding: 3,
    },
    tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: colors.onSurfaceSecondary },
    tabTextActive: { color: colors.onPrimary },
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
    memberAvatar: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceElevated,
      justifyContent: 'center', alignItems: 'center',
    },
    memberAvatarTreasurer: { backgroundColor: colors.primaryDark },
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
      paddingVertical: Spacing.md,
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

