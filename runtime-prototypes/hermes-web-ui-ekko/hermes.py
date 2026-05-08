#!/usr/bin/env python3
"""Hermes Web UI CLI — 统一管理安装、配置、启停、更新。"""
import argparse
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
    result = subprocess.run(
        ["hermes-web-ui", *args],
        check=False,
    )
    if result.returncode != 0:
        sys.exit(result.returncode)


def _scan_ports(ports: list[int] = None) -> list[int]:
    """Scan localhost for listening ports. Return list of found ports."""
    if ports is None:
        ports = [8056, 8642, 3000, 5000, 8080, 8888]

    found = []
    for port in ports:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        try:
            s.connect(("127.0.0.1", port))
            s.close()
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

    # Run config and start automatically
    print("[INFO] Configuring Hermes address...")
    run_config()

    print()
    print("[INFO] Launching...")
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
