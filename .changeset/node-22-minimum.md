---
'praxis-kit': minor
---

`praxis-kit` now declares `engines.node >=22` (it was `>=18`). The workspace, CI and the release
workflow already ran on Node 22/24, so this makes the published requirement match what is tested. If
you install on Node 18 or 20, package managers that enforce `engines` will refuse or warn.
