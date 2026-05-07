# Keyword Checker

Невеликий вебінструмент для перевірки наявності і кількості ключових слів у тексті.

## Use case

1. Вставити текст (1000–7000 слів).
2. Вставити список ключових слів — по одному на рядок. Опційно вказати очікувану кількість входжень через `-`, `:` або просто пробіл:

   ```
   kayaking tour - 3
   hiking: 2
   fishing 5
   whitewater rafting
   ```

3. Натиснути `Перевірити`. Побачити які ключі відсутні і яких забагато.

**Правила:**

- Без вказаної кількості: ключ має зустрічатись 1 або 2 рази (інакше missing/excess).
- З вказаною кількістю N: рівно N (інакше missing/excess).
- Пошук case-insensitive, по межах слова, з підтримкою кирилиці.

## Local development

```bash
npm install
npm run dev            # dev server
npm run test           # vitest watch mode
npm run test:run       # one-shot
npm run test:coverage  # coverage report (≥90% on src/lib/)
npm run build          # production build
npm run preview        # preview production build
npm run lint
npm run format
```

## Deploy

Push to GitHub → import у Vercel → автодетект Vite. Жодних env vars не потрібно.

## Architecture

- Pure frontend SPA: Vite + React 19 + TypeScript + Tailwind.
- Бізнес-логіка ізольована у `src/lib/` з повним unit-coverage.
- UI у `src/components/`.

Дизайн-спека: `docs/specs/2026-05-07-keyword-checker-design.md`
План реалізації: `docs/plans/2026-05-07-keyword-checker.md`
