import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface ScalePressableProps extends PressableProps {
  scaleTo?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  haptic?: Haptics.ImpactFeedbackStyle;
}

// Style and transform must live on the same view: an absolutely positioned
// `style` on an inner wrapper collapses the Pressable's touch area to 0px.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ScalePressable: React.FC<ScalePressableProps> = ({
  children,
  scaleTo = 0.96,
  duration = 100,
  style,
  onPress,
  onPressIn,
  onPressOut,
  haptic = Haptics.ImpactFeedbackStyle.Light,
  ...props
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: GestureResponderEvent) => {
    if (haptic) {
      Haptics.impactAsync(haptic);
    }
    Animated.timing(scale, {
      toValue: scaleTo,
      duration: duration,
      useNativeDriver: true,
    }).start();
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      {...props}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
};

export default ScalePressable;
