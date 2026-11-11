# OQSente?

## Executar localmente

Na raiz do projeto:

```bash
chmod +x ends/run.sh
./ends/run.sh
```

Para escolher outra porta:

```bash
PORT=8765 ./ends/run.sh
```

O mesmo servidor FastAPI carrega o modelo, responde em `/api/predict` e serve o frontend.

## Hospedagem

### Opção recomendada: AWS App Runner

O backend e o modelo são Python, então podem ser publicados juntos em um serviço como o AWS App Runner. Configure:

- **Comando de inicialização:** `uv run uvicorn main:app --app-dir ends/backend --host 0.0.0.0 --port 8000`
- **Diretório do projeto:** raiz do repositório
- **Porta:** `8000`
- **Health check:** `/api/health`

O App Runner mantém a API e o modelo no mesmo serviço e também serve o frontend. Depois do deploy, a aplicação ficará disponível na URL fornecida pela AWS.

### Frontend na Vercel e API na AWS

Também é possível publicar somente `ends/frontend` na Vercel e manter o backend na AWS:

1. Publique `ends/frontend` como um projeto estático na Vercel.
2. No arquivo `index.html`, defina `window.OQSENTE_API_URL` antes de carregar `app.js`.
3. Use a URL pública da API, como `https://sua-api.aws.com`.
4. Mantenha o CORS habilitado no backend para o domínio da Vercel.

Nesse formato, o frontend chama `https://sua-api.aws.com/api/predict` e `https://sua-api.aws.com/api/feedback`. O feedback é salvo no arquivo `ends/feedback.jsonl` e não altera nem treina automaticamente o modelo.

## Frontend separado

O frontend usa a mesma origem por padrão. Para hospedar os arquivos de `ends/frontend` em outro lugar, defina `window.OQSENTE_API_URL` antes de carregar `app.js`, apontando para a URL pública do backend, por exemplo:

```html
<script>window.OQSENTE_API_URL = "https://api.exemplo.com";</script>
<script src="/app.js"></script>
```