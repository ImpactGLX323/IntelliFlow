import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import IntelliFlowLogo from '../components/brand/IntelliFlowLogo';
import { responsiveFont, responsiveLineHeight } from '../theme/theme';

const appIcon = require('../../assets/icon.png');

export default function LoadingScreen({ label = 'Preparing your supply-chain workspace...', mode = 'light' }) {
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((current) => (current >= 90 ? 32 : current + 8));
    }, 220);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.wrap}>
      <IntelliFlowLogo size="lg" centerAligned variant="light" />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.iconBadge}>
        <Image source={appIcon} resizeMode="contain" style={styles.iconImage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
    backgroundColor: '#84481f',
  },
  label: {
    fontSize: responsiveFont(15),
    lineHeight: responsiveLineHeight(15, 1.55),
    textAlign: 'center',
    color: '#fff7f0',
  },
  track: {
    width: '76%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ffb454',
  },
  iconBadge: {
    marginTop: 4,
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  iconImage: {
    width: 28,
    height: 28,
  },
});
