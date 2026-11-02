import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Zap,
  DollarSign,
  FileText,
  LayoutTemplate,
  Image,
  ArrowRight,
  Crown,
} from 'lucide-react';
import {
  PRO_FEATURES_CATALOG,
  setUserTier,
} from '../utils/tierManager';
import type { ProFeature, UserTier } from '../utils/tierManager';

interface UpgradeToProModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFeature?: ProFeature | null;
  onTierChange: (tier: UserTier) => void;
}

export const UpgradeToProModal: React.FC<UpgradeToProModalProps> = ({
  isOpen,
  onClose,
  targetFeature,
  onTierChange,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  if (!isOpen) return null;

  const highlightedFeature = targetFeature ? PRO_FEATURES_CATALOG[targetFeature] : null;

  const handleSimulateUpgrade = () => {
    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      setUpgradeSuccess(true);
      setUserTier('pro');
      onTierChange('pro');
      setTimeout(() => {
        setUpgradeSuccess(false);
        onClose();
      }, 1500);
    }, 800);
  };

  const handleDevInstantUnlock = () => {
    setUserTier('pro');
    onTierChange('pro');
    onClose();
  };

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'file-text':
        return <FileText size={18} color="#38bdf8" />;
      case 'dollar-sign':
        return <DollarSign size={18} color="#10b981" />;
      case 'layout-template':
        return <LayoutTemplate size={18} color="#a855f7" />;
      case 'image':
        return <Image size={18} color="#f59e0b" />;
      default:
        return <Zap size={18} color="#38bdf8" />;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container upgrade-pro-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header upgrade-modal-header">
          <div className="modal-title-group">
            <div className="upgrade-crown-badge">
              <Crown size={22} className="crown-icon" />
            </div>
            <div>
              <div className="upgrade-tagline">
                <span className="pro-gradient-text">ARCHITECTURE WHITEBOARD PRO</span>
                <span className="pro-pill-badge">PRO PLAN</span>
              </div>
              <h2 id="upgrade-modal-title" className="modal-title upgrade-title">
                Unlock Enterprise Architectural Superpowers
              </h2>
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
        <div className="modal-body upgrade-modal-body">
          {/* Target Feature Notice Banner */}
          {highlightedFeature && (
            <div className="upgrade-highlight-banner">
              <div className="highlight-icon-box">
                {getFeatureIcon(highlightedFeature.iconName)}
              </div>
              <div className="highlight-info">
                <span className="highlight-pretitle">Locked Feature:</span>
                <h4 className="highlight-title">{highlightedFeature.title}</h4>
                <p className="highlight-desc">{highlightedFeature.tagline}</p>
              </div>
            </div>
          )}

          {/* Value Proposition Cards Grid */}
          <div className="pro-features-grid">
            {Object.values(PRO_FEATURES_CATALOG).map((feat) => {
              const isTargeted = targetFeature === feat.id;
              return (
                <div
                  key={feat.id}
                  className={`pro-feature-card ${isTargeted ? 'targeted-feature' : ''}`}
                >
                  <div className="feature-card-header">
                    <div className="feature-icon-wrapper">
                      {getFeatureIcon(feat.iconName)}
                    </div>
                    {isTargeted && (
                      <span className="feature-requested-pill">Requested</span>
                    )}
                  </div>
                  <h4 className="feature-card-title">{feat.title}</h4>
                  <p className="feature-card-desc">{feat.description}</p>
                </div>
              );
            })}
          </div>

          {/* Pricing & Billing Box */}
          <div className="upgrade-pricing-card">
            <div className="pricing-header">
              <div className="billing-cycle-toggle">
                <button
                  type="button"
                  className={`cycle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`cycle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('yearly')}
                >
                  Yearly <span className="save-tag">SAVE 30%</span>
                </button>
              </div>

              <div className="price-display">
                <span className="price-amount">
                  {billingCycle === 'yearly' ? '$9' : '$14'}
                </span>
                <span className="price-period">/ month billed {billingCycle}</span>
              </div>
            </div>

            <ul className="pricing-perks-list">
              <li>
                <CheckCircle2 size={15} color="#10b981" />
                <span>Full unlimited access to Cloud Cost live calculations</span>
              </li>
              <li>
                <CheckCircle2 size={15} color="#10b981" />
                <span>Pre-built enterprise blueprints (3-Tier, Microservices, AI RAG)</span>
              </li>
              <li>
                <CheckCircle2 size={15} color="#10b981" />
                <span>Architecture Decision Record (ADR Markdown) export</span>
              </li>
              <li>
                <CheckCircle2 size={15} color="#10b981" />
                <span>4K Ultra-HD raster & print-ready vector PDF exports</span>
              </li>
            </ul>
          </div>

          {/* Upgrade Success Notification */}
          {upgradeSuccess && (
            <div className="upgrade-success-banner" role="status">
              <Sparkles size={18} color="#34d399" />
              <span>Welcome to Pro! All features are now unlocked.</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer upgrade-modal-footer">
          <div className="upgrade-footer-left">
            <button
              type="button"
              className="dev-unlock-link"
              onClick={handleDevInstantUnlock}
              title="Dev Mode: Instantly switch to Pro tier for local testing"
            >
              <Zap size={13} color="#f59e0b" />
              <span>Dev Mode: Instant Pro Unlock</span>
            </button>
          </div>

          <div className="upgrade-footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubscribing}
            >
              Maybe Later
            </button>
            <button
              id="upgrade-subscribe-btn"
              type="button"
              className="btn btn-primary upgrade-subscribe-btn"
              onClick={handleSimulateUpgrade}
              disabled={isSubscribing || upgradeSuccess}
            >
              {isSubscribing ? (
                <>
                  <div className="ai-loading-spinner" />
                  <span>Activating Pro Pass...</span>
                </>
              ) : upgradeSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Pro Activated!</span>
                </>
              ) : (
                <>
                  <Crown size={16} />
                  <span>Upgrade to Pro Now</span>
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
