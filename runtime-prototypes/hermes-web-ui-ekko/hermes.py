#!/usr/bin/env python3
"""Hermes Web UI CLI — 统一管理安装、配置、启停、更新。"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent


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
    globals()[runner]()


if __name__ == "__main__":
    main()
