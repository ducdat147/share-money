import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BorderRadius, Spacing, ThemeColors } from '@/constants/theme';
import AppText from './AppText';
import type { IoniconName } from './Button';

export type ActionMenuItem = {
  label: string;
  icon: IoniconName;
  destructive?: boolean;
  onPress: () => void;
};

export type ActionMenuProps = {
  items: ActionMenuItem[];
};

export default function ActionMenu({ items }: ActionMenuProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        hitSlop={Spacing.sm}
        accessibilityRole="button"
        accessibilityLabel={t('components.more_options')}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        // Cửa sổ Modal mở ra với icon status bar màu trắng, kể cả ở light mode, nên đặt lại sau khi hiện.
        onShow={() => StatusBar.setStyle(isDark ? 'light' : 'dark')}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View style={[styles.menu, { top: insets.top + Spacing.sm }]} accessibilityRole="menu">
          {items.map((item) => {
            const color = item.destructive ? colors.danger : colors.text;
            return (
              <Pressable
                key={item.label}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                onPress={() => {
                  setOpen(false);
                  // Đợi Modal đóng hẳn: iOS bỏ qua Modal mới (ví dụ hộp thoại xác nhận) nếu
                  // nó mở lúc Modal này còn đang tắt. Cùng cách với DialogProvider.
                  setTimeout(item.onPress, 150);
                }}
                accessibilityRole="menuitem"
              >
                <Ionicons name={item.icon} size={20} color={color} />
                <AppText color={color}>{item.label}</AppText>
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    trigger: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.full,
    },
    menu: {
      position: 'absolute',
      right: Spacing.lg,
      minWidth: 200,
      paddingVertical: Spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 8,
      shadowColor: colors.overlay,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
    },
    item: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    itemPressed: {
      backgroundColor: colors.surfaceElevated,
    },
  });
