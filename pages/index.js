// pages/index.js

import { useState } from 'react';
import supabase from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) router.push('/dashboard');
    else alert('Fehler beim Einloggen: ' + error.message);
  };

  return (
    <StyledPage>
      <h2>Login</h2>
      <StyledContainer>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Passwort" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <StyledButton onClick={handleLogin}>Einloggen</StyledButton>
        <p>Noch kein Account? <StyledLink href="/register">Jetzt registrieren</StyledLink></p>
      </StyledContainer>
    </StyledPage>
  );
}

const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(198,220,225,.2);
  margin: 5rem 15rem;
  padding: 0 0 3rem 0;
`;

const StyledButton = styled.button`
  background-color: #b5a286;
  color: white;
  border: none;
  padding: 10px 16px;
  margin-top: 10px;
  cursor: pointer;

  &:hover {
    background-color: #b5a286;
    text-decoration: underline;
  }
`;

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 60%;
  gap: 1rem;
`;

const StyledLink = styled(Link)`
  color: var(--primary-color);
  text-decoration: underline;
`;