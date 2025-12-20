// Conversation Service - Manages chat history in localStorage

const STORAGE_KEY = 'chat_agent_conversations';

export interface Conversation {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date | string;
  }>;
  ticketId?: number;
  deviceDetails?: any;
  conversationHistory: Array<{ role: string; content: string }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all saved conversations from localStorage
 */
export function getAllConversations(): Conversation[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const conversations = JSON.parse(stored);
    // Sort by last updated (most recent first)
    return conversations.sort((a: Conversation, b: Conversation) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Error loading conversations:', error);
    return [];
  }
}

/**
 * Save a conversation to localStorage
 */
export function saveConversation(conversation: Conversation): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const conversations = getAllConversations();
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);
    
    // Convert Date objects to ISO strings for storage
    const conversationToSave: Conversation = {
      ...conversation,
      messages: conversation.messages?.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      })) || []
    };
    
    if (existingIndex >= 0) {
      // Update existing conversation
      conversations[existingIndex] = {
        ...conversations[existingIndex],
        ...conversationToSave,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new conversation
      conversations.push({
        ...conversationToSave,
        createdAt: conversation.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    return true;
  } catch (error) {
    console.error('Error saving conversation:', error);
    return false;
  }
}

/**
 * Get a specific conversation by ID
 */
export function getConversation(id: string): Conversation | null {
  try {
    const conversations = getAllConversations();
    const conv = conversations.find(c => c.id === id);
    if (!conv) return null;
    
    // Convert timestamp strings back to Date objects
    return {
      ...conv,
      messages: conv.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string)
      }))
    };
  } catch (error) {
    console.error('Error loading conversation:', error);
    return null;
  }
}

/**
 * Delete a conversation
 */
export function deleteConversation(id: string): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const conversations = getAllConversations();
    const filtered = conversations.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }
}

/**
 * Generate a conversation title based on the issue/messages
 */
export async function generateConversationTitle(
  messages: Array<{ role: string; content: string }>,
  ticketId?: number
): Promise<string> {
  try {
    // Get first few messages to understand the context
    const contextMessages = messages
      .slice(0, 5)
      .map(msg => `${msg.role}: ${msg.content.substring(0, 100)}`)
      .join('\n');

    // Try to extract issue from first user message or ticket description
    const firstUserMessage = messages.find(m => m.role === 'user');
    const issueDescription = firstUserMessage?.content || 'Technical Support';

    // Use OpenAI to generate title
    const response = await fetch('/tms/api/chat-agent/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: contextMessages,
        issueDescription,
        ticketId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.title || 'New Conversation';
    }

    // Fallback: use first user message or ticket ID
    if (ticketId) {
      return `Ticket #${ticketId} - ${issueDescription.substring(0, 40)}${issueDescription.length > 40 ? '...' : ''}`;
    }
    if (firstUserMessage) {
      const preview = firstUserMessage.content.substring(0, 50);
      return preview.length < firstUserMessage.content.length ? preview + '...' : preview;
    }
    return 'New Conversation';
  } catch (error) {
    console.error('Error generating title:', error);
    // Fallback title
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const preview = firstUserMessage.content.substring(0, 40);
      return preview.length < firstUserMessage.content.length ? preview + '...' : preview;
    }
    return ticketId ? `Ticket #${ticketId}` : 'New Conversation';
  }
}

/**
 * Create a new conversation ID
 */
export function createConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

