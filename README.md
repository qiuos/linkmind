# OneMind

OneMind is an editor-first Obsidian mind map plugin. It opens the current Markdown note as a clean SVG + DOM mind map and writes edits back to plain Markdown.

## MVP Features

- Open the active Markdown note in a full-page OneMind view.
- Switch from Markdown to OneMind and focus the node matching the current heading.
- Copy a selected node as a standard `obsidian://open` URI with a heading anchor.
- Parse headings and unordered lists into a tree.
- Render a horizontal mind map with SVG Bezier links and DOM nodes.
- Choose between right-facing and balanced two-sided layouts.
- Add child nodes with `Tab`, add sibling nodes with `Enter`.
- Duplicate nodes and restructure with `Alt/Option + Arrow keys`.
- Use the node context menu for common edit, copy, tag, export, and delete actions.
- Long-press nodes on touch devices to open the same context menu.
- Edit nodes with `F2` or double click.
- Add, replace, or clear node emoji icons; icons are stored as leading emoji in Markdown text.
- Show Markdown tags such as `#todo` or `#idea` as node badges.
- Add or clear Markdown tag badges from selected nodes, including multi-selections.
- Filter the visible mind map by tag from tag badges or the command palette.
- See visible/total node counts, selected count, zoom, filter, and save state in the canvas status bar.
- Copy a selected branch as Markdown and paste Markdown from the clipboard as child or sibling nodes.
- Delete nodes with `Delete` or `Backspace`.
- Multi-select nodes with `Ctrl/Cmd + click`, range-select with `Shift + click`, and select all with `Ctrl/Cmd + A`.
- Apply delete, collapse, and emoji actions to the current multi-selection.
- Drag nodes onto another node to make them children, or between nearby nodes to reorder siblings.
- Collapse or expand nodes with `Space`.
- Expand or collapse the full map from toolbar actions or commands.
- Search nodes with `/`, then use `Enter` and `Shift + Enter` to move through matches.
- Navigate large maps with the collapsible outline panel.
- Move selection with arrow keys.
- Pan with blank-canvas drag.
- Zoom with mouse wheel or `Ctrl/Cmd +` and `Ctrl/Cmd -`.
- Fit to view with `Ctrl/Cmd + Shift + F`, focus selection with `Ctrl/Cmd + F`.
- Basic local undo and redo with `Ctrl/Cmd + Z` and `Ctrl/Cmd + Shift + Z`.
- Inline rendering for `**bold**`, `` `code` ``, and `[[wikilinks]]`.
- Draw dashed cross-branch association links from local wikilinks like `[[#Target]]` or `[[Target]]`.
- Export the current mind map as `.onemind.svg` or `.onemind.png` beside the source note.
- Export only the selected branch as SVG or PNG from commands.
- Configure PNG export scale and transparent background.
- Preserve frontmatter and leading non-map Markdown when writing edits back.
- Resolve external Markdown changes with a conflict prompt when local mind map edits are still unsaved.
- Responsive toolbar treatment for narrow/mobile panes.
- Chinese and English UI language setting.
- Settings for layout direction, auto-save delay, default expand depth, animation, visual branch color pickers, and export behavior.
- Obsidian commands for node editing actions, ready for custom hotkeys.

## Development

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

Copy or symlink this folder into an Obsidian vault under `.obsidian/plugins/onemind`, then enable the plugin from Obsidian settings.
