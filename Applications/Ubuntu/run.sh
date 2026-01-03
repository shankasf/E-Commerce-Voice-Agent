#!/bin/bash
#
# Ubuntu MCP Agent launcher script
#

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
if [ ! -f "venv/.installed" ] || [ "requirements.txt" -nt "venv/.installed" ]; then
    echo "Installing dependencies..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    touch venv/.installed
fi

# Parse arguments
CLI_MODE=false
GUI_MODE=false
DEBUG_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --cli)
            CLI_MODE=true
            shift
            ;;
        --gui)
            GUI_MODE=true
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--cli|--gui] [--debug]"
            exit 1
            ;;
    esac
done

# Build command
CMD="python3 src/main.py"

if [ "$CLI_MODE" = true ]; then
    CMD="$CMD --cli"
fi

if [ "$GUI_MODE" = true ]; then
    CMD="$CMD --gui"
fi

if [ "$DEBUG_MODE" = true ]; then
    CMD="$CMD --debug"
fi

# Run application
echo "Starting Ubuntu MCP Agent..."
exec $CMD
