import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from './App';
import type { Message } from './types';
import { dateLabel, errorText, initials } from './utils';

export default function Chat() {
  const { me,data }=useApp();
  const mine=data.matches.filter(m=>m.candidate_id===me.id||m.recruiter_id===me.id);
  const [selected,setSelected]=useState<string | null>(null);
  const active=mine.find(m=>m.id===selected);
  const otherName=(id:string)=>{const p=data.profiles.find(p=>p.id===id);return me.role==='candidate'?p?.company||'Company':p?.name||'Candidate';};
  return <div className="chat-shell"><div className="chat-list" aria-label="Matches">{mine.length?mine.map(m=>{
    const name=otherName(me.role==='candidate'?m.recruiter_id:m.candidate_id);
    return <button className={'match-row row-button '+(active?.id===m.id?'selected':'')} key={m.id} onClick={()=>setSelected(m.id)} aria-pressed={active?.id===m.id}><div className="avatar">{initials(name)}</div><div><strong>{name}</strong><div className="muted">{data.jobs.find(j=>j.id===m.job_id)?.title}</div></div></button>;
  }):<div className="empty-note">No matches yet. Both people must show interest in the same role.</div>}</div>{active?<Conversation key={active.id} matchId={active.id} name={otherName(me.role==='candidate'?active.recruiter_id:active.candidate_id)} jobTitle={data.jobs.find(j=>j.id===active.job_id)?.title||''}/>:<div className="chat-panel"><div className="chat-empty">Select a match to open the chat.</div></div>}</div>;
}
function Conversation({matchId,name,jobTitle}:{matchId:string;name:string;jobTitle:string}){
  const {api,me}=useApp();
  const [messages,setMessages]=useState<Message[]>([]);
  const [text,setText]=useState('');
  const [loading,setLoading]=useState(true),[sending,setSending]=useState(false),[online,setOnline]=useState(false),[older,setOlder]=useState(false),[hasOlder,setHasOlder]=useState(false);
  const [error,setError]=useState('');
  const body=useRef<HTMLDivElement>(null);
  const messageId=useRef<string | null>(null),pending=useRef(false);
  const alive=useRef(true),nearBottom=useRef(true),historyLoaded=useRef(false);
  const merge=(next:Message[])=>setMessages(prev=>Array.from(new Map([...prev,...next].map(m=>[m.id,m])).values()).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)));
  useEffect(()=>{
    alive.current=true;
    const refresh=async()=>{
      try{
        const next=await api.messages(matchId);
        if(!alive.current)return;
        merge(next);setLoading(false);setError('');
        if(!historyLoaded.current){setHasOlder(next.length===100);historyLoaded.current=true;}
      }catch(e){if(alive.current){setError(errorText(e));setLoading(false);}}
    };
    void refresh();
    const stop=api.subscribe(matchId,()=>void refresh(),setOnline);
    // Keeps chat usable if Realtime is unavailable and catches messages missed on reconnect.
    const poll=setInterval(()=>{if(!document.hidden)void refresh();},8000);
    const focus=()=>void refresh();
    window.addEventListener('focus',focus);
    return()=>{alive.current=false;stop();clearInterval(poll);window.removeEventListener('focus',focus);};
  },[api,matchId]);
  useEffect(()=>{if(nearBottom.current&&body.current)body.current.scrollTop=body.current.scrollHeight;},[messages]);
  const send=async(e:FormEvent)=>{
    e.preventDefault();
    if(pending.current||!text.trim())return;
    pending.current=true;setSending(true);setError('');
    const value=text.trim(),id=messageId.current||crypto.randomUUID();messageId.current=id;
    try{
      await api.sendMessage(matchId,value,id);
      if(!alive.current)return;
      setText('');messageId.current=null;nearBottom.current=true;
      // Fetch uses the canonical server time and sender; no optimistic duplicate bubble.
      const next=await api.messages(matchId);if(alive.current)merge(next);
    }catch(e){if(alive.current)setError(errorText(e));}
    finally{pending.current=false;if(alive.current)setSending(false);}
  };
  const loadOlder=async()=>{
    if(!messages.length||older)return;
    setOlder(true);nearBottom.current=false;
    try{
      const first=messages[0];
      const next=await api.messages(matchId,first.created_at+'~'+first.id);
      if(alive.current){merge(next);setHasOlder(next.length===100);}
    }catch(e){if(alive.current)setError(errorText(e));}
    finally{if(alive.current)setOlder(false);}
  };
  return <div className="chat-panel"><div className="chat-head"><h4>{name}</h4><div className="eyebrow">{jobTitle}</div><span className="connection-status">{online?'Live chat':'Checking for messages every 8 seconds'}</span></div><div className="chat-body" ref={body} role="log" aria-label="Conversation" aria-live="polite" onScroll={()=>{const b=body.current;if(b)nearBottom.current=b.scrollHeight-b.scrollTop-b.clientHeight<80;}}>
    {hasOlder&&<button className="btn btn-ghost btn-sm" disabled={older} onClick={()=>void loadOlder()}>{older?'Loading…':'Load earlier messages'}</button>}
    {loading?<div className="chat-empty">Loading conversation…</div>:messages.length?messages.map(m=><div className={'bubble '+(m.sender_id===me.id?'me':'them')} key={m.id}><span className="preserve">{m.text}</span><time className="ts" dateTime={m.created_at}>{dateLabel(m.created_at)}</time></div>):<div className="chat-empty">Say hello — you matched!</div>}
  </div>{error&&<div className="inline-error chat-error" role="alert">{error}</div>}<form className="chat-input" onSubmit={send}><input aria-label="Message" placeholder="Write a message…" value={text} disabled={sending} maxLength={4000} onChange={e=>{setText(e.target.value);messageId.current=null;}}/><button className="btn btn-primary" disabled={sending||!text.trim()}>{sending?'Sending…':'Send'}</button></form></div>;
}

