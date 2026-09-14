# Izi Disponibilidade

Sistema rápido e em tempo real para votação de disponibilidade diária de escalas, turnos e rotas (motoristas, entregadores, equipes operacionais) sem necessidade de login para os participantes, com Painel Administrativo protegido por senha.

---

## 🚀 Como subir na Vercel

O projeto já está **100% configurado e pronto para a Vercel** com:
- `vercel.json` pré-configurado (Vite SPA + rotas serverless `/api/*`)
- Entrypoint Serverless em `/api/index.ts`
- Fallback em tempo real automático (WebSockets quando disponível e polling HTTP inteligente na Vercel)
- Suporte a armazenamento em memória e `/tmp` para ambientes serverless

### Opção 1: Via GitHub (Recomendado)

1. Envie este repositório para o seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New..."** -> **"Project"**.
3. Selecione o repositório do GitHub.
4. A Vercel detectará automaticamente as configurações através do `vercel.json`:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (ou `vite build`)
   - **Output Directory:** `dist`
5. *(Opcional)* Em **Environment Variables**, adicione caso queira personalizar:
   - `ADMIN_SECRET`: Chave secreta para tokens JWT/sessão
6. Clique em **Deploy**. Pronto! O site estará no ar em segundos.

### Opção 2: Via Vercel CLI (Terminal)

Se preferir subir diretamente pelo terminal:

```bash
# 1. Instale o Vercel CLI caso não tenha
npm i -g vercel

# 2. Na pasta do projeto, execute:
vercel

# 3. Para publicar diretamente em produção:
vercel --prod
```

---

## 🛠️ Executando Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento local
npm run dev

# Compilar para produção
npm run build

# Executar em produção localmente
npm start
```

---

## 🔑 Acesso Administrativo

- Por padrão, a senha inicial de administrador é `admin123`.
- No painel administrativo é possível alterar a senha a qualquer momento, criar novas enquetes, gerenciar turnos, acompanhar votos em tempo real e exportar a escala formatada para o WhatsApp.
