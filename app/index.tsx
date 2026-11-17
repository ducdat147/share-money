import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SUMMARY_PAGE_SIZE, useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { TripSummary } from '@/utils/types';
import TripCard from '@/components/TripCard';
import RenameTripDialog from '@/components/RenameTripDialog';
import { useDialog } from '@/components/DialogProvider';
import { AppText, Button, FAB } from '@/components/ui';
import { ThemeColors, Spacing, BorderRadius, FontSize } from '@/constants/theme';

import ScalePressable from '@/components/ScalePressable';
import * as Haptics from 'expo-haptics';

const AnimatedListItem = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const [animatedValue] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 400,
      // Capped: with paging, an uncapped index would make row 20 wait 2s.
      delay: Math.min(index, 5) * 100,
      useNativeDriver: true,
    }).start();
  }, [animatedValue, index]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View style={{ opacity: animatedValue, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const {
    tripSummaries,
    tripCounts,
    isLoadingSummaries,
    isLoadingMoreSummaries,
    loadTripSummaries,
    loadMoreSummaries,
    deleteTrip,
    updateTripName,
  } = useTripStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [renamingTrip, setRenamingTrip] = useState<TripSummary | null>(null);
  const isNavigatingRef = useRef(false);
  const isSearchingRef = useRef(false);
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      // Screen is back on top: release the lock taken by the last navigation.
      isNavigatingRef.current = false;
      // Read the store imperatively: depending on the loaded count would make
      // this effect re-run on its own result. Refreshing the pages already on
      // screen (instead of just the first) keeps the scroll position usable.
      const loaded = useTripStore.getState().tripSummaries.length;
      loadTripSummaries(
        isSearchingRef.current ? 'all' : Math.max(SUMMARY_PAGE_SIZE, loaded),
      ).finally(() => setHasLoadedOnce(true));
    }, [loadTripSummaries]),
  );

  // Search box only shows from 5 trips up; drop a stale query when it hides.
  const showSearch = tripCounts.total >= 5;
  if (!showSearch && searchQuery) setSearchQuery('');

  useEffect(() => {
    const searching = searchQuery.trim().length > 0;
    if (searching === isSearchingRef.current) return;
    isSearchingRef.current = searching;
    // Search stays in memory because SQLite's LIKE only folds ASCII case — a
    // lowercase "đà lạt" would never match "Đà Lạt" in SQL. So entering search
    // mode pulls every summary once, and leaving it drops back to one page.
    loadTripSummaries(searching ? 'all' : SUMMARY_PAGE_SIZE);
  }, [searchQuery, loadTripSummaries]);

  // Without this lock, mashing a target stacks duplicate screens (several
  // `trip/create` modals, or the same trip opened twice).
  const handleCreateTrip = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push('/trip/create');
  }, [router]);

  const handleOpenTrip = useCallback(
    (tripId: string) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;
      router.push(`/trip/${tripId}`);
    },
    [router],
  );

  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return tripSummaries;
    const q = searchQuery.trim().toLowerCase();
    return tripSummaries.filter((trip) => trip.name.toLowerCase().includes(q));
  }, [tripSummaries, searchQuery]);

  const handleDeleteTrip = useCallback(
    (tripId: string, tripName: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showDialog(t('trip_detail.alert_delete_title'), t('trip_detail.alert_delete_desc', { name: tripName }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteTrip(tripId),
        },
      ]);
    },
    [deleteTrip, t, showDialog],
  );

  const handleRename = useCallback(
    async (name: string) => {
      if (!renamingTrip) return;
      try {
        await updateTripName(renamingTrip.id, name);
        setRenamingTrip(null);
        // updateTripName chỉ nạp lại chi tiết chuyến đi; danh sách ở đây là bản tóm tắt nên nạp lại riêng.
        const loaded = useTripStore.getState().tripSummaries.length;
        await loadTripSummaries(isSearchingRef.current ? 'all' : Math.max(SUMMARY_PAGE_SIZE, loaded));
      } catch {
        // Đóng hộp đổi tên trước: mở hộp thoại chồng lên một Modal khác dễ không hiện trên iOS.
        setRenamingTrip(null);
        showDialog(t('common.error'), t('trip_detail.err_rename'));
      }
    },
    [renamingTrip, updateTripName, loadTripSummaries, showDialog, t],
  );

  const handleEndReached = useCallback(() => {
    // While searching everything is already loaded; paging would fight the filter.
    if (isSearchingRef.current) return;
    loadMoreSummaries();
  }, [loadMoreSummaries]);

  const renderTrip = useCallback(
    ({ item, index }: { item: TripSummary; index: number }) => (
      <AnimatedListItem index={index}>
        <TripCard
          trip={item}
          onPress={() => handleOpenTrip(item.id)}
          // Chuyến đã kết thúc thì không đổi tên, giống menu trong màn chuyến đi.
          onRename={item.isCompleted ? undefined : () => setRenamingTrip(item)}
          onDelete={() => handleDeleteTrip(item.id, item.name)}
        />
      </AnimatedListItem>
    ),
    [handleOpenTrip, handleDeleteTrip],
  );

  const keyExtractor = useCallback((item: TripSummary) => item.id, []);

  const renderFooter = useCallback(
    () =>
      isLoadingMoreSummaries ? (
        <View style={styles.footerLoading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null,
    [isLoadingMoreSummaries, styles, colors],
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="airplane-outline" size={48} color={colors.textMuted} />
        </View>
        <AppText variant="title" weight="bold" style={styles.emptyTitle}>
          {t('home.empty_title')}
        </AppText>
        <AppText color={colors.textSecondary} style={styles.emptySubtitle}>
          {t('home.empty_desc')}
        </AppText>
        {searchQuery.trim().length === 0 && (
          <View style={styles.emptyAction}>
            <Button title={t('home.add_trip')} icon="add" onPress={handleCreateTrip} />
          </View>
        )}
      </View>
    ),
    [searchQuery, handleCreateTrip, t, styles, colors],
  );

  // Only the very first load takes over the screen — later refreshes keep the
  // list (and the FAB) mounted so taps are never swallowed by the spinner.
  if (isLoadingSummaries && !hasLoadedOnce) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <AppText variant="title" weight="bold">
            {t('home.title')}
          </AppText>
          <ScalePressable
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.settings')}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </ScalePressable>
        </View>
        {showSearch && (
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('home.search_placeholder')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <FlatList
        data={filteredTrips}
        renderItem={renderTrip}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      <FAB label={t('home.new_trip')} onPress={handleCreateTrip} />

      <RenameTripDialog
        visible={renamingTrip !== null}
        initialName={renamingTrip?.name ?? ''}
        onCancel={() => setRenamingTrip(null)}
        onSave={handleRename}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    // Header
    headerContainer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
      gap: Spacing.md,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingsBtn: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Search
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.sm,
      fontSize: FontSize.md,
      color: colors.onSurface,
    },
    // List
    listContent: {
      paddingHorizontal: Spacing.lg,
      // Clear the FAB so the last card is not hidden under it.
      paddingBottom: Spacing.xxl * 3,
      flexGrow: 1,
    },
    footerLoading: {
      paddingVertical: Spacing.lg,
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 80,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    emptyTitle: {
      marginBottom: Spacing.sm,
    },
    emptySubtitle: {
      textAlign: 'center',
    },
    emptyAction: {
      marginTop: Spacing.xl,
    },
  });
