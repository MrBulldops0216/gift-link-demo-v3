import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import './VideoBackground.css'

interface VideoBackgroundProps {
  videoSrc: string
}

export interface VideoBackgroundHandle {
  play: () => void
  pause: () => void
}

const VideoBackground = forwardRef<VideoBackgroundHandle, VideoBackgroundProps>(
  ({ videoSrc }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useImperativeHandle(ref, () => ({
      play: () => {
        videoRef.current?.play()
      },
      pause: () => {
        videoRef.current?.pause()
      },
    }))

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      // 当视频源改变时，重新加载并播放
      video.load()
      video.play().catch(error => {
        console.error('视频播放失败:', error)
      })

      // 视频结束时循环播放（除了结束动画）
      const handleEnded = () => {
        if (videoSrc.includes('kid_close') || videoSrc.includes('kid_open')) {
          // 结束动画只播放一次
          return
        }
        video.currentTime = 0
        video.play().catch(error => {
          console.error('视频循环播放失败:', error)
        })
      }

      video.addEventListener('ended', handleEnded)
      return () => {
        video.removeEventListener('ended', handleEnded)
      }
    }, [videoSrc])

    return (
      <div className="video-background">
        <video
          ref={videoRef}
          className="video-element"
          src={videoSrc}
          autoPlay
          muted
          loop={!videoSrc.includes('kid_close') && !videoSrc.includes('kid_open')}
          playsInline
        />
      </div>
    )
  }
)

VideoBackground.displayName = 'VideoBackground'

export default VideoBackground
