import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface DialogConfig {
  title: string;
  message: string;
  buttons: DialogButton[];
}

interface DialogContextType {
  showDialog: (title: string, message: string, buttons?: DialogButton[]) => void;
}

const DialogContext = createContext<DialogContextType>({ showDialog: () => {} });

export const useDialog = () => useContext(DialogContext);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogConfig | null>(null);

  const showDialog = useCallback((title: string, message: string, buttons?: DialogButton[]) => {
    setConfig({
      title,
      message,
      buttons: buttons ?? [{ text: 'OK', style: 'default' }],
    });
    setVisible(true);
  }, []);

  const handlePress = useCallback((btn: DialogButton) => {
    setVisible(false);
    // Small delay so modal closes before callback runs
    setTimeout(() => btn.onPress?.(), 150);
  }, []);

  const cancelBtn = config?.buttons.find((b) => b.style === 'cancel');
  const actionBtns = config?.buttons.filter((b) => b.style !== 'cancel') ?? [];

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => cancelBtn ? handlePress(cancelBtn) : setVisible(false)}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{config?.title}</Text>
            <Text style={styles.message}>{config?.message}</Text>
            <View style={styles.buttonRow}>
              {cancelBtn && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => handlePress(cancelBtn)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, styles.cancelText]}>{cancelBtn.text}</Text>
                </TouchableOpacity>
              )}
              {actionBtns.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    btn.style === 'destructive' ? styles.destructiveButton : styles.primaryButton,
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, styles.actionText]}>{btn.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
      marginBottom: Spacing.sm,
    },
    message: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
      lineHeight: 22,
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
    primaryButton: {
      backgroundColor: colors.primary,
    },
    destructiveButton: {
      backgroundColor: colors.danger,
    },
    buttonText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
    cancelText: {
      color: colors.textSecondary,
    },
    actionText: {
      color: colors.text,
    },
  });
