import {
  CommonModule,
  Component,
  FormsModule,
  HttpClient,
  HttpParams,
  Injectable,
  NgControlStatus,
  NgForOf,
  NgIf,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  environment,
  setClassMetadata,
  ɵNgSelectMultipleOption,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵinject,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-YFFBMBX7.js";

// src/app/services/leaderboard.service.ts
var LeaderboardService = class _LeaderboardService {
  http;
  apiUrl = `${environment.apiUrl}/leaderboard`;
  constructor(http) {
    this.http = http;
  }
  /**
   * Get question addition leaderboard
   * @param period Time period filter
   * @returns Observable of leaderboard response
   */
  getQuestionLeaderboard(period = "alltime") {
    const params = new HttpParams().set("period", period);
    return this.http.get(`${this.apiUrl}/questions`, { params });
  }
  /**
   * Get exam paper creation leaderboard
   * @param period Time period filter
   * @returns Observable of leaderboard response
   */
  getExamPaperLeaderboard(period = "alltime") {
    const params = new HttpParams().set("period", period);
    return this.http.get(`${this.apiUrl}/exam-papers`, { params });
  }
  /**
   * Get combined leaderboard with both metrics
   * @param period Time period filter
   * @returns Observable of combined leaderboard response
   */
  getCombinedLeaderboard(period = "alltime") {
    const params = new HttpParams().set("period", period);
    return this.http.get(`${this.apiUrl}/combined`, { params });
  }
  /**
   * Get comprehensive admin statistics
   * @returns Observable of admin statistics response
   */
  getAdminStats() {
    return this.http.get(`${this.apiUrl}/stats`);
  }
  /**
   * Get formatted period display name
   * @param period Time period
   * @returns Formatted display name
   */
  getPeriodDisplayName(period) {
    const periodNames = {
      "today": "Today",
      "7days": "Last 7 Days",
      "30days": "Last 30 Days",
      "alltime": "All Time"
    };
    return periodNames[period];
  }
  /**
   * Get all available time periods
   * @returns Array of time period options
   */
  getAvailablePeriods() {
    return [
      { value: "today", label: "Today" },
      { value: "7days", label: "Last 7 Days" },
      { value: "30days", label: "Last 30 Days" },
      { value: "alltime", label: "All Time" }
    ];
  }
  static \u0275fac = function LeaderboardService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LeaderboardService)(\u0275\u0275inject(HttpClient));
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _LeaderboardService, factory: _LeaderboardService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LeaderboardService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: HttpClient }], null);
})();

// src/app/components/leaderboard/leaderboard.component.ts
function LeaderboardComponent_div_11_option_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 28);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const period_r3 = ctx.$implicit;
    \u0275\u0275property("value", period_r3.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", period_r3.label, " ");
  }
}
function LeaderboardComponent_div_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 24)(1, "label", 25);
    \u0275\u0275text(2, "Time Period:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "select", 26);
    \u0275\u0275twoWayListener("ngModelChange", function LeaderboardComponent_div_11_Template_select_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.selectedPeriod, $event) || (ctx_r1.selectedPeriod = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("change", function LeaderboardComponent_div_11_Template_select_change_3_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onPeriodChange(ctx_r1.selectedPeriod));
    });
    \u0275\u0275template(4, LeaderboardComponent_div_11_option_4_Template, 2, 2, "option", 27);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.selectedPeriod);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r1.availablePeriods);
  }
}
function LeaderboardComponent_div_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275element(1, "i", 30);
    \u0275\u0275elementStart(2, "span", 31);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.error);
  }
}
function LeaderboardComponent_div_42_div_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 39)(1, "div", 40)(2, "div", 41);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 42);
    \u0275\u0275text(5, "Total Questions");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 43)(7, "div", 44);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 45);
    \u0275\u0275text(10, "Total Exam Papers");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 46)(12, "div", 47);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 48);
    \u0275\u0275text(15, "Total Contributions");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.combinedMetadata.totalQuestions);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.combinedMetadata.totalExamPapers);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.combinedMetadata.totalContributions);
  }
}
function LeaderboardComponent_div_42_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275element(1, "i", 50);
    \u0275\u0275elementStart(2, "p", 7);
    \u0275\u0275text(3, "Loading combined leaderboard...");
    \u0275\u0275elementEnd()();
  }
}
function LeaderboardComponent_div_42_div_7_tr_18_span_4_i_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "i", 72);
  }
}
function LeaderboardComponent_div_42_div_7_tr_18_span_4_i_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "i", 73);
  }
}
function LeaderboardComponent_div_42_div_7_tr_18_span_4_i_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "i", 74);
  }
}
function LeaderboardComponent_div_42_div_7_tr_18_span_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275template(1, LeaderboardComponent_div_42_div_7_tr_18_span_4_i_1_Template, 1, 0, "i", 69)(2, LeaderboardComponent_div_42_div_7_tr_18_span_4_i_2_Template, 1, 0, "i", 70)(3, LeaderboardComponent_div_42_div_7_tr_18_span_4_i_3_Template, 1, 0, "i", 71);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r4.rank === 1);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r4.rank === 2);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r4.rank === 3);
  }
}
function LeaderboardComponent_div_42_div_7_tr_18_span_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(entry_r4.rank);
  }
}
function LeaderboardComponent_div_42_div_7_tr_18_span_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 75);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(entry_r4.rank);
  }
}
function LeaderboardComponent_div_42_div_7_tr_18_span_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 76);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" (", entry_r4.questionsPercentage, "%) ");
  }
}
function LeaderboardComponent_div_42_div_7_tr_18_span_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 76);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" (", entry_r4.examPapersPercentage, "%) ");
  }
}
function LeaderboardComponent_div_42_div_7_tr_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 58)(2, "div", 59)(3, "div");
    \u0275\u0275template(4, LeaderboardComponent_div_42_div_7_tr_18_span_4_Template, 4, 3, "span", 60)(5, LeaderboardComponent_div_42_div_7_tr_18_span_5_Template, 2, 1, "span", 60);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, LeaderboardComponent_div_42_div_7_tr_18_span_6_Template, 2, 1, "span", 61);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "td", 58)(8, "div")(9, "div", 62);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 63);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "td", 58)(14, "div", 64)(15, "span", 62);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275template(17, LeaderboardComponent_div_42_div_7_tr_18_span_17_Template, 2, 1, "span", 65);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "td", 58)(19, "div", 64)(20, "span", 62);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd();
    \u0275\u0275template(22, LeaderboardComponent_div_42_div_7_tr_18_span_22_Template, 2, 1, "span", 65);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "td", 58)(24, "span", 66);
    \u0275\u0275text(25);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "td", 58)(27, "div", 67);
    \u0275\u0275element(28, "div", 68);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const entry_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classMap("border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 " + (entry_r4.rank === 1 ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400" : entry_r4.rank === 2 ? "bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400" : entry_r4.rank === 3 ? "bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400" : ""));
    \u0275\u0275advance(3);
    \u0275\u0275classMap("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold " + (entry_r4.rank === 1 ? "bg-yellow-400 text-yellow-900" : entry_r4.rank === 2 ? "bg-gray-400 text-gray-900" : entry_r4.rank === 3 ? "bg-orange-400 text-orange-900" : "bg-blue-100 text-blue-800"));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r4.rank <= 3);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r4.rank > 3);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r4.rank <= 3);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(entry_r4.adminName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(entry_r4.email);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(entry_r4.questionsCount);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r4.questionsPercentage);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(entry_r4.examPapersCount);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r4.examPapersPercentage);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(entry_r4.totalContributions);
    \u0275\u0275advance(3);
    \u0275\u0275styleProp("width", entry_r4.totalContributions / ctx_r1.combinedMetadata.totalContributions * 100, "%");
  }
}
function LeaderboardComponent_div_42_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 51)(1, "table", 52)(2, "thead")(3, "tr", 53)(4, "th", 54);
    \u0275\u0275text(5, "Rank");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th", 55);
    \u0275\u0275text(7, "Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th", 55);
    \u0275\u0275text(9, "Questions");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th", 55);
    \u0275\u0275text(11, "Exam Papers");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th", 55);
    \u0275\u0275text(13, "Total");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th", 56);
    \u0275\u0275text(15, "Performance");
    \u0275\u0275elementEnd()()();
    \u0275\u0275element(16, "tbody");
    \u0275\u0275elementStart(17, "tbody");
    \u0275\u0275template(18, LeaderboardComponent_div_42_div_7_tr_18_Template, 29, 16, "tr", 57);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(18);
    \u0275\u0275property("ngForOf", ctx_r1.combinedLeaderboard);
  }
}
function LeaderboardComponent_div_42_div_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275element(1, "i", 77);
    \u0275\u0275elementStart(2, "p", 7);
    \u0275\u0275text(3, "No data available for the selected period.");
    \u0275\u0275elementEnd()();
  }
}
function LeaderboardComponent_div_42_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 32)(1, "div", 33)(2, "div", 34)(3, "h2", 35);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, LeaderboardComponent_div_42_div_5_Template, 16, 3, "div", 36);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, LeaderboardComponent_div_42_div_6_Template, 4, 0, "div", 37)(7, LeaderboardComponent_div_42_div_7_Template, 19, 1, "div", 38)(8, LeaderboardComponent_div_42_div_8_Template, 4, 0, "div", 37);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("Combined Leaderboard - ", ctx_r1.getPeriodDisplayName(ctx_r1.selectedPeriod), "");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.combined);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.loading.combined);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.combined && ctx_r1.combinedLeaderboard.length > 0);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.combined && ctx_r1.combinedLeaderboard.length === 0);
  }
}
function LeaderboardComponent_div_43_div_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 79)(1, "div", 44);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 45);
    \u0275\u0275text(4, "Total Questions Added");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.questionMetadata.totalCount);
  }
}
function LeaderboardComponent_div_43_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275element(1, "i", 80);
    \u0275\u0275elementStart(2, "p", 7);
    \u0275\u0275text(3, "Loading question leaderboard...");
    \u0275\u0275elementEnd()();
  }
}
function LeaderboardComponent_div_43_div_7_tr_15_span_4_i_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "i", 72);
  }
}
function LeaderboardComponent_div_43_div_7_tr_15_span_4_i_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "i", 73);
  }
}
function LeaderboardComponent_div_43_div_7_tr_15_span_4_i_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "i", 74);
  }
}
function LeaderboardComponent_div_43_div_7_tr_15_span_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275template(1, LeaderboardComponent_div_43_div_7_tr_15_span_4_i_1_Template, 1, 0, "i", 69)(2, LeaderboardComponent_div_43_div_7_tr_15_span_4_i_2_Template, 1, 0, "i", 70)(3, LeaderboardComponent_div_43_div_7_tr_15_span_4_i_3_Template, 1, 0, "i", 71);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r5.rank === 1);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r5.rank === 2);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r5.rank === 3);
  }
}
function LeaderboardComponent_div_43_div_7_tr_15_span_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(entry_r5.rank);
  }
}
function LeaderboardComponent_div_43_div_7_tr_15_span_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 75);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(entry_r5.rank);
  }
}
function LeaderboardComponent_div_43_div_7_tr_15_span_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 75);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", entry_r5.percentage, "% ");
  }
}
function LeaderboardComponent_div_43_div_7_tr_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 58)(2, "div", 59)(3, "div");
    \u0275\u0275template(4, LeaderboardComponent_div_43_div_7_tr_15_span_4_Template, 4, 3, "span", 60)(5, LeaderboardComponent_div_43_div_7_tr_15_span_5_Template, 2, 1, "span", 60);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, LeaderboardComponent_div_43_div_7_tr_15_span_6_Template, 2, 1, "span", 61);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "td", 58)(8, "div")(9, "div", 62);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 63);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "td", 58)(14, "span", 81);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "td", 58);
    \u0275\u0275template(17, LeaderboardComponent_div_43_div_7_tr_15_span_17_Template, 2, 1, "span", 61);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "td", 58)(19, "div", 67);
    \u0275\u0275element(20, "div", 82);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const entry_r5 = ctx.$implicit;
    \u0275\u0275classMap("border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 " + (entry_r5.rank === 1 ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400" : entry_r5.rank === 2 ? "bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400" : entry_r5.rank === 3 ? "bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400" : ""));
    \u0275\u0275advance(3);
    \u0275\u0275classMap("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold " + (entry_r5.rank === 1 ? "bg-yellow-400 text-yellow-900" : entry_r5.rank === 2 ? "bg-gray-400 text-gray-900" : entry_r5.rank === 3 ? "bg-orange-400 text-orange-900" : "bg-green-100 text-green-800"));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r5.rank <= 3);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r5.rank > 3);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r5.rank <= 3);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(entry_r5.adminName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(entry_r5.email);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(entry_r5.count);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngIf", entry_r5.percentage);
    \u0275\u0275advance(3);
    \u0275\u0275styleProp("width", entry_r5.percentage || 0, "%");
  }
}
function LeaderboardComponent_div_43_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 51)(1, "table", 52)(2, "thead")(3, "tr", 53)(4, "th", 54);
    \u0275\u0275text(5, "Rank");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th", 55);
    \u0275\u0275text(7, "Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th", 55);
    \u0275\u0275text(9, "Questions Added");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th", 55);
    \u0275\u0275text(11, "Percentage");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th", 56);
    \u0275\u0275text(13, "Performance");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(14, "tbody");
    \u0275\u0275template(15, LeaderboardComponent_div_43_div_7_tr_15_Template, 21, 13, "tr", 57);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(15);
    \u0275\u0275property("ngForOf", ctx_r1.questionLeaderboard);
  }
}
function LeaderboardComponent_div_43_div_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275element(1, "i", 83);
    \u0275\u0275elementStart(2, "p", 7);
    \u0275\u0275text(3, "No questions added in the selected period.");
    \u0275\u0275elementEnd()();
  }
}
function LeaderboardComponent_div_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 32)(1, "div", 33)(2, "div", 34)(3, "h2", 35);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, LeaderboardComponent_div_43_div_5_Template, 5, 1, "div", 78);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, LeaderboardComponent_div_43_div_6_Template, 4, 0, "div", 37)(7, LeaderboardComponent_div_43_div_7_Template, 16, 1, "div", 38)(8, LeaderboardComponent_div_43_div_8_Template, 4, 0, "div", 37);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("Question Addition Leaderboard - ", ctx_r1.getPeriodDisplayName(ctx_r1.selectedPeriod), "");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.questions);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.loading.questions);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.questions && ctx_r1.questionLeaderboard.length > 0);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.questions && ctx_r1.questionLeaderboard.length === 0);
  }
}
function LeaderboardComponent_div_44_div_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 85)(1, "div", 47);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 48);
    \u0275\u0275text(4, "Total Exam Papers Created");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.examPaperMetadata.totalCount);
  }
}
function LeaderboardComponent_div_44_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275element(1, "i", 86);
    \u0275\u0275elementStart(2, "p", 7);
    \u0275\u0275text(3, "Loading exam paper leaderboard...");
    \u0275\u0275elementEnd()();
  }
}
function LeaderboardComponent_div_44_div_7_tr_15_span_4_i_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "i", 72);
  }
}
function LeaderboardComponent_div_44_div_7_tr_15_span_4_i_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "i", 73);
  }
}
function LeaderboardComponent_div_44_div_7_tr_15_span_4_i_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "i", 74);
  }
}
function LeaderboardComponent_div_44_div_7_tr_15_span_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275template(1, LeaderboardComponent_div_44_div_7_tr_15_span_4_i_1_Template, 1, 0, "i", 69)(2, LeaderboardComponent_div_44_div_7_tr_15_span_4_i_2_Template, 1, 0, "i", 70)(3, LeaderboardComponent_div_44_div_7_tr_15_span_4_i_3_Template, 1, 0, "i", 71);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r6.rank === 1);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r6.rank === 2);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r6.rank === 3);
  }
}
function LeaderboardComponent_div_44_div_7_tr_15_span_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(entry_r6.rank);
  }
}
function LeaderboardComponent_div_44_div_7_tr_15_span_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 75);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(entry_r6.rank);
  }
}
function LeaderboardComponent_div_44_div_7_tr_15_span_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 75);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", entry_r6.percentage, "% ");
  }
}
function LeaderboardComponent_div_44_div_7_tr_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 58)(2, "div", 59)(3, "div");
    \u0275\u0275template(4, LeaderboardComponent_div_44_div_7_tr_15_span_4_Template, 4, 3, "span", 60)(5, LeaderboardComponent_div_44_div_7_tr_15_span_5_Template, 2, 1, "span", 60);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, LeaderboardComponent_div_44_div_7_tr_15_span_6_Template, 2, 1, "span", 61);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "td", 58)(8, "div")(9, "div", 62);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 63);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "td", 58)(14, "span", 87);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "td", 58);
    \u0275\u0275template(17, LeaderboardComponent_div_44_div_7_tr_15_span_17_Template, 2, 1, "span", 61);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "td", 58)(19, "div", 67);
    \u0275\u0275element(20, "div", 88);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const entry_r6 = ctx.$implicit;
    \u0275\u0275classMap("border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 " + (entry_r6.rank === 1 ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400" : entry_r6.rank === 2 ? "bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400" : entry_r6.rank === 3 ? "bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400" : ""));
    \u0275\u0275advance(3);
    \u0275\u0275classMap("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold " + (entry_r6.rank === 1 ? "bg-yellow-400 text-yellow-900" : entry_r6.rank === 2 ? "bg-gray-400 text-gray-900" : entry_r6.rank === 3 ? "bg-orange-400 text-orange-900" : "bg-purple-100 text-purple-800"));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r6.rank <= 3);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r6.rank > 3);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", entry_r6.rank <= 3);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(entry_r6.adminName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(entry_r6.email);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(entry_r6.count);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngIf", entry_r6.percentage);
    \u0275\u0275advance(3);
    \u0275\u0275styleProp("width", entry_r6.percentage || 0, "%");
  }
}
function LeaderboardComponent_div_44_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 51)(1, "table", 52)(2, "thead")(3, "tr", 53)(4, "th", 54);
    \u0275\u0275text(5, "Rank");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th", 55);
    \u0275\u0275text(7, "Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th", 55);
    \u0275\u0275text(9, "Exam Papers Created");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th", 55);
    \u0275\u0275text(11, "Percentage");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th", 56);
    \u0275\u0275text(13, "Performance");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(14, "tbody");
    \u0275\u0275template(15, LeaderboardComponent_div_44_div_7_tr_15_Template, 21, 13, "tr", 57);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(15);
    \u0275\u0275property("ngForOf", ctx_r1.examPaperLeaderboard);
  }
}
function LeaderboardComponent_div_44_div_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275element(1, "i", 89);
    \u0275\u0275elementStart(2, "p", 7);
    \u0275\u0275text(3, "No exam papers created in the selected period.");
    \u0275\u0275elementEnd()();
  }
}
function LeaderboardComponent_div_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 32)(1, "div", 33)(2, "div", 34)(3, "h2", 35);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, LeaderboardComponent_div_44_div_5_Template, 5, 1, "div", 84);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, LeaderboardComponent_div_44_div_6_Template, 4, 0, "div", 37)(7, LeaderboardComponent_div_44_div_7_Template, 16, 1, "div", 38)(8, LeaderboardComponent_div_44_div_8_Template, 4, 0, "div", 37);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("Exam Paper Creation Leaderboard - ", ctx_r1.getPeriodDisplayName(ctx_r1.selectedPeriod), "");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.examPapers);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.loading.examPapers);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.examPapers && ctx_r1.examPaperLeaderboard.length > 0);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.examPapers && ctx_r1.examPaperLeaderboard.length === 0);
  }
}
function LeaderboardComponent_div_45_div_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 94)(1, "div", 40)(2, "div", 41);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 42);
    \u0275\u0275text(5, "Total Admins");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 43)(7, "div", 44);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 45);
    \u0275\u0275text(10, "Total Questions");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 46)(12, "div", 47);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 48);
    \u0275\u0275text(15, "Total Exam Papers");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 95)(17, "div", 96);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 97);
    \u0275\u0275text(20, "Total Contributions");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.statsMetadata.totalAdmins);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.statsMetadata.totalQuestions);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.statsMetadata.totalExamPapers);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.statsMetadata.totalContributions);
  }
}
function LeaderboardComponent_div_45_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275element(1, "i", 98);
    \u0275\u0275elementStart(2, "p", 7);
    \u0275\u0275text(3, "Loading statistics...");
    \u0275\u0275elementEnd()();
  }
}
function LeaderboardComponent_div_45_div_7_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 101)(1, "div", 102)(2, "h3", 103);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 104);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 105)(7, "div", 106)(8, "h4", 107);
    \u0275\u0275text(9, "Today");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 108)(11, "div", 109)(12, "span", 110);
    \u0275\u0275text(13, "Questions:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span", 111);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 109)(17, "span", 110);
    \u0275\u0275text(18, "Exam Papers:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "span", 112);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "div", 113)(22, "span", 114);
    \u0275\u0275text(23, "Total:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "span", 115);
    \u0275\u0275text(25);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(26, "div", 106)(27, "h4", 107);
    \u0275\u0275text(28, "Last 7 Days");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 108)(30, "div", 109)(31, "span", 110);
    \u0275\u0275text(32, "Questions:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "span", 111);
    \u0275\u0275text(34);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(35, "div", 109)(36, "span", 110);
    \u0275\u0275text(37, "Exam Papers:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "span", 112);
    \u0275\u0275text(39);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(40, "div", 113)(41, "span", 114);
    \u0275\u0275text(42, "Total:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "span", 115);
    \u0275\u0275text(44);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(45, "div", 106)(46, "h4", 107);
    \u0275\u0275text(47, "Last 30 Days");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(48, "div", 108)(49, "div", 109)(50, "span", 110);
    \u0275\u0275text(51, "Questions:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(52, "span", 111);
    \u0275\u0275text(53);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(54, "div", 109)(55, "span", 110);
    \u0275\u0275text(56, "Exam Papers:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(57, "span", 112);
    \u0275\u0275text(58);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(59, "div", 113)(60, "span", 114);
    \u0275\u0275text(61, "Total:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(62, "span", 115);
    \u0275\u0275text(63);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(64, "div", 106)(65, "h4", 107);
    \u0275\u0275text(66, "All Time");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(67, "div", 108)(68, "div", 109)(69, "span", 110);
    \u0275\u0275text(70, "Questions:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(71, "span", 111);
    \u0275\u0275text(72);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(73, "div", 109)(74, "span", 110);
    \u0275\u0275text(75, "Exam Papers:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(76, "span", 112);
    \u0275\u0275text(77);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(78, "div", 113)(79, "span", 114);
    \u0275\u0275text(80, "Total:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(81, "span", 115);
    \u0275\u0275text(82);
    \u0275\u0275elementEnd()()()()()();
  }
  if (rf & 2) {
    const admin_r7 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(admin_r7.adminName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(admin_r7.email);
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(admin_r7.periods.today.questions);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(admin_r7.periods.today.examPapers);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(admin_r7.periods.today.total);
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(admin_r7.periods.last7Days.questions);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(admin_r7.periods.last7Days.examPapers);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(admin_r7.periods.last7Days.total);
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(admin_r7.periods.last30Days.questions);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(admin_r7.periods.last30Days.examPapers);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(admin_r7.periods.last30Days.total);
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(admin_r7.periods.allTime.questions);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(admin_r7.periods.allTime.examPapers);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(admin_r7.periods.allTime.total);
  }
}
function LeaderboardComponent_div_45_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 99);
    \u0275\u0275template(1, LeaderboardComponent_div_45_div_7_div_1_Template, 83, 14, "div", 100);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r1.adminStats);
  }
}
function LeaderboardComponent_div_45_div_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275element(1, "i", 116);
    \u0275\u0275elementStart(2, "p", 7);
    \u0275\u0275text(3, "No admin statistics available.");
    \u0275\u0275elementEnd()();
  }
}
function LeaderboardComponent_div_45_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 32)(1, "div", 33)(2, "div", 90)(3, "h2", 91);
    \u0275\u0275text(4, "Admin Statistics Overview");
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, LeaderboardComponent_div_45_div_5_Template, 21, 4, "div", 92);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, LeaderboardComponent_div_45_div_6_Template, 4, 0, "div", 37)(7, LeaderboardComponent_div_45_div_7_Template, 2, 1, "div", 93)(8, LeaderboardComponent_div_45_div_8_Template, 4, 0, "div", 37);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275property("ngIf", !ctx_r1.loading.stats);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.loading.stats);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.stats && ctx_r1.adminStats.length > 0);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r1.loading.stats && ctx_r1.adminStats.length === 0);
  }
}
var LeaderboardComponent = class _LeaderboardComponent {
  leaderboardService;
  // Current view state
  activeTab = "combined";
  selectedPeriod = "alltime";
  // Loading states
  loading = {
    questions: false,
    examPapers: false,
    combined: false,
    stats: false
  };
  // Data storage
  questionLeaderboard = [];
  examPaperLeaderboard = [];
  combinedLeaderboard = [];
  adminStats = [];
  // Metadata
  questionMetadata = { totalCount: 0 };
  examPaperMetadata = { totalCount: 0 };
  combinedMetadata = {
    totalQuestions: 0,
    totalExamPapers: 0,
    totalContributions: 0
  };
  statsMetadata = {
    totalAdmins: 0,
    totalQuestions: 0,
    totalExamPapers: 0,
    totalContributions: 0
  };
  // Error handling
  error = null;
  // Configuration
  availablePeriods = [];
  constructor(leaderboardService) {
    this.leaderboardService = leaderboardService;
    this.availablePeriods = this.leaderboardService.getAvailablePeriods();
  }
  ngOnInit() {
    this.loadInitialData();
  }
  /**
   * Load initial data for all tabs
   */
  loadInitialData() {
    this.loadCombinedLeaderboard();
    this.loadAdminStats();
  }
  /**
   * Handle tab change
   */
  onTabChange(tab) {
    this.activeTab = tab;
    this.error = null;
    switch (tab) {
      case "questions":
        if (this.questionLeaderboard.length === 0) {
          this.loadQuestionLeaderboard();
        }
        break;
      case "examPapers":
        if (this.examPaperLeaderboard.length === 0) {
          this.loadExamPaperLeaderboard();
        }
        break;
      case "combined":
        if (this.combinedLeaderboard.length === 0) {
          this.loadCombinedLeaderboard();
        }
        break;
      case "stats":
        if (this.adminStats.length === 0) {
          this.loadAdminStats();
        }
        break;
    }
  }
  /**
   * Handle period change
   */
  onPeriodChange(period) {
    this.selectedPeriod = period;
    this.error = null;
    switch (this.activeTab) {
      case "questions":
        this.loadQuestionLeaderboard();
        break;
      case "examPapers":
        this.loadExamPaperLeaderboard();
        break;
      case "combined":
        this.loadCombinedLeaderboard();
        break;
    }
  }
  /**
   * Load question leaderboard
   */
  loadQuestionLeaderboard() {
    this.loading.questions = true;
    this.error = null;
    this.leaderboardService.getQuestionLeaderboard(this.selectedPeriod).subscribe({
      next: (response) => {
        if (response.success) {
          this.questionLeaderboard = response.data.leaderboard;
          this.questionMetadata.totalCount = response.data.totalCount;
        } else {
          this.error = response.message || "Failed to load question leaderboard";
        }
        this.loading.questions = false;
      },
      error: (error) => {
        console.error("Error loading question leaderboard:", error);
        this.error = "Failed to load question leaderboard. Please try again.";
        this.loading.questions = false;
      }
    });
  }
  /**
   * Load exam paper leaderboard
   */
  loadExamPaperLeaderboard() {
    this.loading.examPapers = true;
    this.error = null;
    this.leaderboardService.getExamPaperLeaderboard(this.selectedPeriod).subscribe({
      next: (response) => {
        if (response.success) {
          this.examPaperLeaderboard = response.data.leaderboard;
          this.examPaperMetadata.totalCount = response.data.totalCount;
        } else {
          this.error = response.message || "Failed to load exam paper leaderboard";
        }
        this.loading.examPapers = false;
      },
      error: (error) => {
        console.error("Error loading exam paper leaderboard:", error);
        this.error = "Failed to load exam paper leaderboard. Please try again.";
        this.loading.examPapers = false;
      }
    });
  }
  /**
   * Load combined leaderboard
   */
  loadCombinedLeaderboard() {
    this.loading.combined = true;
    this.error = null;
    this.leaderboardService.getCombinedLeaderboard(this.selectedPeriod).subscribe({
      next: (response) => {
        if (response.success) {
          this.combinedLeaderboard = response.data.leaderboard;
          this.combinedMetadata = {
            totalQuestions: response.data.totalQuestions,
            totalExamPapers: response.data.totalExamPapers,
            totalContributions: response.data.totalContributions
          };
        } else {
          this.error = response.message || "Failed to load combined leaderboard";
        }
        this.loading.combined = false;
      },
      error: (error) => {
        console.error("Error loading combined leaderboard:", error);
        this.error = "Failed to load combined leaderboard. Please try again.";
        this.loading.combined = false;
      }
    });
  }
  /**
   * Load admin statistics
   */
  loadAdminStats() {
    this.loading.stats = true;
    this.error = null;
    this.leaderboardService.getAdminStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.adminStats = response.data.admins;
          this.statsMetadata = response.data.summary;
        } else {
          this.error = response.message || "Failed to load admin statistics";
        }
        this.loading.stats = false;
      },
      error: (error) => {
        console.error("Error loading admin statistics:", error);
        this.error = "Failed to load admin statistics. Please try again.";
        this.loading.stats = false;
      }
    });
  }
  /**
   * Get formatted period display name
   */
  getPeriodDisplayName(period) {
    return this.leaderboardService.getPeriodDisplayName(period);
  }
  /**
   * Get rank badge class based on position
   */
  getRankBadgeClass(rank) {
    if (rank === 1)
      return "rank-gold";
    if (rank === 2)
      return "rank-silver";
    if (rank === 3)
      return "rank-bronze";
    return "rank-default";
  }
  /**
   * Refresh current tab data
   */
  refreshData() {
    switch (this.activeTab) {
      case "questions":
        this.loadQuestionLeaderboard();
        break;
      case "examPapers":
        this.loadExamPaperLeaderboard();
        break;
      case "combined":
        this.loadCombinedLeaderboard();
        break;
      case "stats":
        this.loadAdminStats();
        break;
    }
  }
  static \u0275fac = function LeaderboardComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LeaderboardComponent)(\u0275\u0275directiveInject(LeaderboardService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LeaderboardComponent, selectors: [["app-leaderboard"]], decls: 46, vars: 17, consts: [[1, "min-h-screen", "bg-gradient-to-br", "from-purple-50", "via-blue-50", "to-indigo-100", "p-4", "lg:p-6"], [1, "max-w-7xl", "mx-auto"], [1, "bg-white", "rounded-2xl", "shadow-xl", "border", "border-gray-200", "p-6", "mb-8"], [1, "flex", "flex-col", "lg:flex-row", "lg:items-center", "lg:justify-between", "gap-4"], [1, "flex-1"], [1, "flex", "items-center", "gap-3", "text-3xl", "font-bold", "text-gray-900", "mb-2"], [1, "fas", "fa-trophy", "text-yellow-500", "text-2xl"], [1, "text-gray-600", "text-lg"], [1, "flex", "items-center", "gap-4"], ["class", "flex items-center gap-3", 4, "ngIf"], ["title", "Refresh Data", 1, "bg-gradient-to-r", "from-blue-500", "to-blue-600", "hover:from-blue-600", "hover:to-blue-700", "disabled:opacity-50", "disabled:cursor-not-allowed", "text-white", "px-4", "py-2", "rounded-lg", "transition-all", "duration-200", "transform", "hover:scale-105", "shadow-lg", 3, "click", "disabled"], [1, "fas", "fa-sync-alt", "text-lg"], ["class", "bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg mb-6 flex items-center gap-3 shadow-lg", 4, "ngIf"], [1, "bg-white", "rounded-2xl", "shadow-xl", "border", "border-gray-200", "p-2", "mb-8"], [1, "flex", "flex-col", "sm:flex-row", "gap-2"], [3, "click"], [1, "fas", "fa-chart-bar"], [1, "hidden", "sm:inline"], [1, "sm:hidden"], [1, "fas", "fa-question-circle"], [1, "fas", "fa-file-alt"], [1, "fas", "fa-chart-line"], [1, "space-y-6"], ["class", "animate-fadeIn", 4, "ngIf"], [1, "flex", "items-center", "gap-3"], ["for", "period-select", 1, "text-sm", "font-semibold", "text-gray-700"], ["id", "period-select", 1, "px-4", "py-2", "border-2", "border-gray-300", "rounded-lg", "bg-white", "text-gray-900", "focus:border-blue-500", "focus:ring-2", "focus:ring-blue-200", "transition-all", "duration-200", "cursor-pointer", "hover:border-gray-400", 3, "ngModelChange", "change", "ngModel"], [3, "value", 4, "ngFor", "ngForOf"], [3, "value"], [1, "bg-gradient-to-r", "from-red-500", "to-red-600", "text-white", "p-4", "rounded-lg", "mb-6", "flex", "items-center", "gap-3", "shadow-lg"], [1, "fas", "fa-exclamation-triangle", "text-xl"], [1, "font-medium"], [1, "animate-fadeIn"], [1, "bg-white", "rounded-2xl", "shadow-xl", "border", "border-gray-200", "p-6"], [1, "mb-6"], [1, "text-2xl", "font-bold", "text-gray-900", "mb-4"], ["class", "grid grid-cols-1 sm:grid-cols-3 gap-4", 4, "ngIf"], ["class", "text-center py-12", 4, "ngIf"], ["class", "overflow-x-auto", 4, "ngIf"], [1, "grid", "grid-cols-1", "sm:grid-cols-3", "gap-4"], [1, "bg-gradient-to-r", "from-blue-50", "to-blue-100", "p-4", "rounded-xl", "text-center"], [1, "text-2xl", "font-bold", "text-blue-800"], [1, "text-sm", "text-blue-600", "font-medium"], [1, "bg-gradient-to-r", "from-green-50", "to-green-100", "p-4", "rounded-xl", "text-center"], [1, "text-2xl", "font-bold", "text-green-800"], [1, "text-sm", "text-green-600", "font-medium"], [1, "bg-gradient-to-r", "from-purple-50", "to-purple-100", "p-4", "rounded-xl", "text-center"], [1, "text-2xl", "font-bold", "text-purple-800"], [1, "text-sm", "text-purple-600", "font-medium"], [1, "text-center", "py-12"], [1, "fas", "fa-spinner", "fa-spin", "text-3xl", "text-blue-500", "mb-4"], [1, "overflow-x-auto"], [1, "w-full"], [1, "bg-gradient-to-r", "from-gray-800", "to-gray-900", "text-white"], [1, "px-4", "py-4", "text-left", "font-semibold", "rounded-tl-lg"], [1, "px-4", "py-4", "text-left", "font-semibold"], [1, "px-4", "py-4", "text-left", "font-semibold", "rounded-tr-lg"], [3, "class", 4, "ngFor", "ngForOf"], [1, "px-4", "py-4"], [1, "flex", "items-center", "gap-2"], [4, "ngIf"], ["class", "font-medium text-gray-700", 4, "ngIf"], [1, "font-semibold", "text-gray-900"], [1, "text-sm", "text-gray-500"], [1, "flex", "flex-col"], ["class", "text-xs text-gray-500", 4, "ngIf"], [1, "font-bold", "text-lg", "text-blue-600"], [1, "w-full", "bg-gray-200", "rounded-full", "h-3"], [1, "bg-gradient-to-r", "from-blue-500", "to-blue-600", "h-3", "rounded-full", "transition-all", "duration-500"], ["class", "fas fa-trophy text-xs", 4, "ngIf"], ["class", "fas fa-medal text-xs", 4, "ngIf"], ["class", "fas fa-award text-xs", 4, "ngIf"], [1, "fas", "fa-trophy", "text-xs"], [1, "fas", "fa-medal", "text-xs"], [1, "fas", "fa-award", "text-xs"], [1, "font-medium", "text-gray-700"], [1, "text-xs", "text-gray-500"], [1, "fas", "fa-chart-bar", "text-4xl", "text-gray-400", "mb-4"], ["class", "bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl text-center max-w-xs", 4, "ngIf"], [1, "bg-gradient-to-r", "from-green-50", "to-green-100", "p-4", "rounded-xl", "text-center", "max-w-xs"], [1, "fas", "fa-spinner", "fa-spin", "text-3xl", "text-green-500", "mb-4"], [1, "font-bold", "text-lg", "text-green-600"], [1, "bg-gradient-to-r", "from-green-500", "to-green-600", "h-3", "rounded-full", "transition-all", "duration-500"], [1, "fas", "fa-question-circle", "text-4xl", "text-gray-400", "mb-4"], ["class", "bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl text-center max-w-xs", 4, "ngIf"], [1, "bg-gradient-to-r", "from-purple-50", "to-purple-100", "p-4", "rounded-xl", "text-center", "max-w-xs"], [1, "fas", "fa-spinner", "fa-spin", "text-3xl", "text-purple-500", "mb-4"], [1, "font-bold", "text-lg", "text-purple-600"], [1, "bg-gradient-to-r", "from-purple-500", "to-purple-600", "h-3", "rounded-full", "transition-all", "duration-500"], [1, "fas", "fa-file-alt", "text-4xl", "text-gray-400", "mb-4"], [1, "mb-8"], [1, "text-2xl", "font-bold", "text-gray-900", "mb-6"], ["class", "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", 4, "ngIf"], ["class", "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6", 4, "ngIf"], [1, "grid", "grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-4", "gap-4"], [1, "bg-gradient-to-r", "from-indigo-50", "to-indigo-100", "p-4", "rounded-xl", "text-center"], [1, "text-2xl", "font-bold", "text-indigo-800"], [1, "text-sm", "text-indigo-600", "font-medium"], [1, "fas", "fa-spinner", "fa-spin", "text-3xl", "text-indigo-500", "mb-4"], [1, "grid", "grid-cols-1", "md:grid-cols-2", "xl:grid-cols-3", "gap-6"], ["class", "bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200", 4, "ngFor", "ngForOf"], [1, "bg-gradient-to-br", "from-gray-50", "to-gray-100", "rounded-xl", "p-6", "border", "border-gray-200", "hover:shadow-lg", "transition-all", "duration-200"], [1, "mb-4", "border-b", "border-gray-300", "pb-3"], [1, "text-lg", "font-bold", "text-gray-900"], [1, "text-sm", "text-gray-600"], [1, "space-y-4"], [1, "bg-white", "rounded-lg", "p-3", "border", "border-gray-200"], [1, "text-sm", "font-semibold", "text-gray-800", "mb-2"], [1, "space-y-1", "text-sm"], [1, "flex", "justify-between"], [1, "text-gray-600"], [1, "font-medium", "text-green-600"], [1, "font-medium", "text-purple-600"], [1, "flex", "justify-between", "border-t", "pt-1"], [1, "font-medium", "text-gray-800"], [1, "font-bold", "text-blue-600"], [1, "fas", "fa-chart-line", "text-4xl", "text-gray-400", "mb-4"]], template: function LeaderboardComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "div", 4)(5, "h1", 5);
      \u0275\u0275element(6, "i", 6);
      \u0275\u0275text(7, " Admin Leaderboard ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "p", 7);
      \u0275\u0275text(9, " Track admin contributions including question additions and exam paper creations ");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(10, "div", 8);
      \u0275\u0275template(11, LeaderboardComponent_div_11_Template, 5, 2, "div", 9);
      \u0275\u0275elementStart(12, "button", 10);
      \u0275\u0275listener("click", function LeaderboardComponent_Template_button_click_12_listener() {
        return ctx.refreshData();
      });
      \u0275\u0275element(13, "i", 11);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275template(14, LeaderboardComponent_div_14_Template, 4, 1, "div", 12);
      \u0275\u0275elementStart(15, "div", 13)(16, "div", 14)(17, "button", 15);
      \u0275\u0275listener("click", function LeaderboardComponent_Template_button_click_17_listener() {
        return ctx.onTabChange("combined");
      });
      \u0275\u0275element(18, "i", 16);
      \u0275\u0275elementStart(19, "span", 17);
      \u0275\u0275text(20, "Combined Leaderboard");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(21, "span", 18);
      \u0275\u0275text(22, "Combined");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(23, "button", 15);
      \u0275\u0275listener("click", function LeaderboardComponent_Template_button_click_23_listener() {
        return ctx.onTabChange("questions");
      });
      \u0275\u0275element(24, "i", 19);
      \u0275\u0275elementStart(25, "span", 17);
      \u0275\u0275text(26, "Questions Added");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "span", 18);
      \u0275\u0275text(28, "Questions");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(29, "button", 15);
      \u0275\u0275listener("click", function LeaderboardComponent_Template_button_click_29_listener() {
        return ctx.onTabChange("examPapers");
      });
      \u0275\u0275element(30, "i", 20);
      \u0275\u0275elementStart(31, "span", 17);
      \u0275\u0275text(32, "Exam Papers Created");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "span", 18);
      \u0275\u0275text(34, "Exam Papers");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(35, "button", 15);
      \u0275\u0275listener("click", function LeaderboardComponent_Template_button_click_35_listener() {
        return ctx.onTabChange("stats");
      });
      \u0275\u0275element(36, "i", 21);
      \u0275\u0275elementStart(37, "span", 17);
      \u0275\u0275text(38, "Statistics Overview");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "span", 18);
      \u0275\u0275text(40, "Statistics");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(41, "div", 22);
      \u0275\u0275template(42, LeaderboardComponent_div_42_Template, 9, 5, "div", 23)(43, LeaderboardComponent_div_43_Template, 9, 5, "div", 23)(44, LeaderboardComponent_div_44_Template, 9, 5, "div", 23)(45, LeaderboardComponent_div_45_Template, 9, 4, "div", 23);
      \u0275\u0275elementEnd()()();
    }
    if (rf & 2) {
      \u0275\u0275advance(11);
      \u0275\u0275property("ngIf", ctx.activeTab !== "stats");
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.loading[ctx.activeTab]);
      \u0275\u0275advance();
      \u0275\u0275classProp("fa-spin", ctx.loading[ctx.activeTab]);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", ctx.error);
      \u0275\u0275advance(3);
      \u0275\u0275classMap("flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 " + (ctx.activeTab === "combined" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"));
      \u0275\u0275advance(6);
      \u0275\u0275classMap("flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 " + (ctx.activeTab === "questions" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"));
      \u0275\u0275advance(6);
      \u0275\u0275classMap("flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 " + (ctx.activeTab === "examPapers" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"));
      \u0275\u0275advance(6);
      \u0275\u0275classMap("flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 " + (ctx.activeTab === "stats" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"));
      \u0275\u0275advance(7);
      \u0275\u0275property("ngIf", ctx.activeTab === "combined");
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", ctx.activeTab === "questions");
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", ctx.activeTab === "examPapers");
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", ctx.activeTab === "stats");
    }
  }, dependencies: [CommonModule, NgForOf, NgIf, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, SelectControlValueAccessor, NgControlStatus, NgModel], styles: ["\n\n@keyframes _ngcontent-%COMP%_fadeIn {\n  from {\n    opacity: 0;\n    transform: translateY(10px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n.animate-fadeIn[_ngcontent-%COMP%] {\n  animation: _ngcontent-%COMP%_fadeIn 0.3s ease-in-out;\n}\n.overflow-x-auto[_ngcontent-%COMP%] {\n  scrollbar-width: thin;\n  scrollbar-color: #cbd5e0 #f7fafc;\n}\n.overflow-x-auto[_ngcontent-%COMP%]::-webkit-scrollbar {\n  height: 6px;\n}\n.overflow-x-auto[_ngcontent-%COMP%]::-webkit-scrollbar-track {\n  background: #f7fafc;\n  border-radius: 3px;\n}\n.overflow-x-auto[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: #cbd5e0;\n  border-radius: 3px;\n}\n.overflow-x-auto[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover {\n  background: #a0aec0;\n}\n/*# sourceMappingURL=leaderboard.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LeaderboardComponent, [{
    type: Component,
    args: [{ selector: "app-leaderboard", standalone: true, imports: [CommonModule, FormsModule], template: `<!-- Leaderboard Component Template -->\r
<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4 lg:p-6">\r
  <div class="max-w-7xl mx-auto">\r
    <!-- Header Section -->\r
    <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">\r
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">\r
        <div class="flex-1">\r
          <h1 class="flex items-center gap-3 text-3xl font-bold text-gray-900 mb-2">\r
            <i class="fas fa-trophy text-yellow-500 text-2xl"></i>\r
            Admin Leaderboard\r
          </h1>\r
          <p class="text-gray-600 text-lg">\r
            Track admin contributions including question additions and exam paper creations\r
          </p>\r
        </div>\r
        \r
        <div class="flex items-center gap-4">\r
          <!-- Period Filter -->\r
          <div class="flex items-center gap-3" *ngIf="activeTab !== 'stats'">\r
            <label for="period-select" class="text-sm font-semibold text-gray-700">Time Period:</label>\r
            <select \r
              id="period-select" \r
              [(ngModel)]="selectedPeriod" \r
              (change)="onPeriodChange(selectedPeriod)"\r
              class="px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 cursor-pointer hover:border-gray-400">\r
              <option *ngFor="let period of availablePeriods" [value]="period.value">\r
                {{ period.label }}\r
              </option>\r
            </select>\r
          </div>\r
          \r
          <!-- Refresh Button -->\r
          <button \r
            (click)="refreshData()" \r
            [disabled]="loading[activeTab]"\r
            title="Refresh Data"\r
            class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">\r
            <i class="fas fa-sync-alt text-lg" [class.fa-spin]="loading[activeTab]"></i>\r
          </button>\r
        </div>\r
      </div>\r
    </div>\r
\r
    <!-- Error Message -->\r
    <div class="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg mb-6 flex items-center gap-3 shadow-lg" *ngIf="error">\r
      <i class="fas fa-exclamation-triangle text-xl"></i>\r
      <span class="font-medium">{{ error }}</span>\r
    </div>\r
    <!-- Tab Navigation -->\r
    <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-2 mb-8">\r
      <div class="flex flex-col sm:flex-row gap-2">\r
        <button \r
          [class]="'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ' + (activeTab === 'combined' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600')"\r
          (click)="onTabChange('combined')">\r
          <i class="fas fa-chart-bar"></i>\r
          <span class="hidden sm:inline">Combined Leaderboard</span>\r
          <span class="sm:hidden">Combined</span>\r
        </button>\r
        <button \r
          [class]="'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ' + (activeTab === 'questions' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600')"\r
          (click)="onTabChange('questions')">\r
          <i class="fas fa-question-circle"></i>\r
          <span class="hidden sm:inline">Questions Added</span>\r
          <span class="sm:hidden">Questions</span>\r
        </button>\r
        <button \r
          [class]="'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ' + (activeTab === 'examPapers' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600')"\r
          (click)="onTabChange('examPapers')">\r
          <i class="fas fa-file-alt"></i>\r
          <span class="hidden sm:inline">Exam Papers Created</span>\r
          <span class="sm:hidden">Exam Papers</span>\r
        </button>\r
        <button \r
          [class]="'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ' + (activeTab === 'stats' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600')"\r
          (click)="onTabChange('stats')">\r
          <i class="fas fa-chart-line"></i>\r
          <span class="hidden sm:inline">Statistics Overview</span>\r
          <span class="sm:hidden">Statistics</span>\r
        </button>\r
      </div>\r
    </div>\r
    <!-- Tab Content -->\r
    <div class="space-y-6">\r
      \r
      <!-- Combined Leaderboard Tab -->\r
      <div *ngIf="activeTab === 'combined'" class="animate-fadeIn">\r
        <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">\r
          <div class="mb-6">\r
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Combined Leaderboard - {{ getPeriodDisplayName(selectedPeriod) }}</h2>\r
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" *ngIf="!loading.combined">\r
              <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl text-center">\r
                <div class="text-2xl font-bold text-blue-800">{{ combinedMetadata.totalQuestions }}</div>\r
                <div class="text-sm text-blue-600 font-medium">Total Questions</div>\r
              </div>\r
              <div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl text-center">\r
                <div class="text-2xl font-bold text-green-800">{{ combinedMetadata.totalExamPapers }}</div>\r
                <div class="text-sm text-green-600 font-medium">Total Exam Papers</div>\r
              </div>\r
              <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl text-center">\r
                <div class="text-2xl font-bold text-purple-800">{{ combinedMetadata.totalContributions }}</div>\r
                <div class="text-sm text-purple-600 font-medium">Total Contributions</div>\r
              </div>\r
            </div>\r
          </div>\r
          \r
          <div class="text-center py-12" *ngIf="loading.combined">\r
            <i class="fas fa-spinner fa-spin text-3xl text-blue-500 mb-4"></i>\r
            <p class="text-gray-600 text-lg">Loading combined leaderboard...</p>\r
          </div>\r
          \r
          <div class="overflow-x-auto" *ngIf="!loading.combined && combinedLeaderboard.length > 0">\r
            <table class="w-full">\r
              <thead>\r
                <tr class="bg-gradient-to-r from-gray-800 to-gray-900 text-white">\r
                  <th class="px-4 py-4 text-left font-semibold rounded-tl-lg">Rank</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Admin</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Questions</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Exam Papers</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Total</th>\r
                  <th class="px-4 py-4 text-left font-semibold rounded-tr-lg">Performance</th>\r
                </tr>\r
              </thead>\r
              <tbody>              <tbody>\r
                <tr *ngFor="let entry of combinedLeaderboard" \r
                    [class]="'border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ' + \r
                    (entry.rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400' : \r
                     entry.rank === 2 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400' : \r
                     entry.rank === 3 ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400' : '')">\r
                  <td class="px-4 py-4">\r
                    <div class="flex items-center gap-2">\r
                      <div [class]="'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ' + \r
                           (entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' : \r
                            entry.rank === 2 ? 'bg-gray-400 text-gray-900' : \r
                            entry.rank === 3 ? 'bg-orange-400 text-orange-900' : 'bg-blue-100 text-blue-800')">\r
                        <span *ngIf="entry.rank <= 3">\r
                          <i class="fas fa-trophy text-xs" *ngIf="entry.rank === 1"></i>\r
                          <i class="fas fa-medal text-xs" *ngIf="entry.rank === 2"></i>\r
                          <i class="fas fa-award text-xs" *ngIf="entry.rank === 3"></i>\r
                        </span>\r
                        <span *ngIf="entry.rank > 3">{{ entry.rank }}</span>\r
                      </div>\r
                      <span class="font-medium text-gray-700" *ngIf="entry.rank <= 3">{{ entry.rank }}</span>\r
                    </div>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <div>\r
                      <div class="font-semibold text-gray-900">{{ entry.adminName }}</div>\r
                      <div class="text-sm text-gray-500">{{ entry.email }}</div>\r
                    </div>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <div class="flex flex-col">\r
                      <span class="font-semibold text-gray-900">{{ entry.questionsCount }}</span>\r
                      <span class="text-xs text-gray-500" *ngIf="entry.questionsPercentage">\r
                        ({{ entry.questionsPercentage }}%)\r
                      </span>\r
                    </div>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <div class="flex flex-col">\r
                      <span class="font-semibold text-gray-900">{{ entry.examPapersCount }}</span>\r
                      <span class="text-xs text-gray-500" *ngIf="entry.examPapersPercentage">\r
                        ({{ entry.examPapersPercentage }}%)\r
                      </span>\r
                    </div>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <span class="font-bold text-lg text-blue-600">{{ entry.totalContributions }}</span>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <div class="w-full bg-gray-200 rounded-full h-3">\r
                      <div class="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" \r
                           [style.width.%]="(entry.totalContributions / combinedMetadata.totalContributions) * 100">\r
                      </div>\r
                    </div>\r
                  </td>\r
                </tr>\r
              </tbody>\r
            </table>\r
          </div>\r
          \r
          <div class="text-center py-12" *ngIf="!loading.combined && combinedLeaderboard.length === 0">\r
            <i class="fas fa-chart-bar text-4xl text-gray-400 mb-4"></i>\r
            <p class="text-gray-600 text-lg">No data available for the selected period.</p>\r
          </div>\r
        </div>\r
      </div>      <!-- Questions Leaderboard Tab -->\r
      <div *ngIf="activeTab === 'questions'" class="animate-fadeIn">\r
        <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">\r
          <div class="mb-6">\r
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Question Addition Leaderboard - {{ getPeriodDisplayName(selectedPeriod) }}</h2>\r
            <div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl text-center max-w-xs" *ngIf="!loading.questions">\r
              <div class="text-2xl font-bold text-green-800">{{ questionMetadata.totalCount }}</div>\r
              <div class="text-sm text-green-600 font-medium">Total Questions Added</div>\r
            </div>\r
          </div>\r
          \r
          <div class="text-center py-12" *ngIf="loading.questions">\r
            <i class="fas fa-spinner fa-spin text-3xl text-green-500 mb-4"></i>\r
            <p class="text-gray-600 text-lg">Loading question leaderboard...</p>\r
          </div>\r
          \r
          <div class="overflow-x-auto" *ngIf="!loading.questions && questionLeaderboard.length > 0">\r
            <table class="w-full">\r
              <thead>\r
                <tr class="bg-gradient-to-r from-gray-800 to-gray-900 text-white">\r
                  <th class="px-4 py-4 text-left font-semibold rounded-tl-lg">Rank</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Admin</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Questions Added</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Percentage</th>\r
                  <th class="px-4 py-4 text-left font-semibold rounded-tr-lg">Performance</th>\r
                </tr>\r
              </thead>\r
              <tbody>\r
                <tr *ngFor="let entry of questionLeaderboard" \r
                    [class]="'border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ' + \r
                    (entry.rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400' : \r
                     entry.rank === 2 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400' : \r
                     entry.rank === 3 ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400' : '')">\r
                  <td class="px-4 py-4">\r
                    <div class="flex items-center gap-2">\r
                      <div [class]="'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ' + \r
                           (entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' : \r
                            entry.rank === 2 ? 'bg-gray-400 text-gray-900' : \r
                            entry.rank === 3 ? 'bg-orange-400 text-orange-900' : 'bg-green-100 text-green-800')">\r
                        <span *ngIf="entry.rank <= 3">\r
                          <i class="fas fa-trophy text-xs" *ngIf="entry.rank === 1"></i>\r
                          <i class="fas fa-medal text-xs" *ngIf="entry.rank === 2"></i>\r
                          <i class="fas fa-award text-xs" *ngIf="entry.rank === 3"></i>\r
                        </span>\r
                        <span *ngIf="entry.rank > 3">{{ entry.rank }}</span>\r
                      </div>\r
                      <span class="font-medium text-gray-700" *ngIf="entry.rank <= 3">{{ entry.rank }}</span>\r
                    </div>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <div>\r
                      <div class="font-semibold text-gray-900">{{ entry.adminName }}</div>\r
                      <div class="text-sm text-gray-500">{{ entry.email }}</div>\r
                    </div>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <span class="font-bold text-lg text-green-600">{{ entry.count }}</span>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <span class="font-medium text-gray-700" *ngIf="entry.percentage">\r
                      {{ entry.percentage }}%\r
                    </span>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <div class="w-full bg-gray-200 rounded-full h-3">\r
                      <div class="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500" \r
                           [style.width.%]="entry.percentage || 0">\r
                      </div>\r
                    </div>\r
                  </td>\r
                </tr>\r
              </tbody>\r
            </table>\r
          </div>\r
          \r
          <div class="text-center py-12" *ngIf="!loading.questions && questionLeaderboard.length === 0">\r
            <i class="fas fa-question-circle text-4xl text-gray-400 mb-4"></i>\r
            <p class="text-gray-600 text-lg">No questions added in the selected period.</p>\r
          </div>\r
        </div>\r
      </div>      <!-- Exam Papers Leaderboard Tab -->\r
      <div *ngIf="activeTab === 'examPapers'" class="animate-fadeIn">\r
        <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">\r
          <div class="mb-6">\r
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Exam Paper Creation Leaderboard - {{ getPeriodDisplayName(selectedPeriod) }}</h2>\r
            <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl text-center max-w-xs" *ngIf="!loading.examPapers">\r
              <div class="text-2xl font-bold text-purple-800">{{ examPaperMetadata.totalCount }}</div>\r
              <div class="text-sm text-purple-600 font-medium">Total Exam Papers Created</div>\r
            </div>\r
          </div>\r
          \r
          <div class="text-center py-12" *ngIf="loading.examPapers">\r
            <i class="fas fa-spinner fa-spin text-3xl text-purple-500 mb-4"></i>\r
            <p class="text-gray-600 text-lg">Loading exam paper leaderboard...</p>\r
          </div>\r
          \r
          <div class="overflow-x-auto" *ngIf="!loading.examPapers && examPaperLeaderboard.length > 0">\r
            <table class="w-full">\r
              <thead>\r
                <tr class="bg-gradient-to-r from-gray-800 to-gray-900 text-white">\r
                  <th class="px-4 py-4 text-left font-semibold rounded-tl-lg">Rank</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Admin</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Exam Papers Created</th>\r
                  <th class="px-4 py-4 text-left font-semibold">Percentage</th>\r
                  <th class="px-4 py-4 text-left font-semibold rounded-tr-lg">Performance</th>\r
                </tr>\r
              </thead>\r
              <tbody>\r
                <tr *ngFor="let entry of examPaperLeaderboard" \r
                    [class]="'border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ' + \r
                    (entry.rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400' : \r
                     entry.rank === 2 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400' : \r
                     entry.rank === 3 ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400' : '')">\r
                  <td class="px-4 py-4">\r
                    <div class="flex items-center gap-2">\r
                      <div [class]="'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ' + \r
                           (entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' : \r
                            entry.rank === 2 ? 'bg-gray-400 text-gray-900' : \r
                            entry.rank === 3 ? 'bg-orange-400 text-orange-900' : 'bg-purple-100 text-purple-800')">\r
                        <span *ngIf="entry.rank <= 3">\r
                          <i class="fas fa-trophy text-xs" *ngIf="entry.rank === 1"></i>\r
                          <i class="fas fa-medal text-xs" *ngIf="entry.rank === 2"></i>\r
                          <i class="fas fa-award text-xs" *ngIf="entry.rank === 3"></i>\r
                        </span>\r
                        <span *ngIf="entry.rank > 3">{{ entry.rank }}</span>\r
                      </div>\r
                      <span class="font-medium text-gray-700" *ngIf="entry.rank <= 3">{{ entry.rank }}</span>\r
                    </div>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <div>\r
                      <div class="font-semibold text-gray-900">{{ entry.adminName }}</div>\r
                      <div class="text-sm text-gray-500">{{ entry.email }}</div>\r
                    </div>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <span class="font-bold text-lg text-purple-600">{{ entry.count }}</span>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <span class="font-medium text-gray-700" *ngIf="entry.percentage">\r
                      {{ entry.percentage }}%\r
                    </span>\r
                  </td>\r
                  <td class="px-4 py-4">\r
                    <div class="w-full bg-gray-200 rounded-full h-3">\r
                      <div class="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500" \r
                           [style.width.%]="entry.percentage || 0">\r
                      </div>\r
                    </div>\r
                  </td>\r
                </tr>\r
              </tbody>\r
            </table>\r
          </div>\r
          \r
          <div class="text-center py-12" *ngIf="!loading.examPapers && examPaperLeaderboard.length === 0">\r
            <i class="fas fa-file-alt text-4xl text-gray-400 mb-4"></i>\r
            <p class="text-gray-600 text-lg">No exam papers created in the selected period.</p>\r
          </div>\r
        </div>\r
      </div>      <!-- Statistics Overview Tab -->\r
      <div *ngIf="activeTab === 'stats'" class="animate-fadeIn">\r
        <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">\r
          <div class="mb-8">\r
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Admin Statistics Overview</h2>\r
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" *ngIf="!loading.stats">\r
              <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl text-center">\r
                <div class="text-2xl font-bold text-blue-800">{{ statsMetadata.totalAdmins }}</div>\r
                <div class="text-sm text-blue-600 font-medium">Total Admins</div>\r
              </div>\r
              <div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl text-center">\r
                <div class="text-2xl font-bold text-green-800">{{ statsMetadata.totalQuestions }}</div>\r
                <div class="text-sm text-green-600 font-medium">Total Questions</div>\r
              </div>\r
              <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl text-center">\r
                <div class="text-2xl font-bold text-purple-800">{{ statsMetadata.totalExamPapers }}</div>\r
                <div class="text-sm text-purple-600 font-medium">Total Exam Papers</div>\r
              </div>\r
              <div class="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-xl text-center">\r
                <div class="text-2xl font-bold text-indigo-800">{{ statsMetadata.totalContributions }}</div>\r
                <div class="text-sm text-indigo-600 font-medium">Total Contributions</div>\r
              </div>\r
            </div>\r
          </div>\r
          \r
          <div class="text-center py-12" *ngIf="loading.stats">\r
            <i class="fas fa-spinner fa-spin text-3xl text-indigo-500 mb-4"></i>\r
            <p class="text-gray-600 text-lg">Loading statistics...</p>\r
          </div>\r
          \r
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" *ngIf="!loading.stats && adminStats.length > 0">\r
            <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200" *ngFor="let admin of adminStats">\r
              <div class="mb-4 border-b border-gray-300 pb-3">\r
                <h3 class="text-lg font-bold text-gray-900">{{ admin.adminName }}</h3>\r
                <p class="text-sm text-gray-600">{{ admin.email }}</p>\r
              </div>\r
              <div class="space-y-4">\r
                <div class="bg-white rounded-lg p-3 border border-gray-200">\r
                  <h4 class="text-sm font-semibold text-gray-800 mb-2">Today</h4>\r
                  <div class="space-y-1 text-sm">\r
                    <div class="flex justify-between">\r
                      <span class="text-gray-600">Questions:</span>\r
                      <span class="font-medium text-green-600">{{ admin.periods.today.questions }}</span>\r
                    </div>\r
                    <div class="flex justify-between">\r
                      <span class="text-gray-600">Exam Papers:</span>\r
                      <span class="font-medium text-purple-600">{{ admin.periods.today.examPapers }}</span>\r
                    </div>\r
                    <div class="flex justify-between border-t pt-1">\r
                      <span class="font-medium text-gray-800">Total:</span>\r
                      <span class="font-bold text-blue-600">{{ admin.periods.today.total }}</span>\r
                    </div>\r
                  </div>\r
                </div>\r
                <div class="bg-white rounded-lg p-3 border border-gray-200">\r
                  <h4 class="text-sm font-semibold text-gray-800 mb-2">Last 7 Days</h4>\r
                  <div class="space-y-1 text-sm">\r
                    <div class="flex justify-between">\r
                      <span class="text-gray-600">Questions:</span>\r
                      <span class="font-medium text-green-600">{{ admin.periods.last7Days.questions }}</span>\r
                    </div>\r
                    <div class="flex justify-between">\r
                      <span class="text-gray-600">Exam Papers:</span>\r
                      <span class="font-medium text-purple-600">{{ admin.periods.last7Days.examPapers }}</span>\r
                    </div>\r
                    <div class="flex justify-between border-t pt-1">\r
                      <span class="font-medium text-gray-800">Total:</span>\r
                      <span class="font-bold text-blue-600">{{ admin.periods.last7Days.total }}</span>\r
                    </div>\r
                  </div>\r
                </div>\r
                <div class="bg-white rounded-lg p-3 border border-gray-200">\r
                  <h4 class="text-sm font-semibold text-gray-800 mb-2">Last 30 Days</h4>\r
                  <div class="space-y-1 text-sm">\r
                    <div class="flex justify-between">\r
                      <span class="text-gray-600">Questions:</span>\r
                      <span class="font-medium text-green-600">{{ admin.periods.last30Days.questions }}</span>\r
                    </div>\r
                    <div class="flex justify-between">\r
                      <span class="text-gray-600">Exam Papers:</span>\r
                      <span class="font-medium text-purple-600">{{ admin.periods.last30Days.examPapers }}</span>\r
                    </div>\r
                    <div class="flex justify-between border-t pt-1">\r
                      <span class="font-medium text-gray-800">Total:</span>\r
                      <span class="font-bold text-blue-600">{{ admin.periods.last30Days.total }}</span>\r
                    </div>\r
                  </div>\r
                </div>\r
                <div class="bg-white rounded-lg p-3 border border-gray-200">\r
                  <h4 class="text-sm font-semibold text-gray-800 mb-2">All Time</h4>\r
                  <div class="space-y-1 text-sm">\r
                    <div class="flex justify-between">\r
                      <span class="text-gray-600">Questions:</span>\r
                      <span class="font-medium text-green-600">{{ admin.periods.allTime.questions }}</span>\r
                    </div>\r
                    <div class="flex justify-between">\r
                      <span class="text-gray-600">Exam Papers:</span>\r
                      <span class="font-medium text-purple-600">{{ admin.periods.allTime.examPapers }}</span>\r
                    </div>\r
                    <div class="flex justify-between border-t pt-1">\r
                      <span class="font-medium text-gray-800">Total:</span>\r
                      <span class="font-bold text-blue-600">{{ admin.periods.allTime.total }}</span>\r
                    </div>\r
                  </div>\r
                </div>\r
              </div>\r
            </div>\r
          </div>\r
          \r
          <div class="text-center py-12" *ngIf="!loading.stats && adminStats.length === 0">\r
            <i class="fas fa-chart-line text-4xl text-gray-400 mb-4"></i>\r
            <p class="text-gray-600 text-lg">No admin statistics available.</p>\r
          </div>\r
        </div>\r
      </div>\r
    </div>\r
  </div>\r
</div>\r
`, styles: ["/* src/app/components/leaderboard/leaderboard.component.scss */\n@keyframes fadeIn {\n  from {\n    opacity: 0;\n    transform: translateY(10px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n.animate-fadeIn {\n  animation: fadeIn 0.3s ease-in-out;\n}\n.overflow-x-auto {\n  scrollbar-width: thin;\n  scrollbar-color: #cbd5e0 #f7fafc;\n}\n.overflow-x-auto::-webkit-scrollbar {\n  height: 6px;\n}\n.overflow-x-auto::-webkit-scrollbar-track {\n  background: #f7fafc;\n  border-radius: 3px;\n}\n.overflow-x-auto::-webkit-scrollbar-thumb {\n  background: #cbd5e0;\n  border-radius: 3px;\n}\n.overflow-x-auto::-webkit-scrollbar-thumb:hover {\n  background: #a0aec0;\n}\n/*# sourceMappingURL=leaderboard.component.css.map */\n"] }]
  }], () => [{ type: LeaderboardService }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LeaderboardComponent, { className: "LeaderboardComponent", filePath: "src/app/components/leaderboard/leaderboard.component.ts", lineNumber: 31 });
})();
export {
  LeaderboardComponent
};
//# sourceMappingURL=chunk-RPVJZOK6.js.map
