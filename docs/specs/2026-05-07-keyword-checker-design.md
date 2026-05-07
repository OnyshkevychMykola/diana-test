# Keyword Checker — Design Spec

**Date:** 2026-05-07
**Status:** Approved
**Owner:** vitech

---

## 1. Goal

Невеликий вебінструмент для контент-менеджерів / SEO-спеціалістів: вставити великий текст і список ключових слів і миттєво побачити які ключі відсутні і яких занадто багато.

## 2. Functional Requirements

### 2.1 Inputs

- **Text** — довільний текст, типово 1000–7000 слів. Підтримка будь-якої мови (Latin / Cyrillic / mixed).
- **Keywords** — список ключових слів, по одному в рядку. Кожен рядок може містити необов'язкову вимогу до кількості входжень: точне число або діапазон `N-M`. Роздільниками між словом і числом можуть бути ` - `, `:` або просто пробіл.

  Приклади валідних рядків:
  ```
  kayaking tour - 3        # рівно 3 входження
  hiking: 2                # рівно 2 входження
  fishing 5                # рівно 5 входжень
  bonus code 5-10          # від 5 до 10 входжень (діапазон)
  bonus code: 5-10         # те саме з явним роздільником
  whitewater rafting       # default: 1–2 входження
  туризм - 4               # рівно 4 входження
  ```

  Внутрішня модель: кожен ключ має `[requiredMin, requiredMax]` window. Mapping з вводу:
  | Ввід | requiredMin | requiredMax |
  |---|---|---|
  | `word` | 1 | 2 |
  | `word - N` / `word: N` / `word N` | N | N |
  | `word - N-M` / `word: N-M` / `word N-M` | min(N,M) | max(N,M) |

  Правило парсингу (порядок важливий — від найбільш специфічного до найзагальнішого):
  1. Range з явним роздільником: `word [-:] N-M`
  2. Range з пробілом: `word N-M`
  3. Exact count з явним роздільником: `word [-:] N`
  4. Exact count з пробілом: `word N`
  5. Інакше — весь рядок є ключем з default-діапазоном.

  Дублікати дедуплікуються case-insensitive; виграє запис з найбільшим `requiredMax`.

  Trade-off: рядок типу `channel 5` буде розпарсений як `keyword="channel"`, exact 5. У SEO-домені це рідкісна проблема; для уникнення можна писати з явним роздільником або не писати число.

### 2.2 Matching Rules

- **Case-insensitive.**
- **Word boundaries:** ключ `tour` НЕ матчить `tourist` чи `contour`. Реалізація через Unicode-aware lookaround:
  `(?<![\p{L}\p{N}_])escapedKeyword(?![\p{L}\p{N}_])` з флагами `giu`.
- **Multi-word ключі** (`whitewater rafting`): пробіли всередині ключа замінюються на `\s+` для толерантності до подвійних пробілів у тексті.
- **Перетин ключів:** кожен ключ шукається незалежно. У тексті `kayaking tour and walking tour` ключі `tour` і `kayaking tour` рахуються окремо: 2 і 1 відповідно.
- **Без морфологічного matching** — `tour` НЕ збігається з `tours`, `touring`. Якщо потрібні варіанти — користувач додає їх окремими ключами.
- **Unicode normalization:** `text.normalize('NFC')` і `keyword.normalize('NFC')` перед побудовою regex.

### 2.3 Classification

Уніфікована логіка для всіх вхідних форматів — оперує `[requiredMin, requiredMax]`:

| Умова | Status | Delta |
|---|---|---|
| `actual < requiredMin` | `missing` | `requiredMin - actual` |
| `actual > requiredMax` | `excess` | `actual - requiredMax` |
| `requiredMin ≤ actual ≤ requiredMax` | `ok` | `0` |

Тобто всі правила зводяться до однієї перевірки на діапазон. Default `[1, 2]` і exact `[N, N]` — це окремі випадки range-логіки.

### 2.4 Output

UI показує дві колонки:
- **Не вистачає** (sorted by delta DESC) — кожен запис: ключ, текст `треба ще {delta}`, лічильник `({actualCount}/{expected})`.
- **Забагато** (sorted by delta DESC) — кожен запис: ключ, текст `на {delta} більше`, лічильник `({actualCount}/{expected})`.

Формат `{expected}`:
- Якщо `requiredMin === requiredMax` → `{requiredMin}` (наприклад `5`).
- Якщо `requiredMin !== requiredMax` → `{requiredMin}-{requiredMax}` (наприклад `1-2` для default або `5-10` для діапазону).

Внизу: `✓ N ключів у нормі`. Над панеллю — timestamp останньої перевірки.

## 3. Non-functional Requirements

- **Performance:** обробка 7000 слів × 50 ключів повинна займати < 50 мс на сучасному desktop-браузері. (Очікувано 5–15 мс.)
- **No backend, no DB, no external dependencies at runtime.**
- **Browser support:** останні дві версії Chrome, Firefox, Safari, Edge (потрібна підтримка regex lookbehind + Unicode property escapes).
- **Mobile-friendly:** layout складається у стовпчик при `< 768px`.
- **Accessibility:** semantic HTML, labels для textarea, focus states, кольори з достатнім контрастом.

## 4. Architecture

### 4.1 Stack

- **Vite 5** + **React 18** + **TypeScript 5**
- **Tailwind CSS v3**
- **Vitest** для unit-тестів логіки
- **ESLint** + **Prettier** (стандартні з шаблону Vite)
- Deploy: **Vercel** (статичний білд)

### 4.2 Чому без бекенду

Алгоритм детермінований і легкий, без секретів і без БД. Розділення FE/BE дало б нуль користі і додало б оверхеду (два деплої, мережеві затримки, серверні витрати). Логіка винесена в окремий чистий модуль `src/lib/`, тому при появі реальної потреби вона переноситься в serverless function без рефакторингу.

### 4.3 Project Structure

```
keyword-checker/
├── docs/
│   └── specs/
│       └── 2026-05-07-keyword-checker-design.md
├── src/
│   ├── lib/
│   │   ├── keywordParser.ts
│   │   ├── keywordChecker.ts
│   │   └── __tests__/
│   │       ├── keywordParser.test.ts
│   │       └── keywordChecker.test.ts
│   ├── components/
│   │   ├── TextInputArea.tsx
│   │   ├── KeywordsInputArea.tsx
│   │   ├── CheckResultPanel.tsx
│   │   └── KeywordResultRow.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
└── README.md
```

### 4.4 Module Contracts

```typescript
export type ParsedKeyword = {
  keyword: string;
  requiredMin: number;
  requiredMax: number;
};

export type KeywordResult = {
  keyword: string;
  requiredMin: number;
  requiredMax: number;
  actualCount: number;
  status: 'ok' | 'missing' | 'excess';
  delta: number;
};

export function parseKeywords(raw: string): ParsedKeyword[];
export function checkKeywords(text: string, keywords: ParsedKeyword[]): KeywordResult[];
```

## 5. UI Design

### 5.1 Layout (desktop, max-width ~1200px)

- Header (тонкий) — назва тулу
- Дві колонки на одному рівні:
  - Ліва: textarea для тексту + лічильник слів
  - Права: textarea для ключів + лічильник ключів + блок-підказка з прикладами форматів
- Centered primary button `Перевірити`
- Нижче — секція результатів: дві колонки `Не вистачає` / `Забагато` + рядок `✓ N ключів у нормі`

Mobile (`< 768px`): усе в одну колонку на повну ширину.

### 5.2 State Model (App.tsx)

```typescript
const [text, setText] = useState('');
const [keywordsRaw, setKeywordsRaw] = useState('');
const [results, setResults] = useState<KeywordResult[] | null>(null);
const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
```

Кнопка `Перевірити`:
- `disabled` коли `text.trim() === ''` або `keywordsRaw.trim() === ''`
- `onClick`: `parseKeywords(keywordsRaw) → checkKeywords(text, parsed) → setResults` + `setLastCheckedAt(new Date())`
- `Ctrl+Enter` у будь-якій textarea також тригерить.

Результати **не очищаються** при подальшому редагуванні input — лишаються snapshot до наступного `Перевірити`.

### 5.3 Styling Tokens

- Background: `bg-slate-50`
- Cards: `bg-white border border-slate-200 rounded-lg shadow-sm`
- Missing accent: `text-red-600`, dot `bg-red-500`
- Excess accent: `text-amber-600`, dot `bg-amber-500`
- OK accent: `text-emerald-600`
- Primary button: `bg-slate-900 text-white hover:bg-slate-800`
- Textarea для ключів: `font-mono text-sm`

UI texts українською: `Текст`, `Ключові слова`, `Перевірити`, `Не вистачає`, `Забагато`, `треба ще N`, `на N більше`, `ключів у нормі`, `Перевірено о HH:MM:SS`.

## 6. Edge Cases

| Випадок | Поведінка |
|---|---|
| Порожній текст або ключі | Кнопка `disabled` |
| Whitespace-only рядки в ключах | Пропускаються |
| Дублікати ключів | Дедуп, max count |
| Спецсимволи у ключі (`.`, `*`, `?`, `+`, etc.) | Екранування `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` |
| Дефіс/апостроф у ключі (`follow-up`, `don't`) | OK — non-letter символи природно стають межею |
| NFC vs NFD | Обидві сторони нормалізуються до NFC |
| Подвійні пробіли в multi-word ключі | regex використовує `\s+` між словами |
| 1-літерний ключ | Дозволено |
| Текст з HTML-розміткою | Не зачищається; пошук у "сирому" тексті |

## 7. Testing Strategy

Ціль: **≥ 90% coverage** на `src/lib/`. UI-тести у v1 не пишемо — фокус на чистій логіці.

### 7.1 `keywordParser.test.ts`

- Простий ключ без count
- `word - 3`, `word: 5`, `word 2` — три формати
- Multi-word: `whitewater rafting - 2`
- Пустий ввід / тільки whitespace / mixed
- Дублікат: `tour - 2` і `tour - 5` → один запис із count 5

### 7.2 `keywordChecker.test.ts`

- Case-insensitive
- Word boundary: `tour` НЕ матчить `tourist`, `contour`
- Перетин ключів: `tour` і `kayaking tour` рахуються незалежно
- Cyrillic: `туризм` у кириличному тексті
- Mixed Cyrillic + Latin
- Класифікація:
  - count=undefined: 0→missing, 1→ok, 2→ok, 3→excess
  - count=3: 0→missing(delta 3), 2→missing(delta 1), 3→ok, 5→excess(delta 2)
- Multi-word з подвійним пробілом
- Спецсимволи: `node.js` коректно

## 8. Deployment

**Vercel (рекомендовано):**
1. Push репо у GitHub.
2. На Vercel: `Import Project` → автодетект Vite.
3. Build: `npm run build` (default), output: `dist`.
4. Жодних env vars.

Опційний `vercel.json` для майбутнього SPA-роутингу:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

## 9. Local DX Scripts (`package.json`)

- `npm run dev` — Vite dev server (HMR)
- `npm run build` — production build
- `npm run preview` — preview production
- `npm run test` — Vitest watch
- `npm run test:run` — Vitest one-shot (CI)
- `npm run lint` — ESLint
- `npm run format` — Prettier write

## 10. Out of Scope (v1)

Свідомо НЕ включаємо у v1:

- UI-тести (component / E2E) — у v1 покриваємо лише логіку в `src/lib/`
- Підсвічування знайдених/відсутніх ключів у самому тексті
- Експорт результатів (CSV / JSON)
- Збереження останніх перевірок у localStorage
- i18n / перемикач мов
- Аналітика / телеметрія
- Авторизація, історія, БД, бекенд

YAGNI: додамо коли з'явиться реальний use case.

## 11. Future Extensions (referenced, not committed)

Якщо колись знадобляться:
- Морфологічний matcher (stemming) для слов'янських мов
- Web Worker для текстів > 50 000 слів
- Single mega-regex замість per-keyword (для 500+ ключів)
- Розширений UX: підсвічування, експорт, пресети ключів
