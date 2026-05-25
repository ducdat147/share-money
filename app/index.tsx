import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '@/hooks/useTripStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Trip } from '@/utils/types';
import TripCard from '@/components/TripCard';
import { useDialog } from '@/components/DialogProvider';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

import ScalePressable from '@/components/ScalePressable';
import * as Haptics from 'expo-haptics';

const AnimatedListItem = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [index]);

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
  const { trips, isLoading, loadTrips, deleteTrip } = useTripStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { showDialog } = useDialog();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips]),
  );

  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return trips;
    const q = searchQuery.trim().toLowerCase();
    return trips.filter((trip) => trip.name.toLowerCase().includes(q));
  }, [trips, searchQuery]);

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

  const renderTrip = useCallback(
    ({ item, index }: { item: Trip; index: number }) => (
      <AnimatedListItem index={index}>
        <TripCard
          trip={item}
          onPress={() => router.push(`/trip/${item.id}`)}
          onDelete={() => handleDeleteTrip(item.id, item.name)}
        />
      </AnimatedListItem>
    ),
    [router, handleDeleteTrip],
  );

  const keyExtractor = useCallback((item: Trip) => item.id, []);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="airplane-outline" size={48} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>{t('home.empty_title')}</Text>
        <Text style={styles.emptySubtitle}>{t('home.empty_desc')}</Text>
      </View>
    ),
    [searchQuery, t, styles, colors],
  );

  const menuItems = useMemo(
    () => [
      {
        icon: 'settings-outline' as const,
        label: t('common.settings'),
        onPress: () => {
          setMenuVisible(false);
          router.push('/settings');
        },
      },
      {
        icon: 'information-circle-outline' as const,
        label: t('common.about'),
        onPress: () => {
          setMenuVisible(false);
          showDialog(
            'Share Money',
            t('home.about_desc'),
          );
        },
      },
    ],
    [router, t, showDialog],
  );


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with hamburger and search */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <ScalePressable
            onPress={() => setMenuVisible(true)}
            style={styles.hamburgerBtn}
            hitSlop={8}
          >
            <Ionicons name="menu" size={26} color={colors.onBackground} />
          </ScalePressable>
          
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
        </View>
      </View>

      <FlatList
        data={filteredTrips}
        renderItem={renderTrip}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      <ScalePressable
        style={[styles.fab, { bottom: Spacing.xxl + insets.bottom }]}
        onPress={() => router.push('/trip/create')}
        haptic={Haptics.ImpactFeedbackStyle.Heavy}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </ScalePressable>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuPanel}>
            {/* Menu Header */}
            <View style={styles.menuHeader}>
              <View style={styles.menuLogoContainer}>
                <Ionicons name="wallet" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.menuAppName}>Share Money</Text>
                <Text style={styles.menuAppVersion}>v1.0.0</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            {/* Menu Items */}
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.menuDivider} />

            {/* Stats */}
            <View style={styles.menuStats}>
              <Text style={styles.menuStatsText}>
                {t('home.stats_trips', { count: trips.length })} •{' '}
                {t('home.stats_active', { count: trips.filter((tr) => !tr.isCompleted).length })}
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>
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
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    hamburgerBtn: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingRight: Spacing.xs,
    },
    // Search
    searchContainer: {
      flex: 1,
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
      flexGrow: 1,
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
      fontSize: FontSize.xl,
      fontWeight: FontWeight.bold,
      color: colors.onBackground,
      marginBottom: Spacing.sm,
    },
    emptySubtitle: {
      fontSize: FontSize.md,
      color: colors.onSurfaceSecondary,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      bottom: Spacing.xxl,
      right: Spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    // Menu Modal
    menuOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-start',
    },
    menuPanel: {
      width: '75%',
      height: '100%',
      backgroundColor: colors.surface,
      paddingTop: 60,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl,
    },
    menuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    menuLogoContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuAppName: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.extrabold,
      color: colors.onSurface,
    },
    menuAppVersion: {
      fontSize: FontSize.sm,
      color: colors.onSurfaceMuted,
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: Spacing.md,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    menuItemText: {
      fontSize: FontSize.md,
      color: colors.onSurface,
      fontWeight: FontWeight.medium,
    },
    menuStats: {
      paddingVertical: Spacing.sm,
    },
    menuStatsText: {
      fontSize: FontSize.sm,
      color: colors.onSurfaceSecondary,
    },
  });
