import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AddQuestionComponent } from './add-question.component';

describe('AddQuestionComponent', () => {
  let component: AddQuestionComponent;
  let fixture: ComponentFixture<AddQuestionComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [AddQuestionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddQuestionComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch branches on init', () => {
    const mockBranches = { branches: [{ id: 1, name: 'Branch 1' }] };
    const req = httpMock.expectOne('/api/hierarchy/branch');
    req.flush(mockBranches);

    expect(component.branches).toEqual(mockBranches.branches);
  });

  it('should fetch subjects when branch is selected', () => {
    const mockSubjects = { subjects: [{ id: 1, name: 'Subject 1' }] };
    component.onBranchChange('1');
    const req = httpMock.expectOne('/api/hierarchy/subject?branchId=1');
    req.flush(mockSubjects);

    expect(component.subjects).toEqual(mockSubjects.subjects);
  });

  it('should fetch topics when subject is selected', () => {
    const mockTopics = { topics: [{ id: 1, name: 'Topic 1' }] };
    component.onSubjectChange('1');
    const req = httpMock.expectOne('/api/hierarchy/topic?subjectId=1');
    req.flush(mockTopics);

    expect(component.topics).toEqual(mockTopics.topics);
  });

  it('should fetch subtopics when topic is selected', () => {
    const mockSubtopics = { subtopics: [{ id: 1, name: 'Subtopic 1' }] };
    component.onTopicChange('1');
    const req = httpMock.expectOne('/api/hierarchy/subtopic?topicId=1');
    req.flush(mockSubtopics);

    expect(component.subtopics).toEqual(mockSubtopics.subtopics);
  });

  afterEach(() => {
    httpMock.verify();
  });
});
