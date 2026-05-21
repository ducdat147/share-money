import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getInitials, getMemberColor } from '@/utils/calculator';
import { ThemeColors, FontSize, FontWeight } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

interface UserAvatarProps {
  name: string;
  size?: number;
  isTreasurer?: boolean;
  style?: ViewStyle;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ name, size = 36, isTreasurer, style }) => {
  const { colors } = useAppTheme();
  const initials = useMemo(() => getInitials(name), [name]);
  const backgroundColor = useMemo(() => getMemberColor(name), [name]);
  
  const fontSize = size * 0.4;
  const badgeSize = size * 0.4;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor }, style]}>
      <Text style={[styles.initials, { fontSize, color: '#fff' }]}>{initials}</Text>
      
      {isTreasurer && (
        <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: colors.accent }]}>
          <Ionicons name="wallet" size={badgeSize * 0.7} color="#fff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  initials: {
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});

export default React.memo(UserAvatar);
