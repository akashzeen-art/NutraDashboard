import { useState, FormEvent } from 'react';
import { loginWithApi } from '../api/auth';
import { appTitle } from '../config';

type LoginPageProps = {
  onLoginSuccess: () => void;
};

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginWithApi(email, password);
      if (result.ok) {
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('userEmail', email.trim());
        onLoginSuccess();
        return;
      }
      setError(result.message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>{appTitle()}</h1>
        <form onSubmit={(ev) => void handleSubmit(ev)}>
          <div className="login-form-group">
            <label htmlFor="email">Email ID</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={loading}
            />
          </div>
          <div className="login-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={loading}
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
          <div className="login-error" role="alert">
            {error}
          </div>
        </form>
      </div>
    </div>
  );
}
