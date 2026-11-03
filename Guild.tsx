"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, ScrollText, Dices, Image as ImageIcon, Users, Settings, LogOut, Send, Plus, Shield, Upload, Swords, MessageSquare, Copy, Crown } from "lucide-react";

type Campaign={id:string;name:string;invite_code:string};
type Member={user_id:string;role:"dm"|"player";display_name:string};
type Channel={id:string;name:string};
type Message={id:string;body:string;created_at:string;user_id:string;image_url:string|null;display_name?:string};
type Character={id:string;name:string;ancestry:string;class_name:string;level:number;hp:number;ac:number;owner_id:string;details:any};
const starterChannels=["general","roleplay","dice-rolls","party-loot"];

export function Guild({session}:{session:any}){
 const user=session.user;
 const [campaigns,setCampaigns]=useState<Campaign[]>([]),[campaign,setCampaign]=useState<Campaign|null>(null);
 const [members,setMembers]=useState<Member[]>([]),[channels,setChannels]=useState<Channel[]>([]),[channel,setChannel]=useState<Channel|null>(null);
 const [messages,setMessages]=useState<Message[]>([]),[characters,setCharacters]=useState<Character[]>([]);
 const [body,setBody]=useState(""),[role,setRole]=useState("player"),[display,setDisplay]=useState(user.email?.split("@")[0]||"Adventurer");
 const [roll,setRoll]=useState("1d20"),[rollLog,setRollLog]=useState<string[]>([]);
 const [modal,setModal]=useState<"campaign"|"join"|"character"|"members"|"gallery"|null>(null);
 const [campaignName,setCampaignName]=useState("The Forgotten Realms"),[invite,setInvite]=useState(""),[status,setStatus]=useState("");
 const [charName,setCharName]=useState(""),[charClass,setCharClass]=useState("Fighter"),[charAncestry,setCharAncestry]=useState("Human"),[charLevel,setCharLevel]=useState(1),[charHp,setCharHp]=useState(10),[charAc,setCharAc]=useState(10);
 const [busy,setBusy]=useState(false);
 const myMembership=members.find(m=>m.user_id===user.id); const isDM=myMembership?.role==="dm";
 const myCharacters=characters.filter(c=>c.owner_id===user.id);
 useEffect(()=>{loadCampaigns();},[]);
 async function loadCampaigns(){
  const {data}=await supabase.from("memberships").select("campaigns(id,name,invite_code)").eq("user_id",user.id);
  const list=(data||[]).map((x:any)=>x.campaigns).filter(Boolean);setCampaigns(list);
  if(list.length&&!campaign) await chooseCampaign(list[0]);
 }
 async function chooseCampaign(c:Campaign){
  setCampaign(c);setStatus("");
  const [{data:m},{data:ch},{data:cs}]=await Promise.all([
   supabase.from("memberships").select("user_id,role,display_name").eq("campaign_id",c.id),
   supabase.from("channels").select("id,name").eq("campaign_id",c.id).order("created_at"),
   supabase.from("characters").select("*").eq("campaign_id",c.id).order("name")
  ]);
  setMembers(m||[]);setChannels(ch||[]);setCharacters(cs||[]);
  if(ch?.length){setChannel(ch[0]);await loadMessages(ch[0].id);}
 }
 async function loadMessages(id:string){
  const {data}=await supabase.from("messages").select("*").eq("channel_id",id).order("created_at",{ascending:true}).limit(100);
  const ids=[...new Set((data||[]).map((m:any)=>m.user_id))];
  const {data:profiles}=await supabase.from("memberships").select("user_id,display_name").eq("campaign_id",campaign?.id||"");
  const names=new Map((profiles||[]).map((p:any)=>[p.user_id,p.display_name]));
  setMessages((data||[]).map((m:any)=>({...m,display_name:names.get(m.user_id)||"Adventurer"})));
 }
 useEffect(()=>{
  if(!campaign||!channel)return;
  loadMessages(channel.id);
  const sub=supabase.channel("room-"+channel.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`channel_id=eq.${channel.id}`},async payload=>{
   const m=payload.new as Message;const name=members.find(x=>x.user_id===m.user_id)?.display_name||"Adventurer";
   setMessages(old=>old.some(x=>x.id===m.id)?old:[...old,{...m,display_name:name}]);
  }).subscribe();
  return ()=>{supabase.removeChannel(sub);};
 },[campaign?.id,channel?.id]);
 async function createCampaign(e:React.FormEvent){
  e.preventDefault();setBusy(true);
  const {data,error}=await supabase.rpc("create_campaign",{campaign_name:campaignName,member_name:display});
  setBusy(false);if(error){setStatus(error.message);return;}
  setModal(null);await loadCampaigns();if(data)await chooseCampaign(data);
 }
 async function joinCampaign(e:React.FormEvent){
  e.preventDefault();setBusy(true);const {data,error}=await supabase.rpc("join_campaign",{code:invite,member_name:display});
  setBusy(false);if(error){setStatus(error.message);return;}setModal(null);await loadCampaigns();if(data)await chooseCampaign(data);
 }
 async function sendMessage(e:React.FormEvent){
  e.preventDefault();if(!body.trim()||!channel||!campaign)return;
  const text=body.trim();setBody("");
  const {error}=await supabase.from("messages").insert({campaign_id:campaign.id,channel_id:channel.id,user_id:user.id,body:text});
  if(error)setStatus(error.message);
 }
 async function rollDice(e:React.FormEvent){
  e.preventDefault();const match=roll.trim().match(/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d+)?$/i);
  if(!match){setStatus("Use a roll such as 1d20+4 or 2d6.");return;}
  const count=Number(match[1]),sides=Number(match[2]),mod=Number(match[3]||0);
  if(count<1||count>30){setStatus("Roll between 1 and 30 dice.");return;}
  const rolls=Array.from({length:count},()=>Math.floor(Math.random()*sides)+1),total=rolls.reduce((a,b)=>a+b,0)+mod;
  const expression=`${roll} → [${rolls.join(", ")}]${mod?` ${mod>0?"+":""}${mod}`:""} = ${total}`;
  setRollLog(old=>[expression,...old].slice(0,12));
  if(campaign&&channel?.name==="dice-rolls")await supabase.from("messages").insert({campaign_id:campaign.id,channel_id:channel.id,user_id:user.id,body:`🎲 ${display} rolled ${expression}`});
 }
 async function addCharacter(e:React.FormEvent){
  e.preventDefault();if(!campaign)return;setBusy(true);
  const {error}=await supabase.from("characters").insert({campaign_id:campaign.id,owner_id:user.id,name:charName,ancestry:charAncestry,class_name:charClass,level:charLevel,hp:charHp,ac:charAc,details:{}});
  setBusy(false);if(error){setStatus(error.message);return;}
  setModal(null);const {data}=await supabase.from("characters").select("*").eq("campaign_id",campaign.id).order("name");setCharacters(data||[]);
 }
 async function uploadImage(file?:File){
  if(!file||!campaign||!channel)return;
  if(!file.type.startsWith("image/")){setStatus("Please choose an image file.");return;}
  const path=`${campaign.id}/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  const {error}=await supabase.storage.from("campaign-images").upload(path,file,{upsert:false});
  if(error){setStatus(error.message);return;}
  const {data}=supabase.storage.from("campaign-images").getPublicUrl(path);
  await supabase.from("messages").insert({campaign_id:campaign.id,channel_id:channel.id,user_id:user.id,body:"Shared an image",image_url:data.publicUrl});
 }
 async function signOut(){await supabase.auth.signOut();}
 async function promote(member:Member){
  if(!isDM||member.user_id===user.id)return;
  const next=member.role==="dm"?"player":"dm";
  const {error}=await supabase.from("memberships").update({role:next}).eq("campaign_id",campaign!.id).eq("user_id",member.user_id);
  if(error){setStatus(error.message);return;}setMembers(old=>old.map(m=>m.user_id===member.user_id?{...m,role:next}:m));
 }
 const gallery=messages.filter(m=>m.image_url);
 return <main className="app-shell">
  <header className="topbar"><div className="brand"><div className="mini-crest"><BookOpen size={20}/></div><span>THE GUILDHALL</span></div><div className="top-actions"><span className="user-chip">{display}</span><button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={17}/></button></div></header>
  <div className="layout">
   <aside className="sidebar">
    <div className="side-label">YOUR CAMPAIGNS</div>{campaigns.map(c=><button key={c.id} className={`campaign-choice ${campaign?.id===c.id?"selected":""}`} onClick={()=>chooseCampaign(c)}><Shield size={15}/>{c.name}</button>)}
    <div className="side-buttons"><button onClick={()=>setModal("campaign")}><Plus size={14}/> New campaign</button><button onClick={()=>setModal("join")}>Join with code</button></div>
    {campaign&&<><div className="side-label spaced">THE CAMPAIGN</div>{channels.map(ch=><button key={ch.id} className={`nav-item ${channel?.id===ch.id?"chosen":""}`} onClick={()=>setChannel(ch)}><span>#</span>{ch.name}</button>)}
    <div className="side-label spaced">KEEPING RECORDS</div><button className="nav-item" onClick={()=>setModal("character")}><ScrollText size={15}/> Character sheets</button><button className="nav-item" onClick={()=>setModal("gallery")}><ImageIcon size={15}/> Image gallery</button><button className="nav-item" onClick={()=>setModal("members")}><Users size={15}/> Party & roles</button>
    <div className="invite-box"><span>INVITE CODE</span><strong>{campaign.invite_code}</strong><button onClick={()=>navigator.clipboard.writeText(campaign.invite_code)}><Copy size={13}/> Copy code</button></div></>}
    <div className="profile-foot"><div className="avatar">{display.slice(0,1).toUpperCase()}</div><div><b>{display}</b><small>{isDM?"Dungeon Master":"Player"}</small></div></div>
   </aside>
   <section className="main-panel">
    {!campaign?<div className="empty-state"><div className="crest large"><BookOpen/></div><p className="eyebrow">THE TABLE AWAITS</p><h1>Welcome to the Guildhall</h1><p>Create a campaign or join one with an invite code to begin.</p><div className="row"><button className="primary" onClick={()=>setModal("campaign")}>Create campaign</button><button className="secondary" onClick={()=>setModal("join")}>Join campaign</button></div></div>:
    <><div className="campaign-heading"><div><p className="eyebrow">{campaign.name}</p><h1>{channel?.name||"Campaign"}</h1></div><div className="online-count"><span/> {members.length} party members</div></div>
    {status&&<div className="status" onClick={()=>setStatus("")}>{status} <b>×</b></div>}
    <div className="chat-feed">{messages.map(m=><article className="message" key={m.id}><div className="message-avatar">{(m.display_name||"?").slice(0,1).toUpperCase()}</div><div className="message-content"><div className="message-meta"><b>{m.display_name||"Adventurer"}</b><time>{new Date(m.created_at).toLocaleString()}</time></div><p>{m.body}</p>{m.image_url&&<a href={m.image_url} target="_blank"><img className="shared-image" src={m.image_url} alt="Shared campaign image"/></a>}</div></article>)}
    {!messages.length&&<div className="empty-chat">No messages yet. Inscribe the first entry in this chronicle.</div>}</div>
    <form className="composer" onSubmit={sendMessage}><label className="upload-button" title="Share image"><Upload size={18}/><input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0])}/></label><input value={body} onChange={e=>setBody(e.target.value)} placeholder={`Send a message to #${channel?.name||"campaign"}…`}/><button className="send-btn" disabled={!body.trim()}><Send size={17}/></button></form>
    <section className="dice-panel"><div className="dice-title"><Dices size={18}/><b>Dice tray</b><span>PUBLIC ROLLS</span></div><form onSubmit={rollDice}><input value={roll} onChange={e=>setRoll(e.target.value)} aria-label="Dice expression"/><button className="primary">Roll</button></form><div className="roll-history">{rollLog.map((r,i)=><div key={i}>{r}</div>)}</div></section>
    </>}
   </section>
   <aside className="rightbar"><div className="right-heading"><Users size={16}/> THE PARTY</div>{members.map(m=><div className="member" key={m.user_id}><div className="member-avatar">{m.display_name.slice(0,1).toUpperCase()}</div><div><b>{m.display_name}</b><small>{m.role==="dm"?"Dungeon Master":"Player"}</small></div>{m.role==="dm"?<Crown size={14} className="gold"/>:null}</div>)}
    <div className="right-heading records"><ScrollText size={16}/> PARTY CHARACTERS</div>{characters.map(c=><div className="character-mini" key={c.id}><b>{c.name}</b><small>Level {c.level} {c.ancestry} {c.class_name}</small><span>HP {c.hp} · AC {c.ac}</span></div>)}{!characters.length&&<p className="muted small">No character sheets yet.</p>}
    <div className="right-note"><Swords size={18}/><b>Fortune favours the bold.</b><small>Keep your dice close and your party closer.</small></div>
   </aside>
  </div>
  {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal"><button className="modal-close" onClick={()=>setModal(null)}>×</button>
   {modal==="campaign"&&<><p className="eyebrow">A NEW CHRONICLE</p><h2>Create a campaign</h2><form onSubmit={createCampaign}><label>Your display name<input value={display} onChange={e=>setDisplay(e.target.value)} required/></label><label>Campaign name<input value={campaignName} onChange={e=>setCampaignName(e.target.value)} required/></label><button className="primary full" disabled={busy}>Create campaign</button></form></>}
   {modal==="join"&&<><p className="eyebrow">ANSWER THE SUMMONS</p><h2>Join a campaign</h2><form onSubmit={joinCampaign}><label>Your display name<input value={display} onChange={e=>setDisplay(e.target.value)} required/></label><label>Invite code<input value={invite} onChange={e=>setInvite(e.target.value.toUpperCase())} required placeholder="ABCD1234"/></label><button className="primary full" disabled={busy}>Join the party</button></form></>}
   {modal==="character"&&<><p className="eyebrow">YOUR ADVENTURER</p><h2>Character sheets</h2><div className="character-list">{myCharacters.map(c=><div className="character-card" key={c.id}><b>{c.name}</b><span>Level {c.level} {c.ancestry} {c.class_name}</span><small>HP {c.hp} · AC {c.ac}</small></div>)}</div><form onSubmit={addCharacter}><label>Character name<input value={charName} onChange={e=>setCharName(e.target.value)} required/></label><div className="two-col"><label>Ancestry<input value={charAncestry} onChange={e=>setCharAncestry(e.target.value)}/></label><label>Class<input value={charClass} onChange={e=>setCharClass(e.target.value)}/></label></div><div className="three-col"><label>Level<input type="number" min="1" max="20" value={charLevel} onChange={e=>setCharLevel(+e.target.value)}/></label><label>HP<input type="number" min="1" value={charHp} onChange={e=>setCharHp(+e.target.value)}/></label><label>AC<input type="number" min="1" value={charAc} onChange={e=>setCharAc(+e.target.value)}/></label></div><button className="primary full" disabled={busy}>Save character</button></form></>}
   {modal==="members"&&<><p className="eyebrow">THE COMPANY</p><h2>Party & permissions</h2><p className="muted">Dungeon Masters can promote or demote members. The campaign creator starts as DM.</p>{members.map(m=><div className="role-row" key={m.user_id}><span>{m.display_name}</span><span className="role-pill">{m.role==="dm"?"Dungeon Master":"Player"}</span>{isDM&&m.user_id!==user.id&&<button className="text-button" onClick={()=>promote(m)}>Change role</button>}</div>)}</>}
   {modal==="gallery"&&<><p className="eyebrow">VISUAL CHRONICLE</p><h2>Campaign gallery</h2><div className="gallery-grid">{gallery.map(m=><a key={m.id} href={m.image_url!} target="_blank"><img src={m.image_url!} alt="Campaign upload"/></a>)}</div>{!gallery.length&&<p className="muted">Images shared in campaign chat will appear here.</p>}</>}
  </div></div>}
 </main>
}
