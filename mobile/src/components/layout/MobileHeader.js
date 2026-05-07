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
  return (
    <View style={[styles.wrap, { backgroundColor: theme?.header || '#84481f' }]}>
      <View style={styles.row}>
        <View style={styles.side}>{left}</View>
        <Pressable onPress={onLogoPress} style={styles.center}>
          <IntelliFlowLogo size="md" centerAligned variant="light" />
        </Pressable>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 220, 186, 0.14)',
    backgroundColor: '#84481f',
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
    color: 'rgba(255, 244, 234, 0.72)',
    marginTop: 2,
  },
});
