# Event day runbook

Do these in order. A sample squad file is `public/squad-import-template.csv`.

## Before the hall opens

1. Open the site and `/api/health`. Database and storage should both say ok.
2. Sign in as the organizer.
3. On **Overview**, check **Demo simulation (rehearsal only)**. It must be off.
4. Set the kickoff time, or press **Hour 2 · Framing** when the sprint actually starts. Do not leave a rehearsal clock running.
5. Open **Gates** and confirm the five names and hours. Defaults match the 20-hour sprint.

## Import squads

1. Make a spreadsheet with columns `team_name,track,college,members`.
2. Members are separated by semicolons. Each squad needs 2 to 4 names.
3. Tracks can be written as Learning, RegeneraX, Insight Mail, Farming, or Societal.
4. Save as CSV.
5. Open **Squads**. Choose **Import CSV**.
6. Read the toast. Fix any row it names and import again. Existing squads are not deleted.
7. Choose **Export credentials** and save the CSV somewhere private.
8. Open **Passes**. Choose **Print**. Hand one card to each squad lead. The QR opens the sign-in page with their team id filled in.

You can also add one squad with **Add squad**.

## Judges

1. Open **Jury**. Choose **Add judge**.
2. Write down the username and password the screen shows.
3. Select that judge. Choose a track and press **Assign**, or remove a squad you assigned by mistake.
4. Export the jury CSV if you want a paper list.

## Projector

1. On the projector computer, open the site.
2. Open `/tv` or press **TV mode** on the leaderboard.
3. Press **Full screen**.
4. Leave the tab open. It updates without a refresh.
5. If the table should stop moving near the end, the organizer uses **Freeze leaderboard**.
6. If scores should be hidden, use **Hide scores**.

## During the sprint

1. Broadcasts go to every squad and onto the ticker. Open **Broadcasts**, write the note, press **Broadcast**.
2. If a squad forgets a password, open their page and press **Reset password**. The old sessions stop working. Tell them the new password.
3. **Lock submissions** stops all gate saves and new scores. Use it at code freeze if you do not want late flags either.
4. **Select top 25** marks the current top 25 as finalists. You can still toggle one squad by hand.

## If something looks wrong

Use [TROUBLESHOOTING.md](TROUBLESHOOTING.md). Short version:

1. Refresh the projector.
2. Check `/api/health`.
3. Do not turn on demo simulation.
4. Do not delete the database.

## After the event

1. Freeze the leaderboard.
2. Download each finalist's ZIP from their squad page if you want the files.
3. Take a backup ([DATABASE_GUIDE.md](DATABASE_GUIDE.md)).
4. Export the audit log by reading **Audit**, and keep the credential CSV only as long as you need it.
