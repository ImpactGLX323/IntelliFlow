import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import IntelliFlowLogo from '../brand/IntelliFlowLogo';
import { responsiveFont } from '../../theme/theme';

export default function MobileHeader({
  left,
  right,
  subtitle,
  onLogoPress,
  theme,
}) {
  const isDark = theme?.mode === 'dark';
  return (
    <View style={[styles.wrap, { backgroundColor: isDark ? '#2c1d15' : '#fffaf5', borderBottomColor: isDark ? 'rgba(236,207,181,0.14)' : 'rgba(111,79,52,0.1)' }]}>
      <View style={styles.row}>
        <View style={styles.side}>{left}</View>
        <Pressable onPress={onLogoPress} style={styles.center}>
          <IntelliFlowLogo size="md" centerAligned variant={isDark ? 'light' : 'dark'} />
        </Pressable>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,239,226,0.58)' : 'rgba(36,22,15,0.58)' }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(111,79,52,0.1)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    minWidth: 56,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: responsiveFont(12),
    color: 'rgba(36,22,15,0.58)',
    marginTop: 2,
  },
});
