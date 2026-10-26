# Lista Missionária — Elder Modesto

Site do chá missionário: convite, lista de itens com progresso das doações,
contribuição via PIX e painel administrativo.

Feito com Next.js 16, React 19 e Supabase.

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env.local` na raiz com:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=            # URL do projeto no Supabase
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=# chave pública (publishable)
   SUPABASE_SECRET_KEY=                 # chave secreta (só no servidor)
   ADMIN_PASSWORD=                      # senha do painel /admin
   ADMIN_SESSION_SECRET=                # texto aleatório com 32+ caracteres
   NEXT_PUBLIC_SITE_URL=                # opcional: endereço do site, para o preview no WhatsApp
   ```

3. Suba o servidor e abra http://localhost:3000:

   ```bash
   npm run dev
   ```

## Estrutura

- `app/page.tsx` — página pública (convite, PIX, lista de itens)
- `app/admin/page.tsx` — painel: cadastrar/editar itens e ver/desfazer doações
- `app/api/` — rotas da API (itens, doações, login do admin)
- `lib/` — clientes do Supabase, sessão do admin e limite de requisições

## Banco de dados (Supabase)

- `items` — itens da lista (`name`, `category`, `quantity`)
- `donations` — doações registradas (`item_id`, `donor_name`, `quantity`)
- `item_progress` — view com o total doado e o que falta de cada item
- `register_donation` — função usada para registrar uma doação

Itens com `(PIX)` ou `(SE POSSÍVEL PIX)` no nome aparecem com o selo de PIX
na lista e mostram a chave na hora de contribuir.
