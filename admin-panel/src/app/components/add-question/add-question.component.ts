import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';

import { QuestionService }  from '../../services/question.service';
import { BranchService }    from '../../services/branch.service';
import { SubjectService }   from '../../services/subject.service';
import { TopicService }     from '../../services/topic.service';
import { SubtopicService }  from '../../services/subtopic.service';
import { ExamTypeService }  from '../../services/exam-type.service';

@Component({
  selector   : 'app-add-question',
  standalone : true,
  imports    : [CommonModule, FormsModule],
  templateUrl: './add-question.component.html',
  styleUrls  : ['./add-question.component.scss']
})
export class AddQuestionComponent implements OnInit {
  // services
  private qSvc   = inject(QuestionService);
  private bSvc   = inject(BranchService);
  private sSvc   = inject(SubjectService);
  private tSvc   = inject(TopicService);
  private stSvc  = inject(SubtopicService);
  private etSvc  = inject(ExamTypeService);
  private router = inject(Router);

  // placeholders for “unknown / not-mentioned”
  readonly NM = 'not-mentioned';

  // form model
  question = {
    questionText : '',
    options      : [{ text:'', img:'', isCorrect:false }, { text:'', img:'', isCorrect:false }],
    difficulty   : this.NM,
    type         : 'single',
    marks        : 1,
    negativeMarks: 0,
    branchId  : '',
    subjectId : '',
    topicId   : '',
    subtopicId: '',
    examTypeId: '',
    images: ['']
  };

  // arrays for selects
  branches  : any[] = [];
  subjects  : any[] = [];
  topics    : any[] = [];
  subtopics : any[] = [];
  examTypes : any[] = [];

  // explanations
  explanationTypes = ['text','video','pdf'];
  explanations: { type:string; label:string; content:string }[] = [];

  // appearance
  histEntry = { examName:'', year:new Date().getFullYear() };
  histList : { examName:string; year:number }[] = [];
  currentYear = new Date().getFullYear();

  isLoading = false;

  // ─── lifecycle ─────────────────────────────
  ngOnInit() {
    this.loadBranches();
    this.loadExamTypes();
    this.addExplanation();            // show first row
  }

  // ─── hierarchy loads ───────────────────────
  loadBranches()  { this.bSvc.getBranches().subscribe(b => this.branches = b); }
  loadExamTypes() { this.etSvc.getExamTypes().subscribe(t => this.examTypes = t); }

  onBranchChange(id:string) {
    this.sSvc.getSubjects(id).subscribe(s => this.subjects = s);
    this.subjects = []; this.topics = []; this.subtopics = [];
    this.question.subjectId = this.question.topicId = this.question.subtopicId = '';
  }
  onSubjectChange(id:string) {
    if (id) this.tSvc.getTopics(id).subscribe(t => this.topics = t);
    this.topics = []; this.subtopics = [];
    this.question.topicId = this.question.subtopicId = '';
  }
  onTopicChange(id:string) {
    if (id) this.stSvc.getSubtopics(id).subscribe(st => this.subtopics = st);
    this.subtopics = [];
    this.question.subtopicId = '';
  }

  // options
  addOption() { this.question.options.push({ text:'', img:'', isCorrect:false }); }
  removeOption(i:number) { if (this.question.options.length>2) this.question.options.splice(i,1); }

  // explanations
  addExplanation()  { this.explanations.push({ type:'text', label:'', content:'' }); }
  removeExplanation(i:number){ this.explanations.splice(i,1); }

  // appearance
  addHistory() {
    if (this.histEntry.examName.trim()) {
      this.histList.push({ ...this.histEntry });
      this.histEntry = { examName:'', year:this.currentYear };
    }
  }

  // submit
  addQuestion(f:NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); return; }

    // Build structured option objects with text and img properties
    const opts = this.question.options.map((o, i) => ({ 
      text: o.text, 
      img: o.img, 
      isCorrect: o.isCorrect 
    }));
    
    const correctIdx = this.question.options.map((o,i)=>o.isCorrect?i:-1).filter(i=>i>=0);
    
    // Process images
    const questionImages = this.question.images[0] ? 
      this.question.images[0].split('|').map(url => url.trim()).filter(url => url) : 
      [];

    const payload = {
      branch : this.question.branchId  || this.NM,
      subject: this.question.subjectId || this.NM,
      topic  : this.question.topicId   || this.NM,
      subTopic: this.question.subtopicId || this.NM,
      examType: this.question.examTypeId || '', // send empty string instead of "not-mentioned"
      questionText : this.question.questionText,
      images       : questionImages,
      options      : opts,
      correctOptions: correctIdx,
      marks        : this.question.marks,
      negativeMarks: this.question.negativeMarks,
      difficulty   : this.question.difficulty,
      type         : this.question.type,
      explanations : this.explanations,
      questionHistory: this.histList.map(h=>({ title:h.examName||'N/A', askedAt:new Date(`${h.year}-01-01`) }))
    };

    this.isLoading = true;
    this.qSvc.addQuestion(payload)
      .pipe(finalize(()=>this.isLoading=false))
      .subscribe({
        next: () => { 
          alert('Saved!'); 
          // Reset form and clear arrays
          f.resetForm({ marks:1, negativeMarks:0, type:'single', difficulty: this.NM }); 
          this.explanations = []; 
          this.addExplanation();
          this.histList = [];
          // Reset selection arrays to prevent IDs showing in dropdowns
          this.topics = [];
          this.subtopics = [];
          this.question.topicId = '';
          this.question.subtopicId = '';
          this.question.images = [''];
        },
        error: e => alert(e.error?.message || 'Error')
      });
  }

  // nav
  goToAddBranch()   { this.router.navigate(['/branches/new']); }
  goToAddSubject()  { this.router.navigate(['/subjects/new']); }
  goToAddTopic()    { this.router.navigate(['/topics/new']); }
  goToAddSubtopic() { this.router.navigate(['/subtopics/new']); }
}
