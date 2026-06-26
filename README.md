# Financial Model Calculator — Brazil

Local desktop web application adapted from Backup D for Brazil.

## Main Brazil adaptations

- Currency is fixed to **BRL**.
- Interface languages: **Português (Brasil)** and **English**.
- Operating Expenses include a fixed **Assistente** row:
  - monthly commission below 3,000 BRL → 250 BRL;
  - monthly commission equal to or above 3,000 BRL → 500 BRL.
- Revenue distribution rules:
  - Até 3.000 BRL → 0%
  - De 3.000 até 4.999 BRL → 10%
  - De 5.000 até 6.999 BRL → 15%
  - De 7.000 até 8.999 BRL → 20%
  - De 9.000 até 10.999 BRL → 25%
  - De 11.000 BRL e acima → 30%
- Revenue Distribution labels:
  - Porcentagem da taxa de uso de tecnologia
  - Taxa de uso de tecnologia em R$
  - Percentual do parceiro (%)
  - Receita do parceiro (R$)

## How to run

Open `index.html` in a modern desktop browser.

## Architecture

- `index.html` — app shell
- `styles.css` — dashboard styling
- `app.js` — application state and interactions
- `financial-engine.js` — calculation engine
- `ui-renderer.js` — table, inputs, KPI, summary rendering
- `charts.js` — Chart.js rendering and large chart modal
- `localization.js` — English and Portuguese-Brazil dictionaries
- `scenario-manager.js` — built-in and custom scenarios
- `storage.js` — local autosave
- `validation.js` — input validation
- `export.js` — PDF and Excel export

## Formula logic

1. Month 12 orders per day = Population × Population Using Service (%).
2. Monthly orders = Orders per day × 30.
3. Gross Ride Value = Monthly orders × Average Ride Price.
4. Commission from Completed Rides = Gross Ride Value × Commission (%).
5. Technology Use Fee Share is determined by the Brazilian threshold table.
6. Partner Revenue = Commission − Technology Use Fee.
7. Operating Expenses = Marketing & Advertising Investment + fixed/dynamic expense rows.
8. Net Profit = Partner Revenue − Operating Expenses.
