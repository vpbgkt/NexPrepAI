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
      .mentions-dropdown {
        z-index: 1000;
      }
      .mention-item.selected {
        background-color: #eff6ff !important;
        border-color: #bfdbfe !important;
      }
      .mention-item:hover {
        background-color: #f3f4f6;
      }
      .mention-item.selected:hover {
        background-color: #eff6ff !important;
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
  
  // Resizable chat window properties
  chatWidth: number = 450; // Default width
  chatHeight: number = 600; // Default height
  minWidth: number = 300;
  maxWidth: number = 800;
  minHeight: number = 400;
  maxHeight: number = 800;
  isResizing: boolean = false;
  resizeDirection: string = '';
  startX: number = 0;
  startY: number = 0;
  startWidth: number = 0;
  startHeight: number = 0;
  
  // Mention and reply features
  replyingTo: ChatMessage | null = null;
  showUsersList: boolean = false;
  filteredUsers: string[] = [];
  allUsers: string[] = [];
  mentionStartPosition: number = -1;
  currentMentionQuery: string = '';
  selectedMentionIndex: number = 0; // For keyboard navigation

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
    
    // Enhanced regex to find the most recent @ symbol and capture the query after it
    // Now supports mentions anywhere in text and improved word boundary detection
    const mentionPattern = /@([a-zA-Z0-9_\s]*?)(?=\s|$|@)/;
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textFromAt = textBeforeCursor.substring(lastAtIndex);
      const mentionMatch = textFromAt.match(/@([a-zA-Z0-9_\s]*?)$/);
      
      if (mentionMatch) {
        console.log('Found mention match:', mentionMatch[1], 'Available active users:', this.allUsers);
        this.mentionStartPosition = lastAtIndex;
        this.currentMentionQuery = mentionMatch[1].toLowerCase().trim();
        
        // Enhanced filtering with better username handling
        // Only show users who have sent at least one message in the chat
        this.filteredUsers = this.allUsers.filter(user => {
          if (user === this.username) return false;
          
          const userName = user.toLowerCase();
          const query = this.currentMentionQuery;
          
          // Create mention-friendly version of username (replace spaces with nothing for comparison)
          const mentionFriendlyName = userName.replace(/\s+/g, '');
          const queryNoSpaces = query.replace(/\s+/g, '');
          
          return query === '' || // Show all active users when just typing @
            userName.startsWith(query) || // Full name starts with query
            mentionFriendlyName.startsWith(queryNoSpaces) || // Name without spaces starts with query
            userName.includes(query) || // Full name contains query
            mentionFriendlyName.includes(queryNoSpaces); // Name without spaces contains query
        }).sort((a, b) => {
          // Sort by relevance: exact matches first, then starts with, then contains
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const query = this.currentMentionQuery;
          
          // Priority for exact starts with match
          if (aLower.startsWith(query) && !bLower.startsWith(query)) return -1;
          if (!aLower.startsWith(query) && bLower.startsWith(query)) return 1;
          
          // Priority for mention-friendly starts with match (no spaces)
          const aMention = aLower.replace(/\s+/g, '');
          const bMention = bLower.replace(/\s+/g, '');
          const queryNoSpaces = query.replace(/\s+/g, '');
          
          if (aMention.startsWith(queryNoSpaces) && !bMention.startsWith(queryNoSpaces)) return -1;
          if (!aMention.startsWith(queryNoSpaces) && bMention.startsWith(queryNoSpaces)) return 1;
          
          return a.localeCompare(b); // Alphabetical if same relevance
        });
        
        this.showUsersList = this.filteredUsers.length > 0;
        // Reset selection index if current selection is out of bounds
        if (this.selectedMentionIndex >= this.filteredUsers.length) {
          this.selectedMentionIndex = 0;
        }
        console.log('Filtered active users for mention:', this.filteredUsers, 'Show users list:', this.showUsersList);
      } else {
        this.hideMentionsList();
      }
    } else {
      this.hideMentionsList();
    }
  }

  // Helper method to hide mentions list and reset state
  private hideMentionsList(): void {
    this.showUsersList = false;
    this.mentionStartPosition = -1;
    this.currentMentionQuery = '';
    this.selectedMentionIndex = 0;
  }

  selectMention(username: string): void {
    if (this.mentionStartPosition >= 0 && this.messageInput) {
      // Get current cursor position for more accurate text manipulation
      const currentCursorPosition = this.messageInput.nativeElement.selectionStart;
      const textBeforeCursor = this.newMessage.substring(0, currentCursorPosition);
      const textAfterCursor = this.newMessage.substring(currentCursorPosition);
      
      // Find the mention start position more accurately
      const lastAtPosition = this.mentionStartPosition;
      
      if (lastAtPosition >= 0) {
        // Replace from @ symbol to cursor with the selected username
        const beforeMention = this.newMessage.substring(0, lastAtPosition);
        const afterMention = textAfterCursor;
        
        // Create mention-friendly username (remove spaces for cleaner mentions)
        const mentionUsername = username.replace(/\s+/g, '');
        
        // Create the new message with the mention
        this.newMessage = beforeMention + `@${mentionUsername} ` + afterMention;
        
        // Calculate new cursor position (after the inserted mention + space)
        const newCursorPosition = lastAtPosition + mentionUsername.length + 2; // +2 for @ and space
        
        // Reset mention state
        this.hideMentionsList();
        
        // Focus back to input and set cursor position
        this.messageInput.nativeElement.focus();
        
        // Set cursor position after the mention
        setTimeout(() => {
          if (this.messageInput) {
            this.messageInput.nativeElement.setSelectionRange(newCursorPosition, newCursorPosition);
          }
        }, 0);
      }
    }
  }

  // Enhanced keyboard navigation for mentions
  onInputKeyDown(event: KeyboardEvent): void {
    if (this.showUsersList && this.filteredUsers.length > 0) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.selectedMentionIndex = Math.min(this.selectedMentionIndex + 1, this.filteredUsers.length - 1);
          this.scrollMentionIntoView();
          break;
        
        case 'ArrowUp':
          event.preventDefault();
          this.selectedMentionIndex = Math.max(this.selectedMentionIndex - 1, 0);
          this.scrollMentionIntoView();
          break;
        
        case 'Enter':
          if (this.selectedMentionIndex >= 0 && this.selectedMentionIndex < this.filteredUsers.length) {
            event.preventDefault();
            this.selectMention(this.filteredUsers[this.selectedMentionIndex]);
          }
          break;
        
        case 'Escape':
          event.preventDefault();
          this.hideMentionsList();
          break;
        
        case 'Tab':
          if (this.selectedMentionIndex >= 0 && this.selectedMentionIndex < this.filteredUsers.length) {
            event.preventDefault();
            this.selectMention(this.filteredUsers[this.selectedMentionIndex]);
          }
          break;
      }
    } else if (event.key === 'Enter' && !event.shiftKey) {
      // Only send message if mentions list is not shown
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Helper method to scroll selected mention into view
  private scrollMentionIntoView(): void {
    // Use setTimeout to ensure DOM is updated before scrolling
    setTimeout(() => {
      const mentionList = document.querySelector('.mentions-dropdown');
      const selectedItem = document.querySelector('.mention-item.selected');
      
      if (mentionList && selectedItem) {
        selectedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }, 0);
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
    // Enhanced regex to handle usernames with spaces that are converted to mention format
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedUser = match[1];
      
      // Try to find the actual username that matches this mention
      // Look for exact match first, then try to match by removing spaces
      const actualUser = this.allUsers.find(user => {
        const userNoSpaces = user.replace(/\s+/g, '');
        return user === mentionedUser || userNoSpaces.toLowerCase() === mentionedUser.toLowerCase();
      });
      
      if (actualUser) {
        mentions.push(actualUser);
      } else {
        // If no match found, use the mention as-is
        mentions.push(mentionedUser);
      }
    }
    
    // Remove duplicates
    return [...new Set(mentions)];
  }

  formatMessageWithMentions(text: string): string {
    // Enhanced mention formatting with better username resolution
    return text.replace(/@([a-zA-Z0-9_]+)/g, (match, mentionedUser) => {
      // Try to find the actual username for display
      const actualUser = this.allUsers.find(user => {
        const userNoSpaces = user.replace(/\s+/g, '');
        return user === mentionedUser || userNoSpaces.toLowerCase() === mentionedUser.toLowerCase();
      });
      
      const displayName = actualUser || mentionedUser;
      return `<span class="mention" title="@${displayName}">@${displayName}</span>`;
    });
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
  // Update users list to only include users who have sent at least one message
  updateUsersList(): void {
    const activeUsers = new Set<string>();
    
    // Only add users who have actually participated in the chat
    this.messages.forEach(msg => {
      if (msg.username && msg.username.trim() !== '') {
        activeUsers.add(msg.username);
      }
    });
    
    // Exclude current user from mention list
    this.allUsers = Array.from(activeUsers).filter(user => user !== this.username);
    
    console.log('Updated users list (only active participants):', this.allUsers, 'Current username:', this.username);
    console.log('Total messages processed:', this.messages.length, 'Active users found:', this.allUsers.length);
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
  // Helper method to get count of active users in chat
  getActiveUserCount(): number {
    return this.allUsers.length;
  }

  // Helper method to check if a user has sent messages
  isUserActive(username: string): boolean {
    return this.messages.some(msg => msg.username === username);
  }

  // Helper method for template to convert username to mention format
  getUserMentionName(username: string): string {
    return username.replace(/\s+/g, '');
  }

  // Helper method for template to access Object.keys
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  // Resize functionality methods
  startResize(event: MouseEvent, direction: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.resizeDirection = direction;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startWidth = this.chatWidth;
    this.startHeight = this.chatHeight;
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.stopResize.bind(this));
    
    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = this.getCursorForDirection(direction);
  }  private onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;
    
    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;
    
    // Calculate new dimensions based on resize direction
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    
    if (this.resizeDirection.includes('right')) {
      newWidth = this.startWidth + deltaX;
    }
    if (this.resizeDirection.includes('left')) {
      newWidth = this.startWidth - deltaX;
    }
    if (this.resizeDirection.includes('bottom')) {
      newHeight = this.startHeight + deltaY;
    }
    if (this.resizeDirection.includes('top')) {
      newHeight = this.startHeight - deltaY;
    }
    
    // Apply viewport-aware constraints
    const maxAllowedWidth = Math.min(this.maxWidth, window.innerWidth - 40);
    const maxAllowedHeight = Math.min(this.maxHeight, window.innerHeight - 40);
    
    newWidth = Math.max(this.minWidth, Math.min(maxAllowedWidth, newWidth));
    newHeight = Math.max(this.minHeight, Math.min(maxAllowedHeight, newHeight));
    
    // Update dimensions
    this.chatWidth = newWidth;
    this.chatHeight = newHeight;
    
    // Scroll to bottom after resize to maintain message visibility
    setTimeout(() => {
      this.forceScrollToBottom();
    }, 0);
  }

  private stopResize(): void {
    this.isResizing = false;
    this.resizeDirection = '';
    
    // Remove global event listeners
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.stopResize.bind(this));
    
    // Restore normal cursor and text selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }
  private getCursorForDirection(direction: string): string {
    switch (direction) {
      case 'right': return 'ew-resize';
      case 'left': return 'ew-resize';
      case 'bottom': return 'ns-resize';
      case 'top': return 'ns-resize';
      case 'bottom-right': return 'nwse-resize';
      case 'bottom-left': return 'nesw-resize';
      case 'top-right': return 'nesw-resize';
      case 'top-left': return 'nwse-resize';
      default: return 'default';
    }
  }
  getChatStyle(): any {
    if (this.isMinimized) {
      return {};
    }
    
    // For mobile, use full screen
    if (window.innerWidth <= 640) {
      return {
        width: 'calc(100vw - 2rem)',
        height: 'calc(100vh - 4rem)',
        left: '1rem',
        right: '1rem',
        bottom: '1rem',
        top: '1rem'
      };
    }
    
    // For desktop, use resizable dimensions with viewport constraints
    const maxAllowedWidth = Math.min(this.maxWidth, window.innerWidth - 40);
    const maxAllowedHeight = Math.min(this.maxHeight, window.innerHeight - 40);
    
    const constrainedWidth = Math.min(this.chatWidth, maxAllowedWidth);
    const constrainedHeight = Math.min(this.chatHeight, maxAllowedHeight);
    
    return {
      width: `${constrainedWidth}px`,
      height: `${constrainedHeight}px`
    };
  }

  // Add method to reset to default size
  resetChatSize(): void {
    this.chatWidth = 450;
    this.chatHeight = 600;
  }

  // Add method to maximize chat (within limits)
  maximizeChat(): void {
    if (window.innerWidth > 640) {
      this.chatWidth = Math.min(this.maxWidth, window.innerWidth - 80);
      this.chatHeight = Math.min(this.maxHeight, window.innerHeight - 80);
    }
  }
}
