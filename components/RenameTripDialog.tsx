import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface Props {
  visible: boolean;
  initialName: string;
  onCancel: () => void;
  onSave: (name: string) => Promise<void>;
}

/** Hộp đổi tên chuyến đi, cùng kiểu với hộp thoại của DialogProvider. */
export default function RenameTripDialog({ visible, initialName, onCancel, onSave }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const trimmed = name.trim();
  const canSave = !!trimmed && trimmed !== initialName && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Android tự thu nhỏ cửa sổ Modal khi bàn phím mở; chỉ iOS cần đẩy hộp lên. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{t('trip_detail.rename_title')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('create_trip.trip_name_placeholder')}
              placeholderTextColor={colors.textMuted}
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel} activeOpacity={0.7}>
                <Text style={[styles.buttonText, styles.cancelText]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, canSave ? styles.saveButton : styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, canSave ? styles.saveText : styles.saveTextDisabled]}>
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xxl,
    },
    dialog: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      fontSize: FontSize.md,
      color: colors.text,
      marginBottom: Spacing.xl,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    button: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.surfaceElevated,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    saveButtonDisabled: {
      backgroundColor: colors.surfaceElevated,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
    cancelText: {
      color: colors.textSecondary,
    },
    saveText: {
      color: colors.onPrimary,
    },
    saveTextDisabled: {
      color: colors.onSurfaceElevated,
    },
  });
