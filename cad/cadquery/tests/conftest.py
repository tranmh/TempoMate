"""Shared fixtures for CadQuery geometry tests.

Parts are built once per session (expensive CAD operations)."""

import sys
import os
import pytest

# Add the tests directory and cadquery source directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(scope="session")
def basis_part():
    from basis import basis
    return basis()


@pytest.fixture(scope="session")
def wippe_part():
    from wippe import wippe
    return wippe()


@pytest.fixture(scope="session")
def lehne_part():
    from lehne import lehne
    return lehne()


