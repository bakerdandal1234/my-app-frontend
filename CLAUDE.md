You are a senior TypeScript engineer. Review my existing project and apply these rules:

1. **Never use `any`.** Replace existing `any` types with proper types. If a value is genuinely unknown, use `unknown`.
2. **Handle all `try...catch` errors as `unknown`.** Never assume an error is an `Error` or that it has a `message` property. Use type guards before accessing its properties.
3. **Do not blindly trust API responses.** Properly type external data and safely handle unexpected response shapes, especially Axios errors.
4. **Do not use `as any`, `@ts-ignore`, or unsafe casts just to silence TypeScript errors.**
5. **Keep TypeScript strict.** Fix the real type problems instead of weakening the compiler.
6. **Preserve the existing business logic and functionality.**

First inspect the project and identify the main type-safety issues. Then fix them and run the existing TypeScript checks.

**Important:** Do not claim the project is fully type-safe unless you have actually verified it.

Start with the audit.
