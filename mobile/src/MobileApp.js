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
  View,
} from 'react-native';

import { api } from './api';

const theme = {
  bg: '#07111f',
  panel: '#0d1728',
  panelSoft: '#122139',
  border: 'rgba(180, 202, 255, 0.12)',
  text: '#f4f7ff',
  textMuted: 'rgba(244, 247, 255, 0.66)',
  textSoft: 'rgba(244, 247, 255, 0.42)',
  accent: '#ef8f34',
  accentSoft: '#f4d95d',
  success: '#49c98b',
  danger: '#ef6a6a',
  chip: '#d9f56b',
  chipText: '#06101e',
};

const DEFAULT_API_URL = 'http://127.0.0.1:8000';

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
  { key: 'copilot', label: 'AI Copilot' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'manufacturing', label: 'Manufacturing' },
];

const PLANS = ['FREE', 'PRO', 'BOOST'];

const COPILOT_PROMPTS = [
  'What products are low on stock?',
  'What are my best-selling products this week?',
  'Which products are leaking profit due to returns?',
  'Are any international shipments delayed?',
  'What does Malaysian customs law say about this shipment?',
];

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

function maybeNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ActionButton({ title, onPress, tone = 'primary', disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        tone === 'secondary' ? styles.buttonSecondary : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.buttonText, tone === 'secondary' && styles.buttonSecondaryText]}>{title}</Text>
    </Pressable>
  );
}

function Panel({ title, subtitle, right, children }) {
  return (
    <View style={styles.panel}>
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
    </View>
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

function Chip({ label, active = false, tone = 'default', onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && styles.chipActive,
        tone === 'warning' && styles.chipWarning,
        tone === 'success' && styles.chipSuccess,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
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

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSoft}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
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

function SetupScreen({ draft, setDraft, error, loading, onConnect }) {
  return (
    <ScrollView contentContainerStyle={styles.setupWrap}>
      <View style={styles.heroPanel}>
        <Text style={styles.heroEyebrow}>IntelliFlow Mobile</Text>
        <Text style={styles.heroTitle}>Operational control for the full supply-chain stack.</Text>
        <Text style={styles.heroBody}>
          This mobile shell talks to the same FastAPI backend as the web app. Paste a valid Firebase bearer token so the app can call your secured APIs.
        </Text>
      </View>

      <Panel title="Session setup" subtitle="Use a reachable API host for your device or simulator.">
        <Field
          label="API base URL"
          value={draft.apiUrl}
          onChangeText={(value) => setDraft((current) => ({ ...current, apiUrl: value }))}
          placeholder={DEFAULT_API_URL}
        />
        <Field
          label="Bearer token"
          value={draft.token}
          onChangeText={(value) => setDraft((current) => ({ ...current, token: value }))}
          placeholder="Firebase ID token"
          multiline
        />
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Requested plan</Text>
          <View style={styles.chipRow}>
            {PLANS.map((plan) => (
              <Chip
                key={plan}
                label={plan}
                active={draft.plan === plan}
                onPress={() => setDraft((current) => ({ ...current, plan }))}
              />
            ))}
          </View>
        </View>
        <ErrorBanner message={error} />
        <ActionButton title={loading ? 'Connecting...' : 'Connect mobile app'} onPress={onConnect} disabled={loading} />
      </Panel>
    </ScrollView>
  );
}

function DashboardScreen({ session }) {
  const [dashboard, setDashboard] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardData, recommendationData] = await Promise.all([
        api.getDashboard(session),
        api.getRecommendations(session, { limit: 4 }),
      ]);
      setDashboard(dashboardData);
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
      <Panel
        title="Operational dashboard"
        subtitle="Revenue, order flow, and stock pressure across the same ledger-backed backend used on web."
        right={<ActionButton title="Refresh" tone="secondary" onPress={load} />}
      >
        <ErrorBanner message={error} />
        {dashboard ? (
          <>
            <View style={styles.metricGrid}>
              <MetricCard label="Revenue" value={money(dashboard.total_revenue)} tone="accent" />
              <MetricCard label="Orders" value={String(dashboard.total_orders)} />
              <MetricCard label="Products" value={String(dashboard.total_products)} />
              <MetricCard label="Low stock" value={String(dashboard.low_stock_alerts)} />
            </View>
            <Text style={styles.sectionLabel}>Top sellers</Text>
            {dashboard.top_sellers?.length ? (
              dashboard.top_sellers.map((item) => (
                <View key={item.product_id} style={styles.rowCard}>
                  <View style={styles.rowCardMain}>
                    <Text style={styles.rowTitle}>{item.product_name}</Text>
                    <Text style={styles.rowBody}>
                      {item.total_quantity} units • {money(item.total_revenue)} revenue
                    </Text>
                  </View>
                  <Chip label={`${item.total_sales} sales`} />
                </View>
              ))
            ) : (
              <EmptyState title="No sales yet" body="Top sellers will appear after commercial activity is recorded." />
            )}
          </>
        ) : null}
      </Panel>

      <Panel title="Agent recommendations" subtitle="Recent MCP-backed scans available on mobile.">
        {recommendations?.length ? (
          recommendations.map((item) => <RecommendationItem key={item.id} recommendation={item} />)
        ) : (
          <EmptyState title="No recommendations yet" body="Scheduled jobs have not produced visible recommendations." />
        )}
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
      const [productData, warehouseData, riskData, reorderData, transactionData] = await Promise.all([
        api.getProducts(session),
        api.getWarehouses(session),
        api.getInventoryRisks(session),
        api.getReorderSuggestions(session),
        api.getInventoryTransactions(session, { limit: 25 }),
      ]);

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
    } catch (err) {
      setError(err.message);
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
      <Panel title="Inventory insights" subtitle="Ledger-first stock, reorder pressure, and warehouse intake.">
        <ErrorBanner message={error} />
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
        <PlanNotice requiredPlan="PRO" body="AI-ranked best sellers and sales velocity shifts are locked on Free." />
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
        <PlanNotice requiredPlan="PRO" body="Return-adjusted profit analysis and AI leakage insights require Pro." />
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
      const [shipmentData, delayedData, routeData] = await Promise.all([
        api.getShipments(session),
        api.getDelayedShipments(session),
        api.getRoutes(session),
      ]);
      setShipments(shipmentData);
      setDelayed(delayedData);
      setRoutes(routeData);
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

  return (
    <View style={styles.screenStack}>
      <Panel title="Logistics control tower" subtitle="Shipment management plus delayed-shipment impact analysis.">
        <ErrorBanner message={error} />
        <View style={styles.metricGrid}>
          <MetricCard label="Shipments" value={String(shipments.length)} />
          <MetricCard label="Delayed" value={String(delayed.length)} tone="accent" />
          <MetricCard label="Routes" value={String(routes.length)} />
        </View>
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
  const [query, setQuery] = useState('What does Malaysian customs law say about this shipment?');
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
    return <PlanNotice requiredPlan="PRO" body="Compliance and document-backed RAG responses are not available on Free." />;
  }

  return (
    <View style={styles.screenStack}>
      <Panel title="Compliance RAG" subtitle="Malaysia-focused customs, transport, tax, and anti-corruption guidance with citations when available.">
        <Field label="Compliance question" value={query} onChangeText={setQuery} multiline />
        <View style={styles.chipRow}>
          {[
            'What does Malaysian customs law say about this shipment?',
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
        <InlineValue label="Requested plan" value={sessionPlan} />
        <InlineValue label="Backend plan" value={capabilities?.plan_level || 'Unknown'} />
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
        {capabilities ? <JsonPreview data={capabilities} /> : <EmptyState title="No capabilities" body="Capabilities could not be loaded." />}
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
        <InlineValue label="Plan" value={capabilities?.plan_level || 'Unknown'} />
        <InlineValue label="Allowed domains" value={(capabilities?.allowed_domains || []).join(', ') || 'None'} />
      </Panel>

      <Panel title="Recommendation queue" right={<ActionButton title="Reload" tone="secondary" onPress={load} />}>
        {recommendations.length ? recommendations.map((item) => <RecommendationItem key={item.id} recommendation={item} />) : <EmptyState title="No recommendations" body="No current MCP recommendations are visible for this user." />}
      </Panel>
    </View>
  );
}

function AlertsScreen({ session }) {
  const [risks, setRisks] = useState([]);
  const [delayed, setDelayed] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [riskData, delayedData, recommendationData] = await Promise.all([
        api.getInventoryRisks(session),
        api.getDelayedShipments(session),
        api.getRecommendations(session, { limit: 20 }),
      ]);
      setRisks(riskData.filter((item) => ['critical', 'high'].includes(item.risk_level)));
      setDelayed(delayedData);
      setRecommendations(recommendationData.filter((item) => ['high', 'critical'].includes((item.severity || '').toLowerCase())));
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
      <Panel title="Alerts" subtitle="A mobile command view for critical stock, logistics, and recommendation signals.">
        <ErrorBanner message={error} />
        <View style={styles.metricGrid}>
          <MetricCard label="Critical stock risks" value={String(risks.length)} tone="accent" />
          <MetricCard label="Delayed shipments" value={String(delayed.length)} />
          <MetricCard label="High severity recommendations" value={String(recommendations.length)} />
        </View>
      </Panel>

      <Panel title="Inventory alerts">
        {risks.length ? (
          risks.map((risk) => (
            <View key={risk.product_id} style={styles.rowCard}>
              <Text style={styles.rowTitle}>{risk.product_name}</Text>
              <Text style={styles.rowBody}>
                Available {risk.current_stock} • Min {risk.min_threshold} • Risk {risk.risk_level}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState title="No critical stock alerts" body="No high-priority stock risks are visible." />
        )}
      </Panel>

      <Panel title="Delayed shipment alerts">
        {delayed.length ? (
          delayed.map((shipment) => (
            <View key={shipment.id} style={styles.rowCard}>
              <Text style={styles.rowTitle}>{shipment.shipment_number}</Text>
              <Text style={styles.rowBody}>
                {shipment.origin || 'Unknown'} to {shipment.destination || 'Unknown'} • {shipment.delay_reason || 'Delayed'}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState title="No delayed shipments" body="No delayed shipments are currently reported." />
        )}
      </Panel>

      <Panel title="Recommendation alerts">
        {recommendations.length ? recommendations.map((item) => <RecommendationItem key={item.id} recommendation={item} />) : <EmptyState title="No high-severity recommendations" body="No urgent agent recommendations are currently visible." />}
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

function ScreenRenderer({ activeScreen, session, sessionPlan }) {
  switch (activeScreen) {
    case 'dashboard':
      return <DashboardScreen session={session} />;
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
    case 'copilot':
      return <CopilotScreen session={session} sessionPlan={sessionPlan} />;
    case 'recommendations':
      return <RecommendationsScreen session={session} />;
    case 'alerts':
      return <AlertsScreen session={session} />;
    case 'manufacturing':
      return <ManufacturingScreen />;
    default:
      return <DashboardScreen session={session} />;
  }
}

export default function MobileApp() {
  const [sessionDraft, setSessionDraft] = useState({
    apiUrl: DEFAULT_API_URL,
    token: '',
    plan: 'FREE',
  });
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [connectError, setConnectError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const sessionPlan = session?.plan || 'FREE';

  const connect = async () => {
    setConnecting(true);
    setConnectError('');
    try {
      const candidate = {
        apiUrl: (sessionDraft.apiUrl || DEFAULT_API_URL).trim(),
        token: sessionDraft.token.trim(),
        plan: sessionDraft.plan,
      };
      const me = await api.getMe(candidate);
      setSession(candidate);
      setCurrentUser(me);
    } catch (err) {
      setConnectError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setSession(null);
    setCurrentUser(null);
    setActiveScreen('dashboard');
  };

  const activeLabel = useMemo(() => SCREENS.find((screen) => screen.key === activeScreen)?.label || 'Dashboard', [activeScreen]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {!session ? (
        <SetupScreen draft={sessionDraft} setDraft={setSessionDraft} error={connectError} loading={connecting} onConnect={connect} />
      ) : (
        <View style={styles.appShell}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>IntelliFlow Mobile</Text>
              <Text style={styles.headerTitle}>{activeLabel}</Text>
              <Text style={styles.headerSubtitle}>
                {currentUser?.email || 'Authenticated user'} • Requested plan {sessionPlan}
              </Text>
            </View>
            <ActionButton title="Disconnect" tone="secondary" onPress={disconnect} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
            {SCREENS.map((screen) => (
              <Chip
                key={screen.key}
                label={screen.label}
                active={activeScreen === screen.key}
                onPress={() => setActiveScreen(screen.key)}
              />
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.content}>
            <ScreenRenderer activeScreen={activeScreen} session={session} sessionPlan={sessionPlan} />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  appShell: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  setupWrap: {
    padding: 20,
    gap: 16,
  },
  heroPanel: {
    backgroundColor: theme.panel,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 22,
    gap: 12,
  },
  heroEyebrow: {
    color: theme.accentSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: theme.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
  },
  heroBody: {
    color: theme.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerEyebrow: {
    color: theme.accentSoft,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 26,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: theme.textMuted,
    fontSize: 13,
  },
  navRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  screenStack: {
    gap: 16,
  },
  panel: {
    backgroundColor: theme.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    gap: 14,
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
  },
  panelTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
  },
  panelSubtitle: {
    color: theme.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    minWidth: '47%',
    flexGrow: 1,
    backgroundColor: theme.panelSoft,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
  },
  metricCardAccent: {
    backgroundColor: '#1b2735',
  },
  metricLabel: {
    color: theme.textSoft,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  metricValue: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '700',
  },
  button: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderColor: theme.border,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#06101e',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  buttonSecondaryText: {
    color: theme.text,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    minHeight: 48,
    backgroundColor: theme.panelSoft,
    color: theme.text,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
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
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '600',
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
    color: '#ffd6d6',
    fontSize: 13,
    lineHeight: 20,
  },
  loadingBlock: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCard: {
    backgroundColor: theme.panelSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    gap: 8,
  },
  rowCardMain: {
    gap: 4,
  },
  rowTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rowBody: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  rowBodyMuted: {
    color: theme.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionLabel: {
    color: theme.accentSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyBody: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  inlineValue: {
    gap: 2,
  },
  inlineLabel: {
    color: theme.textSoft,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  inlineText: {
    color: theme.text,
    fontSize: 14,
  },
  planNoticeText: {
    color: theme.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  jsonWrap: {
    borderRadius: 18,
    backgroundColor: '#09111d',
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  jsonText: {
    color: '#d7e6ff',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Courier',
  },
  answerText: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 22,
  },
  orderCard: {
    backgroundColor: theme.panelSoft,
    borderRadius: 18,
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
    borderRadius: 18,
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
  },
  recommendationAction: {
    color: theme.accentSoft,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
});
