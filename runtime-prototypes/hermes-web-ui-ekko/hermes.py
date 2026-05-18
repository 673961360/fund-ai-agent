#!/usr/bin/env python3
"""Hermes Web UI CLI — 统一管理安装、配置、启停、更新。"""
import argparse
import os
import shutil
import socket
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent


def _print_banner(title: str):
    """Print centered banner."""
    width = 44
    print("=" * width)
    print(f"  {title}")
    print("=" * width)
    print()


def _require_hermes_web_ui():
    """Exit with error if hermes-web-ui not in PATH."""
    if not shutil.which("hermes-web-ui"):
        print("[ERROR] hermes-web-ui not found in PATH.")
        print("[INFO] Run 'hermes.py install' first.")
        sys.exit(1)


def _run_hermes_cmd(*args: str):
    """Run hermes-web-ui CLI with given args, exit on failure."""
    exe = shutil.which("hermes-web-ui")
    if not exe:
        print("[ERROR] hermes-web-ui executable not found.")
        sys.exit(1)
    # On Windows, .cmd/.bat files must be run via cmd.exe /c
    if exe.lower().endswith((".cmd", ".bat")):
        cmd = ["cmd", "/c", exe, *args]
    else:
        cmd = [exe, *args]
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        sys.exit(result.returncode)


def _scan_ports(ports: list[int] = None) -> list[int]:
    """Scan localhost for listening ports. Return list of found ports."""
    if ports is None:
        ports = [8056, 8642, 3000, 5000, 8080, 8888]

    found = []
    for port in ports:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            try:
                s.connect(("127.0.0.1", port))
                found.append(port)
            except (ConnectionRefusedError, OSError):
                pass
    return found


def _load_env() -> dict[str, str]:
    """Load .env file into dict."""
    env_file = SCRIPT_DIR / ".env"
    result = {}
    if not env_file.exists():
        return result
    with open(env_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                result[key.strip()] = value.strip()
    return result


def run_config():
    _print_banner("Hermes Web UI (EKKO) - Hermes Address")

    print("[1/2] Scanning local ports for Hermes Agent...")
    print()

    found = _scan_ports()

    for port in found:
        print(f"  [OK] Port {port} is listening")

    print()
    if not found:
        print("  (No Hermes found on common ports)")
        print("  Tip: Hermes Agent default port is 8056")
    else:
        print(f"  Found {len(found)} listening port(s) above.")
    print()

    print("[2/2] Auto-selected Hermes Agent address:")
    if found:
        upstream = f"http://127.0.0.1:{found[0]}"
        print(f"  Selected: {upstream}")
    else:
        upstream = "http://127.0.0.1:8056"
        print(f"  No port detected, using default: {upstream}")
    print()

    override = input("Enter address (or press Enter to accept default): ").strip()
    if override:
        upstream = override
        print(f"  Overridden to: {upstream}")
    print()

    print(f"[INFO] Saving UPSTREAM={upstream} to .env file...")
    env_file = SCRIPT_DIR / ".env"
    with open(env_file, "w", encoding="utf-8") as f:
        f.write(f"# Hermes Web UI Configuration\nUPSTREAM={upstream}\n")

    print()
    print("[OK] Configuration saved successfully!")
    print(f"  UPSTREAM={upstream}")
    print()
    print("Next step: run 'hermes.py start' to launch.")
    print()


def run_install():
    _print_banner("Hermes Web UI (EKKO) - Install")

    if not shutil.which("node"):
        print("[ERROR] Node.js not found in PATH.")
        print("[INFO] Please install Node.js first: https://nodejs.org/")
        sys.exit(1)

    if not shutil.which("npm"):
        print("[ERROR] npm not found in PATH.")
        sys.exit(1)

    print("[INFO] Installing hermes-web-ui globally...")
    _run_hermes_cmd("install", "-g", "hermes-web-ui")

    print()
    print("[OK] hermes-web-ui installed successfully.")
    print()

    print("[INFO] Configuring Hermes address...")
    run_config()

    print()
    print("[INFO] Launching...")
    run_start()


def run_start():
    _print_banner("Hermes Web UI (EKKO) - Start")

    _require_hermes_web_ui()

    # Point hermes-web-ui's gateway manager to the real hermes CLI
    hermes_exe = Path(r"D:\代码\资金AI\tradercode\modules\Hermes\.venv\Scripts\hermes.exe")
    if hermes_exe.exists():
        os.environ["HERMES_BIN"] = str(hermes_exe)

    # CRITICAL: hermes-web-ui defaults HERMES_HOME to %LOCALAPPDATA%\hermes on Windows,
    # but Hermes Agent uses %USERPROFILE%\.hermes. Align them.
    os.environ["HERMES_HOME"] = str(Path.home() / ".hermes")

    env_vars = _load_env()
    if env_vars:
        for key, value in env_vars.items():
            os.environ[key] = value
        if "UPSTREAM" in env_vars:
            print(f"[INFO] Using UPSTREAM={env_vars['UPSTREAM']} from .env")

    # Default: disable auth unless AUTH_TOKEN or AUTH_DISABLED is set
    if "AUTH_TOKEN" not in os.environ and "AUTH_DISABLED" not in os.environ:
        os.environ["AUTH_DISABLED"] = "1"

    if os.environ.get("AUTH_DISABLED"):
        print(f"[INFO] Auth is disabled (AUTH_DISABLED={os.environ['AUTH_DISABLED']})")

    print("[INFO] Starting hermes-web-ui...")
    _run_hermes_cmd("start")

    print()
    print("[OK] hermes-web-ui started. Open http://localhost:8648 in your browser.")


def run_stop():
    _print_banner("Hermes Web UI (EKKO) - Stop")

    _require_hermes_web_ui()

    print("[INFO] Stopping hermes-web-ui...")
    _run_hermes_cmd("stop")


def run_status():
    _print_banner("Hermes Web UI (EKKO) - Status")

    _require_hermes_web_ui()

    _run_hermes_cmd("status")


def _run_npm(*args: str):
    """Run npm CLI directly, exit on failure."""
    npm = shutil.which("npm")
    if not npm:
        print("[ERROR] npm not found in PATH.")
        sys.exit(1)
    if npm.lower().endswith((".cmd", ".bat")):
        cmd = ["cmd", "/c", npm, *args]
    else:
        cmd = [npm, *args]
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        sys.exit(result.returncode)


def run_update():
    _print_banner("Hermes Web UI (EKKO) - Update")

    if not shutil.which("npm"):
        print("[ERROR] npm not found in PATH.")
        sys.exit(1)

    print("[INFO] Updating to latest version...")
    _run_npm("install", "-g", "hermes-web-ui@latest")

    print()
    print("[OK] hermes-web-ui updated successfully.")
    print("[INFO] Restarting...")
    run_start()


def main():
    parser = argparse.ArgumentParser(
        prog="hermes.py",
        description="Hermes Web UI (EKKO) CLI",
    )
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("install", help="Install hermes-web-ui globally")
    sub.add_parser("config", help="Configure Hermes Agent address")
    sub.add_parser("start", help="Start Hermes Web UI")
    sub.add_parser("stop", help="Stop Hermes Web UI")
    sub.add_parser("status", help="Check running status")
    sub.add_parser("update", help="Update to latest version")

    args = parser.parse_args()
    if args.command is None:
        parser.print_help()
        sys.exit(1)

    cmd = args.command
    runner = f"run_{cmd}"
    if runner not in globals():
        print(f"[ERROR] Command '{cmd}' is not implemented yet.")
        sys.exit(1)
    globals()[runner]()


if __name__ == "__main__":
    main()
