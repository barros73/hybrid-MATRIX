#!/bin/bash
# 🧊 hybrid-MATRIX - Installer
# Copyright 2026 Fabrizio Baroni
# Licensed under the Apache License, Version 2.0

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}   🧊 HYBRID-MATRIX INSTALLER                       ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Dependency Checks
echo -e "\n${YELLOW}[1/3] Checking Prerequisites...${NC}"

check_dep() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ Error: $1 is not installed.${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 found: $($1 --version | head -n 1)${NC}"
        return 0
    fi
}

FAILED=0
check_dep node || FAILED=1
check_dep npm || FAILED=1

if [ $FAILED -eq 1 ]; then
    echo -e "\n${RED}Please install missing dependencies and try again.${NC}"
    exit 1
fi

# 2. Installing and Building
echo -e "\n${YELLOW}[2/3] Installing and Building CLI...${NC}"
npm install --silent
npx tsc

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}   ✅ HYBRID-MATRIX READY!                          ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "\nTo use the CLI, run:"
echo -e "  node dist/cli.js"
