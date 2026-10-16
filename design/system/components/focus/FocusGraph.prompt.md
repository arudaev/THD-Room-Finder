The Profile hero (D2): a contribution graph of daily focus minutes. Square
cells, rows Sun → Sat, one column per week, the current week rightmost, today
outlined, later days left empty. Levels count Pomodoro blocks, 0 · 1 · 2–3 · 4–6 · 7+, on
`--md-graph-0…4`, which follow the graph colour (`data-accent`).

```jsx
<FocusGraph days={days} today="2026-10-13" weeks={53} stats="21 h this semester" secondaryStats="12-day study streak"
  label="Focus graph. 21 h this semester, 12-day streak." text={copy} onShare={openShare} />
<FocusGraph {...same} compact />   // phones: 11px cells, the scroller opens at today
```

Omit `onShare` when there is no history. The grid is `aria-hidden`; a hidden
table carries every day's minutes. Hover or tap a cell for its day.

Closed campus dates use the neutral `--md-graph-closed` token in every graph
colour and theme. Future days retain their empty/outlined slots. The classroom
calendar currently contains weekends only, not a dated holiday calendar;
reduced semester-break weekdays stay open. Closed-day minutes remain in totals
but do not add streak days. Five focused weekdays followed by Monday = six
focus days; an intervening missed open day breaks the streak.

Supply `text.closed` ("Campus closed" / "Campus geschlossen") and
`text.closureNote` in the caller's language. Tooltips and the accessible table
retain recorded minutes and add the closure annotation. The footer pairs a pause icon and a short weekend note with five intensity swatches. The ramp keeps an accessible less-to-more label.

Weeks start Sunday, with Mon/Wed/Fri labels on rows 2/4/6.

The semester total leads the card; optional secondaryStats shows the study-day streak beneath it. Compact graphs support native swipe, trackpad and keyboard scrolling with a visible keyboard focus ring and no scrollbar. A subtle left-edge fade signals older history and disappears at the oldest week.

Responsive layout: cells scale with card width (14�26 px), with the complete year available by scrolling on every screen. The profile column is capped at 840 px. Wider pointer layouts offer older/newer navigation; narrower layouts retain native scrolling and keyboard access. Resize preserves the viewed week. Weekend cells blend the closed token into the surface for a softer contrast.
