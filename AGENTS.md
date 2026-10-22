<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Extracurricular save validation lives in the client-safe `ekskul.schema.ts`; edits update only explicitly supplied fields by existing ID, so repairs cannot reset unrelated saved values or linked records.
- Student academic reads use the authenticated client, class/year subject assignments, and explicit year/semester filters; shared assignment selection stays client-safe and never rewrites saved subject IDs or grades.
- Academic report reads follow the same class/year assignments and semester-scoped TP grades as student scores; Dinas composition stays client-safe and preserves explicit PAI/local-content grades before considering component averages.
