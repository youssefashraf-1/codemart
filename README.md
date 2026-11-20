# CodeMart

An Angular storefront and bootcamp workspace for GIU ICS 511, Web Programming, Winter 2026. This is the Milestone 1 implementation of Idea 4, with Web, Data and Cyber cohorts, three-part tuition plans, and a digital product store. The three-page submission report is in [docs](docs/CodeMart-Milestone-1.pdf).

## Run locally

Use Node.js 24.15 or later in the Node 24 release line and Chrome for browser tests.

```sh
npm ci
npm start
```

Open http://localhost:4200 in your browser. The app needs localhost or HTTPS for browser cryptography.

```sh
npm run test:ci
npm run build
```

Set `CHROME_BIN` to the Chrome executable if Karma cannot locate Chrome. A production build is generated in `dist/codemart/browser`. It can be served by any static host. For project-path hosting, build with `npm run build -- --base-href ./`.

## Try the demo

The login page has buttons that fill the sample credentials. Each username uses the demo password `Demo@2026`.

| Username  | Role       | Access                                                                                      |
| --------- | ---------- | ------------------------------------------------------------------------------------------- |
| `student` | Student    | Profile, enrollment, own fees and payments, digital checkout and downloads                  |
| `finance` | Accounting | Issue invoices, mark payments, manage departmental budgets and payroll, export monthly JSON |
| `admin`   | Admin      | Finance tools plus control of prices, instructors and product visibility in the catalog     |

After signing in as a student, buy **Angular in Practice** and pay an unpaid installment. Switch to Accounting in the same browser tab to see the new sale and fee receipt in Finance. The EGP 1,250 course adds an EGP 150 royalty to Dina Sami’s payroll. Use **Export JSON** for the monthly department report or **Payroll JSON** for instructor pay.

## Storage and reporting

- **Local storage** retains mock accounts, photos, invoices, plans, orders, payroll, and finance and catalog entries across reloads. New passwords use salted PBKDF2. Order lines capture the product price and royalty at purchase time so catalog edits preserve order history.
- **Session storage** retains the account identifier and per-account shopping bags within the tab. Signing out clears the active account. A guest bag is carried into a student login.
- **A first-party cookie** remembers the last chosen track for 30 days so the catalog can open with a relevant filter. It carries no credentials or payment data.
- **Sound effects** play short tones for successful and failed actions. The on/off choice is a device preference kept in local storage.
- **The CodeMart assistant** (bottom-left chat) answers questions about cohorts, fees, the store and finance tools. It works offline from catalog data, or with a Together AI key pasted under **AI key**. The key and the conversation stay in session storage, so they are cleared when the tab closes, and only public catalog facts and the visitor's role are sent to Together AI.
- **Finance totals** count installments on their payment date and sales on their order date. Monthly expenses include operating costs and net instructor pay. Dates are recorded in the Cairo time zone.

The app uses simulated identities, role checks and payments in the browser. Browser data can be inspected and edited by its user. Use sample profile details and test cards. Clear the site’s browser data to restore the seeded records.
