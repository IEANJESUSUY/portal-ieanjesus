import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { cloudSignIn, cloudSignOut, cloudSignUp, cloudSpaces, hasCloudSession, OfflineError } from '../cloud'
import { whatsappLink } from '../whatsapp'

const SUPPORT_PHONE = '099882240'

// Entrada con correo y contraseña cuando el Portal está conectado a la base central.
export function CloudLogin({ onSelectUser }: { onSelectUser?: (user: any) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const [accepted, setAccepted] = useState(false)

  async function enter() {
    const { email: userEmail, displayName, spaces } = await cloudSpaces()
    onSelectUser?.({ username: userEmail, displayName, spaces, cloud: true })
  }

  // Si ya había entrado en este dispositivo, sigue adentro sin volver a escribir la contraseña.
  useEffect(() => {
    if (!hasCloudSession()) return
    setBusy(true)
    enter()
      .catch(async e => {
        // Sin señal no se cierra la sesión: se puede volver a intentar cuando haya conexión.
        if (!(e instanceof OfflineError)) await cloudSignOut()
        setError((e as Error).message)
      })
      .finally(() => setBusy(false))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (creating) {
        await cloudSignUp(email, password)
        await cloudSignOut()
        setCreating(false)
        setNotice('¡Listo! Tu usuario quedó creado. Avisale a la Administración Nacional para que te habilite tu congregación y después entrá con tu correo y contraseña.')
        return
      }
      await cloudSignIn(email, password)
      await enter()
    } catch (err) {
      await cloudSignOut()
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="cloud-login" onSubmit={submit}>
      <label>
        <span>{creating ? 'Correo' : 'Correo o usuario'}</span>
        <input
          type={creating ? 'email' : 'text'}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={creating ? 'tucorreo@gmail.com' : 'tucorreo@gmail.com o secretaria.maldonado'}
        />
      </label>
      <label>
        <span>Contraseña</span>
        <div className="cloud-login-password">
          <input type={visible ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'} required minLength={creating ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} placeholder={creating ? 'Al menos 8 letras o números' : undefined} />
          <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>
      {creating && (
        <label className="cloud-login-consent">
          <input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} />
          <span>Leí y acepto la <a href="privacidad.html" target="_blank" rel="noreferrer">política de privacidad</a>.</span>
        </label>
      )}
      {error && <p className="cloud-login-error" role="alert">{error}</p>}
      {notice && <p className="cloud-login-notice" role="status">{notice}</p>}
      <button type="submit" className="primary-action official-setup-action" disabled={busy}>
        <LockKeyhole size={17} /> {busy ? 'Un momento…' : creating ? 'Crear mi usuario' : 'Entrar'} {!busy && <ArrowRight size={17} />}
      </button>
      <button type="button" className="cloud-login-switch" onClick={() => { setCreating(c => !c); setError(''); setNotice('') }}>
        {creating ? 'Ya tengo usuario: entrar' : 'Es mi primera vez: crear mi usuario'}
      </button>
      <p className="cloud-login-help">
        ¿No tenés usuario o te olvidaste la contraseña?{' '}
        <a href={whatsappLink(SUPPORT_PHONE, 'Hola, necesito ayuda para entrar al Portal Nacional.')} target="_blank" rel="noreferrer">Escribí por WhatsApp</a>.
      </p>
      <p className="cloud-login-help"><a href="privacidad.html" target="_blank" rel="noreferrer">Privacidad y cómo borrar tu cuenta</a></p>
    </form>
  )
}
