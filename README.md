# SocialMediaAutoPublisher

Sistema para automatizar a publicação de vídeos curtos no YouTube e acompanhar o que foi postado sem depender de processo manual o tempo todo.

A ideia aqui é simples: você sobe o vídeo, o backend cuida da fila, publica no momento certo e o frontend mostra o que já foi publicado, com status e métricas básicas. O projeto também organiza usuários, nichos e a conexão com a conta Google/YouTube.

## Sobre o projeto

Este repositório é dividido em duas partes:

- `backend`: API em NestJS com Prisma, autenticação, automação de publicação e coleta de métricas.
- `frontend`: painel em Next.js para acompanhar posts, usuários e o estado geral da aplicação.

O fluxo principal funciona assim:

1. O vídeo entra pela pasta de entrada ou por uma publicação enviada pela API.
2. O backend move esse arquivo para a etapa de processamento/fila.
3. Quando chega a hora, o vídeo é publicado no YouTube.
4. Depois disso, o sistema passa a consultar as métricas do vídeo e salva snapshots no banco.
5. O frontend lê esses dados e mostra o resultado no painel.

## O que o sistema faz

- autenticação com JWT;
- login com Google para conectar a conta YouTube;
- cadastro, edição e exclusão de usuários;
- cadastro e gestão de nichos;
- importação de vídeos para publicação;
- publicação automática de Shorts no YouTube;
- coleta periódica de visualizações, curtidas e comentários;
- painel com visão geral dos posts e status de publicação.

## Tecnologias usadas

- **Backend:** NestJS, Prisma, PostgreSQL, Google APIs, Schedule/Cron, Passport, JWT, Docker
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS

## Como o projeto está organizado

```text
backend/
  src/
    modules/
      auth/
      users/
      niches/
      posts/
  prisma/
  uploads/

frontend/
  app/
    components/
    posts/
    users/
    login/
    cadastro/
```

## Como rodar localmente

Você vai precisar de dois terminais: um para o backend e outro para o frontend.

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variáveis de ambiente

### Backend

As principais variáveis usadas no backend são:

- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `FRONTEND_URL`
- `FRONTEND_GOOGLE_REDIRECT_PATH` *(opcional)*
- `AUTO_POST_USER_ID` *(opcional)*
- `AUTO_POST_NICHE_ID` *(opcional)*
- `LOCAL_VIDEO_INBOX_DIR` *(opcional)*
- `LOCAL_VIDEO_QUEUE_DIR` *(opcional)*
- `LOCAL_VIDEO_PROCESSING_DIR` *(opcional)*
- `LOCAL_VIDEO_PUBLISHED_DIR` *(opcional)*

### Frontend

- `NEXT_PUBLIC_API_URL`

## Fluxo de publicação

O projeto trabalha com uma automação bem prática:

- vídeos colocados na pasta de entrada são importados automaticamente;
- o cron do backend organiza o arquivo e vincula ao post pendente;
- a publicação no YouTube acontece quando o agendamento permite;
- depois de publicado, o sistema salva o link do vídeo e começa a acompanhar as métricas;
- o frontend mostra o link do vídeo publicado e os números mais recentes encontrados.

## Rotas principais da API

Algumas rotas importantes do backend:

- `POST /auth/login`
- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /posts`
- `GET /posts/overview`
- `POST /posts/upload-video`
- `POST /posts/import-youtube-url`
- `GET /users`
- `GET /users/:id/youtube-connection`
- `DELETE /users/:id/youtube-connection`

## Observações importantes

- O projeto depende de uma conta Google/YouTube com os escopos corretos para publicar e ler métricas.
- Os números de views, curtidas e comentários não são em tempo real; eles são atualizados por coleta periódica.
- Os vídeos publicados podem aparecer no painel com o link direto do YouTube.

## Licença

Projeto em desenvolvimento para uso próprio.
