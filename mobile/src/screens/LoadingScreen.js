import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import IntelliFlowLogo from '../components/brand/IntelliFlowLogo';
import { responsiveFont, responsiveLineHeight } from '../theme/theme';

export default function LoadingScreen({ label = 'Preparing your supply-chain workspace...', mode = 'light' }) {
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((current) => (current >= 90 ? 32 : current + 8));
    }, 220);
    return () => clearInterval(timer);
  }, []);

  const isDark = mode === 'dark';

  return (
    <View style={[styles.wrap, { backgroundColor: isDark ? '#130f0c' : '#f6f0e8' }]}>
      <IntelliFlowLogo size="lg" centerAligned variant={isDark ? 'light' : 'dark'} />
      <Text style={[styles.label, { color: isDark ? '#fff7f0' : '#24160f' }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(74,51,35,0.08)' }]}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
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
  },
  label: {
    fontSize: responsiveFont(15),
    lineHeight: responsiveLineHeight(15, 1.55),
    textAlign: 'center',
  },
  track: {
    width: '76%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ff7b35',
  },
});
