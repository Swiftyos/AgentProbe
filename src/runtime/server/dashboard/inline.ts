export const DEFAULT_DASHBOARD_HTML = "__INLINE_DASHBOARD__";

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AgentProbe Server</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        background: #0f1115;
        color: #f5f5f5;
        min-height: 100vh;
      }
      header {
        padding: 16px 24px;
        border-bottom: 1px solid #1e222b;
        display: flex;
        gap: 16px;
        align-items: center;
        background: #171a21;
      }
      header nav {
        display: flex;
        gap: 12px;
      }
      header nav a {
        color: #c9d1d9;
        text-decoration: none;
        padding: 6px 10px;
        border-radius: 6px;
      }
      header nav a.active {
        background: #1f6feb;
        color: white;
      }
      main {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
      }
      th,
      td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #1e222b;
        font-size: 13px;
      }
      th {
        color: #8b949e;
        font-weight: 600;
      }
      tr:hover td {
        background: #171a21;
      }
      .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
      }
      .badge-pass {
        background: #1a7f37;
      }
      .badge-fail {
        background: #d73a49;
      }
      .badge-running {
        background: #1f6feb;
      }
      .badge-unknown {
        background: #6e7681;
      }
      pre {
        background: #0a0d12;
        padding: 12px;
        border-radius: 6px;
        overflow: auto;
        font-size: 12px;
      }
      code {
        font-family: "Menlo", "Consolas", monospace;
      }
      a {
        color: #58a6ff;
      }
      .card {
        background: #171a21;
        border: 1px solid #1e222b;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      .stat {
        background: #0f1115;
        border: 1px solid #1e222b;
        border-radius: 8px;
        padding: 12px;
      }
      .stat-label {
        font-size: 12px;
        color: #8b949e;
        text-transform: uppercase;
      }
      .stat-value {
        font-size: 24px;
        font-weight: 700;
        margin-top: 4px;
      }
      #error {
        display: none;
        padding: 12px;
        background: #5a1d1d;
        border: 1px solid #d73a49;
        border-radius: 6px;
        margin-bottom: 16px;
      }
      label {
        display: block;
        font-size: 12px;
        color: #8b949e;
        margin-bottom: 4px;
      }
      input[type="password"],
      input[type="text"] {
        padding: 6px 8px;
        border-radius: 4px;
        border: 1px solid #30363d;
        background: #0a0d12;
        color: #f5f5f5;
      }
      button {
        padding: 6px 12px;
        border-radius: 4px;
        border: none;
        background: #1f6feb;
        color: white;
        cursor: pointer;
      }
      button:disabled {
        background: #30363d;
        color: #8b949e;
        cursor: not-allowed;
      }
      .compare-toolbar {
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .compare-hint {
        color: #8b949e;
        font-size: 12px;
      }
      .badge-improved {
        background: #1a7f37;
      }
      .badge-regressed {
        background: #d73a49;
      }
      .badge-mixed {
        background: #b08800;
      }
      .badge-unchanged {
        background: #30363d;
      }
      .delta-pos {
        color: #57a463;
      }
      .delta-neg {
        color: #f85149;
      }
      .muted {
        color: #8b949e;
        font-size: 11px;
      }
      .scenario-header {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 12px;
      }
      .scenario-title h2 {
        margin: 0 0 4px 0;
      }
      .scenario-sid {
        font-family: Menlo, Consolas, monospace;
        font-size: 11px;
        color: #6e7681;
      }
      .score-block {
        display: flex;
        gap: 20px;
      }
      .score-stat {
        text-align: right;
      }
      .score-stat-label {
        font-size: 10px;
        color: #6e7681;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .score-stat-value {
        font-size: 20px;
        font-weight: 700;
        margin-top: 2px;
      }
      .tabs {
        display: flex;
        gap: 4px;
        border-bottom: 1px solid #1e222b;
        margin-bottom: 16px;
      }
      .tab-btn {
        padding: 8px 16px;
        background: transparent;
        color: #8b949e;
        border: none;
        border-bottom: 2px solid transparent;
        border-radius: 0;
        cursor: pointer;
        font-size: 13px;
      }
      .tab-btn.active {
        color: #f5f5f5;
        border-bottom-color: #1f6feb;
      }
      .tab-pane {
        display: none;
      }
      .tab-pane.active {
        display: block;
      }
      .chat-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .chat-row {
        display: flex;
        flex-direction: column;
      }
      .chat-row.user {
        align-items: flex-end;
      }
      .chat-row.assistant {
        align-items: flex-start;
      }
      .chat-row.system {
        align-items: stretch;
      }
      .chat-bubble {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 14px;
        font-size: 13px;
        line-height: 1.55;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .chat-bubble.user {
        background: #1f2937;
        border-bottom-right-radius: 4px;
        color: #f5f5f5;
      }
      .chat-bubble.assistant {
        background: transparent;
        padding-left: 0;
        padding-right: 0;
        max-width: 95%;
        width: 100%;
      }
      .chat-meta {
        font-size: 10px;
        color: #6e7681;
        margin-top: 4px;
      }
      .chat-divider {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6e7681;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 4px 0;
      }
      .chat-divider::before,
      .chat-divider::after {
        content: "";
        flex: 1;
        height: 1px;
        background: #1e222b;
      }
      .chat-divider-fields {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: center;
        margin-top: 6px;
      }
      .chat-pill {
        display: inline-flex;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        background: #0a0d12;
        border: 1px solid #1e222b;
        font-family: Menlo, Consolas, monospace;
        font-size: 10px;
        color: #c9d1d9;
      }
      .chat-pill .pill-key {
        color: #6e7681;
      }
      .system-note {
        text-align: center;
        font-size: 11px;
        color: #8b949e;
        max-width: 85%;
        margin: 4px auto 0;
        white-space: pre-wrap;
      }
      .tool-detail {
        background: #0a0d12;
        border: 1px solid #1e222b;
        border-radius: 6px;
        padding: 6px 10px;
        margin-top: 8px;
        font-size: 11px;
      }
      .tool-detail summary {
        cursor: pointer;
        color: #8b949e;
        list-style: none;
      }
      .tool-detail summary::-webkit-details-marker {
        display: none;
      }
      .tool-detail .tool-label {
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 10px;
        color: #6e7681;
        margin-right: 6px;
      }
      .tool-detail .tool-name {
        color: #58a6ff;
        font-family: Menlo, Consolas, monospace;
      }
      .tool-detail pre {
        margin: 8px 0 0;
        background: transparent;
        padding: 0;
        font-size: 11px;
      }
      .cp-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .cp-pill {
        display: inline-flex;
        gap: 4px;
        align-items: center;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
      }
      .cp-pill.pass {
        background: rgba(26, 127, 55, 0.2);
        color: #57a463;
      }
      .cp-pill.fail {
        background: rgba(215, 58, 73, 0.2);
        color: #f85149;
        cursor: pointer;
      }
      .cp-failures {
        margin: 4px 0 0 18px;
        padding: 0 0 0 12px;
        font-size: 11px;
        color: #f85149;
      }
      .judge-overall {
        background: #0a0d12;
        border-left: 3px solid #1f6feb;
        padding: 12px 14px;
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 13px;
        line-height: 1.55;
        white-space: pre-wrap;
      }
      .dim-score {
        background: #0a0d12;
        border: 1px solid #1e222b;
        border-radius: 6px;
        padding: 12px 14px;
        margin-bottom: 8px;
      }
      .dim-score-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 6px;
        gap: 12px;
      }
      .dim-score-name {
        font-weight: 600;
        font-size: 13px;
      }
      .dim-score-value {
        font-family: Menlo, Consolas, monospace;
        font-size: 12px;
        color: #8b949e;
        white-space: nowrap;
      }
      .dim-score-bar {
        height: 4px;
        background: #1e222b;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      .dim-score-fill {
        height: 100%;
        background: #1f6feb;
      }
      .dim-score-reason {
        font-size: 12px;
        color: #c9d1d9;
        line-height: 1.55;
        white-space: pre-wrap;
      }
      .dim-score-evidence {
        margin-top: 10px;
      }
      .dim-score-evidence summary {
        font-size: 11px;
        color: #8b949e;
        cursor: pointer;
      }
      .dim-score-evidence ul {
        margin: 6px 0 0;
        padding-left: 18px;
        font-size: 11px;
        color: #c9d1d9;
      }
    </style>
  </head>
  <body>
    <header>
      <strong>AgentProbe</strong>
      <nav>
        <a href="/" data-view="overview">Overview</a>
        <a href="/runs" data-view="runs">Runs</a>
        <a href="/suites" data-view="suites">Suites</a>
        <a href="/settings" data-view="settings">Settings</a>
      </nav>
    </header>
    <main>
      <div id="error"></div>
      <section id="content"></section>
    </main>
    <script>
      (function () {
        const content = document.getElementById("content");
        const errorBox = document.getElementById("error");

        function setActiveNav(pathname) {
          const links = document.querySelectorAll("header nav a");
          links.forEach(function (link) {
            const href = link.getAttribute("href");
            link.classList.toggle(
              "active",
              pathname === href ||
                (href !== "/" && pathname.startsWith(href)),
            );
          });
        }

        async function api(path) {
          const response = await fetch(path);
          const text = await response.text();
          let body = null;
          try {
            body = JSON.parse(text);
          } catch (error) {
            body = { raw: text };
          }
          if (!response.ok) {
            throw new Error(
              (body && body.error && body.error.message) ||
                "Request failed: " + response.status,
            );
          }
          return body;
        }

        function escapeHtml(value) {
          return String(value).replace(/[&<>"]/g, function (ch) {
            return {
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
            }[ch];
          });
        }

        function formatCount(value) {
          return escapeHtml(value === null || value === undefined ? 0 : value);
        }

        function formatScore(value) {
          if (value === null || value === undefined) {
            return "-";
          }
          const number = Number(value);
          return Number.isFinite(number)
            ? escapeHtml(number.toFixed(2))
            : escapeHtml(value);
        }

        function runStatusBadge(run) {
          if (run.status === "running") {
            return '<span class="badge badge-running">running</span>';
          }
          if (run.status === "completed") {
            const cls = run.passed ? "badge-pass" : "badge-fail";
            return (
              '<span class="badge ' +
              cls +
              '">' +
              (run.passed ? "pass" : "fail") +
              "</span>"
            );
          }
          return (
            '<span class="badge badge-unknown">' +
            escapeHtml(run.status) +
            "</span>"
          );
        }

        async function renderOverview() {
          try {
            const runs = await api("/api/runs?limit=5");
            const suites = await api("/api/suites");
            const totals = (runs.runs || []).reduce(
              function (acc, run) {
                acc.total += 1;
                if (run.passed === true) acc.passed += 1;
                if (run.passed === false) acc.failed += 1;
                return acc;
              },
              { total: 0, passed: 0, failed: 0 },
            );
            content.innerHTML =
              '<div class="grid">' +
              '<div class="stat"><div class="stat-label">Recent runs</div><div class="stat-value">' +
              formatCount(runs.total) +
              "</div></div>" +
              '<div class="stat"><div class="stat-label">Passed</div><div class="stat-value">' +
              formatCount(totals.passed) +
              "</div></div>" +
              '<div class="stat"><div class="stat-label">Failed</div><div class="stat-value">' +
              formatCount(totals.failed) +
              "</div></div>" +
              '<div class="stat"><div class="stat-label">Suites</div><div class="stat-value">' +
              formatCount((suites.suites || []).length) +
              "</div></div>" +
              "</div>" +
              '<div class="card"><h3>Latest runs</h3>' +
              compareToolbarHtml() +
              renderRunsTable(runs.runs || [], { selectable: true }) +
              "</div>";
            bindCompareControls();
          } catch (error) {
            showError(error);
          }
        }

        function compareToolbarHtml() {
          return (
            '<div class="compare-toolbar">' +
            '<button id="compare-runs" disabled>Compare selected</button>' +
            '<span id="compare-hint" class="compare-hint">Pick 2+ runs to compare</span>' +
            "</div>"
          );
        }

        function bindCompareControls() {
          const button = document.getElementById("compare-runs");
          if (!button) {
            return;
          }
          const hint = document.getElementById("compare-hint");
          function selectedIds() {
            const checked = document.querySelectorAll(
              "input.compare-pick:checked",
            );
            const ids = [];
            checked.forEach(function (cb) {
              const id = cb.getAttribute("data-run-id");
              if (id) ids.push(id);
            });
            return ids;
          }
          function refresh() {
            const ids = selectedIds();
            const valid = ids.length >= 2 && ids.length <= 10;
            button.disabled = !valid;
            if (hint) {
              if (ids.length === 0) {
                hint.textContent = "Pick 2+ runs to compare";
              } else if (ids.length === 1) {
                hint.textContent = "Pick at least one more run";
              } else if (ids.length > 10) {
                hint.textContent = "Maximum 10 runs at a time";
              } else {
                hint.textContent = ids.length + " runs selected";
              }
            }
          }
          const checkboxes = document.querySelectorAll("input.compare-pick");
          checkboxes.forEach(function (cb) {
            cb.addEventListener("change", refresh);
          });
          button.addEventListener("click", function () {
            const ids = selectedIds();
            if (ids.length < 2) return;
            const target = "/compare?run_ids=" + ids.join(",");
            window.history.pushState({}, "", target);
            handleRoute();
          });
          refresh();
        }

        function renderRunsTable(runs, options) {
          const opts = options || {};
          const selectable = opts.selectable === true;
          if (!runs.length) {
            return "<p>No runs recorded yet.</p>";
          }
          const rows = runs
            .map(function (run) {
              const counts = run.aggregateCounts || {};
              const checkboxCell = selectable
                ? '<td><input type="checkbox" class="compare-pick" data-run-id="' +
                  escapeHtml(run.runId) +
                  '" /></td>'
                : "";
              return (
                "<tr>" +
                checkboxCell +
                '<td><a href="/runs/' +
                escapeHtml(run.runId) +
                '">' +
                escapeHtml(run.runId.slice(0, 12)) +
                "</a></td>" +
                "<td>" +
                runStatusBadge(run) +
                "</td>" +
                "<td>" +
                escapeHtml(run.preset || "") +
                "</td>" +
                "<td>" +
                escapeHtml(run.startedAt) +
                "</td>" +
                "<td>" +
                formatCount(counts.scenarioPassedCount) +
                "/" +
                formatCount(counts.scenarioTotal) +
                "</td>" +
                "</tr>"
              );
            })
            .join("");
          const headerExtra = selectable ? "<th></th>" : "";
          return (
            "<table><thead><tr>" +
            headerExtra +
            "<th>Run</th><th>Status</th><th>Preset</th><th>Started</th><th>Passed/Total</th>" +
            "</tr></thead><tbody>" +
            rows +
            "</tbody></table>"
          );
        }

        async function renderRuns() {
          try {
            const runs = await api("/api/runs");
            content.innerHTML =
              '<div class="card"><h2>Runs</h2>' +
              compareToolbarHtml() +
              renderRunsTable(runs.runs || [], { selectable: true }) +
              "</div>";
            bindCompareControls();
          } catch (error) {
            showError(error);
          }
        }

        function comparisonStatusBadge(status) {
          const map = {
            pass: "badge-pass",
            fail: "badge-fail",
            harness_fail: "badge-fail",
            error: "badge-fail",
            running: "badge-running",
            missing: "badge-unknown",
          };
          const cls = map[status] || "badge-unknown";
          return (
            '<span class="badge ' +
            cls +
            '">' +
            escapeHtml(status) +
            "</span>"
          );
        }

        function statusChangeBadge(change) {
          const cls =
            change === "regressed"
              ? "badge-regressed"
              : change === "improved"
                ? "badge-improved"
                : change === "mixed"
                  ? "badge-mixed"
                  : "badge-unchanged";
          return (
            '<span class="badge ' + cls + '">' + escapeHtml(change) + "</span>"
          );
        }

        function formatDelta(value) {
          if (value === null || value === undefined) {
            return '<span class="muted">-</span>';
          }
          const number = Number(value);
          if (!Number.isFinite(number)) {
            return escapeHtml(String(value));
          }
          const sign = number > 0 ? "+" : "";
          const cls =
            number > 0 ? "delta-pos" : number < 0 ? "delta-neg" : "muted";
          return (
            '<span class="' + cls + '">' + sign + number.toFixed(2) + "</span>"
          );
        }

        async function renderCompare(runIds) {
          try {
            const data = await api(
              "/api/comparisons?run_ids=" +
                encodeURIComponent(runIds.join(",")),
            );
            const runs = data.runs || [];
            const scenarios = data.scenarios || [];
            const summary = data.summary || {};

            const runHeaderCells = runs
              .map(function (run) {
                const passed = run.scenario_passed_count;
                const total = run.scenario_total;
                const subtitle = run.label || run.preset_id || "";
                return (
                  "<th>" +
                  '<a href="/runs/' +
                  escapeHtml(run.run_id) +
                  '">' +
                  escapeHtml(run.run_id.slice(0, 12)) +
                  "</a>" +
                  (subtitle
                    ? '<div class="muted">' +
                      escapeHtml(subtitle) +
                      "</div>"
                    : "") +
                  '<div class="muted">' +
                  formatCount(passed) +
                  "/" +
                  formatCount(total) +
                  " passed</div>" +
                  "</th>"
                );
              })
              .join("");

            const rowsHtml = scenarios
              .map(function (row) {
                const cells = runs
                  .map(function (run) {
                    const entry =
                      (row.entries || {})[run.run_id] ||
                      { status: "missing", score: null };
                    const score =
                      entry.score === null || entry.score === undefined
                        ? '<span class="muted">-</span>'
                        : escapeHtml(Number(entry.score).toFixed(2));
                    return (
                      "<td>" +
                      comparisonStatusBadge(entry.status) +
                      " " +
                      score +
                      "</td>"
                    );
                  })
                  .join("");
                return (
                  "<tr>" +
                  "<td>" +
                  statusChangeBadge(row.status_change) +
                  "</td>" +
                  "<td>" +
                  escapeHtml(row.scenario_name || row.scenario_id) +
                  '<div class="muted">' +
                  escapeHtml(row.scenario_id) +
                  "</div>" +
                  "</td>" +
                  "<td>" +
                  escapeHtml(row.category || "") +
                  "</td>" +
                  cells +
                  "<td>" +
                  formatDelta(row.delta_score) +
                  "</td>" +
                  "</tr>"
                );
              })
              .join("");

            content.innerHTML =
              '<div class="card"><h2>Run comparison</h2>' +
              '<p><a href="/runs">Back to runs</a></p>' +
              '<div class="grid">' +
              '<div class="stat"><div class="stat-label">Alignment</div><div class="stat-value" style="font-size:14px">' +
              escapeHtml(data.alignment) +
              "</div></div>" +
              '<div class="stat"><div class="stat-label">Total scenarios</div><div class="stat-value">' +
              formatCount(summary.total_scenarios) +
              "</div></div>" +
              '<div class="stat"><div class="stat-label">Regressed</div><div class="stat-value">' +
              formatCount(summary.scenarios_regressed) +
              "</div></div>" +
              '<div class="stat"><div class="stat-label">Improved</div><div class="stat-value">' +
              formatCount(summary.scenarios_improved) +
              "</div></div>" +
              '<div class="stat"><div class="stat-label">Avg score Δ</div><div class="stat-value">' +
              formatDelta(summary.average_score_delta) +
              "</div></div>" +
              "</div>" +
              "<table><thead><tr>" +
              "<th>Change</th><th>Scenario</th><th>Category</th>" +
              runHeaderCells +
              "<th>Δ score</th>" +
              "</tr></thead><tbody>" +
              rowsHtml +
              "</tbody></table>" +
              "</div>";
          } catch (error) {
            showError(error);
          }
        }

        async function renderRun(runId) {
          try {
            const run = (await api("/api/runs/" + encodeURIComponent(runId))).run;
            const scenarios = run.scenarios || [];
            const rows = scenarios
              .map(function (scenario) {
                const ordinal = escapeHtml(scenario.ordinal);
                return (
                  "<tr><td><a href=\\"/runs/" +
                  escapeHtml(run.runId) +
                  "/scenarios/" +
                  ordinal +
                  '">' +
                  ordinal +
                  "</a></td>" +
                  "<td>" +
                  escapeHtml(scenario.scenarioId) +
                  "</td>" +
                  "<td>" +
                  escapeHtml(scenario.status) +
                  "</td>" +
                  "<td>" +
                  (scenario.passed === true
                    ? '<span class="badge badge-pass">pass</span>'
                    : scenario.passed === false
                      ? '<span class="badge badge-fail">fail</span>'
                      : "-") +
                  "</td>" +
                  "<td>" +
                  formatScore(scenario.overallScore) +
                  "</td></tr>"
                );
              })
              .join("");
            content.innerHTML =
              '<div class="card"><h2>Run ' +
              escapeHtml(run.runId) +
              "</h2>" +
              "<p>" +
              runStatusBadge(run) +
              " started " +
              escapeHtml(run.startedAt) +
              "</p>" +
              "<p>" +
              '<a href="/api/runs/' +
              encodeURIComponent(run.runId) +
              '/report.html">Open HTML report</a></p>' +
              "<table><thead><tr><th>#</th><th>Scenario</th><th>Status</th><th>Pass</th><th>Score</th></tr></thead><tbody>" +
              rows +
              "</tbody></table></div>";
          } catch (error) {
            showError(error);
          }
        }

        function isSessionBoundary(turn) {
          return (
            turn.role === "system" &&
            typeof turn.content === "string" &&
            turn.content.indexOf("--- Session boundary") === 0
          );
        }

        function parseSessionBoundary(content) {
          const fields = {};
          const re =
            /session_id:\\s*(\\S+)|reset_policy:\\s*(\\S+)|time_offset:\\s*(\\S+)|user_id:\\s*(\\S+)/g;
          let m = re.exec(content);
          while (m !== null) {
            if (m[1]) fields.session_id = m[1];
            if (m[2]) fields.reset_policy = m[2];
            if (m[3]) fields.time_offset = m[3];
            if (m[4]) fields.user_id = m[4];
            m = re.exec(content);
          }
          return fields;
        }

        function renderToolCall(tc) {
          const name = escapeHtml(tc.name || "tool");
          let argsHtml = "";
          if (tc.args !== null && tc.args !== undefined) {
            try {
              argsHtml =
                "<pre>" +
                escapeHtml(JSON.stringify(tc.args, null, 2)) +
                "</pre>";
            } catch (_) {
              argsHtml = "";
            }
          }
          return (
            '<details class="tool-detail"><summary>' +
            '<span class="tool-label">tool</span>' +
            '<span class="tool-name">' +
            name +
            "</span></summary>" +
            argsHtml +
            "</details>"
          );
        }

        function renderCheckpoint(cp) {
          const idx = escapeHtml(cp.checkpoint_index);
          if (cp.passed) {
            return (
              '<span class="cp-pill pass">&#10003; Checkpoint ' +
              idx +
              "</span>"
            );
          }
          const failures = (cp.failures || [])
            .map(function (f) {
              return "<li>" + escapeHtml(f) + "</li>";
            })
            .join("");
          const failuresHtml = failures
            ? '<ul class="cp-failures">' + failures + "</ul>"
            : "";
          return (
            '<details><summary class="cp-pill fail">&#10007; Checkpoint ' +
            idx +
            "</summary>" +
            failuresHtml +
            "</details>"
          );
        }

        function renderTurn(turn, tools, cps) {
          const turnIdx = turn.turn_index;
          const source = turn.source ? " · " + escapeHtml(turn.source) : "";
          const meta =
            '<div class="chat-meta">Turn ' +
            escapeHtml(turnIdx) +
            source +
            "</div>";

          if (isSessionBoundary(turn)) {
            const fields = parseSessionBoundary(turn.content || "");
            const keys = Object.keys(fields);
            const pills = keys.length
              ? '<div class="chat-divider-fields">' +
                keys
                  .map(function (k) {
                    return (
                      '<span class="chat-pill"><span class="pill-key">' +
                      escapeHtml(k) +
                      ":</span>" +
                      escapeHtml(fields[k]) +
                      "</span>"
                    );
                  })
                  .join("") +
                "</div>"
              : "";
            return (
              '<div class="chat-row system">' +
              '<div class="chat-divider">Session boundary</div>' +
              pills +
              "</div>"
            );
          }

          const content = turn.content || "";

          if (turn.role === "user") {
            return (
              '<div class="chat-row user">' +
              '<div class="chat-bubble user">' +
              escapeHtml(content) +
              "</div>" +
              meta +
              "</div>"
            );
          }

          if (turn.role === "assistant") {
            const toolsHtml = tools.length
              ? tools.map(renderToolCall).join("")
              : "";
            const cpsHtml = cps.length
              ? '<div class="cp-row">' +
                cps.map(renderCheckpoint).join("") +
                "</div>"
              : "";
            return (
              '<div class="chat-row assistant">' +
              '<div class="chat-bubble assistant">' +
              escapeHtml(content) +
              "</div>" +
              toolsHtml +
              cpsHtml +
              meta +
              "</div>"
            );
          }

          const label =
            turn.role === "inject"
              ? "Inject"
              : turn.role === "checkpoint"
                ? "Checkpoint"
                : turn.role === "system"
                  ? "System"
                  : escapeHtml(turn.role);
          const note = content
            ? '<div class="system-note">' + escapeHtml(content) + "</div>"
            : "";
          return (
            '<div class="chat-row system">' +
            '<div class="chat-divider">' +
            label +
            "</div>" +
            note +
            "</div>"
          );
        }

        function renderConversationTab(scenario) {
          const turns = scenario.turns || [];
          const allTools = scenario.toolCalls || [];
          const allCps = scenario.checkpoints || [];

          const toolsByTurn = {};
          allTools.forEach(function (tc) {
            const idx = tc.turn_index;
            if (!toolsByTurn[idx]) toolsByTurn[idx] = [];
            toolsByTurn[idx].push(tc);
          });
          const cpsByTurn = {};
          allCps.forEach(function (cp) {
            const idx =
              cp.preceding_turn_index === null ||
              cp.preceding_turn_index === undefined
                ? -1
                : cp.preceding_turn_index;
            if (!cpsByTurn[idx]) cpsByTurn[idx] = [];
            cpsByTurn[idx].push(cp);
          });

          if (turns.length === 0) {
            return '<p class="muted">No conversation turns recorded.</p>';
          }
          return (
            '<div class="chat-list">' +
            turns
              .map(function (turn) {
                return renderTurn(
                  turn,
                  toolsByTurn[turn.turn_index] || [],
                  cpsByTurn[turn.turn_index] || [],
                );
              })
              .join("") +
            "</div>"
          );
        }

        function renderRubricTab(scenario) {
          const judge = scenario.judge || {};
          const dims = scenario.judgeDimensionScores || [];
          const overall =
            typeof judge.overallNotes === "string" && judge.overallNotes
              ? '<div class="judge-overall">' +
                escapeHtml(judge.overallNotes) +
                "</div>"
              : "";

          if (dims.length === 0 && !overall) {
            return '<p class="muted">No judge feedback recorded.</p>';
          }

          const dimHtml = dims
            .map(function (d) {
              const name = escapeHtml(d.dimension_name || d.dimension_id);
              const raw = d.raw_score;
              const scale = d.scale_points;
              const norm = d.normalized_score;
              const weight = d.weight;
              const valueLabel =
                (raw !== null && raw !== undefined ? raw : "?") +
                (scale !== null && scale !== undefined ? " / " + scale : "") +
                (weight !== null && weight !== undefined
                  ? "  ·  weight " + weight
                  : "");
              const pct =
                norm !== null && norm !== undefined
                  ? Math.max(0, Math.min(100, Math.round(norm * 100)))
                  : 0;
              const reasoning = d.reasoning
                ? '<div class="dim-score-reason">' +
                  escapeHtml(d.reasoning) +
                  "</div>"
                : "";
              const evidence = (d.evidence || [])
                .map(function (e) {
                  return "<li>" + escapeHtml(e) + "</li>";
                })
                .join("");
              const evidenceHtml = evidence
                ? '<details class="dim-score-evidence"><summary>Evidence (' +
                  (d.evidence || []).length +
                  ")</summary><ul>" +
                  evidence +
                  "</ul></details>"
                : "";
              return (
                '<div class="dim-score">' +
                '<div class="dim-score-header">' +
                '<div class="dim-score-name">' +
                name +
                "</div>" +
                '<div class="dim-score-value">' +
                escapeHtml(valueLabel) +
                "</div>" +
                "</div>" +
                '<div class="dim-score-bar"><div class="dim-score-fill" style="width:' +
                pct +
                '%"></div></div>' +
                reasoning +
                evidenceHtml +
                "</div>"
              );
            })
            .join("");

          const judgeMeta =
            judge.provider || judge.model
              ? '<p class="muted">Judge: ' +
                escapeHtml(judge.provider || "?") +
                " / " +
                escapeHtml(judge.model || "?") +
                "</p>"
              : "";

          return judgeMeta + overall + dimHtml;
        }

        function bindTabs(scope) {
          const buttons = scope.querySelectorAll(".tab-btn");
          const panes = scope.querySelectorAll(".tab-pane");
          buttons.forEach(function (btn) {
            btn.addEventListener("click", function () {
              const target = btn.getAttribute("data-tab");
              buttons.forEach(function (b) {
                b.classList.toggle(
                  "active",
                  b.getAttribute("data-tab") === target,
                );
              });
              panes.forEach(function (p) {
                p.classList.toggle(
                  "active",
                  p.getAttribute("data-pane") === target,
                );
              });
            });
          });
        }

        async function renderScenario(runId, ordinal) {
          try {
            const data = await api(
              "/api/runs/" +
                encodeURIComponent(runId) +
                "/scenarios/" +
                encodeURIComponent(ordinal),
            );
            const scenario = data.scenario;
            const passed =
              scenario.passed === true
                ? '<span class="badge badge-pass">pass</span>'
                : scenario.passed === false
                  ? '<span class="badge badge-fail">fail</span>'
                  : '<span class="badge badge-unknown">' +
                    escapeHtml(scenario.status) +
                    "</span>";
            const score = formatScore(scenario.overallScore);
            const threshold =
              scenario.passThreshold !== null &&
              scenario.passThreshold !== undefined
                ? formatScore(scenario.passThreshold)
                : "-";
            const headerHtml =
              '<div class="scenario-header">' +
              '<div class="scenario-title">' +
              "<h2>" +
              escapeHtml(scenario.scenarioName) +
              "</h2>" +
              '<div class="scenario-sid">' +
              escapeHtml(scenario.scenarioId) +
              " · ordinal " +
              escapeHtml(scenario.ordinal) +
              (scenario.userId ? " · " + escapeHtml(scenario.userId) : "") +
              "</div>" +
              '<p style="margin-top:8px"><a href="/runs/' +
              escapeHtml(data.run.runId) +
              '">&larr; Back to run</a></p>' +
              "</div>" +
              '<div class="score-block">' +
              '<div class="score-stat"><div class="score-stat-label">Score</div><div class="score-stat-value">' +
              score +
              "</div></div>" +
              '<div class="score-stat"><div class="score-stat-label">Threshold</div><div class="score-stat-value">' +
              threshold +
              "</div></div>" +
              '<div class="score-stat"><div class="score-stat-label">Status</div><div class="score-stat-value">' +
              passed +
              "</div></div>" +
              "</div>" +
              "</div>";

            const tabsHtml =
              '<div class="tabs">' +
              '<button type="button" class="tab-btn active" data-tab="conversation">Conversation</button>' +
              '<button type="button" class="tab-btn" data-tab="rubric">Rubric</button>' +
              "</div>";

            const conversationHtml =
              '<div class="tab-pane active" data-pane="conversation">' +
              renderConversationTab(scenario) +
              "</div>";
            const rubricHtml =
              '<div class="tab-pane" data-pane="rubric">' +
              renderRubricTab(scenario) +
              "</div>";

            content.innerHTML =
              '<div class="card">' +
              headerHtml +
              tabsHtml +
              conversationHtml +
              rubricHtml +
              "</div>";
            bindTabs(content);
          } catch (error) {
            showError(error);
          }
        }

        async function renderSuites() {
          try {
            const data = await api("/api/suites");
            const suites = data.suites || [];
            const body = suites
              .map(function (suite) {
                return (
                  "<tr><td>" +
                  escapeHtml(suite.id) +
                  "</td><td>" +
                  escapeHtml(suite.schema) +
                  "</td><td>" +
                  escapeHtml(suite.relativePath) +
                  "</td><td>" +
                  formatCount(suite.objectCount) +
                  "</td></tr>"
                );
              })
              .join("");
            content.innerHTML =
              '<div class="card"><h2>Suites</h2>' +
              "<p>Data path: <code>" +
              escapeHtml(data.data_path) +
              "</code></p>" +
              "<table><thead><tr><th>Suite</th><th>Schema</th><th>Relative path</th><th>Objects</th></tr></thead><tbody>" +
              body +
              "</tbody></table></div>";
          } catch (error) {
            showError(error);
          }
        }

        function renderSettings() {
          content.innerHTML =
            '<div class="card"><h2>Settings</h2>' +
            "<p>Server API routes do not require bearer-token authentication or CORS configuration.</p></div>";
        }

        function showError(error) {
          errorBox.style.display = "block";
          errorBox.textContent = error.message;
        }

        function handleRoute() {
          errorBox.style.display = "none";
          errorBox.textContent = "";
          const path = window.location.pathname;
          setActiveNav(path);
          if (path === "/" || path === "/index.html") {
            renderOverview();
            return;
          }
          if (path === "/runs") {
            renderRuns();
            return;
          }
          if (path === "/suites") {
            renderSuites();
            return;
          }
          if (path === "/settings") {
            renderSettings();
            return;
          }
          if (path === "/compare") {
            const params = new URLSearchParams(window.location.search);
            const ids = (params.get("run_ids") || "")
              .split(",")
              .map(function (value) {
                return value.trim();
              })
              .filter(function (value) {
                return value.length > 0;
              });
            if (ids.length < 2) {
              content.innerHTML =
                '<div class="card"><p>Pick at least two runs from the runs list to compare.</p>' +
                '<p><a href="/runs">Go to runs</a></p></div>';
              return;
            }
            renderCompare(ids);
            return;
          }
          const runMatch = path.match(/^\\/runs\\/([^\\/]+)$/);
          if (runMatch) {
            renderRun(runMatch[1]);
            return;
          }
          const scenarioMatch = path.match(
            /^\\/runs\\/([^\\/]+)\\/scenarios\\/([0-9]+)$/,
          );
          if (scenarioMatch) {
            renderScenario(scenarioMatch[1], scenarioMatch[2]);
            return;
          }
          content.innerHTML = "<p>Page not found.</p>";
        }

        document.addEventListener("click", function (event) {
          const anchor = event.target.closest && event.target.closest("a");
          if (!anchor) return;
          const href = anchor.getAttribute("href");
          if (!href || !href.startsWith("/") || href.startsWith("//")) return;
          if (
            href.startsWith("/api/") ||
            href.endsWith(".html") ||
            anchor.getAttribute("target")
          ) {
            return;
          }
          event.preventDefault();
          window.history.pushState({}, "", href);
          handleRoute();
        });

        window.addEventListener("popstate", handleRoute);
        handleRoute();
      })();
    </script>
  </body>
</html>
`;

export function dashboardHtml(): string {
  return DASHBOARD_HTML;
}
