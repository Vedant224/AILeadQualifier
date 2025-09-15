# Lead Scoring Backend API

A backend service for lead qualification that combines rule-based scoring with AI-powered intent analysis. This service accepts product/offer information and lead data via CSV upload, then scores each lead's buying intent using a hybrid approach of deterministic rules and AI reasoning.

## 🚀 Features

- **RESTful API** for offer management and lead processing
- **Rule-based scoring** with configurable point allocation
- **AI-powered intent analysis** using Google Gemini
- **CSV upload and processing** for bulk lead management
- **Results export** in JSON and CSV formats
- **Comprehensive error handling** and validation
- **TypeScript** for type safety and better development experience

## 📋 Requirements

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Google Gemini API key

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lead-scoring-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   MAX_FILE_SIZE=10485760
   MAX_LEADS_PER_UPLOAD=1000
   LOG_LEVEL=info
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Health Check
```bash
GET /health
```

### Root Information
```bash
GET /
```

## 🏗️ Project Structure

```
src/
├── controllers/     # Express route controllers
├── services/        # Business logic services
├── models/          # TypeScript interfaces and types
├── utils/           # Utility functions and helpers
└── server.ts        # Main server entry point
```

## 🧪 Development

- **Development server**: `npm run dev`
- **Build**: `npm run build`
- **Start production**: `npm start`
- **Run tests**: `npm test`
- **Lint code**: `npm run lint`

## 📝 License

MIT License - see LICENSE file for details

---

**Note**: This is a hiring assignment project demonstrating backend API development, AI integration, and clean code practices.