from __future__ import annotations

from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.agents.orchestrator import CopilotOrchestrator
from app.database import SessionLocal
from app.mcp.server import InternalMCPServer
from scripts.mcp_sanity_check import seed_operational_data


def step(name: str, fn):
    try:
        result = fn()
        if name == "upgrade" and not result.get("upgrade_required"):
            raise RuntimeError("Expected upgrade_required for locked feature prompt")
        if name == "compliance" and not result.get("citations"):
            raise RuntimeError("Expected citations for compliance prompt")
        print(f"PASS {name}: {result['intent']} -> {result['tools_used']}")
    except Exception as exc:
        print(f"FAIL {name}: {exc}")
        raise


def main() -> None:
    db = SessionLocal()
    try:
        seeded = seed_operational_data(db)
        user = seeded["user"]
        orchestrator = CopilotOrchestrator(InternalMCPServer())

        prompts = [
            ("inventory", "What products are low on stock?", "FREE"),
            ("sales", "What are my best-selling products this week?", "PRO"),
            ("returns", "Which products are leaking profit due to returns?", "PRO"),
            ("logistics", "Any delayed international shipments?", "BOOST"),
            ("compliance", "What does Malaysian customs law say about this shipment?", "BOOST"),
            ("general", "Give me general business insights.", "PRO"),
            ("upgrade", "Any delayed international shipments?", "PRO"),
        ]

        for label, message, plan in prompts:
            step(
                label,
                lambda message=message, plan=plan: orchestrator.handle_query(
                    db=db,
                    user=user,
                    query=message,
                    organization_id="sanity-org",
                    requested_plan=plan,
                ),
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()
