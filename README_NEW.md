# Child Safety Intervention Game

A web-based experimental game demo for child online safety intervention.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Place video files:**
   Place your video files in `./assets/motion/`:
   - `kid_base.mp4` (default/idle loop)
   - `kid_good.mp4` (positive reaction)
   - `kid_confused.mp4` (confused state)
   - `kid_sad.mp4` (sad state)
   - `kid_open.mp4` (failure ending: child clicks/popup opens)
   - `kid_close.mp4` (success ending: popup closes)
   
   All videos should be 16:9 aspect ratio.

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.1-8b-instant
   GROQ_BASE_URL=https://api.groq.com/openai/v1
   PORT=5050
   ```
   
   Note: If `GROQ_API_KEY` is not set, the app will use fallback responses.

4. **Run the server:**
   ```bash
   npm start
   ```
   
   The app will be available at `http://localhost:5050`

## How to Play

1. The chat panel appears first, then the video background fades in after 600ms.
2. Type a message or click a suggested reply to help the child make safe choices.
3. Watch the child's reactions and thought bubbles.
4. Track your progress with stars (⭐) and strikes (❌).
5. Game ends when:
   - You reach 3 stars (success)
   - You reach 3 strikes (failure)
   - After 5 rounds (compare stars vs strikes)

## Features

- **Video Background System**: Dynamic video switching based on child's emotional state
- **Chat Interface**: Real-time conversation with suggested replies
- **Thought Bubbles**: Shows child's inner thoughts
- **Progress Tracking**: Visual indicators for stars and strikes
- **LLM Integration**: Uses Groq API for intelligent responses
- **Debug Panel**: Click "Debug" button to view game state and LLM responses

## Technical Details

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **LLM**: Groq API (OpenAI-compatible)
- **Port**: 5050 (configurable via PORT env var)

## API Endpoints

- `POST /api/llm` - Generate child response
- `GET /api/health` - Health check
