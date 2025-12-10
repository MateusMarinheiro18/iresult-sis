// src/app/client/reset/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// MUI
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

import toast from 'react-hot-toast'

export default function ClientResetPasswordPage() {
  const search = useSearchParams()
  const router = useRouter()
  const token = search.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error('Link inválido. Verifique o e-mail enviado.')
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!token) {
      toast.error('Token ausente.')
      return
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      toast.error('Senhas não conferem.')
      return
    }

    setSaving(true)
    const loadingId = toast.loading('Salvando nova senha...')

    try {
      const res = await fetch('/api/admins/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirm }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao redefinir senha.', { id: loadingId })
        setSaving(false)
        return
      }

      toast.success('Senha redefinida com sucesso. Redirecionando para o login...', { id: loadingId })
      setTimeout(() => {
        // ajuste a rota de login se necessário
        router.push('/admin/login')
      }, 800)
    } catch (err) {
      console.error(err)
      toast.error('Erro de rede.', { id: loadingId })
      setSaving(false)
    } finally {
      // se já redirecionou, este setSaving pode não ser necessário, mas é seguro manter
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-screen flex">
      <main className="flex items-center justify-center flex-1 p-6 md:p-12" style={{ background: '#0B2527', color: '#fff' }}>
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Typography variant="h4" sx={{ color: '#E6EEF0', fontWeight: 300 }}>
              REDEFINIR SENHA
            </Typography>
          </div>

          <form noValidate autoComplete="off" onSubmit={handleSubmit} className="flex flex-col gap-5">
            <TextField
              autoFocus
              fullWidth
              label="Nova senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="filled"
              InputLabelProps={{ style: { color: '#8A8A8A' } }}
              inputProps={{ style: { color: '#8A8A8A' } }}
              sx={{
                backgroundColor: '#F6F7FB',
                borderRadius: '999px',
                '& .MuiFilledInput-root': { backgroundColor: '#F6F7FB', borderRadius: '999px', '&:before, &:after': { display: 'none' } },
              }}
            />

            <TextField
              fullWidth
              label="Confirmar nova senha"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              variant="filled"
              InputLabelProps={{ style: { color: '#8A8A8A' } }}
              inputProps={{ style: { color: '#8A8A8A' } }}
              sx={{
                backgroundColor: '#F6F7FB',
                borderRadius: '999px',
                '& .MuiFilledInput-root': { backgroundColor: '#F6F7FB', borderRadius: '999px', '&:before, &:after': { display: 'none' } },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={saving}
              sx={{
                py: 1.5,
                borderRadius: '999px',
                backgroundColor: '#0B2527',
                border: '2px solid #F6F7FB',
                '&:hover': { backgroundColor: '#233A3C' }
              }}
            >
              {saving ? 'Salvando...' : 'Confirmar nova senha'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
