// filepath: c:\\Users\\vpbgk\\OneDrive\\Desktop\\project\\NexPrep\\admin-panel\\src\\app\\pipes\\highlight.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | undefined | null, args: string | undefined | null): SafeHtml | string {
    if (!args || args.trim() === '' || !value) {
      return value || '';
    }

    // Ensure args is a string for regex
    const searchTerm = String(args).trim();
    if (searchTerm === '') {
        return value;
    }

    // Case-insensitive replacement
    const re = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&'), 'gi');
    const match = value.match(re);

    if (!match) {
      return value;
    }

    const highlightedText = value.replace(re, (matched) => `<strong class=\"search-highlight\">${matched}</strong>`);
    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }
}
