# VidTranslate AI — MVP

MVP de tradução automática de vídeos com legenda embutida (burn-in), construído com
Next.js (App Router), Tailwind CSS (dark mode nativo), Prisma/PostgreSQL, Supabase Storage,
OpenAI Whisper + GPT-4o-mini e fluent-ffmpeg.

## ✨ Funcionalidades

- Gravação de vídeo direto do navegador (webcam + microfone) via `MediaRecorder`.
- Upload de arquivo local por drag-and-drop (.mp4, .mov).
- Escolha do idioma de destino: Inglês, Espanhol, Alemão, Francês e Chinês.
- Pipeline completo no servidor:
  1. Upload do vídeo original para o Supabase Storage.
  2. Transcrição com timestamps via **Whisper** (`whisper-1`, formato SRT).
  3. Tradução da legenda via **gpt-4o-mini**, preservando a estrutura de tempo.
  4. Burn-in (hardcode) da legenda traduzida no vídeo via **fluent-ffmpeg**.
  5. Upload do vídeo final e persistência dos registros no Postgres.
- Tela de processamento com progresso simulado por etapas.
- Tela de resultado com player HTML5 e botão de download.

## 🧱 Stack

| Camada          | Tecnologia                          |
|-----------------|--------------------------------------|
| Front-end       | Next.js 14 (App Router) + Tailwind CSS |
| Back-end        | API Routes (Node.js runtime)        |
| Banco de dados  | PostgreSQL + Prisma ORM             |
| Storage         | Supabase Storage (bucket `videos`)  |
| IA              | OpenAI Whisper + gpt-4o-mini        |
| Processamento   | fluent-ffmpeg + ffmpeg-static       |

## 📂 Estrutura de pastas

```
video-translator-app/
├── prisma/
│   ├── schema.prisma        # Modelagem: users, videos, translations
│   └── migration.sql        # SQL alternativo (rodar direto no Supabase)
├── src/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js          # Página única com máquina de estados
│   │   ├── globals.css
│   │   └── api/translate/route.js  # Pipeline completo do back-end
│   ├── components/
│   │   ├── VideoRecorder.js
│   │   ├── DropZone.js
│   │   ├── LanguageSelect.js
│   │   ├── ProcessingScreen.js
│   │   └── ResultScreen.js
│   └── lib/
│       ├── prisma.js
│       ├── supabase.js
│       ├── openai.js
│       ├── ffmpeg.js
│       ├── srt.js
│       └── languages.js
├── .env.local.example
└── package.json
```

## 🚀 Como rodar localmente

### 1. Pré-requisitos

- Node.js 18.18+
- Um projeto no [Supabase](https://supabase.com) (para Postgres + Storage)
- Uma chave de API da [OpenAI](https://platform.openai.com) com acesso a Whisper e gpt-4o-mini

### 2. Clonar e instalar dependências

```bash
cd video-translator-app
npm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.local.example .env.local
```

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # recomendado para upload server-side
DATABASE_URL="postgresql://postgres:senha@db.xxxx.supabase.co:5432/postgres"
```

> A `SUPABASE_SERVICE_ROLE_KEY` evita bloqueios de RLS ao fazer upload pelo servidor.
> Se preferir não usá-la, garanta que o bucket `videos` seja público e sem políticas restritivas de escrita.

### 4. Criar o bucket de storage

No painel do Supabase → Storage → crie um bucket público chamado **`videos`**,
ou rode o script `prisma/migration.sql` no SQL Editor (ele já inclui a criação do bucket).

### 5. Criar as tabelas no banco

**Opção A — via Prisma (recomendado se usar Postgres próprio ou Supabase com conexão direta):**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Opção B — via SQL direto no Supabase:**

Copie o conteúdo de `prisma/migration.sql` e execute no SQL Editor do painel Supabase.

### 6. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

> ⚠️ A gravação de vídeo (`getUserMedia`) exige contexto seguro (HTTPS) em produção.
> Em `localhost` funciona normalmente sem HTTPS.

## 🔍 Detalhes do pipeline (`/api/translate`)

1. **Recebe** o vídeo via `FormData` (`video`, `targetLanguage`).
2. **Faz upload** do vídeo original para `videos/originals/{id}.mp4` no Supabase.
3. **Cria** o registro em `videos` com `status = 'processing'`.
4. **Transcreve** o áudio com Whisper (`response_format: "srt"`), preservando timestamps.
5. **Traduz** o `.srt` inteiro com `gpt-4o-mini`, usando um system prompt estrito que
   proíbe alterar índices/timestamps — apenas o texto falado é traduzido.
6. **Renderiza** (burn-in) a legenda traduzida diretamente nos frames do vídeo com
   `fluent-ffmpeg` (filtro `subtitles`).
7. **Faz upload** do vídeo final para `videos/translated/{id}-{lang}.mp4`.
8. **Persiste** o registro em `translations` e atualiza `videos.status = 'completed'`.
9. Em qualquer falha, o vídeo é marcado como `status = 'failed'` e um erro claro é retornado.

## ⚠️ Notas para produção

- Vídeos longos podem exceder o tempo de execução de funções serverless (Vercel, etc.).
  Para vídeos > alguns minutos, considere mover o pipeline para uma fila/worker
  (ex: BullMQ + Redis, ou um serviço dedicado) em vez de rodar tudo numa única request.
- O limite de upload está configurado para 200MB — ajuste conforme seu plano de
  hospedagem e do Supabase Storage.
- `ffmpeg-static` baixa um binário do ffmpeg compatível com o SO no `npm install`;
  em ambientes serverless (Vercel), pode ser necessário usar uma camada/layer específica.
