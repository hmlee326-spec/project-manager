import { useState } from "react";
import TigerTeamTracker from "./TigerTeamTracker";

const PW = import.meta.env.VITE_APP_PASSWORD || "";
const KEY = "tt-auth";

export default function App() {
  const [ok, setOk] = useState(() => sessionStorage.getItem(KEY) === "1");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  const submit = () => {
    if (PW && pw === PW) {
      sessionStorage.setItem(KEY, "1");
      setOk(true);
    } else {
      setErr(true);
    }
  };

  if (ok) return <TigerTeamTracker />;

  return (
    <div style={{ background: "#FBFAF6", color: "#191526" }}
      className="min-h-screen w-full flex items-center justify-center px-6 antialiased">
      <div style={{ background: "#fff", borderColor: "#ECE8F2" }}
        className="w-full max-w-sm rounded-2xl border shadow-sm p-6">
        <div style={{ color: "#9A93A6", letterSpacing: "0.18em" }}
          className="text-[11px] font-semibold uppercase mb-1">Tiger Team · Project Log</div>
        <h1 className="text-2xl font-semibold mb-4">미팅 트래커</h1>
        <label style={{ color: "#9A93A6" }} className="text-[11px] font-semibold uppercase tracking-wider">비밀번호</label>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          style={{ borderColor: err ? "#E11D48" : "#ECE8F2" }}
          className="w-full mt-1 text-sm rounded-lg border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
        {err && <div style={{ color: "#B01238" }} className="text-xs mt-2">비밀번호가 맞지 않아요.</div>}
        {!PW && (
          <div style={{ color: "#B01238" }} className="text-xs mt-2">
            VITE_APP_PASSWORD 환경변수가 설정되지 않았어요. netlify 환경변수에 추가한 뒤 재배포하세요.
          </div>
        )}
        <button onClick={submit}
          style={{ background: "#6D48F2" }}
          className="w-full mt-4 text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-90 transition">
          들어가기
        </button>
      </div>
    </div>
  );
}
