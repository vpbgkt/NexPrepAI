import { Directive, ElementRef, Renderer2, Input, OnInit } from '@angular/core';

/**
 * Directive to apply custom serial number styling to ordered lists
 * Usage examples:
 * <ol numbered-list="circle"></ol> - Circle style numbers
 * <ol numbered-list="box"></ol> - Box style numbers
 * <ol numbered-list="timeline"></ol> - Timeline style numbers
 * <ol numbered-list="card"></ol> - Card style numbers
 * <ol numbered-list="step"></ol> - Step style numbers
 */
@Directive({
  selector: '[numbered-list]',
  standalone: true
})
export class NumberedListDirective implements OnInit {
  @Input('numbered-list') style: 'circle' | 'box' | 'timeline' | 'card' | 'step' = 'circle';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    // Apply appropriate class based on the selected style
    switch (this.style) {
      case 'circle':
        this.renderer.addClass(this.el.nativeElement, 'numbered-list');
        break;
      case 'box':
        this.renderer.addClass(this.el.nativeElement, 'box-numbered-list');
        break;
      case 'timeline':
        this.renderer.addClass(this.el.nativeElement, 'timeline-list');
        break;
      case 'card':
        this.renderer.addClass(this.el.nativeElement, 'card-list');
        break;
      case 'step':
        this.renderer.addClass(this.el.nativeElement, 'step-list');
        break;
      default:
        this.renderer.addClass(this.el.nativeElement, 'numbered-list');
    }
  }
}
