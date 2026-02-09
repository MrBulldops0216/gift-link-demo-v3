import { useEffect, useState } from 'react'
import './ThoughtBubble.css'

interface ThoughtBubbleProps {
  text: string
}

const ThoughtBubble = ({ text }: ThoughtBubbleProps) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 触发淡入动画
    setTimeout(() => setVisible(true), 10)
  }, [text])

  return (
    <div className={`thought-bubble ${visible ? 'visible' : ''}`}>
      <div className="thought-bubble-content">
        {text}
      </div>
      <div className="thought-bubble-tail"></div>
    </div>
  )
}

export default ThoughtBubble
