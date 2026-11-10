#!/usr/bin/env bash
# Used by CI (.github/workflows/ci.yml). Installs backend dependencies and runs the tests.
set -euo pipefail
cd "$(dirname "$0")/../backend"
python -m pip install -q -r requirements.txt
python -m pytest
