import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-global-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-chat.component.html',
  styleUrls: ['./global-chat.component.scss']
})
export class GlobalChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesArea') messagesArea: ElementRef<HTMLDivElement> | null = null;
  
  messages: ChatMessage[] = [];
  newMessage: string = '';
  error: string | null = null;
  private subscriptions = new Subscription();
  username: string | null = null;
  shouldScrollToBottom = true;
    // Chat bubble state
  isMinimized: boolean = false;
  hasUnreadMessages: boolean = false;
  unreadCount: number = 0;
  private lastReadMessageCount: number = 0;

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
    );    // Subscribe to initial messages
    this.subscriptions.add(
      this.chatService.onInitChat().subscribe(initialMessages => {
        console.log('Initial chat messages received:', initialMessages.length);
        this.messages = initialMessages;
        this.shouldScrollToBottom = true;
        // Force scroll for initial messages
        setTimeout(() => {
          this.performScrollToBottom();
        }, 300);
      })
    );// Subscribe to new messages
    this.subscriptions.add(      this.chatService.onNewMessage().subscribe(message => {
        console.log('New message received:', message);
        console.log('Current messages array length:', this.messages.length);
        
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
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    // Don't disconnect on destroy since this is a live discussion chat
    // The ChatService will manage the connection across component lifecycles
  }sendMessage(): void {
    if (this.newMessage.trim() !== '') {
      console.log('Sending chat message:', this.newMessage);
      this.chatService.sendMessage(this.newMessage);
      this.newMessage = '';
      this.error = null;
      
      // FORCE scroll to bottom for user's own messages with multiple methods
      console.log('User sent message, triggering comprehensive scroll');
      this.shouldScrollToBottom = true;
      
      // Immediate scroll attempts
      this.performScrollToBottom();
      
      // Additional scroll attempts at intervals
      setTimeout(() => {
        this.performScrollToBottom();
      }, 50);
      
      setTimeout(() => {
        this.performScrollToBottom();
      }, 150);
      
      setTimeout(() => {
        this.performScrollToBottom();
      }, 300);
    } else {
      this.error = "Message cannot be empty";
    }
  }// Chat bubble methods
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
}
