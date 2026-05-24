import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import UserAvatar from './UserAvatar';

interface MemberDetailModalProps {
  visible: boolean;
  onClose: () => void;
  member: Member | null;
  isTreasurer: boolean;
  hasTreasurer: boolean;
  onUpdateName: (name: string) => Promise<void>;
  onToggleTreasurer: () => Promise<void>;
  onAddFund: (amount: number) => Promise<void>;
}

export default function MemberDetailModal({
  visible,
  onClose,
  member,
  isTreasurer,
  hasTreasurer,
  onUpdateName,
  onToggleTreasurer,
  onAddFund,
}: MemberDetailModalProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);

  const [name, setName] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(visible);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
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
        Animated.timing(contentTranslateY, {
          toValue: 400,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setFundAmount('');
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;
    setIsSaving(true);
    try {
      if (name.trim() !== member.name) {
        await onUpdateName(name.trim());
      }
      const amount = parseFloat(fundAmount);
      if (!isNaN(amount) && amount > 0) {
        await onAddFund(amount);
      }
      handleClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!showModal && !visible) return null;

  return (
    <Modal visible={showModal} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </Pressable>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View style={[styles.content, { transform: [{ translateY: contentTranslateY }] }]}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('member_detail.title')}</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarSection}>
              <UserAvatar name={member?.name || ''} isTreasurer={isTreasurer} size={60} />
              <View style={styles.nameInputContainer}>
                <Text style={styles.label}>{t('member_detail.name_label')}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('member_detail.name_label')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.optionRow, isTreasurer && styles.optionRowActive]}
              onPress={onToggleTreasurer}
            >
              <View style={styles.optionInfo}>
                <Ionicons
                  name={isTreasurer ? 'wallet' : 'wallet-outline'}
                  size={24}
                  color={isTreasurer ? colors.accentLight : colors.textSecondary}
                />
                <Text style={[styles.optionText, isTreasurer && styles.optionTextActive]}>
                  {t('member_detail.is_treasurer')}
                </Text>
              </View>
              {isTreasurer && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accentLight} />
              )}
            </TouchableOpacity>

            {hasTreasurer && !isTreasurer && (
              <View style={styles.fundSection}>
                <Text style={styles.label}>{t('member_detail.add_fund')}</Text>
                <Text style={styles.hint}>{t('member_detail.add_fund_desc')}</Text>
                <TextInput
                  style={styles.input}
                  value={fundAmount}
                  onChangeText={setFundAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveBtnText}>
                {isSaving ? t('common.submitting') : t('common.save')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    keyboardView: {
      width: '100%',
    },
    content: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      padding: Spacing.xl,
      paddingBottom: Platform.OS === 'ios' ? Spacing.xxl + 20 : Spacing.xxl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    title: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    avatarSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      marginBottom: Spacing.xl,
    },
    nameInputContainer: {
      flex: 1,
    },
    label: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
      textTransform: 'uppercase',
    },
    hint: {
      fontSize: FontSize.xs,
      color: colors.textMuted,
      marginBottom: Spacing.sm,
    },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: FontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.xl,
    },
    optionRowActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.accent,
    },
    optionInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    optionText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    optionTextActive: {
      color: colors.accentLight,
    },
    fundSection: {
      marginBottom: Spacing.xl,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.onPrimary,
    },
  });
