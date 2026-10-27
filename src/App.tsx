import { useState } from 'react'
import {
  AlertTriangle, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, CircleAlert,
  CloudRain, Droplets, Eye, EyeOff, Frost, History, Home, LoaderCircle, LogOut,
  Mail, MapPin, Menu, Moon, Plus, Search, Settings, ShieldCheck, Snowflake, Star,
  Sun, Sunrise, Trash2, User, Users, Wind, X
} from 'lucide-react'

type Screen = 'auth' | 'onboarding' | 'dashboard' | 'cities' | 'preferences' | 'history' | 'detail' | 'messages' | 'states'

const days = [
  { d: 'Hoje', icon: Sun, max: 27, min: 17, rain: 10 },
  { d: 'Ter', icon: CloudRain, max: 24, min: 16, rain: 70 },
  { d: 'Qua', icon: CloudRain, max: 22, min: 15, rain: 85 },
  { d: 'Qui', icon: Sun, max: 25, min: 14, rain: 20 },
  { d: 'Sex', icon: Sun, max: 28, min: 16, rain: 5 },
  { d: 'Sáb', icon: CloudRain, max: 26, min: 18, rain: 40 },
  { d: 'Dom', icon: Sun, max: 29, min: 19, rain: 10 },
]

const alerts = [
  { id: 1, date: 'Hoje, 06:00', city: 'Campinas, SP', type: 'Previsão diária', status: 'Enviado', msg: 'Bom dia, Carlos! Hoje teremos sol entre nuvens...' },
  { id: 2, date: '12 jun, 18:42', city: 'Holambra, SP', type: 'Chuva forte', status: 'Enviado', msg: 'Atenção: chuva forte prevista nas próximas 2 horas...' },
  { id: 3, date: '10 jun, 05:30', city: 'Campinas, SP', type: 'Geada', status: 'Enviado', msg: 'Alerta de geada: mínima prevista de 2°C para amanhã...' },
  { id: 4, date: '09 jun, 06:00', city: 'Campinas, SP', type: 'Previsão diária', status: 'Falhou', msg: 'Bom dia! A previsão para hoje indica tempo firme...' },
]

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

function Auth({ go }: { go: (s: Screen) => void }) {
  const [signup, setSignup] = useState(false)
  const [show, setShow] = useState(false)
  return <main className="auth-page">
    <section className="auth-brand">
      <Logo/>
      <div>
        <span className="eyebrow light">PREVISÃO QUE CHEGA ATÉ VOCÊ</span>
        <h1>Prepare-se antes<br/>do tempo mudar.</h1>
        <p>Alertas simples e confiáveis para proteger sua produção e seus eventos.</p>
        <div className="brand-points"><span><ShieldCheck/> Alertas antecipados</span><span><Mail/> Direto no seu e-mail</span></div>
      </div>
      <div className="weather-art"><CloudRain/><span>18°</span><small>Chuva forte em 2h</small></div>
    </section>
    <section className="auth-form">
      <div className="mobile-logo"><Logo/></div>
      <div className="form-box">
        <span className="eyebrow">{signup ? 'CRIE SUA CONTA' : 'BEM-VINDO DE VOLTA'}</span>
        <h2>{signup ? 'Comece a se prevenir' : 'Acesse sua conta'}</h2>
        <p>{signup ? 'Leva menos de dois minutos.' : 'Seus alertas continuam cuidando do que importa.'}</p>
        {signup && <Field label="Nome completo" icon={User} placeholder="Como podemos chamar você?"/>}
        <Field label="E-mail" icon={Mail} type="email" placeholder="voce@exemplo.com"/>
        <Field label="Senha" icon={show ? EyeOff : Eye} type={show ? 'text' : 'password'} placeholder="Mínimo de 8 caracteres" onFocus={()=>{}}/>
        <div className="form-meta">
          <label><input type="checkbox"/> Lembrar de mim</label>
          {!signup && <button>Esqueci minha senha</button>}
          <button className="show-password" onClick={()=>setShow(!show)}>{show ? 'Ocultar' : 'Mostrar'} senha</button>
        </div>
        <Button className="full" onClick={()=> signup ? go('onboarding') : go('dashboard')}>{signup ? 'Criar minha conta' : 'Entrar'} <ChevronDown className="arrow-right" size={18}/></Button>
        <p className="switch">{signup ? 'Já possui uma conta?' : 'Ainda não tem uma conta?'} <button onClick={()=>setSignup(!signup)}>{signup ? 'Entrar' : 'Cadastre-se grátis'}</button></p>
      </div>
    </section>
  </main>
}

function Onboarding({ go }: { go: (s: Screen) => void }) {
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState('rural')
  return <main className="onboarding">
    <header><Logo/><span>Passo {step} de 3</span></header>
    <div className="progress"><i style={{width:`${step*33.33}%`}}/></div>
    <section className="onboard-card">
      {step === 1 && <>
        <span className="step-icon"><Users/></span><h1>Como você usa a previsão?</h1><p>Vamos personalizar seus alertas para o que realmente importa.</p>
        <div className="profile-grid">
          <button className={profile==='rural'?'selected':''} onClick={()=>setProfile('rural')}><span>🌱</span><strong>Produtor Rural</strong><small>Geada, chuva forte e apoio à produção</small>{profile==='rural'&&<Check/>}</button>
          <button className={profile==='event'?'selected':''} onClick={()=>setProfile('event')}><span>⛺</span><strong>Organizador de Eventos</strong><small>Chuva, vento e planejamento</small>{profile==='event'&&<Check/>}</button>
        </div>
      </>}
      {step === 2 && <>
        <span className="step-icon"><MapPin/></span><h1>Qual cidade quer acompanhar?</h1><p>Você poderá adicionar outras cidades depois.</p>
        <Field label="Busque uma cidade" icon={Search} placeholder="Digite o nome da cidade"/>
        <button className="city-result"><MapPin/><span><strong>Campinas</strong><small>São Paulo, Brasil • -22.90, -47.06</small></span><Check/></button>
        <p className="api-note"><CircleAlert/> Busca de cidades com geocodificação e coordenadas.</p>
      </>}
      {step === 3 && <>
        <span className="step-icon"><Sunrise/></span><h1>Que horas devemos avisar?</h1><p>Enviaremos a previsão diária no horário que funciona para você.</p>
        <label className="time-choice"><span>Horário de envio</span><input type="time" defaultValue="06:00"/></label>
        <div className="summary"><Mail/><span><strong>Resumo diário às 06:00</strong><small>para Campinas, SP • via e-mail</small></span></div>
      </>}
      <div className="onboard-actions">{step>1 && <Button variant="ghost" onClick={()=>setStep(step-1)}><ChevronLeft/> Voltar</Button>}<Button onClick={()=> step<3 ? setStep(step+1) : go('dashboard')}>{step===3?'Ver meu painel':'Continuar'} <span>→</span></Button></div>
    </section>
  </main>
}

function Shell({ screen, go, theme, setTheme, children }: { screen: Screen, go:(s:Screen)=>void, theme:string, setTheme:(v:string)=>void, children:React.ReactNode }) {
  const nav = [
    ['dashboard','Visão geral',Home], ['cities','Minhas cidades',MapPin], ['preferences','Preferências',Settings],
    ['history','Histórico',History], ['messages','Mensagens',Mail], ['states','Estados da UI',CircleAlert]
  ] as const
  return <div className="app-shell">
    <aside>
      <Logo/>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={screen===id?'active':''} onClick={()=>go(id)}><Icon/>{label}</button>)}</nav>
      <div className="aside-bottom"><button onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}{theme==='dark'?'Tema claro':'Tema escuro'}</button><button onClick={()=>go('auth')}><LogOut/>Sair</button><div className="profile"><span>CR</span><div><strong>Carlos Ribeiro</strong><small>Produtor rural</small></div></div></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><button className="menu"><Menu/></button><div className="top-city"><MapPin/><span><small>Cidade principal</small><strong>Campinas, SP</strong></span><ChevronDown/></div><div className="top-actions"><button onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}</button><button className="bell"><Bell/><i>2</i></button><span className="avatar">CR</span></div></header>
      {children}
    </section>
    <nav className="bottom-nav">{nav.slice(0,5).map(([id,label,Icon])=><button key={id} className={screen===id?'active':''} onClick={()=>go(id)}><Icon/><span>{label.split(' ')[0]}</span></button>)}</nav>
  </div>
}

function PageHead({ eyebrow, title, desc, action }: {eyebrow:string,title:string,desc:string,action?:React.ReactNode}) {
  return <div className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{desc}</p></div>{action}</div>
}

function Dashboard({ go }: {go:(s:Screen)=>void}) {
  return <main className="content">
    <PageHead eyebrow="SEGUNDA-FEIRA, 16 DE JUNHO" title="Bom dia, Carlos!" desc="Aqui está o que o tempo reserva para você hoje."/>
    <div className="alert-banner"><span><AlertTriangle/></span><div><strong>Chuva forte prevista para hoje</strong><p>Entre 16h e 19h • Acumulado de até 32 mm</p></div><Button variant="secondary" onClick={()=>go('detail')}>Ver detalhes</Button><button className="close"><X/></button></div>
    <section className="dashboard-grid">
      <div className="current-weather">
        <div className="weather-top"><div><span className="location"><MapPin/> Campinas, SP</span><h2>24<span>°C</span></h2><strong>Parcialmente nublado</strong><p>Sensação térmica de 25°C</p></div><div className="big-weather"><Sun/><CloudRain/></div></div>
        <div className="metrics"><div><CloudRain/><span><small>CHUVA</small><strong>70%</strong></span></div><div><Wind/><span><small>VENTO</small><strong>14 km/h</strong></span></div><div><Droplets/><span><small>UMIDADE</small><strong>78%</strong></span></div><div><Sunrise/><span><small>MÍN. / MÁX.</small><strong>17° / 27°</strong></span></div></div>
        <small className="source">Dados atualizados há 8 min • Open-Meteo</small>
      </div>
      <div className="side-card"><div className="side-icon good"><ShieldCheck/></div><span className="eyebrow">STATUS GERAL</span><h3>Condições favoráveis</h3><p>Sem risco de geada nas próximas 48 horas.</p><div className="mini-status"><Snowflake/><span><small>Menor temperatura</small><strong>14°C na quinta-feira</strong></span></div></div>
    </section>
    <section className="forecast card"><div className="section-title"><div><span className="eyebrow">PRÓXIMOS DIAS</span><h2>Previsão de 7 dias</h2></div><span className="updated">Atualizado agora</span></div><div className="forecast-row">{days.map(({d,icon:Icon,max,min,rain})=><div className={d==='Hoje'?'today':''} key={d}><strong>{d}</strong><Icon/><span><b>{max}°</b> {min}°</span><small><Droplets/> {rain}%</small></div>)}</div></section>
  </main>
}

function Cities() {
  const [modal,setModal]=useState(false)
  const [toast,setToast]=useState(false)
  return <main className="content">
    <PageHead eyebrow="LOCALIZAÇÕES" title="Minhas cidades" desc="Gerencie os locais que você acompanha." action={<Button onClick={()=>setToast(true)}><Plus/> Adicionar cidade</Button>}/>
    <div className="city-list">
      {[['Campinas','São Paulo','-22.90, -47.06',true],['Holambra','São Paulo','-22.63, -47.05',false]].map((c)=><article className="city-card" key={c[0] as string}><div className="city-weather"><Sun/>24°</div><div><span className="eyebrow">{c[3]?'CIDADE PRINCIPAL':'CIDADE MONITORADA'}</span><h2>{c[0]}, {c[1]}</h2><p><MapPin/> {c[2]} • Geocodificação ativa</p></div><div className="city-actions">{!c[3]&&<Button variant="secondary"><Star/> Definir principal</Button>}<button className="icon danger" onClick={()=>setModal(true)}><Trash2/></button></div></article>)}
    </div>
    {modal&&<div className="modal-backdrop"><div className="modal"><span className="modal-icon"><Trash2/></span><h2>Remover Holambra?</h2><p>Você deixará de receber previsões e alertas desta cidade.</p><div><Button variant="ghost" onClick={()=>setModal(false)}>Cancelar</Button><Button variant="danger" onClick={()=>setModal(false)}>Sim, remover</Button></div></div></div>}
    {toast&&<div className="toast"><Check/> Busca de cidade aberta com sucesso.<button onClick={()=>setToast(false)}><X/></button></div>}
  </main>
}

function Preferences() {
  const [daily,setDaily]=useState(true), [rain,setRain]=useState(true), [frost,setFrost]=useState(true), [saved,setSaved]=useState(false)
  return <main className="content narrow">
    <PageHead eyebrow="CONFIGURAÇÕES" title="Preferências de alerta" desc="Escolha quando e como quer ser avisado."/>
    <section className="settings-card"><div className="settings-title"><span><Sunrise/></span><div><h2>Envio diário</h2><p>Defina o melhor horário para receber sua previsão.</p></div></div><div className="form-grid"><label className="field"><span>Cidade</span><div className="select">Campinas, SP <ChevronDown/></div></label><Field label="Horário preferido" type="time" defaultValue="06:00"/></div></section>
    <section className="settings-card"><div className="settings-title"><span><Mail/></span><div><h2>Canal de envio</h2><p>Selecione onde deseja receber seus alertas.</p></div></div><div className="channel-grid"><button className="channel selected"><Mail/><span><strong>E-mail</strong><small>Ativo • carlos@email.com</small></span><Check/></button><button className="channel" disabled><span className="wa">W</span><span><strong>WhatsApp / SMS</strong><small>Em breve</small></span><span className="soon">EM BREVE</span></button></div></section>
    <section className="settings-card"><div className="settings-title"><span><Bell/></span><div><h2>Quais alertas receber</h2><p>Você pode ajustar isso a qualquer momento.</p></div></div>
      <div className="toggle-list">
        <div><Sun/><span><strong>Previsão diária</strong><small>Resumo completo do dia no horário escolhido</small></span><Toggle checked={daily} onChange={()=>setDaily(!daily)}/></div>
        <div><CloudRain/><span><strong>Alerta de chuva forte</strong><small>Quando a chuva ultrapassar <input defaultValue="25"/> mm/h</small></span><Toggle checked={rain} onChange={()=>setRain(!rain)}/></div>
        <div><Snowflake/><span><strong>Alerta de geada</strong><small>Quando a mínima chegar a <input defaultValue="3"/> °C ou menos</small></span><Toggle checked={frost} onChange={()=>setFrost(!frost)}/></div>
      </div>
    </section>
    <div className="save-bar"><p><CircleAlert/> Dados meteorológicos fornecidos pela Open-Meteo.</p><Button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2500)}}><Check/> Salvar preferências</Button></div>
    {saved&&<div className="toast"><Check/> Preferências salvas com sucesso.</div>}
  </main>
}

function HistoryPage({ go }: {go:(s:Screen)=>void}) {
  return <main className="content">
    <PageHead eyebrow="ATIVIDADE" title="Histórico de alertas" desc="Acompanhe todas as mensagens enviadas para você."/>
    <div className="filters"><div className="search"><Search/><input placeholder="Buscar na mensagem..."/></div>{['Todas as cidades','Todos os tipos','Últimos 30 dias'].map(x=><button key={x}>{x}<ChevronDown/></button>)}</div>
    <div className="table-card"><table><thead><tr><th>DATA E HORA</th><th>CIDADE</th><th>TIPO</th><th>STATUS</th><th>MENSAGEM</th><th></th></tr></thead><tbody>{alerts.map(a=><tr key={a.id} onClick={()=>go('detail')}><td><strong>{a.date}</strong></td><td>{a.city}</td><td><span className={`type type-${a.type.split(' ')[0].toLowerCase()}`}>{a.type==='Geada'?<Snowflake/>:a.type==='Chuva forte'?<CloudRain/>:<Sun/>}{a.type}</span></td><td><span className={`status ${a.status==='Enviado'?'sent':'failed'}`}>{a.status}</span></td><td><span className="message-preview">{a.msg}</span></td><td>→</td></tr>)}</tbody></table></div>
    <p className="results">Mostrando 4 de 38 alertas</p>
  </main>
}

function Detail({ go }: {go:(s:Screen)=>void}) {
  return <main className="content narrow">
    <button className="back" onClick={()=>go('history')}><ChevronLeft/> Voltar ao histórico</button>
    <PageHead eyebrow="DETALHE DO ALERTA" title="Alerta de geada" desc="Enviado em 10 de junho de 2025, às 05:30"/>
    <div className="detail-status"><span><Check/> Enviado com sucesso</span><small>Para: carlos.ribeiro@email.com</small></div>
    <section className="message-card"><div className="message-head"><Logo/><span>ALERTA IMPORTANTE</span></div><div className="frost-hero"><Snowflake/><div><small>RISCO DE GEADA</small><strong>Mínima de 2°C</strong><p>Campinas, SP • madrugada de quarta-feira</p></div></div><div className="message-body"><p>Olá, Carlos.</p><p>A temperatura pode chegar a <strong>2°C entre 3h e 6h</strong>. Há condições favoráveis para formação de geada.</p><div className="advice"><strong>Prepare-se agora</strong><ul><li>Proteja mudas e cultivos sensíveis</li><li>Evite irrigação durante a madrugada</li><li>Verifique animais em áreas abertas</li></ul></div><small>Este alerta foi gerado com dados da Open-Meteo porque a mínima prevista ficou abaixo do seu limite de 3°C.</small></div></section>
    <section className="data-card"><h2>Dados que originaram o alerta</h2><div><span><Snowflake/><small>Temperatura mínima</small><strong>2°C</strong></span><span><Droplets/><small>Umidade</small><strong>88%</strong></span><span><Wind/><small>Vento</small><strong>4 km/h</strong></span><span><CalendarDays/><small>Previsão para</small><strong>11 jun, 04h</strong></span></div></section>
  </main>
}

function Messages() {
  const [tab,setTab]=useState('daily')
  return <main className="content narrow"><PageHead eyebrow="PRÉVIA" title="Como suas mensagens chegam" desc="Exemplos de e-mails enviados pelo TempoAlerta."/>
    <div className="tabs"><button className={tab==='daily'?'active':''} onClick={()=>setTab('daily')}>Previsão diária</button><button className={tab==='frost'?'active':''} onClick={()=>setTab('frost')}>Alerta de geada</button></div>
    <section className="email-preview"><div className="email-bar"><span/><span/><span/><small>Prévia do e-mail</small></div><div className="email-inner"><Logo/><p>Olá, Carlos. Aqui está sua previsão para Campinas.</p>{tab==='daily'?<><div className="email-weather"><Sun/><span><small>HOJE, 16 DE JUNHO</small><strong>24°C</strong><p>Sol entre nuvens • Máx. 27° / Mín. 17°</p></span></div><div className="email-alert"><CloudRain/><span><strong>70% de chance de chuva</strong><small>Maior probabilidade entre 16h e 19h.</small></span></div></>:<div className="frost-hero"><Snowflake/><div><small>ALERTA DE GEADA</small><strong>Mínima de 2°C</strong><p>Proteja cultivos sensíveis durante a madrugada.</p></div></div>}</div></section>
  </main>
}

function States() {
  return <main className="content"><PageHead eyebrow="SISTEMA" title="Estados da interface" desc="Respostas claras para qualquer situação."/>
    <div className="state-grid"><article><LoaderCircle className="spin"/><h2>Atualizando previsão</h2><p>Buscando os dados mais recentes na Open-Meteo...</p></article><article><Search/><h2>Cidade não encontrada</h2><p>Confira a ortografia ou tente buscar uma cidade próxima.</p><Button variant="secondary">Tentar novamente</Button></article><article className="error"><CircleAlert/><h2>Previsão indisponível</h2><p>A API meteorológica está instável. Seus alertas continuam ativos.</p><Button variant="secondary">Recarregar dados</Button></article><article><MapPin/><h2>Nenhuma cidade ainda</h2><p>Adicione uma cidade para começar a receber previsões.</p><Button><Plus/> Adicionar cidade</Button></article></div>
  </main>
}

export default function App() {
  const [screen,setScreen] = useState<Screen>('auth')
  const [theme,setTheme] = useState('light')
  const go=(s:Screen)=>{setScreen(s);window.scrollTo({top:0,behavior:'smooth'})}
  if(screen==='auth') return <Auth go={go}/>
  if(screen==='onboarding') return <Onboarding go={go}/>
  const pages:Record<string,React.ReactNode>={dashboard:<Dashboard go={go}/>,cities:<Cities/>,preferences:<Preferences/>,history:<HistoryPage go={go}/>,detail:<Detail go={go}/>,messages:<Messages/>,states:<States/>}
  return <div className={theme}><Shell screen={screen} go={go} theme={theme} setTheme={setTheme}>{pages[screen]}</Shell></div>
}
