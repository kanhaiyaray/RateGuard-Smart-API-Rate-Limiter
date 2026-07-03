#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  RateGuard Docker Production Helper  ${NC}"
echo -e "${BLUE}========================================${NC}"

case "$1" in
    start)
        echo -e "${GREEN}🚀 Starting production services...${NC}"
        docker-compose -f docker-compose.prod.yml up -d
        echo -e "${GREEN}✅ Production services started!${NC}"
        ;;
    
    stop)
        echo -e "${YELLOW}🛑 Stopping production services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Production services stopped!${NC}"
        ;;
    
    build)
        echo -e "${YELLOW}🔨 Building production images...${NC}"
        docker-compose -f docker-compose.prod.yml build
        echo -e "${GREEN}✅ Production images built!${NC}"
        ;;
    
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
    
    status)
        docker-compose -f docker-compose.prod.yml ps
        ;;
    
    help|*)
        echo -e "${BLUE}Production commands:${NC}"
        echo -e "  ${GREEN}start${NC}   - Start production services"
        echo -e "  ${GREEN}stop${NC}    - Stop production services"
        echo -e "  ${GREEN}build${NC}   - Build production images"
        echo -e "  ${GREEN}logs${NC}    - Show production logs"
        echo -e "  ${GREEN}status${NC}  - Show production status"
        ;;
esac