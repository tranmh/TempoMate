#!/usr/bin/env bash
# Convert CadQuery .py files to STEP format
# Uses conda environment at ~/work/cadquery/env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR/cadquery"
OUT_DIR="$SCRIPT_DIR/step"
CONDA_ENV="$HOME/work/cadquery/env"
CONDA_RUN="$HOME/work/cadquery/miniforge3/bin/conda run -p $CONDA_ENV"

PARTS=(basis wippe lehne assembly)

mkdir -p "$OUT_DIR"

for part in "${PARTS[@]}"; do
    src="$SRC_DIR/${part}.py"
    out="$OUT_DIR/${part}.step"

    if [[ ! -f "$src" ]]; then
        echo "SKIP: $src not found"
        continue
    fi

    echo "Converting $part ..."
    (cd "$SRC_DIR" && $CONDA_RUN python "$part.py")
    # Normalize timestamp to avoid noisy diffs
    sed -i "s/'[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9:]*'/'2000-01-01T00:00:00'/g" "$SRC_DIR/${part}.step"
    mv "$SRC_DIR/${part}.step" "$out"
    echo "  -> $out"
done

echo "Done."
