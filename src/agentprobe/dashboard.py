"""Live HTML dashboard that auto-refreshes during a benchmark run."""

from __future__ import annotations

import html
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .runner import RunProgressEvent

logger = logging.getLogger(__name__)


def _esc(value: object) -> str:
    return html.escape(str(value)) if value else ""


def _pretty_json(value: object) -> str:
    if value in (None, "", [], {}):
        return ""
    return html.escape(json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True))


def _score_pct(value: object) -> int:
    if not isinstance(value, (int, float)):
        return 0
    return max(0, min(100, int(round(float(value) * 100))))


@dataclass
class _ScenarioState:
    scenario_id: str
    scenario_name: str | None = None
    status: str = "pending"
    score: float | None = None
    error: str | None = None
    started_at: float | None = None
    finished_at: float | None = None


@dataclass
class DashboardState:
    total: int = 0
    started_at: float = field(default_factory=time.monotonic)
    scenarios: dict[str, _ScenarioState] = field(default_factory=dict)
    _order: list[str] = field(default_factory=list)
    db_url: str | None = None
    run_id: str | None = None

    def update(self, event: RunProgressEvent) -> None:
        if event.kind == "suite_started":
            self.total = event.scenario_total or 0
            if event.run_id:
                self.run_id = event.run_id
            return

        sid = event.scenario_id or "unknown"
        if sid not in self.scenarios:
            self.scenarios[sid] = _ScenarioState(
                scenario_id=sid, scenario_name=event.scenario_name
            )
            self._order.append(sid)

        s = self.scenarios[sid]
        s.scenario_name = event.scenario_name or s.scenario_name

        if event.kind == "scenario_started":
            s.status = "running"
            s.started_at = time.monotonic()
        elif event.kind == "scenario_finished":
            s.status = "pass" if event.passed else "fail"
            s.score = event.overall_score
            s.finished_at = time.monotonic()
        elif event.kind == "scenario_error":
            s.status = "error"
            s.error = str(event.error) if event.error else None
            s.finished_at = time.monotonic()

    @property
    def ordered_scenarios(self) -> list[_ScenarioState]:
        return [self.scenarios[sid] for sid in self._order if sid in self.scenarios]

    @property
    def passed(self) -> int:
        return sum(1 for s in self.scenarios.values() if s.status == "pass")

    @property
    def failed(self) -> int:
        return sum(1 for s in self.scenarios.values() if s.status == "fail")

    @property
    def errored(self) -> int:
        return sum(1 for s in self.scenarios.values() if s.status == "error")

    @property
    def running(self) -> int:
        return sum(1 for s in self.scenarios.values() if s.status == "running")

    @property
    def done(self) -> int:
        return self.passed + self.failed + self.errored

    @property
    def elapsed_seconds(self) -> float:
        return time.monotonic() - self.started_at


def _load_run_scenarios(state: DashboardState) -> dict[int, dict[str, Any]]:
    """Load completed scenario data from DB, keyed by ordinal."""
    if not state.db_url or not state.run_id:
        return {}
    try:
        from .db import get_run
        run = get_run(state.run_id, include_trace=True, db_url=state.db_url)
        if run is None:
            return {}
        result: dict[int, dict[str, Any]] = {}
        for scenario in run.get("scenarios", []):
            ordinal = scenario.get("ordinal")
            if ordinal is not None and scenario.get("status") not in (None, "running", "pending"):
                result[ordinal] = scenario
        return result
    except Exception:
        logger.debug("Dashboard DB query failed", exc_info=True)
        return {}


def _render_turn_html(turn: dict[str, Any]) -> str:
    role = str(turn.get("role", "")).lower()
    content = turn.get("content") or ""
    turn_idx = turn.get("turn_index", -1)

    # Session boundary
    if role == "system" and isinstance(content, str) and content.startswith("--- Session boundary"):
        import re
        fields = {"session_id": "", "reset_policy": "", "time_offset": "", "user_id": ""}
        for m in re.finditer(
            r"session_id:\s*(\S+)|reset_policy:\s*(\S+)|time_offset:\s*(\S+)|user_id:\s*(\S+)",
            content,
        ):
            for i, key in enumerate(fields):
                if m.group(i + 1):
                    fields[key] = m.group(i + 1)
        pills = "".join(
            f'<span class="boundary-pill"><span class="pill-label">{k}:</span> {_esc(v)}</span>'
            for k, v in fields.items() if v
        )
        return f'<div class="turn turn-boundary"><div class="turn-header"><span class="turn-role role-boundary">Session Boundary</span><span class="turn-meta">Turn {turn_idx}</span></div><div class="boundary-pills">{pills}</div></div>'

    # Role styling
    role_class = {"user": "role-user", "assistant": "role-assistant"}.get(role, "role-system")
    turn_class = {"user": "turn-user", "assistant": "turn-assistant"}.get(role, "turn-system")
    role_label = {"user": "User", "assistant": "Assistant", "system": "System", "inject": "Inject", "checkpoint": "Checkpoint"}.get(role, role.capitalize())

    parts = [f'<div class="turn {turn_class}"><div class="turn-header"><span class="turn-role {role_class}">{role_label}</span>']
    source = turn.get("source")
    if source:
        parts.append(f'<span class="turn-source">{_esc(source)}</span>')
    parts.append(f'<span class="turn-meta">Turn {turn_idx}</span></div>')

    if content:
        parts.append(f'<div class="turn-content">{_esc(content)}</div>')

    # Tool calls
    tool_calls = turn.get("tool_calls", [])
    if tool_calls:
        parts.append('<div class="tool-calls"><div class="section-label">Tool Calls</div>')
        for tc in tool_calls:
            name = _esc(tc.get("name", "unknown"))
            args = _pretty_json(tc.get("args"))
            parts.append(f'<div class="tool-call"><div class="tool-name">{name}</div>')
            if args:
                parts.append(f'<pre class="tool-args">{args}</pre>')
            parts.append('</div>')
        parts.append('</div>')

    # Checkpoints
    checkpoints = turn.get("checkpoints", [])
    if checkpoints:
        parts.append('<div class="checkpoints">')
        for cp in checkpoints:
            cp_passed = cp.get("passed")
            cp_class = "cp-pass" if cp_passed else "cp-fail"
            cp_label = "PASS" if cp_passed else "FAIL"
            cp_idx = cp.get("checkpoint_index", "?")
            parts.append(f'<div class="checkpoint {cp_class}"><div class="cp-header"><span>Checkpoint {cp_idx}</span><span class="cp-status">{cp_label}</span></div>')
            for failure in cp.get("failures", []):
                parts.append(f'<div class="cp-failure">{_esc(failure)}</div>')
            parts.append('</div>')
        parts.append('</div>')

    parts.append('</div>')
    return "".join(parts)


def _build_turn_rows(scenario: dict[str, Any]) -> list[dict[str, Any]]:
    """Build turn rows with tool calls and checkpoints attached (mirrors report.py logic)."""
    tool_calls_by_turn: dict[int, list[dict[str, Any]]] = {}
    for tc in scenario.get("tool_calls", []):
        idx = int(tc.get("turn_index", -1))
        tool_calls_by_turn.setdefault(idx, []).append(tc)

    checkpoints_by_turn: dict[int | None, list[dict[str, Any]]] = {}
    for cp in scenario.get("checkpoints", []):
        preceding = cp.get("preceding_turn_index")
        key = int(preceding) if isinstance(preceding, int) else None
        checkpoints_by_turn.setdefault(key, []).append(cp)

    rows: list[dict[str, Any]] = []
    for turn in scenario.get("turns", []):
        idx = int(turn.get("turn_index", -1))
        rows.append({
            **turn,
            "tool_calls": tool_calls_by_turn.get(idx, []),
            "checkpoints": checkpoints_by_turn.get(idx, []),
        })
    return rows


def _render_dimensions_html(scenario: dict[str, Any]) -> str:
    dims = scenario.get("judge_dimension_scores", [])
    if not dims:
        return '<div class="no-data">No rubric dimensions recorded.</div>'

    parts: list[str] = []
    for d in dims:
        name = _esc(d.get("dimension_name", ""))
        dim_id = _esc(d.get("dimension_id", ""))
        raw = d.get("raw_score")
        scale = d.get("scale_points")
        weight = d.get("weight")
        normalized = d.get("normalized_score")
        pct = _score_pct(normalized)
        reasoning = _esc(d.get("reasoning", ""))
        evidence = d.get("evidence", [])

        score_label = f"{raw}" if raw is not None else "n/a"
        if scale is not None:
            score_label += f"/{scale}"
        weight_label = f"{weight}" if weight is not None else ""

        parts.append(f'''<div class="dimension">
          <div class="dim-header"><div><div class="dim-name">{name}</div><div class="dim-id">{dim_id}</div></div>
          <div class="dim-score-block"><div class="dim-score">{score_label}</div><div class="dim-weight">Weight {weight_label}</div></div></div>
          <div class="dim-bar"><div class="dim-fill" style="width:{pct}%"></div></div>
          <div class="dim-reasoning">{reasoning}</div>''')
        if evidence:
            parts.append('<div class="dim-evidence">')
            for e in evidence:
                parts.append(f'<div class="evidence-item">{_esc(e)}</div>')
            parts.append('</div>')
        parts.append('</div>')
    return "".join(parts)


def _render_detail_panel(ordinal: int, scenario: dict[str, Any]) -> str:
    sid = _esc(scenario.get("scenario_id", ""))
    name = _esc(scenario.get("scenario_name", ""))
    passed = scenario.get("passed")
    score = scenario.get("overall_score")
    threshold = scenario.get("pass_threshold")
    user_id = _esc(scenario.get("user_id", ""))
    status_label = "PASS" if passed else "FAIL"
    status_class = "detail-pass" if passed else "detail-fail"
    score_label = f"{score:.2f}" if isinstance(score, (int, float)) else "n/a"
    threshold_label = f"{threshold:.2f}" if isinstance(threshold, (int, float)) else "n/a"
    score_pct = _score_pct(score)

    judge = scenario.get("judge") or {}
    overall_notes = _esc(judge.get("overall_notes", ""))
    failure_mode = ""
    judge_output = judge.get("output")
    if isinstance(judge_output, dict):
        failure_mode = _esc(judge_output.get("failure_mode_detected", ""))

    # Build turns
    turn_rows = _build_turn_rows(scenario)
    turns_html = "".join(_render_turn_html(t) for t in turn_rows)

    # Dimensions
    dims_html = _render_dimensions_html(scenario)

    # Judge raw output
    judge_raw = _pretty_json(judge_output) if judge_output else ""

    return f'''<div class="detail-panel hidden" data-detail-ordinal="{ordinal}">
  <div class="detail-top">
    <button class="detail-close" onclick="closeDetail()">&times;</button>
    <div class="detail-score-header {status_class}">
      <div class="detail-title-block">
        <div class="detail-name">{name}</div>
        <div class="detail-sid">{sid}{(" / " + user_id) if user_id else ""}</div>
      </div>
      <div class="detail-score-block">
        <div class="detail-score-group"><div class="detail-score-label">Score</div><div class="detail-score-value">{score_label}</div></div>
        <div class="detail-score-group"><div class="detail-score-label">Threshold</div><div class="detail-score-value">{threshold_label}</div></div>
        <div class="detail-score-group"><div class="detail-score-label">Status</div><div class="detail-score-value">{status_label}</div></div>
        {"<div class='detail-score-group'><div class='detail-score-label'>Failure</div><div class='detail-score-value'>" + failure_mode + "</div></div>" if failure_mode else ""}
      </div>
      <div class="detail-bar"><div class="detail-bar-fill" style="width:{score_pct}%"></div></div>
    </div>
    <div class="detail-tabs">
      <button class="tab-btn tab-active" onclick="setDetailTab(this,'conversation')">Conversation</button>
      <button class="tab-btn" onclick="setDetailTab(this,'rubric')">Rubric</button>
    </div>
  </div>
  <div class="detail-body">
    <div class="detail-tab-content" data-tab="conversation">{turns_html}</div>
    <div class="detail-tab-content hidden" data-tab="rubric">
      {"<div class='overall-notes'><div class='section-label'>Overall Notes</div><div class='notes-text'>" + overall_notes + "</div></div>" if overall_notes else ""}
      {dims_html}
      {"<details class='judge-raw'><summary>Raw Judge Output</summary><pre>" + judge_raw + "</pre></details>" if judge_raw else ""}
    </div>
  </div>
</div>'''


def render_dashboard(state: DashboardState) -> str:
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    elapsed = state.elapsed_seconds
    elapsed_fmt = f"{int(elapsed // 60)}m {int(elapsed % 60)}s"
    done = state.done
    total = state.total or len(state.scenarios)
    pct = (done / total * 100) if total > 0 else 0

    # Load scenario details from DB
    db_scenarios = _load_run_scenarios(state)

    avg_scores: dict[str, list[float]] = {}
    for s in state.ordered_scenarios:
        base_id = s.scenario_id.split("#")[0]
        if s.score is not None:
            avg_scores.setdefault(base_id, []).append(s.score)

    rows: list[str] = []
    detail_panels: list[str] = []
    for ordinal, s in enumerate(state.ordered_scenarios):
        status_class = {
            "pending": "status-pending", "running": "status-running",
            "pass": "status-pass", "fail": "status-fail", "error": "status-error",
        }.get(s.status, "")
        status_label = {
            "pending": "PENDING", "running": "RUNNING",
            "pass": "PASS", "fail": "FAIL", "error": "ERROR",
        }.get(s.status, s.status.upper())

        score_cell = f"{s.score:.2f}" if s.score is not None else "-"
        name_cell = _esc(s.scenario_name or "")
        id_cell = _esc(s.scenario_id)

        duration = ""
        duration_attr = ""
        if s.started_at is not None:
            if s.finished_at is not None:
                dur = s.finished_at - s.started_at
                duration = f"{dur:.1f}s"
            else:
                elapsed_so_far = time.monotonic() - s.started_at
                duration = f"{elapsed_so_far:.0f}s"
                duration_attr = f' data-started="{elapsed_so_far:.1f}"'

        error_cell = ""
        if s.error:
            error_cell = f'<span class="error-text" title="{_esc(s.error)}">{_esc(s.error[:60])}</span>'

        has_detail = ordinal in db_scenarios
        clickable = ' class="clickable-row"' if has_detail else ""
        onclick = f' onclick="openDetail({ordinal})"' if has_detail else ""

        rows.append(
            f"<tr class='{status_class}'{clickable}{onclick}>"
            f"<td class='id-cell'>{id_cell}</td>"
            f"<td>{name_cell}</td>"
            f"<td class='status-badge'><span>{status_label}</span></td>"
            f"<td class='score-cell'>{score_cell}</td>"
            f"<td class='duration-cell'{duration_attr}>{duration}</td>"
            f"<td>{error_cell}</td>"
            f"</tr>"
        )

        if has_detail:
            detail_panels.append(_render_detail_panel(ordinal, db_scenarios[ordinal]))

    avg_rows: list[str] = []
    for base_id, scores in sorted(avg_scores.items()):
        avg = sum(scores) / len(scores)
        spread = max(scores) - min(scores) if len(scores) > 1 else 0
        n = len(scores)
        avg_class = "avg-pass" if avg >= 0.70 else "avg-fail"
        avg_rows.append(
            f"<tr class='{avg_class}'>"
            f"<td>{_esc(base_id)}</td>"
            f"<td>{avg:.3f}</td>"
            f"<td>{min(scores):.2f}</td>"
            f"<td>{max(scores):.2f}</td>"
            f"<td>{spread:.3f}</td>"
            f"<td>{n}</td>"
            f"</tr>"
        )

    all_done = done >= total and total > 0
    refresh_tag = "" if all_done else '<meta http-equiv="refresh" content="3">'
    status_dot = "done-dot" if all_done else "live-dot"
    status_text = "COMPLETE" if all_done else "LIVE"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{refresh_tag}
<title>AgentProbe Dashboard</title>
<style>
  :root {{
    --bg: #0f1117; --surface: #1a1d27; --border: #2a2d3a;
    --text: #e4e4e7; --muted: #71717a; --green: #22c55e;
    --red: #ef4444; --amber: #f59e0b; --blue: #3b82f6;
    --indigo: #6366f1; --surface2: #22252f;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Fira Code', monospace;
    background: var(--bg); color: var(--text); padding: 24px;
    font-size: 13px; line-height: 1.5;
  }}
  .header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }}
  .header h1 {{ font-size: 20px; font-weight: 600; }}
  .live-badge {{
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px; border-radius: 9999px;
    background: rgba(34,197,94,.12); color: var(--green);
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
  }}
  .live-dot {{ width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: pulse 1.5s ease infinite; }}
  .done-dot {{ width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }}
  @keyframes pulse {{ 0%,100% {{ opacity: 1; }} 50% {{ opacity: .3; }} }}
  .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }}
  .stat {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center; }}
  .stat-value {{ font-size: 28px; font-weight: 700; }}
  .stat-label {{ font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin-top: 4px; }}
  .progress-bar {{ width: 100%; height: 6px; background: var(--surface); border-radius: 3px; margin-bottom: 24px; overflow: hidden; }}
  .progress-fill {{ height: 100%; border-radius: 3px; transition: width .5s ease; }}
  .progress-pass {{ background: var(--green); }}
  .progress-fail {{ background: var(--red); }}
  .progress-running {{ background: var(--blue); animation: pulse 1.5s ease infinite; }}

  /* Table */
  table {{ width: 100%; border-collapse: collapse; }}
  th {{ text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--bg); z-index: 2; }}
  td {{ padding: 6px 12px; border-bottom: 1px solid var(--border); }}
  tr:hover {{ background: rgba(255,255,255,.02); }}
  .clickable-row {{ cursor: pointer; }}
  .clickable-row:hover {{ background: rgba(99,102,241,.08) !important; }}
  .id-cell {{ font-weight: 500; white-space: nowrap; }}
  .score-cell, .duration-cell {{ text-align: right; font-variant-numeric: tabular-nums; }}
  .status-badge span {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }}
  .status-pending .status-badge span {{ background: rgba(113,113,122,.15); color: var(--muted); }}
  .status-running .status-badge span {{ background: rgba(59,130,246,.15); color: var(--blue); }}
  .status-pass .status-badge span {{ background: rgba(34,197,94,.15); color: var(--green); }}
  .status-fail .status-badge span {{ background: rgba(239,68,68,.15); color: var(--red); }}
  .status-error .status-badge span {{ background: rgba(245,158,11,.15); color: var(--amber); }}
  .error-text {{ color: var(--amber); font-size: 11px; }}
  .section-title {{ font-size: 14px; font-weight: 600; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }}
  .avg-pass td {{ color: var(--green); }}
  .avg-fail td {{ color: var(--red); }}
  .avg-pass td:first-child, .avg-fail td:first-child {{ color: var(--text); }}
  .footer {{ margin-top: 24px; text-align: center; color: var(--muted); font-size: 11px; }}
  .hidden {{ display: none !important; }}

  /* Detail overlay */
  .detail-overlay {{
    position: fixed; top: 0; right: 0; bottom: 0; width: 70vw; min-width: 600px;
    background: var(--bg); border-left: 1px solid var(--border);
    z-index: 100; display: flex; flex-direction: column;
    box-shadow: -8px 0 32px rgba(0,0,0,.5);
    transform: translateX(100%); transition: transform .25s ease;
  }}
  .detail-overlay.open {{ transform: translateX(0); }}
  .detail-backdrop {{
    position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 99;
    opacity: 0; pointer-events: none; transition: opacity .25s ease;
  }}
  .detail-backdrop.open {{ opacity: 1; pointer-events: auto; }}

  .detail-panel {{ display: flex; flex-direction: column; height: 100%; }}
  .detail-top {{ flex-shrink: 0; padding: 16px 24px 0; }}
  .detail-close {{
    position: absolute; top: 12px; right: 16px; background: none; border: none;
    color: var(--muted); font-size: 28px; cursor: pointer; z-index: 5; padding: 4px 8px;
    line-height: 1;
  }}
  .detail-close:hover {{ color: var(--text); }}

  .detail-score-header {{
    border-radius: 12px; padding: 20px; margin-bottom: 16px;
  }}
  .detail-pass {{ background: linear-gradient(135deg, #166534 0%, #14532d 100%); }}
  .detail-fail {{ background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); }}
  .detail-title-block {{ margin-bottom: 16px; }}
  .detail-name {{ font-size: 18px; font-weight: 700; color: #fff; }}
  .detail-sid {{ font-size: 11px; color: rgba(255,255,255,.6); margin-top: 4px; }}
  .detail-score-block {{ display: flex; gap: 24px; flex-wrap: wrap; }}
  .detail-score-group {{ text-align: center; }}
  .detail-score-label {{ font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: rgba(255,255,255,.6); }}
  .detail-score-value {{ font-size: 22px; font-weight: 700; color: #fff; margin-top: 2px; }}
  .detail-bar {{ height: 6px; border-radius: 3px; background: rgba(255,255,255,.2); margin-top: 16px; }}
  .detail-bar-fill {{ height: 100%; border-radius: 3px; background: rgba(255,255,255,.8); }}

  .detail-tabs {{ display: flex; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }}
  .tab-btn {{
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
    padding: 6px 16px; color: var(--muted); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all .15s;
  }}
  .tab-btn:hover {{ color: var(--text); border-color: var(--muted); }}
  .tab-btn.tab-active {{ background: var(--indigo); color: #fff; border-color: var(--indigo); }}

  .detail-body {{ flex: 1; overflow-y: auto; padding: 16px 24px 24px; }}

  /* Turns */
  .turn {{ border-radius: 10px; padding: 12px 16px; margin-bottom: 8px; border: 1px solid var(--border); }}
  .turn-user {{ background: rgba(56,189,248,.06); border-color: rgba(56,189,248,.15); }}
  .turn-assistant {{ background: rgba(34,197,94,.06); border-color: rgba(34,197,94,.15); }}
  .turn-system {{ background: var(--surface); }}
  .turn-boundary {{ background: rgba(99,102,241,.08); border-color: rgba(99,102,241,.2); }}
  .turn-header {{ display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }}
  .turn-role {{
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
  }}
  .role-user {{ background: rgba(56,189,248,.15); color: #38bdf8; }}
  .role-assistant {{ background: rgba(34,197,94,.15); color: var(--green); }}
  .role-system {{ background: rgba(113,113,122,.15); color: var(--muted); }}
  .role-boundary {{ background: rgba(99,102,241,.15); color: var(--indigo); }}
  .turn-source {{ font-size: 11px; color: var(--muted); }}
  .turn-meta {{ font-size: 11px; color: var(--muted); margin-left: auto; }}
  .turn-content {{ white-space: pre-wrap; font-size: 13px; line-height: 1.7; color: rgba(228,228,231,.85); }}

  .boundary-pills {{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }}
  .boundary-pill {{
    display: inline-flex; align-items: center; gap: 4px;
    background: rgba(99,102,241,.12); border-radius: 4px; padding: 2px 8px;
    font-size: 11px; color: var(--indigo);
  }}
  .pill-label {{ font-size: 10px; text-transform: uppercase; color: rgba(99,102,241,.6); }}

  /* Tool calls */
  .tool-calls {{ margin-top: 10px; }}
  .section-label {{ font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin-bottom: 6px; font-weight: 600; }}
  .tool-call {{ background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; }}
  .tool-name {{ font-weight: 600; font-size: 12px; color: var(--amber); }}
  .tool-args {{ font-size: 11px; color: var(--muted); margin-top: 6px; background: rgba(0,0,0,.2); border-radius: 6px; padding: 8px; overflow-x: auto; white-space: pre-wrap; }}

  /* Checkpoints */
  .checkpoint {{ border-radius: 8px; padding: 10px 12px; margin-top: 8px; }}
  .cp-pass {{ background: rgba(34,197,94,.08); border: 1px solid rgba(34,197,94,.2); }}
  .cp-fail {{ background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2); }}
  .cp-header {{ display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; }}
  .cp-status {{ text-transform: uppercase; letter-spacing: .05em; }}
  .cp-pass .cp-status {{ color: var(--green); }}
  .cp-fail .cp-status {{ color: var(--red); }}
  .cp-failure {{ font-size: 12px; color: var(--red); margin-top: 4px; padding: 4px 8px; background: rgba(239,68,68,.05); border-radius: 4px; }}

  /* Dimensions */
  .dimension {{ background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }}
  .dim-header {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }}
  .dim-name {{ font-weight: 700; font-size: 14px; }}
  .dim-id {{ font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }}
  .dim-score-block {{ text-align: right; flex-shrink: 0; }}
  .dim-score {{ font-size: 20px; font-weight: 700; }}
  .dim-weight {{ font-size: 10px; color: var(--muted); }}
  .dim-bar {{ height: 4px; border-radius: 2px; background: rgba(255,255,255,.08); margin: 10px 0; }}
  .dim-fill {{ height: 100%; border-radius: 2px; background: var(--indigo); }}
  .dim-reasoning {{ font-size: 12px; line-height: 1.6; color: rgba(228,228,231,.7); white-space: pre-wrap; }}
  .dim-evidence {{ margin-top: 8px; }}
  .evidence-item {{ font-size: 11px; background: rgba(0,0,0,.2); border-radius: 4px; padding: 4px 8px; margin-top: 4px; color: var(--muted); }}
  .no-data {{ color: var(--muted); font-size: 12px; padding: 16px; text-align: center; }}

  .overall-notes {{ background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; }}
  .notes-text {{ font-size: 12px; line-height: 1.7; color: rgba(228,228,231,.7); white-space: pre-wrap; margin-top: 6px; }}
  .judge-raw {{ background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin-top: 16px; }}
  .judge-raw summary {{ cursor: pointer; font-size: 12px; font-weight: 600; color: var(--muted); }}
  .judge-raw pre {{ font-size: 11px; color: var(--muted); margin-top: 8px; overflow-x: auto; white-space: pre-wrap; }}
</style>
</head>
<body>
<div class="header">
  <h1>AgentProbe Live Dashboard</h1>
  <span class="live-badge"><span class="{status_dot}"></span> {status_text}</span>
</div>

<div class="stats">
  <div class="stat"><div class="stat-value" style="color:var(--text)">{done}/{total}</div><div class="stat-label">Completed</div></div>
  <div class="stat"><div class="stat-value" style="color:var(--green)">{state.passed}</div><div class="stat-label">Passed</div></div>
  <div class="stat"><div class="stat-value" style="color:var(--red)">{state.failed}</div><div class="stat-label">Failed</div></div>
  <div class="stat"><div class="stat-value" style="color:var(--amber)">{state.errored}</div><div class="stat-label">Errors</div></div>
  <div class="stat"><div class="stat-value" style="color:var(--blue)">{state.running}</div><div class="stat-label">Running</div></div>
  <div class="stat"><div class="stat-value" style="color:var(--muted)">{elapsed_fmt}</div><div class="stat-label">Elapsed</div></div>
  <div class="stat"><div class="stat-value" style="color:var(--indigo)">{pct:.0f}%</div><div class="stat-label">Progress</div></div>
</div>

<div class="progress-bar" style="display:flex">
  <div class="progress-fill progress-pass" style="width:{state.passed / total * 100 if total else 0:.1f}%"></div>
  <div class="progress-fill progress-fail" style="width:{state.failed / total * 100 if total else 0:.1f}%"></div>
  <div class="progress-fill progress-running" style="width:{state.running / total * 100 if total else 0:.1f}%"></div>
</div>

<div class="section-title">Scenarios <span style="color:var(--muted);font-weight:400;font-size:12px">(click completed rows to inspect)</span></div>
<table>
<thead><tr>
  <th>ID</th><th>Name</th><th>Status</th><th style="text-align:right">Score</th><th style="text-align:right">Duration</th><th>Error</th>
</tr></thead>
<tbody>
{"".join(rows)}
</tbody>
</table>

{"" if not avg_rows else f'''
<div class="section-title">Averages (across repeats)</div>
<table>
<thead><tr><th>Scenario</th><th style="text-align:right">Avg</th><th style="text-align:right">Min</th><th style="text-align:right">Max</th><th style="text-align:right">Spread</th><th style="text-align:right">N</th></tr></thead>
<tbody>{"".join(avg_rows)}</tbody>
</table>
'''}

<div class="footer">Last updated: {now_str} &middot; {elapsed_fmt} elapsed</div>

<!-- Detail overlay -->
<div class="detail-backdrop" id="detailBackdrop" onclick="closeDetail()"></div>
<div class="detail-overlay" id="detailOverlay">
{"".join(detail_panels)}
</div>

<script>
function openDetail(ordinal) {{
  document.querySelectorAll('.detail-panel').forEach(p => p.classList.add('hidden'));
  const panel = document.querySelector('[data-detail-ordinal="'+ordinal+'"]');
  if (!panel) return;
  panel.classList.remove('hidden');
  document.getElementById('detailOverlay').classList.add('open');
  document.getElementById('detailBackdrop').classList.add('open');
  // Persist in hash so refresh keeps it open
  const tab = panel.querySelector('.tab-btn.tab-active');
  const tabName = tab ? tab.textContent.trim().toLowerCase() : 'conversation';
  location.hash = 'detail=' + ordinal + '&tab=' + tabName;
}}

function closeDetail() {{
  document.getElementById('detailOverlay').classList.remove('open');
  document.getElementById('detailBackdrop').classList.remove('open');
  history.replaceState(null, '', location.pathname + location.search);
}}

function setDetailTab(btn, tab) {{
  const panel = btn.closest('.detail-panel');
  panel.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
  btn.classList.add('tab-active');
  panel.querySelectorAll('.detail-tab-content').forEach(c => {{
    c.classList.toggle('hidden', c.dataset.tab !== tab);
  }});
  // Update hash with new tab
  const ordinal = panel.dataset.detailOrdinal;
  location.hash = 'detail=' + ordinal + '&tab=' + tab;
}}

document.addEventListener('keydown', e => {{
  if (e.key === 'Escape') closeDetail();
}});

// Restore sidebar state from hash on load
(function restoreFromHash() {{
  const hash = location.hash.slice(1);
  if (!hash.startsWith('detail=')) return;
  const params = new URLSearchParams(hash);
  const ordinal = params.get('detail');
  const tab = params.get('tab') || 'conversation';
  if (ordinal === null) return;
  const panel = document.querySelector('[data-detail-ordinal="'+ordinal+'"]');
  if (!panel) return;
  document.querySelectorAll('.detail-panel').forEach(p => p.classList.add('hidden'));
  panel.classList.remove('hidden');
  document.getElementById('detailOverlay').classList.add('open');
  document.getElementById('detailBackdrop').classList.add('open');
  // Activate the right tab
  const tabBtn = [...panel.querySelectorAll('.tab-btn')].find(b => b.textContent.trim().toLowerCase() === tab);
  if (tabBtn) {{
    panel.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    tabBtn.classList.add('tab-active');
    panel.querySelectorAll('.detail-tab-content').forEach(c => {{
      c.classList.toggle('hidden', c.dataset.tab !== tab);
    }});
  }}
  // Preserve scroll position
  const scrollKey = 'agentprobe_scroll_' + ordinal;
  const saved = sessionStorage.getItem(scrollKey);
  if (saved) {{
    const body = panel.querySelector('.detail-body');
    if (body) requestAnimationFrame(() => body.scrollTop = parseInt(saved));
  }}
}})();

// Save scroll position before refresh
window.addEventListener('beforeunload', () => {{
  document.querySelectorAll('.detail-panel:not(.hidden)').forEach(panel => {{
    const ordinal = panel.dataset.detailOrdinal;
    const body = panel.querySelector('.detail-body');
    if (body && ordinal) {{
      sessionStorage.setItem('agentprobe_scroll_' + ordinal, body.scrollTop);
    }}
  }});
}});

// Live duration counter for running scenarios
(function tickDurations() {{
  const cells = document.querySelectorAll('td[data-started]');
  if (!cells.length) return;
  const t0 = performance.now();
  setInterval(() => {{
    const dt = (performance.now() - t0) / 1000;
    cells.forEach(cell => {{
      const base = parseFloat(cell.dataset.started);
      cell.textContent = (base + dt).toFixed(0) + 's';
    }});
  }}, 1000);
}})();
</script>
</body>
</html>"""


def write_dashboard(state: DashboardState, path: Path) -> None:
    path.write_text(render_dashboard(state), encoding="utf-8")
