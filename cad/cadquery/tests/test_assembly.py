"""Tests for the assembly (all parts combined)."""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(scope="session")
def assembly_result():
    from assembly import assembly
    return assembly()


def test_assembly_builds(assembly_result):
    """Assembly should build without errors."""
    assert assembly_result is not None


def test_assembly_has_all_parts(assembly_result):
    """Assembly should contain basis, wippe, and lehne."""
    names = [obj.name for obj in assembly_result.objects.values()]
    assert "basis" in names
    assert "wippe" in names
    assert "lehne" in names


def test_assembly_exportable(assembly_result, tmp_path):
    """Assembly should be exportable to STEP."""
    out = str(tmp_path / "test_assembly.step")
    assembly_result.toCompound().exportStep(out)
    assert os.path.exists(out)
    assert os.path.getsize(out) > 0
