import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getAppTheme, responsiveFont, responsiveLineHeight } from '../theme/theme';

export default function ServiceUnavailableScreen({ onRetry, onPreview, previewEnabled = false, mode = 'dark' }) {
  const theme = getAppTheme(mode);
  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.panel, borderColor: theme.border }]}>
        <Text style={[styles.eyebrow, { color: theme.accentSoft }]}>Service status</Text>
        <Text style={[styles.title, { color: theme.text }]}>IntelliFlow service is temporarily unavailable.</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>IntelliFlow is having trouble reaching the service. Please try again.</Text>
        <View style={styles.actions}>
          <Pressable onPress={onRetry} style={[styles.button, { backgroundColor: theme.accentStrong }]}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
          {previewEnabled ? (
            <Pressable onPress={onPreview} style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border }]}>
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Continue in Preview Mode</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
  },
  eyebrow: {
    fontSize: responsiveFont(12),
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: responsiveFont(28),
    lineHeight: responsiveLineHeight(28, 1.2),
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    fontSize: responsiveFont(16),
    lineHeight: responsiveLineHeight(16, 1.5),
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#fff7f0',
    fontSize: responsiveFont(16),
    fontWeight: '700',
  },
  secondaryButtonText: {
    fontSize: responsiveFont(16),
    fontWeight: '700',
  },
});
