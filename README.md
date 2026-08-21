# 미팅 트래커 — 배포 가이드

폰·크롬·컴퓨터 어디서 열든 **같은 데이터**가 뜨고, 비밀번호로 잠긴 개인용 트래커예요.

구성:
- **Vite + React** 앱 (화면)
- **Supabase** — 데이터를 클라우드에 저장 (기기 간 동기화)
- **Netlify Function** — Anthropic API 키를 숨긴 채 녹취 파싱
- **비밀번호 게이트** — 앱 열면 비번 입력

> ⚠️ 참고: 이 비번은 "우연히 URL 아는 사람"을 막는 가벼운 잠금이에요. 작정한 사람에 대한 완전한 보안은 아니에요. 회사 미팅 내용이 들어가니, 링크를 아무 데나 공유하지 마세요.

---

## 준비물 (모두 무료)

1. **GitHub** 계정 — 코드 올릴 곳
2. **Netlify** 계정 — 배포 (github.com 계정으로 로그인 가능)
3. **Supabase** 계정 — 데이터 저장
4. **Anthropic API 키** — https://console.anthropic.com → API Keys

---

## 1단계 · Supabase 만들기

1. https://supabase.com 로그인 → **New project** 생성 (지역은 가까운 곳).
2. 프로젝트가 뜨면 왼쪽 메뉴 **SQL Editor** → 아래를 붙여넣고 **Run**:

   ```sql
   create table kv (
     key text primary key,
     value jsonb,
     updated_at timestamptz default now()
   );

   alter table kv enable row level security;

   -- 혼자 쓰는 개인용: anon 키로 읽기/쓰기 허용
   create policy "anon all" on kv
     for all using (true) with check (true);
   ```

3. 왼쪽 **Project Settings → API** 로 가서 두 값을 복사해 둡니다:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** 키 → `VITE_SUPABASE_ANON_KEY`
   (⚠️ `service_role` 키는 절대 쓰지 마세요.)

---

## 2단계 · GitHub에 코드 올리기

이 폴더(`tigerteam-tracker`)를 GitHub 저장소로 올립니다.

컴퓨터 터미널에서:

```bash
cd tigerteam-tracker
git init
git add .
git commit -m "first commit"
# GitHub에서 빈 저장소를 만든 뒤, 그 주소로:
git remote add origin https://github.com/<your-id>/<repo>.git
git branch -M main
git push -u origin main
```

> Git이 익숙하지 않으면, GitHub Desktop 앱으로 이 폴더를 드래그해서 올려도 돼요.

---

## 3단계 · Netlify에 연결

1. https://netlify.com 로그인 → **Add new site → Import an existing project**.
2. **GitHub** 선택 → 방금 올린 저장소 선택.
3. 빌드 설정은 자동으로 잡힙니다 (netlify.toml에 이미 들어있음):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. **아직 Deploy 누르지 말고** 환경변수부터 넣습니다 (다음 단계).

---

## 4단계 · 환경변수 넣기

Netlify: **Site configuration → Environment variables → Add a variable** 에서 아래 5개를 추가합니다.

| 이름 | 값 | 설명 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | 1단계에서 복사 |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public 키 | 1단계에서 복사 |
| `VITE_APP_PASSWORD` | 원하는 비밀번호 | 앱 잠금 |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | 녹취 파싱용 (서버에만) |
| `ANTHROPIC_MODEL` | (선택) `claude-sonnet-5` | 안 넣으면 기본값 사용 |

넣은 뒤 **Deploys → Trigger deploy → Deploy site** 를 눌러 배포합니다.

> `VITE_` 로 시작하는 값은 빌드 때 앱에 심어지므로, **바꾼 뒤에는 재배포(Trigger deploy)** 해야 반영돼요. 비밀번호를 바꿀 때도 마찬가지입니다.

---

## 5단계 · 확인

1. 배포가 끝나면 나오는 `https://<이름>.netlify.app` 주소를 엽니다.
2. 비밀번호 입력 → 트래커 화면.
3. 시드(Meeting 1) 데이터가 보이면 Supabase 연결 성공.
4. "미팅 추가"로 녹취를 넣어 파싱이 되면 Anthropic 연결 성공.
5. 폰에서 같은 주소를 열어 같은 데이터가 보이면 동기화 성공.

주소를 폰 홈 화면에 추가하면 앱처럼 쓸 수 있어요 (Safari/Chrome: 공유 → 홈 화면에 추가).

---

## 로컬에서 먼저 돌려보고 싶다면

```bash
cd tigerteam-tracker
npm install
cp .env.example .env      # .env 를 열어 값 채우기
npm run dev
```

단, 로컬 `npm run dev` 에서는 netlify function이 안 떠서 "미팅 추가" 파싱이 안 돼요.
파싱까지 로컬에서 테스트하려면 Netlify CLI를 쓰세요:

```bash
npm install -g netlify-cli
netlify dev
```

---

## 자주 겪는 문제

- **화면이 하얗고 콘솔에 Supabase 경고** → 환경변수 오타 또는 재배포 안 함. 값 확인 후 Trigger deploy.
- **비번 화면에 "VITE_APP_PASSWORD 미설정"** → 해당 변수 추가 후 재배포.
- **"미팅 추가" 파싱 실패** → `ANTHROPIC_API_KEY` 확인, Anthropic 콘솔에 크레딧 있는지 확인. 모델명 오류면 `ANTHROPIC_MODEL` 을 최신 값으로. (모델 목록: https://docs.claude.com/en/api/overview)
- **데이터가 안 뜸** → Supabase에서 `kv` 테이블과 정책(policy)이 만들어졌는지 SQL Editor에서 확인.

---

## 나중에 보안을 더 높이고 싶으면

지금은 anon 키 + 비번 게이트예요. 더 확실히 잠그려면 Supabase Auth(이메일 로그인)를 붙이고 RLS 정책을 로그인 사용자로 제한하면 됩니다. 필요할 때 알려주세요.
