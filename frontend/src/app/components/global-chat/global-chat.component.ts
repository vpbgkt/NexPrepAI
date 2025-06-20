import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-global-chat',
    imports: [CommonModule, FormsModule],
    templateUrl: './global-chat.component.html',
    styles: [`
      .mention {
        background-color: #dbeafe;
        color: #1d4ed8;
        padding: 1px 4px;
        border-radius: 4px;
        font-weight: 600;
      }
      .border-l-3 {
        border-left-width: 3px;
      }
      textarea {
        resize: none;
        min-height: 38px;
        max-height: 100px;
        overflow-y: auto;
      }
    `]
})
export class GlobalChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesArea') messagesArea: ElementRef<HTMLDivElement> | null = null;
  @ViewChild('messageInput') messageInput: ElementRef<HTMLTextAreaElement> | null = null;
  
  messages: ChatMessage[] = [];
  newMessage: string = '';
  error: string | null = null;
  private subscriptions = new Subscription();
  
  username: string | null = null;
  shouldScrollToBottom = true;
  
  // Chat bubble state
  isMinimized: boolean = true;
  hasUnreadMessages: boolean = false;
  unreadCount: number = 0;
  private lastReadMessageCount: number = 0;
  
  // Mention and reply features
  replyingTo: ChatMessage | null = null;
  showUsersList: boolean = false;
  filteredUsers: string[] = [];
  allUsers: string[] = [];
  mentionStartPosition: number = -1;
  currentMentionQuery: string = '';

  // Reaction features
  availableReactions: string[] = ['👍', '❤️', '😂', '😮', '😢', '👎'];
  showReactionPicker: { [messageId: string]: boolean } = {};

  constructor(private chatService: ChatService, public authService: AuthService) {}
  ngOnInit(): void {
    console.log('GlobalChatComponent initialized');
    console.log('Initial state - messages array length:', this.messages.length);
    
    // Subscribe to username changes
    this.subscriptions.add(
      this.authService.getAppUserNameObservable().subscribe(name => {
        console.log('Username changed:', name);
        this.username = name;
        
        if (name) {
          // User logged in, connect to chat with new token
          console.log('User logged in, connecting to chat');
          this.chatService.reconnectWithNewToken();
        } else {
          // User logged out
          console.log('User logged out, disconnecting from chat');
          this.chatService.disconnect();
          this.messages = [];
        }
      })
    );
    
    // Subscribe to initial messages
    this.subscriptions.add(
      this.chatService.onInitChat().subscribe(initialMessages => {
        console.log('Initial chat messages received:', initialMessages.length);
        this.messages = initialMessages;
        this.updateUsersList(); // Update users list with initial messages
        this.shouldScrollToBottom = true;
        // Force scroll for initial messages
        setTimeout(() => {
          this.performScrollToBottom();
        }, 300);
      })
    );
    
    // Subscribe to new messages
    this.subscriptions.add(
      this.chatService.onNewMessage().subscribe(message => {
        console.log('New message received:', {
          username: message.username,
          text: message.text,
          mentions: message.mentions,
          replyTo: message.replyTo
        });
        
        // More efficient duplicate check - check last 10 messages only
        const recentMessages = this.messages.slice(-10);
        const existingMessage = recentMessages.find(m => {
          const usernameMatch = m.username === message.username;
          const textMatch = m.text === message.text;
          const timeDiff = Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime());
          const timeMatch = timeDiff < 1000;
          
          return usernameMatch && textMatch && timeMatch;
        });
          if (!existingMessage) {
          console.log('Adding new message to array - no duplicate found');
          this.messages.push(message);
          if (this.messages.length > 100) {
            this.messages.shift();
          }
          // Update users list when new messages arrive
          this.updateUsersList();
        } else {
          console.log('Message already exists in recent messages, skipping addition but triggering scroll');
        }
        
        // ALWAYS trigger scroll for ANY message received when chat is open (even duplicates)
        // This handles cases where messages are re-broadcast due to WebSocket reconnections
        if (!this.isMinimized) {
          console.log('Chat is open, forcing scroll to bottom for message from:', message.username);
          
          // Immediate scroll trigger
          this.shouldScrollToBottom = true;
          
          // Force scroll using multiple methods to ensure it works
          setTimeout(() => {
            this.performScrollToBottom();
          }, 10);
          
          setTimeout(() => {
            this.performScrollToBottom();
          }, 100);
          
          setTimeout(() => {
            this.performScrollToBottom();
          }, 200);
        }
        
        // Handle unread messages (only for truly new messages)
        if (!existingMessage && this.isMinimized && message.username !== this.username) {
          this.hasUnreadMessages = true;
          this.unreadCount++;
        }
      })
    );    // Subscribe to auth errors
    this.subscriptions.add(
      this.chatService.onAuthError().subscribe(err => {
        console.error('🔒 Auth error in chat:', err.message);
        this.error = err.message;
        
        // Check if this is a session expired message
        if (err.message.includes('expired') || err.message.includes('Session expired')) {
          // Show user-friendly error message
          this.error = 'Your session has expired. Please log in again.';
          
          // Optional: Auto-logout after a delay to allow user to see the message
          setTimeout(() => {
            this.authService.logout();
          }, 3000);
        } else if (err.message.includes('connection') || err.message.includes('Connection failed')) {
          // Connection-related errors
          this.error = 'Connection issues detected. Please check your internet connection.';
          
          // Clear error after some time as connection might recover
          setTimeout(() => {
            if (this.chatService.isConnected()) {
              this.error = null;
            }
          }, 10000);
        } else {
          // Other auth errors - don't attempt automatic reconnection
          console.log('Non-recoverable auth error, user intervention required');
        }
      })
    );// If there are cached messages, use them
    const existingMessages = this.chatService.getMessages();
    if (existingMessages.length > 0) {
      console.log('Using cached messages:', existingMessages.length);
      this.messages = existingMessages;
      this.shouldScrollToBottom = true;
      // Force scroll after component is fully initialized
      setTimeout(() => {
        this.performScrollToBottom();
      }, 500);
    }

    // Close reaction pickers when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.reaction-picker') && !target.closest('[data-reaction-trigger]')) {
        this.showReactionPicker = {};
      }
    });
  }ngAfterViewChecked(): void {
    // Scroll to bottom after view is updated if needed
    if (this.shouldScrollToBottom) {
      console.log('ngAfterViewChecked: shouldScrollToBottom is true, attempting scroll');
      // Multiple fallback methods to ensure scroll works
      this.performScrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private performScrollToBottom(): void {
    // Method 1: Try immediate scroll
    this.scrollToBottom();
    
    // Method 2: Try with requestAnimationFrame
    requestAnimationFrame(() => {
      this.scrollToBottom();
    });
    
    // Method 3: Try with setTimeout
    setTimeout(() => {
      this.scrollToBottom();
    }, 0);
    
    // Method 4: Try with longer delay
    setTimeout(() => {
      this.scrollToBottom();
    }, 50);
    
    // Method 5: Try direct DOM manipulation
    setTimeout(() => {
      this.forceScrollWithDOMQuery();
    }, 100);
  }  private scrollToBottom(): void {
    try {
      if (this.messagesArea && this.messagesArea.nativeElement) {
        const element = this.messagesArea.nativeElement;
        console.log('Before scroll - scrollTop:', element.scrollTop, 'scrollHeight:', element.scrollHeight, 'clientHeight:', element.clientHeight);
        
        // Calculate perfect bottom position
        const perfectBottom = element.scrollHeight - element.clientHeight;
        console.log('Perfect bottom position should be:', perfectBottom);
        
        // Set scroll to exact bottom position
        element.scrollTop = perfectBottom;
        
        // Force exact position with multiple attempts
        setTimeout(() => {
          if (element) {
            element.scrollTop = perfectBottom;
            console.log('After first correction - scrollTop:', element.scrollTop);
          }
        }, 1);
        
        // Final verification and correction
        setTimeout(() => {
          if (element) {
            const currentBottom = element.scrollHeight - element.clientHeight;
            element.scrollTop = currentBottom;
            console.log('Final scroll - scrollTop:', element.scrollTop, 'target:', currentBottom);
          }
        }, 10);
        
        console.log('Scroll attempted to perfect bottom position');
      } else {
        console.log('messagesArea not available, trying DOM query method');
        this.forceScrollWithDOMQuery();
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
      // Fallback to DOM query method
      this.forceScrollWithDOMQuery();
    }
  }
  private forceScrollWithDOMQuery(): void {
    try {
      // Try to find the messages area by class name as fallback
      const messagesContainer = document.querySelector('.messages-area') as HTMLElement;
      if (messagesContainer) {
        console.log('Found messages container via DOM query, scrolling...');
        
        // Calculate perfect bottom position
        const perfectBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight;
        console.log('DOM Query - Perfect bottom position:', perfectBottom);
        
        // Set to exact bottom position
        messagesContainer.scrollTop = perfectBottom;
        
        // Double-check scroll after brief delay
        setTimeout(() => {
          const currentBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight;
          messagesContainer.scrollTop = currentBottom;
          console.log('DOM Query - Final scroll position:', messagesContainer.scrollTop);
        }, 10);
      } else {
        console.log('Could not find messages container via DOM query');
      }
    } catch (err) {
      console.error('Error in forceScrollWithDOMQuery:', err);
    }
  }
  private isScrolledToBottom(): boolean {
    if (!this.messagesArea) return true;
    
    const element = this.messagesArea.nativeElement;
    const threshold = 100; // Increased threshold for better detection
    const isAtBottom = element.scrollTop >= (element.scrollHeight - element.clientHeight - threshold);
    console.log('Scroll check:', element.scrollTop, '>=', (element.scrollHeight - element.clientHeight - threshold), '=', isAtBottom);
    return isAtBottom;
  }
  // Public method to force scroll - can be called from template if needed
  public forceScrollToBottom(): void {
    console.log('forceScrollToBottom called');
    this.shouldScrollToBottom = true;
    this.performScrollToBottom();
  }  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    // Don't disconnect on destroy since this is a live discussion chat
    // The ChatService will manage the connection across component lifecycles
  }

  // Mention and Reply Methods
  toggleChat(): void {
    this.isMinimized = !this.isMinimized;
    if (!this.isMinimized) {
      this.markMessagesAsRead();
      // Force scroll to bottom when opening chat with delay for animation
      setTimeout(() => {
        this.shouldScrollToBottom = true;
        console.log('Chat opened, forcing scroll to bottom');
      }, 300);
    }
  }

  /**
   * Check if chat service is currently attempting to reconnect
   */
  isReconnecting(): boolean {
    return this.chatService.getConnectionStatus().reconnecting;
  }

  /**
   * Check if chat service is connected
   */
  isConnected(): boolean {
    return this.chatService.isConnected();
  }

  /**
   * Get current reconnection attempt count
   */
  getReconnectAttempts(): number {
    return this.chatService.getConnectionStatus().attempts;
  }

  markMessagesAsRead(): void {
    this.hasUnreadMessages = false;
    this.unreadCount = 0;
    this.lastReadMessageCount = this.messages.length;
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return `${message.username}-${message.timestamp}-${message.text}`;
  }
  // Mention and Reply Methods
  onInputChange(event: any): void {
    const value = event.target.value;
    this.newMessage = value;
    
    // Check for @ mentions
    const cursorPosition = event.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      console.log('Found mention match:', mentionMatch[1], 'Available users:', this.allUsers);
      this.mentionStartPosition = textBeforeCursor.lastIndexOf('@');
      this.currentMentionQuery = mentionMatch[1].toLowerCase();
      this.filteredUsers = this.allUsers.filter(user => 
        user.toLowerCase().includes(this.currentMentionQuery) && user !== this.username
      );
      this.showUsersList = this.filteredUsers.length > 0;
      console.log('Filtered users:', this.filteredUsers, 'Show users list:', this.showUsersList);
    } else {
      this.showUsersList = false;
      this.mentionStartPosition = -1;
    }
  }

  selectMention(username: string): void {
    if (this.mentionStartPosition >= 0) {
      const beforeMention = this.newMessage.substring(0, this.mentionStartPosition);
      const afterMention = this.newMessage.substring(this.mentionStartPosition + this.currentMentionQuery.length + 1);
      this.newMessage = beforeMention + `@${username} ` + afterMention;
      this.showUsersList = false;
      this.mentionStartPosition = -1;
      
      // Focus back to input
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    }
  }

  replyToMessage(message: ChatMessage): void {
    this.replyingTo = message;
    if (this.messageInput) {
      this.messageInput.nativeElement.focus();
    }
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }

  formatMessageWithMentions(text: string): string {
    return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  }
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.username) return;

    const mentions = this.extractMentions(this.newMessage);
    
    const messageData: Partial<ChatMessage> = {
      id: Date.now().toString(), // Simple ID generation
      username: this.username,
      text: this.newMessage.trim(),
      timestamp: new Date(),
      mentions: mentions.length > 0 ? mentions : undefined,
      replyTo: this.replyingTo ? {
        messageId: this.replyingTo.id || '',
        username: this.replyingTo.username,
        text: this.replyingTo.text.substring(0, 50) + (this.replyingTo.text.length > 50 ? '...' : '')
      } : undefined
    };

    console.log('Sending message with data:', {
      text: messageData.text,
      mentions: messageData.mentions,
      replyTo: messageData.replyTo
    });

    this.chatService.sendMessage(messageData as ChatMessage);
    this.newMessage = '';
    this.replyingTo = null;
    this.shouldScrollToBottom = true;
  }
  // Update existing users list when new messages arrive
  updateUsersList(): void {
    const users = new Set<string>();
    this.messages.forEach(msg => users.add(msg.username));
    this.allUsers = Array.from(users).filter(user => user !== this.username);
    console.log('Updated users list:', this.allUsers, 'Current username:', this.username);
  }

  // Reaction Methods
  toggleReactionPicker(messageId: string): void {
    // Close all other reaction pickers
    Object.keys(this.showReactionPicker).forEach(id => {
      if (id !== messageId) {
        this.showReactionPicker[id] = false;
      }
    });
    // Toggle the current one
    this.showReactionPicker[messageId] = !this.showReactionPicker[messageId];
  }

  addReaction(messageId: string, emoji: string): void {
    if (!messageId) return;
    
    console.log('Adding reaction:', { messageId, emoji, username: this.username });
    this.chatService.sendReaction(messageId, emoji);
    this.showReactionPicker[messageId] = false; // Close picker after selection
  }

  hasUserReacted(message: ChatMessage, emoji: string): boolean {
    return message.reactions?.[emoji]?.includes(this.username || '') || false;
  }

  getReactionCount(message: ChatMessage, emoji: string): number {
    return message.reactions?.[emoji]?.length || 0;
  }

  getReactionUsers(message: ChatMessage, emoji: string): string[] {
    return message.reactions?.[emoji] || [];
  }

  // Helper method for template to access Object.keys
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }
}
