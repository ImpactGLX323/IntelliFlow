import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { api, demoBootstrap, demoLogin, getPublicAppConfig, healthCheck } from './api';
import { getLoginErrorMessage, getRegisterErrorMessage, getResetPasswordErrorMessage } from './authMessages';
import IntelliFlowLogo from './components/brand/IntelliFlowLogo';
import MobileHeader from './components/layout/MobileHeader';
import MobileNavigationTracker from './components/navigation/MobileNavigationTracker';
import AppButton from './components/ui/AppButton';
import AppCard from './components/ui/AppCard';
import { getApiBaseUrl } from './config/api';
import { previewData } from './data/previewData';
import { auth, firebaseConfigReady } from './firebase';
import { getNavigationItemByRoute, navigationItems } from './navigation/navigationConfig';
import LoadingScreen from './screens/LoadingScreen';
import ServiceUnavailableScreen from './screens/ServiceUnavailableScreen';
import { getAppTheme, responsiveFont, responsiveLineHeight } from './theme/theme';
import { integrationTruthLabels, toPreviewBadgeLabel } from './types/integrations';

let theme = getAppTheme('light');
let styles = createStyles(theme);

const SCREENS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'Products' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'sales', label: 'Sales' },
  { key: 'purchasing', label: 'Purchasing' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'returns', label: 'Returns' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'einvoicing', label: 'E-Invoicing' },
  { key: 'copilot', label: 'AI Copilot' },
  { key: 'plans', label: 'Plans' },
  { key: 'account', label: 'Profile' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'manufacturing', label: 'Manufacturing' },
];

const PRIMARY_TABS = [
  { key: 'dashboard', label: 'Overview', icon: '[]' },
  { key: 'inventory', label: 'Inventory', icon: '()' },
  { key: 'sales', label: 'Sales', icon: '$$' },
  { key: 'copilot', label: 'Copilot', icon: '**' },
  { key: 'account', label: 'Profile', icon: '@@' },
];

const PLANS = ['FREE', 'PREMIUM', 'BOOST'];

const COPILOT_PROMPTS = [
  'What products are low on stock?',
  'What are my best-selling products this week?',
  'Which products are leaking profit due to returns?',
  'Any delayed shipments?',
  'What does Malaysian customs law say about import documentation?',
];

const PLAN_MATRIX = [
  {
    label: 'Stock position and low-stock monitoring',
    free: true,
    premium: true,
    boost: true,
  },
  {
    label: 'Sales and returns intelligence',
    free: false,
    premium: true,
    boost: true,
  },
  {
    label: 'Basic RAG compliance answers',
    free: false,
    premium: true,
    boost: true,
  },
  {
    label: 'Logistics control tower and port pressure',
    free: false,
    premium: false,
    boost: true,
  },
  {
    label: 'MCP agent recommendations',
    free: false,
    premium: false,
    boost: true,
  },
];

const NOTIFICATION_CATEGORY_COPY = {
  low_stock: 'Low stock',
  stock_received: 'Stock received',
  stock_adjusted: 'Stock adjusted',
  stock_deducted: 'Stock deducted',
  account_system_alerts: 'Account and system alerts',
  sales_order_alerts: 'Sales order alerts',
  purchase_order_due_overdue: 'Purchase order due or overdue',
  reorder_suggestions: 'Reorder suggestions',
  return_spike: 'Return spike',
  profit_leakage: 'Profit leakage',
  weekly_operations_summary: 'Weekly operations summary',
  basic_rag_alerts: 'Basic RAG alerts',
  shipment_delayed: 'Shipment delayed',
  customs_hold: 'Customs hold',
  port_pressure_high: 'Port pressure high',
  route_risk_increased: 'Route risk increased',
  supplier_risk_warning: 'Supplier risk warning',
  ai_recommendation_created: 'AI recommendation created',
  compliance_risk_detected: 'Compliance risk detected',
  approval_required: 'Approval required',
  daily_operations_brief: 'Daily operations brief',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function displayDate(value) {
  if (!value) {
    return 'N/A';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function money(value) {
  const num = Number(value || 0);
  return `$${num.toFixed(2)}`;
}

const INDO_PACIFIC_BOUNDS = {
  minLat: -12,
  maxLat: 26,
  minLng: 82,
  maxLng: 125,
};

function maybeNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPassword = (value) =>
  value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);

function toDisplayPlan(plan) {
  if ((plan || '').toUpperCase() === 'PRO') {
    return 'PREMIUM';
  }
  return plan || 'FREE';
}

function summarizeFlow(flow) {
  const features = flow?.geojson?.features || [];
  return {
    ports: features.filter((item) => item?.properties?.kind === 'malaysia_port'),
    lanes: features.filter((item) => item?.properties?.kind === 'shipping_lane'),
    clusters: features.filter((item) => item?.properties?.kind === 'vessel_cluster'),
  };
}

function projectFlowPoint([lng, lat], width, height) {
  const x = ((lng - INDO_PACIFIC_BOUNDS.minLng) / (INDO_PACIFIC_BOUNDS.maxLng - INDO_PACIFIC_BOUNDS.minLng)) * width;
  const y =
    height -
    ((lat - INDO_PACIFIC_BOUNDS.minLat) / (INDO_PACIFIC_BOUNDS.maxLat - INDO_PACIFIC_BOUNDS.minLat)) * height;

  return { x, y };
}

function AppBackdrop() {
  return <View pointerEvents="none" style={styles.backdrop} />;
}

function ScreenTopBar({ title, leftLabel = '<', rightLabel = '...', onLeftPress, onRightPress }) {
  return (
    <View style={styles.screenTopBar}>
      <Pressable onPress={onLeftPress} style={styles.screenTopBarButton}>
        <Text style={styles.screenTopBarButtonText}>{leftLabel}</Text>
      </Pressable>
      <Text style={styles.screenTopBarTitle}>{title}</Text>
      <Pressable onPress={onRightPress} style={styles.screenTopBarButton}>
        <Text style={styles.screenTopBarButtonText}>{rightLabel}</Text>
      </Pressable>
    </View>
  );
}

function AppShowcaseCard({ title, body, accent = 'orange', children }) {
  const onDarkSurface = theme.mode === 'dark' || accent === 'blue';
  return (
    <View style={[styles.showcaseCard, accent === 'blue' && styles.showcaseCardBlue]}>
      <Text style={[styles.showcaseTitle, onDarkSurface && styles.showcaseTitleOnDark]}>{title}</Text>
      {body ? <Text style={[styles.showcaseBody, onDarkSurface && styles.showcaseBodyOnDark]}>{body}</Text> : null}
      {children}
    </View>
  );
}

function ProductTile({ product }) {
  return (
    <View style={styles.productTile}>
      <Text style={styles.productTileCategory}>{product.category || 'General'}</Text>
      <View style={styles.productVisualWrap}>
        <View style={styles.productVisual} />
      </View>
      <Text style={styles.productTileSku}>{product.sku}</Text>
        <Text style={styles.productTileName}>{product.name}</Text>
      <View style={styles.productTileFooter}>
        <Text style={[styles.productTilePrice, theme.mode !== 'dark' && styles.productTilePriceLight]}>{money(product.price)}</Text>
        <View
          style={[
            styles.productTileStockDot,
            product.current_stock <= product.min_stock_threshold && styles.productTileStockDotWarn,
          ]}
        />
      </View>
    </View>
  );
}

function BottomTabBar({ activeScreen, onSelect }) {
  return (
    <View style={styles.bottomTabShell}>
      {PRIMARY_TABS.map((tab) => {
        const active = tab.key === activeScreen;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={[styles.bottomTabItem, active && styles.bottomTabItemActive]}
          >
            <Text style={[styles.bottomTabIcon, active && styles.bottomTabIconActive]}>{tab.icon}</Text>
            <Text style={[styles.bottomTabLabel, active && styles.bottomTabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ActionButton({ title, onPress, tone = 'primary', disabled = false }) {
  return <AppButton title={title} onPress={onPress} variant={tone === 'secondary' ? 'secondary' : 'primary'} disabled={disabled} theme={theme} />;
}

function Panel({ title, subtitle, right, children }) {
  return (
    <AppCard variant={theme.mode === 'dark' ? 'dark' : 'default'} size="md" style={styles.panel} theme={theme}>
      {(title || subtitle || right) ? (
        <View style={styles.panelHeader}>
          <View style={styles.panelHeaderCopy}>
            {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
            {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
          </View>
          {right ? <View>{right}</View> : null}
        </View>
      ) : null}
      {children}
    </AppCard>
  );
}

function MetricCard({ label, value, tone = 'default' }) {
  return (
    <View style={[styles.metricCard, tone === 'accent' && styles.metricCardAccent]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function CapabilityDot({ enabled }) {
  return (
    <View style={[styles.capabilityDot, enabled ? styles.capabilityDotEnabled : styles.capabilityDotDisabled]}>
      <Text style={[styles.capabilityDotText, enabled ? styles.capabilityDotTextEnabled : styles.capabilityDotTextDisabled]}>
        {enabled ? '✓' : '×'}
      </Text>
    </View>
  );
}

function CapabilityMatrix({ currentPlan, capabilities }) {
  return (
    <View style={styles.capabilityMatrix}>
      <View style={styles.capabilityMatrixHeader}>
        <Text style={styles.capabilityMatrixTitle}>Plan benefits</Text>
        <Text style={styles.capabilityMatrixMeta}>Current plan: {toDisplayPlan(currentPlan || capabilities?.plan_level || 'FREE')}</Text>
      </View>
      <View style={styles.capabilityTable}>
        <View style={styles.capabilityTableHeader}>
          <Text style={[styles.capabilityTableHeaderText, styles.capabilityFeatureCell]}>Capability</Text>
          <Text style={styles.capabilityTableHeaderText}>Free</Text>
          <Text style={styles.capabilityTableHeaderText}>Premium</Text>
          <Text style={styles.capabilityTableHeaderText}>Boost</Text>
        </View>
        {PLAN_MATRIX.map((item) => (
          <View key={item.label} style={styles.capabilityTableRow}>
            <Text style={[styles.capabilityRowLabel, styles.capabilityFeatureCell]}>{item.label}</Text>
            <CapabilityDot enabled={item.free} />
            <CapabilityDot enabled={item.premium} />
            <CapabilityDot enabled={item.boost} />
          </View>
        ))}
      </View>
      <View style={styles.allowedDomainWrap}>
        <Text style={styles.allowedDomainLabel}>Unlocked domains</Text>
        <View style={styles.chipRow}>
          {(capabilities?.allowed_domains?.length ? capabilities.allowed_domains : ['inventory']).map((domain) => (
            <Chip key={domain} label={domain} active />
          ))}
        </View>
      </View>
    </View>
  );
}

function ShipFlowMapPanel({ flow }) {
  const { width } = useWindowDimensions();
  const summary = summarizeFlow(flow);
  const mapWidth = Math.min(width - 64, 420);
  const mapHeight = Math.round(mapWidth * 0.72);
  const tick = Date.now() % 1000;

  const segments = summary.lanes.flatMap((lane) => {
    const coords = lane.geometry.coordinates;
    return coords.slice(1).map((coord, index) => {
      const start = projectFlowPoint(coords[index], mapWidth, mapHeight);
      const end = projectFlowPoint(coord, mapWidth, mapHeight);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      return {
        key: `${lane.properties.route_name}-${index}`,
        left: start.x,
        top: start.y,
        width: Math.hypot(dx, dy),
        angle: Math.atan2(dy, dx),
      };
    });
  });

  const dots = summary.lanes.map((lane, index) => {
    const progress = ((tick / 1000) + index * 0.19) % 1;
    const coords = lane.geometry.coordinates;
    if (!coords.length) {
      return null;
    }
    const pointIndex = Math.min(coords.length - 1, Math.floor(progress * coords.length));
    const point = projectFlowPoint(coords[pointIndex], mapWidth, mapHeight);
    return { key: lane.properties.route_name, ...point };
  }).filter(Boolean);

  return (
    <View style={[styles.shipFlowMapShell, { height: mapHeight + 76 }]}>
      <View style={[styles.shipFlowMapBoard, { width: mapWidth, height: mapHeight }]}>
        <View style={styles.shipFlowMapGrid} />
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.shipFlowSegment,
              {
                left: segment.left,
                top: segment.top,
                width: segment.width,
                transform: [{ rotate: `${segment.angle}rad` }],
              },
            ]}
          />
        ))}
        {summary.ports.map((feature) => {
          const point = projectFlowPoint(feature.geometry.coordinates, mapWidth, mapHeight);
          const status = feature.properties.pressure_status;
          const style =
            status === 'CRITICAL'
              ? styles.shipFlowPortCritical
              : status === 'HIGH'
                ? styles.shipFlowPortHigh
                : status === 'MEDIUM'
                  ? styles.shipFlowPortMedium
                  : styles.shipFlowPortLow;
          return (
            <View
              key={feature.properties.port_code}
              style={[
                styles.shipFlowPort,
                style,
                {
                  left: point.x - 7,
                  top: point.y - 7,
                },
              ]}
            />
          );
        })}
        {dots.map((dot) => (
          <View
            key={dot.key}
            style={[
              styles.shipFlowDot,
              {
                left: dot.x - 4,
                top: dot.y - 4,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.shipFlowLegend}>
        <Text style={styles.shipFlowLegendTitle}>Legend</Text>
        <View style={styles.shipFlowLegendRow}>
          <View style={[styles.shipFlowLegendSwatch, styles.shipFlowPortLow]} />
          <Text style={styles.shipFlowLegendText}>Low</Text>
          <View style={[styles.shipFlowLegendSwatch, styles.shipFlowPortMedium]} />
          <Text style={styles.shipFlowLegendText}>Medium</Text>
          <View style={[styles.shipFlowLegendSwatch, styles.shipFlowPortHigh]} />
          <Text style={styles.shipFlowLegendText}>High</Text>
          <View style={[styles.shipFlowLegendSwatch, styles.shipFlowPortCritical]} />
          <Text style={styles.shipFlowLegendText}>Critical</Text>
        </View>
      </View>
    </View>
  );
}

function Chip({ label, active = false, tone = 'default', onPress, variant = 'default' }) {
  const isAuth = variant === 'auth';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        isAuth && styles.authChip,
        active && styles.chipActive,
        active && isAuth && styles.authChipActive,
        tone === 'warning' && styles.chipWarning,
        tone === 'success' && styles.chipSuccess,
      ]}
    >
      <Text style={[styles.chipText, isAuth && styles.authChipText, active && styles.chipTextActive, active && isAuth && styles.authChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function InlineValue({ label, value }) {
  return (
    <View style={styles.inlineValue}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <Text style={styles.inlineText}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  secureTextEntry = false,
  variant = 'default',
}) {
  const isAuth = variant === 'auth';
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, isAuth && styles.authFieldLabel]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isAuth ? 'rgba(255,255,255,0.34)' : theme.textSoft}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        style={[styles.input, isAuth && styles.authInput, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function AuthActionButton({ title, onPress, secondary = false, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.authActionButton,
        secondary ? styles.authActionButtonSecondary : styles.authActionButtonPrimary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.authActionButtonPressed,
      ]}
    >
      <Text style={[styles.authActionButtonText, secondary && styles.authActionButtonTextSecondary]}>{title}</Text>
    </Pressable>
  );
}

function ErrorBanner({ message }) {
  if (!message) {
    return null;
  }
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function EmptyState({ title, body }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function LoadingBlock() {
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator color={theme.accentSoft} />
    </View>
  );
}

function JsonPreview({ data }) {
  return (
    <ScrollView horizontal style={styles.jsonWrap}>
      <Text style={styles.jsonText}>{JSON.stringify(data, null, 2)}</Text>
    </ScrollView>
  );
}

function PlanNotice({ requiredPlan, body }) {
  return (
    <Panel title={`${requiredPlan} feature`} subtitle={body}>
      <Text style={styles.planNoticeText}>
        This view is available on {requiredPlan}. Backend permission checks still apply if the app tries to call a locked route.
      </Text>
    </Panel>
  );
}

function SetupScreen({
  draft,
  setDraft,
  error,
  status,
  loading,
  authMode,
  setAuthMode,
  onConnect,
  onDemoLogin,
  appConfig,
}) {
  const isWelcome = authMode === 'welcome';
  const isRegister = authMode === 'register';
  const isReset = authMode === 'reset';
  const isLogin = authMode === 'login';

  return (
    <ScrollView contentContainerStyle={styles.setupWrap}>
      <View style={styles.authScreen}>
        <View style={styles.authTopRow}>
          <View />
          {isWelcome ? (
            <View />
          ) : (
            <Pressable onPress={() => setAuthMode(isRegister ? 'login' : 'register')} style={styles.authTopLink}>
              <Text style={styles.authTopLinkText}>{isRegister ? 'Sign in' : 'Sign up'}</Text>
            </Pressable>
          )}
        </View>

        {isWelcome ? (
          <View style={styles.authWelcomeShell}>
            <View style={styles.authWelcomeSpacer} />
            <View style={styles.authWelcomeFooter}>
              <IntelliFlowLogo size="sm" variant="light" />
              <Text style={styles.authWelcomeHeadline}>AI inventory, logistics, and compliance control for modern operations</Text>
            </View>
          </View>
        ) : (
          <View style={styles.authFormHero}>
            <View style={styles.authLogoStage}>
              <View style={styles.authLogoPlateBack} />
              <View style={styles.authLogoPlateFront}>
                <IntelliFlowLogo size="md" centerAligned variant="light" />
              </View>
            </View>
          </View>
        )}

        <View style={[styles.authCard, isWelcome ? styles.authCardWelcome : styles.authCardForm]}>
          {isWelcome ? (
            <>
              <Text style={styles.authWelcomeBody}>
                Expertise meets precision for inventory, logistics, compliance, and supply-flow intelligence.
              </Text>
              <View style={styles.authWelcomeActions}>
                <AuthActionButton title="Sign up" onPress={() => setAuthMode('register')} />
                <AuthActionButton title="I have an account" onPress={() => setAuthMode('login')} secondary />
              </View>
              {appConfig?.demo_mode_enabled && appConfig?.auth_mode === 'hybrid' ? (
                <Pressable onPress={onDemoLogin} style={styles.authInlineMetaButton}>
                  <Text style={styles.authInlineMetaButtonText}>Continue demo workspace</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.authCardTitle}>
                {isRegister ? 'Sign up for IntelliFlow' : isReset ? 'Reset your password' : 'Sign in to IntelliFlow'}
              </Text>
              <Text style={styles.authCardSubtitle}>
                {isRegister
                  ? 'Create the same Firebase-backed account you use on web and mobile.'
                  : isReset
                    ? 'Enter your email and we will send you a reset link.'
                    : 'Use your IntelliFlow account to continue.'}
              </Text>
              {!firebaseConfigReady ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>
                    Firebase mobile config is missing. Run `npm run generate:firebase-config` in `mobile/` after adding Firebase env values.
                  </Text>
                </View>
              ) : null}
              {isRegister ? (
                <Field
                  label="Full name"
                  value={draft.fullName}
                  onChangeText={(value) => setDraft((current) => ({ ...current, fullName: value }))}
                  placeholder="Enter your full name"
                  variant="auth"
                />
              ) : null}
              <Field
                label="Email address"
                value={draft.email}
                onChangeText={(value) => setDraft((current) => ({ ...current, email: value }))}
                placeholder="Enter your email"
                variant="auth"
              />
              {!isReset ? (
                <Field
                  label="Password"
                  value={draft.password}
                  onChangeText={(value) => setDraft((current) => ({ ...current, password: value }))}
                  placeholder={isRegister ? 'Create password' : 'Enter your password'}
                  secureTextEntry
                  variant="auth"
                />
              ) : null}
              {isRegister ? (
                <Field
                  label="Confirm password"
                  value={draft.confirmPassword}
                  onChangeText={(value) => setDraft((current) => ({ ...current, confirmPassword: value }))}
                  placeholder="Confirm your password"
                  secureTextEntry
                  variant="auth"
                />
              ) : null}
              {isLogin ? (
                <Pressable onPress={() => setAuthMode('reset')} style={styles.forgotPasswordLink}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </Pressable>
              ) : null}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, styles.authFieldLabel]}>Requested plan</Text>
                <View style={styles.chipRow}>
                  {PLANS.map((plan) => (
                    <Chip
                      key={plan}
                      label={plan}
                      active={draft.plan === plan}
                      variant="auth"
                      onPress={() => setDraft((current) => ({ ...current, plan }))}
                    />
                  ))}
                </View>
              </View>
              <ErrorBanner message={error} />
              {status ? (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>{status}</Text>
                </View>
              ) : null}
              <AuthActionButton
                title={
                  loading
                    ? isRegister
                      ? 'Creating account...'
                      : isReset
                        ? 'Sending reset link...'
                        : 'Login...'
                    : isRegister
                      ? 'Continue'
                      : isReset
                        ? 'Send reset link'
                        : 'Login'
                }
                onPress={onConnect}
                disabled={loading || !firebaseConfigReady}
              />
              <Pressable onPress={() => setAuthMode('welcome')} style={styles.authBackLink}>
                <Text style={styles.authBackLinkText}>Back to startup</Text>
              </Pressable>
              {isRegister ? (
                <Text style={styles.authBottomMeta}>Already have an account? Use Sign in.</Text>
              ) : isReset ? (
                <Text style={styles.authBottomMeta}>Remembered your password? Go back and sign in.</Text>
              ) : (
                <Text style={styles.authBottomMeta}>New to IntelliFlow? Choose Sign up and use the same account on web and mobile.</Text>
              )}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function PreviewModeScreen({ onRetry }) {
  return (
    <ScrollView contentContainerStyle={styles.setupWrap}>
      <View style={styles.landingHeader}>
        <Text style={styles.landingBrand}>IntelliFlow</Text>
      </View>

      <Panel title="Preview Mode" subtitle="Backend unavailable. This view is sample data only.">
        <View style={styles.metricGrid}>
          <MetricCard label="Products" value={String(previewData.inventorySummary.total_products)} />
          <MetricCard label="Orders" value={String(previewData.inventorySummary.total_orders)} />
          <MetricCard label="Low-stock alerts" value={String(previewData.inventorySummary.low_stock_alerts)} tone="accent" />
          <MetricCard label="Ports monitored" value={String(previewData.logistics.monitored_ports)} />
        </View>
        <Text style={styles.rowBody}>
          {previewData.copilot.answer}
        </Text>
        <View style={styles.listBlock}>
          {previewData.copilot.recommendations.map((item) => (
            <Text key={item} style={styles.listItem}>• {item}</Text>
          ))}
        </View>
        <ActionButton title="Retry service connection" onPress={onRetry} />
      </Panel>
    </ScrollView>
  );
}

function DashboardScreen({ session, currentUser, sessionPlan }) {
  const [dashboard, setDashboard] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [delayed, setDelayed] = useState([]);
  const [integrationRegistry, setIntegrationRegistry] = useState([]);
  const [warehousePreview, setWarehousePreview] = useState([]);
  const [demandSignals, setDemandSignals] = useState([]);
  const [bnmRates, setBnmRates] = useState(null);
  const [marketplaceProviders, setMarketplaceProviders] = useState([]);
  const [marketIntelligence, setMarketIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardData, recommendationData, delayedData, registryData, warehouseData, demandData, bnmData] = await Promise.all([
        api.getDashboard(session),
        api.getRecommendations(session, { limit: 4 }),
        api.getDelayedShipments(session).catch(() => []),
        api.getIntegrationsRegistry(session),
        api.getMalaysiaWarehouses(session, { source: 'seeded', limit: 4 }),
        api.getMalaysiaDemandSignals(session, { source: 'preview' }),
        api.getBnmRates(session, { currency: 'USD' }),
      ]);
      setDashboard(dashboardData);
      setRecommendations(recommendationData);
      setDelayed(delayedData);
      setIntegrationRegistry(registryData?.providers || []);
      setWarehousePreview(warehouseData?.items || []);
      setDemandSignals(demandData?.items || []);
      setBnmRates(bnmData);
      if (sessionPlan !== 'FREE') {
        const providerData = await api.getMarketplaceProviders(session).catch(() => ({ providers: [] }));
        setMarketplaceProviders(providerData?.providers || []);
      } else {
        setMarketplaceProviders([]);
      }
      if (sessionPlan === 'BOOST') {
        setMarketIntelligence(await api.getMarketWideBestSellers(session).catch(() => null));
      } else {
        setMarketIntelligence(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token, sessionPlan]);

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title={`Welcome ${currentUser?.full_name || currentUser?.email?.split('@')[0] || 'to IntelliFlow'}`} subtitle="Your operational workspace is ready. Review inventory, logistics, and AI-led actions from one place." />
      <ScreenTopBar title="Overview" leftLabel="<" rightLabel=">" />
      <AppShowcaseCard
        title={delayed.length ? 'Delivery is delayed' : 'Delivery is stable'}
        body={delayed.length ? 'Delay pressure is affecting part of your active flow.' : 'Orders, stock, and shipment flow are moving normally.'}
      >
        <ErrorBanner message={error} />
        {dashboard ? (
          <>
            <View style={styles.routePreview}>
              <View style={styles.routeNodeOrange} />
              <View style={styles.routePath} />
              <View style={styles.routeNodeBlue} />
              <View style={styles.routeNodeOrangeSmall} />
            </View>
            <View style={styles.metricGrid}>
              <MetricCard label="Revenue" value={money(dashboard.total_revenue)} tone="accent" />
              <MetricCard label="Orders" value={String(dashboard.total_orders)} />
              <MetricCard label="Products" value={String(dashboard.total_products)} />
              <MetricCard label="Low stock" value={String(dashboard.low_stock_alerts)} />
            </View>
          </>
        ) : null}
      </AppShowcaseCard>

      <Panel title="Order history" subtitle="Top-selling movement in a compact operational layout." right={<ActionButton title="Refresh" tone="secondary" onPress={load} />}>
        {dashboard?.top_sellers?.length ? (
          dashboard.top_sellers.slice(0, 3).map((item) => (
            <View key={item.product_id} style={styles.orderHistoryCard}>
              <View style={styles.orderHistoryVisual} />
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{item.product_name}</Text>
                <Text style={styles.rowBody}>
                  {item.total_quantity} units • {money(item.total_revenue)}
                </Text>
                <Text style={styles.rowBodyMuted}>{item.total_sales} completed sales</Text>
              </View>
              <Chip label="Delivered" active />
            </View>
          ))
        ) : (
          <EmptyState title="No sales yet" body="Top sellers will appear after commercial activity is recorded." />
        )}
      </Panel>

      <Panel title="Agent recommendations" subtitle="Recent MCP-backed scans available on mobile.">
        {recommendations?.length ? (
          recommendations.map((item) => <RecommendationItem key={item.id} recommendation={item} />)
        ) : (
          <EmptyState title="No recommendations yet" body="Scheduled jobs have not produced visible recommendations." />
        )}
      </Panel>

      <Panel title="Free integrations overview" subtitle="Public and preview Malaysia signals delivered through the backend only.">
        <View style={styles.metricGrid}>
          <MetricCard label="Providers" value={String(integrationRegistry.length)} />
          <MetricCard label="Warehouses" value={String(warehousePreview.length)} tone="accent" />
          <MetricCard label="Signals" value={String(demandSignals.length)} />
          <MetricCard label="FX rates" value={String(bnmRates?.rates?.length || 0)} />
        </View>
        <View style={styles.listBlock}>
          <Text style={styles.listItem}>• Public/preview warehouse directory</Text>
          <Text style={styles.listItem}>• Weather and preview port-risk signals</Text>
          <Text style={styles.listItem}>• Malaysia demand signals, not confirmed sales</Text>
        </View>
      </Panel>

      <Panel title="Malaysia warehouse directory" subtitle={integrationTruthLabels.warehouseDirectory}>
        {warehousePreview.length ? (
          warehousePreview.map((item) => (
            <View key={item.name} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowBody}>{item.city || 'Unknown city'} • {item.state || 'Malaysia'}</Text>
                <Text style={styles.rowBodyMuted}>{item.warehouse_type || 'Directory record'} • {item.source}</Text>
              </View>
              <Chip label={item.is_preview ? 'Preview' : 'Public'} tone={item.is_preview ? 'warning' : 'default'} />
            </View>
          ))
        ) : (
          <EmptyState title="No warehouse preview" body="Seeded directory records were not returned." />
        )}
      </Panel>

      <Panel title="Malaysia demand signals" subtitle={integrationTruthLabels.demandSignals}>
        {demandSignals.length ? (
          demandSignals.map((item) => (
            <View key={`${item.keyword_or_product}-${item.rank || 'na'}`} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{item.keyword_or_product}</Text>
                <Text style={styles.rowBody}>{item.category || 'General'} • Score {item.score ?? 'N/A'}</Text>
                <Text style={styles.rowBodyMuted}>{item.confidence} confidence • {item.data_type}</Text>
              </View>
              <Chip label={toPreviewBadgeLabel(item)} tone="warning" />
            </View>
          ))
        ) : (
          <EmptyState title="No demand preview" body="Demand signals will appear when preview data is available." />
        )}
      </Panel>

      <Panel title="Premium and Boost prompts" subtitle="Locked integrations stay truthful about plan access and configuration.">
        <View style={styles.listBlock}>
          <Text style={styles.listItem}>
            • Premium own-store best sellers: {sessionPlan === 'FREE'
              ? 'Upgrade required to connect Shopee, Lazada, or TikTok Shop.'
              : marketplaceProviders.some((provider) => provider.status !== 'not_configured')
                ? 'Provider credentials are ready for connection stubs.'
                : 'Marketplace connection stubs are available, but no provider is configured yet.'}
          </Text>
          <Text style={styles.listItem}>
            • Boost market intelligence: {sessionPlan !== 'BOOST'
              ? 'Upgrade required for market-wide Malaysia best-seller providers.'
              : marketIntelligence?.status === 'not_configured'
                ? 'Paid market-intelligence provider is not configured.'
                : 'Backend provider status is available.'}
          </Text>
        </View>
      </Panel>
    </View>
  );
}

function ProductsScreen({ session }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    price: '',
    cost: '',
    current_stock: '0',
    min_stock_threshold: '10',
    supplier: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setProducts(await api.getProducts(session));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token]);

  const submit = async () => {
    try {
      await api.createProduct(session, {
        ...form,
        price: Number(form.price),
        cost: Number(form.cost),
        current_stock: Number(form.current_stock || 0),
        min_stock_threshold: Number(form.min_stock_threshold || 0),
        description: form.description || null,
        category: form.category || null,
        supplier: form.supplier || null,
      });
      setForm({
        name: '',
        sku: '',
        description: '',
        category: '',
        price: '',
        cost: '',
        current_stock: '0',
        min_stock_threshold: '10',
        supplier: '',
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  const lowStockCount = products.filter((item) => item.current_stock <= item.min_stock_threshold).length;

  return (
    <View style={styles.screenStack}>
      <ScreenTopBar title="Quoting" leftLabel="<" rightLabel="..." />
      <Text style={styles.inventoryHeadline}>Items</Text>
      <View style={styles.filterRow}>
        <View style={styles.filterBoxCompact}>
          <Text style={styles.filterBoxText}>Q</Text>
        </View>
        <View style={styles.filterBoxCompact}>
          <Text style={styles.filterBoxText}>::</Text>
        </View>
        <View style={styles.filterBoxWide}>
          <Text style={styles.filterBoxText}>Category</Text>
        </View>
        <View style={styles.filterBoxWide}>
          <Text style={styles.filterBoxText}>Suppliers</Text>
        </View>
      </View>

      {products.length ? (
        <View style={styles.productGrid}>
          {products.slice(0, 6).map((product) => (
            <ProductTile key={product.id} product={product} />
          ))}
        </View>
      ) : null}

      <Panel title="Products" subtitle="Create catalogue records and opening stock mirrored into the stock ledger.">
        <ErrorBanner message={error} />
        <View style={styles.metricGrid}>
          <MetricCard label="Products" value={String(products.length)} tone="accent" />
          <MetricCard label="Low stock" value={String(lowStockCount)} />
        </View>
      </Panel>

      <Panel title="Add product">
        <Field label="Name" value={form.name} onChangeText={(value) => setForm((f) => ({ ...f, name: value }))} />
        <Field label="SKU" value={form.sku} onChangeText={(value) => setForm((f) => ({ ...f, sku: value }))} />
        <Field label="Category" value={form.category} onChangeText={(value) => setForm((f) => ({ ...f, category: value }))} />
        <Field label="Supplier" value={form.supplier} onChangeText={(value) => setForm((f) => ({ ...f, supplier: value }))} />
        <Field label="Price" value={form.price} onChangeText={(value) => setForm((f) => ({ ...f, price: value }))} keyboardType="decimal-pad" />
        <Field label="Cost" value={form.cost} onChangeText={(value) => setForm((f) => ({ ...f, cost: value }))} keyboardType="decimal-pad" />
        <Field label="Opening stock" value={form.current_stock} onChangeText={(value) => setForm((f) => ({ ...f, current_stock: value }))} keyboardType="number-pad" />
        <Field label="Min threshold" value={form.min_stock_threshold} onChangeText={(value) => setForm((f) => ({ ...f, min_stock_threshold: value }))} keyboardType="number-pad" />
        <Field
          label="Description"
          value={form.description}
          onChangeText={(value) => setForm((f) => ({ ...f, description: value }))}
          multiline
        />
        <ActionButton title="Create product" onPress={submit} />
      </Panel>

      <Panel title="Product registry" right={<ActionButton title="Reload" tone="secondary" onPress={load} />}>
        {products.length ? (
          products.map((product) => (
            <View key={product.id} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{product.name}</Text>
                <Text style={styles.rowBody}>
                  {product.sku} • {product.category || 'Uncategorized'} • {money(product.price)}
                </Text>
                <Text style={styles.rowBodyMuted}>{product.description || product.supplier || 'No extra metadata.'}</Text>
              </View>
              <Chip
                label={product.current_stock <= product.min_stock_threshold ? 'Low stock' : `${product.current_stock} on hand`}
                tone={product.current_stock <= product.min_stock_threshold ? 'warning' : 'success'}
              />
            </View>
          ))
        ) : (
          <EmptyState title="No products" body="Create a product to unlock inventory and order workflows." />
        )}
      </Panel>

      <View style={styles.ctaDock}>
        <Text style={styles.ctaDockIcon}>[]</Text>
        <Text style={styles.ctaDockText}>Create quote</Text>
        <Text style={styles.ctaDockArrow}>{'>>'}</Text>
      </View>
    </View>
  );
}

function InventoryScreen({ session }) {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [risks, setRisks] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [stock, setStock] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', address: '' });
  const [receiveForm, setReceiveForm] = useState({ quantity: '', reference_id: '' });
  const [adjustForm, setAdjustForm] = useState({ quantity: '', adjustment_type: 'NEGATIVE', reason: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const requests = [
        api.getProducts(session),
        api.getWarehouses(session),
        api.getInventoryRisks(session),
        api.getInventoryTransactions(session, { limit: 25 }),
      ];
      const canLoadReorder = ['PREMIUM', 'BOOST', 'PRO'].includes((session?.plan || '').toUpperCase());
      if (canLoadReorder) {
        requests.push(api.getReorderSuggestions(session));
      }
      const settled = await Promise.allSettled(requests);
      const failures = settled.filter((result) => result.status === 'rejected');
      if (failures.length) {
        setError(failures[0].reason?.message || 'Some inventory panels could not load.');
      }

      const productData = settled[0]?.status === 'fulfilled' ? settled[0].value : [];
      const warehouseData = settled[1]?.status === 'fulfilled' ? settled[1].value : [];
      const riskData = settled[2]?.status === 'fulfilled' ? settled[2].value : [];
      const transactionData = settled[3]?.status === 'fulfilled' ? settled[3].value : [];
      const reorderData = canLoadReorder && settled[4]?.status === 'fulfilled' ? settled[4].value : [];

      setProducts(productData);
      setWarehouses(warehouseData);
      setRisks(riskData);
      setReorderSuggestions(reorderData);
      setTransactions(transactionData);

      const defaultProductId = selectedProductId || productData[0]?.id || null;
      const defaultWarehouseId = selectedWarehouseId || warehouseData[0]?.id || null;
      setSelectedProductId(defaultProductId);
      setSelectedWarehouseId(defaultWarehouseId);

      if (defaultProductId) {
        const stockData = await api.getStockPosition(session, defaultProductId, defaultWarehouseId);
        setStock(stockData);
      } else {
        setStock(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token]);

  const refreshStock = async (productId = selectedProductId, warehouseId = selectedWarehouseId) => {
    if (!productId) {
      return;
    }
    try {
      setStock(await api.getStockPosition(session, productId, warehouseId));
    } catch (err) {
      setError(err.message);
    }
  };

  const createWarehouse = async () => {
    try {
      await api.createWarehouse(session, { ...warehouseForm, address: warehouseForm.address || null });
      setWarehouseForm({ name: '', code: '', address: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const receiveStock = async () => {
    if (!selectedProductId || !selectedWarehouseId) {
      setError('Select a product and warehouse before receiving stock.');
      return;
    }
    try {
      await api.receiveInventory(session, {
        product_id: selectedProductId,
        warehouse_id: selectedWarehouseId,
        quantity: Number(receiveForm.quantity),
        reference_id: receiveForm.reference_id || null,
      });
      setReceiveForm({ quantity: '', reference_id: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const adjustStock = async () => {
    if (!selectedProductId || !selectedWarehouseId) {
      setError('Select a product and warehouse before adjusting stock.');
      return;
    }
    try {
      await api.adjustInventory(session, {
        product_id: selectedProductId,
        warehouse_id: selectedWarehouseId,
        quantity: Number(adjustForm.quantity),
        adjustment_type: adjustForm.adjustment_type,
        reason: adjustForm.reason,
      });
      setAdjustForm({ quantity: '', adjustment_type: 'NEGATIVE', reason: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <View style={styles.screenStack}>
      <ScreenTopBar title="Inventory" leftLabel="##" rightLabel="..." />
      <Text style={styles.inventoryHeadline}>Inventory</Text>
      <View style={styles.filterRow}>
        <View style={styles.filterBoxCompact}>
          <Text style={styles.filterBoxText}>Q</Text>
        </View>
        <View style={styles.filterBoxWide}>
          <Text style={styles.filterBoxText}>Month</Text>
        </View>
        <View style={styles.filterBoxAddress}>
          <Text style={styles.filterBoxText}>Storage: {warehouses[0]?.name || 'Main Warehouse'}</Text>
        </View>
      </View>

      <AppShowcaseCard title="Orders" accent="blue">
        <ErrorBanner message={error} />
        <View style={styles.ordersBoard}>
          <View style={styles.ordersBoardColumn}>
            <Text style={styles.ordersBoardValue}>{String(transactions.length)}</Text>
            <Text style={styles.ordersBoardLabel}>Transactions</Text>
          </View>
          <View style={styles.ordersBoardColumn}>
            <Text style={styles.ordersBoardValue}>{String(reorderSuggestions.length)}</Text>
            <Text style={styles.ordersBoardLabel}>In progress</Text>
          </View>
          <View style={styles.ordersBoardColumn}>
            <Text style={styles.ordersBoardValue}>{String(risks.length)}</Text>
            <Text style={styles.ordersBoardLabel}>Returns risk</Text>
          </View>
          <View style={styles.ordersBoardColumn}>
            <Text style={styles.ordersBoardValue}>{String(products.length)}</Text>
            <Text style={styles.ordersBoardLabel}>Completed</Text>
          </View>
        </View>
        <View style={styles.ordersBars}>
          <View style={[styles.ordersBar, styles.ordersBarShort]} />
          <View style={[styles.ordersBar, styles.ordersBarMid]} />
          <View style={[styles.ordersBar, styles.ordersBarTall]} />
        </View>
      </AppShowcaseCard>

      <AppShowcaseCard title="Stock">
        <View style={styles.stockLegendWrap}>
          <View style={styles.stockLegendColumn}>
            <Text style={styles.stockLegendItem}>In stock</Text>
            <Text style={styles.stockLegendItem}>Out of stock</Text>
            <Text style={styles.stockLegendItem}>Low stock</Text>
            <Text style={styles.stockLegendItem}>Dead stock</Text>
          </View>
          <View style={styles.stockDonut} />
        </View>
      </AppShowcaseCard>

      <Panel title="Inventory insights" subtitle="Ledger-first stock, reorder pressure, and warehouse intake.">
        <View style={styles.metricGrid}>
          <MetricCard label="Low stock risks" value={String(risks.length)} tone="accent" />
          <MetricCard label="Warehouses" value={String(warehouses.length)} />
          <MetricCard label="Reorder signals" value={String(reorderSuggestions.length)} />
        </View>
      </Panel>

      <Panel title="Warehouse setup">
        <Field label="Warehouse name" value={warehouseForm.name} onChangeText={(value) => setWarehouseForm((f) => ({ ...f, name: value }))} />
        <Field label="Code" value={warehouseForm.code} onChangeText={(value) => setWarehouseForm((f) => ({ ...f, code: value }))} />
        <Field label="Address" value={warehouseForm.address} onChangeText={(value) => setWarehouseForm((f) => ({ ...f, address: value }))} />
        <ActionButton title="Create warehouse" onPress={createWarehouse} />
      </Panel>

      <Panel title="Stock position" subtitle="Pick a product and warehouse to inspect on hand, reserved, and available.">
        <SelectorRow
          label="Product"
          options={products.map((item) => ({ label: item.name, value: item.id }))}
          selectedValue={selectedProductId}
          onSelect={(value) => {
            setSelectedProductId(value);
            refreshStock(value, selectedWarehouseId);
          }}
        />
        <SelectorRow
          label="Warehouse"
          options={[{ label: 'All warehouses', value: null }, ...warehouses.map((item) => ({ label: item.name, value: item.id }))]}
          selectedValue={selectedWarehouseId}
          onSelect={(value) => {
            setSelectedWarehouseId(value);
            refreshStock(selectedProductId, value);
          }}
        />
        {stock ? (
          <View style={styles.metricGrid}>
            <MetricCard label="On hand" value={String(stock.on_hand)} />
            <MetricCard label="Reserved" value={String(stock.reserved)} />
            <MetricCard label="Available" value={String(stock.available)} tone="accent" />
            <MetricCard label="Damaged" value={String(stock.damaged)} />
            <MetricCard label="Quarantined" value={String(stock.quarantined)} />
          </View>
        ) : (
          <EmptyState title="No stock position" body="Create a product and warehouse, then receive stock." />
        )}
      </Panel>

      <Panel title="Receive stock">
        <Field label="Quantity" value={receiveForm.quantity} onChangeText={(value) => setReceiveForm((f) => ({ ...f, quantity: value }))} keyboardType="number-pad" />
        <Field label="Reference" value={receiveForm.reference_id} onChangeText={(value) => setReceiveForm((f) => ({ ...f, reference_id: value }))} />
        <ActionButton title="Receive purchase stock" onPress={receiveStock} />
      </Panel>

      <Panel title="Adjust stock">
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Adjustment type</Text>
          <View style={styles.chipRow}>
            {['POSITIVE', 'NEGATIVE'].map((value) => (
              <Chip
                key={value}
                label={value}
                active={adjustForm.adjustment_type === value}
                onPress={() => setAdjustForm((f) => ({ ...f, adjustment_type: value }))}
              />
            ))}
          </View>
        </View>
        <Field label="Quantity" value={adjustForm.quantity} onChangeText={(value) => setAdjustForm((f) => ({ ...f, quantity: value }))} keyboardType="number-pad" />
        <Field label="Reason" value={adjustForm.reason} onChangeText={(value) => setAdjustForm((f) => ({ ...f, reason: value }))} />
        <ActionButton title="Post adjustment" onPress={adjustStock} />
      </Panel>

      <Panel title="Low-stock board">
        {risks.length ? (
          risks.map((risk) => (
            <View key={risk.product_id} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{risk.product_name}</Text>
                <Text style={styles.rowBody}>
                  Available {risk.current_stock} • Min {risk.min_threshold} • Days cover {risk.days_of_stock?.toFixed?.(1) ?? 'N/A'}
                </Text>
              </View>
              <Chip label={risk.risk_level} tone={risk.risk_level === 'critical' ? 'warning' : 'default'} />
            </View>
          ))
        ) : (
          <EmptyState title="No risks" body="Inventory risk analytics are clear for now." />
        )}
      </Panel>

      <Panel title="Reorder suggestions">
        {reorderSuggestions.length ? (
          reorderSuggestions.map((item, index) => (
            <View key={`${item.product_id}-${item.warehouse_id}-${index}`} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>Product #{item.product_id} • Warehouse #{item.warehouse_id}</Text>
                <Text style={styles.rowBody}>
                  Available {item.available_quantity} • Minimum {item.minimum_quantity} • Suggested {item.suggested_reorder_quantity}
                </Text>
                <Text style={styles.rowBodyMuted}>
                  {item.supplier_name ? `${item.supplier_name} • ${item.supplier_lead_time_days || 'N/A'} day lead time` : 'No supplier context'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No reorder signals" body="Set reorder points to generate replenishment suggestions." />
        )}
      </Panel>

      <Panel title="Recent inventory movements">
        {transactions.length ? (
          transactions.map((tx) => (
            <View key={tx.id} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{tx.transaction_type}</Text>
                <Text style={styles.rowBody}>
                  Product #{tx.product_id} • Warehouse #{tx.warehouse_id} • Qty {tx.quantity} • {tx.direction}
                </Text>
                <Text style={styles.rowBodyMuted}>{displayDate(tx.created_at)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No movements" body="Inventory transactions will appear here." />
        )}
      </Panel>
    </View>
  );
}

function SalesScreen({ session, sessionPlan }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [orderForm, setOrderForm] = useState({
    customer_id: '',
    product_id: '',
    warehouse_id: '',
    quantity: '',
    unit_price: '',
    expected_ship_date: todayIso(),
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productData, customerData, orderData, salesData] = await Promise.all([
        api.getProducts(session),
        api.getCustomers(session),
        api.getSalesOrders(session),
        api.getSales(session),
      ]);
      setProducts(productData);
      setCustomers(customerData);
      setOrders(orderData);
      setSales(salesData);

      if (sessionPlan !== 'FREE') {
        const copilotData = await api.askCopilot(session, {
          message: 'What are my best-selling products this week?',
          organization_id: 'mobile-app',
          user_plan: sessionPlan,
        });
        setInsight(copilotData);
      } else {
        setInsight(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token, sessionPlan]);

  const createCustomer = async () => {
    try {
      await api.createCustomer(session, {
        ...customerForm,
        email: customerForm.email || null,
        phone: customerForm.phone || null,
        address: customerForm.address || null,
      });
      setCustomerForm({ name: '', email: '', phone: '', address: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const createOrder = async () => {
    try {
      await api.createSalesOrder(session, {
        customer_id: maybeNumber(orderForm.customer_id),
        order_date: new Date().toISOString(),
        expected_ship_date: orderForm.expected_ship_date ? new Date(orderForm.expected_ship_date).toISOString() : null,
        notes: orderForm.notes || null,
        items: [
          {
            product_id: Number(orderForm.product_id),
            warehouse_id: maybeNumber(orderForm.warehouse_id),
            quantity_ordered: Number(orderForm.quantity),
            unit_price: Number(orderForm.unit_price),
          },
        ],
      });
      setOrderForm({
        customer_id: '',
        product_id: '',
        warehouse_id: '',
        quantity: '',
        unit_price: '',
        expected_ship_date: todayIso(),
        notes: '',
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmOrder = async (orderId) => {
    try {
      await api.confirmSalesOrder(session, orderId);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const fulfillItem = async (orderId, item) => {
    const remaining = item.quantity_ordered - item.quantity_fulfilled;
    if (remaining <= 0) {
      return;
    }
    try {
      await api.fulfillSalesOrderItem(session, orderId, item.id, remaining);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title="Sales" subtitle="Customers, sales orders, reservation-backed confirmation, and fulfillment.">
        <ErrorBanner message={error} />
        <View style={styles.metricGrid}>
          <MetricCard label="Customers" value={String(customers.length)} />
          <MetricCard label="Sales orders" value={String(orders.length)} tone="accent" />
          <MetricCard label="Legacy sales" value={String(sales.length)} />
        </View>
      </Panel>

      {sessionPlan === 'FREE' ? (
        <PlanNotice requiredPlan="PREMIUM" body="AI-ranked best sellers and sales velocity shifts are locked on Free." />
      ) : (
        <Panel title="Sales insights">
          {insight ? <JsonPreview data={insight} /> : <EmptyState title="No insight" body="Run a sales query after data loads." />}
        </Panel>
      )}

      <Panel title="Create customer">
        <Field label="Name" value={customerForm.name} onChangeText={(value) => setCustomerForm((f) => ({ ...f, name: value }))} />
        <Field label="Email" value={customerForm.email} onChangeText={(value) => setCustomerForm((f) => ({ ...f, email: value }))} />
        <Field label="Phone" value={customerForm.phone} onChangeText={(value) => setCustomerForm((f) => ({ ...f, phone: value }))} />
        <Field label="Address" value={customerForm.address} onChangeText={(value) => setCustomerForm((f) => ({ ...f, address: value }))} multiline />
        <ActionButton title="Create customer" onPress={createCustomer} />
      </Panel>

      <Panel title="Create sales order">
        <SelectorRow
          label="Customer"
          options={[{ label: 'No customer', value: '' }, ...customers.map((item) => ({ label: item.name, value: String(item.id) }))]}
          selectedValue={orderForm.customer_id}
          onSelect={(value) => setOrderForm((f) => ({ ...f, customer_id: String(value ?? '') }))}
        />
        <SelectorRow
          label="Product"
          options={products.map((item) => ({ label: item.name, value: String(item.id) }))}
          selectedValue={orderForm.product_id}
          onSelect={(value) => setOrderForm((f) => ({ ...f, product_id: String(value) }))}
        />
        <Field label="Warehouse ID (optional)" value={orderForm.warehouse_id} onChangeText={(value) => setOrderForm((f) => ({ ...f, warehouse_id: value }))} keyboardType="number-pad" />
        <Field label="Quantity" value={orderForm.quantity} onChangeText={(value) => setOrderForm((f) => ({ ...f, quantity: value }))} keyboardType="number-pad" />
        <Field label="Unit price" value={orderForm.unit_price} onChangeText={(value) => setOrderForm((f) => ({ ...f, unit_price: value }))} keyboardType="decimal-pad" />
        <Field label="Expected ship date" value={orderForm.expected_ship_date} onChangeText={(value) => setOrderForm((f) => ({ ...f, expected_ship_date: value }))} />
        <Field label="Notes" value={orderForm.notes} onChangeText={(value) => setOrderForm((f) => ({ ...f, notes: value }))} multiline />
        <ActionButton title="Create sales order" onPress={createOrder} />
      </Panel>

      <Panel title="Sales orders" right={<ActionButton title="Reload" tone="secondary" onPress={load} />}>
        {orders.length ? (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.rowTitle}>{order.order_number}</Text>
                  <Text style={styles.rowBody}>
                    {order.status} • Customer #{order.customer_id || 'N/A'} • {displayDate(order.order_date)}
                  </Text>
                </View>
                {order.status === 'DRAFT' ? (
                  <ActionButton title="Confirm" onPress={() => confirmOrder(order.id)} />
                ) : null}
              </View>
              {order.items?.map((item) => {
                const remaining = item.quantity_ordered - item.quantity_fulfilled;
                return (
                  <View key={item.id} style={styles.orderItem}>
                    <Text style={styles.rowBody}>
                      Product #{item.product_id} • Ordered {item.quantity_ordered} • Reserved {item.quantity_reserved} • Fulfilled {item.quantity_fulfilled}
                    </Text>
                    {remaining > 0 && order.status !== 'CANCELLED' ? (
                      <ActionButton title={`Fulfill ${remaining}`} tone="secondary" onPress={() => fulfillItem(order.id, item)} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))
        ) : (
          <EmptyState title="No sales orders" body="Create and confirm a sales order to test reservation-backed fulfillment." />
        )}
      </Panel>
    </View>
  );
}

function PurchasingScreen({ session }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [supplierForm, setSupplierForm] = useState({ name: '', email: '', phone: '', address: '', lead_time_days: '' });
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    product_id: '',
    warehouse_id: '',
    quantity: '',
    unit_cost: '',
    expected_arrival_date: todayIso(),
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [supplierData, productData, warehouseData, orderData] = await Promise.all([
        api.getSuppliers(session),
        api.getProducts(session),
        api.getWarehouses(session),
        api.getPurchaseOrders(session),
      ]);
      setSuppliers(supplierData);
      setProducts(productData);
      setWarehouses(warehouseData);
      setOrders(orderData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token]);

  const createSupplier = async () => {
    try {
      await api.createSupplier(session, {
        ...supplierForm,
        email: supplierForm.email || null,
        phone: supplierForm.phone || null,
        address: supplierForm.address || null,
        lead_time_days: maybeNumber(supplierForm.lead_time_days),
      });
      setSupplierForm({ name: '', email: '', phone: '', address: '', lead_time_days: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const createPurchaseOrder = async () => {
    try {
      await api.createPurchaseOrder(session, {
        supplier_id: maybeNumber(poForm.supplier_id),
        order_date: new Date().toISOString(),
        expected_arrival_date: poForm.expected_arrival_date ? new Date(poForm.expected_arrival_date).toISOString() : null,
        notes: poForm.notes || null,
        items: [
          {
            product_id: Number(poForm.product_id),
            warehouse_id: maybeNumber(poForm.warehouse_id),
            quantity_ordered: Number(poForm.quantity),
            unit_cost: Number(poForm.unit_cost),
          },
        ],
      });
      setPoForm({
        supplier_id: '',
        product_id: '',
        warehouse_id: '',
        quantity: '',
        unit_cost: '',
        expected_arrival_date: todayIso(),
        notes: '',
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const markOrdered = async (id) => {
    try {
      await api.markPurchaseOrderOrdered(session, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const receiveItem = async (orderId, item) => {
    const remaining = item.quantity_ordered - item.quantity_received;
    if (remaining <= 0) {
      return;
    }
    try {
      await api.receivePurchaseOrderItem(session, orderId, item.id, remaining);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title="Purchasing" subtitle="Suppliers, purchase orders, and ledger-backed receiving.">
        <ErrorBanner message={error} />
        <View style={styles.metricGrid}>
          <MetricCard label="Suppliers" value={String(suppliers.length)} />
          <MetricCard label="Purchase orders" value={String(orders.length)} tone="accent" />
        </View>
      </Panel>

      <Panel title="Create supplier">
        <Field label="Name" value={supplierForm.name} onChangeText={(value) => setSupplierForm((f) => ({ ...f, name: value }))} />
        <Field label="Email" value={supplierForm.email} onChangeText={(value) => setSupplierForm((f) => ({ ...f, email: value }))} />
        <Field label="Phone" value={supplierForm.phone} onChangeText={(value) => setSupplierForm((f) => ({ ...f, phone: value }))} />
        <Field label="Lead time days" value={supplierForm.lead_time_days} onChangeText={(value) => setSupplierForm((f) => ({ ...f, lead_time_days: value }))} keyboardType="number-pad" />
        <Field label="Address" value={supplierForm.address} onChangeText={(value) => setSupplierForm((f) => ({ ...f, address: value }))} multiline />
        <ActionButton title="Create supplier" onPress={createSupplier} />
      </Panel>

      <Panel title="Create purchase order">
        <SelectorRow
          label="Supplier"
          options={[{ label: 'No supplier', value: '' }, ...suppliers.map((item) => ({ label: item.name, value: String(item.id) }))]}
          selectedValue={poForm.supplier_id}
          onSelect={(value) => setPoForm((f) => ({ ...f, supplier_id: String(value ?? '') }))}
        />
        <SelectorRow
          label="Product"
          options={products.map((item) => ({ label: item.name, value: String(item.id) }))}
          selectedValue={poForm.product_id}
          onSelect={(value) => setPoForm((f) => ({ ...f, product_id: String(value) }))}
        />
        <SelectorRow
          label="Warehouse"
          options={[{ label: 'No warehouse', value: '' }, ...warehouses.map((item) => ({ label: item.name, value: String(item.id) }))]}
          selectedValue={poForm.warehouse_id}
          onSelect={(value) => setPoForm((f) => ({ ...f, warehouse_id: String(value ?? '') }))}
        />
        <Field label="Quantity" value={poForm.quantity} onChangeText={(value) => setPoForm((f) => ({ ...f, quantity: value }))} keyboardType="number-pad" />
        <Field label="Unit cost" value={poForm.unit_cost} onChangeText={(value) => setPoForm((f) => ({ ...f, unit_cost: value }))} keyboardType="decimal-pad" />
        <Field label="Expected arrival" value={poForm.expected_arrival_date} onChangeText={(value) => setPoForm((f) => ({ ...f, expected_arrival_date: value }))} />
        <Field label="Notes" value={poForm.notes} onChangeText={(value) => setPoForm((f) => ({ ...f, notes: value }))} multiline />
        <ActionButton title="Create purchase order" onPress={createPurchaseOrder} />
      </Panel>

      <Panel title="Purchase orders" right={<ActionButton title="Reload" tone="secondary" onPress={load} />}>
        {orders.length ? (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.rowTitle}>{order.po_number}</Text>
                  <Text style={styles.rowBody}>
                    {order.status} • Supplier #{order.supplier_id || 'N/A'} • {displayDate(order.order_date)}
                  </Text>
                </View>
                {order.status === 'DRAFT' ? (
                  <ActionButton title="Mark ordered" onPress={() => markOrdered(order.id)} />
                ) : null}
              </View>
              {order.items?.map((item) => {
                const remaining = item.quantity_ordered - item.quantity_received;
                return (
                  <View key={item.id} style={styles.orderItem}>
                    <Text style={styles.rowBody}>
                      Product #{item.product_id} • Ordered {item.quantity_ordered} • Received {item.quantity_received}
                    </Text>
                    {remaining > 0 ? (
                      <ActionButton title={`Receive ${remaining}`} tone="secondary" onPress={() => receiveItem(order.id, item)} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))
        ) : (
          <EmptyState title="No purchase orders" body="Create a PO and receive it here." />
        )}
      </Panel>
    </View>
  );
}

function TransfersScreen({ session }) {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    product_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [warehouseData, productData, transactionData] = await Promise.all([
        api.getWarehouses(session),
        api.getProducts(session),
        api.getInventoryTransactions(session, { limit: 50 }),
      ]);
      setWarehouses(warehouseData);
      setProducts(productData);
      setTransactions(transactionData.filter((item) => item.transaction_type.includes('TRANSFER')));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token]);

  const createTransfer = async () => {
    try {
      await api.transferInventory(session, {
        product_id: Number(form.product_id),
        from_warehouse_id: Number(form.from_warehouse_id),
        to_warehouse_id: Number(form.to_warehouse_id),
        quantity: Number(form.quantity),
        notes: form.notes || null,
      });
      setForm({
        product_id: '',
        from_warehouse_id: '',
        to_warehouse_id: '',
        quantity: '',
        notes: '',
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title="Transfers" subtitle="Warehouse-to-warehouse movement using the stock ledger.">
        <ErrorBanner message={error} />
        <View style={styles.metricGrid}>
          <MetricCard label="Warehouses" value={String(warehouses.length)} />
          <MetricCard label="Transfer events" value={String(transactions.length)} tone="accent" />
        </View>
      </Panel>

      <Panel title="Create transfer">
        <SelectorRow
          label="Product"
          options={products.map((item) => ({ label: item.name, value: String(item.id) }))}
          selectedValue={form.product_id}
          onSelect={(value) => setForm((f) => ({ ...f, product_id: String(value) }))}
        />
        <SelectorRow
          label="From warehouse"
          options={warehouses.map((item) => ({ label: item.name, value: String(item.id) }))}
          selectedValue={form.from_warehouse_id}
          onSelect={(value) => setForm((f) => ({ ...f, from_warehouse_id: String(value) }))}
        />
        <SelectorRow
          label="To warehouse"
          options={warehouses.map((item) => ({ label: item.name, value: String(item.id) }))}
          selectedValue={form.to_warehouse_id}
          onSelect={(value) => setForm((f) => ({ ...f, to_warehouse_id: String(value) }))}
        />
        <Field label="Quantity" value={form.quantity} onChangeText={(value) => setForm((f) => ({ ...f, quantity: value }))} keyboardType="number-pad" />
        <Field label="Notes" value={form.notes} onChangeText={(value) => setForm((f) => ({ ...f, notes: value }))} multiline />
        <ActionButton title="Create transfer" onPress={createTransfer} />
      </Panel>

      <Panel title="Warehouses">
        {warehouses.length ? (
          warehouses.map((warehouse) => (
            <View key={warehouse.id} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{warehouse.name}</Text>
                <Text style={styles.rowBody}>
                  {warehouse.code} • {warehouse.address || 'No address'}
                </Text>
              </View>
              <Chip label={warehouse.is_active ? 'Active' : 'Inactive'} tone={warehouse.is_active ? 'success' : 'warning'} />
            </View>
          ))
        ) : (
          <EmptyState title="No warehouses" body="Create a warehouse in Inventory first." />
        )}
      </Panel>

      <Panel title="Recent transfer movements">
        {transactions.length ? (
          transactions.map((item) => (
            <View key={item.id} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{item.transaction_type}</Text>
                <Text style={styles.rowBody}>
                  Product #{item.product_id} • Warehouse #{item.warehouse_id} • Qty {item.quantity}
                </Text>
                <Text style={styles.rowBodyMuted}>{displayDate(item.created_at)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No transfers yet" body="Transfers will show up after stock is moved between warehouses." />
        )}
      </Panel>
    </View>
  );
}

function ReturnsScreen({ session, sessionPlan }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [returns, setReturns] = useState([]);
  const [profitLeakage, setProfitLeakage] = useState(null);
  const [highReturnProducts, setHighReturnProducts] = useState([]);
  const [aiInsight, setAiInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({ start: isoDaysAgo(30), end: new Date().toISOString() });
  const [form, setForm] = useState({
    customer_id: '',
    sales_order_id: '',
    product_id: '',
    warehouse_id: '',
    quantity: '',
    return_reason: 'DAMAGED_ON_ARRIVAL',
    condition: 'RESTOCKABLE',
    refund_amount: '',
    replacement_cost: '',
    supplier_id: '',
    carrier_name: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productData, customerData, supplierData, warehouseData, returnData, leakageData, highReturnData] = await Promise.all([
        api.getProducts(session),
        api.getCustomers(session),
        api.getSuppliers(session),
        api.getWarehouses(session),
        api.getReturns(session),
        api.getProfitLeakage(session, dateRange.start, dateRange.end),
        api.getHighReturnProducts(session, dateRange.start, dateRange.end),
      ]);
      setProducts(productData);
      setCustomers(customerData);
      setSuppliers(supplierData);
      setWarehouses(warehouseData);
      setReturns(returnData);
      setProfitLeakage(leakageData);
      setHighReturnProducts(highReturnData);

      if (sessionPlan !== 'FREE') {
        setAiInsight(
          await api.askCopilot(session, {
            message: 'Which products are leaking profit due to returns?',
            organization_id: 'mobile-app',
            user_plan: sessionPlan,
          })
        );
      } else {
        setAiInsight(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token, sessionPlan]);

  const createReturn = async () => {
    try {
      await api.createReturnOrder(session, {
        sales_order_id: maybeNumber(form.sales_order_id),
        customer_id: maybeNumber(form.customer_id),
        return_date: new Date().toISOString(),
        notes: form.notes || null,
        items: [
          {
            product_id: Number(form.product_id),
            warehouse_id: maybeNumber(form.warehouse_id),
            quantity: Number(form.quantity),
            return_reason: form.return_reason,
            condition: form.condition,
            refund_amount: Number(form.refund_amount || 0),
            replacement_cost: Number(form.replacement_cost || 0),
            supplier_id: maybeNumber(form.supplier_id),
            carrier_name: form.carrier_name || null,
          },
        ],
      });
      setForm({
        customer_id: '',
        sales_order_id: '',
        product_id: '',
        warehouse_id: '',
        quantity: '',
        return_reason: 'DAMAGED_ON_ARRIVAL',
        condition: 'RESTOCKABLE',
        refund_amount: '',
        replacement_cost: '',
        supplier_id: '',
        carrier_name: '',
        notes: '',
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const approveReturn = async (id) => {
    try {
      await api.approveReturnOrder(session, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const receiveItem = async (returnOrderId, item) => {
    try {
      await api.receiveReturnItem(session, returnOrderId, item.id, item.quantity);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title="Returns and profit leakage" subtitle="Return orders, intake conditions, and financial drag.">
        <ErrorBanner message={error} />
        <View style={styles.metricGrid}>
          <MetricCard label="Return orders" value={String(returns.length)} />
          <MetricCard label="High-return SKUs" value={String(highReturnProducts.length)} tone="accent" />
          <MetricCard label="Leakage" value={money(profitLeakage?.total_profit_leakage || 0)} />
        </View>
      </Panel>

      {sessionPlan === 'FREE' ? (
        <PlanNotice requiredPlan="PREMIUM" body="Return-adjusted profit analysis and AI leakage insights require Premium." />
      ) : (
        <Panel title="AI leakage insight">{aiInsight ? <JsonPreview data={aiInsight} /> : null}</Panel>
      )}

      <Panel title="Create return order">
        <SelectorRow
          label="Customer"
          options={[{ label: 'No customer', value: '' }, ...customers.map((item) => ({ label: item.name, value: String(item.id) }))]}
          selectedValue={form.customer_id}
          onSelect={(value) => setForm((f) => ({ ...f, customer_id: String(value ?? '') }))}
        />
        <Field label="Sales order ID" value={form.sales_order_id} onChangeText={(value) => setForm((f) => ({ ...f, sales_order_id: value }))} keyboardType="number-pad" />
        <SelectorRow
          label="Product"
          options={products.map((item) => ({ label: item.name, value: String(item.id) }))}
          selectedValue={form.product_id}
          onSelect={(value) => setForm((f) => ({ ...f, product_id: String(value) }))}
        />
        <SelectorRow
          label="Warehouse"
          options={[{ label: 'No warehouse', value: '' }, ...warehouses.map((item) => ({ label: item.name, value: String(item.id) }))]}
          selectedValue={form.warehouse_id}
          onSelect={(value) => setForm((f) => ({ ...f, warehouse_id: String(value ?? '') }))}
        />
        <Field label="Quantity" value={form.quantity} onChangeText={(value) => setForm((f) => ({ ...f, quantity: value }))} keyboardType="number-pad" />
        <Field label="Return reason" value={form.return_reason} onChangeText={(value) => setForm((f) => ({ ...f, return_reason: value }))} />
        <Field label="Condition" value={form.condition} onChangeText={(value) => setForm((f) => ({ ...f, condition: value }))} />
        <Field label="Refund amount" value={form.refund_amount} onChangeText={(value) => setForm((f) => ({ ...f, refund_amount: value }))} keyboardType="decimal-pad" />
        <Field label="Replacement cost" value={form.replacement_cost} onChangeText={(value) => setForm((f) => ({ ...f, replacement_cost: value }))} keyboardType="decimal-pad" />
        <SelectorRow
          label="Supplier"
          options={[{ label: 'No supplier', value: '' }, ...suppliers.map((item) => ({ label: item.name, value: String(item.id) }))]}
          selectedValue={form.supplier_id}
          onSelect={(value) => setForm((f) => ({ ...f, supplier_id: String(value ?? '') }))}
        />
        <Field label="Carrier" value={form.carrier_name} onChangeText={(value) => setForm((f) => ({ ...f, carrier_name: value }))} />
        <Field label="Notes" value={form.notes} onChangeText={(value) => setForm((f) => ({ ...f, notes: value }))} multiline />
        <ActionButton title="Create return order" onPress={createReturn} />
      </Panel>

      <Panel title="Profit leakage report">
        {profitLeakage ? (
          <>
            <InlineValue label="Date range" value={`${displayDate(dateRange.start)} to ${displayDate(dateRange.end)}`} />
            <InlineValue label="Refunds" value={money(profitLeakage.total_refunds)} />
            <InlineValue label="Replacement cost" value={money(profitLeakage.total_replacement_cost)} />
            <InlineValue label="Total leakage" value={money(profitLeakage.total_profit_leakage)} />
          </>
        ) : (
          <EmptyState title="No leakage report" body="Returns analytics will appear once return and refund data exists." />
        )}
      </Panel>

      <Panel title="Return orders" right={<ActionButton title="Reload" tone="secondary" onPress={load} />}>
        {returns.length ? (
          returns.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.rowTitle}>{order.return_number}</Text>
                  <Text style={styles.rowBody}>
                    {order.status} • Refund {money(order.refund_amount)} • Replacement {money(order.replacement_cost)}
                  </Text>
                </View>
                {order.status === 'REQUESTED' ? (
                  <ActionButton title="Approve" onPress={() => approveReturn(order.id)} />
                ) : null}
              </View>
              {order.items?.map((item) => (
                <View key={item.id} style={styles.orderItem}>
                  <Text style={styles.rowBody}>
                    Product #{item.product_id} • Qty {item.quantity} • {item.return_reason} • {item.condition}
                  </Text>
                  {order.status === 'APPROVED' ? (
                    <ActionButton title="Receive" tone="secondary" onPress={() => receiveItem(order.id, item)} />
                  ) : null}
                </View>
              ))}
            </View>
          ))
        ) : (
          <EmptyState title="No return orders" body="Create a return order to see intake and leakage flow." />
        )}
      </Panel>
    </View>
  );
}

function LogisticsScreen({ session, sessionPlan }) {
  const [shipments, setShipments] = useState([]);
  const [delayed, setDelayed] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [publicFlow, setPublicFlow] = useState(null);
  const [portRiskPreview, setPortRiskPreview] = useState(null);
  const [delayImpact, setDelayImpact] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    related_type: 'PURCHASE_ORDER',
    related_id: '',
    carrier_name: '',
    tracking_number: '',
    origin: '',
    destination: '',
    estimated_arrival: '',
  });
  const [legForm, setLegForm] = useState({
    shipment_id: '',
    sequence_number: '1',
    origin: '',
    destination: '',
    transport_mode: 'SEA',
    carrier_name: '',
    vessel_or_flight_number: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [shipmentData, delayedData, routeData, publicFlowData, portRiskData] = await Promise.all([
        api.getShipments(session),
        api.getDelayedShipments(session),
        api.getRoutes(session),
        api.getPublicIndoPacificShipFlow(session, {
          include_ports: true,
          include_routes: true,
          include_vessel_clusters: true,
        }),
        api.getMalaysiaPortRiskPreview(session, { include_weather: true, include_marine: true }),
      ]);
      setShipments(shipmentData);
      setDelayed(delayedData);
      setRoutes(routeData);
      setPublicFlow(publicFlowData);
      setPortRiskPreview(portRiskData);
      if (sessionPlan === 'BOOST') {
        setRecommendations(await api.getRecommendations(session, { domain: 'logistics', limit: 6 }));
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token, sessionPlan]);

  const createShipment = async () => {
    try {
      const created = await api.createShipment(session, {
        shipment_number: `MOB-${Date.now()}`,
        related_type: form.related_type || null,
        related_id: form.related_id || null,
        carrier_name: form.carrier_name || null,
        tracking_number: form.tracking_number || null,
        status: 'CREATED',
        origin: form.origin || null,
        destination: form.destination || null,
        estimated_arrival: form.estimated_arrival ? new Date(form.estimated_arrival).toISOString() : null,
        actual_arrival: null,
        delay_reason: null,
        customs_status: null,
        documents_url: null,
      });
      setForm({
        related_type: 'PURCHASE_ORDER',
        related_id: '',
        carrier_name: '',
        tracking_number: '',
        origin: '',
        destination: '',
        estimated_arrival: '',
      });
      setLegForm((current) => ({ ...current, shipment_id: String(created.id) }));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addLeg = async () => {
    try {
      await api.addShipmentLeg(session, Number(legForm.shipment_id), {
        sequence_number: Number(legForm.sequence_number),
        origin: legForm.origin,
        destination: legForm.destination,
        transport_mode: legForm.transport_mode,
        carrier_name: legForm.carrier_name || null,
        vessel_or_flight_number: legForm.vessel_or_flight_number || null,
        departure_time: null,
        arrival_time: null,
        status: null,
      });
      setLegForm({
        shipment_id: '',
        sequence_number: '1',
        origin: '',
        destination: '',
        transport_mode: 'SEA',
        carrier_name: '',
        vessel_or_flight_number: '',
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const markDelayed = async (shipmentId) => {
    try {
      await api.updateShipmentStatus(session, shipmentId, {
        status: 'DELAYED',
        delay_reason: 'Flagged from mobile control tower',
        actual_arrival: null,
      });
      setDelayImpact(await api.getDelayImpact(session, shipmentId));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inspectImpact = async (shipmentId) => {
    try {
      setDelayImpact(await api.getDelayImpact(session, shipmentId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  const flowSummary = summarizeFlow(publicFlow);

  return (
    <View style={styles.screenStack}>
      <ScreenTopBar title="Overview" leftLabel="<" rightLabel=">" />
      <AppShowcaseCard title="Delivery is delayed" body="Generalized maritime flow and active shipment pressure in one control tower panel.">
        <ErrorBanner message={error} />
        <View style={styles.routePreviewLarge}>
          <View style={styles.routeNodeOrange} />
          <View style={styles.routePathWide} />
          <View style={styles.routeNodeBlue} />
          <View style={styles.routeNodeOrangeSmall} />
        </View>
        <View style={styles.metricGrid}>
          <MetricCard label="Shipments" value={String(shipments.length)} />
          <MetricCard label="Delayed" value={String(delayed.length)} tone="accent" />
          <MetricCard label="Routes" value={String(routes.length)} />
        </View>
      </AppShowcaseCard>

      <Panel
        title="Indo-Pacific ship flow"
        subtitle="This mobile view uses the same public logistics intelligence endpoint as the web experience."
        right={<Chip label={publicFlow?.is_live ? 'Live maritime flow' : 'Preview ship-flow model'} tone={publicFlow?.is_live ? 'success' : 'warning'} />}
      >
        {publicFlow ? (
          <>
            <ShipFlowMapPanel flow={publicFlow} />
            <View style={styles.metricGrid}>
              <MetricCard label="MY ports" value={String(publicFlow.summary?.malaysian_ports_monitored || 0)} tone="accent" />
              <MetricCard label="Corridors" value={String(publicFlow.summary?.routes_monitored || 0)} />
              <MetricCard label="Avg pressure" value={String(publicFlow.summary?.average_malaysia_port_pressure || 0)} />
              <MetricCard label="Flow" value={String(publicFlow.summary?.estimated_regional_flow_intensity || 0)} />
            </View>
            <Text style={styles.rowBodyMuted}>
              Source: {publicFlow.source} • Updated {displayDate(publicFlow.last_updated)}
            </Text>
            <Text style={styles.sectionLabel}>Malaysian port pressure</Text>
            {flowSummary.ports.slice(0, 5).map((feature) => (
              <View key={feature.properties.port_code} style={styles.rowCard}>
                <View style={styles.rowCardMain}>
                  <Text style={styles.rowTitle}>{feature.properties.port_name}</Text>
                  <Text style={styles.rowBody}>
                    {feature.properties.state} • Waiting {feature.properties.vessels_waiting} • Delay {feature.properties.average_delay_hours}h
                  </Text>
                </View>
                <Chip label={feature.properties.pressure_status} tone={['HIGH', 'CRITICAL'].includes(feature.properties.pressure_status) ? 'warning' : 'success'} />
              </View>
            ))}
            <Text style={styles.sectionLabel}>Generalized corridors</Text>
            {flowSummary.lanes.slice(0, 4).map((feature) => (
              <View key={feature.properties.route_name} style={styles.rowCard}>
                <View style={styles.rowCardMain}>
                  <Text style={styles.rowTitle}>{feature.properties.route_name}</Text>
                  <Text style={styles.rowBody}>
                    {feature.properties.origin_region} to {feature.properties.destination_region} • Estimated vessels {feature.properties.estimated_vessel_count}
                  </Text>
                </View>
                <Chip label={feature.properties.risk_level} tone={['HIGH', 'CRITICAL'].includes(feature.properties.risk_level) ? 'warning' : 'default'} />
              </View>
            ))}
          </>
        ) : (
          <EmptyState title="No public flow data" body="The public ship-flow endpoint did not return any data." />
        )}
      </Panel>

      <Panel
        title="Malaysia port-risk preview"
        subtitle={integrationTruthLabels.portRisk}
        right={<Chip label={portRiskPreview?.is_live ? 'Live' : 'Preview'} tone={portRiskPreview?.is_live ? 'success' : 'warning'} />}
      >
        {portRiskPreview?.ports?.length ? (
          portRiskPreview.ports.slice(0, 4).map((port) => (
            <View key={port.port_name} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{port.port_name}</Text>
                <Text style={styles.rowBody}>{port.pressure_status} • Score {port.pressure_score}</Text>
                <Text style={styles.rowBodyMuted}>
                  Weather {port.weather_risk?.level || 'N/A'} • Marine {port.marine_risk?.level || 'N/A'}
                </Text>
              </View>
              <Chip label={port.is_preview ? 'Preview' : 'Public'} tone={port.is_preview ? 'warning' : 'default'} />
            </View>
          ))
        ) : (
          <EmptyState title="No port-risk preview" body="Preview risk signals were not returned for this session." />
        )}
      </Panel>

      {sessionPlan !== 'BOOST' ? (
        <PlanNotice requiredPlan="BOOST" body="Advanced logistics recommendations and full control-tower intelligence require Boost." />
      ) : (
        <Panel title="Logistics recommendations">
          {recommendations.length ? recommendations.map((item) => <RecommendationItem key={item.id} recommendation={item} />) : <EmptyState title="No logistics recommendations" body="No high-priority logistics recommendations are currently visible." />}
        </Panel>
      )}

      <Panel title="Create shipment">
        <Field label="Related type" value={form.related_type} onChangeText={(value) => setForm((f) => ({ ...f, related_type: value }))} />
        <Field label="Related ID" value={form.related_id} onChangeText={(value) => setForm((f) => ({ ...f, related_id: value }))} />
        <Field label="Carrier" value={form.carrier_name} onChangeText={(value) => setForm((f) => ({ ...f, carrier_name: value }))} />
        <Field label="Tracking number" value={form.tracking_number} onChangeText={(value) => setForm((f) => ({ ...f, tracking_number: value }))} />
        <Field label="Origin" value={form.origin} onChangeText={(value) => setForm((f) => ({ ...f, origin: value }))} />
        <Field label="Destination" value={form.destination} onChangeText={(value) => setForm((f) => ({ ...f, destination: value }))} />
        <Field label="Estimated arrival" value={form.estimated_arrival} onChangeText={(value) => setForm((f) => ({ ...f, estimated_arrival: value }))} />
        <ActionButton title="Create shipment" onPress={createShipment} />
      </Panel>

      <Panel title="Add shipment leg">
        <Field label="Shipment ID" value={legForm.shipment_id} onChangeText={(value) => setLegForm((f) => ({ ...f, shipment_id: value }))} keyboardType="number-pad" />
        <Field label="Sequence number" value={legForm.sequence_number} onChangeText={(value) => setLegForm((f) => ({ ...f, sequence_number: value }))} keyboardType="number-pad" />
        <Field label="Origin" value={legForm.origin} onChangeText={(value) => setLegForm((f) => ({ ...f, origin: value }))} />
        <Field label="Destination" value={legForm.destination} onChangeText={(value) => setLegForm((f) => ({ ...f, destination: value }))} />
        <Field label="Transport mode" value={legForm.transport_mode} onChangeText={(value) => setLegForm((f) => ({ ...f, transport_mode: value }))} />
        <Field label="Carrier" value={legForm.carrier_name} onChangeText={(value) => setLegForm((f) => ({ ...f, carrier_name: value }))} />
        <Field label="Vessel / flight" value={legForm.vessel_or_flight_number} onChangeText={(value) => setLegForm((f) => ({ ...f, vessel_or_flight_number: value }))} />
        <ActionButton title="Add leg" onPress={addLeg} />
      </Panel>

      <Panel title="Shipments" right={<ActionButton title="Reload" tone="secondary" onPress={load} />}>
        {shipments.length ? (
          shipments.map((shipment) => (
            <View key={shipment.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.rowTitle}>{shipment.shipment_number}</Text>
                  <Text style={styles.rowBody}>
                    {shipment.status} • {shipment.origin || 'Unknown'} to {shipment.destination || 'Unknown'}
                  </Text>
                  <Text style={styles.rowBodyMuted}>
                    {shipment.carrier_name || 'No carrier'} • ETA {displayDate(shipment.estimated_arrival)}
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  <ActionButton title="Impact" tone="secondary" onPress={() => inspectImpact(shipment.id)} />
                  <ActionButton title="Delay" onPress={() => markDelayed(shipment.id)} />
                </View>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No shipments" body="Create a shipment to start tracking legs and delay impact." />
        )}
      </Panel>

      <Panel title="Delay impact">
        {delayImpact ? <JsonPreview data={delayImpact} /> : <EmptyState title="No delay impact selected" body="Inspect a shipment to load affected orders and mitigation context." />}
      </Panel>
    </View>
  );
}

function ComplianceScreen({ session, sessionPlan }) {
  const [query, setQuery] = useState('What does Malaysian customs law say about import documentation?');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (message = query) => {
    setLoading(true);
    setError('');
    try {
      setResponse(
        await api.askCopilot(session, {
          message,
          organization_id: 'mobile-app',
          user_plan: sessionPlan,
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionPlan === 'FREE') {
    return <PlanNotice requiredPlan="PREMIUM" body="Compliance and document-backed RAG responses are not available on Free." />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title="Compliance RAG" subtitle="Malaysia-focused customs, transport, tax, and anti-corruption guidance with citations when available.">
        <Field label="Compliance question" value={query} onChangeText={setQuery} multiline />
        <View style={styles.chipRow}>
          {[
            'What does Malaysian customs law say about import documentation?',
            'Check road transport compliance for this load.',
            'Summarize tax measures relevant to this transaction.',
            'What anti-corruption controls should we review?',
          ].map((prompt) => (
            <Chip key={prompt} label={prompt.slice(0, 26)} onPress={() => setQuery(prompt)} />
          ))}
        </View>
        <ErrorBanner message={error} />
        <ActionButton title={loading ? 'Running...' : 'Run compliance query'} onPress={() => run()} disabled={loading} />
      </Panel>

      <Panel title="Response">
        {response ? (
          <>
            <Text style={styles.answerText}>{response.answer}</Text>
            {response.citations?.length ? (
              response.citations.map((item, index) => (
                <View key={`${item.document_id || item.title || index}`} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>{item.title || item.document_id || `Source ${index + 1}`}</Text>
                  <Text style={styles.rowBodyMuted}>{item.path || item.summary || JSON.stringify(item)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.rowBodyMuted}>No citations returned. The backend should warn when an answer is not citation-backed.</Text>
            )}
          </>
        ) : (
          <EmptyState title="No compliance answer yet" body="Run a customs or transport query to inspect citations and warnings." />
        )}
      </Panel>
    </View>
  );
}

function EInvoicingScreen({ session }) {
  const [summary, setSummary] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ sale_id: '', buyer_name: '', buyer_email: '', buyer_tin: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, documentData, salesData] = await Promise.all([
        api.getEInvoiceSummary(session),
        api.getEInvoiceDocuments(session),
        api.getSales(session),
      ]);
      setSummary(summaryData || null);
      setDocuments(documentData || []);
      setSales(salesData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token]);

  const uninvoicedSales = useMemo(() => {
    const used = new Set(documents.map((item) => item.sale_id));
    return sales.filter((sale) => !used.has(sale.id));
  }, [documents, sales]);

  const generateDocument = async () => {
    if (!form.sale_id) {
      setError('Select a sale record first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.createEInvoiceFromSale(session, Number(form.sale_id), {
        buyer_name: form.buyer_name || null,
        buyer_email: form.buyer_email || null,
        buyer_tin: form.buyer_tin || null,
        invoice_type: '01',
      });
      setForm({ sale_id: '', buyer_name: '', buyer_email: '', buyer_tin: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title="E-Invoicing" subtitle="LHDN-ready invoice preparation from recorded sales.">
        <ErrorBanner message={error} />
        <View style={styles.metricGrid}>
          <MetricCard label="Documents" value={String(summary?.total_documents || 0)} />
          <MetricCard label="Ready" value={String(summary?.ready_documents || 0)} tone="accent" />
          <MetricCard label="Tax gaps" value={String(summary?.missing_tax_identity || 0)} />
          <MetricCard label="Invoice value" value={money(summary?.total_invoice_value || 0)} />
        </View>
        <Text style={styles.answerText}>
          Generate structured invoice records from workspace sales, review tax identity gaps, and keep line-item payloads ready for a future MyInvois integration.
        </Text>
      </Panel>

      <Panel title="Generate from sale">
        <SelectorRow
          label="Sale record"
          options={uninvoicedSales.map((sale) => ({
            label: `Sale #${sale.id} • ${money(sale.total_amount)} • ${displayDate(sale.sale_date)}`,
            value: sale.id,
          }))}
          selectedValue={form.sale_id ? Number(form.sale_id) : null}
          onSelect={(value) => setForm((current) => ({ ...current, sale_id: String(value) }))}
        />
        <Field label="Buyer name" value={form.buyer_name} onChangeText={(value) => setForm((current) => ({ ...current, buyer_name: value }))} />
        <Field label="Buyer email" value={form.buyer_email} onChangeText={(value) => setForm((current) => ({ ...current, buyer_email: value }))} />
        <Field label="Buyer TIN" value={form.buyer_tin} onChangeText={(value) => setForm((current) => ({ ...current, buyer_tin: value }))} />
        <ActionButton title={submitting ? 'Generating...' : 'Generate e-invoice'} onPress={generateDocument} disabled={submitting} />
      </Panel>

      <Panel title="Readiness checks">
        <View style={styles.listBlock}>
          <Text style={styles.listItem}>• Structured MYR totals derived from recorded sales.</Text>
          <Text style={styles.listItem}>• Validation notes highlight missing buyer or seller tax identity.</Text>
          <Text style={styles.listItem}>• This is readiness support, not a live MyInvois submission claim.</Text>
        </View>
      </Panel>

      <Panel title="Generated documents">
        {documents.length ? (
          documents.map((document) => (
            <View key={document.id} style={styles.rowCard}>
              <View style={styles.rowCardMain}>
                <Text style={styles.rowTitle}>{document.document_number}</Text>
                <Text style={styles.rowBody}>
                  Sale #{document.sale_id} • {document.invoice_type} • {document.currency}
                </Text>
                <Text style={styles.rowBodyMuted}>
                  {document.validation_status?.replaceAll('_', ' ')} • {displayDate(document.issue_date)}
                </Text>
                {document.validation_notes?.length ? (
                  <Text style={styles.rowBodyMuted}>{document.validation_notes.join(' • ')}</Text>
                ) : null}
              </View>
              <Chip label={money(document.total_amount)} active />
            </View>
          ))
        ) : (
          <EmptyState title="No e-invoice documents" body="Generate the first one from an existing sale record." />
        )}
      </Panel>
    </View>
  );
}

function CopilotScreen({ session, sessionPlan }) {
  const [capabilities, setCapabilities] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [query, setQuery] = useState(COPILOT_PROMPTS[0]);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [querying, setQuerying] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [capabilityData, recommendationData] = await Promise.all([
        api.getCapabilities(session),
        api.getRecommendations(session, { limit: 6 }),
      ]);
      setCapabilities(capabilityData);
      setRecommendations(recommendationData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token]);

  const ask = async () => {
    setQuerying(true);
    setError('');
    try {
      setResponse(
        await api.askCopilot(session, {
          message: query,
          organization_id: 'mobile-app',
          user_plan: sessionPlan,
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setQuerying(false);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title="AI Copilot" subtitle="MCP-backed routing across inventory, sales, returns, logistics, and compliance.">
        <ErrorBanner message={error} />
        <InlineValue label="Requested plan" value={toDisplayPlan(sessionPlan)} />
        <InlineValue label="Backend plan" value={toDisplayPlan(capabilities?.plan_level) || 'Unknown'} />
        <Text style={styles.sectionLabel}>Prompt</Text>
        <Field label="Message" value={query} onChangeText={setQuery} multiline />
        <View style={styles.chipRow}>
          {COPILOT_PROMPTS.map((prompt) => (
            <Chip key={prompt} label={prompt.slice(0, 26)} onPress={() => setQuery(prompt)} />
          ))}
        </View>
        <ActionButton title={querying ? 'Running query...' : 'Ask Copilot'} onPress={ask} disabled={querying} />
      </Panel>

      <Panel title="Capabilities">
        {capabilities ? <CapabilityMatrix currentPlan={sessionPlan} capabilities={capabilities} /> : <EmptyState title="No capabilities" body="Capabilities could not be loaded." />}
      </Panel>

      <Panel title="Structured response">
        {response ? <JsonPreview data={response} /> : <EmptyState title="No response yet" body="Submit a copilot prompt to see tools used, citations, and recommendations." />}
      </Panel>

      <Panel title="Recent recommendations">
        {recommendations.length ? recommendations.map((item) => <RecommendationItem key={item.id} recommendation={item} />) : <EmptyState title="No recommendations" body="No scheduled agent recommendations were returned." />}
      </Panel>
    </View>
  );
}

function PlansScreen() {
  const plans = [
    {
      name: 'Free',
      description: 'Inventory starter, basic stock tracking, and limited supply tracking.',
      features: ['Basic inventory tracking', 'Basic supply tracking', 'Limited stock visibility'],
    },
    {
      name: 'Premium',
      description: 'Operations intelligence, sales insights, returns analytics, and basic RAG.',
      features: ['Best product sales insights', 'Returns/profit intelligence', 'RAG agents', 'Advanced analytics'],
    },
    {
      name: 'Boost',
      description: 'AI control tower, logistics control tower, and advanced MCP/RAG workflows.',
      features: ['Logistics control tower', 'Advanced MCP/RAG agents', 'Route delay intelligence', 'Supplier and inventory flow optimization'],
    },
  ];

  return (
    <View style={styles.screenStack}>
      <Panel title="Plans" subtitle="The same commercial structure used across the web workspace.">
        {plans.map((plan, index) => (
          <AppCard
            key={plan.name}
            variant={index === 0 ? 'muted' : index === 1 ? 'default' : 'dark'}
            size="md"
            theme={theme}
            style={styles.planCard}
          >
            <Text style={styles.rowTitle}>{plan.name}</Text>
            <Text style={styles.rowBody}>{plan.description}</Text>
            <View style={styles.listBlock}>
              {plan.features.map((feature) => (
                <Text key={feature} style={styles.listItem}>• {feature}</Text>
              ))}
            </View>
          </AppCard>
        ))}
      </Panel>

      <Panel title="Integration ladder" subtitle="What each tier can safely connect to.">
        <View style={styles.listBlock}>
          <Text style={styles.listItem}>• Free: public/preview warehouse directory, Malaysia demand signals, BNM rates, and weather plus preview port risk.</Text>
          <Text style={styles.listItem}>• Premium: user-owned marketplace connections and own-store weekly best sellers.</Text>
          <Text style={styles.listItem}>• Boost: paid market-intelligence and advanced logistics provider readiness. If no provider is configured, IntelliFlow returns not configured instead of fake live data.</Text>
        </View>
      </Panel>
    </View>
  );
}

function AccountScreen({ currentUser, sessionPlan }) {
  return (
    <View style={styles.screenStack}>
      <Panel title="Profile" subtitle="Workspace identity and current plan context.">
        <InlineValue label="Name" value={currentUser?.full_name || 'IntelliFlow user'} />
        <InlineValue label="Email" value={currentUser?.email || 'Not available'} />
        <InlineValue label="Plan" value={toDisplayPlan(sessionPlan)} />
      </Panel>
    </View>
  );
}

function RecommendationsScreen({ session }) {
  const [capabilities, setCapabilities] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [capabilityData, recommendationData] = await Promise.all([
        api.getCapabilities(session),
        api.getRecommendations(session, { limit: 25 }),
      ]);
      setCapabilities(capabilityData);
      setRecommendations(recommendationData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token]);

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title="Agent recommendations" subtitle="Backend-filtered recommendations produced by scheduled MCP scans.">
        <ErrorBanner message={error} />
        <InlineValue label="Plan" value={toDisplayPlan(capabilities?.plan_level) || 'Unknown'} />
        <InlineValue label="Allowed domains" value={(capabilities?.allowed_domains || []).join(', ') || 'None'} />
      </Panel>

      <Panel title="Recommendation queue" right={<ActionButton title="Reload" tone="secondary" onPress={load} />}>
        {recommendations.length ? recommendations.map((item) => <RecommendationItem key={item.id} recommendation={item} />) : <EmptyState title="No recommendations" body="No current MCP recommendations are visible for this user." />}
      </Panel>
    </View>
  );
}

function AlertsScreen({ session }) {
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const settled = await Promise.allSettled([
        api.getNotifications(session, { limit: 30 }),
        api.getNotificationPreferences(session),
        api.getNotificationUnreadCount(session),
      ]);
      const failures = settled.filter((result) => result.status === 'rejected');
      if (failures.length) {
        setError(failures[0].reason?.message || 'Some notification data could not load.');
      }
      setNotifications(settled[0]?.status === 'fulfilled' ? settled[0].value || [] : []);
      setPreferences(settled[1]?.status === 'fulfilled' ? settled[1].value || [] : []);
      setUnreadCount(settled[2]?.status === 'fulfilled' ? settled[2].value?.unread_count || 0 : 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session.apiUrl, session.token]);

  if (loading) {
    return <LoadingBlock />;
  }

  const markRead = async (notificationId) => {
    try {
      await api.markNotificationRead(session, notificationId);
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePreference = async (preference) => {
    try {
      const updated = await api.updateNotificationPreference(session, preference.category, {
        enabled: !preference.enabled,
        push_enabled: preference.push_enabled,
        email_enabled: preference.email_enabled,
      });
      setPreferences((current) => current.map((item) => (item.category === preference.category ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  };

  const updateChannel = async (preference, changes) => {
    try {
      const updated = await api.updateNotificationPreference(session, preference.category, {
        enabled: preference.enabled,
        push_enabled: changes.push_enabled ?? preference.push_enabled,
        email_enabled: changes.email_enabled ?? preference.email_enabled,
      });
      setPreferences((current) => current.map((item) => (item.category === preference.category ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.screenStack}>
      <Panel title="Notifications" subtitle="Unread alerts and preferences filtered by the backend subscription tier.">
        <ErrorBanner message={error} />
        <View style={styles.metricGrid}>
          <MetricCard label="Unread" value={String(unreadCount)} tone="accent" />
          <MetricCard label="Categories" value={String(preferences.length)} />
          <MetricCard label="Recent alerts" value={String(notifications.length)} />
        </View>
      </Panel>

      <Panel title="Recent alerts">
        {notifications.length ? (
          notifications.map((notification) => (
            <View key={notification.id} style={styles.rowCard}>
              <View style={styles.recommendationHeader}>
                <View style={styles.recommendationCopy}>
                  <Text style={styles.rowTitle}>{notification.title}</Text>
                  <Text style={styles.rowBodyMuted}>
                    {notification.category} • {displayDate(notification.created_at)}
                  </Text>
                </View>
                <Chip label={notification.read_at ? 'Read' : 'Unread'} tone={notification.read_at ? 'default' : 'accent'} />
              </View>
              <Text style={styles.rowBody}>{notification.body}</Text>
              {!notification.read_at ? (
                <View style={styles.inlineActions}>
                  <ActionButton title="Mark read" tone="secondary" onPress={() => markRead(notification.id)} />
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <EmptyState title="No alerts" body="No workspace notifications are currently available." />
        )}
      </Panel>

      <Panel title="Preferences">
        {preferences.length ? (
          preferences.map((preference) => (
            <View key={preference.category} style={styles.rowCard}>
              <View style={styles.recommendationHeader}>
                <View style={styles.recommendationCopy}>
                  <Text style={styles.rowTitle}>{NOTIFICATION_CATEGORY_COPY[preference.category] || preference.category.replaceAll('_', ' ')}</Text>
                  <Text style={styles.rowBodyMuted}>
                    In-app default • Push urgent/actionable • Email summaries later
                  </Text>
                </View>
                <Chip label={preference.enabled ? 'Enabled' : 'Muted'} tone={preference.enabled ? 'success' : 'warning'} />
              </View>
              <View style={styles.inlineActions}>
                <ActionButton title={preference.enabled ? 'Mute' : 'Enable'} tone="secondary" onPress={() => togglePreference(preference)} />
              </View>
              <View style={styles.preferenceToggleRow}>
                <Chip
                  label={`In-app ${preference.enabled ? 'On' : 'Off'}`}
                  active={preference.enabled}
                  onPress={() => togglePreference(preference)}
                />
                <Chip
                  label={`Push ${preference.push_enabled ? 'On' : 'Off'}`}
                  active={preference.push_enabled}
                  onPress={() => updateChannel(preference, { push_enabled: !preference.push_enabled })}
                />
                <Chip
                  label={`Email ${preference.email_enabled ? 'On' : 'Off'}`}
                  active={preference.email_enabled}
                  onPress={() => updateChannel(preference, { email_enabled: !preference.email_enabled })}
                />
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No preferences" body="Notification preferences were not returned for this account." />
        )}
      </Panel>
    </View>
  );
}

function ManufacturingScreen() {
  return (
    <View style={styles.screenStack}>
      <Panel title="Manufacturing" subtitle="The web app currently exposes manufacturing routes as placeholders, so mobile mirrors that state.">
        <Text style={styles.answerText}>
          BOM definitions, production order orchestration, and material consumption tracking are scaffolded on web but not implemented through a live backend workflow yet.
        </Text>
      </Panel>
      <Panel title="BOM workspace">
        <EmptyState title="Scaffolded only" body="Reserved for bill of materials, component dependencies, and product structure control." />
      </Panel>
      <Panel title="Production orders">
        <EmptyState title="Scaffolded only" body="Reserved for work orders, build progress, and production execution tracking." />
      </Panel>
    </View>
  );
}

function SelectorRow({ label, options, selectedValue, onSelect }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {options.map((option) => (
          <Chip
            key={`${label}-${String(option.value)}`}
            label={option.label}
            active={selectedValue === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function RecommendationItem({ recommendation }) {
  return (
    <View style={styles.recommendationCard}>
      <View style={styles.recommendationHeader}>
        <View style={styles.recommendationCopy}>
          <Text style={styles.rowTitle}>{recommendation.title}</Text>
          <Text style={styles.rowBodyMuted}>
            {recommendation.domain} • {recommendation.recommendation_type} • {displayDate(recommendation.created_at)}
          </Text>
        </View>
        <Chip label={recommendation.severity} tone={recommendation.severity?.toLowerCase() === 'critical' ? 'warning' : 'default'} />
      </View>
      <Text style={styles.rowBody}>{recommendation.explanation}</Text>
      <Text style={styles.rowBodyMuted}>
        Status: {recommendation.status}
        {recommendation.affected_skus?.length ? ` • SKUs: ${recommendation.affected_skus.join(', ')}` : ''}
        {recommendation.affected_orders?.length ? ` • Orders: ${recommendation.affected_orders.join(', ')}` : ''}
        {recommendation.affected_shipments?.length ? ` • Shipments: ${recommendation.affected_shipments.join(', ')}` : ''}
      </Text>
      {recommendation.recommended_action ? <Text style={styles.recommendationAction}>Action: {recommendation.recommended_action}</Text> : null}
    </View>
  );
}

function ScreenRenderer({ activeScreen, session, sessionPlan, currentUser }) {
  switch (activeScreen) {
    case 'dashboard':
      return <DashboardScreen session={session} currentUser={currentUser} sessionPlan={sessionPlan} />;
    case 'products':
      return <ProductsScreen session={session} />;
    case 'inventory':
      return <InventoryScreen session={session} />;
    case 'sales':
      return <SalesScreen session={session} sessionPlan={sessionPlan} />;
    case 'purchasing':
      return <PurchasingScreen session={session} />;
    case 'transfers':
      return <TransfersScreen session={session} />;
    case 'returns':
      return <ReturnsScreen session={session} sessionPlan={sessionPlan} />;
    case 'logistics':
      return <LogisticsScreen session={session} sessionPlan={sessionPlan} />;
    case 'compliance':
      return <ComplianceScreen session={session} sessionPlan={sessionPlan} />;
    case 'einvoicing':
      return <EInvoicingScreen session={session} />;
    case 'copilot':
      return <CopilotScreen session={session} sessionPlan={sessionPlan} />;
    case 'plans':
      return <PlansScreen />;
    case 'account':
      return <AccountScreen currentUser={currentUser} sessionPlan={sessionPlan} />;
    case 'recommendations':
      return <RecommendationsScreen session={session} />;
    case 'alerts':
      return <AlertsScreen session={session} />;
    case 'manufacturing':
      return <ManufacturingScreen />;
    default:
      return <DashboardScreen session={session} currentUser={currentUser} sessionPlan={sessionPlan} />;
  }
}

export default function MobileApp() {
  const [sessionDraft, setSessionDraft] = useState({
    plan: 'FREE',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [appConfig, setAppConfig] = useState(null);
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [authMode, setAuthMode] = useState('welcome');
  const [connectError, setConnectError] = useState('');
  const [connectStatus, setConnectStatus] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [bootState, setBootState] = useState('loading');
  const [previewMode, setPreviewMode] = useState(false);
  const themeMode = 'light';

  const sessionPlan = session?.plan || 'FREE';
  theme = getAppTheme(themeMode);
  styles = createStyles(theme);

  const startDemoSession = async (baseSessionOverride) => {
    const apiUrl = baseSessionOverride?.apiUrl || getApiBaseUrl();
    const publicSession = { apiUrl, plan: 'FREE', token: null, userId: null };
    await demoBootstrap(publicSession);
    const demo = await demoLogin(publicSession);
      const candidate = {
        apiUrl,
        token: demo?.access_token,
        plan: demo?.user?.plan || 'BOOST',
      userId: demo?.user?.id || null,
      organizationId: demo?.user?.organization_id || null,
      isDemo: true,
    };
    let me;
    try {
      me = await api.getMe(candidate);
    } catch {
      me = {
        id: demo?.user?.id || null,
        email: demo?.user?.email || 'demo@intelliflow.local',
        full_name: demo?.user?.name || 'Demo User',
      };
      }
      candidate.plan = me?.subscription_plan || candidate.plan;
      candidate.userId = me?.id || candidate.userId;
      setSession(candidate);
      setCurrentUser(me);
  };

  const initializeAppSession = async () => {
    setBootState('loading');
    setPreviewMode(false);
    setConnectError('');
    setConnectStatus('');
    try {
      const apiUrl = getApiBaseUrl();
      const publicSession = { apiUrl, plan: 'FREE', token: null, userId: null };
      await healthCheck(publicSession);
      const config = await getPublicAppConfig(publicSession);
      setAppConfig(config);

      if (config?.demo_mode_enabled && config?.auth_mode === 'demo') {
        await startDemoSession(publicSession);
      } else {
        setSession(null);
        setCurrentUser(null);
      }
      setBootState('ready');
    } catch (error) {
      setBootState('unavailable');
      setSession(null);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    initializeAppSession();
  }, []);

  const connect = async () => {
    setConnecting(true);
    setConnectError('');
    setConnectStatus('');
    try {
      if (!firebaseConfigReady || !auth) {
        throw new Error('Firebase mobile config is missing. Add the Firebase web app values, regenerate mobile/firebase.config.json, and restart Expo.');
      }
      const apiUrl = getApiBaseUrl();
      const email = sessionDraft.email.trim();
      const password = sessionDraft.password;

      if (!isValidEmail(email)) {
        throw new Error('Enter a valid work email address.');
      }

      if (authMode === 'register') {
        if (!isValidPassword(password)) {
          throw new Error('Password must be 8+ chars with upper, lower, and a number.');
        }
        if (password !== sessionDraft.confirmPassword) {
          throw new Error('Passwords do not match.');
        }
      }

      if (authMode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setConnectStatus('Reset link sent. Check your inbox and spam folder for the IntelliFlow recovery email.');
        return;
      }

      let credential;
      if (authMode === 'register') {
        credential = await createUserWithEmailAndPassword(auth, email, password);
        if (sessionDraft.fullName.trim()) {
          await updateProfile(credential.user, { displayName: sessionDraft.fullName.trim() });
        }
      } else {
        credential = await signInWithEmailAndPassword(auth, email, password);
      }

      const token = await credential.user.getIdToken();
      const candidate = {
        apiUrl,
        token,
        plan: sessionDraft.plan,
        userId: null,
      };
      const me = await api.getMe(candidate);
      candidate.plan = me?.subscription_plan || candidate.plan;
      candidate.userId = me?.id || null;
      setSession(candidate);
      setCurrentUser(me);
      setConnectStatus(authMode === 'register' ? 'Workspace created successfully. Opening your IntelliFlow mobile workspace...' : 'Sign-in successful. Opening your IntelliFlow mobile workspace...');
    } catch (err) {
      if (authMode === 'register') {
        setConnectError(getRegisterErrorMessage(err));
      } else if (authMode === 'reset') {
        setConnectError(getResetPasswordErrorMessage(err));
      } else {
        setConnectError(getLoginErrorMessage(err));
      }
    } finally {
      setConnecting(false);
    }
  };

  const continueDemo = async () => {
    setConnecting(true);
    setConnectError('');
    setConnectStatus('');
    try {
      await startDemoSession();
      setConnectStatus('Demo workspace ready.');
    } catch (err) {
      setConnectError(err?.message || 'Unable to open demo workspace right now.');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (session?.isDemo) {
      setSession(null);
      setCurrentUser(null);
      initializeAppSession();
      return;
    }
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch {}
    setSession(null);
    setCurrentUser(null);
    setActiveScreen('dashboard');
    setConnectStatus('');
  };

  const activeNavItem = useMemo(() => getNavigationItemByRoute(activeScreen), [activeScreen]);
  const activeLabel = activeNavItem?.label || SCREENS.find((screen) => screen.key === activeScreen)?.label || 'Dashboard';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <AppBackdrop />
      {bootState === 'loading' ? (
        <LoadingScreen label="Launching IntelliFlow..." mode="light" />
      ) : bootState === 'unavailable' && !previewMode ? (
        <ServiceUnavailableScreen
          onRetry={initializeAppSession}
          onPreview={() => setPreviewMode(true)}
          previewEnabled
          mode="light"
        />
      ) : previewMode ? (
        <PreviewModeScreen onRetry={initializeAppSession} />
      ) : connecting && !session ? (
        <LoadingScreen
          label={
            authMode === 'register'
              ? 'Creating your IntelliFlow account...'
              : authMode === 'reset'
                ? 'Sending reset link...'
                : 'Signing you in...'
          }
          mode="light"
        />
      ) : !session ? (
        <SetupScreen
          draft={sessionDraft}
          setDraft={setSessionDraft}
          error={connectError}
          status={connectStatus}
          loading={connecting}
          authMode={authMode}
          setAuthMode={setAuthMode}
          onConnect={connect}
          onDemoLogin={continueDemo}
          appConfig={appConfig}
          mode="light"
        />
      ) : (
        <View style={styles.appShell}>
          <MobileHeader
            theme={theme}
          />
          <MobileNavigationTracker
            items={navigationItems}
            activeKey={activeNavItem?.key}
            onSelect={setActiveScreen}
            detail={activeNavItem?.shortDescription}
            theme={theme}
          />

          <ScrollView contentContainerStyle={styles.content}>
            <ScreenRenderer activeScreen={activeScreen} session={session} sessionPlan={sessionPlan} currentUser={currentUser} />
          </ScrollView>

          <BottomTabBar activeScreen={activeScreen} onSelect={setActiveScreen} />
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(theme) {
  const isDark = theme.mode === 'dark';
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.bg,
  },
  backdropGlowTop: {
    display: 'none',
  },
  backdropGlowMid: {
    display: 'none',
  },
  backdropGlowBottom: {
    display: 'none',
  },
  backdropGrid: {
    display: 'none',
  },
  appShell: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  setupWrap: {
    padding: 16,
    paddingBottom: 32,
    minHeight: '100%',
  },
  authScreen: {
    minHeight: '100%',
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#090705',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 20,
  },
  authBackgroundGlowPrimary: {
    display: 'none',
  },
  authBackgroundGlowSecondary: {
    display: 'none',
  },
  authGlassPaneOne: {
    display: 'none',
  },
  authGlassPaneTwo: {
    display: 'none',
  },
  authTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  authTopLink: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  authTopLinkText: {
    color: '#fff8f2',
    fontSize: responsiveFont(15),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  authWelcomeShell: {
    flex: 1,
    minHeight: 420,
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  authWelcomeSpacer: {
    minHeight: 180,
  },
  authWelcomeFooter: {
    gap: 16,
    paddingBottom: 24,
  },
  authWelcomeHeadline: {
    color: '#fff8f2',
    fontSize: responsiveFont(24, { min: 22, max: 28 }),
    lineHeight: responsiveLineHeight(24, 1.2),
    fontWeight: '800',
    letterSpacing: -1.2,
    maxWidth: 290,
  },
  authFormHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 18,
  },
  authLogoStage: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authLogoPlateBack: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    transform: [{ translateY: 18 }, { rotate: '-20deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
  },
  authLogoPlateFront: {
    width: 132,
    height: 132,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    transform: [{ rotate: '18deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  authCard: {
    gap: 14,
  },
  authCardWelcome: {
    marginTop: 'auto',
    paddingBottom: 8,
  },
  authCardForm: {
    marginTop: 6,
  },
  authCardTitle: {
    color: '#fff8f2',
    fontSize: responsiveFont(25),
    lineHeight: responsiveLineHeight(25, 1.22),
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  authCardSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: responsiveFont(14),
    lineHeight: responsiveLineHeight(14, 1.5),
  },
  authWelcomeTitle: {
    color: '#fff8f2',
    fontSize: responsiveFont(32, { min: 28, max: 36 }),
    lineHeight: responsiveLineHeight(32, 1.08),
    fontWeight: '800',
    letterSpacing: -1.4,
  },
  authWelcomeBody: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: responsiveFont(14),
    lineHeight: responsiveLineHeight(14, 1.5),
    maxWidth: 300,
  },
  authWelcomeActions: {
    gap: 12,
    marginTop: 6,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotPasswordText: {
    color: '#fff8f2',
    fontSize: responsiveFont(13),
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  authBottomMeta: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: responsiveFont(12),
    lineHeight: responsiveLineHeight(13, 1.45),
    textAlign: 'center',
    marginTop: 4,
  },
  authBackLink: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  authBackLinkText: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: responsiveFont(13),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  authInlineMetaButton: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  authInlineMetaButtonText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: responsiveFont(13),
    fontWeight: '600',
  },
  authFieldLabel: {
    color: '#fff8f2',
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '500',
    fontSize: responsiveFont(13),
  },
  authInput: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(18, 18, 18, 0.78)',
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#fff8f2',
  },
  authChip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  authChipActive: {
    backgroundColor: '#f5b24c',
    borderColor: '#f5b24c',
  },
  authChipText: {
    color: 'rgba(255,248,242,0.78)',
  },
  authChipTextActive: {
    color: '#1d120b',
  },
  authActionButton: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  authActionButtonPrimary: {
    backgroundColor: '#f3c85e',
  },
  authActionButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  authActionButtonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  authActionButtonText: {
    color: '#1d120b',
    fontSize: responsiveFont(17),
    fontWeight: '700',
  },
  authActionButtonTextSecondary: {
    color: '#fff8f2',
  },
  brandLogoShell: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoShellLarge: {
    width: 132,
    height: 132,
  },
  brandLogoLayer: {
    position: 'absolute',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoLayerBack: {
    width: 92,
    height: 92,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(74, 51, 35, 0.08)',
    transform: [{ translateY: 18 }, { rotate: '-12deg' }],
    borderWidth: 1,
    borderColor: theme.border,
  },
  brandLogoLayerFront: {
    width: 92,
    height: 92,
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.86)',
    transform: [{ rotate: '12deg' }],
    borderWidth: 1,
    borderColor: theme.border,
  },
  brandLogoGlyph: {
    color: '#ff7b35',
    fontSize: responsiveFont(26),
    fontWeight: '900',
    letterSpacing: -1,
    transform: [{ rotate: '-12deg' }],
  },
  brandLogoGlyphLarge: {
    fontSize: responsiveFont(34),
  },
  loadingScreenWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  loadingScreenTitle: {
    color: theme.text,
    fontSize: responsiveFont(34),
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  loadingScreenBody: {
    color: theme.textMuted,
    fontSize: responsiveFont(15),
    lineHeight: responsiveLineHeight(15, 1.55),
    textAlign: 'center',
    maxWidth: 260,
  },
  loadingTrack: {
    width: '82%',
    height: 10,
    borderRadius: 999,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(74, 51, 35, 0.08)',
    overflow: 'hidden',
    marginTop: 4,
  },
  loadingFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ff7b35',
  },
  loadingScreenMeta: {
    color: theme.textSoft,
    fontSize: responsiveFont(12),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  landingHeader: {
    alignItems: 'center',
    paddingTop: 8,
  },
  landingBrand: {
    color: theme.text,
    fontSize: responsiveFont(34),
    fontWeight: '800',
    letterSpacing: -1.4,
  },
  themeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  modeOrbWrap: {
    overflow: 'hidden',
  },
  modeOrbWrapVisible: {
    width: 42,
    opacity: 1,
  },
  modeOrbWrapHidden: {
    width: 0,
    opacity: 0,
  },
  modeOrb: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: isDark ? '#8a6545' : 'rgba(101, 74, 52, 0.24)',
  },
  modeOrbDark: {
    backgroundColor: '#101010',
  },
  modeOrbLight: {
    backgroundColor: '#f5f0ea',
  },
  themeToggleButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: isDark ? '#8a6545' : 'rgba(101, 74, 52, 0.2)',
    backgroundColor: isDark ? '#583c28' : 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
  },
  themeToggleButtonText: {
    color: theme.text,
    fontSize: responsiveFont(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: isDark ? 'rgba(255, 249, 240, 0.12)' : 'rgba(255, 249, 240, 0.92)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(91, 59, 42, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#7a5a44',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  heroBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#6d4732',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeIconText: {
    color: '#f5c987',
    fontSize: responsiveFont(15),
    fontWeight: '800',
  },
  heroBadgeText: {
    color: theme.text,
    fontSize: responsiveFont(11),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.9,
  },
  heroPanel: {
    backgroundColor: isDark ? '#0f2744' : '#f7f1e9',
    borderRadius: 38,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 235, 216, 0.14)' : 'rgba(120, 85, 57, 0.12)',
    minHeight: 770,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroOrb: {
    display: 'none',
  },
  heroGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    borderRadius: 38,
  },
  heroArc: {
    position: 'absolute',
    top: 44,
    left: 24,
    right: 24,
    height: 360,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 222, 194, 0.12)',
    borderRadius: 240,
  },
  heroSkyline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 290,
    backgroundColor: isDark ? 'rgba(7, 10, 18, 0.42)' : 'rgba(181, 158, 136, 0.24)',
  },
  heroTower: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: isDark ? 'rgba(22, 31, 44, 0.92)' : 'rgba(140, 118, 98, 0.7)',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 228, 198, 0.08)',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 86,
    paddingBottom: 36,
    gap: 18,
  },
  heroTitle: {
    color: theme.mode === 'dark' ? '#fffaf5' : theme.text,
    fontSize: responsiveFont(48, { min: 42, max: 54 }),
    lineHeight: responsiveLineHeight(48, 1.08),
    fontWeight: '800',
    letterSpacing: -2.2,
    textAlign: 'center',
  },
  heroMetricBody: {
    color: theme.textMuted,
    fontSize: responsiveFont(13),
    lineHeight: responsiveLineHeight(13, 1.4),
  },
  heroDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroDividerLine: {
    width: 72,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(246, 217, 179, 0.72)',
  },
  heroDividerDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#f0bd74',
  },
  heroBody: {
    color: theme.textSecondary || theme.textMuted,
    fontSize: responsiveFont(16),
    lineHeight: responsiveLineHeight(16, 1.75),
    textAlign: 'center',
    maxWidth: 420,
  },
  heroActionStack: {
    width: '100%',
    gap: 16,
    marginTop: 8,
    maxWidth: 400,
  },
  landingButton: {
    minHeight: 78,
    borderRadius: 999,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  landingButtonPrimary: {
    backgroundColor: isDark ? 'rgba(92, 56, 34, 0.88)' : '#5c3822',
    borderColor: isDark ? '#f0c58d' : '#5c3822',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  landingButtonSecondary: {
    backgroundColor: isDark ? 'rgba(255, 249, 240, 0.96)' : 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(91, 59, 42, 0.12)',
  },
  landingButtonIcon: {
    color: '#efc79d',
    fontSize: responsiveFont(24),
    width: 32,
    textAlign: 'center',
  },
  landingButtonIconSecondary: {
    color: theme.text,
    fontSize: responsiveFont(24),
    width: 32,
    textAlign: 'center',
  },
  landingButtonPrimaryText: {
    color: '#fff7f0',
    fontSize: responsiveFont(21),
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  landingButtonSecondaryText: {
    color: theme.text,
    fontSize: responsiveFont(21),
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  landingButtonArrow: {
    color: '#fff7f0',
    fontSize: responsiveFont(32),
    lineHeight: responsiveLineHeight(32, 1),
  },
  landingButtonArrowSecondary: {
    color: theme.text,
    fontSize: responsiveFont(32),
    lineHeight: responsiveLineHeight(32, 1),
  },
  heroFooter: {
    color: theme.textMuted,
    fontSize: responsiveFont(14),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  headerShell: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  headerShellCompact: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 12,
  },
  headerCompactBar: {
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(71, 28, 12, 0.72)' : 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 123, 0.12)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCompactSpacer: {
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCompactBadge: {
    minWidth: 54,
    height: 38,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(74, 51, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerCompactBadgeText: {
    color: theme.text,
    fontSize: responsiveFont(12),
    fontWeight: '700',
  },
  headerCompactToggle: {
    minWidth: 56,
    height: 38,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(74, 51, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerCompactToggleText: {
    color: theme.text,
    fontSize: responsiveFont(12),
    fontWeight: '700',
  },
  headerCompactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ff6433',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCompactAvatarText: {
    color: '#fff9f5',
    fontSize: responsiveFont(18),
    fontWeight: '700',
  },
  headerCompactTitle: {
    color: theme.text,
    fontSize: responsiveFont(28),
    fontWeight: '300',
    letterSpacing: -1.2,
  },
  headerCompactSubtitle: {
    color: theme.textMuted,
    fontSize: responsiveFont(13),
  },
  headerBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.panel,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: theme.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  brandMarkText: {
    color: '#2b1d13',
    fontSize: responsiveFont(16),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerEyebrow: {
    color: theme.accentSoft,
    fontSize: responsiveFont(11),
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  headerTitle: {
    color: theme.text,
    fontSize: responsiveFont(28),
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    color: theme.textMuted,
    fontSize: responsiveFont(13),
    lineHeight: responsiveLineHeight(13, 1.35),
  },
  headerStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  headerStatCard: {
    flex: 1,
    backgroundColor: theme.panelSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    gap: 4,
  },
  headerStatLabel: {
    color: theme.textSoft,
    fontSize: responsiveFont(11),
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  headerStatValue: {
    color: theme.text,
    fontSize: responsiveFont(15),
    fontWeight: '700',
  },
  navShell: {
    paddingBottom: 8,
  },
  navShellSecondary: {
    paddingBottom: 6,
  },
  navRow: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    gap: 10,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    width: '100%',
  },
  bottomTabShell: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    minHeight: 84,
    borderRadius: 28,
    backgroundColor: isDark ? 'rgba(64, 26, 11, 0.95)' : 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 126, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bottomTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 58,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomTabItemActive: {
    backgroundColor: '#ff6433',
    minHeight: 62,
  },
  bottomTabIcon: {
    color: theme.textMuted,
    fontSize: responsiveFont(14),
    fontWeight: '700',
  },
  bottomTabIconActive: {
    color: '#fffaf5',
  },
  bottomTabLabel: {
    color: theme.textSoft,
    fontSize: responsiveFont(10),
    fontWeight: '700',
  },
  bottomTabLabelActive: {
    color: '#fffaf5',
  },
  planCard: {
    gap: 10,
  },
  bootWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  bootText: {
    color: theme.textMuted,
    fontSize: responsiveFont(15),
    fontWeight: '600',
  },
  screenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  screenTopBarButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(90, 70, 60, 0.38)',
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTopBarButtonText: {
    color: theme.text,
    fontSize: responsiveFont(18),
    fontWeight: '700',
  },
  screenTopBarTitle: {
    color: theme.text,
    fontSize: responsiveFont(22),
    fontWeight: '500',
  },
  screenStack: {
    gap: 16,
  },
  showcaseCard: {
    borderRadius: 34,
    backgroundColor: isDark ? 'rgba(19, 12, 8, 0.96)' : 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(245, 210, 180, 0.12)',
    padding: 20,
    overflow: 'hidden',
    gap: 16,
  },
  showcaseCardBlue: {
    backgroundColor: '#3d68ef',
  },
  showcaseGlow: {
    display: 'none',
  },
  showcaseTitle: {
    color: isDark ? '#fffaf5' : theme.text,
    fontSize: responsiveFont(32),
    lineHeight: responsiveLineHeight(32, 1.1),
    fontWeight: '300',
    letterSpacing: -1.4,
    maxWidth: 220,
  },
  showcaseBody: {
    color: theme.textMuted,
    fontSize: responsiveFont(14),
    lineHeight: responsiveLineHeight(14, 1.4),
    maxWidth: 280,
  },
  showcaseTitleOnDark: {
    color: '#fffaf5',
  },
  showcaseBodyOnDark: {
    color: 'rgba(255, 244, 233, 0.78)',
  },
  panel: {
    backgroundColor: theme.panel,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  panelHeaderCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  panelTitle: {
    color: theme.text,
    fontSize: responsiveFont(20),
    fontWeight: '700',
  },
  panelSubtitle: {
    color: theme.textMuted,
    fontSize: responsiveFont(14),
    lineHeight: responsiveLineHeight(14, 1.5),
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  routePreview: {
    height: 90,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  routePreviewLarge: {
    height: 190,
    borderRadius: 26,
    backgroundColor: '#090909',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  routePath: {
    position: 'absolute',
    left: 54,
    right: 80,
    top: 43,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  routePathWide: {
    position: 'absolute',
    left: 40,
    right: 58,
    top: 98,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  routeNodeOrange: {
    position: 'absolute',
    left: 28,
    top: 34,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#ff6433',
  },
  routeNodeBlue: {
    position: 'absolute',
    left: '48%',
    top: 30,
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#426cf0',
  },
  routeNodeOrangeSmall: {
    position: 'absolute',
    right: 28,
    top: 38,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#ff8e53',
  },
  routeMapGlowLeft: {
    display: 'none',
  },
  routeMapGlowRight: {
    display: 'none',
  },
  metricCard: {
    minWidth: '47%',
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: theme.panelSoft,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
  },
  metricCardAccent: {
    backgroundColor: 'rgba(246, 152, 50, 0.16)',
    borderColor: 'rgba(246, 152, 50, 0.24)',
  },
  capabilityMatrix: {
    gap: 14,
  },
  capabilityMatrixHeader: {
    gap: 4,
  },
  capabilityMatrixTitle: {
    color: theme.text,
    fontSize: responsiveFont(16),
    fontWeight: '700',
  },
  capabilityMatrixMeta: {
    color: theme.textMuted,
    fontSize: responsiveFont(12),
  },
  capabilityTable: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  capabilityTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.panelGlass,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  capabilityTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  capabilityTableHeaderText: {
    flex: 0.6,
    color: theme.textSoft,
    fontSize: responsiveFont(11),
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  capabilityFeatureCell: {
    flex: 1.8,
    textAlign: 'left',
  },
  capabilityRowLabel: {
    color: theme.text,
    fontSize: responsiveFont(12),
    lineHeight: responsiveLineHeight(12, 1.35),
  },
  capabilityDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capabilityDotEnabled: {
    backgroundColor: 'rgba(46, 165, 111, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(46, 165, 111, 0.32)',
  },
  capabilityDotDisabled: {
    backgroundColor: 'rgba(216, 90, 90, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(216, 90, 90, 0.28)',
  },
  capabilityDotText: {
    fontSize: responsiveFont(14),
    fontWeight: '800',
  },
  capabilityDotTextEnabled: {
    color: '#7cf0b6',
  },
  capabilityDotTextDisabled: {
    color: '#ffc4c4',
  },
  allowedDomainWrap: {
    gap: 8,
  },
  allowedDomainLabel: {
    color: theme.textSoft,
    fontSize: responsiveFont(11),
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  shipFlowMapShell: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  shipFlowMapBoard: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0b1119',
    borderWidth: 1,
    borderColor: 'rgba(154, 180, 215, 0.14)',
  },
  shipFlowMapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  shipFlowMapGlowLeft: {
    display: 'none',
  },
  shipFlowMapGlowRight: {
    display: 'none',
  },
  shipFlowSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 999,
    backgroundColor: '#47b4f4',
    opacity: 0.88,
  },
  shipFlowPort: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  shipFlowPortLow: {
    backgroundColor: '#34d399',
  },
  shipFlowPortMedium: {
    backgroundColor: '#fbbf24',
  },
  shipFlowPortHigh: {
    backgroundColor: '#f87171',
  },
  shipFlowPortCritical: {
    backgroundColor: '#991b1b',
  },
  shipFlowDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#d8e9ff',
  },
  shipFlowLegend: {
    width: '100%',
    gap: 8,
  },
  shipFlowLegendTitle: {
    color: theme.textSoft,
    fontSize: responsiveFont(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shipFlowLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  shipFlowLegendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  shipFlowLegendText: {
    color: theme.textMuted,
    fontSize: responsiveFont(12),
    marginRight: 6,
  },
  metricLabel: {
    color: theme.textSoft,
    fontSize: responsiveFont(12),
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  metricValue: {
    color: theme.text,
    fontSize: responsiveFont(24),
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  button: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  buttonSecondary: {
    backgroundColor: theme.panelGlass,
    borderColor: theme.border,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: theme.chipText,
    fontSize: responsiveFont(13),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  buttonSecondaryText: {
    color: theme.text,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    color: theme.textMuted,
    fontSize: responsiveFont(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    minHeight: 48,
    backgroundColor: theme.panelSoft,
    color: theme.text,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: responsiveFont(15),
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.panelGlass,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: theme.chip,
    borderColor: theme.chip,
  },
  chipWarning: {
    borderColor: 'rgba(239, 106, 106, 0.25)',
  },
  chipSuccess: {
    borderColor: 'rgba(73, 201, 139, 0.25)',
  },
  chipText: {
    color: theme.textMuted,
    fontSize: responsiveFont(12),
    fontWeight: '700',
  },
  chipTextActive: {
    color: theme.chipText,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 106, 106, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 106, 106, 0.25)',
    padding: 12,
  },
  errorText: {
    color: theme.mode === 'dark' ? '#ffd6d6' : '#8f3434',
    fontSize: responsiveFont(13),
    lineHeight: responsiveLineHeight(13, 1.45),
  },
  successBanner: {
    backgroundColor: 'rgba(73, 201, 139, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(73, 201, 139, 0.25)',
    padding: 12,
  },
  successText: {
    color: theme.mode === 'dark' ? '#d5ffea' : '#206646',
    fontSize: responsiveFont(13),
    lineHeight: responsiveLineHeight(13, 1.45),
  },
  loadingBlock: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCard: {
    backgroundColor: theme.panelSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    gap: 8,
  },
  rowCardMain: {
    gap: 4,
    minWidth: 0,
  },
  rowTitle: {
    color: isDark ? '#fffaf5' : theme.text,
    fontSize: responsiveFont(15),
    fontWeight: '800',
    flexShrink: 1,
  },
  rowBody: {
    color: isDark ? 'rgba(255,239,226,0.82)' : theme.textMuted,
    fontSize: responsiveFont(13),
    lineHeight: responsiveLineHeight(13, 1.45),
    flexShrink: 1,
  },
  rowBodyMuted: {
    color: isDark ? 'rgba(255,239,226,0.64)' : theme.textSoft,
    fontSize: responsiveFont(12),
    lineHeight: responsiveLineHeight(12, 1.4),
    flexShrink: 1,
  },
  orderHistoryCard: {
    backgroundColor: theme.panelSoft,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  orderHistoryVisual: {
    width: 86,
    height: 86,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inventoryHeadline: {
    color: isDark ? '#fffaf5' : theme.text,
    fontSize: responsiveFont(46, { min: 38, max: 54 }),
    lineHeight: responsiveLineHeight(46, 1.06),
    fontWeight: '300',
    letterSpacing: -2.2,
    marginTop: -2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterBoxCompact: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(103, 70, 46, 0.06)',
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBoxWide: {
    minWidth: 126,
    height: 58,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(103, 70, 46, 0.06)',
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  filterBoxAddress: {
    flex: 1,
    minWidth: 170,
    height: 58,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(103, 70, 46, 0.06)',
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  filterBoxText: {
    color: isDark ? '#fffaf5' : theme.text,
    fontSize: responsiveFont(15),
    fontWeight: '500',
    flexShrink: 1,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productTile: {
    width: '47%',
    flexBasis: '47%',
    backgroundColor: isDark ? '#26211d' : '#fffaf5',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 8,
  },
  productTileCategory: {
    color: theme.text,
    fontSize: responsiveFont(12),
  },
  productVisualWrap: {
    height: 120,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(103, 70, 46, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productVisual: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 6,
    borderColor: 'rgba(18,18,18,0.45)',
  },
  productTileSku: {
    color: theme.textSoft,
    fontSize: responsiveFont(11),
  },
  productTileName: {
    color: theme.text,
    fontSize: responsiveFont(14),
    lineHeight: responsiveLineHeight(14, 1.25),
    fontWeight: '700',
    minHeight: 36,
  },
  productTileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTilePrice: {
    color: '#fff5ed',
    fontSize: responsiveFont(18),
    fontWeight: '700',
  },
  productTilePriceLight: {
    color: theme.text,
  },
  productTileStockDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: theme.success,
  },
  productTileStockDotWarn: {
    backgroundColor: '#ff6433',
  },
  ctaDock: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: isDark ? '#4f210d' : '#5f3b28',
    borderWidth: 1,
    borderColor: 'rgba(255,153,91,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  ctaDockIcon: {
    color: '#fff6ef',
    fontSize: responsiveFont(18),
    fontWeight: '700',
  },
  ctaDockText: {
    color: '#fff6ef',
    fontSize: responsiveFont(18),
    fontWeight: '500',
  },
  ctaDockArrow: {
    color: '#fff6ef',
    fontSize: responsiveFont(22),
    fontWeight: '700',
  },
  ordersBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  ordersBoardColumn: {
    width: '47%',
    gap: 4,
  },
  ordersBoardValue: {
    color: '#fffaf5',
    fontSize: responsiveFont(36),
    fontWeight: '700',
  },
  ordersBoardLabel: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: responsiveFont(13),
    flexShrink: 1,
  },
  ordersBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    height: 120,
  },
  ordersBar: {
    flex: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: isDark ? 'rgba(8, 10, 32, 0.78)' : 'rgba(44, 70, 166, 0.62)',
  },
  ordersBarShort: {
    height: 26,
  },
  ordersBarMid: {
    height: 72,
  },
  ordersBarTall: {
    height: 110,
  },
  stockLegendWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  stockLegendColumn: {
    gap: 12,
    flex: 1,
  },
  stockLegendItem: {
    color: isDark ? '#fff4ea' : '#2d1d14',
    fontSize: responsiveFont(14),
  },
  stockDonut: {
    width: 150,
    height: 150,
    borderRadius: 999,
    borderWidth: 24,
    borderTopColor: '#1c110b',
    borderLeftColor: '#ff6433',
    borderRightColor: '#ff9d53',
    borderBottomColor: '#120a06',
    transform: [{ rotate: '-18deg' }],
  },
  listBlock: {
    gap: 6,
  },
  listItem: {
    color: theme.textMuted,
    fontSize: responsiveFont(13),
    lineHeight: responsiveLineHeight(13, 1.45),
  },
  sectionLabel: {
    color: theme.accentSoft,
    fontSize: responsiveFont(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: responsiveFont(15),
    fontWeight: '700',
  },
  emptyBody: {
    color: isDark ? 'rgba(255,239,226,0.74)' : theme.textMuted,
    fontSize: responsiveFont(13),
    lineHeight: responsiveLineHeight(13, 1.45),
  },
  inlineValue: {
    gap: 2,
  },
  inlineLabel: {
    color: theme.textSoft,
    fontSize: responsiveFont(12),
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  inlineText: {
    color: theme.text,
    fontSize: responsiveFont(14),
  },
  planNoticeText: {
    color: theme.textMuted,
    fontSize: responsiveFont(14),
    lineHeight: responsiveLineHeight(14, 1.5),
  },
  jsonWrap: {
    borderRadius: 20,
    backgroundColor: '#120d0a',
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  jsonText: {
    color: '#d7e6ff',
    fontSize: responsiveFont(12),
    lineHeight: responsiveLineHeight(12, 1.4),
    fontFamily: 'Courier',
  },
  answerText: {
    color: isDark ? '#fffaf5' : theme.text,
    fontSize: responsiveFont(14),
    lineHeight: responsiveLineHeight(14, 1.5),
  },
  preferenceToggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  orderCard: {
    backgroundColor: theme.panelSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    gap: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  orderItem: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    gap: 8,
  },
  inlineActions: {
    gap: 8,
  },
  recommendationCard: {
    backgroundColor: theme.panelSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    gap: 8,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  recommendationCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  recommendationAction: {
    color: theme.accentSoft,
    fontSize: responsiveFont(13),
    lineHeight: responsiveLineHeight(13, 1.45),
    fontWeight: '600',
  },
  });
}
