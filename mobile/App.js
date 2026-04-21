import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const theme = {
  shell: '#050914',
  shellGlow: 'rgba(158,200,255,0.18)',
  device: '#070c18',
  deviceSoft: '#091222',
  deviceBorder: 'rgba(120,148,190,0.22)',
  text: '#edf4ff',
  textMuted: 'rgba(220,232,255,0.66)',
  textSoft: 'rgba(220,232,255,0.38)',
  cardBlue: '#0b1529',
  cardPeach: '#ff9b3d',
  cardSand: '#d9ff5c',
  chip: '#d9ff5c',
  chipText: '#050914',
  accent: '#ff9b3d',
  accentSoft: '#d9ff5c',
  panelLight: '#d9ff5c',
  black: '#050914',
};

const overviewCards = [
  {
    title: 'Revenue',
    value: '$ 10,967.64',
    note: '6% of total',
    tone: 'primary',
  },
  {
    title: 'Orders',
    value: '12 000',
    note: '+2.5%',
    tone: 'sand',
  },
  {
    title: 'Sales Volumes',
    value: '$3,439.00',
    note: '+2.5%',
    tone: 'peach',
  },
];

const revenueBars = [
  { day: '04', month: 'Dec', height: 0.54 },
  { day: '05', month: 'Dec', height: 0.68 },
  { day: '06', month: 'Dec', height: 0.56 },
  { day: '07', month: 'Dec', height: 0.86, active: true },
  { day: '08', month: 'Dec', height: 0.6 },
  { day: '09', month: 'Dec', height: 0.74 },
  { day: '10', month: 'Dec', height: 0.48 },
];

const influencerPeople = ['AJ', 'MK', 'SY'];

const productRows = [
  { label: 'Stock allocation', value: 'Cross-border ready' },
  { label: 'Warehouse zone', value: 'Johor + Penang' },
  { label: 'Compliance pack', value: 'LHDN tagged' },
];

const copilotResults = [
  {
    title: 'Reorder sensor stock',
    priority: 'High',
    body: 'Penang inventory coverage drops below 10 days if current sell-through continues.',
  },
  {
    title: 'Move campaign budget',
    priority: 'Medium',
    body: 'TikTok Shop MY conversion outperformed Lazada by 12% across the last weekly cycle.',
  },
];

function TopBar({ title, subtitle, onLeft, onRight, leftLabel = '<', rightLabel = '+' }) {
  return (
    <View style={styles.topBar}>
      <Pressable style={styles.iconButton} onPress={onLeft}>
        <Text style={styles.iconButtonText}>{leftLabel}</Text>
      </Pressable>
      <View style={styles.topBarCenter}>
        <Text style={styles.topBarTitle}>{title}</Text>
        {subtitle ? <Text style={styles.topBarSubtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable style={styles.iconButton} onPress={onRight}>
        <Text style={styles.iconButtonText}>{rightLabel}</Text>
      </Pressable>
    </View>
  );
}

function OverviewCard({ card, compact = false }) {
  const toneStyle =
    card.tone === 'primary'
      ? styles.overviewCardPrimary
      : card.tone === 'sand'
        ? styles.overviewCardSand
        : styles.overviewCardPeach;

  return (
    <View style={[styles.overviewCard, toneStyle, compact && styles.overviewCardCompact]}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>{compact ? 'o' : '$'}</Text>
      </View>
      <Text style={[styles.overviewCardValue, compact && styles.overviewCardValueCompact]}>{card.value}</Text>
      <Text style={[styles.overviewCardTitle, compact && styles.overviewCardTitleCompact]}>{card.title}</Text>
      <View style={styles.overviewNote}>
        <Text style={styles.overviewNoteText}>{card.note}</Text>
      </View>
    </View>
  );
}

function DashboardScreen({ onOpenCopilot }) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopBar title="Sales Dashboard" onLeft={() => {}} onRight={onOpenCopilot} rightLabel="AI" />

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Overview</Text>
        <View style={styles.overviewGrid}>
          <OverviewCard card={overviewCards[0]} />
          <View style={styles.overviewColumn}>
            <OverviewCard card={overviewCards[1]} compact />
            <OverviewCard card={overviewCards[2]} compact />
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionLabel}>Revenue</Text>
            <View style={styles.revenueInline}>
              <Text style={styles.revenueValue}>$ 2,000</Text>
              <Text style={styles.revenueSuffix}>/ day</Text>
            </View>
          </View>
          <View style={styles.weekChip}>
            <Text style={styles.weekChipText}>Week v</Text>
          </View>
        </View>

        <View style={styles.barChart}>
          {revenueBars.map((bar) => (
            <View key={bar.day} style={styles.barWrap}>
              <Text style={styles.barMonth}>{bar.month}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    bar.active && styles.barFillActive,
                    { height: `${bar.height * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.barDay}>{bar.day}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Regional notes</Text>
        <View style={styles.notePanel}>
          <Text style={styles.noteTitle}>ASEAN channel pressure is stable.</Text>
          <Text style={styles.noteBody}>
            Orders are concentrated in MY and SG this week. Port transit risk stays low and inventory drawdown is predictable.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ProductsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopBar title="New Product Post" subtitle="Settings" onLeft={() => {}} onRight={() => {}} rightLabel=">" />

      <View style={styles.sectionBlock}>
        <Text style={styles.settingsQuestion}>Where would you like to sell this product?</Text>
        <Text style={styles.settingsHint}>This setting applies on this product only</Text>

        <View style={[styles.settingsCard, styles.settingsCardLight]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.settingsCardTitleDark}>My Page</Text>
              <Text style={styles.settingsCardBodyDark}>Sell directly on business profile page</Text>
            </View>
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          </View>

          <View style={styles.personRow}>
            <View style={styles.personAvatar}>
              <Text style={styles.personAvatarText}>A</Text>
            </View>
            <Text style={styles.personNameDark}>Anna Juliane</Text>
            <View style={styles.checkButtonDark}>
              <Text style={styles.checkButtonDarkText}>ok</Text>
            </View>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsCardTitle}>Influencer Pages</Text>
          <Text style={styles.settingsCardBody}>
            Allow influencers promote this product through their pages.
          </Text>
          <View style={styles.avatarStackRow}>
            {influencerPeople.map((name) => (
              <View key={name} style={styles.stackAvatar}>
                <Text style={styles.stackAvatarText}>{name}</Text>
              </View>
            ))}
            <View style={styles.moreChip}>
              <Text style={styles.moreChipText}>+1K More</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.settingsQuestion}>How would you like to manage product availability?</Text>
        <Text style={styles.settingsHint}>This setting applies on this product only</Text>

        <View style={[styles.settingsCard, styles.settingsCardLight, styles.availabilityCard]}>
          <View style={styles.lockIcon}>
            <Text style={styles.lockIconText}>[]</Text>
          </View>
          <View style={styles.availabilityBody}>
            <Text style={styles.settingsCardTitleDark}>Check Availability</Text>
            <Text style={styles.settingsCardBodyDark}>
              Customer should check availability with seller before placing an order.
            </Text>
          </View>
          <View style={styles.checkButtonDark}>
            <Text style={styles.checkButtonDarkText}>ok</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Product profile</Text>
        <View style={styles.notePanel}>
          {productRows.map((row) => (
            <View key={row.label} style={styles.profileRow}>
              <Text style={styles.profileLabel}>{row.label}</Text>
              <Text style={styles.profileValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function SalesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopBar title="Sales Insights" onLeft={() => {}} onRight={() => {}} rightLabel=">" />

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Performance</Text>
        <View style={styles.insightHero}>
          <Text style={styles.insightHeroValue}>$ 34,900</Text>
          <Text style={styles.insightHeroLabel}>This week across MY / ID / SG channels</Text>
        </View>
      </View>

      <View style={styles.salesList}>
        {[
          ['Top channel', 'Shopee MY'],
          ['Average ticket', '$286'],
          ['Fastest mover', 'Transit Seal Module'],
          ['Stock risk', '18 items flagged'],
        ].map(([label, value]) => (
          <View key={label} style={styles.salesRowCard}>
            <Text style={styles.profileLabel}>{label}</Text>
            <Text style={styles.profileValue}>{value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function CopilotSheet({ visible, onClose }) {
  const [prompt, setPrompt] = useState('Prioritize this week inventory actions for Malaysia and Singapore.');

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sheetEyebrow}>AI Copilot</Text>
            <Text style={styles.sheetTitle}>Commercial Assistant</Text>
          </View>
          <Pressable style={styles.closeChip} onPress={onClose}>
            <Text style={styles.closeChipText}>Close</Text>
          </Pressable>
        </View>

        <TextInput
          multiline
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask about sales, stock or trade flow..."
          placeholderTextColor="rgba(247,244,239,0.35)"
          style={styles.promptInput}
        />

        <Pressable style={styles.generateButton}>
          <Text style={styles.generateButtonText}>Generate roadmap</Text>
        </Pressable>

        <ScrollView style={styles.sheetResults} showsVerticalScrollIndicator={false}>
          {copilotResults.map((item) => (
            <View key={item.title} style={styles.resultCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <View style={styles.resultPriority}>
                  <Text style={styles.resultPriorityText}>{item.priority}</Text>
                </View>
              </View>
              <Text style={styles.resultBody}>{item.body}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function BottomTabs({ activeTab, onTabChange, onCopilot }) {
  const tabs = useMemo(
    () => [
      { key: 'dashboard', label: 'Home' },
      { key: 'products', label: 'Post' },
      { key: 'sales', label: 'Sales' },
    ],
    []
  );

  return (
    <View style={styles.bottomBar}>
      {tabs.map((tab) => (
        <Pressable key={tab.key} style={styles.bottomItem} onPress={() => onTabChange(tab.key)}>
          <View style={[styles.bottomIcon, activeTab === tab.key && styles.bottomIconActive]}>
            <Text style={[styles.bottomIconText, activeTab === tab.key && styles.bottomIconTextActive]}>
              {tab.label.charAt(0)}
            </Text>
          </View>
          <Text style={[styles.bottomLabel, activeTab === tab.key && styles.bottomLabelActive]}>{tab.label}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.bottomItem} onPress={onCopilot}>
        <View style={[styles.bottomIcon, styles.bottomCenterIcon]}>
          <Text style={styles.bottomIconTextActive}>+</Text>
        </View>
        <Text style={styles.bottomLabel}>AI</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [copilotVisible, setCopilotVisible] = useState(false);

  const renderScreen = () => {
    if (activeTab === 'products') {
      return <ProductsScreen />;
    }
    if (activeTab === 'sales') {
      return <SalesScreen />;
    }
    return <DashboardScreen onOpenCopilot={() => setCopilotVisible(true)} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.shellGlowTop} />
      <View style={styles.shellGlowBottom} />
      <View style={styles.scanlineOverlay} pointerEvents="none" />
      <View style={styles.deviceFrame}>
        {renderScreen()}
        <BottomTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCopilot={() => setCopilotVisible(true)}
        />
      </View>
      <CopilotSheet visible={copilotVisible} onClose={() => setCopilotVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.shell,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shellGlowTop: {
    position: 'absolute',
    top: -110,
    right: -20,
    width: 260,
    height: 260,
    borderRadius: 160,
    backgroundColor: theme.shellGlow,
  },
  shellGlowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 160,
    backgroundColor: 'rgba(255,155,61,0.08)',
  },
  scanlineOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  deviceFrame: {
    flex: 1,
    backgroundColor: theme.device,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
    overflow: 'hidden',
    paddingTop: 4,
  },
  screenContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 112,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,155,61,0.42)',
    backgroundColor: 'rgba(255,155,61,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '600',
  },
  topBarSubtitle: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionLabel: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  overviewColumn: {
    flex: 1,
    gap: 10,
  },
  overviewCard: {
    borderRadius: 6,
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 140,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
  },
  overviewCardCompact: {
    minHeight: 92,
  },
  overviewCardPrimary: {
    width: 94,
    backgroundColor: 'rgba(217,255,92,0.08)',
    borderColor: 'rgba(217,255,92,0.32)',
  },
  overviewCardSand: {
    backgroundColor: theme.deviceSoft,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
  },
  overviewCardPeach: {
    backgroundColor: theme.deviceSoft,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(217,255,92,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217,255,92,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: {
    color: theme.cardSand,
    fontSize: 14,
    fontWeight: '700',
  },
  overviewCardValue: {
    color: theme.cardSand,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 18,
  },
  overviewCardValueCompact: {
    color: theme.text,
    fontSize: 21,
    marginTop: 10,
  },
  overviewCardTitle: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  overviewCardTitleCompact: {
    color: theme.textMuted,
  },
  overviewNote: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,155,61,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,155,61,0.36)',
  },
  overviewNoteText: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  revenueInline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 6,
  },
  revenueValue: {
    color: theme.text,
    fontSize: 34,
    fontWeight: '700',
  },
  revenueSuffix: {
    color: theme.textMuted,
    fontSize: 14,
    marginBottom: 5,
  },
  weekChip: {
    backgroundColor: 'rgba(217,255,92,0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(217,255,92,0.35)',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  weekChipText: {
    color: theme.chipText,
    fontSize: 12,
    fontWeight: '600',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  barMonth: {
    color: theme.textSoft,
    fontSize: 9,
    transform: [{ rotate: '-90deg' }],
    marginBottom: 10,
  },
  barTrack: {
    width: '100%',
    height: 146,
    borderRadius: 4,
    backgroundColor: 'rgba(158,200,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(120,148,190,0.16)',
    justifyContent: 'flex-end',
    padding: 4,
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(158,200,255,0.18)',
  },
  barFillActive: {
    backgroundColor: theme.cardSand,
  },
  barDay: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '600',
  },
  notePanel: {
    backgroundColor: theme.deviceSoft,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
    padding: 16,
    gap: 12,
  },
  noteTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '600',
  },
  noteBody: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 22,
  },
  settingsQuestion: {
    color: theme.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
  },
  settingsHint: {
    color: theme.textSoft,
    fontSize: 12,
    marginTop: -4,
  },
  settingsCard: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
    backgroundColor: theme.deviceSoft,
    padding: 16,
    gap: 14,
  },
  settingsCardLight: {
    backgroundColor: 'rgba(217,255,92,0.08)',
    borderColor: 'rgba(217,255,92,0.32)',
  },
  settingsCardTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '600',
  },
  settingsCardTitleDark: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '600',
  },
  settingsCardBody: {
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  settingsCardBodyDark: {
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  defaultBadge: {
    backgroundColor: theme.accent,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  defaultBadgeText: {
    color: theme.black,
    fontSize: 10,
    fontWeight: '700',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  personAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    color: theme.black,
    fontSize: 13,
    fontWeight: '700',
  },
  personNameDark: {
    flex: 1,
    color: theme.black,
    fontSize: 14,
    fontWeight: '500',
  },
  checkButtonDark: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: theme.black,
    borderWidth: 1,
    borderColor: 'rgba(217,255,92,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonDarkText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  avatarStackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.accent,
    borderWidth: 2,
    borderColor: theme.deviceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  stackAvatarText: {
    color: theme.black,
    fontSize: 10,
    fontWeight: '700',
  },
  moreChip: {
    marginLeft: 14,
    borderRadius: 4,
    backgroundColor: theme.chip,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  moreChipText: {
    color: theme.black,
    fontSize: 11,
    fontWeight: '600',
  },
  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  availabilityBody: {
    flex: 1,
  },
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(217,255,92,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(217,255,92,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconText: {
    color: theme.black,
    fontSize: 10,
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  profileLabel: {
    color: theme.textMuted,
    fontSize: 13,
    flex: 1,
  },
  profileValue: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  insightHero: {
    backgroundColor: 'rgba(217,255,92,0.08)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(217,255,92,0.3)',
    padding: 20,
  },
  insightHeroValue: {
    color: theme.cardSand,
    fontSize: 34,
    fontWeight: '700',
  },
  insightHeroLabel: {
    color: 'rgba(18,18,18,0.65)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  salesList: {
    gap: 10,
  },
  salesRowCard: {
    backgroundColor: theme.deviceSoft,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    height: 68,
    borderRadius: 6,
    backgroundColor: '#1e1d1b',
    borderWidth: 1,
    borderColor: theme.deviceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  bottomItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 54,
  },
  bottomIcon: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomIconActive: {
    backgroundColor: 'rgba(217,255,92,0.12)',
  },
  bottomCenterIcon: {
    backgroundColor: theme.chip,
  },
  bottomIconText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomIconTextActive: {
    color: theme.black,
    fontSize: 13,
    fontWeight: '700',
  },
  bottomLabel: {
    color: theme.textSoft,
    fontSize: 11,
  },
  bottomLabelActive: {
    color: theme.text,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,16,16,0.28)',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: '#050914',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 22,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 16,
  },
  sheetEyebrow: {
    color: theme.textSoft,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sheetTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '600',
    marginTop: 5,
  },
  closeChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,155,61,0.38)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeChipText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  promptInput: {
    minHeight: 108,
    marginTop: 16,
    borderRadius: 6,
    backgroundColor: theme.deviceSoft,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.text,
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  generateButton: {
    marginTop: 12,
    borderRadius: 4,
    backgroundColor: theme.panelLight,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateButtonText: {
    color: theme.black,
    fontSize: 13,
    fontWeight: '700',
  },
  sheetResults: {
    marginTop: 14,
  },
  resultCard: {
    backgroundColor: theme.deviceSoft,
    borderWidth: 1,
    borderColor: theme.deviceBorder,
    borderRadius: 6,
    padding: 16,
    marginBottom: 10,
  },
  resultTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  resultPriority: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultPriorityText: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  resultBody: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
});
