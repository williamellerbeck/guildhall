"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Auth } from "@/components/Auth";
import { Guild } from "@/components/Guild";
export default function Home() {
  const [session,setSession] = useState<any>(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  if(loading) return <main className="loading">Lighting the lanterns…</main>;
  return session ? <Guild session={session}/> : <Auth/>;
}
