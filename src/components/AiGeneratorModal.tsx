import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Key,
  ArrowRight,
  PlusCircle,
  RotateCcw,
  Zap,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  generateAiDiagram,
  getSavedAiSettings,
  saveAiSettings,
} from '../utils/aiDiagramGenerator';
import type {
  AiProvider,
  GeneratedDiagramResult,
} from '../utils/aiDiagramGenerator';
import type { NodeElement } from '../types/canvas';

interface AiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNodes: NodeElement[];
  onDiagramGenerated: (
    result: GeneratedDiagramResult,
    mode: 'append' | 'replace'
  ) => void;
}

const QUICK_PROMPTS = [
  {
    title: 'E-Commerce with Stripe & Redis',
    prompt:
      'E-commerce storefront with Stripe webhook API gateway, Go order service, Redis catalog cache, and Postgres DB.',
    icon: '🛍️',
  },
  {
    title: 'Microservices with Kafka',
    prompt:
      'Distributed event-driven microservices with Envoy Gateway, Auth Service, Kafka topic queue, worker consumer, and event store.',
    icon: '⚡',
  },
  {
    title: 'AI/ML RAG Pipeline',
    prompt:
      'AI chatbot with FastAPI gateway, Pinecone vector search database, LLM inference cluster, and Celery task queue.',
    icon: '🧠',
  },
  {
    title: 'Offline-First Mobile App',
    prompt:
      'Offline-first Flutter mobile client with Couchbase sync gateway, synchronization resolution service, and MongoDB cloud store.',
    icon: '📱',
  },
  {
    title: '3-Tier Web Application',
    prompt:
      'Classic 3-tier web app with React browser client, NGINX load balancer, Node.js API service, Redis cache, and PostgreSQL database.',
    icon: '🌐',
  },
];

export const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({
  isOpen,
  onClose,
  existingNodes,
  onDiagramGenerated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<AiProvider>('instant');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<string | null>(null);

  // Load saved settings on mount
  useEffect(() => {
    const saved = getSavedAiSettings();
    setProvider(saved.provider);
    setApiKey(saved.apiKey);
    if (saved.apiKey) {
      setShowKeyInput(true);
    }
  }, []);

  // Save settings when provider or apiKey changes
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    saveAiSettings({ provider, apiKey: key });
  };

  const handleProviderChange = (newProvider: AiProvider) => {
    setProvider(newProvider);
    saveAiSettings({ provider: newProvider, apiKey });
    if (newProvider !== 'instant') {
      setShowKeyInput(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMessage('Please describe the architecture you want to generate.');
      return;
    }

    if (provider !== 'instant' && !apiKey.trim()) {
      setErrorMessage(
        `Please enter an API key for ${provider.toUpperCase()}, or switch to "Instant Smart Generator" mode.`
      );
      setShowKeyInput(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessSummary(null);

    try {
      const result = await generateAiDiagram({
        prompt: prompt.trim(),
        provider,
        apiKey: apiKey.trim(),
        existingNodes: mode === 'append' ? existingNodes : [],
      });

      setSuccessSummary(result.summary);
      setTimeout(() => {
        onDiagramGenerated(result, mode);
        onClose();
        setIsLoading(false);
        setSuccessSummary(null);
      }, 600);
    } catch (err: any) {
      console.error('AI Generation Failed:', err);
      setErrorMessage(err.message || 'Failed to generate diagram. Please check your API key or network.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container ai-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="ai-modal-badge">
              <Sparkles size={20} className="ai-sparkle-icon" />
            </div>
            <div>
              <h2 id="ai-modal-title" className="modal-title">
                AI Prompt to Architecture
              </h2>
              <p className="modal-subtitle">
                Describe your system in plain English — AI will generate shapes, connections, and metadata.
              </p>
            </div>
          </div>

          <button
            className="modal-close-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body ai-modal-body">
          {/* Prompt Description Area */}
          <div className="ai-input-section">
            <label className="ai-field-label" htmlFor="ai-prompt-input">
              <span>Architecture Description</span>
              <span className="ai-label-hint">Be specific about databases, services, or protocols</span>
            </label>
            <textarea
              id="ai-prompt-input"
              className="ai-prompt-textarea"
              rows={4}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. Real-time food delivery backend with mobile client, Kong API Gateway, microservices communicating over Kafka, Redis caching driver locations, and Postgres store..."
              autoFocus
            />
          </div>

          {/* Quick Prompt Chips */}
          <div className="ai-quick-chips-section">
            <span className="ai-chips-label">Quick Starters:</span>
            <div className="ai-chips-container">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="ai-quick-chip"
                  onClick={() => {
                    setPrompt(item.prompt);
                    if (errorMessage) setErrorMessage(null);
                  }}
                >
                  <span className="chip-icon">{item.icon}</span>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Provider & Generation Engine Selector */}
          <div className="ai-engine-row">
            <div className="ai-provider-select-group">
              <label className="ai-field-label">Engine Provider</label>
              <div className="ai-provider-pill" role="group">
                <button
                  type="button"
                  className={`ai-provider-btn ${provider === 'instant' ? 'active' : ''}`}
                  onClick={() => handleProviderChange('instant')}
                  title="Zero-configuration instant smart architecture synthesizer (No API key needed)"
                >
                  <Zap size={14} color="#f59e0b" />
                  <span>Instant Smart</span>
                </button>
                <button
                  type="button"
                  className={`ai-provider-btn ${provider === 'gemini' ? 'active' : ''}`}
                  onClick={() => handleProviderChange('gemini')}
                  title="Google Gemini 1.5/2.5 Flash API"
                >
                  <Sparkles size={14} color="#38bdf8" />
                  <span>Gemini</span>
                </button>
                <button
                  type="button"
                  className={`ai-provider-btn ${provider === 'openai' ? 'active' : ''}`}
                  onClick={() => handleProviderChange('openai')}
                  title="OpenAI GPT-4o-mini API"
                >
                  <Bot size={14} color="#10b981" />
                  <span>OpenAI</span>
                </button>
              </div>
            </div>

            {/* Insertion Mode */}
            <div className="ai-mode-select-group">
              <label className="ai-field-label">Canvas Action</label>
              <div className="ai-provider-pill" role="group">
                <button
                  type="button"
                  className={`ai-provider-btn ${mode === 'append' ? 'active' : ''}`}
                  onClick={() => setMode('append')}
                  title="Add new cluster below existing canvas components"
                >
                  <PlusCircle size={14} />
                  <span>Append</span>
                </button>
                <button
                  type="button"
                  className={`ai-provider-btn ${mode === 'replace' ? 'active' : ''}`}
                  onClick={() => setMode('replace')}
                  title="Replace canvas with newly generated architecture"
                >
                  <RotateCcw size={14} />
                  <span>Replace</span>
                </button>
              </div>
            </div>
          </div>

          {/* Optional API Key Input */}
          {(showKeyInput || provider !== 'instant') && (
            <div className="ai-api-key-section">
              <div className="ai-key-header">
                <label className="ai-field-label" htmlFor="ai-api-key-input">
                  <Key size={13} className="inline-icon" />
                  <span>{provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}</span>
                </label>
                <span className="ai-key-storage-note">Saved locally in browser localStorage</span>
              </div>
              <input
                id="ai-api-key-input"
                type="password"
                className="ai-key-input"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={
                  provider === 'gemini'
                    ? 'AIzaSy...'
                    : 'sk-proj-...'
                }
              />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="ai-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Summary */}
          {successSummary && (
            <div className="ai-success-banner" role="status">
              <Check size={16} />
              <span>{successSummary}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer ai-modal-footer">
          <div className="ai-footer-left">
            {!showKeyInput && provider === 'instant' && (
              <button
                type="button"
                className="ai-link-btn"
                onClick={() => setShowKeyInput(true)}
              >
                <Key size={13} />
                <span>Custom API Key</span>
              </button>
            )}
          </div>

          <div className="ai-footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              id="ai-generate-submit-btn"
              type="button"
              className="btn btn-primary ai-submit-btn"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <>
                  <div className="ai-loading-spinner" />
                  <span>Synthesizing Topology...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate Architecture</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
