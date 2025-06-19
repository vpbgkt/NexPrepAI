import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { MathDisplayComponent } from '../math-display/math-display.component';

@Component({
  selector: 'app-math-test',
  standalone: true,
  imports: [CommonModule], // MathDisplayComponent
  templateUrl: './math-test.component.html',
  styleUrl: './math-test.component.scss'
})
export class MathTestComponent implements OnInit {
  // Mathematical content with proper escaping
  mathConstantsContent = "Mathematical constants: \\(\\pi \\approx 3.14159\\), \\(e \\approx 2.71828\\), \\(\\phi = \\frac{1 + \\sqrt{5}}{2}\\)";
  inlineMathContent = "The equation \\(x = \\frac{2}{3}\\) is simple.";
  displayMathContent = "\\[\\int_0^1 x^2 dx = \\frac{1}{3}\\]";
  questionContent = "Find the value of \\(\\frac{d}{dx}\\left[\\sin(x^2)\\right]\\)";
  greekLettersContent = "Common Greek letters: \\(\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\theta, \\lambda, \\pi, \\sigma, \\omega\\)";

  ngOnInit(): void {
    // This ensures the component lifecycle is properly initialized
    // which helps Angular's static analysis detect template usage
  }
  
  // Sample mathematical questions for testing
  sampleQuestions = [
    {
      id: 1,
      question: 'Calculate the integral: \\[\\int_{0}^{\\pi} \\sin(x) \\, dx\\]',
      options: [
        '\\(0\\)',
        '\\(2\\)',
        '\\(\\pi\\)',
        '\\(1\\)'
      ],
      correctAnswer: 1
    },
    {
      id: 2,
      question: 'Find the derivative of \\(f(x) = x^2 + 3x + 2\\)',
      options: [
        '\\(2x + 3\\)',
        '\\(x^2 + 3\\)',
        '\\(2x + 2\\)',
        '\\(x + 3\\)'
      ],
      correctAnswer: 0
    },
    {
      id: 3,
      question: 'Solve for \\(x\\): \\[\\frac{x^2 - 4}{x + 2} = 3\\]',
      options: [
        '\\(x = 5\\)',
        '\\(x = -5\\)',
        '\\(x = 5\\) or \\(x = -2\\)',
        'No solution'
      ],
      correctAnswer: 0
    },
    {
      id: 4,
      question: 'What is the value of \\(\\lim_{x \\to 0} \\frac{\\sin(x)}{x}\\)?',
      options: [
        '\\(0\\)',
        '\\(1\\)',
        '\\(\\infty\\)',
        'Undefined'
      ],
      correctAnswer: 1
    }
  ];

  // Sample question with complex formatting
  complexQuestion = `
    **Physics Problem**: A particle moves in a circle of radius \\(r = 5\\) meters with angular velocity \\(\\omega = 2\\) rad/s.

    *Given:*
    - Radius: \\(r = 5\\,\\text{m}\\)
    - Angular velocity: \\(\\omega = 2\\,\\text{rad/s}\\)
    - Acceleration due to gravity: \\(g = 9.8\\,\\text{m/s}^2\\)

    Calculate the following:
    \\[v = \\omega \\cdot r\\]
    \\[a_c = \\frac{v^2}{r} = \\omega^2 \\cdot r\\]
  `;

  // Greek letters and symbols demonstration
  greekLettersDemo = `
    **Greek Letters in Mathematics:**
    - Alpha: \\(\\alpha\\), Beta: \\(\\beta\\), Gamma: \\(\\gamma\\)
    - Delta: \\(\\Delta\\), Epsilon: \\(\\epsilon\\), Theta: \\(\\theta\\)
    - Lambda: \\(\\lambda\\), Pi: \\(\\pi\\), Sigma: \\(\\Sigma\\)
    - Phi: \\(\\phi\\), Omega: \\(\\omega\\)

    **Common Mathematical Operations:**
    - Square root: \\(\\sqrt{x}\\), Cube root: \\(\\sqrt[3]{x}\\)
    - Fractions: \\(\\frac{a}{b}\\), \\(\\frac{x^2 + 1}{x - 1}\\)
    - Exponents: \\(x^2\\), \\(e^{x}\\), \\(10^{-3}\\)
    - Logarithms: \\(\\log(x)\\), \\(\\ln(x)\\), \\(\\log_2(x)\\)
  `;

  // Chemical equations demonstration
  chemistryDemo = `
    **Chemical Equations:**
    - Water formation: \\(\\text{H}_2 + \\frac{1}{2}\\text{O}_2 \\rightarrow \\text{H}_2\\text{O}\\)
    - Photosynthesis: \\(6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{light}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2\\)
    - Quadratic formula: \\(x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\)
  `;

  String = String;
}
