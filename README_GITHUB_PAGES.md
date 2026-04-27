# Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie estes arquivos para a raiz do repositório.
3. No GitHub, entre em `Settings > Pages`.
4. Em `Build and deployment`, escolha `Deploy from a branch`.
5. Em `Branch`, selecione `main` e a pasta `/root`.
6. Salve e aguarde o link do GitHub Pages ficar disponível.

Arquivos principais:

- `index.html`: tela inicial.
- `apresentacao.html`: dashboard dos indicadores gerais.
- `colaboradores.html`: dashboard N1/N2 por semana.

O sistema importa CSV/XLSX diretamente no navegador e usa CDNs para SheetJS e Chart.js.
