from __future__ import annotations

from abc import ABC, abstractmethod


class MaritimeFlowProviderError(RuntimeError):
    pass


class MaritimeFlowProvider(ABC):
    source_name = "preview"

    @abstractmethod
    async def get_indo_pacific_ship_flow(
        self,
        include_ports: bool,
        include_routes: bool,
        include_vessel_clusters: bool,
    ) -> dict:
        raise NotImplementedError


class PreviewMaritimeFlowProvider(MaritimeFlowProvider):
    source_name = "preview"

    async def get_indo_pacific_ship_flow(
        self,
        include_ports: bool,
        include_routes: bool,
        include_vessel_clusters: bool,
    ) -> dict:
        raise MaritimeFlowProviderError("Preview provider should be resolved by the flow service")


class PortcastMaritimeFlowProvider(MaritimeFlowProvider):
    source_name = "portcast"

    async def get_indo_pacific_ship_flow(
        self,
        include_ports: bool,
        include_routes: bool,
        include_vessel_clusters: bool,
    ) -> dict:
        # TODO: wire Portcast maritime congestion and route telemetry once the API contract is confirmed.
        raise MaritimeFlowProviderError("Portcast integration is not configured")


class GoCometMaritimeFlowProvider(MaritimeFlowProvider):
    source_name = "gocomet"

    async def get_indo_pacific_ship_flow(
        self,
        include_ports: bool,
        include_routes: bool,
        include_vessel_clusters: bool,
    ) -> dict:
        # TODO: map GoComet aggregated visibility endpoints into the normalized public flow response.
        raise MaritimeFlowProviderError("GoComet integration is not configured")


class MarineTrafficMaritimeFlowProvider(MaritimeFlowProvider):
    source_name = "marinetraffic"

    async def get_indo_pacific_ship_flow(
        self,
        include_ports: bool,
        include_routes: bool,
        include_vessel_clusters: bool,
    ) -> dict:
        # TODO: integrate MarineTraffic aggregated congestion and corridor telemetry via backend-only secrets.
        raise MaritimeFlowProviderError("MarineTraffic integration is not configured")


class DatalasticMaritimeFlowProvider(MaritimeFlowProvider):
    source_name = "datalastic"

    async def get_indo_pacific_ship_flow(
        self,
        include_ports: bool,
        include_routes: bool,
        include_vessel_clusters: bool,
    ) -> dict:
        # TODO: integrate Datalastic vessel flow aggregation once provider routes are approved.
        raise MaritimeFlowProviderError("Datalastic integration is not configured")
