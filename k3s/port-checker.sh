#!/bin/bash

# Port Conflict Checker and Manager
# Ensures no port conflicts across all applications

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Port Registry - Single source of truth
declare -A PORT_REGISTRY=(
    # CallSphere Website
    ["callsphere-website:web"]=30000

    # Google Map
    ["google-map:api"]=30010

    # Ticket Console
    ["ticket-console:web"]=30001

    # URackIT V2
    ["urackit-v2:backend"]=30003
    ["urackit-v2:frontend"]=30004
    ["urackit-v2:ai"]=30088

    # Healthcare Voice
    ["healthcare-voice:backend"]=30005
    ["healthcare-voice:frontend"]=30006
    ["healthcare-voice:ai"]=30084

    # Salon
    ["salon:backend"]=30020
    ["salon:frontend"]=30021
    ["salon:ai"]=30086

    # Afterhours Escalation
    ["escalation:backend"]=30040
    ["escalation:frontend"]=30041
    ["escalation:ai"]=30083

    # Realestate Voice
    ["realestate-voice:api"]=30089

    # Quiz
    ["quiz:web"]=30180
    ["quiz:admin"]=30181
    ["quiz:api"]=30400
)

# Check for port conflicts in registry
check_registry_conflicts() {
    print_header "Checking Port Registry for Conflicts"

    local -A port_usage
    local conflicts=0

    for key in "${!PORT_REGISTRY[@]}"; do
        local port=${PORT_REGISTRY[$key]}

        if [[ -n "${port_usage[$port]}" ]]; then
            echo -e "${RED}CONFLICT:${NC} Port $port used by both:"
            echo "  - ${port_usage[$port]}"
            echo "  - $key"
            ((conflicts++))
        else
            port_usage[$port]=$key
        fi
    done

    if [[ $conflicts -eq 0 ]]; then
        echo -e "${GREEN}No conflicts found in port registry${NC}"
    else
        echo -e "\n${RED}Total conflicts: $conflicts${NC}"
    fi

    return $conflicts
}

# Check if ports are available on the system
check_system_ports() {
    print_header "Checking System Port Availability"

    local unavailable=0

    for key in "${!PORT_REGISTRY[@]}"; do
        local port=${PORT_REGISTRY[$key]}

        if ss -tuln 2>/dev/null | grep -q ":$port " || netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e "${YELLOW}IN USE:${NC} Port $port ($key) is already in use on the system"
            ((unavailable++))
        fi
    done

    if [[ $unavailable -eq 0 ]]; then
        echo -e "${GREEN}All registered ports are available${NC}"
    else
        echo -e "\n${YELLOW}$unavailable port(s) currently in use${NC}"
    fi
}

# Check Kubernetes service ports
check_k3s_ports() {
    print_header "Checking Kubernetes Service Ports"

    if ! command -v kubectl &> /dev/null; then
        echo -e "${YELLOW}kubectl not found, skipping k3s check${NC}"
        return
    fi

    echo -e "${CYAN}Current NodePort allocations:${NC}\n"
    echo "NAMESPACE                  SERVICE                    TYPE        NODEPORT"
    echo "-------------------------- -------------------------- ----------- --------"

    kubectl get services --all-namespaces -o custom-columns=\
'NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.spec.type,NODEPORT:.spec.ports[*].nodePort' 2>/dev/null | \
    grep -E "NodePort|NAMESPACE" | grep -v "^$" | while read line; do
        echo "$line"
    done

    echo ""

    # Check for duplicates
    local ports=$(kubectl get services --all-namespaces -o jsonpath='{range .items[*]}{range .spec.ports[*]}{.nodePort}{"\n"}{end}{end}' 2>/dev/null | grep -v "^$" | sort)
    local duplicates=$(echo "$ports" | uniq -d)

    if [[ -n "$duplicates" ]]; then
        echo -e "${RED}DUPLICATE PORTS DETECTED:${NC}"
        for port in $duplicates; do
            echo "  Port $port is assigned to multiple services:"
            kubectl get services --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {range .spec.ports[*]}{.nodePort}{" "}{end}{"\n"}{end}' 2>/dev/null | grep " $port "
        done
    else
        echo -e "${GREEN}No duplicate ports in Kubernetes${NC}"
    fi
}

# Suggest next available port
suggest_port() {
    local type=$1
    local start=30000
    local end=32767

    case $type in
        frontend) start=30000; end=30099 ;;
        backend) start=30100; end=30199 ;;
        api) start=30400; end=30499 ;;
        ai) start=30080; end=30099 ;;
        voice) start=30080; end=30099 ;;
        *)  ;;
    esac

    # Find first available port in range
    for ((port=start; port<=end; port++)); do
        local in_use=0

        # Check registry
        for key in "${!PORT_REGISTRY[@]}"; do
            if [[ ${PORT_REGISTRY[$key]} -eq $port ]]; then
                in_use=1
                break
            fi
        done

        # Check system
        if [[ $in_use -eq 0 ]] && (ss -tuln 2>/dev/null | grep -q ":$port " || netstat -tuln 2>/dev/null | grep -q ":$port "); then
            in_use=1
        fi

        if [[ $in_use -eq 0 ]]; then
            echo $port
            return
        fi
    done

    echo "No available port found in range $start-$end"
    return 1
}

# Print port map
print_port_map() {
    print_header "Complete Port Map"

    echo -e "${CYAN}Port Assignments by Application:${NC}\n"

    # Sort and display
    for key in $(echo "${!PORT_REGISTRY[@]}" | tr ' ' '\n' | sort); do
        local app=$(echo $key | cut -d: -f1)
        local service=$(echo $key | cut -d: -f2)
        local port=${PORT_REGISTRY[$key]}
        printf "  %-25s %-15s %s\n" "$app" "$service" "$port"
    done

    echo -e "\n${CYAN}Port Ranges:${NC}"
    echo "  30000-30099: Web/Frontend services"
    echo "  30100-30199: Backend/API services"
    echo "  30080-30099: Voice/AI services"
    echo "  30400-30499: Additional APIs"
    echo "  30432:       PostgreSQL (healthcare)"
    echo "  30379:       Redis (escalation)"
}

# Main
case "${1:-all}" in
    registry)
        check_registry_conflicts
        ;;
    system)
        check_system_ports
        ;;
    k3s|kubernetes)
        check_k3s_ports
        ;;
    suggest)
        suggest_port "$2"
        ;;
    map)
        print_port_map
        ;;
    all)
        check_registry_conflicts
        check_system_ports
        check_k3s_ports
        print_port_map
        ;;
    *)
        echo "Port Conflict Checker"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  all        Run all checks (default)"
        echo "  registry   Check port registry for conflicts"
        echo "  system     Check system port availability"
        echo "  k3s        Check Kubernetes service ports"
        echo "  map        Print complete port map"
        echo "  suggest    Suggest next available port"
        echo "             Usage: $0 suggest [frontend|backend|api|ai|voice]"
        ;;
esac
