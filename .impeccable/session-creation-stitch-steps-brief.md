# Session creation — revised Stitch steps

Mode: Operate. Status: implemented five-step native creation form (October 14, 2026). The user directed implementation now, visual polish later. This brief records the implemented scope and remaining verification limits.

Source: latest five-step screens in the Palla Stitch project, inspected October 14, 2026: https://stitch.withgoogle.com/projects/1806994716726085102. This supersedes the earlier four-step creation composition. Preserve Stitch's Hanken Grotesk/Geist, white bordered cards, lavender filled inputs/insets, olive icons, dark selected pills, and lime main actions. Correct its density, alignment, and touch targets rather than changing its aesthetic.

## Steps

1. Details: title, optional description, club/address search. No venue photo/verification, amenities, court reservation or court inventory claims.
2. Schedule: one-time/weekly choices; first date; weekday recap derived from the date; local start; duration presets plus custom duration; weekly last date and computed occurrence count. Buenos Aires timezone; bounded dates are created upfront on publication.
3. Players: maximum players numeric stepper, all categories or explicit eight-chip multi-select, strict-category switch, Everyone/Women only/Men only. Capacity is total places, not a roster-format setting.
4. Waitlist: enabled switch, automatic/manual promotion choices, unlimited queue or numeric cap. Hide promotion/limit controls when disabled.
5. Policies and review: public/private visibility; optional opening, closing and player cancellation rules; complete summary; external court-arrangement confirmation; publish. Two views illustrate scroll positions of the same step.

## Persisted category enforcement

`strict_category_enforcement` is a required boolean on series and occurrences, deployed by `20261014162834_session_strict_categories.sql`. It defaults OFF. The mockup demonstrates ON with 6ta/7ma selected. When ON, future server-side joining/waitlist promotion must verify that the player's profile category is one of `allowed_categories`. Unknown/beginner-without-number profiles cannot join a restricted strict session until they supply a matching numbered category. Turning it off makes selected categories a target audience rather than a hard eligibility barrier. When all categories are allowed, hide the switch and treat enforcement as OFF. The form and save contract persist this flag. Joining and promotion enforcement remain future work; registration is not implemented.

Profile categories are self-reported, not verified rankings. Never claim official ratings or equate them to decimal Playtomic levels. Argentine numbered categories run from 1ra (strongest) to 8va (lowest); keep eight distinct choices and permit noncontiguous selections.

## Removed reference content

Omit team balancing, automated seeding, roster layout/size/format, priority access for regulars, pricing/payments/refunds, reservation guarantees, rolling automatic generation, Markdown support, schema/debug labels, autosave promises, venue verification/amenities/distance, invented statistics, and private-link access promises. Court remains free text. Visibility only says Listed in Explore / Not listed in Explore.

## Artifacts

The two boards cover Details/Schedule/Players and Waitlist/Review. Review top and continued are one scrollable step. The last panel's publication confirmation is the actual end of the form; a sticky publish button on the top view must respect final validation and the unchecked confirmation until completed.

Saved boards: `mocks/session-creation-stitch-steps-1-3.png` and `mocks/session-creation-stitch-steps-4-5.png`, with exact prompts in their JSON sidecars. These boards guided implementation; the user requested polish later.

Implementation refinements: use one consistent progress/header style across all steps (board 1's compact dark active circle); show category selections as an explicit comma-separated list, not a range; avoid repeating an editable first-date control; timing units need a real selectable unit control. Backend-pending notes in the generated images are review annotations and must not ship as product copy. First-step Back exits the wizard with unsaved-change handling. The strict flag migration is deployed; operational joining enforcement still requires registration implementation and authorization tests.

## Implementation and evidence

All five steps use canonical settings and preserve existing prices in their payload without fee controls. Team balancing and roster formats/layout are omitted. Details and Schedule follow their Stitch references; this does not claim pixel-perfect fidelity. Shared input surfaces are opt-in; 16-unit cards and 12-unit inputs are feature-local geometry. Global `DESIGN.md`, `.impeccable/design.json`, and shared tokens remain the incumbent brand contract.

`npm run verify` passed 54 unit tests with 13 existing lint warnings; isolated SQL save/lifecycle suites passed. Native fixtures exercised all five steps on iPhone 17 Pro / iOS 26.5 and Pixel_8 / Android 17, iOS time picker, Android date picker, duration/weekly/category controls, and waitlist guards. Evidence lives under `.impeccable/review/native/session-creation/`. Final fixture publish/draft callback QA was still in progress at this documentation pass. This run did not perform live account saves, verify slow-request runtime persistence, or certify full native accessibility/keyboard/large-text coverage.

Fresh review found in-flight mutation controls and a hidden legacy deadline cap. Both were fixed and the narrow follow-up verdict was resolved/ship; that does not imply a full UI review.

Implementation refinement: omit assigned court, the blue Step 1 context chip, the Step 2 location recap, and all Delete draft buttons. Back controls are ghost buttons without background or border.
