<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the user
> will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project conventions
- Keep Rooted's journal, generated demo, personal-pattern calculations, and experiments in the client-safe `src/lib/rooted.ts` module; the file route should own interface rendering, and the app should persist locally because this MVP requires no account or backend.
- Keep each scored insight grounded in a transparent lagged comparison of actual user entries; label observed relationships as non-causal and never fabricate personalized findings.
