import type { NodeElement, ArrowElement, Point } from '../types/canvas';

export interface PeerUser {
  id: string;
  name: string;
  avatarInitials: string;
  color: string;
  cursor?: Point | null;
  lastActive: number;
  isSelf?: boolean;
}

export type CollabMessage =
  | { type: 'join'; user: PeerUser }
  | { type: 'presence'; user: PeerUser }
  | { type: 'cursor'; userId: string; cursor: Point | null }
  | { type: 'state_sync'; userId: string; nodes: NodeElement[]; arrows: ArrowElement[] }
  | { type: 'heartbeat'; userId: string }
  | { type: 'leave'; userId: string };

const COLLAB_PROFILES = [
  { name: 'Alex Rivera', initials: 'AR', color: '#38bdf8' }, // Sky Blue
  { name: 'Jordan Hayes', initials: 'JH', color: '#a855f7' }, // Purple
  { name: 'Taylor Chen', initials: 'TC', color: '#10b981' }, // Emerald
  { name: 'Samira Patel', initials: 'SP', color: '#f59e0b' }, // Amber
  { name: 'Morgan Cruz', initials: 'MC', color: '#ec4899' }, // Pink
  { name: 'Casey Zhang', initials: 'CZ', color: '#06b6d4' }, // Cyan
  { name: 'Riley Vance', initials: 'RV', color: '#6366f1' }, // Indigo
  { name: 'Devon Kim', initials: 'DK', color: '#14b8a6' }, // Teal
];

/**
 * Retrieves or establishes the collaboration room ID from window.location.hash.
 */
export function getRoomId(): string {
  if (typeof window === 'undefined') return 'default-room';
  const hash = window.location.hash;
  const match = hash.match(/room=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return 'architecture-room-1';
}

/**
 * Sets the room ID in the window.location.hash.
 */
export function setRoomIdInHash(roomId: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.hash = `room=${roomId}`;
  window.history.replaceState(null, '', url.toString());
}

/**
 * Returns a stable or randomly generated local user profile for this session tab.
 */
export function getLocalUser(): PeerUser {
  const STORAGE_KEY = 'architecture_collab_local_user_v1';
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.id && parsed.name && parsed.color) {
        return { ...parsed, isSelf: true, lastActive: Date.now() };
      }
    }
  } catch (e) {
    console.warn('Could not read session local user:', e);
  }

  // Generate new random user
  const randomProfile = COLLAB_PROFILES[Math.floor(Math.random() * COLLAB_PROFILES.length)];
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const newUser: PeerUser = {
    id: `peer_${Date.now()}_${randomSuffix}`,
    name: randomProfile.name,
    avatarInitials: randomProfile.initials,
    color: randomProfile.color,
    lastActive: Date.now(),
    isSelf: true,
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  } catch (e) {
    // ignore
  }

  return newUser;
}

export interface CollabClientEvents {
  onPeersChange: (peers: PeerUser[]) => void;
  onRemoteStateChange: (nodes: NodeElement[], arrows: ArrowElement[]) => void;
  onPeerCursorMove: (userId: string, cursor: Point | null) => void;
}

/**
 * Lightweight, zero-config multiplayer collaboration manager based on BroadcastChannel.
 * Supports cross-tab, cross-window real-time synchronization on the same machine/room.
 */
export class CollaborationClient {
  private channel: BroadcastChannel | null = null;
  private roomId: string;
  private localUser: PeerUser;
  private peers: Map<string, PeerUser> = new Map();
  private events: CollabClientEvents;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastCursorBroadcast = 0;
  private isDestroyed = false;

  constructor(events: CollabClientEvents) {
    this.events = events;
    this.roomId = getRoomId();
    this.localUser = getLocalUser();
    this.initChannel();
  }

  private initChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel is not supported in this environment.');
      return;
    }

    try {
      this.channel = new BroadcastChannel(`architecture_whiteboard_room_${this.roomId}`);
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data as CollabMessage);
      };

      // Announce arrival to room
      this.sendMessage({
        type: 'join',
        user: this.localUser,
      });

      // Periodic heartbeat and stale peer garbage collection (every 3s)
      this.heartbeatInterval = setInterval(() => {
        this.broadcastHeartbeat();
        this.pruneStalePeers();
      }, 3000);

      // Window unload cleanup
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', this.handleBeforeUnload);
      }
    } catch (err) {
      console.error('Failed to initialize Collaboration BroadcastChannel:', err);
    }
  }

  private handleBeforeUnload = (): void => {
    this.sendMessage({
      type: 'leave',
      userId: this.localUser.id,
    });
  };

  private sendMessage(msg: CollabMessage): void {
    if (this.channel && !this.isDestroyed) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {
        // channel closed
      }
    }
  }

  private handleMessage(msg: CollabMessage): void {
    if (!msg || this.isDestroyed) return;

    switch (msg.type) {
      case 'join':
        if (msg.user.id !== this.localUser.id) {
          this.peers.set(msg.user.id, { ...msg.user, lastActive: Date.now(), isSelf: false });
          // Reply with our own presence so new peer immediately registers us
          this.sendMessage({
            type: 'presence',
            user: this.localUser,
          });
          this.notifyPeers();
        }
        break;

      case 'presence':
        if (msg.user.id !== this.localUser.id) {
          const existing = this.peers.get(msg.user.id);
          this.peers.set(msg.user.id, {
            ...msg.user,
            cursor: existing?.cursor || msg.user.cursor,
            lastActive: Date.now(),
            isSelf: false,
          });
          this.notifyPeers();
        }
        break;

      case 'cursor':
        if (msg.userId !== this.localUser.id) {
          const peer = this.peers.get(msg.userId);
          if (peer) {
            peer.cursor = msg.cursor;
            peer.lastActive = Date.now();
            this.events.onPeerCursorMove(msg.userId, msg.cursor);
            this.notifyPeers();
          }
        }
        break;

      case 'state_sync':
        if (msg.userId !== this.localUser.id) {
          this.events.onRemoteStateChange(msg.nodes, msg.arrows);
        }
        break;

      case 'heartbeat':
        if (msg.userId !== this.localUser.id) {
          const peer = this.peers.get(msg.userId);
          if (peer) {
            peer.lastActive = Date.now();
          }
        }
        break;

      case 'leave':
        if (this.peers.has(msg.userId)) {
          this.peers.delete(msg.userId);
          this.notifyPeers();
        }
        break;
    }
  }

  private broadcastHeartbeat(): void {
    this.sendMessage({
      type: 'heartbeat',
      userId: this.localUser.id,
    });
  }

  private pruneStalePeers(): void {
    const now = Date.now();
    let changed = false;

    for (const [id, peer] of this.peers.entries()) {
      // Inactive for more than 10 seconds
      if (now - peer.lastActive > 10000) {
        this.peers.delete(id);
        changed = true;
      }
    }

    if (changed) {
      this.notifyPeers();
    }
  }

  private notifyPeers(): void {
    this.events.onPeersChange(Array.from(this.peers.values()));
  }

  /**
   * Broadcasts the local cursor position in canvas world coordinates with 30ms throttling.
   */
  public broadcastCursor(cursor: Point | null): void {
    const now = Date.now();
    if (now - this.lastCursorBroadcast < 30) return; // 30ms throttle
    this.lastCursorBroadcast = now;

    this.sendMessage({
      type: 'cursor',
      userId: this.localUser.id,
      cursor,
    });
  }

  /**
   * Broadcasts canvas modifications (nodes and arrows) to connected peers.
   */
  public broadcastState(nodes: NodeElement[], arrows: ArrowElement[]): void {
    this.sendMessage({
      type: 'state_sync',
      userId: this.localUser.id,
      nodes,
      arrows,
    });
  }

  /**
   * Returns current room ID.
   */
  public getCurrentRoomId(): string {
    return this.roomId;
  }

  /**
   * Returns local user profile.
   */
  public getLocalUserProfile(): PeerUser {
    return this.localUser;
  }

  /**
   * Returns active peers list.
   */
  public getActivePeers(): PeerUser[] {
    return Array.from(this.peers.values());
  }

  /**
   * Cleanly closes and disconnects from collaboration channel.
   */
  public destroy(): void {
    this.isDestroyed = true;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.sendMessage({
      type: 'leave',
      userId: this.localUser.id,
    });

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }
}
