#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  RateGuard Docker Development Helper  ${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created. Please edit it with your values.${NC}"
fi

case "$1" in
    start)
        echo -e "${GREEN}🚀 Starting all services in development mode...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✅ Services started!${NC}"
        echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
        echo -e "${BLUE}🔧 Backend API: http://localhost:5001${NC}"
        echo -e "${BLUE}📊 MongoDB: localhost:27017${NC}"
        echo -e "${BLUE}⚡ Redis: localhost:6379${NC}"
        ;;
    
    stop)
        echo -e "${YELLOW}🛑 Stopping all services...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Services stopped!${NC}"
        ;;
    
    restart)
        echo -e "${YELLOW}🔄 Restarting all services...${NC}"
        docker-compose restart
        echo -e "${GREEN}✅ Services restarted!${NC}"
        ;;
    
    logs)
        echo -e "${BLUE}📋 Showing logs...${NC}"
        docker-compose logs -f
        ;;
    
    logs-server)
        echo -e "${BLUE}📋 Showing server logs...${NC}"
        docker-compose logs -f server
        ;;
    
    logs-client)
        echo -e "${BLUE}📋 Showing client logs...${NC}"
        docker-compose logs -f client
        ;;
    
    logs-mongo)
        echo -e "${BLUE}📋 Showing MongoDB logs...${NC}"
        docker-compose logs -f mongodb
        ;;
    
    logs-redis)
        echo -e "${BLUE}📋 Showing Redis logs...${NC}"
        docker-compose logs -f redis
        ;;
    
    shell-server)
        echo -e "${BLUE}🐚 Opening shell in server container...${NC}"
        docker-compose exec server sh
        ;;
    
    shell-client)
        echo -e "${BLUE}🐚 Opening shell in client container...${NC}"
        docker-compose exec client sh
        ;;
    
    shell-mongo)
        echo -e "${BLUE}🐚 Opening MongoDB shell...${NC}"
        docker-compose exec mongodb mongosh
        ;;
    
    shell-redis)
        echo -e "${BLUE}🐚 Opening Redis CLI...${NC}"
        docker-compose exec redis redis-cli
        ;;
    
    rebuild)
        echo -e "${YELLOW}🔨 Rebuilding and restarting all services...${NC}"
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        echo -e "${GREEN}✅ Services rebuilt and started!${NC}"
        ;;
    
    clean)
        echo -e "${RED}🧹 Cleaning up containers, volumes, and images...${NC}"
        docker-compose down -v
        docker system prune -f
        echo -e "${GREEN}✅ Cleanup complete!${NC}"
        ;;
    
    status)
        echo -e "${BLUE}📊 Container status:${NC}"
        docker-compose ps
        ;;
    
    help|*)
        echo -e "${BLUE}Available commands:${NC}"
        echo -e "  ${GREEN}start${NC}         - Start all services"
        echo -e "  ${GREEN}stop${NC}          - Stop all services"
        echo -e "  ${GREEN}restart${NC}       - Restart all services"
        echo -e "  ${GREEN}logs${NC}          - Show all logs"
        echo -e "  ${GREEN}logs-server${NC}   - Show server logs"
        echo -e "  ${GREEN}logs-client${NC}   - Show client logs"
        echo -e "  ${GREEN}logs-mongo${NC}    - Show MongoDB logs"
        echo -e "  ${GREEN}logs-redis${NC}    - Show Redis logs"
        echo -e "  ${GREEN}shell-server${NC}  - Open shell in server container"
        echo -e "  ${GREEN}shell-client${NC}  - Open shell in client container"
        echo -e "  ${GREEN}shell-mongo${NC}   - Open MongoDB shell"
        echo -e "  ${GREEN}shell-redis${NC}   - Open Redis CLI"
        echo -e "  ${GREEN}rebuild${NC}       - Rebuild and restart all services"
        echo -e "  ${GREEN}clean${NC}         - Remove all containers, volumes, and images"
        echo -e "  ${GREEN}status${NC}        - Show container status"
        echo -e "  ${GREEN}help${NC}          - Show this help"
        ;;
esac