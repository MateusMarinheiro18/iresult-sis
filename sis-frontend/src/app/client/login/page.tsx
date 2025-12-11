// src/app/client/login/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// MUI
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';

import classnames from 'classnames';

function LogoDesktop() {
  return (
    <div className="w-72">
      <img src="/logos/LogoGreen.png" alt="logo" className="w-full h-auto" />
    </div>
  );
}

function LogoMobile() {
  return (
    <div className="w-28">
      <img src="/logos/LogoWhite.png" alt="logo white" className="w-full h-auto" />
    </div>
  );
}

export default function ClientLoginPage() {
  const router = useRouter();
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClickShowPassword = () => setIsPasswordShown((s) => !s);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!email || !password) {
      toast.error('Informe email e senha.');
      return;
    }

    setLoading(true);
    const tId = toast.loading('Autenticando...');

    try {
      const res = await fetch('/api/rh/login', {
        method: 'POST',
        credentials: 'include', // essencial para gravar cookie HttpOnly
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), senha: password }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao autenticar.', { id: tId });
        setLoading(false);
        return;
      }

      toast.success(data?.message ?? 'Autenticado!', { id: tId });

      // forçar reload completo para garantir que cookies sejam lidos pelo middleware
      const next = new URL(window.location.href).searchParams.get('next') ?? data?.redirectTo ?? '/client/dashboard';

      // usar window.location.href ao invés de router.push para forçar reload completo
      window.location.href = next;
    } catch (err) {
      console.error('Erro no login', err);
      toast.error('Erro de rede ao autenticar.', { id: tId });
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex">
      <div className="md:hidden absolute top-32 left-1/2 transform -translate-x-1/2 z-50">
        <LogoMobile />
      </div>

      <aside
        className="hidden md:flex flex-1 flex-col items-center justify-center p-12 text-left"
        style={{ background: '#F3F4FF' }}
        aria-hidden
      >
        <div className="flex flex-col items-start justify-center max-w-[420px] text-left">
          <header className="mb-8">
            <Typography variant="h4" className="text-[#0B2527] mb-2" sx={{ fontWeight: 700 }}>
              Bem-vindo, equipe de RH!
            </Typography>
            <Typography className="text-slate-700">
              Acesse o painel para consultar relatórios, agendamentos e indicadores da sua empresa.
            </Typography>
          </header>

          <div className="w-72">
            <LogoDesktop />
          </div>
        </div>
      </aside>

      <main
        className={classnames('flex items-center justify-center flex-1 p-6 md:p-12')}
        style={{ background: '#0B2527', color: '#ffffff' }}
      >
        <div className="w-full max-w-md pt-20 md:pt-0">
          <div className="mb-6 text-center">
            <Typography variant="h4" sx={{ color: '#E6EEF0', fontWeight: 300 }}>
              LOGIN
            </Typography>
          </div>

          <form noValidate autoComplete="off" onSubmit={handleSubmit} className="flex flex-col gap-5">
            <TextField
              autoFocus
              fullWidth
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="filled"
              InputLabelProps={{ style: { color: '#8A8A8A' } }}
              inputProps={{ style: { color: '#8A8A8A' } }}
              sx={{
                backgroundColor: '#F6F7FB',
                borderRadius: '999px',
                '& .MuiFilledInput-root': {
                  backgroundColor: '#F6F7FB',
                  borderRadius: '999px',
                  '&:hover': { backgroundColor: '#F6F7FB' },
                  '&:before, &:after': { display: 'none' },
                },
                '& .MuiInputBase-input::placeholder': { color: '#8A8A8A' },
              }}
            />

            <TextField
              fullWidth
              label="Senha"
              type={isPasswordShown ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="filled"
              InputLabelProps={{ style: { color: '#8A8A8A' } }}
              inputProps={{ style: { color: '#8A8A8A' } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={handleClickShowPassword}
                      onMouseDown={(e) => e.preventDefault()}
                      sx={{ color: '#8A8A8A' }}
                      aria-label={isPasswordShown ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                backgroundColor: '#F6F7FB',
                borderRadius: '999px',
                '& .MuiFilledInput-root': {
                  backgroundColor: '#F6F7FB',
                  borderRadius: '999px',
                  '&:hover': { backgroundColor: '#F6F7FB' },
                  '&:before, &:after': { display: 'none' },
                },
                '& .MuiInputBase-input::placeholder': { color: '#8A8A8A' },
              }}
            />

            <div className="flex justify-center items-center flex-wrap gap-x-3 gap-y-1">
              <Link href="/client/forgot" className="text-sky-300 hover:underline" style={{ color: '#F0F1F1' }}>
                Esqueci a senha
              </Link>
            </div>

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: '999px',
                backgroundColor: '#0B2527',
                border: '2px solid #F6F7FB',
                '&:hover': { backgroundColor: '#233A3C' },
              }}
            >
              {loading ? 'Autenticando...' : 'Acessar'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
