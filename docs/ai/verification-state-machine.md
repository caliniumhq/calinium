# Verification State Machine

| From | To | Allowed |
| --- | --- | --- |
| Pending | Running | Yes |
| Running | Verified | Yes |
| Running | Failed | Yes |
| Verified | Any state | No |
| Failed | Any state | No |

The transition helper rejects every other combination. A report stores the two permitted transitions and is therefore immutable evidence of a single completed verification attempt.

Use a new verification ID for every retry. Never edit a failed report or its history event.
