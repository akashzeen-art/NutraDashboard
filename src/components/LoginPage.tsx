import { useState, FormEvent } from 'react';
import { AUTH_CREDENTIALS } from '../config';

type LoginPageProps = {
  onLoginSuccess: (email: string) => void;
};

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (trimmed === AUTH_CREDENTIALS.email && password === AUTH_CREDENTIALS.password) {
      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('userEmail', trimmed);
      onLoginSuccess(trimmed);
      return;
    }
    setError('Invalid email or password. Please try again.');
    setPassword('');
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Nutra Dashboard</h1>
        <form onSubmit={handleSubmit}>
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
            />
          </div>
          <button type="submit" className="login-btn">
            Login
          </button>
          <div className="login-error" role="alert">
            {error}
          </div>
        </form>
      </div>
    </div>
  );
}
