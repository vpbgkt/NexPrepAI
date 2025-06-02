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
        this.shouldScrollToBottom = true;
      })
    );    // Subscribe to new messages
    this.subscriptions.add(
      this.chatService.onNewMessage().subscribe(message => {
        console.log('New message received:', message);
        
        // Check if message already exists (to prevent duplicates)
        const existingMessage = this.messages.find(m => 
          m.username === message.username && 
          m.text === message.text && 
          Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000        );
          if (!existingMessage) {
          this.messages.push(message);
          if (this.messages.length > 100) {
            this.messages.shift();
          }
          
          // Always scroll to bottom for new messages when chat is open
          if (!this.isMinimized) {
            this.shouldScrollToBottom = true;
            console.log('New message received, triggering scroll. Message from:', message.username);
          }
          
          // Handle unread messages
          if (this.isMinimized && message.username !== this.username) {
            this.hasUnreadMessages = true;
            this.unreadCount++;
          }
        }
      })
    );    // Subscribe to auth errors
    this.subscriptions.add(
      this.chatService.onAuthError().subscribe(err => {
        console.error('Auth error in chat:', err.message);
        this.error = err.message;
        // If token expired, try to refresh
        if (err.message.includes('expired') || err.message.includes('session')) {
          setTimeout(() => {
            if (this.authService.getToken()) {
              console.log('Attempting to reconnect with refreshed token...');
              this.chatService.reconnectWithNewToken();
              this.error = null;
            }
          }, 2000);
        }
      })
    );

    // If there are cached messages, use them
    const existingMessages = this.chatService.getMessages();
    if (existingMessages.length > 0) {
      console.log('Using cached messages:', existingMessages.length);
      this.messages = existingMessages;
      this.shouldScrollToBottom = true;
    }
  }  ngAfterViewChecked(): void {
    // Scroll to bottom after view is updated if needed
    if (this.shouldScrollToBottom && this.messagesArea) {
      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        this.scrollToBottom();
        this.shouldScrollToBottom = false;
      });
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesArea) {
        const element = this.messagesArea.nativeElement;
        // Force scroll to absolute bottom
        element.scrollTop = element.scrollHeight + 1000;
        console.log('Scrolled to bottom:', element.scrollTop, 'of', element.scrollHeight);
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
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

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    // Don't disconnect on destroy since this is a global chat
    // The ChatService will manage the connection across component lifecycles
  }  sendMessage(): void {
    if (this.newMessage.trim() !== '') {
      console.log('Sending chat message:', this.newMessage);
      this.chatService.sendMessage(this.newMessage);
      this.newMessage = '';
      this.error = null;
      // Force scroll to bottom for user's own messages
      this.shouldScrollToBottom = true;
      console.log('User sent message, forcing scroll to bottom');
    } else {
      this.error = "Message cannot be empty";
    }
  }  // Chat bubble methods
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

  markMessagesAsRead(): void {
    this.hasUnreadMessages = false;
    this.unreadCount = 0;
    this.lastReadMessageCount = this.messages.length;
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return `${message.username}-${message.timestamp}-${message.text}`;
  }
}
