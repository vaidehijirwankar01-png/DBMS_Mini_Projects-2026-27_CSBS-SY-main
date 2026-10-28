#!/usr/bin/env bash
# =====================================================================
# Library Management System - Startup Script
# Usage:
#   ./run.sh         -> Launches Flask Web Application on http://127.0.0.1:5000
#   ./run.sh cli     -> Launches Terminal Interactive DBMS Console
#   ./run.sh reset   -> Resets and reseeds database
# =====================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ "$1" == "cli" ]; then
    echo "Starting Library Management System Console CLI..."
    python3 cli.py
elif [ "$1" == "reset" ]; then
    echo "Resetting database to seed records..."
    python3 -c "import database; database.init_db(force=True)"
    echo "Done!"
else
    echo "Starting Library Management System Web Portal..."
    echo "Open your browser at: http://127.0.0.1:5000"
    python3 app.py
fi
