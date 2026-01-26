# Repository Guidelines

Welcome to the **SupplAI** repository! This document serves as a guide to help you understand the structure, conventions, and best practices for contributing to this project.

---

## Table of Contents

- [Folder Structure](#folder-structure)
- [Naming Conventions](#naming-conventions)
- [Development Guidelines](#development-guidelines)
- [Best Practices for Next.js Development](#best-practices-for-nextjs-development)
- [Coding Standards](#coding-standards)
- [How to Contribute](#how-to-contribute)

---

## Folder Structure

The repository follows a modular structure to ensure clarity and ease of maintenance:

### `/src`

Contains the source code for the application.

- **`app`**: Entry point of the application.
  - `components`: Shared components categorized into:
    - `common`: Generic components reused across the app.
    - `home`: Components specific to the home page.

- **`lib`**: Contains business logic and application-specific utilities.
  - `actions`: Functions that handle user or system actions.
  - `stores`: State management logic. Each store should be unique and include various reducers with their respective actions.
  - `types`: TypeScript types and interfaces.

- **`utils`**: General-purpose utility functions and constants.
  - `constraints`: Constraints or validation rules.
  - `functions`: Helper functions used across the app.

Each folder uses a **barrel export pattern** via `index.ts` files to centralize exports. This ensures cleaner and more manageable imports throughout the project.

---

## Naming Conventions

1. **Files and Folders**
   - Use `camelCase` for files (e.g., `getUserData.ts`).
   - Use `kebab-case` for folder names (e.g., `node-modules`).

2. **Components**
   - React components should use `PascalCase` (e.g., `Hero.tsx`).

3. **Variables and Constants**
   - Use `camelCase` for variables.
   - Use `UPPER_CASE` for constants (e.g., `MAX_RETRIES`).

4. **Types**
   - Use `PascalCase` for TypeScript types and interfaces.

---

## Development Guidelines

1. **Setup**
   - Install bun (if not installed) using npm `npm install -g bun`.
   - Install dependencies using `bun install`.
   - Start the development server using `bun dev`.

2. **Branching**
   - Follow the Git branching model:
     - `main`: Stable production-ready code.
     - `feature/*`: New feature development.
     - `bugfix/*`: Bug fixes.

3. **Testing**
   - Ensure all features are tested before raising a pull request.

4. **Documentation**
   - Add comments for all complex functions.
   - Update the README for significant changes in functionality.

5. **Next.js Pages**
   - As this is a Next.js project, always strive to render `page.tsx` components in a server-side environment to leverage Next.js server-side rendering (SSR) capabilities.

---

## Best Practices for Next.js Development

1. **Search Engine Optimization (SEO)**
   - Use **constructMetaData** function to include meta tags for title, description, and other SEO attributes.
   - Ensure each page has a unique and descriptive title.

2. **Image Optimization**
   - Use the Next.js `<Image>` component to automatically optimize images.
   - Provide appropriate `alt` text for all images to improve accessibility and SEO.

3. **Code Splitting**
   - Leverage dynamic imports using `next/dynamic` for large components or modules that are not critical during initial page load.

4. **Environment Variables**
   - Store sensitive or environment-specific configurations in a `.env.local` file.
   - Never commit `.env.local` to the repository.

---

## Coding Standards

1. **TypeScript**
   - Strict type checking is enabled. Ensure all variables and functions have proper types.

2. **Linting and Formatting**
   - Run `pnpm lint` to check for linting errors.
   - Run `pnpm format` to auto-format code using Prettier.

3. **Folder Imports**
   - Use `index.ts` files to centralize exports for folders. For example:
     ```ts
     // lib/actions/index.ts
     export * from './user';
     ```

---

## How to Contribute

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit changes with meaningful messages.
4. Push your changes and create a pull request.
5. Ensure the pull request passes all CI checks.

---
