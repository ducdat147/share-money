import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface MemberSelectorProps {
  members: Member[];
  selected: string[];
  onToggle: (memberId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const MemberSelector: React.FC<MemberSelectorProps> = React.memo(
  ({ members, selected, onToggle, onSelectAll, onDeselectAll }) => {
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
          >
            <Text style={styles.toggleAll}>
              {allSelected ? t('components.deselect_all') : t('components.select_all')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.gridContainer}>
          {members.map((member) => {
            const isSelected = selected.includes(member.id);
            return (
              <TouchableOpacity
                key={member.id}
                style={[styles.gridItem, isSelected && styles.gridItemSelected]}
                onPress={() => onToggle(member.id)}
                activeOpacity={0.7}
              >
                <View style={styles.gridItemContent}>
                  <Text style={[styles.gridItemText, isSelected && styles.gridItemTextSelected]} numberOfLines={1}>
                    {member.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    label: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.medium,
      color: colors.textSecondary,
    },
    toggleAll: {
      fontSize: FontSize.sm,
      color: colors.primaryLight,
      fontWeight: FontWeight.medium,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    gridItem: {
      minWidth: '31%',
      maxWidth: '48%',
      marginBottom: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
    },
    gridItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    gridItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      flex: 1,
    },
    gridItemText: {
      fontSize: FontSize.sm,
      color: colors.text,
      fontWeight: FontWeight.medium,
      flexShrink: 1,
      textAlign: 'center',
    },
    gridItemTextSelected: {
      fontWeight: FontWeight.bold,
      color: colors.onPrimary,
    },
  });

export default MemberSelector;
