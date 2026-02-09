import { GameState } from '../types'
import './GoalBar.css'

interface GoalBarProps {
  gameState: GameState
}

const GoalBar = ({ gameState }: GoalBarProps) => {
  return (
    <div className="goal-bar">
      <div className="goal-text">
        Goal: Help the child make safe choices
      </div>
      <div className="goal-indicators">
        <div className="stars-container">
          <span className="label">Stars:</span>
          {[1, 2, 3].map((i) => (
            <span key={i} className="star">
              {i <= gameState.stars ? '⭐' : '☆'}
            </span>
          ))}
        </div>
        <div className="strikes-container">
          <span className="label">Strikes:</span>
          {[1, 2, 3].map((i) => (
            <span key={i} className="strike">
              {i <= gameState.strikes ? '❌' : ' '}
            </span>
          ))}
        </div>
      </div>
      {gameState.ended && (
        <div className={`end-message ${gameState.endType}`}>
          {gameState.endType === 'success' 
            ? 'You protected the child' 
            : gameState.endType === 'failure'
            ? 'The child clicked the link'
            : 'Game Over'}
        </div>
      )}
    </div>
  )
}

export default GoalBar
