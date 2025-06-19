import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Import all the exam hierarchy services
import { ExamFamilyService, ExamFamily } from './exam-family.service';
import { ExamLevelService, ExamLevel } from './exam-level.service';
import { ExamBranchService, ExamBranch } from './exam-branch.service';
import { ExamStreamService, ExamStream } from './exam-stream.service';
import { ExamPaperService, ExamPaper } from './exam-paper.service';
import { ExamShiftService, ExamShift } from './exam-shift.service';

export interface HierarchyData {
  families: ExamFamily[];
  levels: ExamLevel[];
  branches: ExamBranch[];
  streams: ExamStream[];
  papers: ExamPaper[];
  shifts: ExamShift[];
}

export interface FilteredHierarchy {
  levels: ExamLevel[];
  branches: ExamBranch[];
  streams: ExamStream[];
  papers: ExamPaper[];
  shifts: ExamShift[];
}

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  constructor(
    private http: HttpClient,
    private examFamilyService: ExamFamilyService,
    private examLevelService: ExamLevelService,
    private examBranchService: ExamBranchService,
    private examStreamService: ExamStreamService,
    private examPaperService: ExamPaperService,
    private examShiftService: ExamShiftService
  ) {}

  /**
   * Load all hierarchy data at once
   */
  loadAllHierarchy(): Observable<HierarchyData> {
    return combineLatest([
      this.examFamilyService.getAll(),
      this.examLevelService.getAll(),
      this.examBranchService.getAll(),
      this.examStreamService.getAll(),
      this.examPaperService.getAll(),
      this.examShiftService.getAll()
    ]).pipe(
      map(([families, levels, branches, streams, papers, shifts]) => ({
        families,
        levels,
        branches,
        streams,
        papers,
        shifts
      }))
    );
  }
  /**
   * Get filtered hierarchy based on family selection
   */
  getHierarchyForFamily(familyId: string): Observable<FilteredHierarchy> {
    return combineLatest([
      this.examLevelService.getByFamily(familyId),
      this.examStreamService.getByFamily(familyId),
      this.examPaperService.getByFamily(familyId)
    ]).pipe(
      map(([levels, streams, papers]) => {
        // Return basic hierarchy - branches and shifts can be loaded separately if needed
        return {
          levels,
          branches: [], // Can be populated later via getBranchesForLevels
          streams,
          papers,
          shifts: [] // Can be populated later via getShiftsForPapers
        };
      })
    );
  }
  /**
   * Get branches for multiple levels
   */
  getBranchesForLevels(levelIds: string[]): Observable<ExamBranch[]> {
    if (!levelIds.length) return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
    
    const branchObservables = levelIds.map(levelId => 
      this.examBranchService.getByLevel(levelId)
    );
    
    return combineLatest(branchObservables).pipe(
      map(branchArrays => branchArrays.flat())
    );
  }

  /**
   * Get shifts for multiple papers
   */
  getShiftsForPapers(paperIds: string[]): Observable<ExamShift[]> {
    if (!paperIds.length) return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
    
    const shiftObservables = paperIds.map(paperId => 
      this.examShiftService.getByPaper(paperId)
    );
    
    return combineLatest(shiftObservables).pipe(
      map(shiftArrays => shiftArrays.flat())
    );
  }

  /**
   * Get streams filtered by level and branch
   */
  getStreamsForLevelAndBranch(levelId: string, branchId: string): Observable<ExamStream[]> {
    return this.examStreamService.getByLevel(levelId).pipe(
      map(streams => streams.filter(stream => 
        typeof stream.branch === 'string' ? 
          stream.branch === branchId : 
          stream.branch._id === branchId
      ))
    );
  }

  /**
   * Build complete hierarchy path for display
   */
  buildHierarchyPath(
    family: ExamFamily, 
    level?: ExamLevel, 
    branch?: ExamBranch, 
    stream?: ExamStream, 
    paper?: ExamPaper, 
    shift?: ExamShift
  ): string {
    const parts = [family.name];
    
    if (level) parts.push(level.name);
    if (branch) parts.push(branch.name);
    if (stream) parts.push(stream.name);
    if (paper) parts.push(paper.name);
    if (shift) parts.push(shift.name);
    
    return parts.join(' → ');
  }
}
