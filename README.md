# TempoAlerta - Frontend

Aplicacao React + Vite. Este repositorio e separado do repositorio da API.

## Rodar localmente

```powershell
npm ci
npm run dev
```

Para configurar a URL da API local, crie `.env.local`:

```text
VITE_API_URL=http://localhost:3333/api
```

## Publicar no Render

O arquivo `render.yaml` configura um Static Site gratuito. Para publicar:

1. Envie as alteracoes deste projeto para o repositorio GitHub `TempoAlerta`.
2. No Render, escolha **New +** > **Blueprint** e conecte esse repositorio.
3. O Render le `render.yaml`, instala as dependencias e publica a pasta `dist`.
4. Se a URL do servico da API for diferente de `https://tempoalerta-api.onrender.com`,
   atualize `VITE_API_URL` nas variaveis do Static Site para terminar em `/api` e
   faca um novo deploy.
5. Se a URL deste frontend for diferente de `https://tempoalerta-web.onrender.com`,
   atualize `CORS_ORIGIN` nas variaveis do servico da API com a URL do frontend,
   sem barra no final.

O frontend atual ainda usa dados de demonstracao e nao chama a API. A configuracao
publica os dois servicos e define a URL da API para quando a integracao da interface
for concluida; ela nao transforma os formularios demonstrativos em cadastro/login
reais.

O servico gratuito do Render pode ficar inativo e demorar para responder ao primeiro
acesso. A API deste projeto usa SQLite em disco temporario no plano gratuito: os dados
podem ser perdidos ao reiniciar ou fazer novo deploy. Use somente dados de teste.
