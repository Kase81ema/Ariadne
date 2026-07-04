import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../lib/api';

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const sessionId = params.get('session_id');

    if (!sessionId) {
      navigate('/login');
      return;
    }

    const exchangeSession = async () => {
      try {
        const res = await authAPI.exchangeSession(sessionId);
        // Store session token for auth header
        if (res.data.session_token) {
          localStorage.setItem('ariadne_token', res.data.session_token);
        }
        setUser(res.data);
        navigate('/community', { replace: true });
      } catch (err) {
        console.error('Session exchange failed:', err);
        navigate('/login');
      }
    };

    exchangeSession();
  }, [navigate, setUser]);

  return null;
}
