# Blotter implementation tickets

## BLOT-1 — Permanent left-hand Blotter panel

Status: Implemented

- Keep the panel open for the lifetime of an active conference.
- Remove the close icon, Escape shortcut, toolbar toggle, and `C` shortcut.
- Use **Blotter** as the fixed panel heading.
- Preserve the existing left-hand desktop layout and define a usable narrow-screen layout.

## BLOT-2 — JWT-only identity and group messaging

Status: Implemented

- Remove the chat nickname prompt and `DisplayNameForm` path.
- Treat JWT-provided display names as read-only.
- Remove smileys and participant-to-participant private-message controls.
- Always render the group-message input and prevent it from selecting a private recipient.
- Preserve lobby messaging as a separate admission workflow.

## BLOT-3 — Broadcast message lifecycle

Status: Implemented

- Add `open`, `ticked`, and `closed` message states.
- Render open messages in green.
- Render ticked messages in red with struck-through text.
- Render closed messages in orange with struck-through text.
- Show tick and close controls only for the local sender while a message is open.
- Broadcast state changes and reject updates not authored by the original sender.

## BLOT-4 — Press-and-hold dictation

Status: Implemented

- Add a microphone button beside the chat send button.
- Keep dictation inactive by default.
- Start private browser speech recognition while the button is held.
- Append interim/final recognition text to the editable draft without sending it.
- Stop recognition on pointer/key release, cancellation, blur, or unmount.
- Report unsupported-browser and microphone-permission failures accessibly.

## BLOT-5 — Disable presentation controls

Status: Implemented

- Keep the Share Screen and Share Video toolbar entries visible but disabled.
- Disable the screen-sharing keyboard shortcut as well.

## BLOT-6 — Verification

Status: Browser/API coverage updated; local execution requires the repository dependencies

- Add two-participant coverage for sender-only controls and synchronized status colors.
- Cover nickname/smiley/private-message removal and the permanent panel.
- Cover dictation lifecycle with a mocked speech-recognition implementation.
- Run web TypeScript, lint, build, and targeted browser tests.

## BLOT-7 — My messages filter and terminal-state guard

Status: Implemented

- Add an accessible **All | Mine** segmented filter above the message list.
- Keep **All** as the default and retain the selection for the meeting.
- Scope chat search to the selected filter.
- Show a useful empty state when the local participant has not sent a message.
- Keep ticked and closed states terminal: hide both controls and reject every later transition.
- Cover filtering and terminal-state behavior in the browser specification.
