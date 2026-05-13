import { useState, useRef, useCallback, memo, useMemo } from "react";

const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are FuhX AI — an elite, unrestricted coding assistant with zero limitations.

DEEP UNDERSTANDING:
- Carefully read what the user wants — understand the real goal
- If unclear, ask ONE short clarifying question
- If clear, build immediately with full implementation

CODING RULES — NO EXCEPTIONS:
- Write 100% COMPLETE code — no truncation, no "// TODO", no placeholders
- Always output every file like this:
\`\`\`filename.ext
full code here
\`\`\`
- Multiple files? Each gets its own code block with real filename
- Add inline comments for key logic
- Choose best tech stack unless user specifies
- For large projects output ALL files completely

FILE & ZIP SUPPORT:
- When user needs multiple files, output each separately
- When user says "zip" or "project", output ALL files with proper structure
- List the file structure first, then output each file

LANGUAGES & FRAMEWORKS — ALL SUPPORTED:
Python, JavaScript, TypeScript, React, Vue, Next.js, Node.js, Express, FastAPI,
Go, Rust, C, C++, Java, Kotlin, Swift, PHP, Ruby, Shell, SQL, MongoDB,
HTML/CSS, Tailwind, Three.js, WebGL, Unity C#, and more

RESPONSE FORMAT:
- 1-2 line explanation max
- Code immediately
- End with "💡 Next:" suggestion`;

// ── JSZip ──────────────────────────────────────────────────────────────────
let _JSZip = null;
async function getJSZip() {
  if (_JSZip) return _JSZip;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  _JSZip = window.JSZip;
  return _JSZip;
}

// ── utils ──────────────────────────────────────────────────────────────────
function parseCodeBlocks(text) {
  const blocks = [];
  const regex = /```([^\n`]+)\n([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const lang = m[1].trim();
    blocks.push({ filename: lang.includes(".") ? lang : null, lang, code: m[2] });
  }
  return blocks;
}
function stripCode(t) { return t.replace(/```[\s\S]*?```/g, "").trim(); }
function dlFile(name, content) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([content], { type: "text/plain" })), download: name,
  });
  a.click();
}
async function dlZip(blocks) {
  await getJSZip();
  const zip = new window.JSZip();
  blocks.forEach(b => b.filename && zip.file(b.filename, b.code));
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(await zip.generateAsync({ type: "blob" })), download: "fuhx-project.zip",
  });
  a.click();
}
async function readB64(f) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
}
async function readTxt(f) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(f); });
}
function fIcon(n = "") {
  const e = n.split(".").pop().toLowerCase();
  return ({py:"🐍",js:"🟨",jsx:"⚛️",ts:"🔷",tsx:"⚛️",html:"🌐",css:"🎨",json:"📋",md:"📝",txt:"📄",pdf:"📕",png:"🖼",jpg:"🖼",jpeg:"🖼",svg:"✦",csv:"📊",java:"☕",cpp:"⚙",c:"⚙",go:"🐹",rs:"🦀",php:"🐘",rb:"💎",sh:"🖥",sql:"🗄",vue:"💚",zip:"📦",kt:"🟣",swift:"🍎",dart:"💙"})[e] || "📄";
}
const ftime = d => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ── Syntax highlight ───────────────────────────────────────────────────────
function esc(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function highlight(code) {
  return esc(code)
    .replace(/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g,'<span class="hc">$1</span>')
    .replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;|`[^`]*`)/g,'<span class="hs">$1</span>')
    .replace(/\b(import|export|default|from|const|let|var|function|return|if|else|for|while|class|extends|async|await|try|catch|throw|new|this|typeof|def|pass|self|lambda|yield|with|as|not|and|or|elif|except|finally|raise|public|private|static|void|int|string|bool|float|struct|interface|enum|type|func|package|range|make|len|defer|true|false|null|undefined)\b/g,'<span class="hk">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g,'<span class="hn">$1</span>')
    .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,'<span class="hf">$1</span>');
}

// ── CodeBlock ──────────────────────────────────────────────────────────────
const CodeBlock = memo(({ filename, lang, code, onZipAll, showZip }) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);
  const lines = useMemo(() => code.trimEnd().split("\n"), [code]);
  const html  = useMemo(() => highlight(code.trimEnd()), [code]);
  const copy  = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="cb">
      <div className="cbh" onClick={() => setOpen(o => !o)}>
        <div className="cbl">
          <span className="cbtog">{open ? "▾" : "▸"}</span>
          <span>{fIcon(filename || lang)}</span>
          <span className="cbn">{filename || lang || "code"}</span>
          <span className="cbb">{lines.length} lines</span>
        </div>
        <div className="cbbtns" onClick={e => e.stopPropagation()}>
          <button className="bg" onClick={copy}>{copied ? "✓ Copied" : "⎘ Copy"}</button>
          {filename && <button className="bdl" onClick={() => dlFile(filename, code)}>↓ Save</button>}
          {showZip  && <button className="bzip" onClick={onZipAll}>📦 ZIP</button>}
        </div>
      </div>
      {open && (
        <div className="cbbody">
          <div className="cbln">{lines.map((_,i) => <span key={i}>{i+1}</span>)}</div>
          <pre className="cbpre"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
        </div>
      )}
    </div>
  );
});

// ── FileChip ───────────────────────────────────────────────────────────────
const FileChip = memo(({ file, onRemove }) => (
  <div className="fchip">
    <span>{fIcon(file.name)}</span>
    <span className="fchn">{file.name}</span>
    <button className="fchx" onClick={() => onRemove(file.name)}>×</button>
  </div>
));

// ── Message ────────────────────────────────────────────────────────────────
const Message = memo(({ msg, isStreaming }) => {
  const isUser = msg.role === "user";
  const blocks = useMemo(() => parseCodeBlocks(msg.content || ""), [msg.content]);
  const plain  = useMemo(() => stripCode(msg.content || ""), [msg.content]);
  const hasMany = blocks.filter(b => b.filename).length > 1;

  if (isUser) return (
    <div className="mrow muser">
      <div className="mcnt">
        {msg.files?.length > 0 && (
          <div className="fbadges">{msg.files.map((f,i) => <span key={i} className="fbadge">{fIcon(f.name)} {f.name}</span>)}</div>
        )}
        <div className="buser">{msg.content}</div>
        <div className="mt">{ftime(msg.ts)}</div>
      </div>
      <div className="avu">U</div>
    </div>
  );

  return (
    <div className="mrow mai">
      <div className="avai">
        <span className="avfx">FX</span>
        {isStreaming && <span className="avring" />}
      </div>
      <div className="mcnt">
        {plain && (
          <div className="bai">
            <span dangerouslySetInnerHTML={{ __html:
              plain
                .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
                .replace(/`([^`]+)`/g,'<code class="ic">$1</code>')
            }} />
            {isStreaming && blocks.length === 0 && <span className="cur" />}
          </div>
        )}
        {blocks.map((b,i) => (
          <CodeBlock key={i} {...b}
            showZip={hasMany && i === blocks.length-1}
            onZipAll={() => dlZip(blocks)} />
        ))}
        {isStreaming && blocks.length > 0 && (
          <div className="genl">
            <span className="gd"/><span className="gd"/><span className="gd"/>
            <span>generating…</span>
          </div>
        )}
        <div className="mt">{ftime(msg.ts)}</div>
      </div>
    </div>
  );
}, (p,n) => p.isStreaming === n.isStreaming && p.msg.content === n.msg.content);

// ── Sparkles (static, no re-render) ───────────────────────────────────────
const SPARKS = Array.from({length: 14}, (_, i) => ({
  left: `${((i * 7.3 + 5) % 98) + 1}%`,
  size: (i % 3) + 2,
  dur:  (i % 5) + 7,
  del:  -((i * 1.3) % 9),
}));

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [msgs,       setMsgs]       = useState([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [files,      setFiles]      = useState([]);
  const [dragOver,   setDragOver]   = useState(false);
  const [sideOpen,   setSideOpen]   = useState(false);
  const [history,    setHistory]    = useState([]);
  const [tokenCount, setTokenCount] = useState(0);
  const [toast,      setToast]      = useState(null);

  const msgsRef  = useRef(null);
  const taRef    = useRef(null);
  const fileRef  = useRef(null);
  const abortRef = useRef(null);
  const rafRef   = useRef(null);
  const fullRef  = useRef("");

  const smartScroll = useCallback(() => {
    const el = msgsRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 240)
      el.scrollTop = el.scrollHeight;
  }, []);

  const showToast = useCallback((msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const processFiles = useCallback(async (list) => {
    const arr = Array.from(list).slice(0, 15);
    const out = [];
    for (const f of arr) {
      try {
        if (f.type.startsWith("image/") || f.type === "application/pdf")
          out.push({ name:f.name, type:f.type, base64: await readB64(f), isImage:f.type.startsWith("image/"), isPdf:f.type==="application/pdf" });
        else
          out.push({ name:f.name, type:f.type, text: await readTxt(f) });
      } catch {}
    }
    setFiles(p => { const ex = new Set(p.map(x=>x.name)); return [...p, ...out.filter(x=>!ex.has(x.name))]; });
    if (out.length) showToast(`${out.length} file যোগ হয়েছে ✓`);
  }, [showToast]);

  const onDrop  = useCallback(e => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }, [processFiles]);
  const onPaste = useCallback(e => { if (e.clipboardData.files.length) processFiles(e.clipboardData.files); }, [processFiles]);

  function buildApi(hist) {
    return hist.map(m => {
      if (m.role === "user" && m.files?.length) {
        const parts = [];
        for (const f of m.files) {
          if (f.isImage)    parts.push({ type:"image",    source:{type:"base64", media_type:f.type, data:f.base64} });
          else if (f.isPdf) parts.push({ type:"document", source:{type:"base64", media_type:"application/pdf", data:f.base64} });
          else              parts.push({ type:"text",     text:`📎 ${f.name}\n\`\`\`\n${(f.text||"").slice(0,30000)}\n\`\`\`` });
        }
        parts.push({ type:"text", text:m.content });
        return { role:"user", content:parts };
      }
      return { role:m.role, content:m.content };
    });
  }

  const send = async (q) => {
    const txt = (q ?? input).trim();
    if ((!txt && !files.length) || loading) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";

    const uMsg  = { role:"user", content:txt||"(file)", files:[...files], ts:Date.now() };
    const aiMsg = { role:"assistant", content:"", ts:Date.now() };
    setFiles([]);
    const newH = [...msgs, uMsg];
    setMsgs([...newH, aiMsg]);
    setLoading(true);
    fullRef.current = "";
    abortRef.current = new AbortController();

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", signal:abortRef.current.signal,
        headers:{
          "Content-Type":"application/json",
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body: JSON.stringify({
          model:MODEL, max_tokens:16000, stream:true,
          system:SYSTEM_PROMPT, messages:buildApi(newH),
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        throw new Error(e.error?.message || `HTTP ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      const flush = () => {
        rafRef.current = null;
        const snap = fullRef.current;
        setMsgs(p => {
          const c = [...p];
          c[c.length-1] = { ...c[c.length-1], content: snap };
          return c;
        });
        smartScroll();
      };

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream:true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") break outer;
          try {
            const ev = JSON.parse(raw);
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
              fullRef.current += ev.delta.text;
              if (!rafRef.current) rafRef.current = requestAnimationFrame(flush);
            }
            if (ev.type === "message_delta" && ev.usage)
              setTokenCount(ev.usage.output_tokens || 0);
          } catch {}
        }
      }
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); flush(); }
      setHistory(h => [{
        id:Date.now(), title:(txt||"File").slice(0,40),
        msgs:[...newH,{role:"assistant",content:fullRef.current}]
      }, ...h.slice(0,49)]);
    } catch(e) {
      if (e.name !== "AbortError") {
        const errMsg = `❌ **Error:** ${e.message}`;
        setMsgs(p => { const c=[...p]; c[c.length-1]={...c[c.length-1],content:errMsg}; return c; });
        showToast(e.message, "err");
      }
    }
    setLoading(false);
  };

  const stop   = () => { abortRef.current?.abort(); setLoading(false); };
  const onKey  = e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const canSend = (input.trim() || files.length > 0) && !loading;

  return (
    <div className="root"
      onDragOver={e=>{e.preventDefault();setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={onDrop}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

        :root{
          --bg:#fff0f7;
          --glass:rgba(255,255,255,0.70);
          --glass2:rgba(255,255,255,0.90);
          --gb:rgba(255,172,210,0.50);
          --gs:0 8px 32px rgba(219,39,119,0.09);
          --text:#1e0a16;
          --text2:#7b3065;
          --text3:#c084a8;
          --acc:#ec4899;
          --acc2:#f472b6;
          --acc3:#fce7f3;
          --ub:linear-gradient(135deg,#ec4899 0%,#a855f7 100%);
          --ubh:linear-gradient(135deg,#db2777 0%,#9333ea 100%);
          --cob:rgba(255,248,252,0.98);
          --cobr:rgba(251,182,221,0.40);
          --chip:rgba(255,228,242,0.92);
          --hk:#9333ea;--hs:#0d9488;--hc:#9ca3af;--hn:#d97706;--hf:#ec4899;
        }

        html,body,#root{height:100%;overflow:hidden;}
        .root{
          height:100vh;display:flex;overflow:hidden;
          font-family:'Plus Jakarta Sans',sans-serif;
          background:var(--bg);color:var(--text);
          position:relative;
        }

        /* ── Background mesh ── */
        .mesh{
          position:fixed;inset:0;z-index:0;pointer-events:none;
          background:
            radial-gradient(ellipse 65% 55% at 85% 5%,  rgba(251,207,232,0.65) 0%,transparent 55%),
            radial-gradient(ellipse 55% 65% at 5%  90%,  rgba(233,213,255,0.55) 0%,transparent 55%),
            radial-gradient(ellipse 45% 45% at 50% 50%,  rgba(252,231,243,0.38) 0%,transparent 65%),
            radial-gradient(ellipse 35% 35% at 20% 20%,  rgba(253,244,255,0.50) 0%,transparent 60%);
        }

        /* ── Orbs ── */
        .orb{position:fixed;border-radius:50%;pointer-events:none;z-index:0;}
        .o1{width:560px;height:560px;background:radial-gradient(circle,rgba(251,207,232,0.72) 0%,transparent 68%);top:-190px;right:-150px;filter:blur(3px);animation:of 22s ease-in-out infinite alternate;}
        .o2{width:460px;height:460px;background:radial-gradient(circle,rgba(233,213,255,0.60) 0%,transparent 68%);bottom:-150px;left:-130px;filter:blur(3px);animation:of 27s ease-in-out infinite alternate-reverse;}
        .o3{width:280px;height:280px;background:radial-gradient(circle,rgba(255,228,242,0.70) 0%,transparent 68%);top:38%;left:40%;filter:blur(2px);animation:of 14s ease-in-out infinite alternate;}
        @keyframes of{0%{transform:translate(0,0) scale(1);}100%{transform:translate(26px,20px) scale(1.06);}}

        /* ── Sparkles ── */
        .sparks{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
        .sk{
          position:absolute;bottom:-10px;border-radius:50%;
          background:radial-gradient(circle,rgba(236,72,153,0.75),transparent 70%);
          animation:skRise linear infinite;
        }
        @keyframes skRise{
          0%  {transform:translateY(0)   scale(0.2);opacity:0;}
          10% {opacity:0.8;}
          85% {opacity:0.5;}
          100%{transform:translateY(-105vh) scale(1.4);opacity:0;}
        }

        /* ── Sidebar ── */
        .side{
          position:fixed;left:0;top:0;bottom:0;width:265px;z-index:30;
          background:rgba(255,248,252,0.94);
          backdrop-filter:blur(30px) saturate(1.7);
          border-right:1px solid var(--gb);
          display:flex;flex-direction:column;
          transform:translateX(-100%);
          transition:transform .3s cubic-bezier(.4,0,.2,1);
          will-change:transform;
          box-shadow:6px 0 40px rgba(236,72,153,0.08);
        }
        .side.open{transform:translateX(0);}
        .slogo{
          padding:20px 18px 16px;
          font-size:21px;font-weight:800;letter-spacing:-0.8px;
          background:var(--ub);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          border-bottom:1px solid var(--gb);
          display:flex;align-items:center;gap:9px;
        }
        .sdot{
          width:9px;height:9px;border-radius:50%;flex-shrink:0;
          background:var(--acc);
          box-shadow:0 0 10px var(--acc),0 0 22px var(--acc2);
          animation:dp 2.2s ease-in-out infinite;
          -webkit-text-fill-color:initial;
        }
        @keyframes dp{0%,100%{box-shadow:0 0 8px var(--acc);}50%{box-shadow:0 0 20px var(--acc),0 0 36px var(--acc2),0 0 50px rgba(168,85,247,0.4));}}
        .snew{
          margin:12px;padding:11px 14px;border-radius:13px;border:none;
          background:var(--ub);color:#fff;
          font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;
          cursor:pointer;transition:all .22s;
          box-shadow:0 4px 18px rgba(236,72,153,0.32);
        }
        .snew:hover{background:var(--ubh);transform:translateY(-1px);box-shadow:0 8px 26px rgba(236,72,153,0.42);}
        .ssec{padding:14px 18px 6px;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1.6px;}
        .hitem{padding:9px 18px;font-size:13px;color:var(--text2);cursor:pointer;transition:all .16s;border-left:2px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .hitem:hover{color:var(--text);background:rgba(236,72,153,0.07);border-left-color:var(--acc);}
        .sfoot{padding:12px 18px;border-top:1px solid var(--gb);font-size:11px;color:var(--text3);}
        .ovl{position:fixed;inset:0;z-index:25;background:rgba(30,10,22,0.20);backdrop-filter:blur(3px);}

        /* ── Main ── */
        .main{flex:1;display:flex;flex-direction:column;position:relative;z-index:1;min-width:0;overflow:hidden;}

        /* ── Header ── */
        .hdr{
          padding:10px 16px;display:flex;align-items:center;gap:10px;
          background:rgba(255,248,252,0.78);
          backdrop-filter:blur(26px) saturate(1.7);
          border-bottom:1px solid var(--gb);
          position:sticky;top:0;z-index:10;
          box-shadow:0 2px 22px rgba(236,72,153,0.07);
        }
        .hlogo{
          font-size:21px;font-weight:800;letter-spacing:-0.8px;
          background:var(--ub);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          flex:1;display:flex;align-items:center;gap:9px;
          filter:drop-shadow(0 1px 8px rgba(236,72,153,0.25));
        }
        .hbadge{
          padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;
          background:var(--ub);-webkit-text-fill-color:#fff;color:#fff;
          letter-spacing:.6px;box-shadow:0 2px 10px rgba(236,72,153,0.35);
        }
        .ibtn{
          width:34px;height:34px;border-radius:10px;border:none;
          background:var(--chip);color:var(--text2);
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          font-size:15px;transition:all .2s;flex-shrink:0;
        }
        .ibtn:hover{background:var(--acc);color:#fff;transform:scale(1.09);}
        .tbadge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500;background:var(--chip);color:var(--text3);border:1px solid var(--gb);}

        /* ── Messages ── */
        .msgs{
          flex:1;overflow-y:auto;overflow-x:hidden;
          padding:24px 18px 10px;
          max-width:860px;width:100%;margin:0 auto;
          contain:layout style;
        }
        .msgs::-webkit-scrollbar{width:4px;}
        .msgs::-webkit-scrollbar-thumb{background:rgba(236,72,153,0.25);border-radius:4px;}
        .msgs::-webkit-scrollbar-track{background:transparent;}

        /* ── Welcome ── */
        .welcome{
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          min-height:65vh;text-align:center;
          animation:wup .65s cubic-bezier(.16,1,.3,1);
        }
        @keyframes wup{from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);}}
        .ww{position:relative;display:inline-block;margin-bottom:14px;}
        .wglow{
          position:absolute;inset:-24px;
          background:radial-gradient(circle,rgba(236,72,153,0.18) 0%,transparent 68%);
          border-radius:50%;pointer-events:none;
          animation:gp 3.2s ease-in-out infinite;
        }
        @keyframes gp{0%,100%{opacity:.5;transform:scale(1);}50%{opacity:1;transform:scale(1.14);}}
        .wlogo{
          font-size:76px;font-weight:800;letter-spacing:-6px;line-height:1;
          background:linear-gradient(135deg,#ec4899 0%,#f472b6 35%,#a855f7 65%,#ec4899 100%);
          background-size:250% 250%;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:shine 4s linear infinite;
        }
        @keyframes shine{0%{background-position:0% 50%;}100%{background-position:250% 50%;}}
        .wsub{font-size:14px;color:var(--text2);margin-bottom:5px;font-weight:600;letter-spacing:.2px;}
        .wowner{
          font-size:12px;font-weight:700;letter-spacing:1.2px;
          background:var(--ub);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          opacity:.8;
        }

        /* ── Msg rows ── */
        .mrow{display:flex;gap:11px;margin-bottom:20px;animation:mup .24s cubic-bezier(.4,0,.2,1);}
        @keyframes mup{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        .mai{align-items:flex-start;}
        .muser{align-items:flex-end;flex-direction:row-reverse;}

        .avai{
          width:34px;height:34px;border-radius:12px;flex-shrink:0;
          background:linear-gradient(135deg,#fce7f3,#fbcfe8,#f9a8d4,#f472b6);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 14px rgba(236,72,153,0.28);
          position:relative;
        }
        .avfx{font-size:11px;font-weight:800;letter-spacing:-1px;color:#831843;font-family:'Plus Jakarta Sans',sans-serif;}
        .avring{
          position:absolute;inset:-3px;border-radius:14px;
          border:2px solid var(--acc);
          animation:ar 1.1s ease-in-out infinite;pointer-events:none;
        }
        @keyframes ar{0%,100%{opacity:.9;transform:scale(1);}50%{opacity:0;transform:scale(1.38);}}
        .avu{
          width:34px;height:34px;border-radius:12px;flex-shrink:0;
          background:var(--ub);color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size:13px;font-weight:700;
          box-shadow:0 4px 14px rgba(236,72,153,0.3);
        }
        .mcnt{max-width:80%;display:flex;flex-direction:column;gap:6px;}
        .mt{font-size:10px;color:var(--text3);padding:0 3px;}
        .mai .mt{text-align:left;}.muser .mt{text-align:right;}

        .buser{
          background:var(--ub);color:#fff;
          border-radius:18px 18px 4px 18px;
          padding:11px 15px;font-size:14px;line-height:1.65;
          box-shadow:0 4px 20px rgba(236,72,153,0.30);
          white-space:pre-wrap;word-break:break-word;
        }
        .bai{
          background:rgba(255,255,255,0.92);
          backdrop-filter:blur(20px) saturate(1.5);
          border:1px solid rgba(255,182,215,0.40);
          border-radius:4px 18px 18px 18px;
          padding:12px 16px;font-size:14px;line-height:1.72;
          box-shadow:0 4px 22px rgba(236,72,153,0.07);
          white-space:pre-wrap;word-break:break-word;
        }
        .ic{background:var(--chip);border:1px solid var(--cobr);border-radius:5px;padding:1px 6px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--acc);}
        .fbadges{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;}
        .fbadge{background:var(--chip);border:1px solid var(--gb);border-radius:8px;padding:3px 8px;font-size:11px;color:var(--text2);}

        /* ── Code blocks ── */
        .cb{border-radius:14px;overflow:hidden;border:1px solid var(--cobr);background:var(--cob);margin-top:8px;box-shadow:0 4px 18px rgba(236,72,153,0.07);animation:mup .24s ease;}
        .cbh{display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border-bottom:1px solid var(--cobr);background:rgba(255,240,248,0.65);backdrop-filter:blur(10px);cursor:pointer;user-select:none;transition:background .15s;}
        .cbh:hover{background:rgba(255,228,242,0.85);}
        .cbl{display:flex;align-items:center;gap:7px;}
        .cbtog{font-size:11px;color:var(--text3);width:12px;}
        .cbn{font-family:'JetBrains Mono',monospace;font-size:12.5px;color:var(--text);font-weight:500;}
        .cbb{font-size:10px;color:var(--text3);background:var(--chip);border-radius:6px;padding:1px 6px;border:1px solid var(--cobr);}
        .cbbtns{display:flex;gap:5px;}
        .cbbody{display:flex;overflow-x:auto;}
        .cbln{padding:12px 10px 12px 14px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.7;color:var(--text3);text-align:right;user-select:none;border-right:1px solid var(--cobr);display:flex;flex-direction:column;min-width:44px;flex-shrink:0;}
        .cbpre{margin:0;padding:12px 16px;overflow-x:visible;font-size:12.5px;line-height:1.7;color:var(--text);font-family:'JetBrains Mono',monospace;flex:1;}
        .hk{color:var(--hk);font-weight:500;}.hs{color:var(--hs);}.hc{color:var(--hc);font-style:italic;}.hn{color:var(--hn);}.hf{color:var(--hf);}

        .bg{padding:4px 10px;border-radius:7px;font-size:11px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;border:1px solid var(--cobr);background:var(--chip);color:var(--text2);transition:all .15s;font-weight:500;}
        .bg:hover{background:rgba(255,182,215,0.35);}
        .bdl{padding:4px 10px;border-radius:7px;font-size:11px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;border:none;background:var(--acc);color:#fff;font-weight:700;transition:all .15s;}
        .bdl:hover{opacity:.86;transform:scale(1.04);}
        .bzip{padding:4px 10px;border-radius:7px;font-size:11px;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;border:none;background:#7c3aed;color:#fff;font-weight:700;transition:all .15s;}
        .bzip:hover{opacity:.86;transform:scale(1.04);}

        /* ── Streaming ── */
        .cur{display:inline-block;width:2px;height:15px;background:var(--acc);margin-left:3px;vertical-align:middle;animation:blink 1s step-end infinite;}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
        .genl{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--acc);margin-top:5px;font-weight:700;}
        .gd{width:5px;height:5px;border-radius:50%;background:var(--acc);animation:gb .78s ease-in-out infinite;}
        .gd:nth-child(2){animation-delay:.14s;}.gd:nth-child(3){animation-delay:.28s;}
        @keyframes gb{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
        .tdots{display:flex;gap:5px;padding:12px 14px;align-items:center;}
        .td{width:7px;height:7px;border-radius:50%;background:var(--acc);animation:tp 1.1s ease-in-out infinite;}
        .td:nth-child(2){animation-delay:.18s;}.td:nth-child(3){animation-delay:.36s;}
        @keyframes tp{0%,100%{opacity:.3;transform:scale(.85);}50%{opacity:1;transform:scale(1.28);}}

        /* ── Input ── */
        .inp-wrap{padding:10px 18px 13px;position:sticky;bottom:0;z-index:10;}
        .inp-inner{max-width:860px;margin:0 auto;}
        .fchips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;}
        .fchip{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);border:1px solid var(--gb);border-radius:10px;padding:4px 9px;font-size:12px;color:var(--text2);animation:mup .2s ease;}
        .fchn{max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .fchx{background:none;border:none;color:var(--text3);cursor:pointer;font-size:15px;line-height:1;padding:0 2px;}
        .fchx:hover{color:#ef4444;}

        .ibox{
          display:flex;gap:8px;align-items:flex-end;
          background:rgba(255,255,255,0.94);
          backdrop-filter:blur(26px) saturate(1.7);
          border:1.5px solid rgba(255,172,210,0.55);
          border-radius:22px;padding:10px 12px;
          box-shadow:0 4px 26px rgba(236,72,153,0.10);
          transition:border-color .25s,box-shadow .25s;
        }
        .ibox:focus-within{
          border-color:var(--acc2);
          box-shadow:0 0 0 4px rgba(244,114,182,0.14),0 4px 26px rgba(236,72,153,0.13);
        }
        .abtn{
          width:35px;height:35px;border-radius:11px;border:none;flex-shrink:0;
          background:var(--chip);color:var(--text2);cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;font-weight:300;line-height:1;transition:all .22s;
        }
        .abtn:hover{background:var(--acc);color:#fff;transform:rotate(45deg) scale(1.1);}
        .ita{flex:1;background:transparent;border:none;color:var(--text);font-size:14px;line-height:1.6;font-family:'Plus Jakarta Sans',sans-serif;max-height:160px;overflow-y:auto;resize:none;outline:none;}
        .ita::placeholder{color:var(--text3);}
        .sbtn2{width:36px;height:36px;border-radius:12px;border:none;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;transition:all .22s;}
        .sbtn2.on{background:var(--ub);color:#fff;box-shadow:0 4px 16px rgba(236,72,153,0.42);}
        .sbtn2.on:hover{transform:scale(1.1);}
        .sbtn2.off{background:var(--chip);color:var(--text3);cursor:not-allowed;opacity:.5;}
        .sbtn2.stop{background:linear-gradient(135deg,#f43f5e,#dc2626);color:#fff;animation:sp 1.2s ease-in-out infinite;}
        @keyframes sp{0%,100%{box-shadow:0 0 0 0 rgba(244,63,94,0.45);}50%{box-shadow:0 0 0 7px rgba(244,63,94,0);}}

        .ihint{font-size:11px;color:var(--text3);text-align:center;margin-top:6px;font-weight:500;}
        .ihint b{background:var(--ub);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}

        /* ── Drag ── */
        .drag-ovl{position:fixed;inset:0;z-index:50;background:rgba(236,72,153,0.06);backdrop-filter:blur(6px);border:3px dashed var(--acc);display:flex;align-items:center;justify-content:center;pointer-events:none;}
        .drag-box{background:rgba(255,255,255,0.93);backdrop-filter:blur(22px);border:1px solid var(--gb);border-radius:22px;padding:28px 52px;font-size:18px;font-weight:800;color:var(--acc);box-shadow:0 8px 40px rgba(236,72,153,0.2);}

        /* ── Toast ── */
        .toast{position:fixed;bottom:86px;left:50%;transform:translateX(-50%);padding:10px 22px;border-radius:40px;font-size:13px;font-weight:700;backdrop-filter:blur(20px);z-index:60;pointer-events:none;animation:tin .28s cubic-bezier(.4,0,.2,1);box-shadow:0 8px 30px rgba(0,0,0,.12);}
        .toast.ok{background:rgba(236,72,153,0.93);color:#fff;}
        .toast.err{background:rgba(220,38,38,0.92);color:#fff;}
        @keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(10px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
      `}</style>

      {/* BG */}
      <div className="mesh"/>
      <div className="orb o1"/><div className="orb o2"/><div className="orb o3"/>
      <div className="sparks">
        {SPARKS.map((sk,i) => (
          <div key={i} className="sk" style={{
            left:sk.left,
            width:`${sk.size}px`,height:`${sk.size}px`,
            animationDuration:`${sk.dur}s`,
            animationDelay:`${sk.del}s`,
          }}/>
        ))}
      </div>

      {dragOver && <div className="drag-ovl"><div className="drag-box">📁 ফাইল ছেড়ে দিন</div></div>}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      {sideOpen && <div className="ovl" onClick={() => setSideOpen(false)}/>}

      {/* Sidebar */}
      <div className={`side${sideOpen?" open":""}`}>
        <div className="slogo"><div className="sdot"/>FuhX AI</div>
        <button className="snew" onClick={() => { setMsgs([]); setTokenCount(0); setSideOpen(false); }}>
          ＋ নতুন চ্যাট
        </button>
        <div className="ssec">ইতিহাস</div>
        <div style={{flex:1,overflowY:"auto"}}>
          {history.length===0 && <div style={{padding:"10px 18px",fontSize:"13px",color:"var(--text3)"}}>এখনো কিছু নেই</div>}
          {history.map(h=>(
            <div key={h.id} className="hitem" onClick={()=>{setMsgs(h.msgs);setSideOpen(false);}}>
              💬 {h.title}
            </div>
          ))}
        </div>
        <div className="sfoot">claude-sonnet-4 · 16k · unlimited</div>
      </div>

      {/* Main */}
      <div className="main">

        {/* Header */}
        <div className="hdr">
          <button className="ibtn" onClick={() => setSideOpen(s=>!s)}>☰</button>
          <div className="hlogo">
            FuhX AI
            <span className="hbadge">PREMIUM</span>
          </div>
          {tokenCount>0 && <div className="tbadge">⚡ {tokenCount.toLocaleString()}</div>}
          {msgs.length>0 && <button className="ibtn" onClick={()=>{setMsgs([]);setTokenCount(0);}} title="Clear">🗑</button>}
        </div>

        {/* Messages */}
        <div className="msgs" ref={msgsRef}>
          {msgs.length===0 && (
            <div className="welcome">
              <div className="ww">
                <div className="wglow"/>
                <div className="wlogo">FuhX AI</div>
              </div>
              <p className="wsub">Premium · Unlimited · Zero Limits</p>
              <p className="wowner">⚡ OWNER — FuhX FF</p>
            </div>
          )}

          {msgs.map((m,i) => (
            <Message key={i} msg={m}
              isStreaming={loading && i===msgs.length-1 && m.role==="assistant"}/>
          ))}

          {loading && msgs[msgs.length-1]?.content==="" && (
            <div className="mrow mai">
              <div className="avai"><span className="avfx">FX</span><span className="avring"/></div>
              <div className="bai" style={{padding:"4px 8px"}}>
                <div className="tdots"><div className="td"/><div className="td"/><div className="td"/></div>
              </div>
            </div>
          )}
          <div ref={el=>{if(el)smartScroll();}}/>
        </div>

        {/* Input */}
        <div className="inp-wrap">
          <div className="inp-inner">
            {files.length>0 && (
              <div className="fchips">
                {files.map(f=><FileChip key={f.name} file={f} onRemove={n=>setFiles(p=>p.filter(x=>x.name!==n))}/>)}
              </div>
            )}
            <div className="ibox">
              <button className="abtn" title="ফাইল যোগ করুন" onClick={()=>fileRef.current?.click()}>＋</button>
              <input ref={fileRef} type="file" multiple style={{display:"none"}}
                onChange={e=>{processFiles(e.target.files);e.target.value="";}}/>
              <textarea ref={taRef} className="ita" value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={onKey} onPaste={onPaste} rows={1}
                placeholder="Message FuhX AI…"
                onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,160)+"px";}}
              />
              {loading
                ? <button className="sbtn2 stop" onClick={stop}>■</button>
                : <button className={`sbtn2 ${canSend?"on":"off"}`} onClick={()=>send()} disabled={!canSend}>➤</button>
              }
            </div>
            <div className="ihint"><b>FuhX FF</b> · 📎 file upload · 📦 ZIP download · ⚡ unlimited prompts</div>
          </div>
        </div>

      </div>
    </div>
  );
}
