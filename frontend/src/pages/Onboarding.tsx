import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';

const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2'];
const GOALS = [['everyday', 'Everyday life'], ['travel', 'Travel & tourism'], ['work', 'Work'], ['family', 'Family & diaspora'], ['study', 'Study'], ['culture', 'Culture']];

export default function Onboarding() {
  useSeo('Welcome — set up your Darija plan | Langzio', 'Tell us your level, goal and daily minutes to personalise your dashboard.', '/onboarding');
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState('A0');
  const [goal, setGoal] = useState('everyday');
  const [mins, setMins] = useState(15);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const save = async (k: string, v: unknown) => {
    try { await api('/onboarding', { body: { step: k, answer: v } }); } catch (e: any) { setErr(e.message); }
  };
  const finish = async () => {
    try {
      await api('/preferences', { method: 'PUT', body: { level, goal, daily_minutes: mins } });
      nav('/dashboard');
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <div className="container-x py-12 max-w-xl">
      <p className="text-xs font-extrabold tracking-widest uppercase text-brand-700">Step {step + 1} of 3</p>
      <h1 className="text-3xl font-extrabold mt-1">Let's personalise Darija for you.</h1>
      {err && <p role="alert" className="text-sm font-bold text-red-700 mt-2">{err}</p>}
      {step === 0 && (
        <div className="card mt-4">
          <h2 className="font-bold">Your level? (practical stages, not a certificate)</h2>
          <div className="mt-2 grid grid-cols-5 gap-2">{LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} className={`py-2 rounded-xl font-extrabold ${level === l ? 'bg-stone-900 text-white' : 'bg-stone-100'}`} aria-pressed={level === l}>{l}</button>)}</div>
          <button className="btn-primary w-full mt-4" onClick={async () => { await save('level', level); setStep(1); }}>Continue</button>
        </div>
      )}
      {step === 1 && (
        <div className="card mt-4">
          <h2 className="font-bold">Your main goal?</h2>
          <div className="mt-2 grid gap-2">{GOALS.map(([v, l]) => <button key={v} onClick={() => setGoal(v)} className={`text-left px-4 py-2.5 rounded-xl font-bold ${goal === v ? 'bg-stone-900 text-white' : 'bg-stone-100'}`} aria-pressed={goal === v}>{l}</button>)}</div>
          <div className="flex gap-2 mt-4"><button className="btn-ghost" onClick={() => setStep(0)}>← Back</button><button className="btn-primary flex-1" onClick={async () => { await save('goal', goal); setStep(2); }}>Continue</button></div>
        </div>
      )}
      {step === 2 && (
        <div className="card mt-4">
          <h2 className="font-bold">Daily minutes?</h2>
          <input type="range" min={5} max={60} value={mins} onChange={e => setMins(Number(e.target.value))} className="w-full mt-3" aria-label="Daily minutes" />
          <p className="font-extrabold text-2xl mt-1">{mins} min/day</p>
          <div className="flex gap-2 mt-4"><button className="btn-ghost" onClick={() => setStep(1)}>← Back</button><button className="btn-primary flex-1" onClick={finish}>Start learning →</button></div>
        </div>
      )}
    </div>
  );
}
