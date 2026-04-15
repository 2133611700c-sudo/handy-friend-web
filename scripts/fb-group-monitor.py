#!/usr/bin/env python3
"""Compatibility entry point for Facebook group monitor.

Canonical runtime entry point remains:
  skills/facebook-group-monitor/scripts/fb-group-monitor.sh

If running this module directly from the repo root, install dependencies first:
  pip install -r scripts/requirements.txt
  python -m playwright install chromium
"""

from __future__ import annotations

from pathlib import Path
import runpy
import sys

TARGET = Path(__file__).resolve().parents[1] / "skills" / "facebook-group-monitor" / "scripts" / "fb-group-monitor.py"

if not TARGET.exists():
    raise FileNotFoundError(f"Expected monitor script not found: {TARGET}")

sys.path.insert(0, str(TARGET.parent))
runpy.run_path(str(TARGET), run_name="__main__")
