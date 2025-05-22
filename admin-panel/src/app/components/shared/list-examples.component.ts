import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NumberedListDirective } from '../../directives/numbered-list.directive';

@Component({
  selector: 'app-list-examples',
  standalone: true,
  imports: [CommonModule, NumberedListDirective],
  template: `
    <div class="list-examples-container">
      <h2>Numbered List Examples</h2>
      
      <h3>Circle Style (Default)</h3>
      <ol numbered-list="circle">
        <li>First item in the circular numbered list</li>
        <li>Second item in the circular numbered list</li>
        <li>Third item in the circular numbered list</li>
      </ol>
      
      <h3>Box Style</h3>
      <ol numbered-list="box">
        <li>First item in the box numbered list</li>
        <li>Second item in the box numbered list</li>
        <li>Third item in the box numbered list</li>
      </ol>
      
      <h3>Step Style</h3>
      <ol numbered-list="step">
        <li>First step in the process</li>
        <li>Second step in the process</li>
        <li>Third step in the process</li>
      </ol>
      
      <h3>Timeline Style</h3>
      <ol numbered-list="timeline">
        <li>First event in the timeline</li>
        <li>Second event in the timeline</li>
        <li>Third event in the timeline</li>
      </ol>
      
      <h3>Card Style</h3>
      <ol numbered-list="card">
        <li>First card item</li>
        <li>Second card item</li>
        <li>Third card item</li>
        <li>Fourth card item</li>
      </ol>
    </div>
  `,
  styles: [`
    .list-examples-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    
    h2 {
      color: #6200ea;
      margin-bottom: 1.5rem;
    }
    
    h3 {
      color: #3700b3;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }
  `]
})
export class ListExamplesComponent {
  // No additional logic needed
}
