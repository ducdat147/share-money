import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import UserAvatar from './UserAvatar';

interface MemberSelectorProps {
  members: Member[];
  selected: string[];
  onToggle: (memberId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  treasurerId?: string;
  /** Phần tiền mỗi người đã định dạng; không truyền khi chưa nhập số tiền. */
  share?: string;
}

const MemberSelector: React.FC<MemberSelectorProps> = React.memo(
  ({ members, selected, onToggle, onSelectAll, onDeselectAll, treasurerId, share }) => {
    const allSelected = selected.length === members.length;
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.label}>{t('components.participants_count', { selected: selected.length, total: members.length })}</Text>
          <TouchableOpacity
            onPress={allSelected ? onDeselectAll : onSelectAll}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.toggleAll}>{t(allSelected ? 'components.deselect_all' : 'components.select_all')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {members.map((member, index) => {
            const isSelected = selected.includes(member.id);
            return (
              <TouchableOpacity
                key={member.id}
                style={[styles.row, index > 0 && styles.rowDivider]}
                onPress={() => onToggle(member.id)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
              >
                <View style={[styles.person, !isSelected && styles.personExcluded]}>
                  <UserAvatar name={member.name} isTreasurer={member.id === treasurerId} size={32} />
                  <Text style={styles.name} numberOfLines={1}>{member.name}</Text>
                  {member.id === treasurerId && (
                    <Text style={styles.treasurerBadge}>{t('create_trip.treasurer')}</Text>
                  )}
                </View>
                <Text style={[styles.share, !isSelected && styles.shareExcluded]}>
                  {isSelected ? share : '—'}
                </Text>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.footer, selected.length === 0 && styles.footerWarning]}>
          {selected.length === 0
            ? t('components.select_at_least_one')
            : t('components.split_equally', { count: selected.length })}
        </Text>
      </View>
    );
  },
);

MemberSelector.displayName = 'MemberSelector';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    // Cùng kiểu với nhãn form ở add-expense ("Mô tả", "Số tiền", "Người chi").
    label: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    toggleAll: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.primary,
    },
    list: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
    },
    rowDivider: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    person: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    personExcluded: {
      opacity: 0.45,
    },
    name: {
      flexShrink: 1,
      fontSize: FontSize.md,
      fontWeight: FontWeight.medium,
      color: colors.text,
    },
    treasurerBadge: {
      backgroundColor: colors.accent,
      color: colors.onAccent,
      fontSize: FontSize.xs,
      fontWeight: FontWeight.bold,
      paddingHorizontal: Spacing.xs,
      borderRadius: BorderRadius.sm,
      overflow: 'hidden',
    },
    share: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.primaryLight,
    },
    shareExcluded: {
      color: colors.textMuted,
    },
    footer: {
      marginTop: Spacing.sm,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    footerWarning: {
      color: colors.danger,
    },
  });

export default MemberSelector;
