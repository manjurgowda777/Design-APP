import React, { useEffect, useState, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Tv,
  Server,
  RotateCcw,
} from 'lucide-react';
import type { WalkthroughStep } from '../utils/walkthroughEngine';

interface PresentationBarProps {
  steps: WalkthroughStep[];
  currentStepIndex: number;
  onSelectStepIndex: (index: number) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onExit: () => void;
  onRestart: () => void;
}

export const PresentationBar: React.FC<PresentationBarProps> = ({
  steps,
  currentStepIndex,
  onSelectStepIndex,
  onNextStep,
  onPrevStep,
  onExit,
  onRestart,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      return;
    }

    playTimerRef.current = setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        onNextStep();
      } else {
        // Stop playing at last step
        setIsPlaying(false);
      }
    }, 4500);

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, currentStepIndex, steps.length, onNextStep]);

  // Global keybindings during presentation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (!isLastStep) onNextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!isFirstStep) onPrevStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstStep, isLastStep, onNextStep, onPrevStep, onExit]);

  if (!currentStep) return null;

  return (
    <div className="presentation-overlay-wrapper">
      {/* Top Floating Exit & Header Pill */}
      <div className="presentation-top-bar">
        <div className="presentation-brand-pill">
          <Tv size={15} color="#38bdf8" />
          <span className="brand-text">Interactive Request Walkthrough</span>
          <span className="step-counter-badge">
            {currentStepIndex + 1} / {steps.length}
          </span>
        </div>

        <button
          className="presentation-exit-btn"
          onClick={onExit}
          title="Exit Presentation Mode (Esc)"
          aria-label="Exit Presentation"
        >
          <span>Exit</span>
          <kbd className="esc-key">Esc</kbd>
        </button>
      </div>

      {/* Bottom Main Controller Dock */}
      <div className="presentation-dock-container">
        {/* Step Progress Track */}
        <div className="presentation-progress-track">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              className={`progress-step-dot ${idx === currentStepIndex ? 'active' : idx < currentStepIndex ? 'completed' : ''}`}
              onClick={() => onSelectStepIndex(idx)}
              title={`Step ${idx + 1}: ${step.title}`}
              aria-label={`Jump to Step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Content & Narrative Card */}
        <div className="presentation-dock-body">
          {/* Left Column: Metadata & Title */}
          <div className="dock-meta-col">
            <div className="dock-badges-row">
              <span className="dock-step-pill">
                STEP {currentStep.stepNumber}
              </span>
              <span className="dock-category-pill">
                {currentStep.categoryTag}
              </span>
              {currentStep.environment && (
                <span className="dock-env-pill">
                  {currentStep.environment.toUpperCase()}
                </span>
              )}
            </div>

            <div className="dock-title-group">
              <h3 className="dock-component-title">{currentStep.title}</h3>
              {currentStep.subtitle && (
                <span className="dock-component-subtitle">
                  {currentStep.subtitle}
                </span>
              )}
            </div>

            {(currentStep.techStack || currentStep.port) && (
              <div className="dock-specs-row">
                {currentStep.techStack && (
                  <span className="dock-spec-item tech">
                    <Server size={12} />
                    <span>{currentStep.techStack}</span>
                  </span>
                )}
                {currentStep.port && (
                  <span className="dock-spec-item port">
                    <span>{currentStep.port}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Center Column: Narrative Description */}
          <div className="dock-narrative-col">
            <span className="dock-narrative-label">Request Flow Narrative</span>
            <p className="dock-narrative-text">{currentStep.description}</p>
          </div>

          {/* Right Column: Playback Controls */}
          <div className="dock-controls-col">
            <button
              type="button"
              className="dock-ctrl-btn prev-btn"
              onClick={onPrevStep}
              disabled={isFirstStep}
              title="Previous Step (Left Arrow)"
              aria-label="Previous Step"
            >
              <ChevronLeft size={18} />
              <span className="ctrl-label">Prev</span>
            </button>

            <button
              type="button"
              className={`dock-ctrl-btn play-btn ${isPlaying ? 'playing' : ''}`}
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Auto-Play' : 'Auto-Play Presentation (4.5s/step)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
            </button>

            {isLastStep ? (
              <button
                type="button"
                className="dock-ctrl-btn restart-btn"
                onClick={onRestart}
                title="Restart Presentation from Step 1"
                aria-label="Restart Presentation"
              >
                <RotateCcw size={16} />
                <span className="ctrl-label">Replay</span>
              </button>
            ) : (
              <button
                type="button"
                className="dock-ctrl-btn next-btn"
                onClick={onNextStep}
                title="Next Step (Right Arrow / Space)"
                aria-label="Next Step"
              >
                <span className="ctrl-label">Next</span>
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
