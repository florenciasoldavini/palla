"""Exercise the real onboarding form in the development-only, no-write preview.

Requires a running Metro server and installed Expo Go. Uses the installed AXe
driver on iOS and adb on Android. Never enters credentials or mutates accounts.
"""
import argparse
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--platform", choices=["ios", "android"], required=True)
parser.add_argument("--device")
parser.add_argument("--axe")
parser.add_argument("--adb", default=str(Path.home() / "Library/Android/sdk/platform-tools/adb"))
parser.add_argument("--port", default="8081")
parser.add_argument("--output")
parser.add_argument("--case", action="append", help="Run only this mode-status case; may be repeated.")
parser.add_argument("--resume", action="store_true", help="Keep completed cases from this device's existing report and retry unfinished cases.")
args = parser.parse_args()
if args.platform == "ios":
    if not args.axe:
        candidates = list((Path.home() / ".npm/_npx").glob("*/node_modules/xcodebuildmcp/bundled/axe"))
        if not candidates:
            parser.error("Pass --axe pointing to the installed XcodeBuildMCP bundled/axe driver.")
        args.axe = str(max(candidates, key=lambda p: p.stat().st_mtime))
    if not args.device:
        inventory = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "booted", "-j"]))
        booted = [d["udid"] for group in inventory["devices"].values() for d in group if d["state"] == "Booted"]
        if len(booted) != 1:
            parser.error("Boot one iOS simulator, or choose it explicitly with --device UDID.")
        args.device = booted[0]
elif not args.device:
    inventory = subprocess.check_output([args.adb, "devices"], text=True)
    booted = [line.split()[0] for line in inventory.splitlines() if line.startswith("emulator-") and line.endswith("\tdevice")]
    if len(booted) != 1:
        parser.error("Start one Android emulator, or choose it explicitly with --device SERIAL.")
    args.device = booted[0]
output = Path(args.output or f".impeccable/review/native/onboarding-{args.platform}")
output.mkdir(parents=True, exist_ok=True)
checks = []
if args.resume and (output / "report.json").exists():
    previous = json.loads((output / "report.json").read_text())
    if previous.get("device") != args.device or previous.get("platform") != args.platform:
        parser.error("Resume report belongs to a different device or platform.")
    checks = previous.get("checks", [])

def command(*argv, check=True):
    return subprocess.run(list(argv), capture_output=True, text=True, check=check).stdout

def axe(*argv):
    return command(args.axe, *argv, "--udid", args.device)

def adb(*argv):
    return command(args.adb, "-s", args.device, *argv)

def tree():
    if args.platform == "ios":
        raw = json.loads(axe("describe-ui"))
        nodes = []
        def walk(value):
            if isinstance(value, dict):
                if "frame" in value:
                    nodes.append(value)
                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)
        walk(raw)
        return nodes
    raw = adb("exec-out", "uiautomator", "dump", "/dev/tty")
    return [n.attrib for n in ET.fromstring(raw[raw.index("<?xml"):raw.index("</hierarchy>") + 12]).iter("node")]

def labels(node):
    return [str(node.get(k, "")).strip() for k in ("AXLabel", "AXValue", "text", "content-desc")]

def frame(node):
    if args.platform == "ios":
        f = node["frame"]
        return f["x"], f["y"], f["width"], f["height"]
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", node["bounds"]))
    return x1, y1, x2-x1, y2-y1

def find(text, nodes=None):
    for n in nodes if nodes is not None else tree():
        if text in labels(n):
            x, y, w, h = frame(n)
            if w > 0 and h > 0:
                return n
    return None

def wait(text, timeout=25):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        nodes = tree()
        n = find(text, nodes)
        if n:
            return n
        time.sleep(0.3)
    raise AssertionError(f"Missing native UI: {text}")

def mark(name):
    if name not in checks:
        checks.append(name)
    print(f"PASS {name}", flush=True)

def scroll(reverse=False):
    if args.platform == "ios":
        axe("swipe", "--start-x", "200", "--start-y", "340" if reverse else "730", "--end-x", "200", "--end-y", "730" if reverse else "340", "--duration", "0.4", "--post-delay", "0.3")
    else:
        adb("shell", "input", "swipe", "540", "850" if reverse else "1900", "540", "1900" if reverse else "850", "350")

def tap(text):
    for attempt in range(5):
        n = find(text)
        if n is None:
            scroll(reverse=text.startswith("Back"))
            continue
        x, y, w, h = frame(n)
        screen_height = 874 if args.platform == "ios" else 2400
        if y+h/2 < 65:
            scroll(reverse=True)
            continue
        if y+h/2 >= screen_height-35:
            scroll()
            continue
        if args.platform == "ios":
            # Full tree includes RN radio semantics as GenericElement/AXValue;
            # plugin rs/1 filtering does not. Physical HID also handles focus.
            axe("tap", "-x", str(x+w/2), "-y", str(y+h/2), "--tap-style", "physical", "--post-delay", "0.3")
        else:
            adb("shell", "input", "tap", str(round(x+w/2)), str(round(y+h/2)))
        return
    raise AssertionError(f"Could not scroll into view: {text}")

def type_into(placeholder, text):
    if args.platform == "android":
        # Avoid tapping a field through an existing IME window.
        nodes = tree()
        if any("inputmethod" in n.get("package", "") for n in nodes):
            adb("shell", "input", "keyevent", "4")
    tap(placeholder)
    if args.platform == "ios":
        # Separate HID dispatches avoid dropped/reordered keys on this runtime.
        for character in text:
            axe("type", character)
    else:
        adb("shell", "input", "text", text.replace(" ", "%s"))
    wait(text)

def screenshot(name):
    file = output / f"{name}.png"
    if args.platform == "ios":
        command("xcrun", "simctl", "io", args.device, "screenshot", str(file))
    else:
        file.write_bytes(subprocess.run([args.adb, "-s", args.device, "exec-out", "screencap", "-p"], check=True, capture_output=True).stdout)

def open_preview():
    url = f"exp://127.0.0.1:{args.port}/--/onboarding-preview?nativeQa=1"
    if args.platform == "ios":
        command("xcrun", "simctl", "terminate", args.device, "host.exp.Exponent", check=False)
        command("xcrun", "simctl", "openurl", args.device, url)
    else:
        adb("reverse", f"tcp:{args.port}", f"tcp:{args.port}")
        adb("shell", "am", "force-stop", "host.exp.exponent")
        adb("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", url)
    try:
        wait("How will you use Palla?", timeout=25)
    except AssertionError:
        # A cold Expo Go launch can consume its first URL before the experience
        # is ready. Re-deliver once when warm, without another process restart.
        if args.platform == "android":
            adb("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", url)
        else:
            command("xcrun", "simctl", "openurl", args.device, url)
        wait("How will you use Palla?")
    if args.platform == "ios":
        # Expo Go can present its tutorial after the experience's mount effect.
        # Its native sheet isn't exposed as accessible buttons. On this initial
        # role screen no app sheet is open; dismiss the observed host sheet using
        # its fresh native frame and the host's top-right close control.
        time.sleep(2)
        sheet = find("Bottom Sheet")
        if sheet:
            x, y, w, _ = frame(sheet)
            axe("tap", "-x", str(x+w-26), "-y", str(y+26), "--tap-style", "physical", "--post-delay", "0.5")
            assert find("Bottom Sheet") is None, "Expo Go tutorial still covers the form"

cases = [
    ("player", "known", "6ta"),
    ("player", "beginner", None),
    ("player", "unknown", None),
    ("organizer", "skipped", None),
]
try:
    started = False
    for index, (mode, status, category) in enumerate(cases):
        case = f"{mode}-{status}"
        if args.case and case not in args.case:
            continue
        if args.resume and f"{case}: full preview completion" in checks:
            continue
        if not started:
            open_preview()
            started = True
        else:
            tap("Review again")
            wait("How will you use Palla?")
        tap("Player. Find sessions and meet people on court." if mode == "player" else "Organizer. Host sessions and manage your players.")
        tap("Continue")
        wait("What should we call you?")
        name_action = "Start organizing" if mode == "organizer" else "Continue"
        wait("Step 2 of 2" if mode == "organizer" else "Step 2 of 3") if args.platform == "ios" else None
        tap(name_action)
        wait("Enter your first name")
        mark(f"{case}: empty name blocked")
        type_into("Your first name", "Alex")
        type_into("Your last name", "Smith")
        screenshot(f"{case}-keyboard")
        if args.platform == "android" and any("inputmethod" in n.get("package", "") for n in tree()):
            adb("shell", "input", "keyevent", "4")
        # Explicit back button works on both OSes with or without keyboard.
        tap("Back to mode selection")
        wait("How will you use Palla?")
        tap("Continue")
        wait("Alex")
        wait("Smith")
        mark(f"{case}: name draft survives back")
        if mode == "organizer":
            assert find("What’s your category?") is None
            screenshot(f"{case}-name")
            mark(f"{case}: two-step organizer flow")
            tap("Start organizing")
        else:
            tap("Continue")
            wait("What’s your category?")
            action = "Start playing" if mode == "player" else "Start organizing"
            tap(action)
            wait("Choose an option to continue")
            mark(f"{case}: unanswered category blocked")
            if status == "known":
                tap("I know my category")
                wait("Your category, choose a category")
                tap(category)
                wait(f"Your category, {category}")
            else:
                tap({"beginner": "I’m just starting", "unknown": "Not sure yet", "not_playing": "I don’t play"}[status])
            screenshot(f"{case}-category")
            if args.platform == "android" and index == 0:
                adb("shell", "input", "keyevent", "4")
                wait("What should we call you?")
                tap("Continue")
            else:
                tap("Back to your name")
                wait("What should we call you?")
                tap("Continue")
            wait("What’s your category?")
            if category:
                wait(f"Your category, {category}")
            mark(f"{case}: category draft survives back")
            tap(action)
        wait("You're ready, Alex.")
        expected_home = "player home" if mode == "player" else "organizer dashboard"
        nodes = tree()
        assert any(expected_home in text for n in nodes for text in labels(n)), "Wrong preview destination"
        wait(f"Category: {category or status}") if mode == "player" else wait("Category:")
        screenshot(f"{case}-complete")
        mark(f"{case}: full preview completion")
    report = {"platform": args.platform, "device": args.device, "scope": "Development preview: real form, no account writes", "checks": checks, "passed": True}
except Exception as error:
    screenshot("failure")
    report = {"platform": args.platform, "device": args.device, "checks": checks, "passed": False, "error": str(error)}
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    raise
(output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
print(f"All {len(checks)} checks passed on {args.platform}.", flush=True)
