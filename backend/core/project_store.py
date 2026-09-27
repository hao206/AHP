"""Atomic storage for decision projects."""

import json
import os
import tempfile
import threading


PROJECTS_LOCK = threading.RLock()


def load_projects(path, default_factory):
    with PROJECTS_LOCK:
        if not os.path.exists(path):
            projects = default_factory()
            save_projects(path, projects)
            return projects
        with open(path, "r", encoding="utf-8") as source:
            projects = json.load(source)
        if not isinstance(projects, dict):
            raise ValueError("Project storage must contain a JSON object")
        return projects


def save_projects(path, projects):
    with PROJECTS_LOCK:
        directory = os.path.dirname(path)
        os.makedirs(directory, exist_ok=True)
        fd, temporary_path = tempfile.mkstemp(prefix=".projects-", suffix=".tmp", dir=directory)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as target:
                json.dump(projects, target, ensure_ascii=False, indent=2, allow_nan=False)
                target.flush()
                os.fsync(target.fileno())
            os.replace(temporary_path, path)
        finally:
            if os.path.exists(temporary_path):
                os.remove(temporary_path)
