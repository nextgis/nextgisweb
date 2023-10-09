Code formatting
===============

Code formatting takes lots of time and may trigger endless discussions. That's
why we use code formatting automation in NextGIS Web. Here is the summary of its
settings:

Python:

-  Indentation: 4 spaces
-  Quotes: double
-  Line length: 100
-  Linter: Ruff and Flake8
-  Formatter: Black
-  Import sorting: Ruff

JavaScript and TypeScript:

-  Indentation: 4 spaces
-  Quotes: double
-  Line length: 80
-  Linter: ESLint
-  Formatter: Prettier
-  Import sorting: ESLint plugin

CSS and LESS:

-  Indentation: 4 spaces
-  Line length: 80
-  Formatter: Prettier
-  Keys sorting: Prettier plugin

Markdown:

- Indentation: 4 spaces
- Line length: 80
- Formatter: Prettier

We use this settings for NextGIS Web core itself and for extensions.
Configuration details are in the corresponding files like ``pyproject.toml`` or
``.prettierrc.cjs``.