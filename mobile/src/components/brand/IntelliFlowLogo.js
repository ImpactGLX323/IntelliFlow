import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const logo = require('../../../assets/logo/intelliflow-logo.png');

const SIZE_MAP = {
  sm: { width: 92, height: 26 },
  md: { width: 142, height: 40 },
  lg: { width: 196, height: 56 },
};

export default function IntelliFlowLogo({
  size = 'md',
  variant = 'default',
  centerAligned = false,
  style,
  imageStyle,
}) {
  const dimensions = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <View
      style={[
        styles.wrap,
        centerAligned && styles.center,
        variant === 'light' && styles.lightWrap,
        variant === 'dark' && styles.darkWrap,
        { width: dimensions.width, height: dimensions.height },
        style,
      ]}
    >
      <Image
        source={logo}
        resizeMode="contain"
        style={[{ width: dimensions.width, height: dimensions.height }, imageStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
  },
  center: {
    alignSelf: 'center',
    alignItems: 'center',
  },
  lightWrap: {},
  darkWrap: {},
});
