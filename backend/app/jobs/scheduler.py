from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Callable
from uuid import uuid4

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.mcp.client import InternalMCPClient
from app.mcp.schemas import MCPRequestContext, PlanLevel
from app.mcp.server import InternalMCPServer
from app.models import AgentRecommendation


@dataclass(frozen=True)
class ScheduledJob:
    name: str
    interval_seconds: int
    runner: Callable[[Session, InternalMCPClient, MCPRequestContext], list[AgentRecommendation]]


def get_system_context(client: InternalMCPClient, *, request_id: str | None = None) -> MCPRequestContext:
    return client.build_system_context(
        plan_level=PlanLevel.BOOST,
        request_id=request_id or str(uuid4()),
    )


def create_agent_recommendation(
    db: Session,
    *,
    job_name: str,
    domain: str,
    recommendation_type: str,
    severity: str,
    title: str,
    summary: str,
    payload: dict | list | None,
    source_target: str | None = None,
) -> AgentRecommendation:
    recommendation = AgentRecommendation(
        job_name=job_name,
        domain=domain,
        recommendation_type=recommendation_type,
        severity=severity,
        title=title,
        summary=summary,
        payload=payload,
        source_target=source_target,
    )
    db.add(recommendation)
    return recommendation


class AgentJobScheduler:
    """
    Lightweight in-process scheduler for MCP-backed scans.

    This intentionally stays simple and avoids a hard dependency on Celery or
    APScheduler. Jobs still use the internal MCP client, so scheduled agents
    remain subject to MCP policy and service-layer behavior.
    """

    def __init__(self, server: InternalMCPServer, jobs: list[ScheduledJob]) -> None:
        self.client = InternalMCPClient(server)
        self.jobs = jobs
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, name="agent-job-scheduler", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    def _run_loop(self) -> None:
        now = datetime.utcnow()
        next_runs = {job.name: now for job in self.jobs}

        while not self._stop_event.is_set():
            current_time = datetime.utcnow()
            for job in self.jobs:
                if current_time < next_runs[job.name]:
                    continue
                self.run_job(job)
                next_runs[job.name] = current_time + timedelta(seconds=job.interval_seconds)
            time.sleep(30)

    def run_job(self, job: ScheduledJob) -> int:
        db = SessionLocal()
        try:
            context = get_system_context(self.client, request_id=f"{job.name}-{uuid4()}")
            recommendations = job.runner(db, self.client, context)
            db.commit()
            return len(recommendations)
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


def should_enable_scheduler() -> bool:
    return os.getenv("ENABLE_AGENT_SCHEDULER", "false").lower() == "true"


def build_default_scheduler(server: InternalMCPServer) -> AgentJobScheduler:
    from app.jobs.daily_inventory_scan import run_daily_inventory_scan
    from app.jobs.logistics_scan import run_logistics_scan
    from app.jobs.returns_profit_scan import run_returns_profit_scan
    from app.jobs.weekly_sales_scan import run_weekly_sales_scan

    return AgentJobScheduler(
        server,
        jobs=[
            ScheduledJob(
                name="daily_inventory_scan",
                interval_seconds=24 * 60 * 60,
                runner=run_daily_inventory_scan,
            ),
            ScheduledJob(
                name="weekly_sales_scan",
                interval_seconds=7 * 24 * 60 * 60,
                runner=run_weekly_sales_scan,
            ),
            ScheduledJob(
                name="returns_profit_scan",
                interval_seconds=24 * 60 * 60,
                runner=run_returns_profit_scan,
            ),
            ScheduledJob(
                name="logistics_scan",
                interval_seconds=6 * 60 * 60,
                runner=run_logistics_scan,
            ),
        ],
    )
