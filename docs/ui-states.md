# Empty and error states

Use `EmptyState` for a successfully loaded collection with no items, or an unavailable item with clear next steps. Use `ErrorState` when a request failed. Keep loading separate with the existing skeletons; a failed request must not look like an empty result.

Both are exported from `@/components/atoms` and share `ContentState` presentation. They reuse Palla's current light surfaces, typography, spacing, icons and buttons without adding visual tokens. Existing `EmptyState` calls with `title` and `description` remain compatible.

## Placement

| Variant           | Placement                             | Appearance                                                                        |
| ----------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| `panel` (default) | Empty or failed section               | Centered copy in the shared panel card; optional full-width action                |
| `inline`          | Local failure beside retained content | Compact row card with left-aligned copy and a ghost action                        |
| `fullScreen`      | Unavailable screen content            | Centered, card-free content; the caller owns the screen, scrolling and navigation |

Use `contained` inside an existing panel to remove the enclosing state card. It preserves the copy, icon and action. The inline layout stacks when the font scale exceeds 1.2 or the window is narrower than 360 units; its copy and action then use the stacked treatment. Full-screen content has a maximum width of 480 units and does not position itself over navigation or safe areas.

Retain useful loaded data after refresh or mutation failures and place an inline error beside it. Organizer attendance, waitlists, session inventory and occurrence screens use these components. State presentation does not determine query behavior or implement recovery itself.

## Usage

```tsx
import { EmptyState, ErrorState } from "@/components/atoms";
import { CalendarDays, Plus } from "lucide-react-native";

<EmptyState
  variant="fullScreen"
  icon={CalendarDays}
  title="Your first session starts here"
  description="Create a session and give your players a place to meet."
  action={{ label: "Create session", icon: Plus, onPress: openEditor }}
/>;

<ErrorState
  variant="inline"
  contained
  title="Waitlist couldn’t update"
  description={errorMessage}
  onRetry={reloadWaitlist}
  retryLabel="Reload waitlist"
  retrying={isFetching}
  retryDisabled={isUnavailable}
/>;
```

`title` is required. `EmptyState` also requires `description`; `ErrorState` defaults it to “Check your connection and try again.” Both accept a custom Lucide `icon`, `style`, `variant`, `contained` and optional `action`. Defaults are Users for empty states and CloudOff for errors. Icons are decorative and hidden from the accessibility tree; copy conveys the meaning.

An action contains `label` and `onPress`, plus optional `icon`, `loading`, `disabled` and `accessibilityLabel`. Without an action, empty states show only copy and the icon. Errors add a retry action only when `onRetry` is supplied. Its default label is “Try again”; `retrying` shows busy state and blocks duplicate presses, while `retryDisabled` disables it. An explicit `action` replaces the generated retry action, so supply its own loading/disabled state. Error descriptions request a polite accessibility announcement; screen-reader traversal still needs native verification.

Write a specific title, a plain explanation and one useful next step. Use copy-only states where the user has no relevant action. Do not place raw server errors in product copy; map failures to readable messages in the feature layer.

## Native verification

The development-only `/sessions-preview/states` fixture switches between all six empty/error layouts. It exercises a local empty-state action and simulated retry busy/disabled behavior without server requests or account writes. Run it in Expo Go on both native platforms and check normal layouts, larger-text stacking, scrolling and action reachability.

Evidence and limits are recorded in `docs/native-testing.md`; captures and reports live in `.impeccable/review/native/states/`. The component fixture does not establish live recovery, account persistence, VoiceOver/TalkBack traversal or tablet behavior.
