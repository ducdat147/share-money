import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, ActivityIndicator, FlatList, Pressable,
} from 'react-native';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import CustomHeader from '@/components/CustomHeader';
import ScalePressable from '@/components/ScalePressable';
import UserAvatar from '@/components/UserAvatar';
import {
  AppText, BottomSheet, Button, ListRow, SegmentedControl,
} from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius } from '@/constants/theme';
import {
  calculateSummary, calculateSettlements, formatCurrency, getFundFlow,
} from '@/utils/calculator';
import { MemberSummary, SettlementStrategy } from '@/utils/types';

type SheetKind = 'strategy' | 'member' | 'fund';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, loadTrip } = useTripStore();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(true);
  // Một bảng mở một lúc. Người được chọn giữ lại sau khi đóng để nội dung không biến mất giữa
  // hoạt ảnh trượt xuống.
  const [openSheet, setOpenSheet] = useState<SheetKind | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [strategy, setStrategy] = useState<SettlementStrategy>('optimal');
  const [pickedCentralId, setPickedCentralId] = useState<string | undefined>(undefined);
  const viewShotRef = useRef<ViewShotRef>(null);

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  // Chưa chọn ai làm trung gian thì mặc định là thủ quỹ, không có thủ quỹ thì lấy thành viên đầu tiên.
  const centralMemberId = pickedCentralId || trip?.treasurerId || trip?.members[0]?.id;

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
    (async () => { if (id) { await loadTrip(id); setIsLoading(false); } })();
  }, [id, loadTrip]);

  const summaries = useMemo(() => {
    if (!trip) return [];
    return calculateSummary(trip.members, trip.expenses, trip.payments, trip.treasurerId, trip.currency);
  }, [trip]);

  const settlements = useMemo(() => calculateSettlements(summaries, trip?.currency, strategy, centralMemberId), [summaries, trip?.currency, strategy, centralMemberId]);

  const treasurer = trip?.members.find((m) => m.id === trip.treasurerId);
  const treasurerSummary = useMemo(
    () => summaries.find((s) => s.memberId === trip?.treasurerId),
    [summaries, trip?.treasurerId],
  );
  const fundFlow = useMemo(
    () => (trip ? getFundFlow(trip.expenses, trip.payments, trip.treasurerId) : { received: 0, spent: 0 }),
    [trip],
  );

  const strategyItems = useMemo(
    () => [
      { value: 'optimal' as const, label: t('summary.strategy_optimal_plain') },
      { value: 'centralized' as const, label: t('summary.strategy_centralized_plain') },
    ],
    [t],
  );

  const closeSheet = useCallback(() => setOpenSheet(null), []);
  const openStrategy = useCallback(() => setOpenSheet('strategy'), []);
  const openFund = useCallback(() => setOpenSheet('fund'), []);

  const handleRowPress = useCallback((summary: MemberSummary) => {
    setSelectedMemberId(summary.memberId);
    setOpenSheet('member');
  }, []);

  const renderMember = useCallback(
    ({ item }: { item: MemberSummary }) => {
      const isTreasurer = item.memberId === trip?.treasurerId;
      const sign = item.balance > 0.01 ? '+' : item.balance < -0.01 ? '−' : '';
      const amountColor = item.balance > 0.01
        ? colors.success
        : item.balance < -0.01 ? colors.danger : colors.textSecondary;
      return (
        <View style={styles.rowCard}>
          <ListRow
            left={<UserAvatar name={item.name} isTreasurer={isTreasurer} size={36} />}
            title={item.name}
            subtitle={isTreasurer ? t('summary.treasurer') : undefined}
            amount={`${sign}${formatCurrency(Math.abs(item.balance), trip?.currency)}`}
            amountColor={amountColor}
            onPress={() => handleRowPress(item)}
          />
        </View>
      );
    }, [trip?.treasurerId, trip?.currency, handleRowPress, styles, colors, t],
  );

  if (isLoading || !trip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const s = summaries.find((item) => item.memberId === selectedMemberId);
  // The treasurer's debt only covers their own share; what they owe the group also
  // includes the other members' cash they still hold. Without a treasurer debt stays 0, so the
  // balance is the only measure of what a member owes or gets back.
  const owed = s ? (s.memberId === treasurer?.id || !trip.treasurerId ? -s.balance : s.debt) : 0;
  const treasurerNet = treasurerSummary ? -treasurerSummary.balance : 0;

  const listHeader = (
    <View>
      <View style={styles.transferCard}>
        {/* Nền đặc để ảnh chia sẻ không trong suốt. Nút ⚙ nằm ngoài ViewShot nên không vào ảnh. */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'jpg', quality: 0.9 }}
          style={styles.shot}
        >
          <AppText variant="title" weight="bold" numberOfLines={2}>{trip.name}</AppText>
          {settlements.length > 0 ? (
            <>
              <AppText variant="label" weight="semibold" color={colors.textSecondary} style={styles.transfersTitle}>
                {t('summary.transfers_count', { count: settlements.length })}
              </AppText>
              {settlements.map((item, idx) => (
                <View key={idx} style={styles.transferRow}>
                  <View style={styles.transferNames}>
                    <AppText weight="semibold" numberOfLines={1} style={styles.transferName}>{item.fromName}</AppText>
                    <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                    <AppText weight="semibold" numberOfLines={1} style={styles.transferName}>{item.toName}</AppText>
                  </View>
                  <AppText weight="bold" numeric>{formatCurrency(item.amount, trip.currency)}</AppText>
                </View>
              ))}
            </>
          ) : (
            <AppText color={colors.textSecondary} style={styles.emptySettlement}>
              {t('summary.settlement_empty')}
            </AppText>
          )}
          <Pressable onPress={openStrategy} style={styles.strategyLine} accessibilityRole="button">
            <AppText variant="label" color={colors.textSecondary}>
              {t('summary.strategy_line', {
                strategy: t(strategy === 'optimal' ? 'summary.strategy_optimal_plain' : 'summary.strategy_centralized_plain'),
              })}
            </AppText>
          </Pressable>
        </ViewShot>
        <ScalePressable
          onPress={openStrategy}
          style={styles.strategyGear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('summary.settlement_strategy_label')}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
        </ScalePressable>
      </View>

      <AppText variant="label" weight="semibold" color={colors.textSecondary} style={styles.sectionTitle}>
        {t('summary.section_details')}
      </AppText>
    </View>
  );

  const listFooter = treasurer && treasurerSummary ? (
    <ScalePressable style={[styles.rowCard, styles.fundRow]} onPress={openFund} scaleTo={0.98} accessibilityRole="button">
      <Ionicons name="wallet-outline" size={20} color={colors.textSecondary} />
      <AppText weight="semibold" numeric style={styles.fundRowText}>
        {t('summary.fund_row', { name: treasurer.name, amount: formatCurrency(treasurerSummary.fundHeld, trip.currency) })}
      </AppText>
    </ScalePressable>
  ) : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader
        title={t('summary.title')}
        rightAction={
          <ScalePressable
            onPress={openStrategy}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('summary.settlement_strategy_label')}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </ScalePressable>
        }
      />

      <FlatList
        data={summaries}
        renderItem={renderMember}
        keyExtractor={(item) => item.memberId}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />

      {settlements.length > 0 && (
        <View style={styles.footer}>
          <Button title={t('summary.share_settlement')} icon="share-social" onPress={handleShare} />
        </View>
      )}

      <BottomSheet visible={openSheet === 'strategy'} onRequestClose={closeSheet}>
        <View style={styles.sheetContent}>
          <AppText variant="title" weight="bold">{t('summary.settlement_strategy_label')}</AppText>
          <SegmentedControl items={strategyItems} value={strategy} onChange={setStrategy} />
          {strategy === 'centralized' && (
            <View style={styles.centralMemberSelector}>
              <AppText variant="label" weight="semibold" color={colors.textSecondary}>
                {t('summary.central_member_label')}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {trip.members.map((m) => {
                  const selected = centralMemberId === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setPickedCentralId(m.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <AppText variant="label" weight="semibold" color={selected ? colors.onPrimary : colors.textSecondary}>
                        {m.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </BottomSheet>

      <BottomSheet visible={openSheet === 'fund'} onRequestClose={closeSheet}>
        {treasurer && treasurerSummary && (
          <View style={styles.sheetContent}>
            <View style={styles.fundHeader}>
              <UserAvatar name={treasurer.name} isTreasurer size={40} />
              <View style={styles.flex}>
                <AppText variant="title" weight="bold" numberOfLines={1}>
                  {treasurer.name} ({t('summary.treasurer')})
                </AppText>
                <AppText variant="label" color={colors.textSecondary}>{t('summary.fund_status')}</AppText>
              </View>
            </View>

            <View style={styles.section}>
              <AppText variant="caption" weight="bold" color={colors.textSecondary} style={styles.sectionLabel}>
                {t('summary.fund_group_money')}
              </AppText>
              <View style={styles.itemRow}>
                <AppText variant="label" color={colors.textSecondary} style={styles.flex}>{t('summary.fund_received_others')}</AppText>
                <AppText variant="label" weight="bold" numeric color={colors.success}>{formatCurrency(fundFlow.received, trip.currency)}</AppText>
              </View>
              <View style={styles.itemRow}>
                <AppText variant="label" color={colors.textSecondary} style={styles.flex}>{t('summary.fund_spent_by_treasurer')}</AppText>
                <AppText variant="label" weight="bold" numeric color={colors.danger}>{formatCurrency(fundFlow.spent, trip.currency)}</AppText>
              </View>
              <View style={styles.itemRow}>
                <AppText variant="label" color={colors.textSecondary} style={styles.flex}>{t('summary.fund_cash_held')}</AppText>
                <AppText variant="label" weight="bold" numeric>{formatCurrency(treasurerSummary.fundHeld, trip.currency)}</AppText>
              </View>

              <AppText variant="caption" weight="bold" color={colors.textSecondary} style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
                {t('summary.fund_treasurer_money')}
              </AppText>
              <View style={styles.itemRow}>
                <AppText variant="label" color={colors.textSecondary} style={styles.flex}>{t('summary.fund_pocket_advanced')}</AppText>
                <AppText variant="label" weight="bold" numeric>{formatCurrency(treasurerSummary.advancedPayments, trip.currency)}</AppText>
              </View>
              <View style={styles.itemRow}>
                <AppText variant="label" color={colors.textSecondary} style={styles.flex}>{t('summary.fund_own_share')}</AppText>
                <AppText variant="label" weight="bold" numeric>{formatCurrency(treasurerSummary.totalShare, trip.currency)}</AppText>
              </View>

              <View style={[styles.itemRow, styles.subtotal]}>
                <AppText weight="bold" style={styles.flex}>
                  {treasurerNet > 0.01
                    ? t('summary.treasurer_debt')
                    : treasurerNet < -0.01
                      ? t('summary.fund_net_group_owes')
                      : t('summary.even')}
                </AppText>
                <AppText
                  weight="bold"
                  numeric
                  color={treasurerNet > 0.01 ? colors.danger : treasurerNet < -0.01 ? colors.success : colors.text}
                >
                  {formatCurrency(Math.abs(treasurerNet), trip.currency)}
                </AppText>
              </View>
              <AppText variant="caption" color={colors.textSecondary} style={styles.hint}>{t('summary.fund_net_hint')}</AppText>
            </View>
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={openSheet === 'member'} onRequestClose={closeSheet}>
        {s && (
          <View style={styles.sheetContent}>
            <View>
              <AppText variant="title" weight="bold" numberOfLines={1}>{s.name}</AppText>
              <AppText
                weight="semibold"
                numeric
                color={owed > 0 ? colors.danger : owed < 0 ? colors.success : colors.textSecondary}
                style={styles.owedLine}
              >
                {owed > 0
                  ? t('summary.debt', { amount: formatCurrency(owed, trip.currency) })
                  : owed < 0
                    ? t('summary.refund', { amount: formatCurrency(Math.abs(owed), trip.currency) })
                    : s.memberId === treasurer?.id ? t('summary.treasurer') : t('summary.even')}
              </AppText>
            </View>

            {s.items.length > 0 && (
              <View style={styles.section}>
                <AppText variant="caption" weight="bold" color={colors.textSecondary} style={styles.sectionLabel}>
                  {t('summary.expenses_list')}
                </AppText>
                {s.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <AppText variant="label" color={colors.textSecondary} style={styles.flex}>{item.description}</AppText>
                    <AppText variant="label" weight="semibold" numeric>{formatCurrency(item.share, trip.currency)}</AppText>
                  </View>
                ))}
                <View style={[styles.itemRow, styles.subtotal]}>
                  <AppText variant="label" weight="bold" style={styles.flex}>{t('summary.total_share')}</AppText>
                  <AppText weight="bold" numeric>{formatCurrency(s.totalShare, trip.currency)}</AppText>
                </View>
              </View>
            )}

            {(s.fundPayments > 0 || s.advancedPayments > 0 || s.fundHeld > 0) && (
              <View style={styles.section}>
                <AppText variant="caption" weight="bold" color={colors.textSecondary} style={styles.sectionLabel}>
                  {t('summary.paid_and_advanced')}
                </AppText>

                {s.fundPayments > 0 && (
                  <View style={styles.itemRow}>
                    <View style={styles.iconLabel}>
                      <Ionicons name="wallet-outline" size={16} color={colors.success} />
                      <AppText variant="label" color={colors.textSecondary} style={styles.flex}>{t('summary.fund_paid_label')}</AppText>
                    </View>
                    <AppText variant="label" weight="semibold" numeric color={colors.success}>
                      {formatCurrency(s.fundPayments, trip.currency)}
                    </AppText>
                  </View>
                )}

                {s.advancedPayments > 0 && (
                  <View style={styles.itemRow}>
                    <View style={styles.iconLabel}>
                      <Ionicons name="cash-outline" size={16} color={colors.info} />
                      <AppText variant="label" color={colors.textSecondary} style={styles.flex}>{t('summary.advanced_paid_label')}</AppText>
                    </View>
                    <AppText variant="label" weight="semibold" numeric color={colors.info}>
                      {formatCurrency(s.advancedPayments, trip.currency)}
                    </AppText>
                  </View>
                )}

                {s.advancedItems.length > 0 && (
                  <View style={styles.advancedItems}>
                    {s.advancedItems.map((adv, idx) => (
                      <View key={`adv-${idx}`} style={styles.itemRow}>
                        <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>• {adv.description}</AppText>
                        <AppText variant="caption" numeric color={colors.textSecondary}>{formatCurrency(adv.amount, trip.currency)}</AppText>
                      </View>
                    ))}
                  </View>
                )}

                <View style={[styles.itemRow, styles.subtotal]}>
                  <AppText variant="label" weight="bold" style={styles.flex}>{t('summary.total_paid_label')}</AppText>
                  <AppText weight="bold" numeric color={colors.success}>{formatCurrency(s.totalPaid, trip.currency)}</AppText>
                </View>

                {s.fundHeld > 0 && (
                  <View style={[styles.itemRow, styles.subtotal, styles.dashed]}>
                    <View style={styles.iconLabel}>
                      <Ionicons name="briefcase" size={16} color={colors.accent} />
                      <AppText variant="label" weight="bold" color={colors.accent}>{t('summary.fund_held_label')}</AppText>
                    </View>
                    <AppText weight="bold" numeric color={colors.accent}>
                      {formatCurrency(s.fundHeld, trip.currency)}
                    </AppText>
                  </View>
                )}
              </View>
            )}

            {owed !== 0 && (
              <View style={[styles.section, styles.balanceCard, { borderColor: owed > 0 ? colors.danger : colors.success }]}>
                <View style={styles.iconLabel}>
                  <Ionicons
                    name={owed > 0 ? 'alert-circle' : 'checkmark-circle'}
                    size={20}
                    color={owed > 0 ? colors.danger : colors.success}
                  />
                  <AppText variant="label" weight="bold" color={owed > 0 ? colors.danger : colors.success}>
                    {owed > 0
                      ? (s.memberId === treasurer?.id ? t('summary.treasurer_debt') : t('summary.debt_title'))
                      : t('summary.refund_due')}
                  </AppText>
                </View>
                <AppText variant="hero" weight="bold" numeric color={owed > 0 ? colors.danger : colors.success}>
                  {formatCurrency(Math.abs(owed), trip.currency)}
                </AppText>
              </View>
            )}

            {s.items.length === 0 && s.totalPaid === 0 && (
              <AppText color={colors.textSecondary} style={styles.emptySettlement}>{t('summary.no_expenses')}</AppText>
            )}
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
    flex: { flex: 1 },

    transferCard: {
      borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden', marginBottom: Spacing.xl,
    },
    shot: { backgroundColor: colors.surface, padding: Spacing.lg },
    transfersTitle: { marginTop: Spacing.md, marginBottom: Spacing.xs },
    transferRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      gap: Spacing.md, paddingVertical: Spacing.sm,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    transferNames: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    transferName: { flexShrink: 1 },
    emptySettlement: { textAlign: 'center', paddingVertical: Spacing.lg },
    // Chừa chỗ bên phải cho nút ⚙ đặt đè, nằm ngoài ViewShot.
    strategyLine: { marginTop: Spacing.md, minHeight: 24, justifyContent: 'center', paddingRight: Spacing.xxxl },
    strategyGear: {
      position: 'absolute', right: Spacing.lg, bottom: Spacing.lg,
      height: 24, justifyContent: 'center',
    },

    sectionTitle: { marginBottom: Spacing.sm },
    rowCard: {
      backgroundColor: colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border,
      marginBottom: Spacing.sm, overflow: 'hidden',
    },
    fundRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, marginTop: Spacing.md,
    },
    fundRowText: { flex: 1 },

    footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },

    sheetContent: { gap: Spacing.lg },
    centralMemberSelector: { gap: Spacing.sm },
    chips: { gap: Spacing.sm },
    chip: {
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },

    fundHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    owedLine: { marginTop: Spacing.xs },
    section: {
      backgroundColor: colors.background, borderRadius: BorderRadius.md,
      padding: Spacing.md, borderWidth: 1, borderColor: colors.border,
    },
    sectionLabel: { textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
    sectionLabelSpaced: { marginTop: Spacing.md },
    itemRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      gap: Spacing.md, paddingVertical: Spacing.xs,
    },
    iconLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    advancedItems: { paddingLeft: Spacing.xl, marginBottom: Spacing.xs },
    subtotal: {
      marginTop: Spacing.sm, paddingTop: Spacing.sm,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    dashed: { borderStyle: 'dashed' },
    hint: { marginTop: Spacing.xs },
    balanceCard: { borderWidth: 2, gap: Spacing.sm },
  });
}
