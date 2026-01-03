import mongoose, { Schema, Document, Model } from 'mongoose';

// Voice Session - one per browser session/conversation
export interface IVoiceSession extends Document {
  sessionId: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  status: 'active' | 'completed' | 'error' | 'abandoned';
  
  // User/Marketing Info
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage?: string;
  
  // PII - Captured from conversation
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userCompany?: string;
  userRole?: string;
  userLocation?: string;
  
  // Analytics - LLM enriched
  intent?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  leadScore?: number; // 1-10
  topics?: string[];
  summary?: string;
  actionItems?: string[];
  followUpRequired?: boolean;
  qualifiedLead?: boolean;
  rawTranscript?: string; // Full conversation text
  
  // Metadata
  turnCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VoiceSessionSchema = new Schema<IVoiceSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date },
    durationSeconds: { type: Number },
    status: { 
      type: String, 
      enum: ['active', 'completed', 'error', 'abandoned'],
      default: 'active',
      index: true 
    },
    
    // User/Marketing Info
    userAgent: { type: String },
    ipAddress: { type: String },
    referrer: { type: String },
    utmSource: { type: String, index: true },
    utmMedium: { type: String },
    utmCampaign: { type: String, index: true },
    utmTerm: { type: String },
    utmContent: { type: String },
    landingPage: { type: String },
    
    // PII
    userName: { type: String },
    userEmail: { type: String, index: true },
    userPhone: { type: String },
    userCompany: { type: String, index: true },
    userRole: { type: String },
    userLocation: { type: String },
    
    // Analytics
    intent: { type: String, index: true },
    sentiment: { 
      type: String, 
      enum: ['positive', 'neutral', 'negative'] 
    },
    leadScore: { type: Number, min: 1, max: 10 },
    topics: [{ type: String }],
    summary: { type: String },
    actionItems: [{ type: String }],
    followUpRequired: { type: Boolean, default: false, index: true },
    qualifiedLead: { type: Boolean, default: false, index: true },
    rawTranscript: { type: String },
    
    // Metadata
    turnCount: { type: Number, default: 0 },
    errorMessage: { type: String },
  },
  { 
    timestamps: true,
    collection: 'voice_sessions'
  }
);

// Indexes for common queries
VoiceSessionSchema.index({ startedAt: -1 });
VoiceSessionSchema.index({ status: 1, startedAt: -1 });
VoiceSessionSchema.index({ qualifiedLead: 1, startedAt: -1 });

export const VoiceSession: Model<IVoiceSession> = 
  mongoose.models.VoiceSession || mongoose.model<IVoiceSession>('VoiceSession', VoiceSessionSchema);

// Conversation Turn - individual user/assistant messages
export interface IConversationTurn extends Document {
  sessionId: string;
  turnIndex: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  
  // Audio metadata
  audioDurationMs?: number;
  
  // Extracted PII from this turn
  extractedName?: string;
  extractedEmail?: string;
  extractedPhone?: string;
  extractedCompany?: string;
  
  createdAt: Date;
}

const ConversationTurnSchema = new Schema<IConversationTurn>(
  {
    sessionId: { type: String, required: true, index: true },
    turnIndex: { type: Number, required: true },
    role: { 
      type: String, 
      enum: ['user', 'assistant'], 
      required: true 
    },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    
    audioDurationMs: { type: Number },
    
    extractedName: { type: String },
    extractedEmail: { type: String },
    extractedPhone: { type: String },
    extractedCompany: { type: String },
  },
  { 
    timestamps: true,
    collection: 'conversation_turns'
  }
);

ConversationTurnSchema.index({ sessionId: 1, turnIndex: 1 });

export const ConversationTurn: Model<IConversationTurn> = 
  mongoose.models.ConversationTurn || mongoose.model<IConversationTurn>('ConversationTurn', ConversationTurnSchema);

// Admin User model for authentication
export interface IAdminUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'viewer';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['admin', 'viewer'],
      default: 'viewer'
    },
    lastLogin: { type: Date },
  },
  { 
    timestamps: true,
    collection: 'admin_users'
  }
);

export const AdminUser: Model<IAdminUser> = 
  mongoose.models.AdminUser || mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
