import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getAppTheme } from '../../theme/theme';

export default function AppCard({
  children,
  variant = 'default',
  size = 'md',
  pressable = false,
  selected = false,
  disabled = false,
  onPress,
  style,
  theme,
}) {
  const activeTheme = theme || getAppTheme('dark');
  const palette = getVariantPalette(activeTheme, variant);

  const content = (
    <View
      style={[
        styles.base,
        sizeStyles[size] || sizeStyles.md,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!pressable) {
    return content;
  }

  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  selected: {
    borderColor: '#ff7b35',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});

const sizeStyles = StyleSheet.create({
  sm: { padding: 12 },
  md: { padding: 16 },
  lg: { padding: 20 },
});

function getVariantPalette(theme, variant) {
  const palettes = {
    default: {
      backgroundColor: theme.panel,
      borderColor: theme.border,
    },
    muted: {
      backgroundColor: theme.panelSoft,
      borderColor: theme.border,
    },
    accent: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    dark: {
      backgroundColor: theme.mode === 'dark' ? theme.panel : '#1b1411',
      borderColor: theme.border,
    },
    glass: {
      backgroundColor: theme.panelGlass,
      borderColor: theme.border,
    },
  };

  return palettes[variant] || palettes.default;
}
