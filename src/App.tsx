import { useEffect, useState } from 'react'
import {
  AlertTriangle, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, CircleAlert,
  Cloud, CloudLightning, CloudRain, Droplets, Eye, EyeOff, History, Home, LoaderCircle, LogOut,
  Mail, MapPin, Menu, Moon, Plus, Search, Send, Settings, ShieldCheck, Snowflake, Star,
  Sun, Sunrise, Trash2, User, Users, Wind, X
} from 'lucide-react'
import {
  api, ApiError, logado,
  type Alerta, type Cidade, type CidadeBusca, type Perfil, type PrevisaoResp, type Tipo, type Usuario,
} from './api'
import './delivery.css'

type Screen = 'auth' | 'onboarding' | 'dashboard' | 'cities' | 'preferences' | 'history' | 'detail' | 'messages'

/* ---------- helpers ---------- */
const TIPO_LABEL: Record<Tipo, string> = { previsao_diaria: 'Previsão diária', chuva_forte: 'Chuva forte', geada: 'Geada' }
const PERFIL_LABEL: Record<Perfil, string> = { produtor_rural: 'Produtor rural', organizador_eventos: 'Organizador de eventos' }
const r0 = (n: number) => Math.round(n)
const primeiroNome = (n: string) => n.trim().split(/\s+/)[0]
const iniciais = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
const nomeCidade = (c: { nome: string; estado: string | null }) => (c.estado ? `${c.nome}, ${c.estado}` : c.nome)

function msgErro(e: unknown) {
  if (e instanceof ApiError) return e.detalhes?.length ? `${e.message}: ${e.detalhes.map((d) => d.campo).join(', ')}` : e.message
  return 'Não foi possível conectar ao servidor. Ele está rodando?'
}
function iconeClima(codigo: number): React.ElementType {
  if (codigo <= 1) return Sun
  if (codigo <= 3 || (codigo >= 45 && codigo <= 48)) return Cloud
  if (codigo >= 95) return CloudLightning
  if (codigo >= 71 && codigo <= 77) return Snowflake
  return CloudRain
}
const ehHoje = (d: Date) => d.toDateString() === new Date().toDateString()
function fmtEnvio(iso: string) {
  const d = new Date(iso)
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return ehHoje(d) ? `Hoje, ${hm}` : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${hm}`
}
const fmtHoraPrev = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)} às ${iso.slice(11, 13)}h`
const horaCurta = (iso: string) => `${iso.slice(11, 13)}h`
function atualizadoHa(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000))
  return min < 1 ? 'agora' : `há ${min} min`
}
function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function useToast() {
  const [t, setT] = useState<{ msg: string; err: boolean } | null>(null)
  const show = (msg: string, err = false) => {
    setT({ msg, err })
    setTimeout(() => setT(null), 3500)
  }
  const node = t ? <div className={`toast ${t.err ? 'err' : ''}`}>{t.err ? <CircleAlert /> : <Check />} {t.msg}</div> : null
  return [node, show] as const
}

/* ---------- componentes base ---------- */
function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'ghost'|'danger' }) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>
}
function Field({ label, icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string, icon?: React.ElementType }) {
  return <label className="field"><span>{label}</span><div className="input-wrap">{Icon && <Icon size={18}/>}<input {...props}/></div></label>
}
function Toggle({ checked, onChange }: { checked: boolean, onChange: () => void }) {
  return <button aria-label="Alternar opção" onClick={onChange} className={`toggle ${checked ? 'on' : ''}`}><span/></button>
}
function Logo() {
  return <div className="logo"><span className="logo-mark"><CloudRain size={24}/><Sun size={14}/></span><strong>Tempo<span>Alerta</span></strong></div>
}
function PageHead({ eyebrow, title, desc, action }: {eyebrow:string,title:string,desc:string,action?:React.ReactNode}) {
  return <div className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{desc}</p></div>{action}</div>
}
function Carregando({ texto }: { texto: string }) {
  return <div className="state-grid" style={{ gridTemplateColumns: '1fr' }}><article><LoaderCircle className="spin"/><h2>{texto}</h2></article></div>
}
function Erro({ texto, onRetry }: { texto: string; onRetry?: () => void }) {
  return <div className="state-grid" style={{ gridTemplateColumns: '1fr' }}><article className="error"><CircleAlert/><h2>Algo deu errado</h2><p>{texto}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>}</article></div>
}
function SemCidade({ go }: { go: (s: Screen) => void }) {
  return <div className="state-grid" style={{ gridTemplateColumns: '1fr' }}><article><MapPin/><h2>Nenhuma cidade ainda</h2><p>Adicione uma cidade para começar a receber previsões.</p><Button onClick={() => go('cities')}><Plus/> Adicionar cidade</Button></article></div>
}

/* Busca explícita de cidades via Nominatim/OpenStreetMap, pelo back-end. */
function CitySearch({ value, onChange }: { value: CidadeBusca | null; onChange: (c: CidadeBusca) => void }) {
  const [q, setQ] = useState('')
  const [buscada, setBuscada] = useState('')
  const [res, setRes] = useState<CidadeBusca[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function buscar() {
    const consulta = q.trim()
    if (consulta.length < 2 || loading) return
    setBuscada(consulta)
    setLoading(true); setErro(''); setRes([])
    try {
      setRes(await api.buscarCidades(consulta))
    } catch (e) {
      setErro(msgErro(e))
    } finally {
      setLoading(false)
    }
  }

  return <>
    <Field label="Busque uma cidade" icon={loading ? LoaderCircle : Search} placeholder="Digite o nome da cidade" value={q} maxLength={80}
      onChange={(e) => { setQ(e.target.value); setRes([]); setBuscada(''); setErro('') }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void buscar() } }}/>
    <Button variant="secondary" disabled={loading || q.trim().length < 2} onClick={() => void buscar()}>{loading ? 'Buscando...' : 'Buscar cidade'}</Button>
    {erro && <p className="form-error">{erro}</p>}
    {!loading && !erro && buscada === q.trim() && res.length === 0 && <p className="api-note"><CircleAlert/> Cidade não encontrada. Confira a ortografia ou tente uma cidade próxima.</p>}
    {res.map((c) => {
      const sel = !!value && value.latitude === c.latitude && value.longitude === c.longitude
      return <button key={`${c.latitude},${c.longitude}`} className={`city-result ${sel ? 'sel' : ''}`} onClick={() => onChange(c)}>
        <MapPin/><span><strong>{c.nome}</strong><small>{c.estado ?? '—'}, {c.pais} • {c.latitude.toFixed(2)}, {c.longitude.toFixed(2)}</small></span>{sel && <Check/>}
      </button>
    })}
  </>
}

/* ---------- telas ---------- */
function Auth({ onAuth }: { onAuth: (u: Usuario, novo: boolean) => void }) {
  const [signup, setSignup] = useState(false)
  const [show, setShow] = useState(false)
  const [nome, setNome] = useState(''), [email, setEmail] = useState(''), [senha, setSenha] = useState('')
  const [erro, setErro] = useState(''), [loading, setLoading] = useState(false)

  async function enviar() {
    setErro(''); setLoading(true)
    try {
      const u = signup ? await api.cadastro(nome, email, senha, 'produtor_rural') : await api.login(email, senha)
      onAuth(u, signup)
    } catch (e) { setErro(msgErro(e)) } finally { setLoading(false) }
  }
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !loading) enviar() }

  return <main className="auth-page">
    <section className="auth-brand">
      <Logo/>
      <div>
        <span className="eyebrow light">PREVISÃO QUE CHEGA ATÉ VOCÊ</span>
        <h1>Prepare-se antes<br/>do tempo mudar.</h1>
        <p>Alertas simples e confiáveis para proteger sua produção e seus eventos.</p>
        <div className="brand-points"><span><ShieldCheck/> Alertas antecipados</span><span><Send/> Nos canais conectados</span></div>
      </div>
    </section>
    <section className="auth-form">
      <div className="mobile-logo"><Logo/></div>
      <div className="form-box" onKeyDown={enter}>
        <span className="eyebrow">{signup ? 'CRIE SUA CONTA' : 'BEM-VINDO DE VOLTA'}</span>
        <h2>{signup ? 'Comece a se prevenir' : 'Acesse sua conta'}</h2>
        <p>{signup ? 'Leva menos de dois minutos.' : 'Seus alertas continuam cuidando do que importa.'}</p>
        {signup && <Field label="Nome completo" icon={User} placeholder="Como podemos chamar você?" value={nome} onChange={(e) => setNome(e.target.value)}/>}
        <Field label="E-mail" icon={Mail} type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
        <Field label="Senha" icon={show ? EyeOff : Eye} type={show ? 'text' : 'password'} placeholder="Mínimo de 8 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)}/>
        <div className="form-meta">
          <label><input type="checkbox"/> Lembrar de mim</label>
          <button className="show-password" onClick={() => setShow(!show)}>{show ? 'Ocultar' : 'Mostrar'} senha</button>
        </div>
        {erro && <p className="form-error">{erro}</p>}
        <Button className="full" disabled={loading} onClick={enviar}>{loading ? 'Aguarde...' : signup ? 'Criar minha conta' : 'Entrar'} <ChevronDown className="arrow-right" size={18}/></Button>
        <p className="switch">{signup ? 'Já possui uma conta?' : 'Ainda não tem uma conta?'} <button onClick={() => { setSignup(!signup); setErro('') }}>{signup ? 'Entrar' : 'Cadastre-se grátis'}</button></p>
      </div>
    </section>
  </main>
}

function Onboarding({ user, onDone }: { user: Usuario; onDone: (cidadeId: number) => void }) {
  const [step, setStep] = useState(1)
  const [perfil, setPerfil] = useState<Perfil>(user.perfil)
  const [cidade, setCidade] = useState<CidadeBusca | null>(null)
  const [horario, setHorario] = useState('06:00')
  const [erro, setErro] = useState(''), [loading, setLoading] = useState(false)

  async function avancar() {
    setErro('')
    try {
      if (step === 1) {
        setLoading(true)
        if (perfil !== user.perfil) await api.atualizarPerfil(perfil)
        setStep(2)
      } else if (step === 2) {
        setStep(3)
      } else if (cidade) {
        setLoading(true)
        const c = await api.addCidade({ nome: cidade.nome, estado: cidade.uf ?? cidade.estado, latitude: cidade.latitude, longitude: cidade.longitude, horario_envio: horario })
        onDone(c.id)
      }
    } catch (e) { setErro(msgErro(e)) } finally { setLoading(false) }
  }

  return <main className="onboarding">
    <header><Logo/><span>Passo {step} de 3</span></header>
    <div className="progress"><i style={{ width: `${step * 33.33}%` }}/></div>
    <section className="onboard-card">
      {step === 1 && <>
        <span className="step-icon"><Users/></span><h1>Como você usa a previsão?</h1><p>Vamos personalizar seus alertas para o que realmente importa.</p>
        <div className="profile-grid">
          <button className={perfil === 'produtor_rural' ? 'selected' : ''} onClick={() => setPerfil('produtor_rural')}><span>🌱</span><strong>Produtor Rural</strong><small>Geada, chuva forte e apoio à produção</small>{perfil === 'produtor_rural' && <Check/>}</button>
          <button className={perfil === 'organizador_eventos' ? 'selected' : ''} onClick={() => setPerfil('organizador_eventos')}><span>⛺</span><strong>Organizador de Eventos</strong><small>Chuva, vento e planejamento</small>{perfil === 'organizador_eventos' && <Check/>}</button>
        </div>
      </>}
      {step === 2 && <>
        <span className="step-icon"><MapPin/></span><h1>Qual cidade quer acompanhar?</h1><p>Você poderá adicionar outras cidades depois.</p>
        <CitySearch value={cidade} onChange={setCidade}/>
      </>}
      {step === 3 && <>
        <span className="step-icon"><Sunrise/></span><h1>Que horas devemos avisar?</h1><p>Enviaremos a previsão diária no horário que funciona para você.</p>
        <label className="time-choice"><span>Horário de envio</span><input type="time" value={horario} onChange={(e) => setHorario(e.target.value)}/></label>
        <div className="summary"><Sunrise/><span><strong>Previsão diária às {horario}</strong><small>para {cidade ? nomeCidade({ nome: cidade.nome, estado: cidade.uf ?? cidade.estado }) : ''} • canais configurados nas preferências</small></span></div>
      </>}
      {erro && <p className="form-error">{erro}</p>}
      <div className="onboard-actions">
        {step > 1 && <Button variant="ghost" onClick={() => setStep(step - 1)}><ChevronLeft/> Voltar</Button>}
        <Button disabled={loading || (step === 2 && !cidade) || (step === 3 && !horario)} onClick={avancar}>{step === 3 ? 'Ver meu painel' : 'Continuar'} <span>→</span></Button>
      </div>
    </section>
  </main>
}

function Shell({ screen, go, theme, setTheme, user, cidades, cidadeId, setCidadeId, sair, children }: {
  screen: Screen; go: (s: Screen) => void; theme: string; setTheme: (v: string) => void
  user: Usuario; cidades: Cidade[]; cidadeId: number | null; setCidadeId: (id: number) => void; sair: () => void; children: React.ReactNode
}) {
  const nav = [
    ['dashboard','Visão geral',Home], ['cities','Minhas cidades',MapPin], ['preferences','Preferências',Settings],
    ['history','Histórico',History], ['messages','Testar envio',Send]
  ] as const
  return <div className="app-shell">
    <aside>
      <Logo/>
      <nav>{nav.map(([id,label,Icon]) => <button key={id} className={screen===id?'active':''} onClick={() => go(id)}><Icon/>{label}</button>)}</nav>
      <div className="aside-bottom">
        <button onClick={() => setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}{theme==='dark'?'Tema claro':'Tema escuro'}</button>
        <button onClick={sair}><LogOut/>Sair</button>
        <div className="profile"><span>{iniciais(user.nome)}</span><div><strong>{user.nome}</strong><small>{PERFIL_LABEL[user.perfil]}</small></div></div>
      </div>
    </aside>
    <section className="main-area">
      <header className="topbar">
        <button className="menu"><Menu/></button>
        <div className="top-city"><MapPin/><span><small>Cidade</small>
          {cidades.length ? <select value={cidadeId ?? ''} onChange={(e) => setCidadeId(Number(e.target.value))}>{cidades.map((c) => <option key={c.id} value={c.id}>{nomeCidade(c)}</option>)}</select> : <strong>Nenhuma cidade</strong>}
        </span></div>
        <div className="top-actions">
          <button onClick={() => setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}</button>
          <button className="bell" onClick={() => go('history')}><Bell/></button>
          <span className="avatar">{iniciais(user.nome)}</span>
        </div>
      </header>
      {children}
    </section>
    <nav className="bottom-nav">{nav.slice(0,5).map(([id,label,Icon]) => <button key={id} className={screen===id?'active':''} onClick={() => go(id)}><Icon/><span>{label.split(' ')[0]}</span></button>)}</nav>
  </div>
}

function Dashboard({ user, cidade, go }: { user: Usuario; cidade: Cidade | null; go: (s: Screen) => void }) {
  const [prev, setPrev] = useState<PrevisaoResp | null>(null)
  const [erro, setErro] = useState('')
  const [fechados, setFechados] = useState<string[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!cidade) return
    let vivo = true
    setPrev(null); setErro('')
    api.previsao(cidade.id).then((p) => vivo && setPrev(p)).catch((e) => vivo && setErro(msgErro(e)))
    return () => { vivo = false }
  }, [cidade?.id, tick])

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()
  const head = <PageHead eyebrow={hoje} title={`${saudacao()}, ${primeiroNome(user.nome)}!`} desc="Aqui está o que o tempo reserva para você hoje."/>

  if (!cidade) return <main className="content">{head}<SemCidade go={go}/></main>
  if (erro) return <main className="content">{head}<Erro texto={erro} onRetry={() => setTick((t) => t + 1)}/></main>
  if (!prev) return <main className="content">{head}<Carregando texto="Atualizando previsão"/></main>

  const Icone = iconeClima(prev.atual.codigo)
  const menor = prev.status_geral.menor_minima
  return <main className="content">
    {head}
    {prev.alertas_ativos.filter((a) => !fechados.includes(a.tipo)).map((a) => <div className="alert-banner" key={a.tipo}>
      <span>{a.tipo === 'geada' ? <Snowflake/> : <AlertTriangle/>}</span>
      <div>
        <strong>{a.tipo === 'geada' ? 'Risco de geada nas próximas 24h' : 'Chuva forte prevista nas próximas 24h'}</strong>
        <p>{a.tipo === 'geada' ? `Mínima de ${r0(a.minima)}°C por volta de ${horaCurta(a.hora_minima)}` : `Pico de ${a.pico_mm} mm/h por volta de ${horaCurta(a.hora_pico)} • Acumulado de ${a.total_24h_mm} mm`}</p>
      </div>
      <Button variant="secondary" onClick={() => go('history')}>Ver histórico</Button>
      <button className="close" onClick={() => setFechados([...fechados, a.tipo])}><X/></button>
    </div>)}
    <section className="dashboard-grid">
      <div className="current-weather">
        <div className="weather-top">
          <div><span className="location"><MapPin/> {nomeCidade(cidade)}</span><h2>{r0(prev.atual.temperatura)}<span>°C</span></h2><strong>{prev.atual.descricao}</strong><p>Previsão meteorológica atual</p></div>
          <div className="big-weather"><Icone/></div>
        </div>
        <div className="metrics">
          <div><CloudRain/><span><small>CHUVA PREVISTA</small><strong>{prev.hoje.chuva_mm} mm</strong></span></div>
          <div><Wind/><span><small>VENTO</small><strong>{r0(prev.atual.vento_kmh)} km/h</strong></span></div>
          <div><Droplets/><span><small>UMIDADE</small><strong>{r0(prev.atual.umidade)}%</strong></span></div>
          <div><Sunrise/><span><small>MÍN. / MÁX.</small><strong>{r0(prev.hoje.min)}° / {r0(prev.hoje.max)}°</strong></span></div>
        </div>
        <small className="source">Dados atualizados {atualizadoHa(prev.atualizado_em)} • {prev.fonte}</small>
      </div>
      <div className="side-card">
        <div className={`side-icon ${prev.status_geral.risco_geada_48h ? '' : 'good'}`}>{prev.status_geral.risco_geada_48h ? <Snowflake/> : <ShieldCheck/>}</div>
        <span className="eyebrow">STATUS GERAL</span>
        <h3>{prev.status_geral.risco_geada_48h ? 'Atenção ao frio' : 'Condições favoráveis'}</h3>
        <p>{prev.status_geral.risco_geada_48h ? 'Há risco de geada nas próximas 48 horas.' : 'Sem risco de geada nas próximas 48 horas.'}</p>
        <div className="mini-status"><Snowflake/><span><small>Menor temperatura da semana</small><strong>{r0(menor.valor)}°C ({menor.data === prev.dias[0].data ? 'hoje' : menor.dia_semana})</strong></span></div>
      </div>
    </section>
    <section className="forecast card">
      <div className="section-title"><div><span className="eyebrow">PRÓXIMOS DIAS</span><h2>Previsão de 7 dias</h2></div><span className="updated">Atualizado {atualizadoHa(prev.atualizado_em)}</span></div>
      <div className="forecast-row">{prev.dias.map((d, i) => { const I = iconeClima(d.codigo); return <div className={i === 0 ? 'today' : ''} key={d.data}><strong>{d.dia_semana}</strong><I/><span><b>{r0(d.max)}°</b> {r0(d.min)}°</span><small><Droplets/> {d.chuva_mm} mm</small></div> })}</div>
    </section>
  </main>
}

function CityWeather({ id }: { id: number }) {
  const [p, setP] = useState<PrevisaoResp | null | 'erro'>(null)
  useEffect(() => { let v = true; api.previsao(id).then((r) => v && setP(r)).catch(() => v && setP('erro')); return () => { v = false } }, [id])
  const I = p && p !== 'erro' ? iconeClima(p.atual.codigo) : Sun
  return <div className="city-weather"><I/>{p && p !== 'erro' ? `${r0(p.atual.temperatura)}°` : '--'}</div>
}

function Cities({ cidades, recarregar, setCidadeId }: { cidades: Cidade[]; recarregar: (preferId?: number) => Promise<unknown>; setCidadeId: (id: number) => void }) {
  const [remover, setRemover] = useState<Cidade | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [escolhida, setEscolhida] = useState<CidadeBusca | null>(null)
  const [erro, setErro] = useState(''), [loading, setLoading] = useState(false)
  const [toast, show] = useToast()

  async function adicionar() {
    if (!escolhida) return
    setErro(''); setLoading(true)
    try {
      const c = await api.addCidade({ nome: escolhida.nome, estado: escolhida.uf ?? escolhida.estado, latitude: escolhida.latitude, longitude: escolhida.longitude })
      await recarregar()
      setAdicionando(false); setEscolhida(null)
      show(`${c.nome} adicionada.`)
    } catch (e) { setErro(msgErro(e)) } finally { setLoading(false) }
  }
  async function principal(c: Cidade) {
    try { await api.definirPrincipal(c.id); await recarregar(c.id); setCidadeId(c.id); show(`${c.nome} agora é a cidade principal.`) } catch (e) { show(msgErro(e), true) }
  }
  async function confirmarRemocao() {
    if (!remover) return
    try { await api.removerCidade(remover.id); await recarregar(); show(`${remover.nome} removida.`) } catch (e) { show(msgErro(e), true) }
    setRemover(null)
  }

  return <main className="content">
    <PageHead eyebrow="LOCALIZAÇÕES" title="Minhas cidades" desc="Gerencie os locais que você acompanha." action={<Button onClick={() => setAdicionando(true)}><Plus/> Adicionar cidade</Button>}/>
    <div className="city-list">
      {cidades.length === 0 && <div className="state-grid" style={{ gridTemplateColumns: '1fr' }}><article><MapPin/><h2>Nenhuma cidade ainda</h2><p>Adicione uma cidade para começar a receber previsões.</p></article></div>}
      {cidades.map((c) => <article className="city-card" key={c.id}>
        <CityWeather id={c.id}/>
        <div><span className="eyebrow">{c.principal ? 'CIDADE PRINCIPAL' : 'CIDADE MONITORADA'}</span><h2>{nomeCidade(c)}</h2><p><MapPin/> {c.latitude.toFixed(2)}, {c.longitude.toFixed(2)} • {c.preferencia.horarios_previsao.length ? c.preferencia.horarios_previsao.join(' · ') : 'previsões diárias desativadas'}</p></div>
        <div className="city-actions">
          {!c.principal && <Button variant="secondary" onClick={() => principal(c)}><Star/> Definir principal</Button>}
          <button className="icon danger" aria-label={`Remover ${c.nome}`} onClick={() => setRemover(c)}><Trash2/></button>
        </div>
      </article>)}
    </div>
    {adicionando && <div className="modal-backdrop"><div className="modal" style={{ textAlign: 'left', width: 'min(520px,100%)' }}>
      <h2>Adicionar cidade</h2>
      <CitySearch value={escolhida} onChange={setEscolhida}/>
      {erro && <p className="form-error">{erro}</p>}
      <div style={{ marginTop: 18, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={() => { setAdicionando(false); setEscolhida(null); setErro('') }}>Cancelar</Button>
        <Button disabled={!escolhida || loading} onClick={adicionar}>{loading ? 'Adicionando...' : 'Adicionar'}</Button>
      </div>
    </div></div>}
    {remover && <div className="modal-backdrop"><div className="modal"><span className="modal-icon"><Trash2/></span><h2>Remover {remover.nome}?</h2><p>Você deixará de receber previsões e alertas desta cidade.</p><div><Button variant="ghost" onClick={() => setRemover(null)}>Cancelar</Button><Button variant="danger" onClick={confirmarRemocao}>Sim, remover</Button></div></div></div>}
    {toast}
  </main>
}

function Preferences({ user, cidades, cidadeId, recarregar, go }: { user: Usuario; cidades: Cidade[]; cidadeId: number | null; recarregar: () => Promise<unknown>; go: (s: Screen) => void }) {
  const [sel, setSel] = useState<number | null>(cidadeId)
  const cidade = cidades.find((c) => c.id === sel) ?? cidades[0] ?? null
  const [horarios, setHorarios] = useState<string[]>(['06:00', '16:00'])
  const [rain, setRain] = useState(true), [frost, setFrost] = useState(true)
  const [limChuva, setLimChuva] = useState('25'), [limGeada, setLimGeada] = useState('3')
  const [saving, setSaving] = useState(false)
  const [telegram, setTelegram] = useState<{
    vinculado: boolean
    bot_username: string
    bot_configurado: boolean
    email_ativo: boolean
  } | null>(null)
  const [telegramUrl, setTelegramUrl] = useState('')
  const [telegramLoading, setTelegramLoading] = useState(true)
  const [telegramError, setTelegramError] = useState('')
  const [creatingTelegramLink, setCreatingTelegramLink] = useState(false)
  const [toast, show] = useToast()

  useEffect(() => {
    let vivo = true
    async function carregarStatusTelegram() {
      try {
        const status = await api.telegramStatus()
        if (vivo) {
          setTelegram(status)
          setTelegramError('')
          if (status.vinculado) setTelegramUrl('')
        }
      } catch (e) {
        if (vivo) setTelegramError(msgErro(e))
      } finally {
        if (vivo) setTelegramLoading(false)
      }
    }
    void carregarStatusTelegram()
    window.addEventListener('focus', carregarStatusTelegram)
    return () => {
      vivo = false
      window.removeEventListener('focus', carregarStatusTelegram)
    }
  }, [])

  useEffect(() => {
    if (!cidade) return
    const p = cidade.preferencia
    setHorarios(p.horarios_previsao)
    setRain(p.alerta_chuva_forte); setFrost(p.alerta_geada)
    setLimChuva(String(p.limiar_chuva_mm)); setLimGeada(String(p.limiar_geada_c))
  }, [cidade?.id, cidades])

  async function salvar() {
    if (!cidade) return
    const chuva = Number(limChuva.replace(',', '.')), geada = Number(limGeada.replace(',', '.'))
    if (!Number.isFinite(chuva) || chuva < 1 || chuva > 200) return show('Limite de chuva deve ficar entre 1 e 200 mm/h.', true)
    if (!Number.isFinite(geada) || geada < -10 || geada > 10) return show('Limite de geada deve ficar entre -10 e 10 °C.', true)
    if (new Set(horarios).size !== horarios.length) return show('Escolha horários diferentes para cada previsão.', true)
    setSaving(true)
    try {
      await api.salvarPreferencias(cidade.id, {
        horarios_previsao: horarios,
        alerta_chuva_forte: rain,
        alerta_geada: frost,
        limiar_chuva_mm: chuva,
        limiar_geada_c: geada,
      })
      await recarregar()
      show('Preferências salvas com sucesso.')
    } catch (e) { show(msgErro(e), true) } finally { setSaving(false) }
  }

  async function criarLinkTelegram() {
    setCreatingTelegramLink(true)
    setTelegramError('')
    try {
      const { url } = await api.criarVinculoTelegram()
      setTelegramUrl(url)
    } catch (e) {
      setTelegramError(msgErro(e))
    } finally {
      setCreatingTelegramLink(false)
    }
  }

  async function desvincularTelegram() {
    setTelegramError('')
    try {
      await api.desvincularTelegram()
      setTelegram((atual) => atual ? { ...atual, vinculado: false } : atual)
      show('Telegram desconectado.')
    } catch (e) {
      setTelegramError(msgErro(e))
    }
  }

  function adicionarHorario() {
    const candidatos = ['12:00', '20:00', '09:00', '15:00', '18:00', '08:00', '10:00', '14:00', '17:00', '21:00', '22:00']
    setHorarios((atuais) => {
      if (atuais.length >= 4) return atuais
      const sugestao = candidatos.find((hora) => !atuais.includes(hora))
        ?? Array.from({ length: 24 }, (_, hora) => `${String(hora).padStart(2, '0')}:00`).find((hora) => !atuais.includes(hora))
      return sugestao ? [...atuais, sugestao] : atuais
    })
  }

  function periodoHorario(horario: string) {
    const hora = Number(horario.slice(0, 2))
    if (hora < 5) return { nome: 'Madrugada', descricao: 'Atualização para as primeiras horas', icone: Moon }
    if (hora < 12) return { nome: 'Manhã', descricao: 'Resumo para começar o dia', icone: Sunrise }
    if (hora < 18) return { nome: 'Tarde', descricao: 'Atualização do restante do dia', icone: Sun }
    return { nome: 'Noite', descricao: 'Condições para as próximas horas', icone: Moon }
  }

  const head = <PageHead eyebrow="CONFIGURAÇÕES" title="Preferências de alerta" desc="Escolha quando e como quer ser avisado."/>
  if (!cidade) return <main className="content narrow">{head}<SemCidade go={go}/></main>

  return <main className="content narrow">
    {head}
    <section className="settings-card delivery-card">
      <div className="settings-title"><span><Sunrise/></span><div><h2>Horários das previsões</h2><p>Escolha até quatro momentos para receber uma mensagem com a previsão atualizada.</p></div></div>
      <label className="field delivery-city"><span>Cidade acompanhada</span><div className="input-wrap"><select value={cidade.id} onChange={(e) => setSel(Number(e.target.value))}>{cidades.map((c) => <option key={c.id} value={c.id}>{nomeCidade(c)}</option>)}</select></div></label>
      <div className="delivery-toolbar">
        <span className="delivery-count">{horarios.length} de 4 horários</span>
        <Button variant="secondary" disabled={horarios.length >= 4} onClick={adicionarHorario}><Plus/> Adicionar horário</Button>
      </div>
      {horarios.length === 0
        ? <div className="delivery-empty"><Sunrise/><span><strong>Nenhum horário configurado</strong><small>Adicione um horário para voltar a receber as previsões diárias.</small></span></div>
        : <div className="delivery-time-list">{horarios.map((horario, index) => {
          const periodo = periodoHorario(horario)
          const Icon = periodo.icone
          return <div className="delivery-time-row" key={index}>
            <span className="delivery-time-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="delivery-period-icon"><Icon size={19}/></span>
            <span className="delivery-time-description"><strong>{periodo.nome}</strong><small>{periodo.descricao}</small></span>
            <label className="delivery-time-input"><span className="sr-only">Horário da previsão {index + 1}</span><input type="time" value={horario} onChange={(e) => setHorarios((atuais) => atuais.map((valor, i) => i === index ? e.target.value : valor))}/></label>
            <button className="icon danger delivery-remove" aria-label={`Remover horário ${horario}`} onClick={() => setHorarios((atuais) => atuais.filter((_, i) => i !== index))}><Trash2 size={17}/></button>
          </div>
        })}</div>}
      <p className="delivery-note"><CircleAlert size={16}/> Cada mensagem é adaptada ao período do horário escolhido e enviada no minuto configurado.</p>
    </section>
    <section className="settings-card"><div className="settings-title"><span><Mail/></span><div><h2>Canal de envio</h2><p>Selecione onde deseja receber seus alertas.</p></div></div>
      <div className="channel-grid">
        <div className={`channel ${telegram?.email_ativo ? 'selected' : ''}`}>
          <Mail/><span><strong>E-mail</strong><small>{telegramLoading ? 'Verificando configuração...' : telegram?.email_ativo ? `Configurado • ${user.email}` : 'Desativado no servidor'}</small></span>
          {telegram?.email_ativo && <Check/>}
        </div>
        <div className="channel">
          <Send/>
          <span>
            <strong>Telegram</strong>
            <small>{telegramLoading ? 'Verificando vínculo...' : !telegram?.bot_configurado ? 'Bot não configurado no servidor' : telegram.vinculado ? 'Conectado' : 'Não conectado'}</small>
          </span>
          {telegram?.vinculado
            ? <Button variant="danger" onClick={desvincularTelegram}>Desconectar</Button>
            : <Button variant="secondary" disabled={telegramLoading || creatingTelegramLink || !telegram?.bot_configurado} onClick={criarLinkTelegram}>
                {creatingTelegramLink ? 'Gerando link...' : 'Conectar'}
              </Button>}
        </div>
        {telegramError && <p className="form-error">{telegramError}</p>}
        {telegramUrl && !telegram?.vinculado && <a className="btn btn-primary" href={telegramUrl} target="_blank" rel="noopener noreferrer">
          <Send/> Abrir Telegram
        </a>}
      </div>
    </section>
    <section className="settings-card"><div className="settings-title"><span><Bell/></span><div><h2>Quais alertas receber</h2><p>Você pode ajustar isso a qualquer momento.</p></div></div>
      <div className="toggle-list">
        <div><CloudRain/><span><strong>Alerta de chuva forte</strong><small>Quando a chuva ultrapassar <input inputMode="decimal" value={limChuva} onChange={(e) => setLimChuva(e.target.value)}/> mm/h</small></span><Toggle checked={rain} onChange={() => setRain(!rain)}/></div>
        <div><Snowflake/><span><strong>Alerta de geada</strong><small>Quando a mínima chegar a <input inputMode="decimal" value={limGeada} onChange={(e) => setLimGeada(e.target.value)}/> °C ou menos</small></span><Toggle checked={frost} onChange={() => setFrost(!frost)}/></div>
      </div>
    </section>
    <div className="save-bar"><p><CircleAlert/> Previsão: MET Norway com Open-Meteo como contingência. Busca de cidades: OpenStreetMap.</p><Button disabled={saving} onClick={salvar}><Check/> {saving ? 'Salvando...' : 'Salvar preferências'}</Button></div>
    {toast}
  </main>
}

function HistoryPage({ cidades, openAlerta }: { cidades: Cidade[]; openAlerta: (id: number) => void }) {
  const [cidadeF, setCidadeF] = useState(''), [tipoF, setTipoF] = useState(''), [periodoF, setPeriodoF] = useState('30')
  const [busca, setBusca] = useState(''), [buscaAtiva, setBuscaAtiva] = useState('')
  const [pagina, setPagina] = useState(1)
  const [dados, setDados] = useState<{ itens: Alerta[]; total: number; limite: number } | null>(null)
  const [erro, setErro] = useState(''), [tick, setTick] = useState(0)

  useEffect(() => { const t = setTimeout(() => { setBuscaAtiva(busca); setPagina(1) }, 300); return () => clearTimeout(t) }, [busca])
  useEffect(() => {
    let vivo = true
    setErro('')
    api.alertas({ cidadeId: cidadeF ? Number(cidadeF) : undefined, tipo: (tipoF || undefined) as Tipo | undefined, periodo: periodoF ? Number(periodoF) : undefined, busca: buscaAtiva || undefined, pagina, limite: 10 })
      .then((r) => vivo && setDados(r)).catch((e) => vivo && setErro(msgErro(e)))
    return () => { vivo = false }
  }, [cidadeF, tipoF, periodoF, buscaAtiva, pagina, tick])

  const mudar = (fn: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => { fn(e.target.value); setPagina(1) }
  const paginas = dados ? Math.max(1, Math.ceil(dados.total / dados.limite)) : 1

  return <main className="content">
    <PageHead eyebrow="ATIVIDADE" title="Histórico de alertas" desc="Acompanhe todas as mensagens enviadas para você."/>
    <div className="filters">
      <div className="search"><Search/><input placeholder="Buscar na mensagem..." value={busca} onChange={(e) => setBusca(e.target.value)}/></div>
      <select value={cidadeF} onChange={mudar(setCidadeF)}><option value="">Todas as cidades</option>{cidades.map((c) => <option key={c.id} value={c.id}>{nomeCidade(c)}</option>)}</select>
      <select value={tipoF} onChange={mudar(setTipoF)}><option value="">Todos os tipos</option>{(Object.keys(TIPO_LABEL) as Tipo[]).map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}</select>
      <select value={periodoF} onChange={mudar(setPeriodoF)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="">Todo o período</option></select>
    </div>
    {erro ? <Erro texto={erro} onRetry={() => setTick((t) => t + 1)}/> : !dados ? <Carregando texto="Carregando histórico"/> : <>
      <div className="table-card"><table><thead><tr><th>DATA E HORA</th><th>CIDADE</th><th>TIPO</th><th>STATUS</th><th>MENSAGEM</th><th></th></tr></thead>
        <tbody>
          {dados.itens.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>Nenhum alerta encontrado para estes filtros.</td></tr>}
          {dados.itens.map((a) => <tr key={a.id} onClick={() => openAlerta(a.id)}>
            <td><strong>{fmtEnvio(a.enviado_em)}</strong></td>
            <td>{nomeCidade(a.cidade)}</td>
            <td><span className={`type type-${TIPO_LABEL[a.tipo].split(' ')[0].toLowerCase()}`}>{a.tipo === 'geada' ? <Snowflake/> : a.tipo === 'chuva_forte' ? <CloudRain/> : <Sun/>}{TIPO_LABEL[a.tipo]}</span></td>
            <td><span className={`status ${a.status === 'enviado' ? 'sent' : 'failed'}`}>{a.status === 'enviado' ? 'Enviado' : 'Falhou'}</span></td>
            <td><span className="message-preview">{a.mensagem.split('\n')[0]}</span></td>
            <td>→</td>
          </tr>)}
        </tbody></table></div>
      <p className="results">Mostrando {dados.itens.length} de {dados.total} alertas</p>
      {paginas > 1 && <div className="pager"><Button variant="ghost" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</Button>Página {pagina} de {paginas}<Button variant="ghost" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Próxima</Button></div>}
    </>}
  </main>
}

type Detalhe = Alerta & { dados: Record<string, any> | null; destinatario: string }

function Detail({ alertaId, go }: { alertaId: number | null; go: (s: Screen) => void }) {
  const [a, setA] = useState<Detalhe | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    if (alertaId == null) return
    let vivo = true
    setA(null); setErro('')
    api.alerta(alertaId).then((r) => vivo && setA(r as Detalhe)).catch((e) => vivo && setErro(msgErro(e)))
    return () => { vivo = false }
  }, [alertaId])

  const voltar = <button className="back" onClick={() => go('history')}><ChevronLeft/> Voltar ao histórico</button>
  if (alertaId == null) return <main className="content narrow">{voltar}<Erro texto="Nenhum alerta selecionado."/></main>
  if (erro) return <main className="content narrow">{voltar}<Erro texto={erro}/></main>
  if (!a) return <main className="content narrow">{voltar}<Carregando texto="Carregando alerta"/></main>

  const d = a.dados ?? {}
  const linhas = a.mensagem.split('\n')
  const texto = linhas.filter((l) => !l.startsWith('- '))
  const dicas = linhas.filter((l) => l.startsWith('- ')).map((l) => l.slice(2))
  const enviado = new Date(a.enviado_em).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })

  let hero: React.ReactNode = null
  let dadosCard: [React.ElementType, string, string][] = []
  if (a.tipo === 'geada') {
    hero = <div className="frost-hero"><Snowflake/><div><small>RISCO DE GEADA</small><strong>Mínima de {r0(d.minima)}°C</strong><p>{nomeCidade(a.cidade)}</p></div></div>
    dadosCard = [[Snowflake, 'Temperatura mínima', `${r0(d.minima)}°C`], [CircleAlert, 'Seu limite', `${d.limiar_geada_c}°C`], [CalendarDays, 'Previsto para', fmtHoraPrev(d.hora_minima)], [MapPin, 'Cidade', nomeCidade(a.cidade)]]
  } else if (a.tipo === 'chuva_forte') {
    hero = <div className="frost-hero"><CloudRain/><div><small>CHUVA FORTE</small><strong>Pico de {d.pico_mm} mm/h</strong><p>{nomeCidade(a.cidade)}</p></div></div>
    dadosCard = [[CloudRain, 'Pico de chuva', `${d.pico_mm} mm/h`], [CircleAlert, 'Seu limite', `${d.limiar_chuva_mm} mm/h`], [Droplets, 'Acumulado 24h', `${d.total_24h_mm} mm`], [CalendarDays, 'Pico previsto', fmtHoraPrev(d.hora_pico)]]
  } else if (d.dia) {
    hero = <div className="frost-hero"><Sun/><div><small>PREVISÃO DIÁRIA</small><strong>{r0(d.dia.max)}° / {r0(d.dia.min)}°</strong><p>{nomeCidade(a.cidade)}</p></div></div>
    dadosCard = [[Sun, 'Máxima / mínima', `${r0(d.dia.max)}° / ${r0(d.dia.min)}°`], [Droplets, 'Chuva prevista', `${d.dia.chuva_mm} mm`], [Wind, 'Vento', `${r0(d.atual.vento_kmh)} km/h`]]
  }

  return <main className="content narrow">
    {voltar}
    <PageHead eyebrow="DETALHE DO ALERTA" title={TIPO_LABEL[a.tipo]} desc={`Enviado em ${enviado}`}/>
    <div className={`detail-status ${a.status === 'falhou' ? 'failed' : ''}`}>
      <span>{a.status === 'enviado' ? <><Check/> Enviado com sucesso</> : <><CircleAlert/> Falha no envio{a.erro ? `: ${a.erro}` : ''}</>}</span>
      <small>Para: {a.destinatario}</small>
    </div>
    <section className="message-card">
      <div className="message-head"><Logo/><span>{a.tipo === 'previsao_diaria' ? 'PREVISÃO DIÁRIA' : 'ALERTA IMPORTANTE'}</span></div>
      {hero}
      <div className="message-body">
        {texto.map((l, i) => <p key={i}>{l}</p>)}
        {dicas.length > 0 && <div className="advice"><strong>Prepare-se agora</strong><ul>{dicas.map((t) => <li key={t}>{t}</li>)}</ul></div>}
        <small>Previsão: MET Norway com Open-Meteo como contingência. Busca de cidades: OpenStreetMap.</small>
      </div>
    </section>
    {dadosCard.length > 0 && <section className="data-card"><h2>Dados que originaram o alerta</h2><div>{dadosCard.map(([I, l, v]) => <span key={l}><I/><small>{l}</small><strong>{v}</strong></span>)}</div></section>}
  </main>
}

function Messages({ cidade, go }: { cidade: Cidade | null; go: (s: Screen) => void }) {
  const [tipo, setTipo] = useState<Tipo>('previsao_diaria')
  const [enviando, setEnviando] = useState(false)
  const [canais, setCanais] = useState<Awaited<ReturnType<typeof api.telegramStatus>> | null>(null)
  const [erroCanais, setErroCanais] = useState('')
  const [toast, show] = useToast()

  useEffect(() => {
    let vivo = true
    api.telegramStatus()
      .then((status) => vivo && setCanais(status))
      .catch((e) => vivo && setErroCanais(msgErro(e)))
    return () => { vivo = false }
  }, [])

  async function testar() {
    if (!cidade) return
    setEnviando(true)
    try {
      const resultado = await api.enviarTeste(cidade.id, tipo)
      if (resultado.status === 'enviado') show('Notificação entregue por pelo menos um canal ativo. Consulte o Histórico.')
      else show(`Nenhum canal entregou a notificação. ${resultado.erro ?? 'Consulte o detalhe no Histórico.'}`, true)
    } catch (e) { show(msgErro(e), true) } finally { setEnviando(false) }
  }

  return <main className="content narrow">
    <PageHead eyebrow="TESTE REAL" title="Testar notificação" desc="Busca a previsão atual e envia pelos canais configurados para sua conta."/>
    {!cidade ? <SemCidade go={go}/> : <section className="settings-card">
      <label className="field"><span>Cidade</span><div className="input-wrap"><strong>{nomeCidade(cidade)}</strong></div></label>
      <label className="field"><span>Tipo de notificação</span><div className="input-wrap">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
          {(Object.keys(TIPO_LABEL) as Tipo[]).map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
        </select>
      </div></label>
      {erroCanais
        ? <p className="form-error">Não foi possível verificar os canais: {erroCanais}</p>
        : canais && <p className="api-note">
            <CircleAlert/> Canais: e-mail {canais.email_ativo ? 'SMTP ativo' : 'desativado'}; Telegram {
              !canais.bot_configurado ? 'bot não configurado' : canais.vinculado ? 'vinculado' : 'conta não vinculada'
            }.
          </p>}
      <p className="api-note"><CircleAlert/> O envio é real. Chuva forte ou geada só serão enviados se a previsão atual atingir o limite configurado.</p>
      <Button disabled={enviando} onClick={testar}><Send/> {enviando ? 'Enviando...' : 'Enviar notificação real'}</Button>
    </section>}
    {toast}
  </main>
}

/* ---------- raiz ---------- */
export default function App() {
  const [screen, setScreen] = useState<Screen>('auth')
  const [theme, setTheme] = useState('light')
  const [user, setUser] = useState<Usuario | null>(null)
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [cidadeId, setCidadeId] = useState<number | null>(null)
  const [alertaId, setAlertaId] = useState<number | null>(null)
  const [boot, setBoot] = useState(logado())

  const go = (s: Screen) => { setScreen(s); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  async function recarregar(preferId?: number) {
    const lista = await api.cidades()
    setCidades(lista)
    setCidadeId((atual) => preferId ?? (lista.find((c) => c.id === atual)?.id ?? lista.find((c) => c.principal)?.id ?? lista[0]?.id ?? null))
    return lista
  }

  // sessão salva (token no localStorage)
  useEffect(() => {
    if (!logado()) return
    api.me()
      .then(async (u) => { setUser(u); const l = await recarregar(); go(l.length ? 'dashboard' : 'onboarding') })
      .catch(() => api.sair())
      .finally(() => setBoot(false))
  }, [])

  async function aoAutenticar(u: Usuario, novo: boolean) {
    setUser(u)
    const l = await recarregar()
    go(novo || l.length === 0 ? 'onboarding' : 'dashboard')
  }
  function sair() { api.sair(); setUser(null); setCidades([]); setCidadeId(null); setScreen('auth') }
  const abrirAlerta = (id: number) => { setAlertaId(id); go('detail') }

  if (boot) return <div className="boot"><LoaderCircle className="spin" size={40}/></div>
  if (!user || screen === 'auth') return <Auth onAuth={aoAutenticar}/>
  if (screen === 'onboarding') return <Onboarding user={user} onDone={async (id) => { await recarregar(id); go('dashboard') }}/>

  const cidade = cidades.find((c) => c.id === cidadeId) ?? null
  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard user={user} cidade={cidade} go={go}/>,
    cities: <Cities cidades={cidades} recarregar={recarregar} setCidadeId={setCidadeId}/>,
    preferences: <Preferences user={user} cidades={cidades} cidadeId={cidadeId} recarregar={recarregar} go={go}/>,
    history: <HistoryPage cidades={cidades} openAlerta={abrirAlerta}/>,
    detail: <Detail alertaId={alertaId} go={go}/>,
    messages: <Messages cidade={cidade} go={go}/>,
  }
  return <div className={theme}><Shell screen={screen} go={go} theme={theme} setTheme={setTheme} user={user} cidades={cidades} cidadeId={cidadeId} setCidadeId={setCidadeId} sair={sair}>{pages[screen]}</Shell></div>
}
