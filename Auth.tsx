"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, ScrollText } from "lucide-react";
export function Auth(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [mode,setMode]=useState<"in"|"up">("in"); const [busy,setBusy]=useState(false); const [note,setNote]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setNote("");
  const result=mode==="in"?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
  setBusy(false);setNote(result.error?.message || (mode==="up"?"Check your email if confirmation is enabled.":"Welcome back, adventurer."));
 }
 return <main className="auth-page"><div className="auth-card"><div className="crest"><BookOpen size={30}/></div><p className="eyebrow">A PRIVATE TABLETOP CAMPAIGN SPACE</p><h1>The Guildhall</h1><p className="muted">Gather your party. Keep your chronicles.</p>
 <div className="tabs"><button className={mode==="in"?"active":""} onClick={()=>setMode("in")}>Sign in</button><button className={mode==="up"?"active":""} onClick={()=>setMode("up")}>Create account</button></div>
 <form onSubmit={submit}><label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@realm.com"/></label><label>Password<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label><button className="primary full" disabled={busy}>{busy?"One moment…":mode==="in"?"Enter the Guildhall":"Create account"}</button></form>
 {note&&<p className="notice">{note}</p>}<p className="fine">Your campaign is private to invited members.</p></div></main>
}
