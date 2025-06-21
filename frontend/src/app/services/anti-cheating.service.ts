import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface CheatingEvent {
  type: 'tab_switch' | 'fullscreen_exit' | 'copy_attempt' | 'paste_attempt' | 
        'right_click' | 'keyboard_shortcut' | 'mouse_leave' | 'window_blur' |
        'developer_tools' | 'screen_sharing' | 'suspicious_activity' | 'multiple_violations';
  severity?: 'low' | 'medium' | 'high';
  description?: string;
  questionIndex?: number;
  timeRemaining?: number;
  currentSection?: string;
  screenResolution?: string;
}

export interface CheatingStats {
  cheatingScore: number;
  totalAttempts: number;
  integrityStatus: 'clean' | 'flagged' | 'terminated';
  events: CheatingEvent[];
  isTerminated: boolean;
}

export interface StrictModeInfo {
  isStrictMode: boolean;
  mode: string;
  title: string;
  requiresFullscreen: boolean;
  monitoringEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AntiCheatingService {
  private baseUrl = '/api/tests';
  
  // Cheating tracking state
  private cheatingScore$ = new BehaviorSubject<number>(0);
  private totalAttempts$ = new BehaviorSubject<number>(0);
  private integrityStatus$ = new BehaviorSubject<string>('clean');
  
  // Violation thresholds
  private readonly SEVERITY_SCORES = {
    low: 1,
    medium: 3,
    high: 5
  };
  
  private readonly VIOLATION_TYPES = {
    // Low severity (1 point each)
    mouse_leave: 'low',
    right_click: 'low',
    tab_switch: 'low',
    
    // Medium severity (3 points each)
    fullscreen_exit: 'medium',
    copy_attempt: 'medium',
    paste_attempt: 'medium',
    keyboard_shortcut: 'medium',
    window_blur: 'medium',
    
    // High severity (5 points each)
    developer_tools: 'high',
    screen_sharing: 'high',
    suspicious_activity: 'high',
    multiple_violations: 'high'
  };

  constructor(private http: HttpClient) {}

  /**
   * Check if a test series requires strict mode
   */
  checkStrictMode(seriesId: string): Observable<{ success: boolean; data: StrictModeInfo }> {
    return this.http.get<{ success: boolean; data: StrictModeInfo }>(
      `${this.baseUrl}/series/${seriesId}/strict-mode`
    );
  }

  /**
   * Initialize strict mode for a test attempt
   */
  initializeStrictMode(attemptId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${attemptId}/strict-mode/init`, {});
  }

  /**
   * Log a cheating event
   */
  logCheatingEvent(attemptId: string, event: CheatingEvent): Observable<any> {
    const eventData = {
      ...event,
      severity: event.severity || this.classifyViolation(event.type),
      screenResolution: this.getScreenResolution()
    };

    return this.http.post(`${this.baseUrl}/${attemptId}/cheating-event`, eventData);
  }

  /**
   * Get cheating statistics for an attempt
   */
  getCheatingStats(attemptId: string): Observable<{ success: boolean; data: CheatingStats }> {
    return this.http.get<{ success: boolean; data: CheatingStats }>(
      `${this.baseUrl}/${attemptId}/cheating-stats`
    );
  }
  /**
   * Classify violation severity based on type
   */
  private classifyViolation(type: string): 'low' | 'medium' | 'high' {
    const severity = this.VIOLATION_TYPES[type as keyof typeof this.VIOLATION_TYPES];
    return (severity as 'low' | 'medium' | 'high') || 'medium';
  }

  /**
   * Get screen resolution for tracking
   */
  private getScreenResolution(): string {
    return `${screen.width}x${screen.height}`;
  }

  /**
   * Calculate severity score
   */
  getSeverityScore(severity: 'low' | 'medium' | 'high'): number {
    return this.SEVERITY_SCORES[severity];
  }

  // Observables for reactive UI updates
  get cheatingScore(): Observable<number> {
    return this.cheatingScore$.asObservable();
  }

  get totalAttempts(): Observable<number> {
    return this.totalAttempts$.asObservable();
  }

  get integrityStatus(): Observable<string> {
    return this.integrityStatus$.asObservable();
  }

  // Update local state
  updateCheatingStats(stats: CheatingStats): void {
    this.cheatingScore$.next(stats.cheatingScore);
    this.totalAttempts$.next(stats.totalAttempts);
    this.integrityStatus$.next(stats.integrityStatus);
  }
}

/**
 * Anti-Cheating Monitor Class
 * Handles all anti-cheating detection and prevention
 */
export class AntiCheatingMonitor {
  private isStrictMode = false;
  private attemptId: string | null = null;
  private isFullscreen = false;
  private tabSwitchCount = 0;
  private violationCount = 0;
  private lastWarningTime = 0;
  
  // Event listeners
  private eventListeners: Array<{ element: any; event: string; handler: any }> = [];
  
  constructor(
    private antiCheatingService: AntiCheatingService,
    private onViolation?: (event: CheatingEvent, shouldTerminate: boolean) => void,
    private onWarning?: (message: string, count: number) => void
  ) {}
  /**
   * Initialize anti-cheating monitoring for strict mode
   */
  initialize(attemptId: string, isStrictMode: boolean): void {
    this.attemptId = attemptId;
    this.isStrictMode = isStrictMode;
    this.violationCount = 0; // Reset violation count
    
    if (!isStrictMode) {
      console.log('Anti-cheating: Not a strict mode exam, monitoring disabled');
      return;
    }

    console.log('Anti-cheating: Initializing strict mode monitoring');
    
    // Load current violation count from backend
    this.loadCurrentViolationCount();
    
    this.setupFullscreenMonitoring();
    this.setupFocusMonitoring();
    this.setupKeyboardBlocking();
    this.setupContentProtection();
    this.setupVisibilityMonitoring();
    this.setupMouseMonitoring();
    this.enterFullscreen();
  }

  /**
   * Load current violation count from backend
   */
  private loadCurrentViolationCount(): void {
    if (!this.attemptId) return;
    
    this.antiCheatingService.getCheatingStats(this.attemptId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.violationCount = response.data.totalAttempts || 0;
          console.log('Anti-cheating: Loaded current violation count:', this.violationCount);
        }
      },
      error: (error) => {
        console.error('Anti-cheating: Failed to load violation count:', error);
        this.violationCount = 0;
      }
    });
  }

  /**
   * Cleanup all event listeners
   */
  cleanup(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Force fullscreen mode
   */
  private enterFullscreen(): void {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }

  /**
   * Public method to force fullscreen mode
   * Can be called by the exam player component when needed
   */
  forceFullscreen(): void {
    if (this.isStrictMode && this.attemptId) {
      this.enterFullscreen();
    }
  }

  /**
   * Check if currently in fullscreen
   */
  private checkFullscreenStatus(): boolean {
    return !!(document.fullscreenElement || 
             (document as any).webkitFullscreenElement || 
             (document as any).msFullscreenElement);
  }
  /**
   * Setup fullscreen monitoring
   */
  private setupFullscreenMonitoring(): void {
    const handler = () => {
      this.isFullscreen = this.checkFullscreenStatus();
      if (!this.isFullscreen) {
        // Automatically re-enter fullscreen mode
        setTimeout(() => {
          this.enterFullscreen();
        }, 100); // Small delay to ensure proper execution
        
        this.logViolation({
          type: 'fullscreen_exit',
          description: 'User exited fullscreen mode - automatically re-entering fullscreen'
        });
        
        // Give user 3 seconds to return to fullscreen, then check again
        setTimeout(() => {
          if (!this.checkFullscreenStatus()) {
            // Try to enter fullscreen again
            this.enterFullscreen();
            this.logViolation({
              type: 'multiple_violations',
              severity: 'high',
              description: 'Failed to return to fullscreen mode - forcing fullscreen again'
            });
          }
        }, 3000);
      }
    };

    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    document.addEventListener('msfullscreenchange', handler);
    
    this.eventListeners.push(
      { element: document, event: 'fullscreenchange', handler },
      { element: document, event: 'webkitfullscreenchange', handler },
      { element: document, event: 'msfullscreenchange', handler }
    );
  }
  /**
   * Setup focus monitoring
   */
  private setupFocusMonitoring(): void {
    const blurHandler = () => {
      this.tabSwitchCount++;      this.logViolation({
        type: 'window_blur',
        description: `Window lost focus - attempt #${this.tabSwitchCount}`
      });
    };

    const focusHandler = () => {
      // Log when focus returns
      console.log('Anti-cheating: Window regained focus');
    };

    window.addEventListener('blur', blurHandler);
    window.addEventListener('focus', focusHandler);
    
    this.eventListeners.push(
      { element: window, event: 'blur', handler: blurHandler },
      { element: window, event: 'focus', handler: focusHandler }
    );
  }  /**
   * Setup keyboard shortcuts blocking
   */
  private setupKeyboardBlocking(): void {
    const handler = (event: KeyboardEvent): boolean => {
      // Block common cheating shortcuts
      if (
        (event.altKey && event.key === 'Tab') ||
        (event.ctrlKey && event.key === 't') ||
        (event.ctrlKey && event.key === 'n') ||
        (event.ctrlKey && event.key === 'w') ||
        (event.ctrlKey && event.shiftKey && event.key === 'I') || // Dev tools
        event.key === 'F11' ||
        event.key === 'F12' // Dev tools
      ) {
        event.preventDefault();
        event.stopPropagation();
        this.logViolation({
          type: 'keyboard_shortcut',
          description: `Blocked keyboard shortcut: ${event.key}`
        });
        
        return false;
      }
      
      // Handle ESC key specifically for fullscreen exit attempts
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.logViolation({
          type: 'fullscreen_exit',
          description: 'Attempted to exit fullscreen using ESC key - if you want to exit, click on "Finish Exam" or "Submit Exam" button'
        });
        
        // Force fullscreen mode again
        setTimeout(() => {
          this.enterFullscreen();
        }, 100);
        
        return false;
      }
      
      return true;
    };

    document.addEventListener('keydown', handler, true);
    this.eventListeners.push({ element: document, event: 'keydown', handler });
  }

  /**
   * Setup content protection
   */
  private setupContentProtection(): void {
    const contextMenuHandler = (e: Event) => {
      e.preventDefault();
      this.logViolation({
        type: 'right_click',
        description: 'Right-click context menu blocked'
      });
    };

    const copyHandler = (e: Event) => {
      e.preventDefault();
      this.logViolation({
        type: 'copy_attempt',
        description: 'Copy operation blocked'
      });
    };

    const pasteHandler = (e: Event) => {
      e.preventDefault();
      this.logViolation({
        type: 'paste_attempt',
        description: 'Paste operation blocked'
      });
    };

    document.addEventListener('contextmenu', contextMenuHandler);
    document.addEventListener('copy', copyHandler);
    document.addEventListener('paste', pasteHandler);
    
    this.eventListeners.push(
      { element: document, event: 'contextmenu', handler: contextMenuHandler },
      { element: document, event: 'copy', handler: copyHandler },
      { element: document, event: 'paste', handler: pasteHandler }
    );
  }

  /**
   * Setup tab visibility monitoring
   */
  private setupVisibilityMonitoring(): void {
    const handler = () => {
      if (document.hidden) {        this.logViolation({
          type: 'tab_switch',
          description: 'User switched tabs or minimized window'
        });
      }
    };

    document.addEventListener('visibilitychange', handler);
    this.eventListeners.push({ element: document, event: 'visibilitychange', handler });
  }

  /**
   * Setup mouse monitoring
   */
  private setupMouseMonitoring(): void {
    const handler = () => {
      this.logViolation({
        type: 'mouse_leave',
        description: 'Mouse left exam window'
      });
    };

    document.addEventListener('mouseleave', handler);
    this.eventListeners.push({ element: document, event: 'mouseleave', handler });
  }
  /**
   * Log a violation
   */
  private logViolation(event: CheatingEvent): void {
    if (!this.isStrictMode || !this.attemptId) return;

    // Rate limiting to prevent spam
    const now = Date.now();
    if (now - this.lastWarningTime < 1000) return; // 1 second cooldown
    this.lastWarningTime = now;

    console.log('Anti-cheating: Logging violation:', event);
    
    this.antiCheatingService.logCheatingEvent(this.attemptId, {
      ...event,
      questionIndex: 0, // This would be set by the calling component
      timeRemaining: 0, // This would be set by the calling component
      currentSection: '' // This would be set by the calling component
    }).subscribe({
      next: (response) => {
        console.log('Anti-cheating: Violation logged response:', response);
        if (response.success && response.data) {
          // Update violation count from backend response
          this.violationCount = response.data.totalAttempts || (this.violationCount + 1);
          console.log('Anti-cheating: Updated violation count to:', this.violationCount);
          
          const shouldTerminate = response.data.shouldTerminate;
          
          if (this.onViolation) {
            this.onViolation(event, shouldTerminate);
          }
          
          if (this.onWarning && !shouldTerminate) {
            this.onWarning(
              `Security violation detected: ${event.description}`,
              this.violationCount
            );
          }
        }
      },
      error: (error) => {
        console.error('Failed to log cheating event:', error);
        // Still increment count locally as fallback
        this.violationCount++;
        
        if (this.onWarning) {
          this.onWarning(
            `Security violation detected: ${event.description}`,
            this.violationCount
          );
        }
      }
    });
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.isStrictMode && !!this.attemptId;
  }

  /**
   * Get current violation count
   */
  getViolationCount(): number {
    return this.violationCount;
  }
}
