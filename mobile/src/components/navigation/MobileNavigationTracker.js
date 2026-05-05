import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { responsiveFont } from '../../theme/theme';

export default function MobileNavigationTracker({ items, activeKey, onSelect, detail, theme }) {
  const isDark = theme?.mode === 'dark';
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect?.(item.routeName)}
              style={[
                styles.chip,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(74,51,35,0.06)', borderColor: isDark ? 'rgba(236,207,181,0.12)' : 'rgba(111,79,52,0.12)' },
                active && styles.chipActive,
              ]}
            >
              <Text style={[styles.chipText, { color: isDark ? 'rgba(255,239,226,0.72)' : 'rgba(36,22,15,0.72)' }, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {detail ? <Text style={[styles.detail, { color: isDark ? 'rgba(255,239,226,0.54)' : 'rgba(36,22,15,0.54)' }]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  row: {
    gap: 10,
    paddingRight: 16,
  },
  chip: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(111,79,52,0.12)',
  },
  chipActive: {
    backgroundColor: '#ff7b35',
    borderColor: '#ff7b35',
  },
  chipText: {
    fontSize: responsiveFont(12),
    fontWeight: '700',
    color: 'rgba(36,22,15,0.72)',
  },
  chipTextActive: {
    color: '#fff7f0',
  },
  detail: {
    fontSize: responsiveFont(12),
    color: 'rgba(36,22,15,0.54)',
  },
});
