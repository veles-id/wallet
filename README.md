# Veles ID Wallet

Veles Id Wallet is an open-source project.

## Design System

Available on [Figma](https://www.figma.com/file/g5Kcj73JnT0ImuVBlvqOnp).

## White Paper

Available on [GitHub](https://github.com/veles-id/wallet/blob/master/WHITEPAPER.md).

# Code style guide

Every problem has many solutions, here are the preferable ones:

- Use new flow control
- Use signals to expose data to the template
- Prefer newer patterns with import(), export(), inject(), viewChild()
- SCSS and HTML in separate files
- For asynchronous communication use RxJS
- Files not longer than 400 lines of code
- Use TypeScript and do your best to don’t use `any`
- Type definitions in separate files
- Use locally scoped styles over global style class names for better performance (reduces view re-renders)
- For unified styling use BEM
- Don’t use comments, but write self-explanatory code
- Write unit tests for pipes, helpers, and front-end business logic
- Use `protected` only in the scope of inheritance
- Names of class memebers that are private prepend with `_`
- Follow Single Responsibility Principle
- Don't use emoticons
