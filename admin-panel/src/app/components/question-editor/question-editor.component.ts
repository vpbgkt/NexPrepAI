import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MathDisplayComponent } from '../math-display/math-display.component';

interface MathSymbol {
  symbol: string;
  latex: string;
  name: string;
}

interface QuestionOption {
  text: string;
}

@Component({
  selector: 'app-question-editor',
  imports: [CommonModule, FormsModule, MathDisplayComponent],
  templateUrl: './question-editor.component.html',
  styleUrl: './question-editor.component.scss'
})
export class QuestionEditorComponent implements OnInit {
  
  // Question data
  questionText: string = '';
  options: QuestionOption[] = [
    { text: '' },
    { text: '' },
    { text: '' },
    { text: '' }
  ];
  correctAnswerIndex: number = 0;
  difficulty: string = 'medium';
  subject: string = '';
  topic: string = '';
  points: number = 1;

  // UI state
  showPreview: boolean = false;

  // Mathematical symbols for toolbar
  greekSymbols: MathSymbol[] = [
    { symbol: 'α', latex: '\\alpha', name: 'Alpha' },
    { symbol: 'β', latex: '\\beta', name: 'Beta' },
    { symbol: 'γ', latex: '\\gamma', name: 'Gamma' },
    { symbol: 'δ', latex: '\\delta', name: 'Delta' },
    { symbol: 'ε', latex: '\\epsilon', name: 'Epsilon' },
    { symbol: 'θ', latex: '\\theta', name: 'Theta' },
    { symbol: 'λ', latex: '\\lambda', name: 'Lambda' },
    { symbol: 'μ', latex: '\\mu', name: 'Mu' },
    { symbol: 'π', latex: '\\pi', name: 'Pi' },
    { symbol: 'σ', latex: '\\sigma', name: 'Sigma' },
    { symbol: 'φ', latex: '\\phi', name: 'Phi' },
    { symbol: 'ω', latex: '\\omega', name: 'Omega' }
  ];

  operators: MathSymbol[] = [
    { symbol: '±', latex: '\\pm', name: 'Plus-minus' },
    { symbol: '×', latex: '\\times', name: 'Times' },
    { symbol: '÷', latex: '\\div', name: 'Division' },
    { symbol: '≠', latex: '\\neq', name: 'Not equal' },
    { symbol: '≤', latex: '\\leq', name: 'Less than or equal' },
    { symbol: '≥', latex: '\\geq', name: 'Greater than or equal' },
    { symbol: '∞', latex: '\\infty', name: 'Infinity' },
    { symbol: '√', latex: '\\sqrt{}', name: 'Square root' },
    { symbol: '∑', latex: '\\sum', name: 'Sum' },
    { symbol: '∫', latex: '\\int', name: 'Integral' }
  ];

  relations: MathSymbol[] = [
    { symbol: '≈', latex: '\\approx', name: 'Approximately' },
    { symbol: '≡', latex: '\\equiv', name: 'Equivalent' },
    { symbol: '∈', latex: '\\in', name: 'Element of' },
    { symbol: '∉', latex: '\\notin', name: 'Not element of' },
    { symbol: '⊂', latex: '\\subset', name: 'Subset' },
    { symbol: '⊃', latex: '\\supset', name: 'Superset' },
    { symbol: '∪', latex: '\\cup', name: 'Union' },
    { symbol: '∩', latex: '\\cap', name: 'Intersection' }
  ];

  commonExpressions = [
    { display: 'x²', latex: 'x^2', description: 'X squared' },
    { display: 'x₁', latex: 'x_1', description: 'X subscript 1' },
    { display: '½', latex: '\\frac{1}{2}', description: 'One half' },
    { display: 'aⁿ', latex: 'a^n', description: 'A to the power n' },
    { display: '∛x', latex: '\\sqrt[3]{x}', description: 'Cube root of x' },
    { display: 'log₂', latex: '\\log_2', description: 'Log base 2' }
  ];

  // Sample data (would come from API in real app)
  subjects = [
    { id: 1, name: 'Mathematics' },
    { id: 2, name: 'Physics' },
    { id: 3, name: 'Chemistry' }
  ];

  topics = [
    { id: 1, name: 'Algebra' },
    { id: 2, name: 'Calculus' },
    { id: 3, name: 'Geometry' }
  ];

  constructor() {}

  ngOnInit(): void {}

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  insertSymbol(latex: string): void {
    this.questionText += ` \\(${latex}\\) `;
  }

  applyFormatting(type: 'bold' | 'italic' | 'bullet'): void {
    const formats = {
      bold: '**text**',
      italic: '*text*',
      bullet: '- item'
    };
    this.questionText += ` ${formats[type]} `;
  }

  addOption(): void {
    if (this.options.length < 6) {
      this.options.push({ text: '' });
    }
  }

  removeOption(index: number): void {
    if (this.options.length > 2) {
      this.options.splice(index, 1);
      if (this.correctAnswerIndex >= this.options.length) {
        this.correctAnswerIndex = this.options.length - 1;
      }
    }
  }

  saveQuestion(): void {
    const questionData = {
      text: this.questionText,
      options: this.options,
      correctAnswer: this.correctAnswerIndex,
      difficulty: this.difficulty,
      subject: this.subject,
      topic: this.topic,
      points: this.points
    };
    
    console.log('Saving question:', questionData);
    // Here you would call your API to save the question
  }

  isValid(): boolean {
    return this.questionText.trim() !== '' && 
           this.options.every(opt => opt.text.trim() !== '') &&
           this.subject !== '' &&
           this.topic !== '';
  }

  // Helper to convert index to letter
  String = String;
}
