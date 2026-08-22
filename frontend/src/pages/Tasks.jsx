import React from "react";

// Placeholder — wire this up to a GET /api/tasks (list active tasks) and
// POST /api/tasks/:id/complete once your Task/TaskCompletion routes are
// ready on the backend (models already scaffolded in backend/src/models).
export default function Tasks() {
  return (
    <div className="screen">
      <div className="card">
        <p style={{ marginTop: 0 }}>🎯 Tasks</p>
        <p className="muted">
          Join channel, visit website, and other bonus tasks will appear here.
          Backend models (Task, TaskCompletion) are already scaffolded —
          add routes/task.routes.js when you're ready to launch tasks.
        </p>
      </div>
    </div>
  );
}
