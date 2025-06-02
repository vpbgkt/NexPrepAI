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
          Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
        );
        
        if (!existingMessage) {
          this.messages.push(message);
          if (this.messages.length > 100) {
            this.messages.shift();
          }
          this.shouldScrollToBottom = true;
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
  }

  ngAfterViewChecked(): void {
    // Scroll to bottom after view is updated if needed
    if (this.shouldScrollToBottom && this.messagesArea) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesArea) {
        this.messagesArea.nativeElement.scrollTop = this.messagesArea.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    // Don't disconnect on destroy since this is a global chat
    // The ChatService will manage the connection across component lifecycles
  }
  sendMessage(): void {
    if (this.newMessage.trim() !== '') {
      console.log('Sending chat message:', this.newMessage);
      this.chatService.sendMessage(this.newMessage);
      this.newMessage = '';
      this.error = null;
      // Force scroll to bottom for better UX
      this.shouldScrollToBottom = true;
    } else {
      this.error = "Message cannot be empty";
    }
  }
}
