# Project-Scoped Rules: expenses-pro

## 🔒 Security & Git Push Guidelines
1. **API Key Scanner**: Before executing `git commit` or `git push`, inspect all files in the staging index for potential credentials, API keys, or security vulnerabilities (such as Supabase service_role keys).
2. **Immediate Halt**: If any sensitive credential, key, or configuration leak is detected, **halt the Git operation immediately**, report the file and line number to the user, and prompt them to secure it.
3. **Commit Messages**: Keep commit messages short, simple, and concise (e.g., `feat: csv import`, `fix: ocr date`). Avoid verbose descriptions in commits.
