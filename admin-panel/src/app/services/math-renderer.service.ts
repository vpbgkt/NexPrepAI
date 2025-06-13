/**
 * @fileoverview Mathematical Content Rendering Service for NexPrepAI Admin Panel
 * @description Angular service providing comprehensive mathematical equation rendering
 * using KaTeX library. Supports LaTeX expressions, formatting processing, and safe
 * HTML rendering for exam questions and mathematical content.
 * @module MathRendererService
 * @requires katex
 * @author NexPrepAI Development Team
 * @since 1.0.0
 */

import { Injectable } from '@angular/core';
import * as katex from 'katex';

/**
 * @interface MathRenderOptions
 * @description Configuration options for mathematical content rendering
 */
export interface MathRenderOptions {
  /** Whether to throw errors on invalid LaTeX or render them in red */
  throwOnError?: boolean;
  /** Whether to render in display mode (block) or inline mode */
  displayMode?: boolean;
  /** Output format for the rendered content */
  output?: 'html' | 'mathml' | 'htmlAndMathml';
  /** Whether to add line breaks for long expressions */
  lineBreaks?: boolean;
  /** Custom macros for LaTeX expressions */
  macros?: { [key: string]: string };
}

/**
 * @class MathRendererService
 * @description Comprehensive mathematical content rendering service providing:
 * - LaTeX expression parsing and rendering via KaTeX
 * - Text formatting support (bold, italic, bullet points)
 * - Line break and paragraph processing  
 * - Safe HTML generation for mathematical content
 * - Custom macro support for complex expressions
 * - Error handling for invalid mathematical syntax
 * 
 * @example
 * ```typescript
 * // Inject service into component
 * constructor(private mathRenderer: MathRendererService) {}
 * 
 * // Render mathematical expression
 * const rendered = this.mathRenderer.renderMath('\\frac{x}{y}');
 * 
 * // Process formatted text with math
 * const formatted = this.mathRenderer.processFormattedText(
 *   'Calculate \\(\\frac{a}{b}\\) where **a** is positive'
 * );
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class MathRendererService {

  /** Default rendering options for mathematical expressions */
  private readonly defaultOptions: MathRenderOptions = {
    throwOnError: false,
    displayMode: false,
    output: 'html',
    lineBreaks: true,
    macros: {
      "\\f": "#1f(#2)",
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}",
      "\\Q": "\\mathbb{Q}",
      "\\R": "\\mathbb{R}",
      "\\C": "\\mathbb{C}"
    }
  };

  constructor() {
    // Initialize KaTeX with default settings
    console.log('MathRendererService initialized with KaTeX version:', katex.version);
  }

  /**
   * @method renderMath
   * @description Renders a LaTeX mathematical expression to HTML using KaTeX
   * 
   * @param {string} expression - LaTeX expression to render
   * @param {MathRenderOptions} options - Custom rendering options
   * @returns {string} Rendered HTML string
   * 
   * @example
   * ```typescript
   * // Basic fraction
   * const html = this.renderMath('\\frac{x^2}{y+1}');
   * 
   * // Display mode equation
   * const displayHtml = this.renderMath('\\int_{-\\infty}^{\\infty} e^{-x^2} dx', {
   *   displayMode: true
   * });
   * 
   * // Complex expression with Greek letters
   * const complexHtml = this.renderMath('\\alpha + \\beta = \\gamma');
   * ```
   */
  renderMath(expression: string, options?: MathRenderOptions): string {
    try {
      const renderOptions = { ...this.defaultOptions, ...options };
      
      // Clean and prepare the expression
      const cleanExpression = this.preprocessExpression(expression);
      
      return katex.renderToString(cleanExpression, renderOptions);
    } catch (error) {
      console.error('KaTeX rendering error:', error);
      return `<span class="math-error text-red-600 bg-red-50 px-2 py-1 rounded border">${expression}</span>`;
    }
  }

  /**
   * @method processFormattedText
   * @description Processes text containing mixed content: LaTeX math, formatting, and plain text
   * Supports inline math \\(...\\), display math \\[...\\], bullet points, and text formatting
   * 
   * @param {string} text - Raw text with mathematical expressions and formatting
   * @returns {string} Processed HTML with rendered math and formatting
   * 
   * @example
   * ```typescript
   * // Mixed content processing
   * const input = `
   *   **Question:** Calculate \\(\\frac{x^2 + y^2}{z}\\) where:
   *   • x = 5
   *   • y = 3  
   *   • z = 2
   *   
   *   The answer is \\[\\frac{25 + 9}{2} = 17\\]
   * `;
   * const processed = this.processFormattedText(input);
   * ```
   */
  processFormattedText(text: string): string {
    if (!text) return '';

    let processed = text;

    // Step 1: Process display math \\[...\\] (block equations)
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
      const rendered = this.renderMath(math.trim(), { displayMode: true });
      return `<div class="math-display my-4 text-center">${rendered}</div>`;
    });

    // Step 2: Process inline math \\(...\\)
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
      const rendered = this.renderMath(math.trim(), { displayMode: false });
      return `<span class="math-inline">${rendered}</span>`;
    });

    // Step 3: Process bullet points
    processed = this.processBulletPoints(processed);

    // Step 4: Process text formatting
    processed = this.processTextFormatting(processed);

    // Step 5: Process line breaks
    processed = this.processLineBreaks(processed);

    return processed;
  }

  /**
   * @method processBulletPoints
   * @description Converts bullet point markers to HTML list format
   * 
   * @param {string} text - Text containing bullet points
   * @returns {string} Text with HTML list formatting
   * 
   * @example
   * ```typescript
   * const input = "• First point\n• Second point\n• Third point";
   * const output = this.processBulletPoints(input);
   * // Returns: <ul><li>First point</li><li>Second point</li><li>Third point</li></ul>
   * ```
   */
  private processBulletPoints(text: string): string {
    // Find sequences of bullet points
    const bulletRegex = /(?:^|\n)((?:•[^\n]*(?:\n|$))+)/gm;
      return text.replace(bulletRegex, (match, bulletSection) => {
      // Split into individual bullet points
      const bullets = bulletSection
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.startsWith('•'))
        .map((line: string) => line.substring(1).trim());

      if (bullets.length === 0) return match;

      const listItems = bullets
        .map((bullet: string) => `<li class="mb-1">${bullet}</li>`)
        .join('');

      return `<ul class="list-none ml-4 my-2 space-y-1">${listItems}</ul>`;
    });
  }

  /**
   * @method processTextFormatting
   * @description Processes markdown-style text formatting (bold, italic)
   * 
   * @param {string} text - Text with markdown formatting
   * @returns {string} Text with HTML formatting
   * 
   * @example
   * ```typescript
   * const formatted = this.processTextFormatting('This is **bold** and *italic* text');
   * // Returns: 'This is <strong>bold</strong> and <em>italic</em> text'
   * ```
   */
  private processTextFormatting(text: string): string {
    let formatted = text;

    // Bold text **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

    // Italic text *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // Underlined text __text__
    formatted = formatted.replace(/__(.*?)__/g, '<u class="underline">$1</u>');

    return formatted;
  }

  /**
   * @method processLineBreaks
   * @description Converts line breaks to HTML paragraph and break tags
   * 
   * @param {string} text - Text with line breaks
   * @returns {string} Text with HTML line break formatting
   */
  private processLineBreaks(text: string): string {
    // Convert double line breaks to paragraphs
    let processed = text.replace(/\n\s*\n/g, '</p><p class="mb-4">');
    
    // Wrap in paragraph tags if content exists
    if (processed.trim()) {
      processed = `<p class="mb-4">${processed}</p>`;
    }

    // Convert single line breaks to <br> tags
    processed = processed.replace(/\n/g, '<br>');

    return processed;
  }

  /**
   * @method preprocessExpression
   * @description Cleans and prepares LaTeX expressions for KaTeX rendering
   * 
   * @param {string} expression - Raw LaTeX expression
   * @returns {string} Cleaned LaTeX expression
   */
  private preprocessExpression(expression: string): string {
    let cleaned = expression.trim();

    // Remove any HTML tags that might interfere
    cleaned = cleaned.replace(/<[^>]*>/g, '');

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Handle common LaTeX variants
    cleaned = cleaned.replace(/\\dfrac/g, '\\frac'); // Display fractions
    cleaned = cleaned.replace(/\\tfrac/g, '\\frac'); // Text fractions

    return cleaned;
  }

  /**
   * @method renderComplexFraction
   * @description Helper method for rendering complex nested fractions
   * 
   * @param {string} numerator - Numerator expression
   * @param {string} denominator - Denominator expression
   * @param {boolean} displayMode - Whether to render in display mode
   * @returns {string} Rendered fraction HTML
   * 
   * @example
   * ```typescript
   * // Create complex fraction: (x/y) / (a/b)
   * const complexFraction = this.renderComplexFraction(
   *   '\\frac{x}{y}',
   *   '\\frac{a}{b}',
   *   true
   * );
   * ```
   */
  renderComplexFraction(numerator: string, denominator: string, displayMode: boolean = true): string {
    const fractionExpression = `\\frac{${numerator}}{${denominator}}`;
    return this.renderMath(fractionExpression, { displayMode });
  }

  /**
   * @method isValidLaTeX
   * @description Validates whether a string contains valid LaTeX syntax
   * 
   * @param {string} expression - LaTeX expression to validate
   * @returns {boolean} True if valid LaTeX, false otherwise
   */
  isValidLaTeX(expression: string): boolean {
    try {
      katex.renderToString(expression, { throwOnError: true });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * @method getCommonMathSymbols
   * @description Returns a reference object of common mathematical symbols for the editor
   * 
   * @returns {Object} Collection of mathematical symbols organized by category
   */
  getCommonMathSymbols() {
    return {
      greek: {
        'α (alpha)': '\\alpha',
        'β (beta)': '\\beta',
        'γ (gamma)': '\\gamma',
        'δ (delta)': '\\delta',
        'ε (epsilon)': '\\epsilon',
        'θ (theta)': '\\theta',
        'λ (lambda)': '\\lambda',
        'μ (mu)': '\\mu',
        'π (pi)': '\\pi',
        'σ (sigma)': '\\sigma',
        'φ (phi)': '\\phi',
        'ω (omega)': '\\omega'
      },
      operators: {
        'Fraction': '\\frac{a}{b}',
        'Square root': '\\sqrt{x}',
        'Nth root': '\\sqrt[n]{x}',
        'Integral': '\\int',
        'Double integral': '\\iint',
        'Triple integral': '\\iiint',
        'Summation': '\\sum_{i=1}^{n}',
        'Product': '\\prod_{i=1}^{n}',
        'Limit': '\\lim_{x \\to a}'
      },
      symbols: {
        'Plus minus': '\\pm',
        'Infinity': '\\infty',
        'Partial': '\\partial',
        'Nabla': '\\nabla',
        'Not equal': '\\neq',
        'Less than equal': '\\leq',
        'Greater than equal': '\\geq',
        'Approximately': '\\approx',
        'Proportional': '\\propto'
      }
    };
  }
}
