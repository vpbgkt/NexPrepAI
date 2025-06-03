import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service'; 

export interface ChatMessage {
  username: string;
  text: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket!: Socket;
  private readonly MAX_MESSAGES = 100;
  public messages: ChatMessage[] = [];
  
  private newMessageSubject = new Subject<ChatMessage>();
  private initChatSubject = new ReplaySubject<ChatMessage[]>(1);
  private authErrorSubject = new Subject<{ message: string }>();

  // Connection throttling properties
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimeout: any;
  private isReconnecting = false;

  constructor(private authService: AuthService) {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    const token = this.authService.getToken();
    if (this.socket) {
        this.socket.disconnect();
    }
    
    this.socket = io(environment.socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      autoConnect: false // Don't connect automatically
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      // Reset reconnection attempts on successful connection
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      // Request initial messages immediately after connection
      this.socket.emit('requestInitChat');
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Connection Error:', err.message);
      this.handleConnectionError();
    });

    this.socket.on('auth_error', (data) => {
      console.error('🔒 Authentication Error:', data.message);
      this.handleAuthError(data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      // Only attempt reconnection for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.handleConnectionError();
      }
    });

    this.socket.on('messageBroadcast', (message: any) => {
      console.log('Received messageBroadcast:', message);
      // Ensure the timestamp is a proper Date object
      const parsedMessage: ChatMessage = {
        username: message.username,
        text: message.text,
        timestamp: new Date(message.timestamp)
      };
      
      // Add message to local array and notify subscribers
      this.addMessage(parsedMessage);
      this.newMessageSubject.next(parsedMessage);
    });

    this.socket.on('initChat', (messages: any[]) => {
      console.log('Received initChat with', messages.length, 'messages');
      // Parse dates for all messages
      const parsedMessages = messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      this.messages = parsedMessages.slice(-this.MAX_MESSAGES);
      this.initChatSubject.next(this.messages);
    });
    
    // Connect immediately
    this.connect();
  }

  /**
   * Handles authentication errors with token refresh logic
   */
  private handleAuthError(data: { message: string }): void {
    console.log('🔄 Handling auth error, attempting token refresh...');
    
    // Don't attempt refresh if already in progress
    if (this.isReconnecting) {
      console.log('Already reconnecting, skipping auth error handling');
      return;
    }

    this.isReconnecting = true;

    // Check if token is expired and attempt refresh
    if (this.authService.isTokenExpired()) {
      console.log('Token is expired, attempting refresh...');
      
      this.authService.refreshToken().subscribe({
        next: (response) => {
          console.log('✅ Token refreshed, reconnecting socket...');
          this.reconnectWithNewToken();
        },
        error: (error) => {
          console.error('❌ Token refresh failed:', error);
          // Reset reconnection flag
          this.isReconnecting = false;
          
          // Emit auth error to components for user notification
          this.authErrorSubject.next({
            message: 'Session expired. Please log in again.'
          });
          
          // Optionally logout user
          this.authService.logout();
        }
      });
    } else {
      // Token should be valid, but auth still failed
      console.error('Auth failed with valid token, may need to logout');
      this.isReconnecting = false;
      this.authErrorSubject.next(data);
    }
  }

  /**
   * Handles connection errors with exponential backoff
   */
  private handleConnectionError(): void {
    if (this.isReconnecting) {
      return; // Prevent multiple simultaneous reconnection attempts
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection attempts.`);
      this.authErrorSubject.next({
        message: 'Connection failed. Please check your internet connection and try again.'
      });
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

    this.reconnectTimeout = setTimeout(() => {
      // Check if token is expired before attempting reconnection
      if (this.authService.isTokenExpired()) {
        console.log('Token expired during reconnection, refreshing...');
        this.handleAuthError({ message: 'Token expired during reconnection' });
      } else {
        console.log('Attempting to reconnect with existing token...');
        this.isReconnecting = false;
        this.connect();
      }
    }, delay);
  }

  connect(): void {
    if (!this.socket || this.socket.disconnected) {
      console.log('🔌 Connecting socket...');
      this.socket.connect();
    }
  }

  disconnect(): void {
    // Clear any pending reconnection timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Reset reconnection state
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
    this.messages = [];
  }

  reconnectWithNewToken(): void {
    console.log('🔄 ChatService: Reconnecting with new token...');
    this.disconnect();
    this.initializeSocket();
  }

  sendMessage(text: string): void {
    if (text && text.trim() !== '') {
      // Check token expiration before sending
      if (this.authService.isTokenExpired(60)) { // 1 minute before expiry
        console.log('Token about to expire, refreshing before sending message...');
        this.authService.refreshToken().subscribe({
          next: () => {
            this.sendMessageInternal(text);
          },
          error: (error) => {
            console.error('Failed to refresh token before sending message:', error);
            this.authErrorSubject.next({
              message: 'Session expired. Please log in again.'
            });
          }
        });
      } else {
        this.sendMessageInternal(text);
      }
    }
  }

  private sendMessageInternal(text: string): void {
    if (this.socket.connected) {
      console.log('📤 Sending message:', text);
      this.socket.emit('newMessage', text);
    } else {
      console.warn('Socket not connected, trying to reconnect...');
      this.connect();
      // Use a longer timeout to ensure connection is established
      setTimeout(() => {
        if (this.socket.connected) {
          console.log('Reconnected, sending message:', text);
          this.socket.emit('newMessage', text);
        } else {
          console.error('❌ Failed to send message: Socket still not connected');
        }
      }, 1000);
    }
  }

  onNewMessage(): Observable<ChatMessage> {
    return this.newMessageSubject.asObservable();
  }

  onInitChat(): Observable<ChatMessage[]> {
    return this.initChatSubject.asObservable();
  }

  private addMessage(message: ChatMessage): void {
    this.messages.push(message);
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages.shift();
    }
  }

  getMessages(): ChatMessage[] {
    return this.messages;
  }

  onAuthError(): Observable<{ message: string }> {
    return this.authErrorSubject.asObservable();
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.socket && this.socket.connected;
  }

  /**
   * Get reconnection status information
   */
  getConnectionStatus(): { connected: boolean; reconnecting: boolean; attempts: number } {
    return {
      connected: this.isConnected(),
      reconnecting: this.isReconnecting,
      attempts: this.reconnectAttempts
    };
  }
}
