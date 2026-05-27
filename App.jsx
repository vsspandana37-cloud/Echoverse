import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// ─── API CONNECTOR ─────────────────────────────────────────────────────────

const API_URL = 'http://localhost:3001/api';

const fetchAPI = async (endpoint, options = {}) => {
  const token = localStorage.getItem('ev_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Network error');
  }
  return response.json();
};

const Backend = {
  async login(email, password) {
    return fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  async register(name, username, email, password) {
    return fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ name, username, email, password }) });
  },
  async getUser(token) {
    if (!token) return null;
    try { return await fetchAPI('/auth/me'); } catch { return null; }
  },
  async updateUser(token, data) {
    return fetchAPI('/auth/me', { method: 'PUT', body: JSON.stringify(data) });
  },
  async getPosts(filter = {}) {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => { if (value) params.append(key, value) });
    return fetchAPI(`/posts?${params.toString()}`);
  },
  async getPost(id) {
    return fetchAPI(`/posts/${id}`);
  },
  async createPost(token, data) {
    return fetchAPI('/posts', { method: 'POST', body: JSON.stringify(data) });
  },
  async updatePost(token, id, data) {
    return fetchAPI(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deletePost(token, id) {
    return fetchAPI(`/posts/${id}`, { method: 'DELETE' });
  },
  async reactToPost(postId, reaction) {
    return fetchAPI(`/posts/${postId}/react`, { method: 'POST', body: JSON.stringify({ reaction }) });
  },
  async getComments(postId) {
    return fetchAPI(`/posts/${postId}/comments`);
  },
  async addComment(token, postId, content) {
    return fetchAPI(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
  },
  async addReply(token, commentId, content) {
    return fetchAPI(`/comments/${commentId}/reply`, { method: 'POST', body: JSON.stringify({ content }) });
  },

  // Retained utilities
  detectMood(text) {
    const lower = text.toLowerCase();
    if (/(sad|cry|lonely|loss|grief|hurt|pain|broken)/.test(lower)) return { mood: "emotional", color: "#ec4899", gradient: "135deg, #a18cd1 0%, #fbc2eb 100%" };
    if (/(inspir|dream|hope|believe|possible|achieve|rise)/.test(lower)) return { mood: "inspirational", color: "#f59e0b", gradient: "135deg, #f093fb 0%, #f5576c 100%" };
    if (/(learn|study|research|data|science|code|build|tech)/.test(lower)) return { mood: "educational", color: "#3b82f6", gradient: "135deg, #4facfe 0%, #00f2fe 100%" };
    if (/(power|strong|fight|change|revolution|stand|voice)/.test(lower)) return { mood: "powerful", color: "#ef4444", gradient: "135deg, #f5af19 0%, #f12711 100%" };
    if (/(think|wonder|question|why|curious|explore|discover)/.test(lower)) return { mood: "philosophical", color: "#8b5cf6", gradient: "135deg, #667eea 0%, #764ba2 100%" };
    if (/(happy|joy|celebrate|love|grateful|grateful|wonderful)/.test(lower)) return { mood: "joyful", color: "#10b981", gradient: "135deg, #43e97b 0%, #38f9d7 100%" };
    return { mood: "reflective", color: "#6366f1", gradient: "135deg, #667eea 0%, #764ba2 100%" };
  },
  generateSummary(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join(". ").trim() + ".";
  }
};

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ─── STYLES ──────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');`;

const CSS = `
${FONTS}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg: #0a0a0f;
  --bg2: #0f0f1a;
  --bg3: #13131f;
  --surface: rgba(255,255,255,0.04);
  --surface2: rgba(255,255,255,0.07);
  --border: rgba(255,255,255,0.08);
  --border2: rgba(255,255,255,0.14);
  --text: #f0eeff;
  --text2: #a09cc0;
  --text3: #6b6785;
  --accent: #7c6fcd;
  --accent2: #a78bfa;
  --accent3: #c4b5fd;
  --glow: rgba(124,111,205,0.3);
  --red: #f87171;
  --green: #34d399;
  --amber: #fbbf24;
  --pink: #f472b6;
  --ff-display: 'Playfair Display', Georgia, serif;
  --ff-sans: 'DM Sans', sans-serif;
  --ff-mono: 'JetBrains Mono', monospace;
  --r: 12px;
  --r2: 20px;
  --r3: 28px;
  --shadow: 0 4px 24px rgba(0,0,0,0.4);
  --shadow2: 0 8px 48px rgba(0,0,0,0.6);
}
html,body,#root{height:100%;font-family:var(--ff-sans);background:var(--bg);color:var(--text);overflow:hidden}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
input,textarea,select{background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-family:var(--ff-sans);border-radius:var(--r);padding:10px 14px;font-size:14px;outline:none;transition:all .2s}
input:focus,textarea:focus,select:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}
input::placeholder,textarea::placeholder{color:var(--text3)}
button{cursor:pointer;font-family:var(--ff-sans);border:none;outline:none;transition:all .2s}
a{color:inherit;text-decoration:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes particles{0%{transform:translateY(0) translateX(0) scale(1);opacity:.8}100%{transform:translateY(-120px) translateX(30px) scale(0);opacity:0}}
.fadeUp{animation:fadeUp .5s ease both}
.fadeIn{animation:fadeIn .4s ease both}
.glass{background:var(--surface);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:var(--r2)}
.glass2{background:var(--surface2);backdrop-filter:blur(12px);border:1px solid var(--border2);border-radius:var(--r)}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:var(--r);font-size:14px;font-weight:500;transition:all .2s;white-space:nowrap}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;box-shadow:0 4px 20px var(--glow)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 28px var(--glow)}
.btn-ghost{background:transparent;color:var(--text2);border:1px solid var(--border2)}
.btn-ghost:hover{background:var(--surface2);color:var(--text);border-color:var(--border2)}
.btn-danger{background:rgba(248,113,113,0.15);color:var(--red);border:1px solid rgba(248,113,113,0.3)}
.btn-danger:hover{background:rgba(248,113,113,0.25)}
.tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;background:var(--surface2);color:var(--text2);border:1px solid var(--border);cursor:pointer;transition:all .2s}
.tag:hover{background:rgba(124,111,205,0.2);color:var(--accent3);border-color:var(--accent)}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:linear-gradient(135deg,rgba(124,111,205,0.2),rgba(167,139,250,0.2));color:var(--accent3);border:1px solid rgba(124,111,205,0.3)}
.scroll{overflow-y:auto;overflow-x:hidden}
`;

// ─── PARTICLES ────────────────────────────────────────────────────────────────

function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 8,
    duration: Math.random() * 6 + 6,
    opacity: Math.random() * 0.3 + 0.1,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, bottom: "-10px",
          width: p.size, height: p.size, borderRadius: "50%",
          background: `rgba(124,111,205,${p.opacity})`,
          animation: `particles ${p.duration}s ${p.delay}s ease-in infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── TOPNAV ───────────────────────────────────────────────────────────────────

function TopNav({ page, setPage, user, onLogout, onWriteClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const { setFilter } = useApp();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) { setFilter({ search: searchQ }); setPage("feed"); setSearchOpen(false); }
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 60,
      background: "rgba(10,10,15,0.85)", backdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--border)"
    }}>
      <button onClick={() => setPage("feed")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "linear-gradient(135deg,#7c6fcd,#a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "white"
        }}>E</div>
        <span style={{ fontFamily: "var(--ff-display)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>EchoVerse</span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {["feed","trending","categories"].map(p => (
          <button key={p} onClick={() => setPage(p)} style={{
            background: page === p ? "var(--surface2)" : "none",
            color: page === p ? "var(--accent3)" : "var(--text2)",
            border: page === p ? "1px solid var(--border2)" : "1px solid transparent",
            borderRadius: "var(--r)", padding: "6px 14px", fontSize: 13, fontWeight: 500,
            textTransform: "capitalize"
          }}>{p}</button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {searchOpen ? (
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 6 }}>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search stories..." autoFocus style={{ width: 200, padding: "6px 12px", fontSize: 13 }} />
            <button type="button" onClick={() => setSearchOpen(false)} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 13 }}>✕</button>
          </form>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="btn btn-ghost" style={{ padding: "6px 10px" }}>🔍</button>
        )}

        {user ? (
          <>
            <button onClick={onWriteClick} className="btn btn-primary" style={{ padding: "7px 16px", fontSize: 13 }}>✍ Write</button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setMenuOpen(!menuOpen)} style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg,var(--accent),var(--accent2))",
                color: "white", fontSize: 13, fontWeight: 700, border: "none",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>{user.avatar}</button>
              {menuOpen && (
                <div className="glass2" style={{
                  position: "absolute", right: 0, top: 42, minWidth: 160,
                  padding: 6, display: "flex", flexDirection: "column", gap: 2, zIndex: 200
                }}>
                  {[["👤 Profile", () => { setPage("profile"); setMenuOpen(false); }],
                    ["📖 My Posts", () => { setPage("myposts"); setMenuOpen(false); }],
                    ["🔖 Bookmarks", () => { setPage("bookmarks"); setMenuOpen(false); }],
                    ["⚙️ Settings", () => { setPage("settings"); setMenuOpen(false); }],
                    ["🚪 Logout", () => { onLogout(); setMenuOpen(false); }]
                  ].map(([label, fn]) => (
                    <button key={label} onClick={fn} style={{
                      background: "none", color: "var(--text2)", fontSize: 13,
                      padding: "8px 12px", borderRadius: 8, textAlign: "left",
                      transition: "all .15s",
                    }}
                    onMouseEnter={e => e.target.style.background = "var(--surface2)"}
                    onMouseLeave={e => e.target.style.background = "none"}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setPage("login")} className="btn btn-ghost" style={{ padding: "7px 16px", fontSize: 13 }}>Login</button>
            <button onClick={() => setPage("register")} className="btn btn-primary" style={{ padding: "7px 16px", fontSize: 13 }}>Join EchoVerse</button>
          </>
        )}
      </div>
    </nav>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────

function AuthPage({ mode, setPage, onAuth }) {
  const [form, setForm] = useState({ name:"", username:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      let result;
      if (mode === "login") result = await Backend.login(form.email, form.password);
      else result = await Backend.register(form.name, form.username, form.email, form.password);
      localStorage.setItem("ev_token", result.token);
      onAuth(result.user, result.token);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp .5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: "linear-gradient(135deg,#7c6fcd,#a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 700, color: "white", margin: "0 auto 16px",
            boxShadow: "0 8px 32px var(--glow)"
          }}>E</div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            {mode === "login" ? "Welcome back" : "Join EchoVerse"}
          </h1>
          <p style={{ color: "var(--text2)", fontSize: 15 }}>
            {mode === "login" ? "Your stories are waiting for you" : "Where every story finds its echo"}
          </p>
        </div>

        <div className="glass" style={{ padding: 32 }}>
          <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "register" && (
              <>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, letterSpacing: ".05em", display: "block", marginBottom: 6 }}>FULL NAME</label>
                  <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Your name" required style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, letterSpacing: ".05em", display: "block", marginBottom: 6 }}>USERNAME</label>
                  <input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} placeholder="@username" required style={{ width: "100%" }} />
                </div>
              </>
            )}
            <div>
              <label style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, letterSpacing: ".05em", display: "block", marginBottom: 6 }}>EMAIL</label>
              <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="your@email.com" required style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, letterSpacing: ".05em", display: "block", marginBottom: 6 }}>PASSWORD</label>
              <input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} placeholder="••••••••" required style={{ width: "100%" }} />
            </div>
            {error && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", color: "var(--red)", fontSize: 13 }}>{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", padding: 12, fontSize: 15, justifyContent: "center", marginTop: 4 }}>
              {loading ? "..." : mode === "login" ? "Enter EchoVerse →" : "Create Account →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text2)" }}>
            {mode === "login" ? "New here?" : "Already a member?"}{" "}
            <button onClick={() => setPage(mode === "login" ? "register" : "login")} style={{ background: "none", color: "var(--accent3)", fontWeight: 600 }}>
              {mode === "login" ? "Join EchoVerse" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── POST CARD ────────────────────────────────────────────────────────────────

function PostCard({ post, onClick, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  const totalReactions = Object.values(post.reactions || {}).reduce((a,b)=>a+b,0);

  return (
    <div onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{
        cursor: "pointer", borderRadius: "var(--r2)", overflow: "hidden",
        background: "var(--surface)", border: "1px solid var(--border)",
        transition: "all .3s cubic-bezier(.4,0,.2,1)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 20px 60px rgba(0,0,0,.5)" : "none",
        animation: `fadeUp .5s ease ${delay * 0.08}s both`
      }}>
      <div style={{
        height: 180, background: `linear-gradient(${post.coverGradient})`,
        position: "relative", overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, transparent 40%, rgba(10,10,15,0.7))"
        }} />
        <div style={{ position: "absolute", bottom: 14, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: "rgba(0,0,0,0.4)", color: "white", textTransform: "uppercase",
            letterSpacing: ".06em", backdropFilter: "blur(8px)"
          }}>{post.mood}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", padding: "3px 8px", borderRadius: 10 }}>
            {post.readTime} min read
          </span>
        </div>
        {post.anonymous && (
          <div style={{ position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)", backdropFilter: "blur(6px)" }}>
            🎭 Anonymous
          </div>
        )}
      </div>

      <div style={{ padding: "18px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: post.anonymous ? "var(--surface2)" : `linear-gradient(135deg,${post.moodColor},var(--accent2))`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0
          }}>{post.author?.avatar || "?"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{post.author?.name}</div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{new Date(post.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>{post.views?.toLocaleString()} views</div>
        </div>

        <h3 style={{ fontFamily: "var(--ff-display)", fontSize: 18, fontWeight: 700, lineHeight: 1.3, marginBottom: 8, color: "var(--text)" }}>{post.title}</h3>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 14, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{post.excerpt}</p>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {post.tags?.slice(0,3).map(t => <span key={t} className="tag" style={{ fontSize: 11 }}>#{t}</span>)}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {["🔥","😮","💧","💡","⚡"].map((e,i) => (
              <span key={i} style={{ fontSize: 14, opacity: 0.7 }}>{e}</span>
            ))}
            <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 6 }}>{totalReactions}</span>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text3)" }}>
            <span>💬 {post.commentCount || 0}</span>
            <span>🔖 {post.bookmarks || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FEED PAGE ────────────────────────────────────────────────────────────────

function FeedPage({ setPage, setActivePost }) {
  const { user, filter, setFilter } = useApp();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Backend.getPosts(filter).then(res => { setPosts(res); setLoading(false); }).catch(console.error);
  }, [filter]);

  const categories = ["All", "Technology", "Lifestyle", "Mental Health", "Philosophy", "Creative"];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px 40px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 32 }}>
      <div>
        {!filter.search && !filter.category && !filter.tag && (
          <div style={{ marginBottom: 40, animation: "fadeUp .5s ease" }}>
            <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 48, fontWeight: 700, lineHeight: 1.1, marginBottom: 12 }}>
              Stories that{" "}
              <span style={{ background: "linear-gradient(135deg,var(--accent),var(--accent2),var(--pink))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                echo
              </span>
              {" "}forever
            </h1>
            <p style={{ color: "var(--text2)", fontSize: 17, maxWidth: 500 }}>
              A space where human experience, creativity, and connection live side by side.
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c === "All" ? {} : { category: c })}
              className={filter.category === c || (!filter.category && c === "All") ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "6px 16px", fontSize: 13 }}>
              {c}
            </button>
          ))}
          {filter.search && <span style={{ padding: "6px 16px", borderRadius: "var(--r)", background: "rgba(124,111,205,0.2)", color: "var(--accent3)", fontSize: 13 }}>
            🔍 "{filter.search}" <button onClick={() => setFilter({})} style={{ background: "none", color: "var(--text2)", marginLeft: 4 }}>✕</button>
          </span>}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text3)" }}>Loading stories...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text3)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌌</div>
            <p style={{ fontSize: 18, color: "var(--text2)" }}>No stories found</p>
            <p style={{ fontSize: 14, marginTop: 6 }}>Try a different filter or write the first one</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {posts.map((p, i) => (
              <PostCard key={p.id} post={p} delay={i} onClick={() => { setActivePost(p.id); setPage("post"); }} />
            ))}
          </div>
        )}
      </div>

      <Sidebar setPage={setPage} setActivePost={setActivePost} setFilter={setFilter} />
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

function Sidebar({ setPage, setActivePost, setFilter }) {
  const { user } = useApp();
  const [trending, setTrending] = useState([]);
  
  useEffect(() => {
    Backend.getPosts().then(res => {
      setTrending(res.sort((a,b)=>b.views-a.views).slice(0,4));
    });
  }, []);

  const tags = ["philosophy","technology","mindfulness","empathy","creativity","mentalhealth","building","poetry"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
      <div className="glass" style={{ padding: 20 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--text3)", textTransform: "uppercase", marginBottom: 16 }}>🔥 Trending Now</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {trending.map((p, i) => (
            <button key={p.id} onClick={() => { setActivePost(p.id); setPage("post"); }} style={{
              background: "none", textAlign: "left", border: "none",
              display: "flex", gap: 12, alignItems: "flex-start", padding: 0
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text3)", fontFamily: "var(--ff-mono)", minWidth: 22 }}>{i+1}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3, marginBottom: 3 }}>{p.title}</p>
                <p style={{ fontSize: 11, color: "var(--text3)" }}>{p.views?.toLocaleString()} views</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="glass" style={{ padding: 20 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--text3)", textTransform: "uppercase", marginBottom: 14 }}>🏷 Explore Topics</h4>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tags.map(t => (
            <button key={t} onClick={() => setFilter({ tag: t })} className="tag">#{t}</button>
          ))}
        </div>
      </div>

      {!user && (
        <div className="glass" style={{ padding: 22, background: "linear-gradient(135deg,rgba(124,111,205,0.1),rgba(167,139,250,0.1))", borderColor: "rgba(124,111,205,0.3)" }}>
          <h4 style={{ fontFamily: "var(--ff-display)", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Share your story</h4>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.5 }}>Join thousands of writers who've found their voice on EchoVerse.</p>
          <button onClick={() => setPage("register")} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 10 }}>Get Started →</button>
        </div>
      )}

      <div className="glass" style={{ padding: 20 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--text3)", textTransform: "uppercase", marginBottom: 14 }}>🌈 Story Moods</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[["🟣 Philosophical","#8b5cf6"],["🩷 Emotional","#ec4899"],["🟡 Motivational","#f59e0b"],["🔵 Educational","#3b82f6"],["🟢 Joyful","#10b981"],["🔴 Powerful","#ef4444"]].map(([label,color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 3, height: 20, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 12, color: "var(--text2)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── POST PAGE ────────────────────────────────────────────────────────────────

function PostPage({ postId, setPage, user, token }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [reacted, setReacted] = useState({});
  const [readProgress, setReadProgress] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const contentRef = useRef(null);

  useEffect(() => {
    Backend.getPost(postId).then(setPost).catch(console.error);
    Backend.getComments(postId).then(setComments).catch(console.error);
  }, [postId]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const parent = el.closest(".scroll");
    if (!parent) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = parent;
      setReadProgress(Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)));
    };
    parent.addEventListener("scroll", onScroll);
    return () => parent.removeEventListener("scroll", onScroll);
  }, [post]);

  const handleReact = async (reaction) => {
    if (reacted[reaction]) return;
    await Backend.reactToPost(postId, reaction);
    setPost(prev => ({ ...prev, reactions: { ...prev.reactions, [reaction]: prev.reactions[reaction] + 1 } }));
    setReacted(prev => ({ ...prev, [reaction]: true }));
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    const c = await Backend.addComment(token, postId, commentText);
    setComments(prev => [c, ...prev]);
    setCommentText("");
  };

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;
    await Backend.addReply(token, commentId, replyText);
    const updatedComments = await Backend.getComments(postId);
    setComments(updatedComments);
    setReplyText(""); setReplyTo(null);
  };

  if (!post) return <div style={{ textAlign:"center", padding: 100, color: "var(--text2)" }}>Loading story...</div>;

  const REACTIONS = [
    { key: "Inspired", emoji: "🔥", label: "Inspired" },
    { key: "Curious", emoji: "🤔", label: "Curious" },
    { key: "Emotional", emoji: "💧", label: "Emotional" },
    { key: "Helpful", emoji: "💡", label: "Helpful" },
    { key: "Powerful", emoji: "⚡", label: "Powerful" },
  ];

  const totalR = Object.values(post.reactions || {}).reduce((a,b)=>a+b,0);

  return (
    <div ref={contentRef} style={{ maxWidth: 780, margin: "0 auto", padding: "80px 24px 80px" }}>
      <div style={{ position: "fixed", top: 60, left: 0, right: 0, height: 2, background: "var(--border)", zIndex: 50 }}>
        <div style={{ height: "100%", background: `linear-gradient(90deg,${post.moodColor},var(--accent2))`, width: `${readProgress}%`, transition: "width .1s" }} />
      </div>

      <button onClick={() => setPage("feed")} className="btn btn-ghost" style={{ marginBottom: 28, padding: "6px 14px", fontSize: 13 }}>← Back to Feed</button>

      <div style={{ height: 360, borderRadius: "var(--r2)", background: `linear-gradient(${post.coverGradient})`, marginBottom: 36, position: "relative", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(10,10,15,0.85))" }} />
        <div style={{ position: "absolute", bottom: 32, left: 36, right: 36 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span className="tag" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", color: "white", borderColor: "rgba(255,255,255,0.2)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>{post.mood}</span>
            <span className="tag" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", color: "white", borderColor: "rgba(255,255,255,0.2)", fontSize: 12 }}>{post.category}</span>
            {post.anonymous && <span className="tag" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", color: "white", borderColor: "rgba(255,255,255,0.2)", fontSize: 12 }}>🎭 Anonymous</span>}
          </div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 38, fontWeight: 700, color: "white", lineHeight: 1.2, textShadow: "0 2px 20px rgba(0,0,0,.3)" }}>{post.title}</h1>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: post.anonymous ? "var(--surface2)" : `linear-gradient(135deg,${post.moodColor},var(--accent2))`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "white"
          }}>{post.author?.avatar}</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{post.author?.name}</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>{new Date(post.createdAt).toLocaleDateString("en-US",{ year:"numeric",month:"long",day:"numeric" })} · {post.readTime} min read</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 14px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: post.moodColor }} />
            <span style={{ fontSize: 12, color: "var(--text2)", textTransform: "capitalize" }}>{post.mood}</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>{post.views?.toLocaleString()} views</span>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <button onClick={() => setSummaryOpen(!summaryOpen)} className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: 13, gap: 8 }}>
          <span>✨</span> {summaryOpen ? "Hide" : "Show"} AI Summary
        </button>
        {summaryOpen && (
          <div style={{
            marginTop: 12, padding: "16px 20px", borderRadius: "var(--r)",
            background: "linear-gradient(135deg,rgba(124,111,205,0.1),rgba(167,139,250,0.05))",
            border: "1px solid rgba(124,111,205,0.25)", animation: "fadeUp .3s ease"
          }}>
            <div style={{ fontSize: 11, color: "var(--accent3)", fontWeight: 700, letterSpacing: ".08em", marginBottom: 8 }}>AI SUMMARY</div>
            <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>{Backend.generateSummary(post.content)}</p>
          </div>
        )}
      </div>

      <div style={{ fontSize: 17, lineHeight: 1.85, color: "var(--text)", fontFamily: "var(--ff-display)", fontWeight: 400, marginBottom: 40 }}>
        {post.content.split("\n\n").map((para, i) => (
          para.trim() ? <p key={i} style={{ marginBottom: 24 }} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} /> : null
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 36, paddingBottom: 36, borderBottom: "1px solid var(--border)" }}>
        {post.tags?.map(t => <span key={t} className="tag">#{t}</span>)}
      </div>

      <div style={{ marginBottom: 48 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)", marginBottom: 16, letterSpacing: ".05em", textTransform: "uppercase" }}>How did this story make you feel?</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {REACTIONS.map(r => (
            <button key={r.key} onClick={() => handleReact(r.key)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "12px 18px", borderRadius: "var(--r)", cursor: "pointer", transition: "all .2s",
              background: reacted[r.key] ? `rgba(124,111,205,0.2)` : "var(--surface)",
              border: reacted[r.key] ? "1px solid rgba(124,111,205,0.4)" : "1px solid var(--border)",
              transform: reacted[r.key] ? "scale(1.05)" : "scale(1)"
            }}>
              <span style={{ fontSize: 24 }}>{r.emoji}</span>
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: reacted[r.key] ? "var(--accent3)" : "var(--text)" }}>{post.reactions[r.key]}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16, height: 4, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
          {REACTIONS.map(r => (
            <div key={r.key} style={{ display: "inline-block", height: "100%", width: `${totalR ? (post.reactions[r.key]/totalR)*100 : 20}%`, background: r.key==="Inspired"?"#f59e0b":r.key==="Curious"?"#3b82f6":r.key==="Emotional"?"#ec4899":r.key==="Helpful"?"#10b981":"#7c6fcd", transition: "width .5s" }} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48, padding: "12px 18px", borderRadius: "var(--r)", background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${readProgress}%`, background: `linear-gradient(90deg,${post.moodColor},var(--accent2))`, transition: "width .2s" }} />
        </div>
        <span style={{ fontSize: 12, color: "var(--text2)", fontFamily: "var(--ff-mono)", minWidth: 36 }}>{readProgress}%</span>
      </div>

      <div>
        <h3 style={{ fontFamily: "var(--ff-display)", fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          Voices ({comments.length})
        </h3>

        <div style={{ marginBottom: 36, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: user ? "linear-gradient(135deg,var(--accent),var(--accent2))" : "var(--surface2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0
          }}>{user?.avatar || "?"}</div>
          <div style={{ flex: 1 }}>
            <textarea value={commentText} onChange={e=>setCommentText(e.target.value)}
              placeholder={user ? "Share your thoughts on this story..." : "Login to leave a comment..."}
              rows={3} disabled={!user}
              style={{ width: "100%", resize: "vertical", minHeight: 80 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={handleComment} disabled={!user || !commentText.trim()} className="btn btn-primary" style={{ padding: "8px 18px", fontSize: 13 }}>Post Comment</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {comments.map(c => (
            <div key={c.id} style={{ animation: "fadeUp .3s ease" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--pink))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0 }}>{c.author?.avatar || "?"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{c.author?.name || "Unknown"}</span>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, marginBottom: 8 }}>{c.content}</p>
                  <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} style={{ background: "none", fontSize: 12, color: "var(--text3)", padding: 0 }}>↩ Reply</button>

                  {replyTo === c.id && user && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      <input value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Write a reply..." style={{ flex: 1, fontSize: 13, padding: "7px 12px" }} />
                      <button onClick={() => handleReply(c.id)} className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 13 }}>Reply</button>
                    </div>
                  )}

                  {c.replies && c.replies.length > 0 && (
                    <div style={{ marginTop: 12, marginLeft: 20, borderLeft: "2px solid var(--border)", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      {c.replies.map(r => (
                        <div key={r._id || r.id} style={{ display: "flex", gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>{r.author?.avatar || "?"}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{r.author?.name || "User"}</div>
                            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>{r.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── WRITE PAGE ───────────────────────────────────────────────────────────────

function WritePage({ token, setPage, editPostId = null }) {
  const GRADIENTS = [
    "135deg, #667eea 0%, #764ba2 100%",
    "135deg, #f093fb 0%, #f5576c 100%",
    "135deg, #4facfe 0%, #00f2fe 100%",
    "135deg, #43e97b 0%, #38f9d7 100%",
    "135deg, #f5af19 0%, #f12711 100%",
    "135deg, #a18cd1 0%, #fbc2eb 100%",
    "135deg, #fbc2eb 0%, #a6c1ee 100%",
    "135deg, #30cfd0 0%, #330867 100%",
  ];

  const [form, setForm] = useState({
    title: "", content: "", excerpt: "", tags: "", category: "Technology", coverGradient: GRADIENTS[0], anonymous: false, draft: false,
  });
  
  useEffect(() => {
    if (editPostId) {
      Backend.getPost(editPostId).then(existing => {
        setForm({
          title: existing.title || "", content: existing.content || "", excerpt: existing.excerpt || "",
          tags: existing.tags?.join(", ") || "", category: existing.category || "Technology",
          coverGradient: existing.coverGradient || GRADIENTS[0], anonymous: existing.anonymous || false, draft: false,
        });
      });
    }
  }, [editPostId]);

  const [mood, setMood] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (form.content.length > 50) {
      const { mood: m, color, gradient } = Backend.detectMood(form.content);
      setMood({ mood: m, color, gradient });
      form.coverGradient === GRADIENTS[0] && setForm(prev => ({ ...prev, coverGradient: gradient }));
    }
  }, [form.content]);

  useEffect(() => {
    if (form.title.length > 10) {
      const sug = ["Try adding a personal story", "Consider adding a contrarian view", "What's the key takeaway for readers?"];
      setSuggestions(sug);
    } else setSuggestions([]);
  }, [form.title]);

  const handleSave = async (draft = false) => {
    setSaving(true);
    try {
      const data = {
        title: form.title, content: form.content,
        excerpt: form.excerpt || form.content.slice(0, 120) + "...",
        tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean),
        category: form.category, coverGradient: form.coverGradient,
        anonymous: form.anonymous, draft,
        mood: mood?.mood || "reflective", moodColor: mood?.color || "#6366f1",
        readTime: Math.max(1, Math.ceil(form.content.split(" ").length / 200)),
        published: !draft,
      };
      if (editPostId) await Backend.updatePost(token, editPostId, data);
      else await Backend.createPost(token, data);
      setSaved(true);
      setTimeout(() => setPage("feed"), 1200);
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const categories = ["Technology","Lifestyle","Mental Health","Philosophy","Creative","Social","Science","Culture"];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, animation: "fadeUp .4s ease" }}>
        <div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 34, fontWeight: 700, marginBottom: 4 }}>
            {editPostId ? "Edit your story" : "Write your story"}
          </h1>
          <p style={{ color: "var(--text2)", fontSize: 15 }}>Every word you write creates an echo in someone's world.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setPage("feed")} className="btn btn-ghost">Cancel</button>
          <button onClick={() => handleSave(true)} className="btn btn-ghost" style={{ fontSize: 13 }}>💾 Save Draft</button>
          <button onClick={() => handleSave(false)} className="btn btn-primary" disabled={saving || !form.title || !form.content} style={{ fontSize: 13 }}>
            {saved ? "✓ Published!" : saving ? "Publishing..." : "✦ Publish Story"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {mood && (
            <div style={{ display: "flex", align: "center", gap: 12, padding: "12px 16px", borderRadius: "var(--r)", background: `linear-gradient(135deg,${mood.color}15,${mood.color}05)`, border: `1px solid ${mood.color}30`, animation: "fadeIn .3s ease" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: mood.color, flexShrink: 0, marginTop: 6 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: mood.color, marginBottom: 2 }}>AI MOOD DETECTION</div>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>Your story feels <strong style={{ color: mood.color }}>{mood.mood}</strong> — cover gradient updated to match</div>
              </div>
            </div>
          )}

          <div style={{ height: 120, borderRadius: "var(--r2)", background: `linear-gradient(${form.coverGradient})`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 500 }}>Cover Preview</span>
            </div>
          </div>

          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
            placeholder="Your story title..." style={{ fontSize: 22, fontFamily: "var(--ff-display)", fontWeight: 700, padding: "14px 18px", width: "100%" }} />

          <textarea value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})}
            placeholder="Short description (shown in feed cards)..." rows={2}
            style={{ width: "100%", resize: "none", fontSize: 14 }} />

          <textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})}
            placeholder="Tell your story... Write freely. Let the words flow. Every sentence you write echoes somewhere." rows={18}
            style={{ width: "100%", resize: "vertical", fontSize: 15, lineHeight: 1.8, fontFamily: "var(--ff-display)" }} />

          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--text3)" }}>
            <span>{form.content.split(" ").filter(Boolean).length} words</span>
            <span>{Math.max(1, Math.ceil(form.content.split(" ").length / 200))} min read</span>
            <span>{form.content.length} characters</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {suggestions.length > 0 && (
            <div className="glass" style={{ padding: 18, borderColor: "rgba(124,111,205,0.3)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent3)", letterSpacing: ".08em", marginBottom: 12 }}>✨ AI SUGGESTIONS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {suggestions.map((s,i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text2)", padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", lineHeight: 1.4 }}>💬 {s}</div>
                ))}
              </div>
            </div>
          )}

          <div className="glass" style={{ padding: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: ".08em", display: "block", marginBottom: 10 }}>CATEGORY</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{ width: "100%" }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="glass" style={{ padding: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: ".08em", display: "block", marginBottom: 10 }}>TAGS (comma separated)</label>
            <input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="tech, life, thoughts..." style={{ width: "100%", fontSize: 13 }} />
          </div>

          <div className="glass" style={{ padding: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: ".08em", display: "block", marginBottom: 10 }}>COVER STYLE</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
              {GRADIENTS.map(g => (
                <button key={g} onClick={() => setForm({...form,coverGradient:g})} style={{
                  height: 36, borderRadius: 8, background: `linear-gradient(${g})`,
                  border: form.coverGradient === g ? "2px solid white" : "2px solid transparent",
                  transition: "all .2s", transform: form.coverGradient === g ? "scale(1.1)" : "scale(1)"
                }} />
              ))}
            </div>
          </div>

          <div className="glass" style={{ padding: 18 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>🎭 Anonymous Mode</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>Hide your identity</div>
              </div>
              <div onClick={() => setForm({...form, anonymous:!form.anonymous})} style={{
                width: 44, height: 24, borderRadius: 12,
                background: form.anonymous ? "var(--accent)" : "var(--surface2)",
                border: "1px solid var(--border2)", position: "relative", transition: "all .2s", cursor: "pointer"
              }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: form.anonymous ? 22 : 2, transition: "left .2s" }} />
              </div>
            </label>
          </div>

          <button onClick={() => handleSave(false)} disabled={saving || !form.title || !form.content} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 12, fontSize: 14 }}>
            {saved ? "✓ Published!" : "✦ Publish Story"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TRENDING PAGE ────────────────────────────────────────────────────────────

function TrendingPage({ setPage, setActivePost }) {
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    Backend.getPosts().then(res => {
      setPosts(res.sort((a,b) => Object.values(b.reactions || {}).reduce((x,y)=>x+y,0) - Object.values(a.reactions || {}).reduce((x,y)=>x+y,0)));
    });
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 24px 60px" }}>
      <div style={{ marginBottom: 40, animation: "fadeUp .4s ease" }}>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 42, fontWeight: 700, marginBottom: 10 }}>
          🔥 Trending Stories
        </h1>
        <p style={{ color: "var(--text2)", fontSize: 16 }}>The most resonant stories in the EchoVerse community right now.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
        {posts.slice(0,3).map((p, i) => {
          const totalR = Object.values(p.reactions || {}).reduce((a,b)=>a+b,0);
          return (
            <button key={p.id} onClick={() => { setActivePost(p.id); setPage("post"); }} style={{
              borderRadius: "var(--r2)", overflow: "hidden", position: "relative", height: 280,
              background: `linear-gradient(${p.coverGradient})`, border: "none", cursor: "pointer",
              transition: "transform .2s", textAlign: "left", animation: `fadeUp .5s ease ${i*.1}s both`
            }}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 20%, rgba(0,0,0,.8))" }} />
              <div style={{ position: "absolute", top: 16, left: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "white" }}>{i+1}</div>
              <div style={{ position: "absolute", bottom: 20, left: 18, right: 18 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{p.mood}</div>
                <div style={{ fontFamily: "var(--ff-display)", fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1.3, marginBottom: 8 }}>{p.title}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,.7)" }}>
                  <span>🔥 {totalR} reactions</span>
                  <span>👁 {p.views?.toLocaleString()}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="glass" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 20 }}>All Trending Stories</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {posts.map((p, i) => {
            const totalR = Object.values(p.reactions || {}).reduce((a,b)=>a+b,0);
            return (
              <button key={p.id} onClick={() => { setActivePost(p.id); setPage("post"); }} style={{
                background: "none", border: "none", borderBottom: i < posts.length-1 ? "1px solid var(--border)" : "none",
                padding: "14px 0", display: "flex", gap: 16, alignItems: "center", cursor: "pointer", textAlign: "left",
                transition: "background .15s", borderRadius: 6
              }}
              onMouseEnter={e=>e.currentTarget.style.background="var(--surface)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
                <span style={{ fontFamily: "var(--ff-mono)", fontSize: 16, fontWeight: 700, color: i<3?"var(--accent3)":"var(--text3)", minWidth: 28 }}>#{i+1}</span>
                <div style={{ width: 4, height: 36, borderRadius: 2, background: `linear-gradient(${p.coverGradient})`, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>by {p.author?.name} · {p.category}</div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text3)" }}>
                  <span>🔥 {totalR}</span>
                  <span>👁 {p.views?.toLocaleString()}</span>
                  <span>🔖 {p.bookmarks}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CATEGORIES PAGE ──────────────────────────────────────────────────────────

function CategoriesPage({ setPage, setFilter }) {
  const [posts, setPosts] = useState([]);
  useEffect(() => { Backend.getPosts().then(setPosts); }, []);

  const cats = [
    { name: "Technology", icon: "💻", gradient: "135deg,#4facfe,#00f2fe", desc: "Code, startups, AI, and the future" },
    { name: "Lifestyle", icon: "🌿", gradient: "135deg,#43e97b,#38f9d7", desc: "Habits, wellness, and daily rituals" },
    { name: "Mental Health", icon: "🧠", gradient: "135deg,#a18cd1,#fbc2eb", desc: "Honest conversations about the mind" },
    { name: "Philosophy", icon: "🌀", gradient: "135deg,#667eea,#764ba2", desc: "Questions without easy answers" },
    { name: "Creative", icon: "🎨", gradient: "135deg,#f5af19,#f12711", desc: "Art, writing, music, and expression" },
    { name: "Social", icon: "🌍", gradient: "135deg,#f093fb,#f5576c", desc: "Culture, society, and human connection" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 60px" }}>
      <div style={{ marginBottom: 48, animation: "fadeUp .4s ease" }}>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 42, fontWeight: 700, marginBottom: 10 }}>Explore Categories</h1>
        <p style={{ color: "var(--text2)", fontSize: 16 }}>Find stories that speak to what matters to you most.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {cats.map((c,i) => {
          const count = posts.filter(p => p.category === c.name).length;
          return (
            <button key={c.name} onClick={() => { setFilter({category:c.name}); setPage("feed"); }} style={{
              borderRadius: "var(--r2)", overflow: "hidden", position: "relative",
              height: 200, background: `linear-gradient(${c.gradient})`,
              border: "none", cursor: "pointer", textAlign: "left",
              transition: "transform .2s, box-shadow .2s", animation: `fadeUp .5s ease ${i*.08}s both`
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.03)";e.currentTarget.style.boxShadow="0 20px 50px rgba(0,0,0,.5)"}}
            onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none"}}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 30%,rgba(0,0,0,.7))" }} />
              <div style={{ position: "absolute", top: 20, left: 20, fontSize: 32 }}>{c.icon}</div>
              <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
                <div style={{ fontFamily: "var(--ff-display)", fontSize: 20, fontWeight: 700, color: "white", marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginBottom: 6 }}>{c.desc}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>{count} stories</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────

function ProfilePage({ user, setPage, setActivePost }) {
  const [myPosts, setMyPosts] = useState([]);
  
  useEffect(() => {
    Backend.getPosts({ authorId: user.id }).then(setMyPosts);
  }, [user.id]);

  const totalViews = myPosts.reduce((a,p) => a+(p.views||0), 0);
  const totalReactions = myPosts.reduce((a,p) => a+Object.values(p.reactions||{}).reduce((x,y)=>x+y,0), 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 60px" }}>
      <div style={{
        height: 200, borderRadius: "var(--r2)", marginBottom: "-60px",
        background: "linear-gradient(135deg,#667eea,#764ba2,#f093fb)",
        position: "relative"
      }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.3)", borderRadius: "var(--r2)" }} />
      </div>
      <div style={{ position: "relative", padding: "0 32px 32px", background: "var(--bg3)", borderRadius: "0 0 var(--r2) var(--r2)", border: "1px solid var(--border)", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 20, paddingTop: 16 }}>
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: "linear-gradient(135deg,var(--accent),var(--accent2))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, fontWeight: 700, color: "white",
            border: "4px solid var(--bg3)", flexShrink: 0
          }}>{user.avatar}</div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{user.name}</h1>
            <div style={{ color: "var(--text3)", fontSize: 14, marginBottom: 8 }}>@{user.username}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {user.badges?.map(b => <span key={b} className="badge">{b}</span>)}
            </div>
          </div>
          <button onClick={() => setPage("settings")} className="btn btn-ghost" style={{ fontSize: 13 }}>Edit Profile</button>
        </div>
        {user.bio && <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.6, maxWidth: 500, marginBottom: 16 }}>{user.bio}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16 }}>
          {[
            ["✍", myPosts.length, "Stories"],
            ["👁", totalViews.toLocaleString(), "Total Views"],
            ["🔥", totalReactions, "Reactions"],
            ["👥", user.followers || 0, "Followers"],
            ["📖", user.following || 0, "Following"],
          ].map(([icon, val, label]) => (
            <div key={label} style={{ textAlign: "center", padding: "12px 8px", background: "var(--surface)", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--ff-mono)" }}>{val}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <h3 style={{ fontFamily: "var(--ff-display)", fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Your Stories</h3>
      {myPosts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✍</div>
          <p>You haven't written any stories yet</p>
          <button onClick={() => setPage("write")} className="btn btn-primary" style={{ marginTop: 16, padding: "10px 22px" }}>Write your first story →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {myPosts.map((p,i) => <PostCard key={p.id} post={p} delay={i} onClick={() => { setActivePost(p.id); setPage("post"); }} />)}
        </div>
      )}
    </div>
  );
}

// ─── MY POSTS PAGE ────────────────────────────────────────────────────────────

function MyPostsPage({ user, token, setPage, setActivePost }) {
  const [posts, setPosts] = useState([]);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    Backend.getPosts({ authorId: user.id }).then(setPosts);
  }, [user.id, editId]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this story permanently?")) return;
    await Backend.deletePost(token, id);
    Backend.getPosts({ authorId: user.id }).then(setPosts);
  };

  if (editId) return <WritePage token={token} setPage={() => setEditId(null)} editPostId={editId} />;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 36, fontWeight: 700 }}>My Stories</h1>
        <button onClick={() => setPage("write")} className="btn btn-primary">✍ Write New</button>
      </div>
      {posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text3)" }}>
          <p style={{ fontSize: 16 }}>No stories yet.</p>
          <button onClick={() => setPage("write")} className="btn btn-primary" style={{ marginTop: 16 }}>Write your first</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.map((p,i) => (
            <div key={p.id} className="glass2" style={{ padding: "18px 20px", display: "flex", gap: 16, alignItems: "center", animation: `fadeUp .4s ease ${i*.06}s both` }}>
              <div style={{ width: 60, height: 50, borderRadius: 10, background: `linear-gradient(${p.coverGradient})`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{new Date(p.createdAt).toLocaleDateString()} · {p.readTime} min · {p.views || 0} views · {Object.values(p.reactions||{}).reduce((a,b)=>a+b,0)} reactions</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => { setActivePost(p.id); setPage("post"); }} className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }}>View</button>
                <button onClick={() => setEditId(p.id)} className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }}>Edit</button>
                <button onClick={() => handleDelete(p.id)} className="btn btn-danger" style={{ padding: "6px 14px", fontSize: 12 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────

function SettingsPage({ user, token, setUser }) {
  const [form, setForm] = useState({ name: user.name, bio: user.bio || "", interests: user.interests?.join(", ") || "" });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      const data = { name: form.name, bio: form.bio, interests: form.interests.split(",").map(s=>s.trim()).filter(Boolean) };
      await Backend.updateUser(token, data);
      const updatedUser = await Backend.getUser(token);
      setUser(updatedUser);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch(e) { alert(e.message); }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px 60px", animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 34, fontWeight: 700, marginBottom: 8 }}>Settings</h1>
      <p style={{ color: "var(--text2)", marginBottom: 36 }}>Manage your EchoVerse identity</p>

      <div className="glass" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", align: "center", gap: 16 }}>
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "white" }}>{user.avatar}</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>@{user.username}</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Member since {user.joined}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {user.badges?.map(b => <span key={b} className="badge" style={{ fontSize: 10 }}>{b}</span>)}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          {[["DISPLAY NAME", "name", "text", "Your full name"], ["BIO", "bio", "textarea", "Tell your story..."], ["INTERESTS (comma-separated)", "interests", "text", "technology, philosophy, poetry..."]].map(([label, key, type, ph]) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>{label}</label>
              {type === "textarea" ? (
                <textarea value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph} rows={3} style={{ width: "100%", resize: "none", fontSize: 14 }} />
              ) : (
                <input value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph} style={{ width: "100%", fontSize: 14 }} />
              )}
            </div>
          ))}
        </div>

        <button onClick={handleSave} className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "10px 24px" }}>
          {saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── BOOKMARKS PAGE ───────────────────────────────────────────────────────────

function BookmarksPage({ setPage, setActivePost }) {
  const [posts, setPosts] = useState([]);
  useEffect(() => { Backend.getPosts().then(res => setPosts(res.sort((a,b)=>b.bookmarks-a.bookmarks).slice(0,4))); }, []);
  
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 60px" }}>
      <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Bookmarks</h1>
      <p style={{ color: "var(--text2)", marginBottom: 32 }}>Stories you've saved for later</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {posts.map((p,i) => <PostCard key={p.id} post={p} delay={i} onClick={() => { setActivePost(p.id); setPage("post"); }} />)}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function EchoVerse() {
  const [page, setPage] = useState("feed");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activePost, setActivePost] = useState(null);
  const [filter, setFilter] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("ev_token");
    if (savedToken) { 
      Backend.getUser(savedToken).then(u => {
        if (u) { setUser(u); setToken(savedToken); }
      });
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page, activePost]);

  const onAuth = (u, t) => { setUser(u); setToken(t); setPage("feed"); };
  const onLogout = () => { setUser(null); setToken(null); localStorage.removeItem("ev_token"); setPage("feed"); };

  const ctx = { user, token, setUser, filter, setFilter };

  const renderPage = () => {
    switch(page) {
      case "feed": return <FeedPage setPage={setPage} setActivePost={setActivePost} />;
      case "post": return activePost ? <PostPage postId={activePost} setPage={setPage} user={user} token={token} /> : null;
      case "write": return user ? <WritePage token={token} setPage={setPage} /> : (setPage("login"), null);
      case "login": return <AuthPage mode="login" setPage={setPage} onAuth={onAuth} />;
      case "register": return <AuthPage mode="register" setPage={setPage} onAuth={onAuth} />;
      case "trending": return <TrendingPage setPage={setPage} setActivePost={setActivePost} />;
      case "categories": return <CategoriesPage setPage={setPage} setFilter={setFilter} />;
      case "profile": return user ? <ProfilePage user={user} setPage={setPage} setActivePost={setActivePost} /> : null;
      case "myposts": return user ? <MyPostsPage user={user} token={token} setPage={setPage} setActivePost={setActivePost} /> : null;
      case "settings": return user ? <SettingsPage user={user} token={token} setUser={setUser} /> : null;
      case "bookmarks": return <BookmarksPage setPage={setPage} setActivePost={setActivePost} />;
      default: return <FeedPage setPage={setPage} setActivePost={setActivePost} />;
    }
  };

  return (
    <AppCtx.Provider value={ctx}>
      <style>{CSS}</style>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,111,205,0.12) 0%,transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(244,114,182,0.1) 0%,transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", top: "50%", right: "30%", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)", filter: "blur(60px)" }} />
        </div>

        <Particles />

        <TopNav page={page} setPage={setPage} user={user} onLogout={onLogout} onWriteClick={() => setPage("write")} />

        <div ref={scrollRef} className="scroll" style={{ flex: 1, position: "relative", zIndex: 1, marginTop: 0 }}>
          {renderPage()}
        </div>
      </div>
    </AppCtx.Provider>
  );
}