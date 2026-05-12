export interface User {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
  profilePic?: string | null;
  role?: 'user' | 'admin' | 'moderator' | 'support';
  rating?: number;
  offering?: string;
  wanting?: string;
}


export interface Task {
  id: string;
  user_id: string;
  posted_by?: string;
  title: string;
  description: string;
  offering: string | string[];
  wanting: string | string[];
  status: string;
  type: string;
  created_at: string;
  users?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  content: string;      // local Express DB field
  message?: string;     // Supabase field
  is_read: boolean;
  type: string;
  reference_id: string;
  task_id: string;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
  sender?: {
    name: string;
    avatar_url: string | null;
  };
  message?: string;
  senderId?: string;
  senderName?: string;
}

export interface Room {
  id: string;
  task_id: string;
  request_id?: string;
  broadcast_id?: string;
  user_a: string;
  user_b: string;
  status: string;
  created_at: string;
  workspace_notes?: string;
  task_title?: string;
  title?: string;
  is_supabase?: boolean;
  isSb?: boolean;
  connected?: boolean;
  connection_clicks?: string[];
  task?: {
    title: string;
    description: string;
    offering: string | string[];
    wanting: string | string[];
  };
  user_a_info?: {
    name: string;
    avatar_url: string | null;
  };
  user_b_info?: {
    name: string;
    avatar_url: string | null;
  };
  participants?: string[];
  participant_info?: Record<string, { name: string; avatar_url: string | null }>;
  last_message?: {
    content: string;
    sender_name?: string;
    created_at?: string;
  };
}

export interface ConnectionStage {
  id: string;
  room_id: string;
  user_id: string;
  stage: 'connected' | 'work_done';
  delivery_note?: string;
  confirmed_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  target_user_id: string;
  rating: number;
  skill_level: string;
  comment: string;
  tags?: string[];
  created_at?: string;
  reviewer_name?: string;
  task_title?: string;
}

export interface Dispute {
  id: string;
  room_id: string;
  raised_by: string;
  reason: string;
  description: string;
  status: 'open' | 'resolved';
  created_at: string;
}

export interface AiAnalysis {
  summary: string;
  overall_feedback: string;
  suggested_rating: number | string;
  reliability_status: string;
  growth_areas: string;
}

export interface UserNote {
  id: string;
  title: string;
  description: string;
  fileName: string;
  created_at: string;
}

export interface SkillProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  offering_skills: string[];
  wanting_skills: string[];
  avg_rating: number;
  sessions_completed: number;
  is_available: boolean;
}

export interface GeminiMatchInsight {
  index: number;
  whyItWorks: string;
  suggestedMessage: string;
  exchangeStrength: 'strong' | 'moderate' | 'partial';
}

export interface MatchResult {
  peer: SkillProfile;
  task: {
    id: string;
    title: string;
    description: string;
    offering: string[];
    wanting: string[];
    ai_metadata?: {
      analysis: string;
      target_peer: string;
    };
    created_at: string;
  } | null;
  theyOfferWhatINeed: string[];
  iOfferWhatTheyNeed: string[];
  matchScore: number;
  aiInsight?: GeminiMatchInsight | null;
  requestStatus?: 'pending' | 'accepted' | 'declined' | null;
  requestId?: string | null;
  roomId?: string | null;
}

export interface MatchRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  giving_skills: string[];
  receiving_skills: string[];
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  from_name: string;
  from_avatar: string | null;
  to_name: string;
  to_avatar: string | null;
  created_at: string;
}
