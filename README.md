# ContratosPro — Sistema de Gestão de Contratos

Sistema web completo para controle e acompanhamento de contratos, desenvolvido para uso em equipe com armazenamento local (localStorage).

## ✨ Funcionalidades

- **Painel (Dashboard)**: KPIs financeiros, gráficos de distribuição por fonte e previsto vs pago
- **Cadastro de Contratos**: Todos os campos da planilha (contrato, OS, unidade, ano, fonte, valor total, execução mensal — previsto, pago e glosa para cada mês)
- **Pesquisa Avançada**: Por número de contrato, empresa, objeto, ano, fonte e valor mínimo pago
- **Visualização Detalhada**: Modal com resumo financeiro e tabela mensal por contrato
- **Relatórios**: Por contrato, por período (mês), por fonte de recurso ou geral consolidado
- **Exportação**: CSV para Excel/Google Sheets
- **Importação**: CSV ou JSON, com pré-visualização
- **Impressão**: Relatórios e fichas de contrato formatados para impressão
- **Paginação**: Listagem com navegação por páginas

## 📁 Estrutura

```
sistema-contratos/
├── index.html      # Estrutura principal
├── style.css       # Estilos e design system
├── app.js          # Lógica da aplicação
└── README.md
```

## 🚀 Como usar

### GitHub Pages
1. Faça o fork ou clone deste repositório
2. Vá em **Settings → Pages**
3. Em **Source**, selecione `main` e pasta `/root`
4. Acesse via `https://seu-usuario.github.io/nome-do-repo`

### Localmente
Basta abrir o arquivo `index.html` no navegador. Não precisa de servidor.

## 💾 Armazenamento

Os dados são salvos no **localStorage** do navegador. Isso significa:
- Cada usuário tem sua própria base local
- Para compartilhar dados entre usuários, use a função **Importar/Exportar CSV**
- Recomendado: exporte o CSV semanalmente como backup

## 📋 Campos por Contrato

| Campo | Descrição |
|-------|-----------|
| Nº Contrato | Identificador do contrato (ex: 01/2024) |
| OS / Empresa | Nome da organização social |
| Unidade / Objeto | Objeto ou unidade do contrato |
| Ano | Ano de competência |
| Fonte | Federal, Estadual, Municipal ou Próprio |
| Valor Total | Valor total contratado |
| Jan–Dez Previsto | Valor previsto por mês |
| Jan–Dez Pago | Valor efetivamente pago por mês |
| Jan–Dez Glosa | Valor glosado por mês |
| Observações | Campo livre para anotações |

## 📊 Relatórios disponíveis

- **Por Contrato**: Totais de cada contrato no período selecionado
- **Por Período**: Totais agrupados por mês
- **Por Fonte**: Totais agrupados por fonte de recurso
- **Geral Consolidado**: Visão completa de todos os contratos

## 🔄 Importação CSV

Formato esperado do cabeçalho:
```
contrato,os,unidade,ano,fonte,valor_total,jan_prev,jan_pago,jan_glosa,fev_prev,...,obs
```

Baixe o modelo pelo botão **"Baixar Modelo CSV"** na tela de importação.

## 🛠 Tecnologias

- HTML5 / CSS3 / JavaScript (ES6+)
- [Chart.js 4](https://www.chartjs.org/) — Gráficos
- [Google Fonts](https://fonts.google.com/) — Fontes (Sora + JetBrains Mono)
- LocalStorage — Persistência de dados

## 📱 Responsivo

Compatível com desktop, tablet e mobile.

---

Desenvolvido para uso interno do Setor de Contratos.
