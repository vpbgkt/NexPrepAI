import { Component, Input, OnChanges, SimpleChanges, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as katex from 'katex';

@Component({
  selector: 'app-math-display',
  imports: [CommonModule],
  template: `
    <div 
      class="math-content-container"
      [class.math-display-mode]="displayMode"
      [class.math-inline-mode]="!displayMode"
      [innerHTML]="renderedContent">
    </div>
  `,
  styleUrl: './math-display.component.scss'
})
export class MathDisplayComponent implements OnInit, OnChanges {
  
  @Input() content: string = '';
  @Input() allowFormatting: boolean = true;
  @Input() displayMode: boolean = false;
  @Input() throwOnError: boolean = false;

  renderedContent: SafeHtml = '';

  constructor(
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.processContent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] || changes['allowFormatting'] || changes['displayMode']) {
      this.processContent();
    }
  }

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

  refresh(): void {
    this.processContent();
  }
}
