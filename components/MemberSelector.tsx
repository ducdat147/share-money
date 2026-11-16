import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, type TextInputInstance, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { CurrencyCode, formatCurrency, roundCurrency } from '@/utils/currency';
import UserAvatar from './UserAvatar';

interface MemberSelectorProps {
  members: Member[];
  selected: string[];
  onToggle: (memberId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  treasurerId?: string;
  /** Phần tiền đã tính của từng người được chọn (khoá hoặc chia đều). */
  shares: Record<string, number>;
  /** Chuỗi đang gõ của người bị khoá; có key nghĩa là đang khoá. */
  shareTexts: Record<string, string>;
  /** Chuỗi rỗng nghĩa là mở khoá. */
  onChangeShare: (memberId: string, text: string) => void;
  currencyCode?: CurrencyCode;
  /** Vị trí y của dòng vừa focus ô nhập, tính từ đầu component, để màn cha cuộn tới. */
  onShareFocus?: (offsetY: number) => void;
  /** Lỗi phần tiền tuỳ chỉnh, hiện thay cho dòng gợi ý bên dưới. */
  error?: string;
}

const MemberSelector: React.FC<MemberSelectorProps> = React.memo(
  ({ members, selected, onToggle, onSelectAll, onDeselectAll, treasurerId, shares, shareTexts, onChangeShare, currencyCode, onShareFocus, error }) => {
    const allSelected = selected.length === members.length;
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const hasLocked = selected.some((id) => shareTexts[id] !== undefined);
    const listY = useRef(0);
    const rowYs = useRef<Record<string, number>>({});

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

        <View style={styles.list} onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}>
          {members.map((member, index) => {
            const isSelected = selected.includes(member.id);
            const isLocked = shareTexts[member.id] !== undefined;
            const share = shares[member.id] ?? 0;
            return (
              <TouchableOpacity
                key={member.id}
                style={[styles.row, index > 0 && styles.rowDivider]}
                onPress={() => onToggle(member.id)}
                onLayout={(e) => { rowYs.current[member.id] = e.nativeEvent.layout.y; }}
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
                {isSelected ? (
                  <View style={styles.shareField}>
                    {isLocked && <Ionicons name="lock-closed" size={14} color={colors.text} />}
                    {/* Ô trống hiện phần chia đều làm placeholder; gõ số là khoá. */}
                    <ShareInput
                      style={[styles.shareInput, isLocked && styles.shareInputLocked]}
                      value={shareTexts[member.id] ?? ''}
                      onChangeText={(text) => onChangeShare(member.id, text)}
                      onFocus={() => onShareFocus?.(listY.current + (rowYs.current[member.id] ?? 0))}
                      placeholder={share > 0 ? formatCurrency(roundCurrency(share, currencyCode), currencyCode) : ''}
                      placeholderTextColor={colors.primaryLight}
                    />
                  </View>
                ) : (
                  <Text style={[styles.share, styles.shareExcluded]}>—</Text>
                )}
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.footer, (selected.length === 0 || error) && styles.footerWarning]}>
          {selected.length === 0
            ? t('components.select_at_least_one')
            : error
              ? error
              : hasLocked
              ? t('components.split_custom_hint')
              : t('components.split_equally', { count: selected.length })}
        </Text>
      </View>
    );
  },
);

MemberSelector.displayName = 'MemberSelector';

// `selectTextOnFocus` không bôi đen khi chạm trên Android: con trỏ đặt theo điểm chạm sau khi focus
// và ghi đè vùng chọn. Chọn lại toàn bộ ở frame kế tiếp để gõ số mới là thay luôn số cũ.
const ShareInput: React.FC<Omit<TextInputProps, 'keyboardType' | 'selectTextOnFocus'>> = (props) => {
  const inputRef = useRef<TextInputInstance>(null);
  const { onFocus, value } = props;
  const handleFocus = useCallback<NonNullable<typeof onFocus>>((e) => {
    onFocus?.(e);
    const length = value?.length ?? 0;
    if (length > 0) setTimeout(() => inputRef.current?.setSelection(0, length), 50);
  }, [onFocus, value]);
  return <TextInput {...props} ref={inputRef} onFocus={handleFocus} keyboardType="numeric" selectTextOnFocus />;
};

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
    shareField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    shareInput: {
      minWidth: 96,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: 'right',
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.primaryLight,
    },
    shareInputLocked: {
      borderColor: colors.primary,
      color: colors.text,
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
