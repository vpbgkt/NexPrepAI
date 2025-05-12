// admin-panel/src/app/components/add-question/add-question.component.ts
// ---------------------------------------------------------------------
// Multilingual (English / Hindi) question creator for NexPrep admin UI.
// ---------------------------------------------------------------------

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule, NgForm }       from '@angular/forms';
import { RouterModule }              from '@angular/router';

import { BranchService }   from '../../services/branch.service';
import { SubjectService }  from '../../services/subject.service';
import { TopicService }    from '../../services/topic.service';
import { SubtopicService } from '../../services/subtopic.service';
import { QuestionService } from '../../services/question.service';
import { Router }          from '@angular/router';

type LangCode = 'en' | 'hi';

interface Option   { text: string; img: string; isCorrect: boolean; }
interface Explain  { type: string; label: string; content: string; }
interface LangPack { questionText: string; options: Option[]; explanations: Explain[]; images?: string[]; }

@Component({
  selector   : 'app-add-question',
  standalone : true,
  imports    : [CommonModule, FormsModule, RouterModule],
  templateUrl: './add-question.component.html',
  styleUrls  : ['./add-question.component.scss']
})
export class AddQuestionComponent implements OnInit {

  /* ───────── injected services ───────── */
  private branchSrv   = inject(BranchService);
  private subjectSrv  = inject(SubjectService);
  private topicSrv    = inject(TopicService);
  private subtopicSrv = inject(SubtopicService);
  private questionSrv = inject(QuestionService);     // 👈 use this alias everywhere
  private router      = inject(Router);

  /* ───────── component state ───────── */
  currentLang: LangCode = 'en';
  tagsInputString: string = ''; // ADDED for ngModel binding

  question = {
    translations: <Record<LangCode, LangPack>>{
      en : { questionText: '', options: [ {text:'',img:'',isCorrect:false},
                                          {text:'',img:'',isCorrect:false} ],
             explanations: [], images: [] }, // Initialize images
      hi : { questionText: '', options: [ {text:'',img:'',isCorrect:false},
                                          {text:'',img:'',isCorrect:false} ],
             explanations: [], images: [] }  // Initialize images
    },
    difficulty : '',
    type       : 'single',
    status     : 'Draft', // Default status
    branchId   : '',
    subjectId  : '',
    topicId    : '',
    subtopicId : '',
    tags: [] as string[], // Initialize new field
    recommendedTimeAllotment: undefined as number | undefined, // Initialize new field
    internalNotes: '' // Initialize new field
  };

  branches:any[]=[]; subjects:any[]=[]; topics:any[]=[]; subtopics:any[]=[];
  currentYear = new Date().getFullYear();

  histEntry = { examName: '', year: this.currentYear };
  histList: { examName: string; year: number }[] = [];

  /* ───────────────────────────────────── */

  ngOnInit() {
    this.branchSrv.getBranches().subscribe({
      next: (data: any) => {
        // Assuming data might be an array directly or an object like { branches: [] }
        this.branches = Array.isArray(data) ? data : (data && data.branches ? data.branches : []);
        if (this.branches.length === 0 && !Array.isArray(data)) {
            // If data was an object but didn't have a .branches property, or it was empty
            console.warn('[AddQuestionComponent] ngOnInit: Branches data received but was not in expected format or was empty:', data);
        }
      },
      error: (err: any) => {
        console.error('[AddQuestionComponent] ngOnInit: Error fetching branches:', err);
        this.branches = []; // Ensure branches is empty on error
      }
    });
  }

  /* --- helpers --- */
  switchLanguage(lang:LangCode){ this.currentLang=lang; }
  get langPack():LangPack{ // REMOVED private keyword
    // Ensure the langPack for the current language exists and has images initialized
    if (!this.question.translations[this.currentLang]) {
      this.question.translations[this.currentLang] = {
        questionText: '',
        options: [{text:'',img:'',isCorrect:false}, {text:'',img:'',isCorrect:false}],
        explanations: [],
        images: []
      };
    } else if (!this.question.translations[this.currentLang].images) {
      this.question.translations[this.currentLang].images = [];
    }
    return this.question.translations[this.currentLang];
  }

  addOption() { this.langPack.options.push({text:'',img:'',isCorrect:false}); }
  removeOption(i:number){ if(this.langPack.options.length>2) this.langPack.options.splice(i,1); }

  addExplanation(){ this.langPack.explanations.push({type:'text',label:'',content:''}); }
  removeExplanation(i:number){ this.langPack.explanations.splice(i,1); }

  // ADDED: Methods to manage question images for the current translation
  addQuestionImage(): void {
    if (!this.langPack.images) { // Defensive check
        this.langPack.images = [];
    }
    this.langPack.images!.push('');
  }

  removeQuestionImage(imgIndex: number): void {
    if (this.langPack.images) {
        this.langPack.images!.splice(imgIndex, 1);
    }
  }

  // ADDED: Method to manage option image (sets to empty string for now)
  removeOptionImage(optionIndex: number): void {
    if (this.langPack.options && this.langPack.options[optionIndex]) {
      this.langPack.options[optionIndex].img = '';
    }
  }
  
  // ADDED: Method to handle changes to the tags input string
  onTagsInputChange(value: string): void {
    this.tagsInputString = value; // Keep the input field's value as is
    if (value && value.trim() !== '') {
      this.question.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    } else {
      this.question.tags = [];
    }
  }

  addHistory() {
    if (this.histEntry.examName.trim()) {
      this.histList.push({ ...this.histEntry });
      this.histEntry = { examName: '', year: this.currentYear };
    }
  }

  /* --- cascades --- */
  onBranchChange(id:string){
    this.question.branchId=id; this.subjects=this.topics=this.subtopics=[];
    this.question.subjectId=this.question.topicId=this.question.subtopicId='';
    if(id) this.subjectSrv.getSubjects(id).subscribe(s=>this.subjects=s);
  }
  onSubjectChange(id:string){
    this.question.subjectId=id; this.topics=this.subtopics=[];
    this.question.topicId=this.question.subtopicId='';
    if(id) this.topicSrv.getTopics(id).subscribe(t=>this.topics=t);
  }
  onTopicChange(id:string){
    this.question.topicId=id; this.subtopics=[]; this.question.subtopicId='';
    if(id) this.subtopicSrv.getSubtopics(id).subscribe(st=>this.subtopics=st);
  }

  /* ───────── submit ───────── */
  addQuestion(form: NgForm) { this.submit(form); }

  submit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    // ----- build payload -------------------------------------------------
    const baseLang = 'en';              // or pick from a settings service
    
    // Create a deep copy of the question object to avoid modifying the original state directly
    const questionCopy = JSON.parse(JSON.stringify(this.question));

    const payload: any = {
      difficulty: questionCopy.difficulty,
      type: questionCopy.type,
      status: questionCopy.status, // Add status
      branchId: questionCopy.branchId, // Use branchId for branch
      subjectId: questionCopy.subjectId, // Use subjectId for subject
      topicId: questionCopy.topicId, // Use topicId for topic
      subtopicId: questionCopy.subtopicId, // Use subtopicId for subTopic
      tags: questionCopy.tags, // Add tags
      recommendedTimeAllotment: questionCopy.recommendedTimeAllotment, // Add time
      internalNotes: questionCopy.internalNotes, // Add notes
      questionHistory: this.histList, // Add history
      translations: []
    };

    // 1️⃣ copy default-language strings to root (what the API expects for non-multilingual fields if any)
    // For this model, questionText and options are part of translations.
    // If your backend expects a root-level questionText or options for the base language,
    // you would set them here. e.g.:
    // payload.questionText  = questionCopy.translations[baseLang]?.questionText || '';
    // payload.options       = questionCopy.translations[baseLang]?.options || [];

    // 2️⃣ Process translations
    const filledTranslations = Object.entries(questionCopy.translations)
      .map(([lang, packUntyped]) => {
        const pack = packUntyped as LangPack; // Assert type here
        // Ensure options, explanations, and images are arrays
        pack.options = Array.isArray(pack.options) ? pack.options : [];
        pack.explanations = Array.isArray(pack.explanations) ? pack.explanations : [];
        pack.images = Array.isArray(pack.images) ? pack.images : [];

        return {
          lang: lang as LangCode,
          questionText: pack.questionText,
          options: pack.options.filter(o => o.text && o.text.trim()), // Filter out empty options
          explanations: pack.explanations,
          images: pack.images.filter(img => img && img.trim() !== '') // Filter out empty image URLs
        };
      })
      .filter(p => p.questionText && p.questionText.trim() && p.options.length >= 2); // Ensure question text and at least 2 options

    payload.translations = filledTranslations;
    
    // 3️⃣ clean up empty arrays (optional hygiene)
    // if (!payload.options?.length)       delete payload.options; // If options were at root

    // ----- POST ----------------------------------------------------------
    this.questionSrv.addQuestion(payload)
        .subscribe({
          next: () => alert('Saved!'),
          error: (err: any) => alert('Save failed: ' + err.message)
        });
  }

  /* quick-nav */
  goToAddBranch()   { this.router.navigate(['/branches/new']); }
  goToAddSubject()  { this.router.navigate(['/subjects/new']); }
  goToAddTopic()    { this.router.navigate(['/topics/new']);   }
  goToAddSubtopic() { this.router.navigate(['/subtopics/new']);}
}
