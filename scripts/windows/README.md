# Windows scripts (legacy)

These `.bat` / `.ps1` helpers were the original way to drive the project on
Windows. They are **kept for reference / backwards compatibility** and are no
longer the recommended entrypoint.

Everything they do is now available cross-platform through the root
[`Makefile`](../../Makefile) and npm scripts, which work on Linux, macOS and
Windows (Git Bash / WSL).

| Old script | Cross-platform equivalent |
| --- | --- |
| `start.bat` | `make up` |
| `stop.bat` | `make down` |
| `build.bat` | `make build` |
| `run.ps1` | `make up` / `make logs` / `make down` |
| `check-docker.ps1` | `make doctor` |

> On Windows, run `make` from **Git Bash** or **WSL**. If you prefer PowerShell,
> the same commands map directly to `docker compose ...`.
