import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontFamily } from '@/constants/theme';

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

// iOS chỉ trình bày Modal từ view controller gần nhất. Khi một sheet hay modal khác đang mở (route
// transparentModal, Modal của BottomSheet...), Modal ở gốc app không hiện được và bị bỏ qua không
// báo lỗi. Vì vậy mỗi Modal tự đặt một DialogOutlet bên trong, và hộp thoại vẽ ở outlet trên cùng
// thay vì mở thêm Modal. Không có outlet nào thì mới dùng Modal ở gốc như cũ.
interface DialogOutletContextType {
  topOutlet: number | null;
  register: (id: number) => void;
  unregister: (id: number) => void;
  /** Đóng hộp thoại đang mở (như bấm Huỷ). Trả về false nếu không có hộp thoại nào. */
  dismiss: () => boolean;
  dialog: React.ReactNode;
}

const DialogOutletContext = createContext<DialogOutletContextType | null>(null);

let nextOutletId = 1;

/** Đặt bên trong mỗi Modal có thể gọi showDialog khi đang mở. */
export function DialogOutlet() {
  const ctx = useContext(DialogOutletContext);
  const [id] = useState(() => nextOutletId++);
  const register = ctx?.register;
  const unregister = ctx?.unregister;

  useEffect(() => {
    if (!register || !unregister) return;
    register(id);
    return () => unregister(id);
  }, [id, register, unregister]);

  if (!ctx || ctx.topOutlet !== id) return null;
  return <View style={StyleSheet.absoluteFill}>{ctx.dialog}</View>;
}

/** Dùng cho onRequestClose của Modal chứa outlet: nút back Android đóng hộp thoại trước. */
export function useDismissDialog() {
  const ctx = useContext(DialogOutletContext);
  return useCallback(() => ctx?.dismiss() ?? false, [ctx]);
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const [outlets, setOutlets] = useState<number[]>([]);

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

  const cancelBtn = useMemo(() => config?.buttons.find((b) => b.style === 'cancel'), [config]);

  const dismiss = useCallback(() => {
    if (!visible) return false;
    if (cancelBtn) handlePress(cancelBtn);
    else setVisible(false);
    return true;
  }, [visible, cancelBtn, handlePress]);

  const register = useCallback((id: number) => {
    setOutlets((prev) => [...prev, id]);
  }, []);

  const unregister = useCallback((id: number) => {
    setOutlets((prev) => prev.filter((o) => o !== id));
  }, []);

  const dialogContent = useMemo(() => {
    if (!visible) return null;
    const actionBtns = config?.buttons.filter((b) => b.style !== 'cancel') ?? [];
    return (
      <Pressable style={styles.overlay} onPress={() => dismiss()}>
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
    );
  }, [visible, config, cancelBtn, styles, dismiss, handlePress]);

  const topOutlet = outlets.length > 0 ? outlets[outlets.length - 1] : null;
  const outletValue = useMemo(
    () => ({ topOutlet, register, unregister, dismiss, dialog: dialogContent }),
    [topOutlet, register, unregister, dismiss, dialogContent],
  );
  const dialogValue = useMemo(() => ({ showDialog }), [showDialog]);

  return (
    <DialogContext.Provider value={dialogValue}>
      <DialogOutletContext.Provider value={outletValue}>
        {children}
        <Modal
          visible={visible && topOutlet === null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            dismiss();
          }}
        >
          {dialogContent}
        </Modal>
      </DialogOutletContext.Provider>
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
      fontFamily: FontFamily.bold,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    message: {
      fontSize: FontSize.md,
      fontFamily: FontFamily.regular,
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
      fontFamily: FontFamily.semibold,
    },
    cancelText: {
      color: colors.textSecondary,
    },
    actionText: {
      color: colors.text,
    },
  });
