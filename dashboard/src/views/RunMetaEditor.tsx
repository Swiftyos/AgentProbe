import { useEffect, useState } from "react";
import { jsonBody } from "../api/client.ts";
import type { RunSummary, ServerRequest } from "../api/types.ts";
import {
  Button,
  Card,
  ErrorBanner,
  Textarea,
  TextInput,
} from "../ui/index.tsx";

export function RunMetaEditor({
  run,
  request,
  onUpdated,
}: {
  run: RunSummary;
  request: ServerRequest;
  onUpdated: (run: RunSummary) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(run.label ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(run.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLabelDraft(run.label ?? "");
    setNotesDraft(run.notes ?? "");
  }, [run.label, run.notes]);

  const patch = async (fields: {
    label?: string | null;
    notes?: string | null;
  }) => {
    setSaving(true);
    setError(null);
    try {
      const response = await request<{ run: RunSummary }>(
        `/api/runs/${encodeURIComponent(run.runId)}`,
        jsonBody("PATCH", fields),
      );
      onUpdated(response.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = async () => {
    try {
      await patch({ label: labelDraft.trim() ? labelDraft.trim() : null });
      setEditingLabel(false);
    } catch {
      // error already surfaced
    }
  };

  const saveNotes = async () => {
    try {
      await patch({ notes: notesDraft.trim() ? notesDraft.trim() : null });
      setEditingNotes(false);
    } catch {
      // error already surfaced
    }
  };

  return (
    <Card className="p-4 mb-4">
      {error ? <ErrorBanner message={error} /> : null}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
          Run name
        </div>
        {editingLabel ? (
          <div className="flex items-center gap-2">
            <TextInput
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.currentTarget.value)}
              maxLength={200}
              autoFocus
              placeholder="e.g. autogpt staging baseline"
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveLabel();
                if (e.key === "Escape") {
                  setLabelDraft(run.label ?? "");
                  setEditingLabel(false);
                }
              }}
            />
            <Button
              onClick={() => void saveLabel()}
              disabled={saving}
              size="sm"
            >
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLabelDraft(run.label ?? "");
                setEditingLabel(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base text-foreground">
              {run.label ?? (
                <span className="text-muted-foreground/70 italic">
                  Untitled run — click rename to add a name
                </span>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingLabel(true)}
            >
              Rename
            </Button>
          </div>
        )}
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center justify-between">
          <span>Notes</span>
          {!editingNotes && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingNotes(true)}
            >
              {run.notes ? "Edit" : "Add notes"}
            </Button>
          )}
        </div>
        {editingNotes ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.currentTarget.value)}
              rows={4}
              maxLength={4000}
              autoFocus
              placeholder="Hypotheses, observations, comparison context…"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotesDraft(run.notes ?? "");
                  setEditingNotes(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void saveNotes()}
                disabled={saving}
                size="sm"
              >
                Save notes
              </Button>
            </div>
          </div>
        ) : run.notes ? (
          <div className="text-sm text-foreground whitespace-pre-wrap">
            {run.notes}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground/70 italic">
            No notes yet.
          </div>
        )}
      </div>
    </Card>
  );
}
