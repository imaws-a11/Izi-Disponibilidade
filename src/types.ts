export interface PollOption {
  id: string;
  label: string;
  date?: string;
  shift?: 'Manhã' | 'Tarde' | 'Noite' | 'Integral' | 'Personalizado';
  category?: string;
  maxCapacity?: number;
}

export interface VoterSelection {
  voterId: string;
  voterName: string;
  selectedOptionIds: string[];
  vehicle?: string; // Moto, Carro, Van, Caminhão, etc.
  phone?: string;
  notes?: string;
  updatedAt: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  allowMultiple: boolean;
  requireVehicle?: boolean;
  options: PollOption[];
  votes: Record<string, VoterSelection>;
  isActive: boolean;
  creatorName?: string;
}

export interface PollSummary {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  totalVoters: number;
  totalVotes: number;
  isActive: boolean;
  creatorName?: string;
}

export interface AdminSession {
  token: string;
  username: string;
}

export type PollEventType =
  | 'vote_added'
  | 'vote_updated'
  | 'vote_removed'
  | 'poll_created'
  | 'poll_status_changed';

export interface PollEventLog {
  id: string;
  timestamp: string;
  pollId: string;
  pollTitle: string;
  type: PollEventType;
  description: string;
  actorName: string;
  details?: {
    vehicle?: string;
    optionsCount?: number;
    optionsLabels?: string[];
  };
}

// WebSocket message types
export type WSClientMessage =
  | { type: 'join'; pollId: string; voterId?: string; voterName?: string }
  | { type: 'leave'; pollId: string }
  | {
      type: 'vote';
      pollId: string;
      voterId: string;
      voterName: string;
      selectedOptionIds: string[];
      vehicle?: string;
      phone?: string;
      notes?: string;
    }
  | { type: 'create_poll'; poll: Omit<Poll, 'id' | 'createdAt' | 'votes'> }
  | { type: 'ping' };

export type WSServerMessage =
  | { type: 'sync'; poll: Poll; onlineCount: number }
  | { type: 'poll_updated'; poll: Poll; updatedBy?: string }
  | { type: 'presence'; pollId: string; onlineCount: number }
  | { type: 'poll_created'; poll: Poll }
  | { type: 'error'; message: string }
  | { type: 'pong' };
