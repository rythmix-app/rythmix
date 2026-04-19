# Commit Message Guidelines

## Format
- **MUST** start with the branch name followed by a colon
- **MUST** follow Conventional Commits format
- **MUST** be concise and direct

## Structure
```
[branch-name]: <type>: <description>
```

## Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Rules
- Keep description short and to the point
- Use imperative mood ("add" not "added")
- No period at the end
- Max 72 characters total

## Examples
```
feature/user-auth: feat: add JWT authentication
bugfix/login-error: fix: resolve null pointer in login
refactor/api-calls: refactor: simplify HTTP client
docs/readme: docs: update installation steps
```