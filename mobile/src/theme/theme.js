import { Dimensions } from 'react-native';

import { darkColors, lightColors } from './colors';

const BASE_WIDTH = 390;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function responsiveFont(size, options = {}) {
  const width = Dimensions.get('window').width;
  const scale = clamp(width / BASE_WIDTH, 0.9, 1.12);
  const raw = size * scale;
  const min = options.min ?? size * 0.92;
  const max = options.max ?? size * 1.14;
  return Math.round(clamp(raw, min, max));
}

export function responsiveLineHeight(size, multiplier = 1.4) {
  return Math.round(responsiveFont(size) * multiplier);
}

export function getAppTheme(mode = 'dark') {
  const base = mode === 'light' ? lightColors : darkColors;
  const isDark = base.mode === 'dark';

  return {
    ...base,
    bg: base.background,
    panel: base.surface,
    panelSoft: base.surfaceElevated,
    panelGlass: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(74, 51, 35, 0.06)',
    chip: base.accent,
    chipText: '#fff7f0',
    textSoft: base.textSecondary,
    accentStrong: '#f69832',
  };
}
