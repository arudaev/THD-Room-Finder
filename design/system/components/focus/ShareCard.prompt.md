The focus graph as an image (D4), drawn with Canvas 2D: the current semester
as a grid, two figures, the app icon and URL. Square 1080 × 1080 is the card;
wide 1200 × 630 is the link-preview candidate (ADR 0003). Colours come from the
tokens for the given theme and graph colour; about 100 KB.

```jsx
<ShareCard days={days} today="2026-10-13" semesterStart="2026-10-01" semesterEnd="2027-03-14"
  figures={[{ num: '21', unit: 'h', label: 'this semester' }, { num: '12', unit: '', label: 'day streak' }]}
  months={months} theme="light" accent="violet" iconSrc="assets/logo/icon.svg"
  url="thd-room-finder.vercel.app" alt="Focus graph image: 21 hours this semester, 12-day streak." />
```

`renderShareCard(options)` returns the PNG blob for Save Image. Name and batch
(`who`) are opt-in; rooms, times and programme never appear.

Closed campus dates use the neutral `--md-graph-closed` token in every graph
colour and theme. Future days retain their empty/outlined slots. The classroom
calendar currently contains weekends only, not a dated holiday calendar;
reduced semester-break weekdays stay open. Closed-day minutes remain in totals
but do not add streak days. Five focused weekdays followed by Monday = six
focus days; an intervening missed open day breaks the streak.
