import { useState, useEffect, useRef } from 'react'
import { GameState, LLMResponse } from '../types'
import GoalBar from './GoalBar'
import './ChatPanel.css'

interface ChatPanelProps {
  gameState: GameState
  onSendMessage: (message: string) => Promise<LLMResponse>
}

interface Message {
  id: string
  text: string
  sender: 'user' | 'kid'
  timestamp: number
}

const ChatPanel = ({ gameState, onSendMessage }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 生成建议回复（实际应该由LLM提供）
  useEffect(() => {
    if (gameState.ended) {
      setSuggestedReplies([])
      return
    }
    
    const suggestions = [
      "不要点击那个链接，可能有危险",
      "应该先问问大人",
      "那个链接看起来不安全",
      "我们可以做其他有趣的事情",
    ]
    setSuggestedReplies(suggestions.slice(0, 3))
  }, [messages, gameState.ended])

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue.trim()
    if (!messageText || isLoading || gameState.ended || gameState.round > 5) return

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await onSendMessage(messageText)
      
      // 添加孩子的回复
      const kidMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.kid_reply,
        sender: 'kid',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, kidMessage])
    } catch (error) {
      console.error('发送消息失败:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '抱歉，出现了错误，请重试。',
        sender: 'kid',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-panel">
      <GoalBar gameState={gameState} />
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>和孩子对话，帮助他们做出安全的选择。</p>
            <p>Round: {gameState.round} / 5</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user-message' : 'kid-message'}`}
          >
            <div className="message-content">
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message kid-message">
            <div className="message-content loading">
              <span>...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="suggested-replies">
        {suggestedReplies.map((suggestion, index) => (
          <button
            key={index}
            className="suggestion-button"
            onClick={() => handleSend(suggestion)}
            disabled={isLoading || gameState.ended || gameState.round > 5}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="chat-input-container">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={gameState.ended || gameState.round > 5 ? "游戏已结束" : "输入消息..."}
          disabled={isLoading || gameState.ended || gameState.round > 5}
        />
        <button
          className="send-button"
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isLoading || gameState.ended || gameState.round > 5}
        >
          发送
        </button>
      </div>
      <div className="round-indicator">
        Round: {gameState.round} / 5
      </div>
    </div>
  )
}

export default ChatPanel
