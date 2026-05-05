import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { getAppTheme, responsiveFont } from '../../theme/theme';

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon,
  accessibilityLabel,
  style,
  textStyle,
  theme,
}) {
  const isInactive = disabled || loading;
  const activeTheme = theme || getAppTheme('dark');
  const palette = getVariantPalette(activeTheme, variant);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || title}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        pressed && !isInactive && styles.pressed,
        isInactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.textColor} />
      ) : (
        <>
          {icon ? <Text style={[styles.icon, { color: palette.textColor }]}>{icon}</Text> : null}
          <Text style={[styles.text, { color: palette.textColor }, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    fontSize: responsiveFont(15),
    fontWeight: '700',
  },
  icon: {
    fontSize: responsiveFont(15),
    fontWeight: '700',
  },
});

function getVariantPalette(theme, variant) {
  const palettes = {
    primary: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
      textColor: '#fff7f0',
    },
    secondary: {
      backgroundColor: theme.panelGlass,
      borderColor: theme.border,
      textColor: theme.text,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: theme.border,
      textColor: theme.text,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: theme.text,
    },
    danger: {
      backgroundColor: theme.danger,
      borderColor: theme.danger,
      textColor: '#fff7f0',
    },
    plan: {
      backgroundColor: theme.accentSecondary,
      borderColor: theme.accentSecondary,
      textColor: '#fff7f0',
    },
  };

  return palettes[variant] || palettes.primary;
}
