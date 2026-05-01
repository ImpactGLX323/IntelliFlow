'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CircleMarker,
  MapContainer,
  Pane,
  Polyline,
  Popup,
  Rectangle,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { publicLogisticsAPI } from '@/lib/api/publicLogistics'
import type {
  GeoJsonFeature,
  IndoPacificFlowResponse,
  MalaysiaPortFeature,
  PressureStatus,
  ShippingLaneFeature,
  VesselClusterFeature,
} from '@/types/logisticsFlow'

const MAP_BOUNDS = L.latLngBounds(L.latLng(-12, 82), L.latLng(26, 125))
const MALAYSIA_BOUNDS: L.LatLngBoundsLiteral = [
  [-12, 82],
  [26, 125],
]

function FlowBoundsController({ features }: { features: GeoJsonFeature[] }) {
  const map = useMap()

  useEffect(() => {
    const coordinates = features.flatMap((feature) => {
      if (feature.geometry.type === 'Point') {
        return [[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]]
      }
      return feature.geometry.coordinates.map((coordinate) => [coordinate[1], coordinate[0]])
    })
    if (coordinates.length > 0) {
      map.fitBounds(coordinates as L.LatLngBoundsExpression, {
        padding: [24, 24],
        maxZoom: 6,
      })
    } else {
      map.fitBounds(MAP_BOUNDS, { padding: [24, 24], maxZoom: 5 })
    }
  }, [features, map])

  return null
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 }).format(value)
}

function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat('en-MY', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
}

function getPressureColor(status: PressureStatus) {
  switch (status) {
    case 'LOW':
      return '#34d399'
    case 'MEDIUM':
      return '#fbbf24'
    case 'HIGH':
      return '#f87171'
    case 'CRITICAL':
      return '#991b1b'
    default:
      return '#94a3b8'
  }
}

function getPressureTone(status: PressureStatus) {
  switch (status) {
    case 'LOW':
      return 'text-emerald-300'
    case 'MEDIUM':
      return 'text-amber-300'
    case 'HIGH':
      return 'text-rose-300'
    case 'CRITICAL':
      return 'text-red-400'
    default:
      return 'text-slate-300'
  }
}

function interpolateCoordinate(coordinates: Array<[number, number]>, progress: number): [number, number] {
  if (coordinates.length <= 1) {
    return coordinates[0] ?? [0, 0]
  }

  const distances: number[] = [0]
  let totalDistance = 0
  for (let index = 1; index < coordinates.length; index += 1) {
    const [previousLng, previousLat] = coordinates[index - 1]
    const [currentLng, currentLat] = coordinates[index]
    const segmentDistance = Math.hypot(currentLng - previousLng, currentLat - previousLat)
    totalDistance += segmentDistance
    distances.push(totalDistance)
  }

  if (totalDistance === 0) {
    return coordinates[0]
  }

  const targetDistance = progress * totalDistance
  for (let index = 1; index < distances.length; index += 1) {
    if (targetDistance <= distances[index]) {
      const segmentStart = distances[index - 1]
      const segmentDistance = distances[index] - segmentStart || 1
      const segmentProgress = (targetDistance - segmentStart) / segmentDistance
      const [startLng, startLat] = coordinates[index - 1]
      const [endLng, endLat] = coordinates[index]
      return [
        startLng + (endLng - startLng) * segmentProgress,
        startLat + (endLat - startLat) * segmentProgress,
      ]
    }
  }

  return coordinates[coordinates.length - 1]
}

export default function IndoPacificShipFlowMap() {
  const [data, setData] = useState<IndoPacificFlowResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [tick, setTick] = useState(0)

  const fetchFlow = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError('')
      const response = await publicLogisticsAPI.getIndoPacificShipFlow({
        include_ports: true,
        include_routes: true,
        include_vessel_clusters: true,
      })
      setData(response.data)
    } catch {
      setError('Unable to load ship-flow data right now.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchFlow()
  }, [fetchFlow])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((current) => (current + 1) % 1000)
    }, 160)
    return () => window.clearInterval(interval)
  }, [])

  const ports = useMemo(
    () =>
      (data?.geojson.features ?? []).filter(
        (feature): feature is MalaysiaPortFeature => feature.properties.kind === 'malaysia_port',
      ),
    [data],
  )

  const lanes = useMemo(
    () =>
      (data?.geojson.features ?? []).filter(
        (feature): feature is ShippingLaneFeature => feature.properties.kind === 'shipping_lane',
      ),
    [data],
  )

  const clusters = useMemo(
    () =>
      (data?.geojson.features ?? []).filter(
        (feature): feature is VesselClusterFeature => feature.properties.kind === 'vessel_cluster',
      ),
    [data],
  )

  const animatedDots = useMemo(
    () =>
      lanes.flatMap((lane, laneIndex) => {
        const intensity = Math.max(1, Math.round(lane.properties.flow_intensity * 2))
        return Array.from({ length: intensity }, (_, dotIndex) => {
          const progress = ((tick / 1000) + (laneIndex * 0.12) + dotIndex * 0.28) % 1
          const [lng, lat] = interpolateCoordinate(lane.geometry.coordinates, progress)
          return {
            id: `${lane.properties.route_name}-${dotIndex}`,
            lat,
            lng,
          }
        })
      }),
    [lanes, tick],
  )

  const badge = useMemo(() => {
    if (!data) {
      return null
    }
    if (data.source === 'fallback_preview') {
      return {
        label: 'Provider unavailable - preview fallback',
        className: 'bg-amber-500/14 text-amber-200 border border-amber-300/18',
      }
    }
    if (data.is_live) {
      return {
        label: 'Live maritime flow',
        className: 'bg-emerald-500/14 text-emerald-200 border border-emerald-300/18',
      }
    }
    return {
      label: 'Preview ship-flow model',
      className: 'bg-sky-500/14 text-sky-200 border border-sky-300/18',
    }
  }, [data])

  const stats = useMemo(
    () =>
      data
        ? [
            {
              label: 'Ports',
              value: formatNumber(data.summary.malaysian_ports_monitored),
              note: `${formatNumber(data.summary.high_pressure_ports)} high pressure`,
              tone: data.summary.high_pressure_ports > 0 ? 'text-rose-300' : 'text-emerald-300',
            },
            {
              label: 'Pressure',
              value: formatDecimal(data.summary.average_malaysia_port_pressure, 2),
              note: `${formatNumber(data.summary.medium_pressure_ports)} medium`,
              tone: 'text-amber-300',
            },
            {
              label: 'Flow',
              value: formatDecimal(data.summary.estimated_regional_flow_intensity, 2),
              note: `${formatNumber(data.summary.routes_monitored)} corridors`,
              tone: 'text-sky-300',
            },
            {
              label: 'Source',
              value: data.source.replaceAll('_', ' '),
              note: new Date(data.last_updated).toLocaleTimeString(),
              tone: data.is_live ? 'text-emerald-300' : 'text-[#d5b28b]',
            },
          ]
        : [],
    [data],
  )

  return (
    <section id="product" className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#604630] bg-[linear-gradient(180deg,rgba(29,20,16,0.96),rgba(18,13,10,0.98))] shadow-[0_42px_120px_-72px_rgba(0,0,0,0.78)]">
        <div className="px-6 py-8 lg:px-8 lg:py-10">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#e3b98d]">
                  Logistics Intelligence
                </p>
                {badge && (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${badge.className}`}>
                    {badge.label}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/logistics"
                  className="app-button-primary inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d7be] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a130f]"
                >
                  Explore Logistics Intelligence
                </Link>
                <button
                  type="button"
                  onClick={() => fetchFlow(true)}
                  disabled={refreshing}
                  className="app-button-secondary inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d7be] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a130f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh flow'}
                </button>
              </div>
            </div>

            <div className="max-w-4xl">
              <h2 className="text-balance font-montserrat text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[#fff5ea]">
                Indo-Pacific Ship Flow and Malaysian Port Pressure
              </h2>
              <p className="font-lexend mt-4 max-w-3xl text-sm leading-8 text-[#d9c9bb] sm:text-base">
                Visualize generalized ship movement across key Indo-Pacific corridors and monitor pressure signals at major Malaysian ports.
              </p>
              <p className="font-lexend mt-4 text-sm leading-7 text-[#c8b29e]">
                {data?.is_live
                  ? 'Live maritime data active. Flow and pressure signals are refreshed from the connected provider.'
                  : 'Preview model shown. Connect a maritime data provider to activate live AIS/congestion intelligence.'}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#0f1720] shadow-[0_28px_70px_-40px_rgba(0,0,0,0.55)]">
              <div className="pointer-events-none absolute inset-0 z-[900] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_32%),linear-gradient(180deg,rgba(15,23,32,0.12),rgba(8,12,18,0.35))]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[950] flex items-center justify-between border-b border-black/10 bg-[linear-gradient(180deg,rgba(8,12,18,0.75),rgba(8,12,18,0.18))] px-4 py-3 backdrop-blur-md">
                <div>
                  <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-[#d5b28b]">
                    Indo-Pacific Corridor View
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Generalized traffic flow, aggregated port pressure, no individual vessel tracking.
                  </p>
                </div>
                <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/72 sm:flex">
                  <span>Malaysia</span>
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span>Malacca Strait</span>
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span>South China Sea</span>
                </div>
              </div>

              {loading ? (
                <div className="relative flex min-h-[420px] items-center justify-center px-6 py-10 text-center text-sm text-[#d9c9bb] lg:min-h-[620px]">
                  Loading Indo-Pacific ship-flow model...
                </div>
              ) : error ? (
                <div className="relative flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 py-10 text-center text-sm text-[#d9c9bb] lg:min-h-[620px]">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => fetchFlow(true)}
                    className="app-button-secondary px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]"
                  >
                    Refresh flow
                  </button>
                </div>
              ) : !data || data.geojson.features.length === 0 ? (
                <div className="relative flex min-h-[420px] items-center justify-center px-6 py-10 text-center text-sm text-[#d9c9bb] lg:min-h-[620px]">
                  No ship-flow data available.
                </div>
              ) : (
                <div className="relative">
                  <MapContainer
                    bounds={MAP_BOUNDS}
                    zoom={5}
                    minZoom={4}
                    maxZoom={7}
                    zoomControl={false}
                    attributionControl={true}
                    className="min-h-[420px] w-full lg:min-h-[620px]"
                    style={{ background: '#0b1220' }}
                  >
                    <FlowBoundsController features={data.geojson.features} />
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    <Pane name="lanes" style={{ zIndex: 300 }} />
                    <Pane name="dots" style={{ zIndex: 420 }} />
                    <Pane name="ports" style={{ zIndex: 500 }} />

                    <Rectangle
                      bounds={MALAYSIA_BOUNDS}
                      pathOptions={{ color: '#3b82f6', weight: 1, fillOpacity: 0, opacity: 0.18 }}
                    />

                    {lanes.map((lane) => (
                      <Polyline
                        key={lane.properties.route_name}
                        pane="lanes"
                        positions={lane.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
                        pathOptions={{
                          color: '#38bdf8',
                          weight: 4,
                          opacity: 0.84,
                          dashArray: '9 10',
                        }}
                      >
                        <Popup>
                          <div className="space-y-1 text-sm text-[#111318]">
                            <p className="font-semibold">{lane.properties.route_name}</p>
                            <p>Origin: {lane.properties.origin_region}</p>
                            <p>Destination: {lane.properties.destination_region}</p>
                            <p>Affected Malaysian ports: {lane.properties.affected_malaysia_ports.join(', ')}</p>
                            <p>Flow intensity: {formatDecimal(lane.properties.flow_intensity, 2)}</p>
                            <p>Estimated vessel count: {formatNumber(lane.properties.estimated_vessel_count)}</p>
                            <p>Average delay hours: {formatDecimal(lane.properties.average_delay_hours, 1)}</p>
                            <p>Risk level: {lane.properties.risk_level}</p>
                            <p>Direction: {lane.properties.direction.replaceAll('_', ' ')}</p>
                          </div>
                        </Popup>
                      </Polyline>
                    ))}

                    {animatedDots.map((dot) => (
                      <CircleMarker
                        key={dot.id}
                        center={[dot.lat, dot.lng]}
                        pane="dots"
                        radius={4}
                        pathOptions={{
                          color: '#bfdbfe',
                          fillColor: '#dbeafe',
                          fillOpacity: 0.95,
                          weight: 1,
                        }}
                      />
                    ))}

                    {ports.map((port) => (
                      <CircleMarker
                        key={port.properties.port_code}
                        center={[port.geometry.coordinates[1], port.geometry.coordinates[0]]}
                        pane="ports"
                        radius={10}
                        pathOptions={{
                          color: '#0f172a',
                          fillColor: getPressureColor(port.properties.pressure_status),
                          fillOpacity: 0.92,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div className="space-y-1 text-sm text-[#111318]">
                            <p className="font-semibold">{port.properties.port_name}</p>
                            <p>Port code: {port.properties.port_code}</p>
                            <p>State: {port.properties.state}</p>
                            <p>Pressure status: {port.properties.pressure_status}</p>
                            <p>Pressure score: {formatDecimal(port.properties.pressure_score, 2)}</p>
                            <p>Average delay hours: {formatDecimal(port.properties.average_delay_hours, 1)}</p>
                            <p>Vessels waiting: {formatNumber(port.properties.vessels_waiting)}</p>
                            <p>Vessels berthed: {formatNumber(port.properties.vessels_berthed)}</p>
                            <p>Berth utilization: {formatDecimal(port.properties.berth_utilization_pct, 1)}%</p>
                            <p>Customs alerts: {formatNumber(port.properties.customs_alerts)}</p>
                            <p>Last updated: {new Date(port.properties.last_updated).toLocaleString()}</p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}

                    {clusters.map((cluster) => (
                      <CircleMarker
                        key={cluster.properties.cluster_name}
                        center={[cluster.geometry.coordinates[1], cluster.geometry.coordinates[0]]}
                        pane="ports"
                        radius={8}
                        pathOptions={{
                          color: '#0f172a',
                          fillColor: '#93c5fd',
                          fillOpacity: 0.72,
                          weight: 1,
                        }}
                      >
                        <Popup>
                          <div className="space-y-1 text-sm text-[#111318]">
                            <p className="font-semibold">{cluster.properties.cluster_name}</p>
                            <p>Estimated vessels: {formatNumber(cluster.properties.estimated_vessels)}</p>
                            <p>Dominant direction: {cluster.properties.dominant_direction.replaceAll('_', ' ')}</p>
                            <p>Flow intensity: {formatDecimal(cluster.properties.flow_intensity, 2)}</p>
                            <p>{cluster.properties.source_note}</p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>

                  <div className="pointer-events-none absolute bottom-4 left-4 z-[950] rounded-2xl border border-white/10 bg-[#101823]/88 p-4 text-xs text-[#d9c9bb] shadow-[0_18px_45px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                    <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                      Legend
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#34d399]" />Low pressure</div>
                      <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#fbbf24]" />Medium pressure</div>
                      <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#f87171]" />High pressure</div>
                      <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#991b1b]" />Critical pressure</div>
                      <div className="flex items-center gap-2"><span className="h-[2px] w-5 bg-[#38bdf8]" />Flow line</div>
                      <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#dbeafe]" />Moving dots = generalized traffic flow</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {data && (
              <div className="grid gap-3 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="overflow-hidden rounded-[1.4rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  >
                    <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                      <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-[#c8b29e]">
                        {stat.label}
                      </p>
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${stat.tone}`}>
                        {stat.note}
                      </span>
                    </div>
                    <div className="px-4 py-4">
                      <p className="hud-readout text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-none">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-[#c8b29e]">Pressure tape</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-black/16 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">High pressure</p>
                    <p className="mt-2 font-montserrat text-2xl font-semibold text-white">
                      {data ? formatNumber(data.summary.high_pressure_ports) : '--'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/16 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Medium pressure</p>
                    <p className="mt-2 font-montserrat text-2xl font-semibold text-white">
                      {data ? formatNumber(data.summary.medium_pressure_ports) : '--'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/16 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Low pressure</p>
                    <p className="mt-2 font-montserrat text-2xl font-semibold text-white">
                      {data ? formatNumber(data.summary.low_pressure_ports) : '--'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-[#c8b29e]">Port board</p>
                <div className="mt-4 space-y-2">
                  {ports.slice(0, 4).map((port) => (
                    <div key={port.properties.port_code} className="flex items-center justify-between rounded-xl bg-black/16 px-3 py-2.5">
                      <div>
                        <p className="font-montserrat text-sm font-semibold text-white">{port.properties.port_name}</p>
                        <p className="text-xs text-white/42">{port.properties.port_code} • {port.properties.state}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-montserrat text-sm font-semibold ${getPressureTone(port.properties.pressure_status)}`}>
                          {port.properties.pressure_status}
                        </p>
                        <p className="text-xs text-white/42">
                          {formatDecimal(port.properties.pressure_score, 2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
