import React, { useState } from 'react';
import { Share2, Users, Check } from 'lucide-react';
import type { PeerUser } from '../utils/collaboration';

interface CollaborationBarProps {
  localUser: PeerUser;
  peers: PeerUser[];
  roomId: string;
  onShareBoard: () => void;
}

export const CollaborationBar: React.FC<CollaborationBarProps> = ({
  localUser,
  peers,
  roomId,
  onShareBoard,
}) => {
  const [copied, setCopied] = useState(false);

  // All active room participants: local user + remote peers
  const allUsers: PeerUser[] = [localUser, ...peers];

  const handleShareClick = () => {
    onShareBoard();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="collab-top-bar" role="region" aria-label="Collaboration Bar">
      {/* Collaborator Avatars Cluster */}
      <div className="collab-avatars-cluster">
        {allUsers.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className={`collab-avatar-circle ${user.isSelf ? 'is-self' : ''}`}
            style={{
              borderColor: user.color,
              background: `radial-gradient(circle at 35% 35%, ${user.color}40 0%, #0f172a 100%)`,
            }}
            title={`${user.name} ${user.isSelf ? '(You)' : '(Active Collaborator)'}`}
          >
            <span className="avatar-initials" style={{ color: user.color }}>
              {user.avatarInitials}
            </span>
            <span
              className="avatar-online-dot"
              style={{ backgroundColor: user.color, boxShadow: `0 0 6px ${user.color}` }}
            />
          </div>
        ))}

        {allUsers.length > 5 && (
          <div className="collab-overflow-badge" title={`${allUsers.length - 5} more collaborators`}>
            <span>+{allUsers.length - 5}</span>
          </div>
        )}

        <div className="collab-users-count" title={`Room: ${roomId} • ${allUsers.length} Active`}>
          <Users size={13} color="#94a3b8" />
          <span className="users-count-num">{allUsers.length}</span>
        </div>
      </div>

      {/* Share Board Button */}
      <button
        id="toolbar-share-board-btn"
        className={`collab-share-btn ${copied ? 'copied' : ''}`}
        onClick={handleShareClick}
        title={`Share Board: Room #${roomId}`}
        aria-label="Share Board Link"
      >
        {copied ? (
          <>
            <Check size={14} color="#34d399" />
            <span className="share-btn-text" style={{ color: '#34d399' }}>Copied Link!</span>
          </>
        ) : (
          <>
            <Share2 size={14} color="#38bdf8" />
            <span className="share-btn-text">Share Board</span>
          </>
        )}
      </button>
    </div>
  );
};
