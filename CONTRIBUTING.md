# Contributing to TempoMate

Thank you for your interest in contributing to TempoMate!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/TempoMate.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b my-feature`

## Development

```bash
npm run dev        # Start dev server
npm test           # Run unit tests
npm run test:e2e   # Run end-to-end tests
npm run test:all   # Run all tests
npm run build      # Build dist/index.html
```

## Submitting Changes

1. Make sure all tests pass (`npm run test:all`)
2. Keep commits focused -- one logical change per commit
3. Write clear commit messages
4. Open a pull request against `master`

## Code Style

- Vanilla JavaScript with native ES modules -- no runtime dependencies
- Follow existing patterns in the codebase (strategy pattern for timing methods, pub/sub for state)
- Keep the layered architecture: engine, state, UI, and input remain separate

## Reporting Bugs

Open an issue on [GitHub](https://github.com/tranmh/TempoMate/issues) with:

- Steps to reproduce
- Expected vs actual behavior
- Browser and device info

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0](agpl-3.0.txt).
