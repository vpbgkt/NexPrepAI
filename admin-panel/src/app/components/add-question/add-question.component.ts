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
interface LangPack { questionText: string; options: Option[]; explanations: Explain[]; }

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

  question = {
    translations: <Record<LangCode, LangPack>>{
      en : { questionText: '', options: [ {text:'',img:'',isCorrect:false},
                                          {text:'',img:'',isCorrect:false} ],
             explanations: [] },
      hi : { questionText: '', options: [ {text:'',img:'',isCorrect:false},
                                          {text:'',img:'',isCorrect:false} ],
             explanations: [] }
    },
    difficulty : '',
    type       : 'single',
    branchId   : '',
    subjectId  : '',
    topicId    : '',
    subtopicId : '',
    images     : ['']                        // language-neutral
  };

  branches:any[]=[]; subjects:any[]=[]; topics:any[]=[]; subtopics:any[]=[];
  currentYear = new Date().getFullYear();

  histEntry = { examName: '', year: this.currentYear };
  histList: { examName: string; year: number }[] = [];

  /* ───────────────────────────────────── */

  ngOnInit() { this.branchSrv.getBranches().subscribe(b=>this.branches=b); }

  /* --- helpers --- */
  switchLanguage(lang:LangCode){ this.currentLang=lang; }
  private get langPack():LangPack{ return this.question.translations[this.currentLang]; }

  addOption() { this.langPack.options.push({text:'',img:'',isCorrect:false}); }
  removeOption(i:number){ if(this.langPack.options.length>2) this.langPack.options.splice(i,1); }

  addExplanation(){ this.langPack.explanations.push({type:'text',label:'',content:''}); }
  removeExplanation(i:number){ this.langPack.explanations.splice(i,1); }

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
    const payload: any = { ...this.question };

    // 1️⃣ copy default-language strings to root (what the API expects)
    payload.questionText  = this.question.translations[baseLang].questionText;
    payload.options       = this.question.translations[baseLang].options;

    // 2️⃣ if you use language-neutral images, keep them at root
    //    otherwise delete this line
    payload.images        = this.question.images ?? [];

    // 3️⃣ clean up empty arrays (optional hygiene)
    if (!payload.options?.length)       delete payload.options;

    // Attach question history
    payload.questionHistory = this.histList;

    // build payload
    const filledPacks = Object.values(this.question.translations)
      .filter(p => p.questionText.trim() &&
                   p.options.filter(o => o.text.trim()).length >= 2);

    payload.translations = filledPacks;

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
