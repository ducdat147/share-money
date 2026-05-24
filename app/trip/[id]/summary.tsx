import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, TouchableOpacity, Animated, Pressable,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
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
  const [showModal, setShowModal] = useState(false);

  const [strategy, setStrategy] = useState<import('@/utils/types').SettlementStrategy>('optimal');
  const [centralMemberId, setCentralMemberId] = useState<string | undefined>(undefined);
  const viewShotRef = useRef<ViewShot>(null);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(600)).current;

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  useEffect(() => {
    if (trip && !centralMemberId) {
      setCentralMemberId(trip.treasurerId || trip.members[0]?.id);
    }
  }, [trip, centralMemberId]);

  const handleShare = async () => {
    try {
      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: t('summary.share_settlement'),
          UTI: 'public.jpeg',
        });
      }
    } catch (error) {
      console.error('Sharing error:', error);
    }
  };

  useEffect(() => {
    if (selectedSummary) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalTranslateY, {
          toValue: 0,
          friction: 9,
          tension: 35,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(modalTranslateY, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [selectedSummary]);

  useEffect(() => {
    (async () => { if (id) { await loadTrip(id); setIsLoading(false); } })();
  }, [id, loadTrip]);

  const summaries = useMemo(() => {
    if (!trip) return [];
    return calculateSummary(trip.members, trip.expenses, trip.payments, trip.treasurerId, trip.currency);
  }, [trip]);

  const settlements = useMemo(() => calculateSettlements(summaries, trip?.currency, strategy, centralMemberId), [summaries, trip?.currency, strategy, centralMemberId]);

  const treasurer = useMemo(() => trip?.members.find((m) => m.id === trip.treasurerId), [trip]);
  const totalFundExpenses = useMemo(() => {
    if (!trip) return 0;
    return trip.expenses
      .filter((e) => !e.paidBy || e.paidBy === trip.treasurerId)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [trip]);
  const totalPayments = useMemo(() => (trip ? getTotalPayments(trip.payments) : 0), [trip]);
  
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

          {/* Strategy Selector */}
          <View style={styles.strategyContainer}>
            <Text style={styles.strategyLabel}>{t('summary.settlement_strategy_label')}</Text>
            <View style={styles.strategyToggle}>
              {(['optimal', 'centralized'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.strategyOption, strategy === s && styles.strategyOptionActive]}
                  onPress={() => setStrategy(s)}
                >
                  <Text style={[styles.strategyText, strategy === s && styles.strategyTextActive]}>
                    {t(`summary.strategy_${s}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {strategy === 'centralized' && (
            <View style={styles.centralMemberSelector}>
              <Text style={styles.strategyLabel}>{t('summary.central_member_label')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberChips}>
                {trip.members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberChip, centralMemberId === m.id && styles.memberChipActive]}
                    onPress={() => setCentralMemberId(m.id)}
                  >
                    <Text style={[styles.memberChipText, centralMemberId === m.id && styles.memberChipTextActive]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <ViewShot
            ref={viewShotRef}
            options={{ format: 'jpg', quality: 0.9 }}
            style={{ backgroundColor: colors.background, borderRadius: BorderRadius.lg, overflow: 'hidden' }}
          >
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
          </ViewShot>

          {/* New Share Button Positioning */}
          {settlements.length > 0 && (
            <TouchableOpacity 
              onPress={handleShare} 
              style={styles.shareActionBtn} 
              activeOpacity={0.8}
            >
              <Ionicons name="share-social" size={20} color={colors.onPrimary} />
              <Text style={styles.shareActionBtnText}>{t('summary.share_settlement')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={() => setSelectedSummary(null)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedSummary(null)}>
            <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]} />
          </Pressable>
          <Animated.View style={[
            styles.modalSheet, 
            { transform: [{ translateY: modalTranslateY }] },
            { paddingBottom: insets.bottom + Spacing.lg }
          ]}>
            <View style={styles.modalHandle} />

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

                  {s.advancedItems && s.advancedItems.length > 0 && (
                    <View style={styles.advancedItemsList}>
                      {s.advancedItems.map((adv, idx) => (
                        <View key={`adv-${idx}`} style={styles.advancedItemRow}>
                          <Text style={styles.advancedItemDesc}>• {adv.description}</Text>
                          <Text style={styles.advancedItemAmount}>{formatCurrency(adv.amount, trip.currency)}</Text>
                        </View>
                      ))}
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

              {s && s.items.length === 0 && s.totalPaid === 0 && (
                <Text style={styles.modalEmpty}>{t('summary.no_expenses')}</Text>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    
    // Strategy Selector UI
    strategyContainer: {
      marginBottom: Spacing.md,
    },
    strategyLabel: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: Spacing.sm,
    },
    strategyToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    strategyOption: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: BorderRadius.sm,
    },
    strategyOptionActive: {
      backgroundColor: colors.primary,
    },
    strategyText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.textSecondary,
    },
    strategyTextActive: {
      color: colors.onPrimary,
    },
    centralMemberSelector: {
      marginBottom: Spacing.lg,
    },
    memberChips: {
      gap: Spacing.sm,
      paddingVertical: 2,
    },
    memberChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    memberChipActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primary,
    },
    memberChipText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    memberChipTextActive: {
      color: colors.onPrimary,
      fontWeight: FontWeight.bold,
    },

    // Share Button
    shareActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.md,
      elevation: 2,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    shareActionBtnText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.onPrimary,
    },

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
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingTop: Spacing.md, maxHeight: '85%',
      borderWidth: 1, borderColor: colors.border,
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
    advancedItemsList: {
      paddingLeft: Spacing.xl,
      marginBottom: Spacing.xs,
    },
    advancedItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    advancedItemDesc: {
      fontSize: FontSize.xs,
      color: colors.onSurfaceMuted,
      fontStyle: 'italic',
      flex: 1,
    },
    advancedItemAmount: {
      fontSize: FontSize.xs,
      color: colors.onSurfaceMuted,
      fontStyle: 'italic',
    },
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
}
