# KrishiSahAI: Advanced Agricultural Intelligence Platform

KrishiSahAI is a comprehensive full-stack platform designed to empower farmers with modern technology. It integrates artificial intelligence, real-time data analysis, and expert agricultural knowledge to provide actionable insights for crop care, pest management, and farming best practices.

## Core Features

- **AI Agricultural Assistant**: An intelligent chatbot powered by generative AI and Ollama for natural language interaction, capable of answering agricultural queries and providing detailed crop roadmaps.
- **Advanced Diagnostics**:
  - **Disease Detection**: Image-based analysis using TensorFlow/YOLO to identify crop diseases from leaf photographs.
  - **Pest Detection**: Specialized computer vision models for identifying specific agricultural pests.
- **Personalized News Service**: Location and crop-specific agricultural news feed using a tiered fallback strategy for maximum relevance.
- **Profile Management**: Secure user authentication and profile storage via Firebase, allowing for personalized experiences and data persistence.
- **Multi-language Support**: Interface supporting major Indian languages to ensure accessibility for diverse farming communities.

## Technology Stack

### Frontend
- **Framework**: React 19 with Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Modern, Responsive Design)
- **State Management**: React Hooks
- **Icons**: Lucide React
- **PDF Generation**: jsPDF and html2canvas

### Backend
- **Framework**: Flask (Python)
- **AI/ML**: TensorFlow, LangChain, Ollama
- **Database & Auth**: Firebase (Firebase Admin SDK)
- **Environment**: Python Dotenv for configuration

## Project Structure

```text
.
├── Backend/                 # Flask server, AI services, and ML models
│   ├── services/            # Core logic for PDF, News, and AI processing
│   ├── app.py               # Main API entry point
│   └── requirements.txt     # Backend dependencies
├── Frontend/                # React application
│   ├── src/                 # Component and logic source code
│   │   ├── components/      # Reusable UI elements
│   │   ├── pages/           # Individual application views
│   │   └── services/        # API communication layers
│   └── package.json         # Frontend dependencies
└── firebase.json            # Firebase configuration
```

## Setup and Installation

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.9 or higher)
- Ollama (running locally)
- Firebase Account and Project

### Backend Setup
1. Navigate to the `Backend` directory.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in a `.env` file (see Configuration section).
5. Start the Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Navigate to the `Frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Configuration

The application requires specific environment variables and service configurations:

### Firebase
Ensure you have a `serviceAccountKey.json` for the Backend and valid Firebase configuration constants in the Frontend `firebase.ts` file.

### Environment Variables (.env)
Required keys in the `Backend/.env` file:
- `GEMINI_API_KEY`: API key for Google Generative AI components.
- `FIREBASE_PROJECT_ID`: Your Firebase project identifier.
- `OLLAMA_BASE_URL`: (Optional) URL for a remote Ollama instance.

## Roadmap and Future Enhancements

- **Offline Mode**: Integration of lightweight models for offline disease detection.
- **Market Price Integration**: Real-time mandi price tracking for various crops.
- **Satellite Analytics**: Integration of geospatial data for soil health monitoring.
- **IoT Support**: Connectivity with smart farm sensors for real-time irrigation and soil data.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
