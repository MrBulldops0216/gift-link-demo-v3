import { useState, useEffect } from 'react'
import { GameState, LLMResponse, Emotion } from './types'
import VideoBackground from './components/VideoBackground'
import ChatPanel from './components/ChatPanel'
import ThoughtBubble from './components/ThoughtBubble'
import './App.css'

const INITIAL_STATE: GameState = {
  round: 1,
  stars: 0,
  strikes: 0,
  ended: false,
}

const EMOTION_VIDEO_MAP: Record<Emotion, string> = {
  good: '/assets/animate/kid_good.mp4',
  confused: '/assets/animate/kid_confused.mp4',
  sad: '/assets/animate/kid_sad.mp4',
  neutral: '/assets/animate/kid_base.mp4',
}

function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE)
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>("neutral")
  const [currentVideo, setCurrentVideo] = useState<string>('/assets/animate/kid_base.mp4')
  const [thoughtText, setThoughtText] = useState<string>("")
  const [showThought, setShowThought] = useState<boolean>(false)
  const [chatVisible, setChatVisible] = useState<boolean>(false)
  const [videoVisible, setVideoVisible] = useState<boolean>(false)

  // 初始动画：聊天面板先淡入，600ms后视频淡入
  useEffect(() => {
    setChatVisible(true)
    const timer = setTimeout(() => {
      setVideoVisible(true)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // 模拟LLM调用（实际项目中应该替换为真实的API调用）
  const callLLM = async (userMessage: string): Promise<LLMResponse> => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:41',message:'callLLM called',data:{userMessage,gameState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:45',message:'Calling API /api/llm',data:{round:gameState.round,stars:gameState.stars,strikes:gameState.strikes,adult_message:userMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          round: gameState.round,
          stars: gameState.stars,
          strikes: gameState.strikes,
          history: [],
          adult_message: userMessage,
        }),
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:60',message:'API response received',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      if (!response.ok) {
        // #region agent log
        const errorText = await response.text();
        fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:65',message:'API error response',data:{status:response.status,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:72',message:'API response data parsed',data:{hasKidReply:!!data.kid_reply,hasEmotion:!!data.emotion,hasThought:!!data.thought,hasIsPositive:data.is_positive!==undefined,dataKeys:Object.keys(data)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Transform backend response to frontend format
      return {
        kid_reply: data.child_reply || data.kid_reply || '',
        emotion: data.emotion_label || data.emotion || 'neutral',
        thought: data.thought_bubble || data.thought || '',
        is_positive: data.is_positive !== undefined ? data.is_positive : (data.intervention_evaluation?.explanation_vs_command === 1 || data.intervention_evaluation?.emotional_stabilization === 1),
      };
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:82',message:'API call failed',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Fallback to mock data if API fails
      const isPositive = userMessage.toLowerCase().includes('不要') || 
                        userMessage.toLowerCase().includes('别') ||
                        userMessage.toLowerCase().includes('危险') ||
                        userMessage.toLowerCase().includes('安全') ||
                        userMessage.toLowerCase().includes("don't") ||
                        userMessage.toLowerCase().includes('safe');
      
      const emotions: Emotion[] = isPositive ? ["good", "neutral"] : ["confused", "sad"];
      const emotion = emotions[Math.floor(Math.random() * emotions.length)];
      
      return {
        kid_reply: isPositive 
          ? "好的，我会注意的。谢谢你提醒我！"
          : "但是我很好奇，想看看里面是什么...",
        emotion,
        thought: isPositive
          ? "他们说得对，我应该小心。"
          : "也许点开看看也没什么关系？",
        is_positive: isPositive
      };
    }
  }

  const handleSendMessage = async (message: string): Promise<LLMResponse> => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:67',message:'handleSendMessage called',data:{message,gameState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    if (gameState.ended || gameState.round > 5) {
      throw new Error('游戏已结束')
    }

    try {
      const response = await callLLM(message)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:75',message:'callLLM returned',data:{hasKidReply:!!response.kid_reply,emotion:response.emotion,isPositive:response.is_positive},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      // 计算新的游戏状态
      const newStars = response.is_positive ? gameState.stars + 1 : gameState.stars
      const newStrikes = !response.is_positive ? gameState.strikes + 1 : gameState.strikes
      const newRound = gameState.round + 1
      
      // 根据游戏状态决定视频
      if (newStars >= 3) {
        setCurrentVideo('/assets/animate/kid_close.mp4')
      } else if (newStrikes >= 3) {
        setCurrentVideo('/assets/animate/kid_open.mp4')
      } else {
        // 切换视频
        const videoPath = EMOTION_VIDEO_MAP[response.emotion]
        setCurrentVideo(videoPath)
        setCurrentEmotion(response.emotion)
      }
      
      // 更新游戏状态
      setGameState(prev => {
        let ended = false
        let endType: "success" | "failure" | undefined = undefined
        
        if (newStars >= 3) {
          ended = true
          endType = "success"
        } else if (newStrikes >= 3) {
          ended = true
          endType = "failure"
        } else if (newRound > 5) {
          ended = true
        }
        
        return {
          round: newRound,
          stars: newStars,
          strikes: newStrikes,
          ended,
          endType
        }
      })
      
      // 显示思考气泡
      setThoughtText(response.thought)
      setShowThought(true)
      setTimeout(() => {
        setShowThought(false)
      }, 3000)
      
      // 返回响应以便聊天面板显示
      return response
    } catch (error) {
      console.error('LLM调用失败:', error)
      throw error
    }
  }

  return (
    <div className="app-container">
      <div className={`video-container ${videoVisible ? 'visible' : ''}`}>
        <VideoBackground 
          videoSrc={currentVideo}
        />
        {showThought && (
          <ThoughtBubble text={thoughtText} />
        )}
      </div>
      <div className={`chat-container ${chatVisible ? 'visible' : ''}`}>
        <ChatPanel
          gameState={gameState}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  )
}

export default App
