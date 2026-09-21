import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    const canSelectAll = selected.length < members.length;
    const canDeselectAll = selected.length > 0;
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{t('components.participants_count', { selected: selected.length, total: members.length })}</Text>
        <View style={styles.columns}>
          <View style={styles.membersColumn}>
            {members.map((member) => {
              const isSelected = selected.includes(member.id);
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.gridItem, isSelected && styles.gridItemSelected]}
                  onPress={() => onToggle(member.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.gridItemText, isSelected && styles.gridItemTextSelected]} numberOfLines={1}>
                    {member.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={[styles.actionButton, !canSelectAll && styles.actionButtonDisabled]}
              onPress={onSelectAll}
              disabled={!canSelectAll}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, !canSelectAll && styles.actionTextDisabled]}>{t('components.select_all')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, !canDeselectAll && styles.actionButtonDisabled]}
              onPress={onDeselectAll}
              disabled={!canDeselectAll}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, !canDeselectAll && styles.actionTextDisabled]}>{t('components.deselect_all')}</Text>
            </TouchableOpacity>
          </View>
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
    label: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.medium,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    columns: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
    },
    membersColumn: {
      flex: 2,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    actionsColumn: {
      flex: 1,
      gap: Spacing.sm,
    },
    actionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
    },
    actionButtonDisabled: {
      borderColor: colors.border,
    },
    actionText: {
      fontSize: FontSize.sm,
      color: colors.primaryLight,
      fontWeight: FontWeight.medium,
      textAlign: 'center',
    },
    actionTextDisabled: {
      color: colors.textMuted,
    },
    gridItem: {
      maxWidth: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    gridItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
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
