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

## Attendance Vala architecture
- Attendance punches, manual entries and corrections go through security-definer Postgres functions that stamp now() — the client never sends official timestamps.
- Attendance status/hours are derived server-side by attendance_day_summary from immutable events; corrections void events instead of editing them.
- Login runs through the loginWithLicense server function (license hash check + rate limit) before a session is issued.
- Demo seed rows carry is_demo = true and must stay distinguishable from real records.
