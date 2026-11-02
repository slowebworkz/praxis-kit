---
'praxis-kit': patch
---

With `compose.allProps`, variant props declared only by the composing component are no longer
forwarded to its partner as DOM attributes. Variants shared with a Praxis partner still forward,
and every primary variant is withheld from an external (non-Praxis) partner.
