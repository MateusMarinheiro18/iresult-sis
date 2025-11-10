// src/app/client/forgot/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'

// MUI
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

import classnames from 'classnames'

/**
 * Desktop Logo (used on the left column)
 */
function LogoDesktop() {
  return (
    <div className="w-72">
      <img src="/logos/LogoGreen.png" alt="logo" className="w-full h-auto" />
    </div>
  )
}

/**
 * Mobile white logo (used as floating element on small screens)
 * Place a file at: public/logos/LogoWhite.png
 */
function LogoMobile() {
  return (
    <div className="w-28">
      <img src="/logos/LogoWhite.png" alt="logo white" className="w-full h-auto" />
    </div>
  )
}

export default function ClientForgotPasswordPage() {
  const [email, setEmail] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('password reset request', { email })
    alert('Link de redefinição enviado (simulação)')
  }

  return (
    <div className="relative min-h-screen flex">
      {/* MOBILE floating logo */}
      <div className="md:hidden absolute top-32 left-1/2 transform -translate-x-1/2 z-50">
        <LogoMobile />
      </div>

      {/* LEFT (desktop only) */}
      <aside
        className="hidden md:flex flex-1 flex-col items-center justify-center p-12 text-left"
        style={{ background: '#F3F4FF' }}
        aria-hidden
      >
        <div className="flex flex-col items-start justify-center max-w-[420px] text-left">
          <header className="mb-8">
            <Typography variant="h4" className="text-[#0B2527] mb-2" sx={{ fontWeight: 700 }}>
              Recuperar acesso
            </Typography>
            <Typography className="text-slate-700">
              Informe seu e-mail para receber o link de redefinição de senha.
            </Typography>
          </header>

          <div className="w-72">
            <LogoDesktop />
          </div>
        </div>
      </aside>

      {/* RIGHT - form column */}
      <main
        className={classnames('flex items-center justify-center flex-1 p-6 md:p-12')}
        style={{ background: '#0B2527', color: '#ffffff' }}
      >
        <div className="w-full max-w-md pt-20 md:pt-0">
          <div className="mb-6 text-center">
            <Typography variant="h4" sx={{ color: '#E6EEF0', fontWeight: 300 }}>
              ESQUECI MINHA SENHA
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
              InputLabelProps={{
                style: { color: '#8A8A8A' }
              }}
              inputProps={{
                style: { color: '#8A8A8A' }
              }}
              sx={{
                backgroundColor: '#F6F7FB',
                borderRadius: '999px',
                '& .MuiFilledInput-root': {
                  backgroundColor: '#F6F7FB',
                  borderRadius: '999px',
                  '&:hover': { backgroundColor: '#F6F7FB' },
                  '&:before, &:after': { display: 'none' }
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#8A8A8A'
                }
              }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              sx={{
                py: 1.5,
                borderRadius: '999px',
                backgroundColor: '#0B2527',
                border: '2px solid #F6F7FB',
                '&:hover': { backgroundColor: '#233A3C' }
              }}
            >
              Enviar link de redefinição
            </Button>

            <div className="text-center mt-4">
              <Link href="/client/login" className="text-sky-300 hover:underline" style={{ color: '#F0F1F1' }}>
                Voltar para o login
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
