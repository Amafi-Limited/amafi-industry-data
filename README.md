# Amafi Industry Data Service

## Overview

The Amafi Industry Data Service is a specialized microservice responsible for AI-powered industry analysis, competitor research, and market intelligence. It provides comprehensive supply and demand analysis, market positioning insights, and competitive landscape data for the Amafi M&A platform.

## Features

### 🏭 Industry Analysis
- **Multi-industry classification** for diversified companies
- **Market positioning analysis** (Leaders, Challengers, Followers)
- **Industry trends and growth drivers**
- **Regulatory and compliance landscape**

### 🏢 Competitive Intelligence
- **Real-time competitor discovery** using Perplexity AI
- **Competitive positioning matrices**
- **Market share analysis**
- **SWOT analysis for key players**

### 📊 Supply & Demand Analytics
- **Supply chain analysis** and key suppliers identification
- **Demand forecasting** and market drivers
- **Time-series analysis** (2019-2028) with historical and projected data
- **Geographic market analysis**

### ⚡ Async Processing
- **Job queue system** with Redis and Bull
- **WebSocket real-time updates** for long-running AI operations
- **Progress tracking** with detailed status reporting
- **Error handling and retry mechanisms**

## Architecture

### Technology Stack
- **Backend**: Node.js + TypeScript + Express
- **Database**: Supabase PostgreSQL
- **Queue**: Redis + Bull Queue
- **AI Integration**: Perplexity API (sonar-pro model)
- **Real-time**: Socket.io WebSockets
- **Logging**: Winston

### Service Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Industry Data   │    │   Perplexity    │
│   (Port 5173)   │◄──►│  Service         │◄──►│   AI API        │
│                 │    │  (Port 3002)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Supabase       │
                       │   PostgreSQL     │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Redis Queue    │
                       │   + WebSocket    │
                       └──────────────────┘
```

## API Endpoints

### Async Job Endpoints
- `POST /api/industry-async/industry` - Start industry analysis job
- `POST /api/industry-async/competitors` - Start competitor research job
- `POST /api/industry-async/supply` - Start supply chain analysis job
- `POST /api/industry-async/demand` - Start demand analysis job
- `GET /api/industry-async/job-status/:jobId` - Get job status

### Job Parameters
```typescript
interface StartJobRequest {
  companyName: string;
  companyDescription: string;
  projectId?: string;
  entityId: string;
  profileId: string;
  headquartersCountry?: string;
  primaryIndustry?: string;
  useDeepResearch?: boolean;
  forceRegenerate?: boolean;
}
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- Redis server
- Supabase account and database
- Perplexity API key

### Environment Variables
Create a `.env` file:
```bash
# Server Configuration
PORT=3002
NODE_ENV=development

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
PERPLEXITY_API_KEY=your_perplexity_api_key

# Queue & Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# WebSocket
WEBSOCKET_CORS_ORIGIN=http://localhost:5173
```

### Installation
```bash
# Clone the repository
git clone https://github.com/Amafi-Limited/amafi-industry-data.git
cd amafi-industry-data

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

## Job Processing

### Job Types
1. **Industry Analysis** - Comprehensive industry overview and trends
2. **Competitor Research** - Competitive landscape and positioning
3. **Supply Analysis** - Supply chain mapping and key suppliers
4. **Demand Analysis** - Market demand drivers and forecasting

### Job States
- `waiting` - Job queued for processing
- `active` - Currently being processed
- `completed` - Successfully completed
- `failed` - Processing failed with error

### WebSocket Events
- `job:status` - Real-time job status updates
- `job:progress` - Progress percentage updates
- `job:complete` - Job completion notification
- `job:error` - Error notifications

## Development

### Project Structure
```
src/
├── routes/           # API route handlers
│   └── industryAsync.ts
├── services/         # Business logic services
│   └── jobs/        # Job processing services
│       ├── JobQueue.ts
│       ├── JobConfig.ts
│       ├── JobProcessorFactory.ts
│       └── WebSocketService.ts
├── utils/           # Utilities
│   └── logger.ts
├── config/          # Configuration files
└── server.ts        # Main server file
```

### Key Services

#### JobQueue
Manages Redis-based job queuing with Bull:
- Job creation and scheduling
- Progress tracking and updates
- Error handling and retries
- Job cleanup and monitoring

#### JobProcessorFactory
Creates specialized processors for each job type:
- Industry analysis processor
- Competitor research processor  
- Supply chain analysis processor
- Demand forecasting processor

#### WebSocketService
Handles real-time communication:
- Client connection management
- Job status broadcasting
- Progress updates
- Error notifications

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure Redis for production use
3. Set up proper logging and monitoring
4. Configure rate limiting and security headers

### Docker Support
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3002
CMD ["npm", "start"]
```

## Monitoring & Logging

### Logging
- **Winston** for structured logging
- **Log levels**: error, warn, info, debug
- **Request logging** with performance metrics
- **Error tracking** with stack traces

### Health Monitoring
- Job queue health checks
- Redis connection monitoring
- Database connection validation
- API response time tracking

## Integration

### Frontend Integration
The service integrates with the Amafi frontend through:
- **Async API calls** for job initiation
- **WebSocket connections** for real-time updates
- **Job status polling** as fallback
- **Error handling** with user-friendly messages

### Database Schema
The service works with the following key tables:
- `entities_list` - Company information
- `projects_list` - Project management
- `industry_analysis` - Analysis results storage

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Commit changes: `git commit -am 'Add new feature'`
5. Push to branch: `git push origin feature/new-feature`
6. Submit a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Review the documentation and API guides

---

**Part of the Amafi M&A Platform**
- 🏢 [Main Amafi Repository](https://github.com/Amafi-Limited/amafi)
- 📊 [Corporate Data Service](https://github.com/Amafi-Limited/amafi-corporate-data)
- 🏭 [Industry Data Service](https://github.com/Amafi-Limited/amafi-industry-data)