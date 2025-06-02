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

  constructor(private authService: AuthService) {
    this.initializeSocket();
  }  private initializeSocket(): void {
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
    });this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      // Request initial messages immediately after connection
      this.socket.emit('requestInitChat');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Connection Error:', err.message);
    });

    this.socket.on('auth_error', (data) => {
      console.error('Authentication Error:', data.message);
      this.authErrorSubject.next(data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
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

  connect(): void {
    if (!this.socket || this.socket.disconnected) {
      console.log('Connecting socket...');
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
    this.messages = [];
  }

  reconnectWithNewToken(): void {
    console.log('ChatService: Reconnecting with new token...');
    this.disconnect();
    this.initializeSocket();
  }
  sendMessage(text: string): void {
    if (text && text.trim() !== '') {
      if (this.socket.connected) {
        console.log('Sending message:', text);
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
            console.error('Failed to send message: Socket still not connected');
          }
        }, 1000);
      }
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
}
