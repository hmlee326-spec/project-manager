import { useState, useEffect, useRef } from "react";
import {
  Plus, X, ChevronDown, ChevronRight, PenLine, Check, Trash2,
  Loader2, AlertCircle, RotateCcw, Square, CheckSquare, GripVertical, FileText,
} from "lucide-react";
import { supabase } from "./supabase";

/* ------------------------------------------------------------------ */
/*  Design tokens (Lyra-adjacent: warm paper, ink, restrained violet)  */
/* ------------------------------------------------------------------ */
const C = {
  paper: "#FBFAF6",
  card: "#FFFFFF",
  ink: "#191526",
  muted: "#6B6478",
  faint: "#9A93A6",
  border: "#ECE8F2",
  violet: "#0F6E56",
  violetSoft: "#E1F1EC",
  bar: "#C6DDD4",
  section: "#F4F3F6",
};

const STATUS = {
  "on-track":    { label: "정상",   dot: "#16A34A", bg: "#EAF7EF", fg: "#177A3E" },
  "in-progress": { label: "진행중", dot: "#0F6E56", bg: "#E1F1EC", fg: "#0F6E56" },
  "review":      { label: "리뷰",   dot: "#D97706", bg: "#FCF2E3", fg: "#9A5A05" },
  "blocked":     { label: "블로커", dot: "#E11D48", bg: "#FCEBEF", fg: "#B01238" },
  "done":        { label: "완료",   dot: "#64748B", bg: "#EEF1F5", fg: "#475569" },
};
const STATUS_ORDER = ["in-progress", "review", "blocked", "on-track", "done"];

const VIZ = {
  high: { label: "High", bg: "#D3EAE1", fg: "#0F6E56" },
  med:  { label: "Med",  bg: "#F0EFF3", fg: "#6B6478" },
  low:  { label: "Low",  bg: "#F0EFF3", fg: "#9A93A6" },
};
const VIZ_ORDER = { high: 0, med: 1, low: 2 };

// checklist priority highlight backgrounds (right-click)
const HL = { yellow: "#FEF3C7", red: "#FEE2E2", green: "#DCFCE7" };

// The four recurring meeting sources
const MTYPE = {
  tiger:      { label: "Tiger Team",     short: "TT",   bg: "#E1F1EC", fg: "#0F6E56" },
  innovation: { label: "Innovation",     short: "INNO", bg: "#E3F0FB", fg: "#2166A8" },
  dashboard:  { label: "Weekly Dashboard", short: "DASH", bg: "#EAF7EF", fg: "#177A3E" },
  trish:      { label: "1:1 (Trish)",    short: "1:1",  bg: "#FCF2E3", fg: "#9A5A05" },
  others:     { label: "Others",         short: "기타", bg: "#EEF1F5", fg: "#475569" },
  manual:     { label: "직접 입력",       short: "직접", bg: "#F0EFF3", fg: "#6B6478" },
};
const MTYPE_ORDER = ["tiger", "innovation", "dashboard", "trish", "others", "manual"];

const VISIBLE_ENTRIES = 3; // 표에 살리는 최근 미팅 수 (입력 1 + 이전 2)

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const K_PROJECTS = "tigerteam:v2:projects";
const K_VERSION = "tigerteam:v2:seedVersion";
const K_COLW = "tigerteam:v2:colwidths";
const K_NOTES = "tigerteam:v2:notes";
const K_ORDER = "tigerteam:v2:order";
const K_TRANSCRIPTS = "tigerteam:v2:transcripts";
const SEED_VERSION = "2026-08-20-b";
const DEFAULT_COLW = [18.5, 18.5, 26, 16, 21]; // Current / Next / Brett / Other / My Work

const toBullets = (v) => (v || "").split(/\s·\s|\n+/).map((s) => s.trim()).filter(Boolean);

/* ------------------------------------------------------------------ */
/*  Seed content (Meeting 1 · Tiger Team · 2026-08-18)                  */
/*  Rich source kept intact, then mapped into the timeline schema.     */
/* ------------------------------------------------------------------ */
const SEED_DATE = "2026-08-18";
const rawSeed = () => [
  {
    id: "sales-effectiveness", name: "Sales Effectiveness", lead: "Josh (데이터) · 나 (viz)",
    status: "in-progress", vizPriority: "low",
    page: "코칭 패키지", location: "코칭 패키지 (추후 QC 연계)", targetDate: "이번 주",
    currentStatus: "Consumer Cellular 새 프로세스 실행 완료, 결과물 확보 · Opportune 비교 대기",
    nextWork: "Opportune 결과 확보 후 Consumer Cellular와 비교 뷰 시안 · 코칭 패키지용 시각화 포맷 정의 · F/U Josh: Opportune 실행 결과·데이터 확보 시점",
    otherFeedback: "코칭 문구 방향 OK · 세일즈 행동을 상위 4개로 압축한 게 효과적",
    brettFeedback: "—", brettQuotes: "",
    summary: "Consumer Cellular에 업데이트 프로세스 실행, 결과물 확보. Opportune에도 동일 실행해 apples-to-apples 비교 예정. 행동 top 4 압축이 QC 코칭 패키지 개발에 도움.",
  },
  {
    id: "qc-coaching", name: "QC Coaching", lead: "Min (viz) · Josh (데이터)",
    status: "in-progress", vizPriority: "high",
    page: "Agent Performance", location: "Agent Performance / Automation 페이지 — 우측 패널 (Top 3 Agents)", targetDate: "—",
    currentStatus: "Josh의 Charles Schwab 데이터로 Top 3 Agents 시각화 1차 구축 · 데이터 정렬·recommended action 표현 논의 중",
    nextWork: "narrative 제거 + example calls 노출로 레이아웃 조정 · recommended action 섹션 표현 확정(다른 데모 톤에 맞춤) · real estate 정리 · 재귀 프롬프트 산출물(통합 코칭 플랜) 들어올 자리 설계 · F/U Josh: 재귀 프롬프트 통합 코칭 플랜 산출 데이터 · F/U Trish: recommended action 표현·프롬프트 방향 · F/U Josh: sentiment 믹스 버전 데이터",
    otherFeedback: "다른 데모와 레이아웃 상이 — 다른 데모는 요약 짧고 narrative 매우 작음(그에 맞춰 정리 필요) · narrative 빼고 example calls 노출 검토 · recommended action 표현 미정 · 화면 공간(real estate) 우려 · 아직 AHT 중심, sentiment 믹스 버전 필요 · Joy 데이터가 현 Auto Insights와 미정렬",
    brettFeedback: "**예시는 '다른 시스템에 있다'고 설명하고 빼도 됨** · **대신 좋은 예시 몇 개 + recommended action은 반드시 있어야 함** · 저성과 5건에 재귀 프롬프트 → 통합 코칭 플랜이 훨씬 강력할 것 · **narrative는 '역량 데모'가 목적 — 임원이 '와' 하게, 감독관 수기 vs 자동 시스템 대비를 보여줄 것(다운스트림 앱 탑재 각인)**",
    brettQuotes: "요약은 꽤 짧고, narrative는 아주 작아.\n예시는 우리가 갖고 있지 않을 거니까 빼도 돼 — 대신 좋은 예시 몇 개랑 recommended action은 꼭 있어야 해.\n저성과 인터랙션 5건에 프롬프트를 각각 돌려서 이 수준의 디테일을 뽑고, 그 결과를 소비하는 또 다른 프롬프트가 통합 코칭 플랜을 뱉게 해. 그러면 훨씬 강력한 결과가 나올 거야.\n임원이 이걸 보고 '와' 하게 만들고 싶어 — 감독관이 콜을 일일이 들으며 수기로 하는 것과 대비되게. 그게 우리가 보여주려는 역량이야.",
    summary: "Min이 Josh의 Charles Schwab 데이터로 Top 3 Agents 시각화 구축. Joy 데이터가 현 Auto Insights와 미정렬. 버튼→코칭 플랜 빌드. recommended action은 LLM 리뷰어 코멘트 기반. 목표: 데모에서 임원에게 자동 코칭 역량 각인.",
  },
  {
    id: "ui-enhancements", name: "UI Enhancements (Cognigy Build)", lead: "Min",
    status: "review", vizPriority: "med",
    page: "Cognigy Build", location: "Cognigy AI agent build — L3 / bar chart", targetDate: "—",
    currentStatus: "L3 기반 에이전트 생성 기능 빌드 완료 · Augmentation 분석은 Brett 리뷰 대기",
    nextWork: "Augmentation 분석 Brett 리뷰 반영 후 뷰 클로즈아웃 · L3/bar chart 기반 생성 UI 최종 점검 · F/U Brett: augmentation 분석 리뷰 완료 확인",
    otherFeedback: "L3 기반 에이전트 생성 기능 완성 (Jeremy 요청) → 만족",
    brettFeedback: "**L3(및 bar chart) 기반 생성 기능에 만족** · Jeremy가 매우 만족",
    brettQuotes: "완벽해 — Jeremy가 아주 만족할 거야.",
    summary: "L3(및 bar chart)에서 에이전트 생성 기능 빌드 완료. Augmentation 분석은 Brett 리뷰 대기 → 완료 시 클로즈아웃 예정.",
  },
  {
    id: "auto-summary", name: "Auto Summary", lead: "Philip · Josh (통합)",
    status: "in-progress", vizPriority: "high",
    page: "Augmentation 패널", location: "Augmentation 영역 — 우측 패널 (coaching/summary/copilot 옵션 선택 구조)", targetDate: "8/31",
    currentStatus: "프롬프트 확보, 선택 인터랙션에 프롬프트 전송 워크플로우 구축 중 · Josh 복귀 후 통합 예정",
    nextWork: "우측 패널 옵션 선택 구조(coaching/summary/copilot) 설계 · summary 예시 진입 뷰 구성 · Josh 통합 후 실데이터 연결 · F/U Philip: 프롬프트 전송 워크플로우 산출물 · F/U Josh: Auto Insights 통합 방식·일정",
    otherFeedback: "우측 패널에서 옵션 선택 후 예시 진입 구조 방향 확정",
    brettFeedback: "**위치는 augmentation에서 시작(에이전트 대신 일해 더 빠르게 만드는 솔루션), 필요시 나중에 lift & shift** · 날짜 미스는 OK지만 타깃은 반드시 추적·보고(adoption/usage 기반 revenue recognition 대비) · **우측 패널은 coaching/summary/copilot 옵션 선택 후 예시 진입 구조**",
    brettQuotes: "날짜를 놓치는 걸 두려워하지 마 — 괜찮아. 다만 타깃은 분명히 잡고 있어야 해.\n앞으로 adoption과 사용 기반 revenue recognition 쪽으로 훨씬 더 밀어붙일 거야.\n이건 정말 augmentation형 솔루션이야 — 에이전트 대신 일을 해서 더 빠르게 만들어주는. 그러니 일단 거기서 시작하고, 나중에 옮겨야 할지 판단하자.\n우측 패널을 열면 그중 뭘 보여줄지 고르는 옵션이 나오고, 거기서 실제 예시로 들어가는 구조야.",
    summary: "선택 인터랙션에 프롬프트 전송 워크플로우 구축 중. 프로세싱 수요일, 통합 목/금, UI +1주. 위치는 augmentation에서 시작 후 필요시 lift & shift.",
  },
  {
    id: "copilot", name: "Copilot Opportunity", lead: "Jake (Jay)",
    status: "in-progress", vizPriority: "med",
    page: "Task Analysis", location: "Auto Insights 대시보드 — L2 task 아이템 기반", targetDate: "—",
    currentStatus: "BCBS Nebraska 대상 L2 quick-win 3~4개 식별 · Claude Code에서 프롬프트 테스트 중",
    nextWork: "Task Analysis 페이지에 copilot 자동화 후보(빈번·장시간 task) 표시 뷰 초안 · 경로 확정 후 build 훅 배치 · F/U copilot 팀(Brett Crutchfield?): task automation 입력 방식·요건 · F/U Jake: L2 프롬프트 테스트 결과",
    otherFeedback: "기존 분석(task analysis + copilot distribution) 실현에 집중, 새 가치탐색 지양 · 초기엔 표준화 우선(고객별/LLM 평가 과투자 금지)",
    brettFeedback: "새 가치탐색 말고 기존 분석(task analysis) 실현에 집중 — 바퀴 재발명 금지 · copilot 팀과 통화해 현 자동화 요건 파악 → 트랜스크립트로 task 채워 데모 → Cognigy처럼 push가 진짜 목표 · 초기엔 표준화 우선, 고객별/LLM 평가 과투자는 account-level로 미룰 것",
    brettQuotes: "일단 속도를 위해 표준화부터 하면 돼. 초기 개발에선 고객사별 고려는 신경 쓰지 마.\nLLM 평가에 너무 많은 노력을 들이고 싶지 않아 — 결과가 안 좋으면 더 강력한 모델로 넘어가.\n지금 우리가 바퀴를 재발명하고 있는 것 같아서, 초점을 제대로 잡고 싶어.\ncopilot 팀과 통화해야 해... 자주 발생하고 너무 오래 걸리는 task를 찾아서, 결국 Cognigy처럼 copilot에 push해서 빌드하는 거야. 그게 이 건에서 내 진짜 목표야.",
    summary: "BCBS Nebraska 대상 L2 quick-win 3~4개 식별, Claude Code에서 프롬프트 테스트. 방향: 트랜스크립트에서 빈번/장시간 task 찾아 자동화→데모→copilot push (Cognigy 방식).",
  },
  {
    id: "entity-extraction", name: "Entity / Format Extraction", lead: "발표자 · John Cadell·Anne 리뷰",
    status: "blocked", vizPriority: "low",
    page: "Automated Insights", location: "Automated Insights — Cognigy 업로드 포맷 산출", targetDate: "월말",
    currentStatus: "synthetic transcript 테스트 완료 · production 테스트는 LLM 미세팅으로 대기 · 금요일 리뷰",
    nextWork: "엔티티 추출 결과(예시·노트) 리뷰 뷰 정리 · 빌드 내 사용처/소요시간·40% 자동화 임팩트 수치 표시 설계 · F/U John Cadell·Anne: 금요일 리뷰 결과 · F/U AOD 401 서버 LLM 세팅 일정",
    otherFeedback: "현 빌드는 엔티티를 전부 string 디폴트 · synthetic 10건서 6 엔티티 추출(예시+노트)",
    brettFeedback: "빌드에서 엔티티가 어디에 얼마나 쓰이는지·어느 단계가 가장 오래 걸리는지 파악이 관건 · 현 빌드 40% 자동화 주장 → 실제 임팩트 수치를 강하게 뽑아낼 것(회사 차원 매우 중요)",
    brettQuotes: "흥미로운 지점은, 그 엔티티들을 빌드 어디어디에 쓰는지 — 추가부터 테스트까지 — 그리고 어느 단계가 가장 오래 걸리는지, 그걸 어떻게 처리할지를 파악하는 거야.\n지금 것이 빌드 프로세스의 최대 40%를 자동화한다고 들었어... 실제 임팩트 수치를 강하게 뽑아내는 지점까지 가야 해. 그게 정말 중요하니까.",
    summary: "프로세스 완성, synthetic 테스트 완료. production 테스트는 AOD 401 서버 LLM 미세팅으로 막힘. 빌드 40% 자동화 주장 → 실제 임팩트 수치화 목표. FDE팀 관심.",
  },
  {
    id: "auth-agent", name: "Authentication Agent", lead: "Philip · Min (viz)",
    status: "in-progress", vizPriority: "high",
    page: "분석 우측 패널", location: "분석 우측 패널 — 옵션 1: Auth agent 빌드 + 절감 초", targetDate: "이번 주",
    currentStatus: "Philip 파트 오늘 완료 예정 · Min 시각화 미착수",
    nextWork: "우측 패널 옵션1(Auth agent + 절감 초) 구축 · 집계 임팩트·intent-level 캐릭터 카운트 표시 · 절감 초 데이터 소스 확정 후 연결 · F/U Josh: 절감 초 계산·데이터 소스 · F/U product: prompt studio 등록 일정 · F/U Philip: 파트 완료 여부",
    otherFeedback: "절감 초/집계 임팩트 계산 필요 · intent-level 캐릭터 카운트를 여기서도 표시",
    brettFeedback: "**auth·FAQ 둘 다 분석 우측 패널에 노출 필수, 잠재 임팩트(절감 초) 계산해 publish** · **옵션1 = auth agent + 절감 초, 옵션2 = FAQ agent + 볼륨** · 집계 접근이 중요 — '배포하면 에이전트/캐릭터 몇 개?' 후속질문 대비 · **intent-level 캐릭터 카운트를 여기서도 반드시 표시**",
    brettQuotes: "이 둘 다 분석 어딘가에는 떠야 해 — 우측 패널에만이라도.\n잠재 임팩트를 계산해서 그걸 publish할 방법이 있어야 해.\n첫 번째 옵션은 authentication agent를 만드는 거고, 몇 초를 절감하는지. 두 번째 옵션은 FAQ agent를 만드는 거고, 그 볼륨.\n이 에이전트들을 만들어서 배포하면 캐릭터가 몇 개나 나올지 예상돼? 그건 빠른 후속이나 릴리스의 일부가 돼야 해.\n캐릭터 카운트는 이미 해놨어 — 이것들에도 똑같이 표시되게만 해줘.",
    summary: "Philip: Josh 자료 확보, 오늘 완료 예정(약간 지연). Min 시각화 미착수. 현 AI agent build와 동일 흐름. 집계 접근으로 스코핑(에이전트/캐릭터 수) 대응 필요.",
  },
  {
    id: "faq-agent", name: "FAQ Agent", lead: "발표자 · Jared (screen-scrape)",
    status: "in-progress", vizPriority: "med",
    page: "분석 우측 패널", location: "분석 우측 패널 — 옵션 2: FAQ agent 빌드 + 볼륨", targetDate: "미정",
    currentStatus: "모델링 요건 Josh 리뷰 중 · Jared가 screen-scrape 리서치 착수",
    nextWork: "우측 패널 옵션2(FAQ agent + 볼륨)를 Auth와 병렬 배치 · FAQ 판별 데이터 확정 후 볼륨/임팩트 연결 · F/U Josh: FAQ 판별 모델링·판별 데이터 · F/U Jared: screen-scrape 리서치 진행",
    otherFeedback: "우측 패널 옵션2로 auth agent와 병렬 배치 · 볼륨/임팩트 표시",
    brettFeedback: "Sasha의 '자동화 에이전트만 만드는 건 best practice 아님' 순수주의보다 현실적으로 둘 다 해서 Cognigy 봇을 더 빨리 내보내는 게 우선 · screen-scrape는 소요시간·비용·빈도 등 리서치가 먼저(지금 과하게 걱정 말 것)",
    brettQuotes: "장담하는데 Sasha는 '자동화 에이전트만 만드는 건 절대 best practice가 아니다'라고 할 거야... 근데 이제는 둘 다 할 수 있어야 하는 상황이야. 둘 다 해야 해.\n실제 Cognigy 봇을 세상에 더 빨리 내보낼 방법이 필요해.\n파악할 게 백만 가지야 — 얼마나 걸릴지, 비용은 얼마일지, 화면은 얼마나 자주 받을지... 그 상당 부분은 너무 걱정하기 전에 리서치에서 먼저 나와야 해.",
    summary: "Andrew Tucker 카테고리(5-phase) 기반 모델링, Josh 리뷰. task data로 FAQ vs 복잡 구분(API 필요시 FAQ 부적합). FAQ-only intent를 agent filter서 제외할지 논의(툴 한계 5 agents×20 tools). Jared 접근권한 확보 후 착수.",
  },
  {
    id: "cross-channel", name: "Cross-Channel (Chat / Cognigy)", lead: "Anisha (chat) · Zishan/FDE (Cognigy)",
    status: "in-progress", vizPriority: "med",
    page: "Cross-Channel", location: "Auto Insights — cross-channel sentiment / quality", targetDate: "—",
    currentStatus: "Zishan이 Cognigy transcript 제공 예정 · Anisha가 chat automatability 알고리즘 수정 중(일부 필드 chat엔 없음) · DFO chat은 정규 파이프라인서 제외(수집 이슈)",
    nextWork: "Cognigy transcript baseline 비교 뷰 · cross-channel sentiment/quality 뷰 초안 · Cox 추가 시 반영 · F/U Zishan: Cognigy transcript/metadata 전달 · F/U Anisha: chat automatability 결과 · F/U Cox run list 추가 여부",
    otherFeedback: "—",
    brettFeedback: "Cox와 R&D 라이선스 계약이 깊어 데이터 소스 활용 여지 큼(이미 chat 인제스트 중일 수 있음) · 어차피 솔루션은 universal해야 하므로 non-Cognigy 채널 포함 살펴볼 가치 있음",
    brettQuotes: "우리는 특히 Cox Communications와 R&D 관점에서 깊은 라이선스 계약이 있어 — 파고들 만한 데이터 소스로서 기회가 많아.\n어차피 이건 universal해야 하니까, 한번 살펴보는 것도 흥미로울 거야.",
    summary: "Zishan이 Cognigy transcript+metadata 제공 예정(Auto Insights 적용성 검토). DFO chat이 Kevin 툴서 제외→정규 파이프라인 불가. Cox(R&D 라이선스, 2월 POC) cross-channel sentiment 관심.",
  },
  {
    id: "topic-ai", name: "Topic AI", lead: "발표자 · Chris",
    status: "in-progress", vizPriority: "low",
    page: "—", location: "—", targetDate: "—",
    currentStatus: "pre-sales POC + Jeremy intake 프로세스를 툴에 통합 중.",
    nextWork: "프로세스 통합 산출물 정리 후 시각화 요소 검토 (현재 viz 미정) · F/U Richard Cooney: 프로세스 플로우 · F/U Jeremy: 스크린샷/플로우 · F/U Chris: 통합 진행",
    otherFeedback: "—",
    brettFeedback: "—", brettQuotes: "",
    summary: "pre-sales POC 프로세스 + Jeremy 팀 intake 프로세스 통합 중. Richard Cooney 플로우 제공, Chris와 반영.",
  },
];

const isFU = (b) => /^F\/U/i.test(b);
const toItems = (arr) => arr.map((t) => ({ id: uid(), text: t, done: false }));

// Map rich seed into the timeline schema: one entry (Meeting 1) + starter checklists.
const seedProjects = () => rawSeed().map((p) => {
  const bullets = toBullets(p.nextWork);
  return {
    id: p.id, name: p.name, lead: p.lead, status: p.status,
    vizPriority: p.vizPriority, page: p.page, location: p.location, targetDate: p.targetDate,
    entries: [{
      id: uid(), date: SEED_DATE, mtype: "tiger",
      currentStatus: p.currentStatus,
      brettFeedback: p.brettFeedback,
      brettQuotes: p.brettQuotes,
      otherFeedback: p.otherFeedback,
      summary: p.summary,
    }],
    nextSteps: toItems(bullets.filter(isFU)),
    myWork: toItems(bullets.filter((b) => !isFU(b))),
  };
});

/* ------------------------------------------------------------------ */
/*  Storage helpers — Supabase kv table (shared across all devices)     */
/* ------------------------------------------------------------------ */
const store = {
  async get(key) {
    try {
      const { data, error } = await supabase.from("kv").select("value").eq("key", key).maybeSingle();
      if (error || !data) return null;
      return data.value; // jsonb -> already an object
    } catch { return null; }
  },
  async set(key, val) {
    try {
      await supabase.from("kv").upsert({ key, value: val, updated_at: new Date().toISOString() });
    } catch { /* ignore */ }
  },
};

const allDatesOf = (projects) =>
  [...new Set((projects || []).flatMap((p) => p.entries.map((e) => e.date)))]
    .sort().reverse();

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function TigerTeamTracker() {
  const [projects, setProjects] = useState(null);
  const [notes, setNotes] = useState([]);
  const [tab, setTab] = useState("projects"); // "projects" | "notes"
  const [showAdd, setShowAdd] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [groupBy, setGroupBy] = useState("page");
  const [selDates, setSelDates] = useState(() => new Set()); // empty = latest; else show only these dates
  const toggleDate = (d) => setSelDates((prev) => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; });
  const clearDates = () => setSelDates(new Set());
  const [mtypeOn, setMtypeOn] = useState(() => new Set(MTYPE_ORDER));
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [manualOrder, setManualOrder] = useState(null); // array of project ids, or null (auto)
  const [projDragId, setProjDragId] = useState(null);
  const [transcripts, setTranscripts] = useState({}); // { "YYYY-MM-DD": "원문 텍스트" }
  const [txDate, setTxDate] = useState(null); // date whose transcript modal is open
  const [colW, setColW] = useState(DEFAULT_COLW);
  const colWRef = useRef(DEFAULT_COLW);
  const applyColW = (w) => { colWRef.current = w; setColW(w); };
  const commitColW = () => { if (colWRef.current) store.set(K_COLW, colWRef.current); };
  const toggleCollapse = (id) => setCollapsedIds((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleMtype = (k) => setMtypeOn((prev) => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  /* load / seed / migrate */
  useEffect(() => {
    (async () => {
      let p = await store.get(K_PROJECTS);
      const ver = await store.get(K_VERSION);
      if (!p) {
        p = seedProjects();
        await store.set(K_PROJECTS, p); await store.set(K_VERSION, SEED_VERSION);
      } else if (ver !== SEED_VERSION) {
        const fresh = seedProjects();
        const seedIds = new Set(fresh.map((s) => s.id));
        const extras = p.filter((x) => !seedIds.has(x.id));
        p = [...fresh, ...extras];
        await store.set(K_PROJECTS, p); await store.set(K_VERSION, SEED_VERSION);
      }
      setProjects(p);
      const w = await store.get(K_COLW);
      if (Array.isArray(w) && w.length === DEFAULT_COLW.length) applyColW(w);
      const nz = await store.get(K_NOTES);
      if (Array.isArray(nz)) setNotes(nz);
      const ord = await store.get(K_ORDER);
      if (Array.isArray(ord)) setManualOrder(ord);
      const tx = await store.get(K_TRANSCRIPTS);
      if (tx && typeof tx === "object") setTranscripts(tx);
    })();
  }, []);

  const saveTranscripts = (t) => { setTranscripts(t); store.set(K_TRANSCRIPTS, t); };

  const saveProjects = (p) => { setProjects(p); store.set(K_PROJECTS, p); };
  const saveNotes = (n) => { setNotes(n); store.set(K_NOTES, n); };

  const allDates = allDatesOf(projects || []);
  const isHistory = selDates.size > 0;

  // entries to render per project given the current view + meeting-type filter
  const entriesFor = (p) => {
    const base = isHistory ? p.entries.filter((e) => selDates.has(e.date)) : p.entries;
    const filtered = base.filter((e) => mtypeOn.has(e.mtype));
    // newest-first by DATE (EntryStack reverses → shown oldest→newest, top→bottom)
    const byDateDesc = [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return isHistory ? byDateDesc : byDateDesc.slice(0, VISIBLE_ENTRIES);
  };

  // in history view, hide projects with no entry on any selected day
  const shownProjects = (projects || []).filter(
    (p) => !isHistory || p.entries.some((e) => selDates.has(e.date)));

  // sort: completed projects to the bottom, then viz priority, then name
  const sorted = [...shownProjects].sort((a, b) => {
    const ad = a.status === "done" ? 1 : 0, bd = b.status === "done" ? 1 : 0;
    if (ad !== bd) return ad - bd;
    return (VIZ_ORDER[a.vizPriority] ?? 1) - (VIZ_ORDER[b.vizPriority] ?? 1)
      || a.name.localeCompare(b.name);
  });

  const manualActive = Array.isArray(manualOrder) && manualOrder.length > 0;

  // group rows, emitting group-header markers
  const groupField = manualActive ? null
    : groupBy === "none" ? null
    : groupBy === "vizPriority" ? "vizPriority"
    : groupBy === "status" ? "status" : "page";
  const groupLabel = (key) => {
    if (groupField === "vizPriority") return (VIZ[key] || VIZ.med).label + " 우선순위";
    if (groupField === "status") return (STATUS[key] || {}).label || key;
    return key || "—";
  };
  let items;
  if (manualActive) {
    const byId = Object.fromEntries(shownProjects.map((p) => [p.id, p]));
    const ordered = manualOrder.map((id) => byId[id]).filter(Boolean);
    const missing = shownProjects.filter((p) => !manualOrder.includes(p.id));
    items = [...ordered, ...missing].map((p) => ({ kind: "row", p }));
  } else if (!groupField) {
    items = sorted.map((p) => ({ kind: "row", p }));
  } else {
    const order = [];
    const map = {};
    sorted.forEach((p) => {
      const k = p[groupField] || "—";
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(p);
    });
    if (groupField === "vizPriority") order.sort((a, b) => (VIZ_ORDER[a] ?? 1) - (VIZ_ORDER[b] ?? 1));
    if (groupField === "status") order.sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b));
    items = order.flatMap((k) => [
      { kind: "group", key: k, label: groupLabel(k), count: map[k].length,
        color: groupField === "status" ? (STATUS[k] || {}).dot : undefined },
      ...map[k].map((p) => ({ kind: "row", p })),
    ]);
  }

  // pick a sort → leave manual mode; drag a project → enter manual mode
  const pickSort = (k) => { setManualOrder(null); store.set(K_ORDER, null); setGroupBy(k); };
  const reorderProjects = (fromId, toId) => {
    if (!fromId || fromId === toId) return;
    const cur = items.filter((it) => it.kind === "row").map((it) => it.p.id);
    const from = cur.indexOf(fromId), to = cur.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...cur]; const [m] = next.splice(from, 1); next.splice(to, 0, m);
    setManualOrder(next); store.set(K_ORDER, next);
  };

  // summary counts (over all projects, regardless of view/filter)
  const rowIds = items.filter((it) => it.kind === "row").map((it) => it.p.id);
  const allCollapsed = rowIds.length > 0 && rowIds.every((id) => collapsedIds.has(id));
  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(rowIds));

  if (!projects)
    return (
      <div style={{ background: C.paper, color: C.muted }}
        className="min-h-screen flex items-center justify-center text-sm">
        <Loader2 className="animate-spin mr-2" size={16} /> 불러오는 중…
      </div>
    );

  return (
    <div style={{ background: C.paper, color: C.ink }}
      className="min-h-screen w-full flex flex-col antialiased">
      <style>{`::selection{background:${C.violetSoft};}`}</style>

      {/* Header */}
      <header style={{ background: C.paper }}
        className="sticky top-0 z-30 max-w-[1600px] w-full mx-auto px-6 sm:px-10 pt-4 pb-3 shrink-0">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div style={{ color: C.violet, letterSpacing: "0.2em" }}
              className="text-[11px] font-semibold uppercase mb-1.5">Project Log</div>
            <h1 style={{ letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" }}
              className="text-3xl sm:text-[34px] font-semibold leading-none">
              Project Tracker
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {tab === "projects" ? (
                <>
                  {isHistory && (
                    <button onClick={clearDates}
                      style={{ background: C.violetSoft, color: C.violet }}
                      className="text-xs font-medium px-2.5 py-2 rounded-lg inline-flex items-center gap-1 hover:opacity-80 transition">
                      ← 최근
                    </button>
                  )}
                  <DateFilter allDates={allDates} selDates={selDates}
                    onToggle={toggleDate} onClear={clearDates} isHistory={isHistory}
                    transcripts={transcripts} onOpenTx={(d) => setTxDate(d)} />
                  <button onClick={() => setShowAdd(true)} disabled={isHistory}
                    style={{ background: isHistory ? C.faint : C.violet }}
                    className="text-white text-sm font-medium px-3.5 py-2 rounded-lg
                      inline-flex items-center gap-1.5 hover:opacity-90 transition disabled:opacity-60">
                    <Plus size={16} /> 미팅 추가
                  </button>
                </>
              ) : (
                <button onClick={() => setShowAddNote(true)}
                  style={{ background: C.violet }}
                  className="text-white text-sm font-medium px-3.5 py-2 rounded-lg
                    inline-flex items-center gap-1.5 hover:opacity-90 transition">
                  <Plus size={16} /> 노트 추가
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderColor: C.border }} className="flex items-center gap-1 border-b mt-4 -mb-4">
          {[["projects", "Projects"], ["notes", "Notes"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ color: tab === k ? C.violet : C.faint,
                borderColor: tab === k ? C.violet : "transparent" }}
              className="text-[13px] font-medium px-3 py-2 border-b-2 -mb-px transition">
              {label}{k === "notes" && notes.length > 0 ? ` (${notes.length})` : ""}
            </button>
          ))}
        </div>
      </header>

      {/* Summary strip */}
      {tab === "projects" && (
      <div style={{ borderColor: C.border, background: "#fff" }}
        className="shrink-0 border-t max-w-[1600px] w-full mx-auto px-6 sm:px-10 py-2.5
          flex items-center gap-x-4 gap-y-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span style={{ color: C.faint }} className="text-[11px] mr-0.5">정렬</span>
          <SortBtn active={!manualActive && groupBy === "page"} onClick={() => pickSort("page")} label="Page" />
          <SortBtn active={!manualActive && groupBy === "vizPriority"} onClick={() => pickSort("vizPriority")} label="VIZ 우선순위" />
          <SortBtn active={!manualActive && groupBy === "status"} onClick={() => pickSort("status")} label="상태" />
          <SortBtn active={!manualActive && groupBy === "none"} onClick={() => pickSort("none")} label="없음" />
          {manualActive && (
            <span style={{ background: C.violetSoft, color: C.violet, borderColor: "#A9D8C8" }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1">
              수동 순서
              <button onClick={() => pickSort(groupBy)} title="자동 정렬로">
                <X size={11} />
              </button>
            </span>
          )}
          <span style={{ color: C.border }}>|</span>
          <button onClick={allCollapsed ? expandAll : collapseAll}
            style={{ background: "#FFF", color: C.faint, borderColor: C.border }}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full border inline-flex items-center gap-1 transition hover:bg-black/5">
            {allCollapsed
              ? <><ChevronDown size={12} /> 전체 펴기</>
              : <><ChevronRight size={12} /> 전체 접기</>}
          </button>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span style={{ color: C.faint }} className="text-[10px] font-semibold uppercase tracking-wider">미팅</span>
          {MTYPE_ORDER.filter((k) => k !== "manual").map((k) => {
            const on = mtypeOn.has(k);
            return (
              <button key={k} onClick={() => toggleMtype(k)}
                style={{
                  background: on ? MTYPE[k].bg : "#FFF",
                  color: on ? MTYPE[k].fg : C.faint,
                  borderColor: on ? MTYPE[k].fg : C.border,
                  opacity: on ? 1 : 0.6,
                }}
                className="text-[10px] font-bold px-2 py-1 rounded border transition">
                {MTYPE[k].short}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Comparison table */}
      {tab === "projects" && (
      <main className="w-full max-w-[1600px] mx-auto">
        <div style={{ borderColor: C.border }} className="border-y bg-white w-full">
          <table className="border-separate border-spacing-0 text-left w-full table-fixed">
            <colgroup>
              {colW.map((w, i) => <col key={i} style={{ width: w + "%" }} />)}
            </colgroup>
            <tbody>
              {items.filter((it) => it.kind === "row").map((it) => (
                <TableRow key={it.p.id} p={it.p} entries={entriesFor(it.p)} readOnly={isHistory}
                  dim={it.p.status === "done"}
                  collapsed={collapsedIds.has(it.p.id)}
                  onToggleCollapse={() => toggleCollapse(it.p.id)}
                  colW={colW} onColLive={applyColW} onColCommit={commitColW}
                  projDragId={projDragId}
                  onProjDragStart={() => setProjDragId(it.p.id)}
                  onProjDragEnd={() => setProjDragId(null)}
                  onProjDrop={() => { reorderProjects(projDragId, it.p.id); setProjDragId(null); }}
                  onSave={(patch) => saveProjects(projects.map((x) => x.id === it.p.id ? { ...x, ...patch } : x))}
                  onDelete={() => saveProjects(projects.filter((x) => x.id !== it.p.id))}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 sm:px-6">
          {isHistory && (
            <p style={{ color: C.faint }} className="text-[11px] mt-3">
              읽기 전용 스냅샷 — 편집·미팅 추가는 최근 보기에서만 가능해요.
            </p>
          )}
        </div>
      </main>
      )}

      {/* Notes view */}
      {tab === "notes" && (
        <NotesView notes={notes} projects={projects}
          onDelete={(id) => saveNotes(notes.filter((n) => n.id !== id))}
          onToggleFU={(noteId, fuId) => saveNotes(notes.map((n) =>
            n.id === noteId
              ? { ...n, followUps: (n.followUps || []).map((f) => f.id === fuId ? { ...f, done: !f.done } : f) }
              : n))}
        />
      )}

      <footer style={{ borderColor: C.border, background: C.paper }}
        className="border-t max-w-[1600px] w-full mx-auto px-6 sm:px-10 py-3">
        {confirmReset ? (
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: C.muted }}>모든 데이터를 시드(Meeting 1) 상태로 되돌릴까요?</span>
            <button
              onClick={async () => {
                const p = seedProjects();
                await store.set(K_PROJECTS, p); await store.set(K_VERSION, SEED_VERSION);
                setProjects(p); setConfirmReset(false); clearDates();
              }}
              style={{ color: "#B01238" }} className="font-semibold hover:opacity-70 transition">초기화</button>
            <button onClick={() => setConfirmReset(false)}
              style={{ color: C.faint }} className="hover:opacity-70 transition">취소</button>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)}
            style={{ color: C.faint }}
            className="text-xs inline-flex items-center gap-1.5 hover:opacity-70 transition">
            <RotateCcw size={13} /> 시드 상태로 초기화
          </button>
        )}
      </footer>

      {showAdd && (
        <AddMeeting
          projects={projects}
          onClose={() => setShowAdd(false)}
          onApply={(updates, mtype, date, transcript) => {
            const next = [...projects];
            updates.forEach((u) => {
              const idx = next.findIndex(
                (x) => x.id === u.id || x.name.toLowerCase() === (u.name || "").toLowerCase()
              );
              const entry = {
                id: uid(), date: date || "", mtype: mtype || "manual",
                currentStatus: u.currentStatus || "",
                brettFeedback: u.brettFeedback || "",
                brettQuotes: u.brettQuotes || "",
                otherFeedback: u.otherFeedback || "",
                summary: u.summary || "",
              };
              // route by field: followUps → Next Step (milestones/handoffs), nextWork → My Work
              const newSteps = toItems(toBullets(u.followUps));
              const newTodos = toItems(toBullets(u.nextWork));
              if (idx >= 0) {
                const cur = next[idx];
                next[idx] = {
                  ...cur,
                  status: u.status || cur.status,
                  lead: u.lead || cur.lead,
                  page: u.page || cur.page,
                  location: u.location || cur.location,
                  targetDate: u.targetDate || cur.targetDate,
                  vizPriority: u.vizPriority || cur.vizPriority,
                  entries: [entry, ...cur.entries],
                  nextSteps: [...(cur.nextSteps || []), ...newSteps],
                  myWork: [...(cur.myWork || []), ...newTodos],
                };
              } else if (u.name) {
                next.push({
                  id: "new-" + uid(),
                  name: u.name, lead: u.lead || "—", status: u.status || "in-progress",
                  vizPriority: u.vizPriority || "med",
                  page: u.page || "—", location: u.location || "—", targetDate: u.targetDate || "—",
                  entries: [entry], nextSteps: newSteps, myWork: newTodos,
                });
              }
            });
            saveProjects(next);
            if (transcript && transcript.trim() && date) {
              saveTranscripts({ ...transcripts, [date]: transcript });
            }
            setShowAdd(false);
          }}
        />
      )}

      {showAddNote && (
        <AddNote
          projects={projects}
          onClose={() => setShowAddNote(false)}
          onApply={(newNotes) => {
            saveNotes([...newNotes, ...notes]);
            setShowAddNote(false);
          }}
        />
      )}

      {txDate && (
        <TranscriptModal
          date={txDate}
          value={transcripts[txDate] || ""}
          readOnly={isHistory}
          onClose={() => setTxDate(null)}
          onSave={(txt) => {
            const next = { ...transcripts };
            if (txt && txt.trim()) next[txDate] = txt; else delete next[txDate];
            saveTranscripts(next);
            setTxDate(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function DateFilter({ allDates, selDates, onToggle, onClear, isHistory, transcripts, onOpenTx }) {
  const [open, setOpen] = useState(false);
  const label = isHistory ? `${selDates.size}개 미팅 선택` : `최근 ${VISIBLE_ENTRIES}개 (기본)`;
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        style={{ borderColor: isHistory ? C.violet : C.border, color: isHistory ? C.violet : C.muted,
          background: isHistory ? C.violetSoft : "#FFF" }}
        className="appearance-none text-xs font-medium pl-3 pr-7 py-2 rounded-lg border cursor-pointer
          inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-teal-200">
        {label}
        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: isHistory ? C.violet : C.faint }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div style={{ borderColor: C.border }}
            className="absolute right-0 mt-1 z-50 w-64 max-h-80 overflow-y-auto bg-white rounded-lg border shadow-lg p-1.5">
            <button onClick={() => { onClear(); }}
              style={{ color: !isHistory ? C.violet : C.muted, background: !isHistory ? C.violetSoft : "transparent" }}
              className="w-full text-left text-xs font-medium px-2.5 py-2 rounded-md hover:bg-black/5 transition mb-1">
              최근 {VISIBLE_ENTRIES}개 (기본)
            </button>
            <div style={{ borderColor: C.border }} className="border-t pt-1">
              <div style={{ color: C.faint }} className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1">보고 싶은 미팅 날짜</div>
              {allDates.length === 0 && (
                <div style={{ color: C.faint }} className="text-xs px-2.5 py-2">아직 미팅이 없어요</div>
              )}
              {allDates.map((d) => {
                const on = selDates.has(d);
                const hasTx = !!(transcripts && transcripts[d] && transcripts[d].trim());
                return (
                  <div key={d} className="flex items-center gap-1 rounded-md hover:bg-black/5">
                    <button onClick={() => onToggle(d)}
                      className="flex-1 text-left text-xs px-2.5 py-1.5 inline-flex items-center gap-2">
                      {on ? <CheckSquare size={14} style={{ color: C.violet }} />
                          : <Square size={14} style={{ color: C.faint }} />}
                      <span style={{ color: on ? C.ink : C.muted }} className="font-mono">{d}</span>
                    </button>
                    <button onClick={() => { setOpen(false); onOpenTx(d); }}
                      title={hasTx ? "미팅 원문 보기" : "미팅 원문 올리기"}
                      className="shrink-0 px-2 py-1.5">
                      <FileText size={14} style={{ color: hasTx ? C.violet : C.faint, opacity: hasTx ? 1 : 0.5 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SortBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? C.violetSoft : "#FFF",
        color: active ? C.violet : C.faint,
        borderColor: active ? "#A9D8C8" : C.border,
      }}
      className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition">
      {label}
    </button>
  );
}

function ResizeHandle({ index, colW, onLive, onCommit }) {
  const onDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const table = e.currentTarget.closest("table");
    const tableW = table ? table.getBoundingClientRect().width : 1;
    const startX = e.clientX;
    const orig = [...colW];
    const MIN = 6;
    const move = (ev) => {
      const dxPct = ((ev.clientX - startX) / tableW) * 100;
      let a = orig[index] + dxPct;
      let b = orig[index + 1] - dxPct;
      if (a < MIN) { b -= (MIN - a); a = MIN; }
      if (b < MIN) { a -= (MIN - b); b = MIN; }
      const next = [...orig]; next[index] = a; next[index + 1] = b;
      onLive(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onCommit();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <span onPointerDown={onDown} onClick={(e) => e.stopPropagation()}
      title="드래그하여 열 너비 조절"
      style={{ cursor: "col-resize" }}
      className="absolute top-0 right-0 h-full w-2 flex items-center justify-center opacity-0 hover:opacity-100 z-10">
      <span style={{ background: C.violet }} className="w-0.5 h-3 rounded" />
    </span>
  );
}

function GroupHeader({ label, count, color }) {
  return (
    <tr>
      <td colSpan={TCOLS.length}
        style={{ background: C.section, borderColor: C.border }}
        className="border-b border-t">
        <div className="flex items-center gap-2 px-4 py-1.5">
          {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}
          <span style={{ color: C.muted, letterSpacing: "0.06em" }}
            className="text-[11px] font-bold uppercase">{label}</span>
          <span style={{ color: C.faint }} className="text-[11px] font-mono">{count}</span>
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS["in-progress"];
  return (
    <span style={{ background: s.bg, color: s.fg }}
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />{s.label}
    </span>
  );
}

function VizBadge({ level }) {
  const v = VIZ[level] || VIZ.med;
  return (
    <span style={{ background: v.bg, color: v.fg }}
      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">VIZ {v.label}</span>
  );
}

// Lead / owner pill — same shape as the status badge, distinct steel-blue color
function LeadBadge({ lead }) {
  return (
    <span style={{ background: "#EAF0F6", color: "#3B5566" }}
      className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5B7A90" }} />{lead}
    </span>
  );
}

function MeetingTag({ mtype }) {
  const m = MTYPE[mtype] || MTYPE.manual;
  return (
    <span style={{ background: m.bg, color: m.fg }}
      className="text-[9px] font-bold px-1.5 py-0.5 rounded">{m.short}</span>
  );
}

/* ------------------------------------------------------------------ */
const TCOLS = ["Current Status", "Next Step", "Brett Feedback", "Other Feedback", "My Work"];

function TableRow({ p, entries, onSave, onDelete, readOnly, dim, collapsed, onToggleCollapse, colW, onColLive, onColCommit, projDragId, onProjDragStart, onProjDragEnd, onProjDrop }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p);
  const [confirmDel, setConfirmDel] = useState(false);
  const [projOver, setProjOver] = useState(false);
  useEffect(() => { setDraft(p); }, [p]);

  const td = "px-3 py-3 border-b align-top";
  const border = { borderColor: C.border };
  const stop = (e) => e.stopPropagation();

  const setSteps = (nextSteps) => onSave({ nextSteps });
  const setWork = (myWork) => onSave({ myWork });

  return (
    <>
      {/* title bar (click to collapse; drag grip to reorder) */}
      <tr>
        <td colSpan={TCOLS.length} onClick={onToggleCollapse}
          onDragOver={(e) => { if (!readOnly && projDragId && projDragId !== p.id) { e.preventDefault(); setProjOver(true); } }}
          onDragLeave={() => setProjOver(false)}
          onDrop={(e) => { if (!readOnly && projDragId) { e.preventDefault(); onProjDrop && onProjDrop(); } setProjOver(false); }}
          style={{ background: dim ? C.section : C.bar, borderColor: C.border,
            boxShadow: projOver ? `inset 0 2px 0 ${C.violet}` : undefined }}
          className="border-b border-t cursor-pointer">
          <div className="flex items-center justify-between gap-3 px-4 py-2" style={{ opacity: dim ? 0.6 : 1 }}>
            <div className="inline-flex items-center gap-2 flex-wrap min-w-0">
              {!readOnly && (
                <span
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); onProjDragStart && onProjDragStart(); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { onProjDragEnd && onProjDragEnd(); setProjOver(false); }}
                  onClick={stop}
                  title="드래그하여 프로젝트 순서 변경"
                  className="shrink-0 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100">
                  <GripVertical size={14} style={{ color: C.violet }} />
                </span>
              )}
              {collapsed ? <ChevronRight size={15} style={{ color: C.violet }} className="shrink-0" />
                         : <ChevronDown size={15} style={{ color: C.violet }} className="shrink-0" />}
              <span style={{ color: C.ink }} className="text-[14px] font-bold leading-tight">{p.name}</span>
              <StatusBadge status={p.status} />
              {p.targetDate && p.targetDate !== "—" && (
                <span style={{ background: "#fff", color: C.muted, borderColor: C.border }}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded border">{p.targetDate}</span>
              )}
              {p.lead && p.lead !== "—" && <LeadBadge lead={p.lead} />}
            </div>
            {!readOnly && (
              <div className="flex items-center gap-2 shrink-0" onClick={stop}>
                {confirmDel ? (
                  <>
                    <button onClick={() => { setConfirmDel(false); onDelete(); }} title="삭제 확인"><Check size={15} style={{ color: "#E11D48" }} /></button>
                    <button onClick={() => setConfirmDel(false)} title="취소"><X size={15} style={{ color: C.faint }} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing((v) => !v)} title="편집"><PenLine size={15} style={{ color: editing ? C.violet : C.muted }} /></button>
                    <button onClick={() => setConfirmDel(true)} title="삭제"><Trash2 size={15} style={{ color: C.muted }} /></button>
                  </>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>

      {!collapsed && (
        <tr style={{ opacity: dim ? 0.6 : 1 }}>
          {TCOLS.map((c, i) => (
            <td key={i} style={{ background: "#FAF9FC", borderColor: C.border, color: C.faint }}
              className={`relative text-[10px] font-bold uppercase tracking-wide px-4 py-1.5 border-b text-center ${i > 0 ? "border-l" : ""}`}>
              {c}
              {!readOnly && i < TCOLS.length - 1 && (
                <ResizeHandle index={i} colW={colW} onLive={onColLive} onCommit={onColCommit} />
              )}
            </td>
          ))}
        </tr>
      )}

      {!collapsed && (
        <tr style={{ opacity: dim ? 0.6 : 1 }}>
          {/* Current Status — stacked recent entries */}
          <td style={border} className={td}>
            <EntryStack entries={entries} field="currentStatus" />
          </td>

          {/* Next Step — follow-ups checklist */}
          <td style={border} className={`${td} border-l`}>
            <Checklist items={p.nextSteps || []} readOnly={readOnly} onChange={setSteps}
              allowAdd={false} placeholder="F/U 추가…" emptyHint="—" />
          </td>

          {/* Brett Feedback — stacked (quotes + directives) */}
          <td style={border} className={`${td} border-l`}>
            <EntryStack entries={entries} field="brett" />
          </td>

          {/* Other Feedback — stacked */}
          <td style={border} className={`${td} border-l`}>
            <EntryStack entries={entries} field="otherFeedback" />
          </td>

          {/* My Work — checklist */}
          <td style={border} className={`${td} border-l`}>
            <Checklist items={p.myWork || []} readOnly={readOnly} onChange={setWork}
              placeholder="할 일 추가…" emptyHint="—" />
          </td>
        </tr>
      )}

      {editing && !collapsed && !readOnly && (
        <tr>
          <td colSpan={TCOLS.length} style={{ ...border, background: C.paper }} className="px-4 py-4 border-b">
            <div style={{ color: C.faint }} className="text-[11px] mb-3">
              여기서 편집하는 건 프로젝트 속성(제목 줄)이에요. 미팅별 코멘트는 “미팅 추가”로 쌓이고, 최신 항목만 아래에서 직접 손볼 수 있어요.
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <EditText label="Lead" value={draft.lead} onChange={(v) => setDraft({ ...draft, lead: v })} />
              <EditText label="Page (짧은 라벨)" value={draft.page} onChange={(v) => setDraft({ ...draft, page: v })} />
              <div>
                <EditLabel>Status</EditLabel>
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                  style={border} className="w-full text-[13px] rounded-lg border px-2 py-1.5 bg-white">
                  {STATUS_ORDER.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
                </select>
              </div>
              <div>
                <EditLabel>Viz Priority</EditLabel>
                <select value={draft.vizPriority || "med"} onChange={(e) => setDraft({ ...draft, vizPriority: e.target.value })}
                  style={border} className="w-full text-[13px] rounded-lg border px-2 py-1.5 bg-white">
                  <option value="high">High</option><option value="med">Med</option><option value="low">Low</option>
                </select>
              </div>
              <EditText label="Target Date" value={draft.targetDate} onChange={(v) => setDraft({ ...draft, targetDate: v })} />
              <div className="lg:col-span-3">
                <EditText label="Location (상세 위치)" value={draft.location} onChange={(v) => setDraft({ ...draft, location: v })} />
              </div>
            </div>

            {/* edit latest entry's comment fields */}
            {draft.entries && draft.entries[0] && (
              <div className="grid md:grid-cols-3 gap-3 mt-4">
                <EditArea label="Current Status (최신 미팅)"
                  value={draft.entries[0].currentStatus}
                  onChange={(v) => setDraft({ ...draft, entries: [{ ...draft.entries[0], currentStatus: v }, ...draft.entries.slice(1)] })} />
                <EditArea label="Brett Feedback (· 구분, 시각화는 **볼드**)"
                  value={draft.entries[0].brettFeedback}
                  onChange={(v) => setDraft({ ...draft, entries: [{ ...draft.entries[0], brettFeedback: v }, ...draft.entries.slice(1)] })} />
                <EditArea label="Other Feedback (Trish·DS 등)"
                  value={draft.entries[0].otherFeedback}
                  onChange={(v) => setDraft({ ...draft, entries: [{ ...draft.entries[0], otherFeedback: v }, ...draft.entries.slice(1)] })} />
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { onSave(draft); setEditing(false); }} style={{ background: C.violet }}
                className="text-white text-sm font-medium px-4 py-2 rounded-lg">저장</button>
              <button onClick={() => { setDraft(p); setEditing(false); }} style={{ ...border, color: C.muted }}
                className="text-sm font-medium px-4 py-2 rounded-lg border">취소</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ---- Reusable checklist (Next Step, My Work) ---- */
function Checklist({ items, readOnly, onChange, placeholder = "추가…", emptyHint = "—", allowAdd = true }) {
  const [text, setText] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");

  const add = () => {
    if (!text.trim()) return;
    onChange([...items, { id: uid(), text: text.trim(), done: false }]);
    setText("");
  };
  const toggle = (id) => onChange(items.map((it) => it.id === id ? { ...it, done: !it.done } : it));
  const del = (id) => onChange(items.filter((it) => it.id !== id));
  const saveEdit = (id) => {
    onChange(items.map((it) => it.id === id ? { ...it, text: editText.trim() || it.text } : it));
    setEditId(null);
  };
  // right-click highlight (priority): yellow / red / green, or clear
  const [menu, setMenu] = useState(null); // { id, x, y }
  const setHl = (id, hl) => { onChange(items.map((it) => it.id === id ? { ...it, hl } : it)); setMenu(null); };

  // undone first, done after (each keeps insertion order)
  const ordered = [...items.filter((i) => !i.done), ...items.filter((i) => i.done)];
  const doneCount = items.filter((i) => i.done).length;

  // drag-to-reorder (undone items only; done items stay pinned at the bottom)
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const reorder = (fromId, toId) => {
    if (fromId === toId) return;
    const undone = items.filter((i) => !i.done);
    const done = items.filter((i) => i.done);
    const from = undone.findIndex((i) => i.id === fromId);
    const to = undone.findIndex((i) => i.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...undone];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange([...next, ...done]);
  };

  return (
    <div>
      {!readOnly && allowAdd && (
        <div className="flex gap-1 mb-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            style={{ borderColor: C.border }}
            className="flex-1 text-[11px] rounded border px-1.5 py-1 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-teal-200" />
          <button onClick={add} style={{ background: C.violetSoft, color: C.violet }}
            className="text-[11px] font-medium px-1.5 rounded shrink-0">+</button>
        </div>
      )}
      {items.length > 0 && (
        <div style={{ color: C.faint }} className="text-[10px] mb-1.5 font-mono">
          {doneCount}/{items.length} 완료
        </div>
      )}
      <ul className="space-y-1">
        {ordered.map((it) => {
          const canDrag = !readOnly && editId !== it.id && !it.done;
          return (
          <li key={it.id}
            onDragOver={(e) => { if (canDrag && dragId && dragId !== it.id) { e.preventDefault(); setOverId(it.id); } }}
            onDrop={(e) => { if (canDrag && dragId) { e.preventDefault(); reorder(dragId, it.id); } setDragId(null); setOverId(null); }}
            onContextMenu={(e) => { if (!readOnly) { e.preventDefault(); setMenu({ id: it.id, x: e.clientX, y: e.clientY }); } }}
            style={{
              ...(overId === it.id ? { boxShadow: `inset 0 2px 0 ${C.violet}` } : {}),
              background: HL[it.hl] || "transparent",
            }}
            className="group flex items-start gap-1 rounded px-1 -mx-1">
            {canDrag && (
              <span
                draggable
                onDragStart={(e) => { setDragId(it.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                title="드래그하여 순서 변경"
                className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100">
                <GripVertical size={13} style={{ color: C.faint }} />
              </span>
            )}
            {!canDrag && <span className="w-[13px] shrink-0" />}
            <button onClick={() => !readOnly && toggle(it.id)} className="mt-0.5 shrink-0" disabled={readOnly}>
              {it.done
                ? <CheckSquare size={14} style={{ color: C.violet }} />
                : <Square size={14} style={{ color: C.faint }} />}
            </button>
            {editId === it.id ? (
              <textarea autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                onBlur={() => saveEdit(it.id)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(it.id); } if (e.key === "Escape") setEditId(null); }}
                rows={2} style={{ borderColor: C.border }}
                className="flex-1 text-[12px] rounded border px-1 py-0.5 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-teal-200" />
            ) : (
              <span
                onClick={() => { if (!readOnly) { setEditId(it.id); setEditText(it.text); } }}
                title="우클릭으로 우선순위 색 표시"
                style={{ color: it.done ? C.faint : C.ink, textDecoration: it.done ? "line-through" : "none" }}
                className="flex-1 text-[12px] leading-snug cursor-text">{it.text}</span>
            )}
            {!readOnly && editId !== it.id && (
              <button onClick={() => del(it.id)} className="opacity-0 group-hover:opacity-100 mt-0.5">
                <Trash2 size={11} style={{ color: C.faint }} />
              </button>
            )}
          </li>
          );
        })}
        {ordered.length === 0 && (
          <li style={{ color: C.faint }} className="text-[12px]">{emptyHint}</li>
        )}
      </ul>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
          <div style={{ left: menu.x, top: menu.y, borderColor: C.border }}
            className="fixed z-50 bg-white rounded-lg border shadow-lg p-1.5 flex items-center gap-1.5">
            {[["yellow", "#F59E0B"], ["red", "#E11D48"], ["green", "#16A34A"]].map(([k, c]) => (
              <button key={k} onClick={() => setHl(menu.id, k)} title={k}
                style={{ background: HL[k], borderColor: c }}
                className="w-6 h-6 rounded-md border-2 hover:scale-110 transition" />
            ))}
            <span style={{ background: C.border }} className="w-px h-5 mx-0.5" />
            <button onClick={() => setHl(menu.id, undefined)} title="해제"
              style={{ color: C.faint }} className="w-6 h-6 rounded-md border hover:bg-black/5 inline-flex items-center justify-center">
              <X size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Stacked entries for a comment field ---- */
function EntryStack({ entries, field }) {
  const blocks = [...entries].reverse()  // oldest on top, newest at the bottom
    .map((e) => ({ e, has: field === "brett" ? hasBrett(e) : (e[field] && e[field] !== "—") }))
    .filter((b) => b.has);
  if (!blocks.length)
    return <span style={{ color: C.faint }} className="text-[13px]">—</span>;
  return (
    <div className="space-y-2.5">
      {blocks.map(({ e }, i) => (
        <div key={e.id} style={i > 0 ? { borderColor: C.border } : undefined}
          className={i > 0 ? "pt-2 border-t" : ""}>
          <div className="flex items-center gap-1.5 mb-1">
            <MeetingTag mtype={e.mtype} />
            <span style={{ color: C.faint }} className="text-[10px] font-mono">{e.date}</span>
          </div>
          {field === "brett"
            ? <BrettBlock e={e} />
            : <BulletList value={e[field]} floatBold={field === "brett"} />}
        </div>
      ))}
    </div>
  );
}

const hasBrett = (e) =>
  (e.brettQuotes && e.brettQuotes.trim()) || (e.brettFeedback && e.brettFeedback !== "—");

function BrettBlock({ e }) {
  const quotes = (e.brettQuotes || "").split(/\n+/).map((q) => q.trim()).filter(Boolean);
  const hasTake = e.brettFeedback && e.brettFeedback !== "—";
  return (
    <div className="space-y-2">
      {quotes.length > 0 && (
        <div className="space-y-1.5">
          {quotes.map((q, i) => (
            <p key={i} style={{ borderColor: C.violet, color: C.ink }}
              className="text-[12px] italic leading-snug border-l-2 pl-2">“{q}”</p>
          ))}
        </div>
      )}
      {quotes.length > 0 && hasTake && <div style={{ borderColor: C.border }} className="border-t" />}
      {hasTake && <BulletList value={e.brettFeedback} floatBold />}
    </div>
  );
}

function EditLabel({ children }) {
  return <div style={{ color: C.faint }} className="text-[10px] font-bold uppercase tracking-wider mb-1">{children}</div>;
}
function EditText({ label, value, onChange }) {
  return (
    <div>
      <EditLabel>{label}</EditLabel>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)}
        style={{ borderColor: C.border }} className="w-full text-[13px] rounded-lg border px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200" />
    </div>
  );
}
function EditArea({ label, value, onChange }) {
  return (
    <div>
      <EditLabel>{label}</EditLabel>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3}
        style={{ borderColor: C.border }} className="w-full text-[13px] rounded-lg border px-2 py-1.5 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-teal-200" />
    </div>
  );
}

/* render **bold** spans inside a bullet */
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(part);
    return m
      ? <strong key={i} style={{ fontWeight: 700 }}>{m[1]}</strong>
      : <span key={i}>{part}</span>;
  });
}

function BulletList({ value, floatBold }) {
  let items = toBullets(value).map((t) => ({ t, viz: /\*\*/.test(t) }));
  if (floatBold) items = [...items.filter((x) => x.viz), ...items.filter((x) => !x.viz)];
  return (
    <ul className="space-y-1">
      {items.map((it, i) => {
        const m = /^\[([^\]]{1,4})\]\s*(.*)$/.exec(it.t); // leading [T] speaker initial
        return (
          <li key={i} style={{ color: C.ink }} className="text-[13px] leading-relaxed flex gap-1.5">
            <span style={{ color: it.viz ? C.violet : C.faint }} className="select-none">•</span>
            <span className="flex-1">
              {m && (
                <span style={{ background: "#EAF0F6", color: "#3B5566" }}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 align-middle">{m[1]}</span>
              )}
              {renderInline(m ? m[2] : it.t)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function IconBtn({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title}
      className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 transition">
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Add-meeting modal: pick meeting type → paste transcript → parse    */
/* ------------------------------------------------------------------ */
/*  Notes view — reference meetings, not tied to project progress       */
/* ------------------------------------------------------------------ */
function NotesView({ notes, projects, onDelete, onToggleFU }) {
  const [filter, setFilter] = useState("all"); // "all" | "none" | projectId
  const projName = (id) => (projects.find((p) => p.id === id) || {}).name;

  // project ids that appear in notes (for filter chips)
  const usedPids = [...new Set(notes.map((n) => n.projectId).filter(Boolean))];
  const hasUnlinked = notes.some((n) => !n.projectId);

  const shown = notes.filter((n) =>
    filter === "all" ? true : filter === "none" ? !n.projectId : n.projectId === filter);

  return (
    <main className="w-full">
      <div className="max-w-[1100px] w-full mx-auto px-6 sm:px-10 py-5">
        {/* filter chips */}
        {(usedPids.length > 0 || hasUnlinked) && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <FilterChip label="전체" active={filter === "all"} onClick={() => setFilter("all")} />
            {usedPids.map((pid) => (
              <FilterChip key={pid} label={projName(pid) || pid}
                active={filter === pid} onClick={() => setFilter(pid)} accent />
            ))}
            {hasUnlinked && (
              <FilterChip label="미연결" active={filter === "none"} onClick={() => setFilter("none")} />
            )}
          </div>
        )}

        {shown.length === 0 ? (
          <div style={{ color: C.faint }} className="text-sm py-16 text-center">
            아직 노트가 없어요. 우측 상단 “노트 추가”로 참고 미팅 노트를 올려보세요.
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((n) => (
              <NoteCard key={n.id} n={n} projName={projName}
                onDelete={() => onDelete(n.id)} onToggleFU={(fuId) => onToggleFU(n.id, fuId)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function FilterChip({ label, active, onClick, accent }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? (accent ? C.violetSoft : C.ink) : "#FFF",
        color: active ? (accent ? C.violet : "#FFF") : C.faint,
        borderColor: active ? (accent ? "#A9D8C8" : C.ink) : C.border,
      }}
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition">
      {label}
    </button>
  );
}

function NoteCard({ n, projName, onDelete, onToggleFU }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const fus = n.followUps || [];
  return (
    <div style={{ background: C.card, borderColor: C.border }}
      className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span style={{ color: C.ink }} className="text-[15px] font-semibold">{n.title || "제목 없음"}</span>
          <MeetingTag mtype={n.mtype || "others"} />
          <span style={{ color: C.faint }} className="text-[11px] font-mono">{n.date}</span>
          {n.projectId && (
            <span style={{ background: C.violetSoft, color: C.violet, borderColor: "#A9D8C8" }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border">↗ {projName(n.projectId) || n.projectId}</span>
          )}
        </div>
        {confirmDel ? (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onDelete} title="삭제 확인"><Check size={15} style={{ color: "#E11D48" }} /></button>
            <button onClick={() => setConfirmDel(false)} title="취소"><X size={15} style={{ color: C.faint }} /></button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="shrink-0" title="삭제">
            <Trash2 size={14} style={{ color: C.faint }} />
          </button>
        )}
      </div>

      {n.summary && n.summary !== "—" && (
        <div className="mt-3">
          <div style={{ color: C.faint }} className="text-[10px] font-bold uppercase tracking-wider mb-1">요약</div>
          <BulletList value={n.summary} />
        </div>
      )}
      {n.key && n.key !== "—" && (
        <div className="mt-3">
          <div style={{ color: C.faint }} className="text-[10px] font-bold uppercase tracking-wider mb-1">핵심</div>
          <BulletList value={n.key} />
        </div>
      )}
      {fus.length > 0 && (
        <div className="mt-3">
          <div style={{ color: C.faint }} className="text-[10px] font-bold uppercase tracking-wider mb-1">F/U</div>
          <ul className="space-y-1">
            {[...fus.filter((f) => !f.done), ...fus.filter((f) => f.done)].map((f) => (
              <li key={f.id} className="flex items-start gap-1.5">
                <button onClick={() => onToggleFU(f.id)} className="mt-0.5 shrink-0">
                  {f.done ? <CheckSquare size={14} style={{ color: C.violet }} />
                          : <Square size={14} style={{ color: C.faint }} />}
                </button>
                <span style={{ color: f.done ? C.faint : C.ink, textDecoration: f.done ? "line-through" : "none" }}
                  className="flex-1 text-[13px] leading-snug">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add-note: upload the JSON Claude produced for reference notes       */
/* ------------------------------------------------------------------ */
const NOTE_SCHEMA_HELP =
`이 회의 녹취를 Project Tracker의 Notes용 JSON으로 정리해줘. 코드블록 없이 JSON만 출력해줘.

{
  "type": "notes",
  "notes": [
    {
      "title": "노트 제목 (예: Copilot 팀 싱크)",
      "date": "YYYY-MM-DD",
      "meetingType": "tiger | innovation | dashboard | trish | others | manual",
      "projectId": "관련 프로젝트 id (있으면). 없으면 비워둬",
      "summary": "한 줄 요약. 여러 항목은 ' · '로",
      "key": "핵심 내용 포인트. 여러 항목은 ' · '로",
      "followUps": "이 노트에서 내가 챙겨야 할 큼지막한 것만. 남의 세세한 작업 말고, 나에게 데이터/산출물이 넘어오는 지점·큰 마일스톤·결과가 나에게 되돌아와 내가 착수해야 하는 지점. 간결히. ' · '로 구분. 없으면 빈 문자열"
    }
  ]
}

규칙: 참고성 미팅을 Notes로 정리하는 거야. 프로젝트 진척이 아니라 배경/참고 정보. 한국어로 간결하게. projectId는 명확히 관련될 때만.

프로젝트 id 목록: sales-effectiveness, qc-coaching, ui-enhancements, auto-summary, copilot, entity-extraction, auth-agent, faq-agent, cross-channel, topic-ai`;

function AddNote({ projects, onClose, onApply }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(null);

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(f);
  };
  const copySchema = async () => {
    try { await navigator.clipboard.writeText(NOTE_SCHEMA_HELP); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* ignore */ }
  };

  const load = () => {
    setError("");
    let raw = text.trim().replace(/^```json/i, "").replace(/```$/,"").trim();
    let data;
    try { data = JSON.parse(raw); }
    catch { setError("JSON 형식이 아니에요. Claude가 준 Notes JSON을 확인해 주세요."); return; }
    const arr = Array.isArray(data) ? data : data.notes;
    if (!Array.isArray(arr) || !arr.length) { setError("notes 항목이 없어요."); return; }
    setPreview(arr);
  };

  const build = () => preview.map((r) => ({
    id: uid(),
    title: r.title || "제목 없음",
    date: r.date || new Date().toISOString().slice(0, 10),
    mtype: (r.meetingType && MTYPE[r.meetingType]) ? r.meetingType : "others",
    projectId: r.projectId && projects.find((p) => p.id === r.projectId) ? r.projectId : "",
    summary: r.summary || "",
    key: r.key || "",
    followUps: toBullets(r.followUps).map((t) => ({ id: uid(), text: t, done: false })),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(20,16,32,0.35)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: C.card, borderColor: C.border }}
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
          <h3 className="text-base font-semibold">노트 추가 (JSON)</h3>
          <IconBtn onClick={onClose} title="닫기"><X size={16} style={{ color: C.muted }} /></IconBtn>
        </div>

        <div className="p-5 space-y-4">
          {!preview ? (
            <>
              <div style={{ background: C.violetSoft, color: C.violet }}
                className="text-[12px] leading-relaxed rounded-lg px-3 py-2.5">
                참고성 미팅 녹취를 Claude에 주고 “Notes용 JSON으로 정리해줘”라고 하세요.
                받은 JSON을 <code>.json</code> 파일로 올리면 돼요.
                <button onClick={copySchema} style={{ color: C.violet }} className="ml-1 underline font-medium">
                  {copied ? "복사됨!" : "정리용 프롬프트 복사"}
                </button>
              </div>
              <div>
                <label style={{ color: C.faint }} className="text-[10px] font-semibold uppercase tracking-wider">JSON 파일 업로드</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <label style={{ borderColor: C.violet, color: C.violet }}
                    className="text-sm font-medium px-4 py-2.5 rounded-lg border cursor-pointer hover:bg-black/5 transition inline-flex items-center gap-1.5">
                    <Plus size={15} /> .json 파일 선택
                    <input type="file" accept=".json,application/json" onChange={onFile} className="hidden" />
                  </label>
                  {fileName && <span style={{ color: C.muted }} className="text-xs">{fileName}</span>}
                </div>
              </div>
              {error && (
                <div style={{ background: "#FCEBEF", color: "#B01238" }}
                  className="text-xs rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}
              <button onClick={load} disabled={text.trim().length < 2}
                style={{ background: text.trim().length < 2 ? C.faint : C.violet }}
                className="w-full text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60 transition">
                불러오기 · 미리보기
              </button>
            </>
          ) : (
            <>
              <div style={{ color: C.muted }} className="text-xs">{preview.length}개 노트를 찾았어요. 확인 후 적용하세요.</div>
              <ul className="space-y-2">
                {preview.map((r, i) => (
                  <li key={i} style={{ borderColor: C.border, background: C.paper }} className="rounded-lg border px-3 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{r.title || "제목 없음"}</span>
                      <MeetingTag mtype={(r.meetingType && MTYPE[r.meetingType]) ? r.meetingType : "others"} />
                      {r.projectId && projects.find((p) => p.id === r.projectId) &&
                        <span style={{ background: C.violetSoft, color: C.violet }} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full">↗ {(projects.find((p) => p.id === r.projectId) || {}).name}</span>}
                    </div>
                    {r.summary && <p style={{ color: C.muted }} className="text-xs mt-1">{r.summary}</p>}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button onClick={() => setPreview(null)}
                  style={{ borderColor: C.border, color: C.muted }}
                  className="flex-1 text-sm font-medium py-2.5 rounded-lg border hover:bg-black/5 transition">뒤로</button>
                <button onClick={() => onApply(build())}
                  style={{ background: C.violet }}
                  className="flex-1 text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-90 transition">적용</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Meeting transcript (한글 번역본 원문) — view / paste / upload        */
/* ------------------------------------------------------------------ */
function TranscriptModal({ date, value, readOnly, onClose, onSave }) {
  const [editing, setEditing] = useState(!value);
  const [text, setText] = useState(value);
  const [fileName, setFileName] = useState("");

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(f);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(20,16,32,0.35)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: C.card, borderColor: C.border }}
        className="w-full sm:max-w-3xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: C.violet }} />
            <h3 className="text-base font-semibold">미팅 원문</h3>
            <span style={{ color: C.faint }} className="text-xs font-mono">{date}</span>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && !editing && (
              <button onClick={() => setEditing(true)}
                style={{ color: C.muted }} className="text-xs font-medium px-2 py-1 rounded hover:bg-black/5 inline-flex items-center gap-1">
                <PenLine size={13} /> 편집
              </button>
            )}
            <IconBtn onClick={onClose} title="닫기"><X size={16} style={{ color: C.muted }} /></IconBtn>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {editing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label style={{ borderColor: C.border, color: C.muted }}
                  className="text-xs font-medium px-3 py-2 rounded-lg border cursor-pointer hover:bg-black/5 transition inline-flex items-center gap-1.5">
                  <Plus size={14} /> .txt / .md 파일 올리기
                  <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onFile} className="hidden" />
                </label>
                {fileName && <span style={{ color: C.faint }} className="text-[11px]">{fileName}</span>}
              </div>
              <textarea value={text} onChange={(e) => setText(e.target.value)}
                rows={16} placeholder="미팅 한글 번역본 전문을 붙여넣으세요…"
                style={{ borderColor: C.border }}
                className="w-full text-[13px] leading-relaxed rounded-lg border px-3 py-2.5 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-teal-200" />
            </div>
          ) : (
            <div style={{ color: C.ink }} className="text-[13px] leading-relaxed whitespace-pre-wrap">
              {value || "원문이 없어요."}
            </div>
          )}
        </div>

        {!readOnly && editing && (
          <div className="flex gap-2 px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => onSave(text)}
              style={{ background: C.violet }}
              className="text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition">저장</button>
            {value && (
              <button onClick={() => { setText(value); setEditing(false); }}
                style={{ borderColor: C.border, color: C.muted }}
                className="text-sm font-medium px-4 py-2 rounded-lg border hover:bg-black/5 transition">취소</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add-meeting: paste or upload the JSON that Claude produced          */
/* ------------------------------------------------------------------ */
const SCHEMA_HELP =
`이 회의 녹취를 아래 JSON 형식으로 정리해줘. 그대로 복사해 붙여넣을 수 있게 코드블록 없이 JSON만 출력해줘.

{
  "meetingType": "tiger | innovation | dashboard | trish | others | manual",
  "date": "YYYY-MM-DD",
  "transcript": "미팅 한글 번역본 전문 (더듬·반복만 제거하고 내용은 그대로). 원문 아카이브에 저장됨. 없으면 생략",
  "updates": [
    {
      "id": "기존 프로젝트 id(있으면). 새 프로젝트면 비워두고 name만",
      "name": "프로젝트 이름",
      "status": "in-progress | blocked | review | on-track | done",
      "lead": "담당자",
      "page": "시각화가 들어가는 짧은 위치 라벨(<=20자)",
      "location": "정확한 위치 한 줄 설명(있으면)",
      "vizPriority": "high | med | low",
      "targetDate": "짧게 (예: 8/31, 이번 주)",
      "currentStatus": "현재 상태. 여러 항목은 ' · '로 구분",
      "brettFeedback": "Brett의 코멘트/지시만. 시각화 관련은 **볼드**. ' · '로 구분",
      "brettQuotes": "Brett의 실제 발언을 자연스러운 한국어로. 서로 다른 인용은 줄바꿈으로 구분",
      "otherFeedback": "Brett 외(Trish/DS 등) 피드백. 각 항목 앞에 화자 이니셜 [T]/[J]/[P]/[?]. ' · '로 구분",
      "followUps": "Next Step에 들어갈 항목. 남의 세세한 작업 F/U 말고, 내 작업에 영향을 주는 큼지막한 마일스톤·핸드오프만. 즉 (1) 나에게 데이터/산출물이 넘어오는 지점, (2) 프로젝트가 다음 단계로 넘어가는 굵직한 지점, (3) 남이 하는 일이라도 결과가 나에게 되돌아와(loop back) 내가 착수해야 하는 지점. 각 항목은 '스콥·무엇 · 대략 언제 · 나에게 넘어오는 것/내가 할 것' 형태로 간결히. 예: 'Copilot L2 quick-win 3~4개, ~다음 주 데이터 확보 예정 → 오면 Task Analysis 뷰 착수'. ' · '로 구분",
      "nextWork": "내가 직접 할 시각화 작업 단계. ' · '로 구분",
      "summary": "이번 미팅 한 줄 요약"
    }
  ]
}

규칙: 실제 논의된 프로젝트만 포함. 업데이트 없는 필드는 빈 문자열로. 한국어로 작성. 간결하게.`;

function AddMeeting({ projects, onClose, onApply }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [mtype, setMtype] = useState("tiger");      // fallback if JSON omits it
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [effMtype, setEffMtype] = useState("tiger");
  const [effDate, setEffDate] = useState("");
  const [effTx, setEffTx] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(null);

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(f);
  };

  const copySchema = async () => {
    try { await navigator.clipboard.writeText(SCHEMA_HELP); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* ignore */ }
  };

  const load = () => {
    setError("");
    let raw = text.trim().replace(/^```json/i, "").replace(/```$/,"").trim();
    let data;
    try { data = JSON.parse(raw); }
    catch { setError("JSON 형식이 아니에요. Claude가 준 JSON을 그대로 붙여넣었는지 확인해 주세요."); return; }

    const updates = Array.isArray(data) ? data : data.updates;
    if (!Array.isArray(updates) || !updates.length) {
      setError("updates 항목이 없어요. { \"updates\": [ ... ] } 형태여야 해요."); return;
    }
    const em = (data && data.meetingType && MTYPE[data.meetingType]) ? data.meetingType : mtype;
    const ed = (data && data.date) ? data.date : date;
    setEffMtype(em); setEffDate(ed);
    setEffTx((data && typeof data.transcript === "string") ? data.transcript : "");
    setPreview(updates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(20,16,32,0.35)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: C.card, borderColor: C.border }}
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
          <h3 className="text-base font-semibold">미팅 업데이트 추가 (JSON)</h3>
          <IconBtn onClick={onClose} title="닫기"><X size={16} style={{ color: C.muted }} /></IconBtn>
        </div>

        <div className="p-5 space-y-4">
          {!preview && (
            <>
              <div style={{ background: C.violetSoft, color: C.violet }}
                className="text-[12px] leading-relaxed rounded-lg px-3 py-2.5">
                Claude 채팅에 녹취록을 주고 “tracker용 JSON으로 정리해줘”라고 하세요.
                받은 JSON을 <code>.json</code> 파일로 저장해 아래에서 올리면 돼요.
                <button onClick={copySchema}
                  style={{ color: C.violet }} className="ml-1 underline font-medium">
                  {copied ? "복사됨!" : "정리용 프롬프트 복사"}
                </button>
              </div>

              <div>
                <label style={{ color: C.faint }} className="text-[10px] font-semibold uppercase tracking-wider">JSON 파일 업로드</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <label style={{ borderColor: C.violet, color: C.violet }}
                    className="text-sm font-medium px-4 py-2.5 rounded-lg border cursor-pointer hover:bg-black/5 transition inline-flex items-center gap-1.5">
                    <Plus size={15} /> .json 파일 선택
                    <input type="file" accept=".json,application/json" onChange={onFile} className="hidden" />
                  </label>
                  {fileName && <span style={{ color: C.muted }} className="text-xs">{fileName}</span>}
                </div>
              </div>

              <div style={{ borderColor: C.border }} className="border-t pt-3">
                <div style={{ color: C.faint }} className="text-[10px] mb-2">JSON에 meetingType·date가 없을 때만 아래 값을 사용해요.</div>
                <div className="flex gap-1.5 flex-wrap">
                  {MTYPE_ORDER.filter((k) => k !== "manual").map((k) => (
                    <button key={k} onClick={() => setMtype(k)}
                      style={{
                        background: mtype === k ? MTYPE[k].bg : "#FFF",
                        color: mtype === k ? MTYPE[k].fg : C.faint,
                        borderColor: mtype === k ? MTYPE[k].fg : C.border,
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition">
                      {MTYPE[k].label}
                    </button>
                  ))}
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    style={{ borderColor: C.border }}
                    className="text-xs rounded-lg border px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200" />
                </div>
              </div>

              {error && (
                <div style={{ background: "#FCEBEF", color: "#B01238" }}
                  className="text-xs rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}
              <button onClick={load} disabled={text.trim().length < 2}
                style={{ background: text.trim().length < 2 ? C.faint : C.violet }}
                className="w-full text-white text-sm font-medium py-2.5 rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-60 transition">
                불러오기 · 미리보기
              </button>
              <p style={{ color: C.faint }} className="text-[11px] leading-relaxed">
                각 프로젝트에 이번 미팅 코멘트가 새 항목으로 쌓이고(최근 {VISIBLE_ENTRIES}개만 표에 표시), F/U 항목은 Next Step에, 내 작업 단계는 My Work에 미완료 항목으로 추가돼요.
              </p>
            </>
          )}

          {preview && (
            <>
              <div style={{ color: C.muted }} className="text-xs flex items-center gap-2">
                <MeetingTag mtype={effMtype} /> {effDate} · {preview.length}개 프로젝트 업데이트를 찾았어요. 확인 후 적용하세요.
                {effTx && effTx.trim() && (
                  <span style={{ color: C.violet }} className="inline-flex items-center gap-1 ml-1">
                    <FileText size={12} /> 원문 포함
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {preview.map((u, i) => {
                  const match = projects.find((p) => p.id === u.id || p.name.toLowerCase() === (u.name || "").toLowerCase());
                  const fuCount = toBullets(u.followUps).length;
                  const workCount = toBullets(u.nextWork).length;
                  return (
                    <li key={i} style={{ borderColor: C.border, background: C.paper }}
                      className="rounded-lg border px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{match ? match.name : (u.name || "새 프로젝트")}</span>
                        {!match && <span style={{ background: C.violetSoft, color: C.violet }} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full">NEW</span>}
                        {u.status && <span className="text-[10px]" style={{ color: C.faint }}>{STATUS[u.status]?.label || u.status}</span>}
                      </div>
                      {u.summary && <p style={{ color: C.muted }} className="text-xs leading-relaxed mt-1">{u.summary}</p>}
                      {(fuCount > 0 || workCount > 0) && (
                        <div style={{ color: C.violet }} className="text-[11px] mt-1.5 flex gap-2">
                          {fuCount > 0 && <span>+ Next Step {fuCount}건</span>}
                          {workCount > 0 && <span>+ My Work {workCount}건</span>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="flex gap-2">
                <button onClick={() => setPreview(null)}
                  style={{ borderColor: C.border, color: C.muted }}
                  className="flex-1 text-sm font-medium py-2.5 rounded-lg border hover:bg-black/5 transition">
                  뒤로
                </button>
                <button onClick={() => onApply(preview, effMtype, effDate, effTx)}
                  style={{ background: C.violet }}
                  className="flex-1 text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-90 transition">
                  적용
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

