from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKIP_PARTS = {"node_modules", ".next", ".git", "__pycache__"}


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1")


def should_skip(path: Path) -> bool:
    if any(part in SKIP_PARTS for part in path.parts):
        return True
    if path.name.endswith(".tsbuildinfo"):
        return True
    return False


def list_backend_routes() -> list[dict[str, str]]:
    routes: list[dict[str, str]] = []
    for path in sorted((ROOT / "backend" / "app" / "routers").glob("*.py")):
        text = read_text(path)
        for match in re.finditer(r'@router\.(get|post|put|patch|delete)\("([^"]+)"', text):
            routes.append(
                {
                    "file": str(path.relative_to(ROOT)),
                    "method": match.group(1).upper(),
                    "path": match.group(2),
                }
            )
    return routes


def list_frontend_pages() -> list[str]:
    return sorted(
        str(path.relative_to(ROOT))
        for path in (ROOT / "frontend" / "app").rglob("page.tsx")
    )


def list_mobile_files() -> list[str]:
    return sorted(
        str(path.relative_to(ROOT))
        for path in (ROOT / "mobile" / "src").rglob("*.js")
    )


def list_mcp_tools() -> list[dict[str, str]]:
    tools: list[dict[str, str]] = []
    for path in sorted((ROOT / "backend" / "app" / "mcp").glob("*_mcp.py")):
        text = read_text(path)
        for match in re.finditer(r'name="([a-z]+\.[a-zA-Z0-9_]+)"', text):
            tools.append(
                {
                    "file": str(path.relative_to(ROOT)),
                    "tool": match.group(1),
                }
            )
    return tools


def notification_hits() -> list[dict[str, object]]:
    patterns = ("notification", "notifications", "expo-notifications", "userdevice", "preference")
    hits: list[dict[str, object]] = []
    for base in ("backend", "frontend", "mobile"):
        for path in (ROOT / base).rglob("*"):
            if not path.is_file():
                continue
            if should_skip(path):
                continue
            if path.suffix not in {".py", ".ts", ".tsx", ".js", ".json", ".md"}:
                continue
            text = read_text(path).lower()
            matched = [token for token in patterns if token in text]
            if matched:
                hits.append(
                    {
                        "file": str(path.relative_to(ROOT)),
                        "tokens": matched,
                    }
                )
    return hits


def plan_gating_hits() -> dict[str, list[str]]:
    keywords = {
        "FREE": [],
        "PREMIUM": [],
        "PRO": [],
        "BOOST": [],
        "upgrade_required": [],
        "required_plan": [],
    }
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if should_skip(path):
            continue
        if path.suffix not in {".py", ".ts", ".tsx", ".js"}:
            continue
        text = read_text(path)
        for key in keywords:
            if key in text:
                keywords[key].append(str(path.relative_to(ROOT)))
    return keywords


def main() -> None:
    payload = {
        "backend_routes": list_backend_routes(),
        "frontend_pages": list_frontend_pages(),
        "mobile_files": list_mobile_files(),
        "mcp_tools": list_mcp_tools(),
        "notification_hits": notification_hits(),
        "plan_gating_hits": plan_gating_hits(),
    }
    out_dir = ROOT / "docs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "feature_audit_static.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(out_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
