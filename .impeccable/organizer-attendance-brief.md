# Organizer attendance

Mode: Operate. Scope: organizers see confirmed attendees for a session occurrence and mark or undo arrivals. Player registration UI and join/cancel flows remain deferred.

Use the existing occurrence-detail Active roster and Court check-in sections, preserving the waitlist placeholder between them. The user explicitly requested this implementation without further mockups.

The production roster uses real confirmed registrations. Show an empty state when no confirmed attendees exist. Each attendee shows their name and category when available. Check-in shows Mark arrived, the saved arrival time, and Undo with a confirmation. Loading, friendly recovery errors, disabled pending actions, and published-session authorization are required.

Backend scope and verification: [organizer attendance](../docs/organizer-attendance.md). Native fixture: `/sessions-preview/occurrence` exercises the same presentation components with illustrative data and simulated saves. It cannot establish live account persistence.

Reference refinement: preserve the supplied Court Check-in header/subtitle and row arrangement. Place the arrival count pill where Scan Pass was shown; use pending status dots, pale Tap to Check In actions, and inline green Arrived (time). The arrived status remains an accessible button that opens undo confirmation. Header stacks for large text.
