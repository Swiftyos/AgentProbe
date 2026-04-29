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
        const TOKEN_KEY = "agentprobe:token";
        const HAS_TOKEN = __HAS_TOKEN__;
        const content = document.getElementById("content");
        const errorBox = document.getElementById("error");

        function currentToken() {
          return window.localStorage.getItem(TOKEN_KEY) || "";
        }

        function setToken(value) {
          if (!value) {
            window.localStorage.removeItem(TOKEN_KEY);
          } else {
            window.localStorage.setItem(TOKEN_KEY, value);
          }
        }

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
          const headers = {};
          const token = currentToken();
          if (token) {
            headers.authorization = "Bearer " + token;
          }
          const response = await fetch(path, { headers: headers });
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

        async function renderScenario(runId, ordinal) {
          try {
            const data = await api(
              "/api/runs/" +
                encodeURIComponent(runId) +
                "/scenarios/" +
                encodeURIComponent(ordinal),
            );
            content.innerHTML =
              '<div class="card"><h2>' +
              escapeHtml(data.scenario.scenarioName) +
              " (ordinal " +
              escapeHtml(data.scenario.ordinal) +
              ")</h2>" +
              '<p><a href="/runs/' +
              escapeHtml(data.run.runId) +
              '">Back to run</a></p>' +
              "<pre>" +
              escapeHtml(JSON.stringify(data.scenario, null, 2)) +
              "</pre></div>";
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
          const token = currentToken();
          content.innerHTML =
            '<div class="card"><h2>Settings</h2>' +
            "<p>Token required: <strong>" +
            (HAS_TOKEN ? "yes" : "no") +
            "</strong></p>" +
            '<label for="token">Bearer token</label>' +
            '<input id="token" type="password" value="' +
            escapeHtml(token) +
            '" placeholder="paste token" />' +
            " <button id=\\"save-token\\">Save</button></div>";
          const input = document.getElementById("token");
          document
            .getElementById("save-token")
            .addEventListener("click", function () {
              setToken(input.value.trim());
              errorBox.style.display = "none";
              errorBox.textContent = "";
            });
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

export function dashboardHtml(options: { hasToken: boolean }): string {
  return DASHBOARD_HTML.replace(
    "__HAS_TOKEN__",
    options.hasToken ? "true" : "false",
  );
}
