import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import CustomHeader from '@/components/CustomHeader';
import SummaryTable from '@/components/SummaryTable';
import UserAvatar from '@/components/UserAvatar';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import {
  calculateSummary, calculateSettlements, formatCurrency, getTotalExpenses, getTotalPayments,
} from '@/utils/calculator';
import { MemberSummary, Settlement } from '@/utils/types';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trips, loadTrip } = useTripStore();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<MemberSummary | null>(null);

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  useEffect(() => {
    (async () => { if (id) { await loadTrip(id); setIsLoading(false); } })();
  }, [id, loadTrip]);

  const summaries = useMemo(() => {
    if (!trip) return [];
    return calculateSummary(trip.members, trip.expenses, trip.payments, trip.treasurerId, trip.currency);
  }, [trip]);

  const settlements = useMemo(() => calculateSettlements(summaries, trip?.currency), [summaries, trip?.currency]);

  const treasurer = useMemo(() => trip?.members.find((m) => m.id === trip.treasurerId), [trip]);
  const totalFundExpenses = useMemo(() => {
    if (!trip) return 0;
    return trip.expenses
      .filter((e) => !e.paidBy || e.paidBy === trip.treasurerId)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [trip]);
  const totalPayments = useMemo(() => (trip ? getTotalPayments(trip.payments) : 0), [trip]);
  const totalDebt = useMemo(
    () => summaries.filter((s) => s.debt > 0).reduce((sum, s) => sum + s.debt, 0), [summaries],
  );

  const handleRowPress = useCallback((summary: MemberSummary) => {
    setSelectedSummary(summary);
  }, []);

  if (isLoading || !trip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const s = selectedSummary;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title={t('summary.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {treasurer && (
          <View style={styles.treasurerBalance}>
            <View style={styles.treasurerHeader}>
              <UserAvatar 
                name={treasurer.name} 
                isTreasurer={true} 
                size={40} 
              />
              <View>
                <Text style={styles.treasurerBalanceLabel}>
                  {treasurer.name} ({t('summary.treasurer')})
                </Text>
                <Text style={styles.treasurerBalanceNote}>{t('summary.fund_status')}</Text>
              </View>
            </View>
            
            <View style={styles.fundDetails}>
              <View style={styles.fundRow}>
                <Text style={styles.fundLabel}>{t('summary.fund_collected')}</Text>
                <Text style={styles.fundValueSuccess}>{formatCurrency(totalPayments, trip.currency)}</Text>
              </View>
              <View style={styles.fundRow}>
                <Text style={styles.fundLabel}>{t('summary.fund_spent')}</Text>
                <Text style={styles.fundValueDanger}>{formatCurrency(totalFundExpenses, trip.currency)}</Text>
              </View>
              <View style={[styles.fundRow, styles.fundRowTotal]}>
                <Text style={styles.fundLabelTotal}>
                  {totalPayments >= totalFundExpenses ? t('summary.fund_surplus') : t('summary.fund_deficit')}
                </Text>
                <Text style={[styles.fundValueTotal, { color: totalPayments >= totalFundExpenses ? colors.success : colors.danger }]}>
                  {formatCurrency(Math.abs(totalPayments - totalFundExpenses), trip.currency)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.tableSection}>
          <Text style={styles.sectionTitle}>{t('summary.section_details')}</Text>
          <SummaryTable
            summaries={summaries}
            treasurerName={treasurer?.name}
            onRowPress={handleRowPress}
            currencyCode={trip.currency}
          />
        </View>

        {/* Settlement Suggestions Section */}
        <View style={styles.settlementSection}>
          <Text style={styles.sectionTitle}>{t('summary.settlement_title')}</Text>
          <View style={styles.settlementContainer}>
            <Text style={styles.settlementDesc}>{t('summary.settlement_desc')}</Text>
            {settlements.length > 0 ? (
              settlements.map((item, idx) => (
                <View key={idx} style={styles.settlementItem}>
                  <View style={styles.settlementAvatarRow}>
                    <View style={styles.settlementNameBox}>
                      <Text style={styles.settlementNameFrom}>{item.fromName}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                    <View style={styles.settlementNameBox}>
                      <Text style={styles.settlementNameTo}>{item.toName}</Text>
                    </View>
                  </View>
                  <Text style={styles.settlementAmount}>{formatCurrency(item.amount, trip.currency)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptySettlement}>{t('summary.settlement_empty')}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Detail popup Modal */}
      <Modal
        visible={!!selectedSummary}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSummary(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedSummary(null)}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHandle} />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalName}>{s?.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Text style={[
                    styles.modalDebt,
                    s && s.debt > 0 && { color: colors.danger },
                    s && s.debt < 0 && { color: colors.success },
                    s && s.debt === 0 && { color: colors.textMuted, marginTop: 0 },
                  ]}>
                    {s
                      ? s.debt > 0
                        ? t('summary.debt', { amount: formatCurrency(s.debt, trip.currency) })
                        : s.debt < 0
                          ? t('summary.refund', { amount: formatCurrency(Math.abs(s.debt), trip.currency) })
                          : treasurer?.name === s.name ? t('summary.treasurer') : t('summary.even')
                      : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedSummary(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Expense items */}
              {s && s.items.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('summary.expenses_list')}</Text>
                  {s.items.map((item: any, idx: number) => (
                    <View key={idx} style={styles.modalItemRow}>
                      <Text style={styles.modalItemDesc}>{item.description}</Text>
                      <Text style={styles.modalItemAmount}>{formatCurrency(item.share, trip.currency)}</Text>
                    </View>
                  ))}
                  <View style={styles.modalSubtotal}>
                    <Text style={styles.modalSubtotalLabel}>{t('summary.total_share')}</Text>
                    <Text style={styles.modalSubtotalValue}>{formatCurrency(s.totalShare, trip.currency)}</Text>
                  </View>
                </View>
              )}

              {s && (s.fundPayments > 0 || s.advancedPayments > 0 || s.fundHeld > 0) && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('summary.paid_and_advanced')}</Text>
                  
                  {s.fundPayments > 0 && (
                    <View style={styles.modalItemRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Ionicons name="wallet-outline" size={16} color={colors.success} />
                        <Text style={styles.modalItemDesc}>{t('summary.fund_paid_label', { defaultValue: 'Tiền đã đóng quỹ' })}</Text>
                      </View>
                      <Text style={[styles.modalItemAmount, { color: colors.success }]}>
                        {formatCurrency(s.fundPayments, trip.currency)}
                      </Text>
                    </View>
                  )}

                  {s.advancedPayments > 0 && (
                    <View style={styles.modalItemRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Ionicons name="cash-outline" size={16} color={colors.info} />
                        <Text style={styles.modalItemDesc}>{t('summary.advanced_paid_label', { defaultValue: 'Tiền tự chi trả' })}</Text>
                      </View>
                      <Text style={[styles.modalItemAmount, { color: colors.info }]}>
                        {formatCurrency(s.advancedPayments, trip.currency)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.modalSubtotal}>
                    <Text style={styles.modalSubtotalLabel}>{t('summary.total_paid_label')}</Text>
                    <Text style={[styles.modalSubtotalValue, { color: colors.success }]}>{formatCurrency(s.totalPaid, trip.currency)}</Text>
                  </View>

                  {s.fundHeld > 0 && (
                    <View style={[styles.modalSubtotal, { borderStyle: 'dashed' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="briefcase" size={16} color={colors.accentLight} />
                        <Text style={[styles.modalSubtotalLabel, { color: colors.accentLight }]}>{t('summary.fund_held_label', { defaultValue: 'Quỹ đang giữ' })}</Text>
                      </View>
                      <Text style={[styles.modalSubtotalValue, { color: colors.accentLight }]}>
                        {formatCurrency(s.fundHeld, trip.currency)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Balance Card - Unified for both Debt and Refund */}
              {s && s.debt !== 0 && (
                <View style={[
                  styles.modalSection, 
                  styles.balanceCard,
                  { borderColor: s.debt > 0 ? colors.danger : colors.success }
                ]}>
                  <View style={styles.balanceHeader}>
                    <Ionicons 
                      name={s.debt > 0 ? "alert-circle" : "checkmark-circle"} 
                      size={20} 
                      color={s.debt > 0 ? colors.danger : colors.success} 
                    />
                    <Text style={[
                      styles.balanceLabel, 
                      { color: s.debt > 0 ? colors.danger : colors.success }
                    ]}>
                      {s.debt > 0 
                        ? (s.memberId === treasurer?.id ? t('summary.treasurer_debt', { defaultValue: 'Cần hoàn trả lại nhóm' }) : t('summary.debt_title', { defaultValue: 'Khoản cần đóng' })) 
                        : t('summary.refund_due')}
                    </Text>
                  </View>
                  <Text style={[
                    styles.balanceAmount, 
                    { color: s.debt > 0 ? colors.danger : colors.success }
                  ]}>
                    {formatCurrency(Math.abs(s.debt), trip.currency)}
                  </Text>
                </View>
              )}

              {/* No data */}
              {s && s.items.length === 0 && s.totalPaid === 0 && (
                <Text style={styles.modalEmpty}>{t('summary.no_expenses')}</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    treasurerBalance: {
      backgroundColor: colors.surfaceElevated, borderRadius: BorderRadius.md,
      padding: Spacing.md, marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: colors.primaryDark,
    },
    treasurerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    treasurerIcon: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primaryDark,
      justifyContent: 'center', alignItems: 'center',
    },
    treasurerBalanceLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.onSurfaceElevated },
    treasurerBalanceNote: { fontSize: FontSize.xs, color: colors.onSurfaceSecondary, marginTop: 2 },
    fundDetails: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.sm,
      padding: Spacing.sm,
    },
    fundRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: Spacing.xs,
    },
    fundRowTotal: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: Spacing.xs,
      paddingTop: Spacing.sm,
    },
    fundLabel: { fontSize: FontSize.sm, color: colors.onSurfaceSecondary },
    fundValueSuccess: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: colors.success },
    fundValueDanger: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: colors.danger },
    fundLabelTotal: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.onSurface },
    fundValueTotal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },

    tableSection: { marginBottom: Spacing.lg },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.onBackground, marginBottom: Spacing.md },
    
    // Settlement Section
    settlementSection: { marginBottom: Spacing.xl },
    settlementContainer: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settlementDesc: {
      fontSize: FontSize.xs,
      color: colors.onSurfaceSecondary,
      marginBottom: Spacing.md,
      fontStyle: 'italic',
    },
    settlementItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    settlementAvatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    settlementNameBox: {
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settlementNameFrom: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      color: colors.onSurfaceElevated,
    },
    settlementNameTo: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      color: colors.primary,
    },
    settlementAmount: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.extrabold,
      color: colors.onSurfaceElevated,
      marginLeft: Spacing.md,
    },
    emptySettlement: {
      textAlign: 'center',
      color: colors.onSurfaceMuted,
      fontSize: FontSize.sm,
      paddingVertical: Spacing.md,
    },

    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingTop: Spacing.md, maxHeight: '75%',
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: 'center', marginBottom: Spacing.md,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.onBackground },
    modalDebt: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginTop: 2 },
    modalScroll: { paddingHorizontal: Spacing.lg },
    modalSection: {
      marginTop: Spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      borderWidth: 1, borderColor: colors.border,
    },
    modalSectionTitle: {
      fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: colors.onSurfaceMuted,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm,
    },
    modalItemRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: Spacing.xs,
    },
    modalItemDesc: { fontSize: FontSize.sm, color: colors.onSurfaceSecondary, flex: 1 },
    modalItemAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: colors.onSurface },
    modalSubtotal: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginTop: Spacing.sm, paddingTop: Spacing.sm,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    modalSubtotalLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: colors.onSurface },
    modalSubtotalValue: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: colors.onSurface },
    modalEmpty: {
      textAlign: 'center', color: colors.onSurfaceMuted, fontSize: FontSize.md,
      paddingVertical: Spacing.xl,
    },
    balanceCard: {
      borderWidth: 2,
      padding: Spacing.md,
    },
    balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    balanceLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    balanceAmount: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  });
