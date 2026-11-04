import React, { useState, useMemo } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  DollarSign,
  Crosshair,
  TrendingDown,
} from 'lucide-react';
import type { NodeElement, ArrowElement } from '../types/canvas';
import { auditArchitectureGraph } from '../utils/architectureLinter';
import { estimateArchitectureCost } from '../utils/costEstimator';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeElement[];
  arrows: ArrowElement[];
  onHighlightNode: (nodeId: string) => void;
  initialTab?: 'audit' | 'cost';
}

export const AuditModal: React.FC<AuditModalProps> = ({
  isOpen,
  onClose,
  nodes,
  arrows,
  onHighlightNode,
  initialTab = 'audit',
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'cost'>(initialTab);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'notice'>('all');

  // Compute live audit report
  const auditReport = useMemo(() => {
    return auditArchitectureGraph(nodes, arrows);
  }, [nodes, arrows]);

  // Compute live cost estimates
  const costEstimate = useMemo(() => {
    return estimateArchitectureCost(nodes);
  }, [nodes]);

  if (!isOpen) return null;

  const filteredIssues = auditReport.issues.filter((iss) => {
    if (severityFilter === 'all') return true;
    return iss.severity === severityFilter;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreRating = (score: number) => {
    if (score >= 90) return 'PRODUCTION GRADE';
    if (score >= 80) return 'GOOD HEALTH';
    if (score >= 50) return 'ATTENTION NEEDED';
    return 'CRITICAL VULNERABILITIES';
  };

  const handleHighlight = (nodeId: string) => {
    onHighlightNode(nodeId);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container audit-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header audit-modal-header">
          <div className="modal-title-group">
            <div
              className="audit-modal-badge"
              style={{ borderColor: `${getScoreColor(auditReport.healthScore)}60` }}
            >
              <Shield size={22} color={getScoreColor(auditReport.healthScore)} />
            </div>
            <div>
              <h2 id="audit-modal-title" className="modal-title">
                Architecture Audit & Cost Estimator
              </h2>
              <p className="modal-subtitle">
                Automated graph linter, security inspection, and monthly cloud billing estimation.
              </p>
            </div>
          </div>

          <button
            className="modal-close-btn"
            onClick={onClose}
            title="Close Audit"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="audit-tab-switcher">
          <button
            type="button"
            className={`audit-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <Shield size={15} />
            <span>Architecture Linter & Graph Audit</span>
            {auditReport.issues.length > 0 && (
              <span className="audit-tab-count warning">
                {auditReport.issues.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`audit-tab-btn ${activeTab === 'cost' ? 'active' : ''}`}
            onClick={() => setActiveTab('cost')}
          >
            <DollarSign size={15} />
            <span>Cloud Cost Estimator</span>
            <span className="audit-tab-cost-pill">
              ${costEstimate.totalMonthlyCost.toFixed(2)}/mo
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body audit-modal-body">
          {activeTab === 'audit' ? (
            <div className="audit-content-layout">
              {/* Health Score Hero Card */}
              <div
                className="audit-score-card"
                style={{
                  borderColor: `${getScoreColor(auditReport.healthScore)}40`,
                  background: `radial-gradient(ellipse at top, ${getScoreColor(auditReport.healthScore)}15 0%, rgba(15, 23, 42, 0.7) 100%)`,
                }}
              >
                <div className="audit-score-main">
                  <div
                    className="audit-score-number"
                    style={{ color: getScoreColor(auditReport.healthScore) }}
                  >
                    {auditReport.healthScore}
                    <span className="audit-score-pct">%</span>
                  </div>
                  <div className="audit-score-meta">
                    <span
                      className="audit-score-rating"
                      style={{ color: getScoreColor(auditReport.healthScore) }}
                    >
                      {getScoreRating(auditReport.healthScore)}
                    </span>
                    <span className="audit-score-desc">
                      {auditReport.criticalCount > 0
                        ? `${auditReport.criticalCount} critical vulnerability detected. Immediate remediation recommended.`
                        : auditReport.warningCount > 0
                        ? `${auditReport.warningCount} warning flagged. System exhibits potential bottlenecks.`
                        : 'No critical architectural anti-patterns detected.'}
                    </span>
                  </div>
                </div>

                {/* Metric Summary Counters */}
                <div className="audit-metrics-strip">
                  <button
                    type="button"
                    className={`metric-pill critical ${severityFilter === 'critical' ? 'selected' : ''}`}
                    onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
                  >
                    <ShieldAlert size={14} />
                    <span>{auditReport.criticalCount} Critical</span>
                  </button>
                  <button
                    type="button"
                    className={`metric-pill warning ${severityFilter === 'warning' ? 'selected' : ''}`}
                    onClick={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
                  >
                    <AlertTriangle size={14} />
                    <span>{auditReport.warningCount} Warnings</span>
                  </button>
                  <button
                    type="button"
                    className={`metric-pill notice ${severityFilter === 'notice' ? 'selected' : ''}`}
                    onClick={() => setSeverityFilter(severityFilter === 'notice' ? 'all' : 'notice')}
                  >
                    <Info size={14} />
                    <span>{auditReport.noticeCount} Notices</span>
                  </button>
                  <div className="metric-pill passed">
                    <CheckCircle2 size={14} />
                    <span>{auditReport.passedCount} Passed</span>
                  </div>
                </div>
              </div>

              {/* Issues List */}
              <div className="audit-issues-section">
                <div className="audit-section-header">
                  <span className="audit-section-title">
                    {severityFilter === 'all'
                      ? 'Detected Architecture Findings'
                      : `Filtered Findings (${severityFilter.toUpperCase()})`}
                  </span>
                  <span className="audit-issues-count">
                    {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {filteredIssues.length === 0 ? (
                  <div className="audit-empty-state">
                    <CheckCircle2 size={36} color="#10b981" />
                    <h4>All Checks Clean!</h4>
                    <p>
                      {severityFilter === 'all'
                        ? 'No architecture lint issues detected for the current diagram layout.'
                        : `No findings matching the "${severityFilter}" filter.`}
                    </p>
                  </div>
                ) : (
                  <div className="audit-issues-list">
                    {filteredIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className={`audit-issue-card severity-${issue.severity}`}
                      >
                        <div className="issue-header">
                          <div className="issue-title-group">
                            {issue.severity === 'critical' ? (
                              <ShieldAlert size={16} color="#ef4444" className="issue-icon" />
                            ) : issue.severity === 'warning' ? (
                              <AlertTriangle size={16} color="#f59e0b" className="issue-icon" />
                            ) : (
                              <Info size={16} color="#38bdf8" className="issue-icon" />
                            )}
                            <span className="issue-title">{issue.title}</span>
                          </div>

                          <span className={`issue-severity-tag tag-${issue.severity}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>

                        <p className="issue-description">{issue.description}</p>

                        <div className="issue-recommendation">
                          <span className="rec-label">Remediation:</span> {issue.recommendation}
                        </div>

                        {/* Action Buttons: Highlight Node */}
                        {issue.nodeIds.length > 0 && (
                          <div className="issue-actions">
                            {issue.nodeIds.map((nid) => {
                              const targetNode = nodes.find((n) => n.id === nid);
                              return (
                                <button
                                  key={nid}
                                  type="button"
                                  className="btn-highlight-node"
                                  onClick={() => handleHighlight(nid)}
                                  title={`Focus camera and select "${targetNode?.label || nid}"`}
                                >
                                  <Crosshair size={13} />
                                  <span>Locate: {targetNode?.label || 'Component'}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Passed Validations Strip */}
                {auditReport.passedChecks.length > 0 && (
                  <div className="audit-passed-section">
                    <span className="audit-section-title">Verified Best Practices</span>
                    <div className="audit-passed-list">
                      {auditReport.passedChecks.map((check) => (
                        <div key={check.id} className="audit-passed-item">
                          <CheckCircle2 size={15} color="#10b981" />
                          <div>
                            <span className="passed-title">{check.title}</span>
                            <span className="passed-desc">{check.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Cloud Cost Breakdown Tab */
            <div className="cost-content-layout">
              {/* Cost Summary Header */}
              <div className="cost-summary-card">
                <div className="cost-summary-main">
                  <div>
                    <span className="cost-metric-label">Estimated Monthly Cloud Spend</span>
                    <div className="cost-metric-value">
                      ${costEstimate.totalMonthlyCost.toFixed(2)}
                      <span className="cost-period">/ month</span>
                    </div>
                  </div>
                  <div className="cost-annual-group">
                    <span className="cost-metric-label">Annualized Estimate</span>
                    <span className="cost-annual-value">
                      ${(costEstimate.totalMonthlyCost * 12).toFixed(2)} / yr
                    </span>
                  </div>
                </div>

                <div className="cost-tip-row">
                  <TrendingDown size={14} color="#10b981" />
                  <span>
                    Baseline cloud compute rates based on standard AWS / GCP / Azure provisioned resource tiers.
                  </span>
                </div>
              </div>

              {/* Category Breakdown Cards */}
              <div className="cost-category-grid">
                {costEstimate.categories.map((cat) => (
                  <div
                    key={cat.category}
                    className="cost-category-card"
                    style={{ borderTopColor: cat.color }}
                  >
                    <div className="cat-card-header">
                      <span className="cat-name">{cat.label}</span>
                      <span className="cat-count">
                        {cat.itemCount} item{cat.itemCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="cat-card-cost" style={{ color: cat.color }}>
                      ${cat.totalMonthly.toFixed(2)}
                      <span className="cat-per-mo">/mo</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Itemized Services Table */}
              <div className="cost-table-section">
                <span className="audit-section-title">Itemized Component Ledger</span>
                <div className="cost-table-wrapper">
                  <table className="cost-table">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Shape / Role</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'right' }}>Est. Monthly Cost</th>
                        <th style={{ textAlign: 'center' }}>Locate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costEstimate.items.map((item) => (
                        <tr key={item.nodeId}>
                          <td className="item-name-cell">
                            <strong>{item.label}</strong>
                          </td>
                          <td>
                            <span className="item-shape-badge">{item.shape}</span>
                          </td>
                          <td style={{ textTransform: 'capitalize', color: '#94a3b8' }}>
                            {item.category}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {item.monthlyCost === 0 ? (
                              <span style={{ color: '#10b981' }}>Free (Client/VPC)</span>
                            ) : (
                              `$${item.monthlyCost.toFixed(2)}/mo`
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="table-locate-btn"
                              onClick={() => handleHighlight(item.nodeId)}
                              title={`Focus on "${item.label}"`}
                            >
                              <Crosshair size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer audit-modal-footer">
          <div className="audit-footer-stats">
            <span>
              Audited <strong>{nodes.length}</strong> Components &amp;{' '}
              <strong>{arrows.length}</strong> Connections
            </span>
          </div>

          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
