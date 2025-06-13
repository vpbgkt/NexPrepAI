/**
 * @fileoverview Mathematical Content Display Component for NexPrep Frontend
 * @description Reusable Angular component for rendering mathematical expressions and
 * formatted content in exam questions. Provides safe HTML rendering with KaTeX
 * support and comprehensive text formatting capabilities.
 * @module MathContentComponent
 * @author NexPrep Development Team
 * @since 1.0.0
 */

import { Component, Input, OnChanges, SimpleChanges, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as katex from 'katex';

/**
 * @class MathContentComponent
 * @description Advanced component for rendering mathematical and formatted content with:
 * - KaTeX mathematical expression rendering
 * - Text formatting (bold, italic, bullet points)
 * - Safe HTML sanitization and security
 * - Responsive design for mobile and desktop
 * - Error handling for invalid mathematical syntax
 * - Performance optimization with change detection
 * 
 * @example
 * ```html
 * <!-- Basic mathematical content -->
 * <app-math-content 
 *   [content]="questionText"
 *   [allowFormatting]="true">
 * </app-math-content>
 * 
 * <!-- Options with math -->
 * <app-math-content 
 *   *ngFor="let option of questionOptions"
 *   [content]="option.text"
 *   [allowFormatting]="true"
 *   [displayMode]="false">
 * </app-math-content>
 * ```
 */
@Component({
  selector: 'app-math-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="math-content-container"
      [class.math-display-mode]="displayMode"
      [class.math-inline-mode]="!displayMode"
      [innerHTML]="renderedContent">
    </div>
  `,
  styles: [`
    .math-content-container {
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #333;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    .math-display-mode {
      text-align: center;
      margin: 1em 0;
    }

    .math-inline-mode {
      display: inline;
    }

    .math-content-container .katex {
      font-size: 1.1em;
    }

    .math-content-container .katex-display {
      margin: 0.5em 0;
      text-align: center;
    }

    .math-content-container strong {
      font-weight: 600;
      color: #2c3e50;
    }

    .math-content-container em {
      font-style: italic;
      color: #34495e;
    }

    .math-content-container ul {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    .math-content-container li {
      margin: 0.25em 0;
      line-height: 1.4;
    }

    .math-error {
      color: #e74c3c;
      background-color: #fdf2f2;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 0.9em;
      border: 1px solid #fecaca;
    }

    /* Responsive design for mobile devices */
    @media (max-width: 768px) {
      .math-content-container {
        font-size: 0.95em;
      }

      .math-content-container .katex {
        font-size: 1em;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .math-content-container {
        color: #000;
      }

      .math-content-container strong {
        color: #000;
      }

      .math-error {
        color: #8b0000;
        background-color: #ffe6e6;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .math-content-container * {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class MathContentComponent implements OnInit, OnChanges {
  
  /**
   * @property {string} content - Raw content with mathematical expressions and formatting
   * @example 'Calculate \\(\\frac{x}{y}\\) where **x** is positive'
   */
  @Input() content: string = '';

  /**
   * @property {boolean} allowFormatting - Enable text formatting (bold, italic, lists)
   * @default true
   */
  @Input() allowFormatting: boolean = true;

  /**
   * @property {boolean} displayMode - Render mathematics in display mode (centered, larger)
   * @default false
   */
  @Input() displayMode: boolean = false;

  /**
   * @property {boolean} throwOnError - Throw errors for invalid LaTeX instead of rendering error message
   * @default false
   */
  @Input() throwOnError: boolean = false;

  /**
   * @property {SafeHtml} renderedContent - Processed and sanitized HTML content
   * @description Contains the final rendered content ready for innerHTML binding
   */
  renderedContent: SafeHtml = '';
  /**
   * @constructor
   * @param {DomSanitizer} sanitizer - Angular DOM sanitizer for safe HTML rendering
   * @param {ElementRef} elementRef - Reference to the component's DOM element
   */
  constructor(
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef
  ) {}

  /**
   * @lifecycle OnInit
   * @description Initialize component and process initial content
   */
  ngOnInit(): void {
    this.processContent();
  }

  /**
   * @lifecycle OnChanges
   * @description React to input property changes and reprocess content
   * @param {SimpleChanges} changes - Angular change detection object
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] || changes['allowFormatting'] || changes['displayMode']) {
      this.processContent();
    }
  }
  /**
   * @private
   * @method processContent
   * @description Core content processing method that handles mathematical expressions and formatting
   * @throws {Error} When throwOnError is true and LaTeX parsing fails
   */
  private processContent(): void {
    try {
      if (!this.content) {
        this.renderedContent = this.sanitizer.bypassSecurityTrustHtml('');
        return;
      }

      let processedContent = this.content;

      // Process mathematical expressions
      processedContent = this.renderMathExpressions(processedContent);

      // Process text formatting if enabled
      if (this.allowFormatting) {
        processedContent = this.processTextFormatting(processedContent);
      }

      // Sanitize and set the rendered content
      this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);

    } catch (error) {
      console.error('Error processing mathematical content:', error);
      
      if (this.throwOnError) {
        throw error;
      }

      // Fallback: render error message
      const errorMessage = `<span class="math-error">Error rendering content: ${error instanceof Error ? error.message : 'Unknown error'}</span>`;
      this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(errorMessage);
    }
  }

  /**
   * @private
   * @method renderMathExpressions
   * @description Process LaTeX mathematical expressions in the content
   */
  private renderMathExpressions(content: string): string {
    // Handle display math: \\[...\\] or $$...$$
    content = content.replace(/\\\[(.+?)\\\]/g, (match, latex) => {
      try {
        return katex.renderToString(latex.trim(), { displayMode: true, throwOnError: this.throwOnError });
      } catch (error) {
        return `<span class="math-error">Math Error: ${error instanceof Error ? error.message : 'Invalid LaTeX'}</span>`;
      }
    });

    content = content.replace(/\$\$(.+?)\$\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex.trim(), { displayMode: true, throwOnError: this.throwOnError });
      } catch (error) {
        return `<span class="math-error">Math Error: ${error instanceof Error ? error.message : 'Invalid LaTeX'}</span>`;
      }
    });

    // Handle inline math: \\(...\\) or $...$
    content = content.replace(/\\\((.+?)\\\)/g, (match, latex) => {
      try {
        return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: this.throwOnError });
      } catch (error) {
        return `<span class="math-error">Math Error: ${error instanceof Error ? error.message : 'Invalid LaTeX'}</span>`;
      }
    });

    content = content.replace(/\$(.+?)\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: this.throwOnError });
      } catch (error) {
        return `<span class="math-error">Math Error: ${error instanceof Error ? error.message : 'Invalid LaTeX'}</span>`;
      }
    });

    return content;
  }

  /**
   * @private
   * @method processTextFormatting
   * @description Process text formatting like bold, italic, and bullet points
   */
  private processTextFormatting(content: string): string {
    // Bold: **text** -> <strong>text</strong>
    content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text* -> <em>text</em>
    content = content.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');
    
    // Bullet points: - item -> <ul><li>item</li></ul>
    content = content.replace(/^- (.+)$/gm, '<li>$1</li>');
    content = content.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return content;
  }

  /**
   * @public
   * @method refresh
   * @description Public method to manually refresh the content rendering
   */
  refresh(): void {
    this.processContent();
  }
}
