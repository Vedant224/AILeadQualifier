# Lead Scoring Backend API

A production-ready backend service for lead qualification that combines rule-based scoring with AI-powered intent analysis. This service accepts product/offer information and lead data via CSV upload, then scores each lead's buying intent using a hybrid approach of deterministic rules and AI reasoning.

## 🚀 Features

- **RESTful API** with comprehensive endpoints for lead management
- **Hybrid Scoring System** combining rule-based logic with AI analysis
- **AI-Powered Intent Analysis** using Google Gemini for advanced lead qualification
- **CSV Upload & Processing** with robust validation and error handling
- **Multiple Export Formats** (JSON and CSV) for integration flexibility
- **Production-Ready** with comprehensive error handling, logging, and monitoring
- **TypeScript** for type safety and enhanced developer experience
- **Comprehensive Testing** with unit and integration test coverage

## 📋 Requirements

- **Node.js** 18.0.0 or higher
- **npm** or yarn package manager
- **Google Gemini API key** for AI-powered analysis

## 🛠️ Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd lead-scoring-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### 2. Configuration

Edit `.env` with your settings:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# AI Service Configuration (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# File Upload Configuration
MAX_FILE_SIZE=10485760
MAX_LEADS_PER_UPLOAD=1000

# Logging Configuration
LOG_LEVEL=info

# CORS Configuration (Optional)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication
No authentication required for this demo API.

---

### 🏥 Health & Status Endpoints

#### Get System Health
```http
GET /health
```

**Response:**
```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "environment": "development",
    "version": "1.0.0",
    "checks": {
      "ai_service": {
        "status": "healthy",
        "response_time_ms": 245,
        "details": "AI service responding normally"
      },
      "memory": {
        "status": "healthy",
        "details": "Heap usage: 45.2%"
      },
      "data_store": {
        "status": "healthy",
        "details": "Data store operational. Leads: 150, Results: 150"
      }
    }
  }
}
```

#### Liveness Probe
```http
GET /health/live
```

#### Readiness Probe
```http
GET /health/ready
```

#### System Metrics
```http
GET /health/metrics
```

---

### 🎯 Offer Management

#### Submit Product/Offer Information
```http
POST /offer
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "AI Outreach Automation",
  "value_props": [
    "24/7 automated outreach",
    "6x more qualified meetings",
    "Personalized messaging at scale"
  ],
  "ideal_use_cases": [
    "B2B SaaS mid-market",
    "Technology companies",
    "Sales teams 10-50 people"
  ]
}
```

**Response:**
```json
{
  "data": {
    "message": "Offer created successfully",
    "offer": {
      "name": "AI Outreach Automation",
      "value_props_count": 3,
      "ideal_use_cases_count": 3
    },
    "storage_stats": {
      "has_offer": true,
      "last_updated": "2024-01-15T10:30:00.000Z"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "meta": {
    "processing_time_ms": 15
  }
}
```

#### Get Current Offer
```http
GET /offer
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/offer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Outreach Automation",
    "value_props": ["24/7 outreach", "6x more meetings"],
    "ideal_use_cases": ["B2B SaaS mid-market"]
  }'
```

---

### 👥 Lead Management

#### Upload Lead Data (CSV)
```http
POST /leads/upload
Content-Type: multipart/form-data
```

**Required CSV Format:**
```csv
name,role,company,industry,location,linkedin_bio
John Doe,CEO,Tech Corp,Technology,San Francisco CA,Experienced technology executive...
Jane Smith,VP Marketing,SaaS Inc,Software,New York NY,Marketing leader with 10 years...
```

**Response:**
```json
{
  "data": {
    "leads_processed": 150,
    "leads_rejected": 5,
    "validation_errors": [
      {
        "row": 23,
        "field": "linkedin_bio",
        "message": "LinkedIn bio is required",
        "value": ""
      }
    ],
    "summary": {
      "total_rows": 155,
      "file_size_bytes": 45678,
      "processing_time_ms": 1250
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/leads/upload \
  -F "file=@leads.csv"
```

#### Get Lead Summary
```http
GET /leads
```

---

### 🎯 Lead Scoring

#### Execute Lead Scoring
```http
POST /score
```

**Prerequisites:**
- Offer data must be submitted via `POST /offer`
- Lead data must be uploaded via `POST /leads/upload`

**Response:**
```json
{
  "data": {
    "leads_scored": 150,
    "leads_failed": 0,
    "summary": {
      "average_score": 67.5,
      "intent_distribution": {
        "High": 45,
        "Medium": 78,
        "Low": 27
      },
      "processing_time_ms": 45000,
      "completed_at": "2024-01-15T10:35:00.000Z"
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/score
```

#### Get Scoring Status
```http
GET /score/status
```

---

### 📊 Results & Export

#### Get Scored Results
```http
GET /results
```

**Query Parameters:**
- `intent` - Filter by intent level (`High`, `Medium`, `Low`)
- `min_score` - Minimum score threshold (0-100)
- `max_score` - Maximum score threshold (0-100)
- `limit` - Maximum number of results

**Response:**
```json
{
  "data": [
    {
      "name": "John Doe",
      "role": "CEO",
      "company": "Tech Corp",
      "industry": "Technology",
      "location": "San Francisco, CA",
      "intent": "High",
      "score": 85,
      "reasoning": "Rule-based factors: decision maker role, excellent industry fit, complete profile data. AI analysis: CEO of technology company with strong product-market fit.",
      "rule_breakdown": {
        "role_score": 20,
        "industry_score": 20,
        "completeness_score": 10,
        "total_rule_score": 50
      },
      "ai_analysis": {
        "intent": "High",
        "reasoning": "CEO with strong technology background and clear decision authority",
        "score": 50,
        "confidence": 0.92
      },
      "scored_at": "2024-01-15T10:35:00.000Z"
    }
  ],
  "meta": {
    "total": 150,
    "summary": {
      "average_score": 67.5,
      "intent_distribution": {
        "High": 45,
        "Medium": 78,
        "Low": 27
      }
    }
  }
}
```

**cURL Examples:**
```bash
# Get all results
curl http://localhost:3000/results

# Get high-intent leads only
curl "http://localhost:3000/results?intent=High"

# Get leads with score 70 or higher
curl "http://localhost:3000/results?min_score=70"

# Get top 10 leads
curl "http://localhost:3000/results?limit=10"
```

#### Export Results as CSV
```http
GET /results/export
```

**Query Parameters:** Same as `/results` endpoint

**Response:** CSV file download with headers:
```csv
name,role,company,industry,location,intent,total_score,reasoning,rule_total_score,rule_role_score,rule_industry_score,rule_completeness_score,ai_intent,ai_score,ai_reasoning,ai_confidence,uploaded_at,scored_at
```

**cURL Example:**
```bash
curl http://localhost:3000/results/export -o lead_scores.csv
```

---

## 🏗️ Project Structure

```
src/
├── controllers/         # HTTP request handlers
│   ├── healthController.ts
│   ├── offerController.ts
│   ├── leadController.ts
│   └── scoringController.ts
├── services/           # Business logic
│   ├── aiService.ts
│   ├── dataStore.ts
│   ├── ruleEngine.ts
│   └── scoringService.ts
├── models/             # TypeScript interfaces
│   ├── api.ts
│   ├── lead.ts
│   ├── offer.ts
│   └── index.ts
├── middleware/         # Express middleware
│   ├── errorHandler.ts
│   ├── requestLogger.ts
│   ├── validation.ts
│   └── fileUpload.ts
├── routes/            # API route definitions
│   ├── healthRoutes.ts
│   ├── offerRoutes.ts
│   ├── leadRoutes.ts
│   └── scoringRoutes.ts
├── utils/             # Utility functions
│   ├── errors.ts
│   ├── validation.ts
│   ├── csvParser.ts
│   ├── csvExport.ts
│   └── prompts.ts
├── __tests__/         # Test files
└── server.ts          # Main application entry point
```

## 🧪 Development & Testing

### Development Commands
```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm start               # Start production server

# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:integration # Run integration tests only

# Code Quality
npm run lint            # Lint TypeScript code
npm run clean           # Clean build directory

# Deployment
npm run deploy          # Run deployment preparation script
npm run health-check    # Check application health

# Docker
npm run docker:build    # Build Docker image
npm run docker:run      # Run Docker container
npm run docker:dev      # Run development container
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm test -- ruleEngine.test.ts
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3000` | No |
| `GEMINI_API_KEY` | Google Gemini API key | - | **Yes** |
| `MAX_FILE_SIZE` | Max CSV file size (bytes) | `10485760` | No |
| `MAX_LEADS_PER_UPLOAD` | Max leads per CSV | `1000` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` | No |

### Scoring Configuration

#### Rule-Based Scoring (Max 50 points)
- **Role Relevance** (0-20 points)
  - Decision makers (CEO, CTO, VP, Director): 20 points
  - Influencers (Manager, Senior, Lead): 10 points
  - Others: 0 points

- **Industry Match** (0-20 points)
  - Exact match with ideal use cases: 20 points
  - Adjacent industry match: 10 points
  - No match: 0 points

- **Data Completeness** (0-10 points)
  - All required fields present: 10 points
  - Missing fields: 0 points

#### AI-Powered Analysis (Max 50 points)
- **High Intent**: 50 points
- **Medium Intent**: 30 points
- **Low Intent**: 10 points

**Total Score**: Rule Score + AI Score (0-100 points)

## 🚨 Error Handling

The API uses consistent error response format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field_errors": {
        "name": "Name is required"
      }
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "request_id": "req_1642248600_abc123"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `NO_OFFER_DATA` - Offer information required
- `NO_LEADS_DATA` - Lead data required
- `FILE_TOO_LARGE` - Uploaded file exceeds size limit
- `AI_SERVICE_ERROR` - AI service unavailable
- `INTERNAL_ERROR` - Server error

## 🔍 Monitoring & Observability

### Health Checks
- **Liveness**: `/health/live` - Basic service availability
- **Readiness**: `/health/ready` - Service ready for traffic
- **Health**: `/health` - Comprehensive system health
- **Metrics**: `/health/metrics` - Detailed system metrics

### Logging
Structured logging with different levels:
- Request/response logging
- Error logging with stack traces
- Performance metrics
- AI service interaction logs

## 🚀 Deployment

### Local Production Build
```bash
npm run build
NODE_ENV=production npm start
```

### Docker Deployment

#### Quick Start with Docker
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t lead-scoring-api .
docker run -p 3000:3000 --env-file .env lead-scoring-api
```

#### Development with Docker
```bash
# Run development environment
docker-compose --profile dev up

# Build development image
docker build --target builder -t lead-scoring-api:dev .
```

#### Production with Docker
```bash
# Build production image
docker build --target production -t lead-scoring-api:prod .

# Run with health checks and restart policy
docker run -d \
  --name lead-scoring-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  lead-scoring-api:prod
```

### Cloud Deployment

The service is designed to deploy easily to multiple platforms:

#### Render.com
```bash
# Deploy using render.yaml configuration
git push origin main  # Auto-deploys on push
```

#### Railway
```bash
# Deploy using railway.json configuration
railway login
railway link
railway up
```

#### Vercel
```bash
# Deploy using vercel.json configuration
npm install -g vercel
vercel --prod
```

#### Docker Deployment
```bash
# Build and run with Docker
npm run docker:build
npm run docker:run

# Or use Docker Compose
docker-compose up -d
```

**Live Demo**: [https://lead-scoring-backend.onrender.com](https://lead-scoring-backend.onrender.com) *(Replace with actual deployment URL)*

## 🤝 API Usage Examples

### Complete Workflow Example

```bash
# 1. Submit offer information
curl -X POST http://localhost:3000/offer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Sales Assistant",
    "value_props": ["Automated lead qualification", "24/7 availability"],
    "ideal_use_cases": ["B2B SaaS", "Technology companies"]
  }'

# 2. Upload lead data
curl -X POST http://localhost:3000/leads/upload \
  -F "file=@sample_leads.csv"

# 3. Execute scoring
curl -X POST http://localhost:3000/score

# 4. Get results
curl http://localhost:3000/results

# 5. Export to CSV
curl http://localhost:3000/results/export -o scored_leads.csv
```

### Sample CSV File Format

Create `sample_leads.csv`:
```csv
name,role,company,industry,location,linkedin_bio
John Smith,CEO,TechCorp,Technology,San Francisco CA,Technology executive with 15 years experience in SaaS platforms
Sarah Johnson,VP Marketing,DataCorp,Software,New York NY,Marketing leader focused on B2B growth and customer acquisition
Mike Wilson,Software Engineer,StartupInc,Technology,Austin TX,Full-stack developer passionate about AI and automation
```

## 📊 Performance Considerations

### Scalability
- **Current Scope**: In-memory storage suitable for demonstration and small-scale usage
- **Production Scaling**: Consider database integration for persistent storage
- **Concurrent Users**: Handles multiple concurrent requests with proper error isolation
- **Memory Management**: Automatic cleanup of processed data to prevent memory leaks

### Limitations
- **Data Persistence**: Data is lost on server restart (in-memory storage)
- **File Size**: Maximum 10MB CSV files, 1000 leads per upload
- **AI Rate Limits**: Subject to Google Gemini API rate limits
- **Concurrent Scoring**: Single-threaded scoring process (can be optimized with worker threads)

### Optimization Recommendations
- Implement database storage for production use
- Add Redis caching for AI responses
- Use worker threads for CPU-intensive scoring operations
- Implement request queuing for high-volume scenarios

## 🔒 Security Considerations

### Current Security Features
- **Input Validation**: Comprehensive validation for all inputs
- **Error Sanitization**: Safe error messages without sensitive data exposure
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **File Upload Security**: File type and size validation

### Production Security Recommendations
- Implement authentication and authorization
- Add API key management for client access
- Use HTTPS in production (handled by cloud platforms)
- Implement request logging and monitoring
- Add input sanitization for XSS prevention

## 📝 License

MIT License - This project is created as a hiring assignment demonstrating backend API development, AI integration, and production-ready code practices.

**Key Achievements Demonstrated:**
- ✅ Clean, well-documented backend APIs
- ✅ AI integration with Google Gemini
- ✅ Comprehensive error handling and logging
- ✅ Production-ready deployment configuration
- ✅ Extensive testing coverage
- ✅ Docker containerization
- ✅ Multiple cloud platform support
- ✅ Monitoring and health checks
- ✅ Complete documentation with examples

## 🆘 Troubleshooting

### Common Issues

**1. AI Service Errors**
```bash
# Check if API key is set
echo $GEMINI_API_KEY

# Test AI connectivity
curl http://localhost:3000/health

# Check AI service status specifically
curl http://localhost:3000/health/metrics | jq '.data.environment.has_ai_key'
```

**2. CSV Upload Issues**
- Ensure CSV has all required columns: `name,role,company,industry,location,linkedin_bio`
- Check file size (max 10MB by default)
- Verify CSV format (comma-separated, UTF-8 encoding)
- Test with sample CSV:
```bash
curl -X POST http://localhost:3000/leads/upload \
  -F "file=@sample_leads.csv"
```

**3. Memory Issues**
```bash
# Check system metrics
curl http://localhost:3000/health/metrics

# Monitor memory usage
curl http://localhost:3000/health | jq '.data.checks.memory'
```

**4. Port Already in Use**
```bash
# Use different port
PORT=3001 npm run dev

# Or kill process using the port (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**5. Docker Issues**
```bash
# Check Docker container logs
docker logs lead-scoring-backend

# Test container health
docker exec lead-scoring-backend curl http://localhost:3000/health/live

# Rebuild container
docker-compose down && docker-compose up --build
```

**6. Deployment Issues**
```bash
# Test deployment locally
npm run deploy

# Check deployment health
BASE_URL=https://your-app.onrender.com npm run test:deployment

# Validate environment variables
curl https://your-app.onrender.com/health/metrics
```

### Performance Optimization

**1. Memory Usage**
- Monitor heap usage via `/health/metrics`
- Restart service if memory usage exceeds 90%
- Consider increasing container memory limits

**2. AI Service Optimization**
- Implement request caching for repeated analyses
- Use batch processing for large lead sets
- Monitor AI service response times

**3. File Upload Optimization**
- Process CSV files in streams for large datasets
- Implement file size validation before processing
- Use compression for large file transfers

### Getting Help

1. **Health Checks**: `GET /health` for comprehensive system status
2. **Logs**: Check application logs for detailed error information
3. **Environment**: Verify all required environment variables are set
4. **Prerequisites**: Ensure Node.js 18+, valid API keys, and proper network access
5. **Documentation**: Review API documentation and examples
6. **Testing**: Use provided Postman collection for endpoint testing

### Debug Mode

Enable debug logging for troubleshooting:
```bash
LOG_LEVEL=debug npm run dev
```

Or with Docker:
```bash
docker run -e LOG_LEVEL=debug -p 3000:3000 lead-scoring-api
```

---

**Built with ❤️ for production-ready lead scoring and qualification**