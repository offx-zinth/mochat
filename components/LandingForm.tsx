'use client';

import { useEffect, useState } from 'react';

type CaptchaResponse = {
  question: string;
};

type VerifyResponse = {
  ok: boolean;
  redirectUrl?: string;
  error?: string;
};

export default function LandingForm() {
  const [question, setQuestion] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCaptcha = async () => {
      const res = await fetch('/api/captcha', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as CaptchaResponse;
        setQuestion(data.question);
      }
    };
    loadCaptcha();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captcha, code })
      });
      const data = (await res.json()) as VerifyResponse;
      if (data.ok) {
        window.location.href = '/chat';
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setError(data.error ?? 'Unable to verify.');
    } catch (err) {
      setError('Network error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card grid">
      <div>
        <h1>MoChat</h1>
        <p className="caption">Private, two-person chat with zero public exposure.</p>
        <div style={{ marginTop: 16 }} className="badge">Sleep-proof + encrypted storage-ready</div>
      </div>
      <div className="grid">
        <div>
          <label htmlFor="captcha">Captcha: {question || 'loading...'}</label>
          <input
            id="captcha"
            value={captcha}
            onChange={(event) => setCaptcha(event.target.value)}
            placeholder="Enter the answer"
            required
          />
        </div>
        <div>
          <label htmlFor="code">Secret 4-5 digit code</label>
          <input
            id="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="0000"
            inputMode="numeric"
            pattern="\d{4,5}"
            required
          />
        </div>
        {error ? <div className="alert">{error}</div> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Checking…' : 'Enter Private Chat'}
        </button>
        <p className="caption">Wrong code after correct captcha sends you to the owner-configured URL.</p>
      </div>
    </form>
  );
}
