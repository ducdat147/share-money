import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getInitials } from '@/utils/calculator';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppText } from '@/components/ui';

interface UserAvatarProps {
  name: string;
  size?: number;
  isTreasurer?: boolean;
  style?: ViewStyle;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ name, size = 36, isTreasurer, style }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const initials = useMemo(() => getInitials(name), [name]);

  const fontSize = size * 0.4;
  const badgeSize = size * 0.4;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <AppText weight="bold" color={colors.onAvatar} style={{ fontSize }}>
        {initials}
      </AppText>

      {isTreasurer && (
        <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
          <Ionicons name="wallet" size={badgeSize * 0.7} color={colors.onAccent} />
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      backgroundColor: colors.avatar,
    },
    badge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
  });

export default React.memo(UserAvatar);
