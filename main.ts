import {
  App,
  ItemView,
  Menu,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  SuggestModal,
  TFile,
  ViewStateResult,
  WorkspaceLeaf,
  setIcon
} from "obsidian";

const VIEW_TYPE_ONEMIND = "onemind-view";

type NodeKind = "heading" | "list";
type LayoutDirection = "right" | "balanced";
type OneMindLanguage = "en" | "zh";

interface MindNode {
  id: string;
  text: string;
  kind: NodeKind;
  children: MindNode[];
  collapsed: boolean;
}

interface PositionedNode {
  node: MindNode;
  parent: MindNode | null;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  side: -1 | 1;
}

interface OneMindSettings {
  autoSaveDelay: number;
  branchColors: string[];
  defaultExpandDepth: number;
  animations: boolean;
  layoutDirection: LayoutDirection;
  exportScale: number;
  exportTransparentBackground: boolean;
  language: OneMindLanguage;
  showAssociationLinks: boolean;
}

interface MindDocument {
  root: MindNode;
  prefix: string;
}

interface OneMindViewState {
  [key: string]: unknown;
  file?: string;
  node?: string;
  heading?: string;
}

interface ParsedEmojiText {
  emoji: string | null;
  label: string;
}

interface ParsedNodeText extends ParsedEmojiText {
  tags: string[];
  displayLabel: string;
}

const EMOJI_OPTIONS = [
  "💡", "✅", "🔥", "⭐", "🎯", "🚀", "📌", "📎",
  "🧠", "📝", "📚", "🔍", "⚡", "❤️", "❓", "⚠️",
  "🌱", "🏁", "🔧", "💬", "🎨", "🧩", "📊", "🔗"
];

const DEFAULT_SETTINGS: OneMindSettings = {
  autoSaveDelay: 300,
  branchColors: ["#5b8def", "#45b36b", "#e89b3c", "#9b72e7", "#df6f9f"],
  defaultExpandDepth: 99,
  animations: true,
  layoutDirection: "right",
  exportScale: 2,
  exportTransparentBackground: false,
  language: "zh",
  showAssociationLinks: true
};

const I18N = {
  en: {
    openRibbon: "Open OneMind",
    openMindMap: "Open current note as mind map",
    returnMarkdown: "Return to Markdown editor",
    addChild: "Add child node",
    addSibling: "Add sibling node",
    duplicateNode: "Duplicate selected node",
    moveUp: "Move selected node up",
    moveDown: "Move selected node down",
    indentNode: "Indent selected node",
    outdentNode: "Outdent selected node",
    editNode: "Edit selected node",
    deleteNode: "Delete selected node",
    toggleNode: "Toggle selected node",
    setEmoji: "Set selected node emoji",
    clearEmoji: "Clear selected node emoji",
    addTag: "Add tag to selected nodes",
    clearTags: "Clear tags from selected nodes",
    copyBranch: "Copy selected branch as Markdown",
    pasteChild: "Paste Markdown as child nodes",
    pasteSibling: "Paste Markdown as sibling nodes",
    selectAll: "Select all nodes",
    expandAll: "Expand all nodes",
    collapseAll: "Collapse all nodes",
    fitMap: "Fit mind map to view",
    focusNode: "Focus selected node",
    searchNodes: "Search nodes",
    filterByTag: "Filter by tag",
    clearTagFilter: "Clear tag filter",
    toggleOutline: "Toggle outline",
    copyNodeLink: "Copy selected node link",
    exportSvg: "Export mind map as SVG",
    exportPng: "Export mind map as PNG",
    exportSelectedSvg: "Export selected branch as SVG",
    exportSelectedPng: "Export selected branch as PNG",
    markdown: "Markdown",
    addChildShort: "Add child",
    addSiblingShort: "Add sibling",
    duplicateShort: "Duplicate",
    setEmojiIcon: "Set emoji icon",
    addTagShort: "Add tag",
    deleteShort: "Delete",
    fitShort: "Fit",
    exportSvgShort: "Export SVG",
    exportPngShort: "Export PNG",
    copyLinkShort: "Copy node link",
    outline: "Outline",
    hideOutline: "Hide outline",
    openMarkdownFirst: "Open a Markdown note first.",
    emptyView: "Open a Markdown note to use OneMind.",
    reloadedExternal: "OneMind reloaded the external Markdown changes.",
    keptLocal: "OneMind kept the mind map edits and wrote them to Markdown.",
    exported: "Exported",
    copiedLink: "Copied OneMind node link.",
    copiedBranch: "Copied branch Markdown.",
    pastedMarkdown: "Pasted Markdown into OneMind.",
    clipboardEmpty: "Clipboard does not contain Markdown nodes.",
    tagFilterActive: "Tag filter",
    chooseEmoji: "Choose an emoji icon",
    enterTag: "Enter tag name",
    conflictTitle: "OneMind conflict",
    conflictBody: "This note changed on disk while the mind map has unsaved local edits. Choose which version should win.",
    reloadMarkdown: "Reload Markdown",
    keepEdits: "Keep OneMind edits",
    settingsTitle: "OneMind",
    language: "Language",
    languageDesc: "Choose the language used by OneMind UI.",
    english: "English",
    chinese: "中文",
    autoSaveDelay: "Auto-save delay",
    autoSaveDelayDesc: "Milliseconds to wait after a mind map edit before writing Markdown.",
    defaultExpandDepth: "Default expand depth",
    defaultExpandDepthDesc: "How many levels are expanded when a note opens. Use 99 for all.",
    layoutDirection: "Layout direction",
    layoutDirectionDesc: "Choose a classic right-facing tree or a balanced map with branches on both sides.",
    horizontalRight: "Horizontal right",
    balanced: "Balanced",
    layoutAnimation: "Layout animation",
    layoutAnimationDesc: "Animate node movement after edits.",
    branchColors: "Branch colors",
    branchColorsDesc: "Comma-separated CSS colors used for first-level branches.",
    resetBranchColors: "Reset branch colors",
    pngScale: "PNG export scale",
    pngScaleDesc: "Resolution multiplier used when exporting PNG files.",
    transparentPng: "Transparent PNG background",
    transparentPngDesc: "Leave PNG exports transparent instead of filling the Obsidian background color.",
    showAssociationLinks: "Show association links",
    showAssociationLinksDesc: "Draw dashed cross-branch links for local wikilinks like [[#Heading]] or [[Heading]].",
    saved: "Saved",
    unsaved: "Unsaved",
    saving: "Saving",
    nodesLabel: "nodes",
    selectedLabel: "selected",
    zoomLabel: "zoom"
  },
  zh: {
    openRibbon: "打开 OneMind",
    openMindMap: "以思维导图打开当前笔记",
    returnMarkdown: "返回 Markdown 编辑器",
    addChild: "添加子节点",
    addSibling: "添加同级节点",
    duplicateNode: "复制选中节点",
    moveUp: "上移选中节点",
    moveDown: "下移选中节点",
    indentNode: "缩进选中节点",
    outdentNode: "取消缩进选中节点",
    editNode: "编辑选中节点",
    deleteNode: "删除选中节点",
    toggleNode: "折叠/展开选中节点",
    setEmoji: "设置选中节点 Emoji",
    clearEmoji: "清除选中节点 Emoji",
    addTag: "给选中节点添加标签",
    clearTags: "清除选中节点标签",
    copyBranch: "复制选中分支为 Markdown",
    pasteChild: "粘贴 Markdown 为子节点",
    pasteSibling: "粘贴 Markdown 为同级节点",
    selectAll: "选择全部节点",
    expandAll: "展开全部节点",
    collapseAll: "折叠全部节点",
    fitMap: "适应窗口",
    focusNode: "聚焦选中节点",
    searchNodes: "搜索节点",
    filterByTag: "按标签过滤",
    clearTagFilter: "清除标签过滤",
    toggleOutline: "显示/隐藏大纲",
    copyNodeLink: "复制选中节点链接",
    exportSvg: "导出思维导图为 SVG",
    exportPng: "导出思维导图为 PNG",
    exportSelectedSvg: "导出选中分支为 SVG",
    exportSelectedPng: "导出选中分支为 PNG",
    markdown: "Markdown",
    addChildShort: "添加子节点",
    addSiblingShort: "添加同级",
    duplicateShort: "复制节点",
    setEmojiIcon: "设置 Emoji 图标",
    addTagShort: "添加标签",
    deleteShort: "删除",
    fitShort: "适应窗口",
    exportSvgShort: "导出 SVG",
    exportPngShort: "导出 PNG",
    copyLinkShort: "复制节点链接",
    outline: "大纲",
    hideOutline: "隐藏大纲",
    openMarkdownFirst: "请先打开一篇 Markdown 笔记。",
    emptyView: "打开 Markdown 笔记后即可使用 OneMind。",
    reloadedExternal: "OneMind 已重新加载外部 Markdown 修改。",
    keptLocal: "OneMind 已保留导图编辑并写回 Markdown。",
    exported: "已导出",
    copiedLink: "已复制 OneMind 节点链接。",
    copiedBranch: "已复制分支 Markdown。",
    pastedMarkdown: "已将 Markdown 粘贴到 OneMind。",
    clipboardEmpty: "剪贴板里没有可用的 Markdown 节点。",
    tagFilterActive: "标签过滤",
    chooseEmoji: "选择 Emoji 图标",
    enterTag: "输入标签名",
    conflictTitle: "OneMind 冲突",
    conflictBody: "这篇笔记在磁盘上发生了变化，同时思维导图里还有未保存编辑。请选择要保留的版本。",
    reloadMarkdown: "重新加载 Markdown",
    keepEdits: "保留 OneMind 编辑",
    settingsTitle: "OneMind",
    language: "语言",
    languageDesc: "选择 OneMind 界面语言。",
    english: "English",
    chinese: "中文",
    autoSaveDelay: "自动保存延迟",
    autoSaveDelayDesc: "导图编辑后等待多少毫秒再写回 Markdown。",
    defaultExpandDepth: "默认展开深度",
    defaultExpandDepthDesc: "打开笔记时默认展开的层级。99 表示全部展开。",
    layoutDirection: "布局方向",
    layoutDirectionDesc: "选择经典向右树形布局，或根节点居中的双向平衡布局。",
    horizontalRight: "水平向右",
    balanced: "双向平衡",
    layoutAnimation: "布局动画",
    layoutAnimationDesc: "编辑后为节点移动添加动画。",
    branchColors: "分支颜色",
    branchColorsDesc: "一级分支使用的 CSS 颜色，使用英文逗号分隔。",
    resetBranchColors: "重置分支颜色",
    pngScale: "PNG 导出倍率",
    pngScaleDesc: "导出 PNG 文件时使用的分辨率倍率。",
    transparentPng: "透明 PNG 背景",
    transparentPngDesc: "导出 PNG 时保留透明背景，而不是填充 Obsidian 背景色。",
    showAssociationLinks: "显示关联线",
    showAssociationLinksDesc: "为 [[#标题]] 或 [[标题]] 这类本地 wikilink 绘制跨分支虚线关联。",
    saved: "已保存",
    unsaved: "未保存",
    saving: "保存中",
    nodesLabel: "节点",
    selectedLabel: "已选",
    zoomLabel: "缩放"
  }
} as const;

type I18nKey = keyof typeof I18N.en;

const NODE_WIDTH = 180;
const NODE_HEIGHT = 42;
const LEVEL_GAP = 230;
const ROW_GAP = 18;
const DRAG_THRESHOLD = 4;

interface DragState {
  nodeId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  offsetX: number;
  offsetY: number;
  originalX: number;
  originalY: number;
  dragging: boolean;
  el: HTMLElement;
}

interface DropTarget {
  mode: "child" | "sibling";
  parentId: string;
  index: number;
  targetId: string;
}

export default class OneMindPlugin extends Plugin {
  settings: OneMindSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    this.registerView(
      VIEW_TYPE_ONEMIND,
      (leaf) => new OneMindView(leaf, this)
    );

    this.addRibbonIcon("git-fork", this.t("openRibbon"), () => {
      void this.openMindMap();
    });

    this.addCommand({
      id: "open-onemind-view",
      name: this.t("openMindMap"),
      checkCallback: (checking) => {
        const file = this.getActiveMarkdownFile();
        if (!file) return false;
        if (!checking) void this.openMindMap(file, this.getActiveHeadingAnchor());
        return true;
      }
    });

    this.addCommand({
      id: "return-to-markdown",
      name: this.t("returnMarkdown"),
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(OneMindView);
        if (view) void view.openMarkdown();
      }
    });

    this.addMindMapCommand("add-child-node", this.t("addChild"), (view) => view.addChildNode());
    this.addMindMapCommand("add-sibling-node", this.t("addSibling"), (view) => view.addSiblingNode());
    this.addMindMapCommand("duplicate-node", this.t("duplicateNode"), (view) => view.duplicateSelectedNode());
    this.addMindMapCommand("move-node-up", this.t("moveUp"), (view) => view.moveSelectedNode("up"));
    this.addMindMapCommand("move-node-down", this.t("moveDown"), (view) => view.moveSelectedNode("down"));
    this.addMindMapCommand("indent-node", this.t("indentNode"), (view) => view.moveSelectedNode("indent"));
    this.addMindMapCommand("outdent-node", this.t("outdentNode"), (view) => view.moveSelectedNode("outdent"));
    this.addMindMapCommand("edit-selected-node", this.t("editNode"), (view) => view.editSelectedNode());
    this.addMindMapCommand("delete-selected-node", this.t("deleteNode"), (view) => view.deleteSelectedNode());
    this.addMindMapCommand("toggle-selected-node", this.t("toggleNode"), (view) => view.toggleSelectedNode());
    this.addMindMapCommand("set-node-emoji", this.t("setEmoji"), (view) => view.openEmojiPicker());
    this.addMindMapCommand("clear-node-emoji", this.t("clearEmoji"), (view) => view.clearSelectedEmoji());
    this.addMindMapCommand("add-node-tag", this.t("addTag"), (view) => view.openTagModal());
    this.addMindMapCommand("clear-node-tags", this.t("clearTags"), (view) => view.clearSelectedTags());
    this.addMindMapCommand("select-all-nodes", this.t("selectAll"), (view) => view.selectAllNodes());
    this.addMindMapCommand("expand-all-nodes", this.t("expandAll"), (view) => view.expandAllNodes());
    this.addMindMapCommand("collapse-all-nodes", this.t("collapseAll"), (view) => view.collapseAllNodes());
    this.addMindMapCommand("fit-mind-map", this.t("fitMap"), (view) => view.fitToView());
    this.addMindMapCommand("focus-selected-node", this.t("focusNode"), (view) => view.focusSelected());
    this.addMindMapCommand("search-nodes", this.t("searchNodes"), (view) => view.focusSearch());
    this.addMindMapCommand("filter-by-tag", this.t("filterByTag"), (view) => view.openTagFilterModal());
    this.addMindMapCommand("clear-tag-filter", this.t("clearTagFilter"), (view) => view.clearTagFilter());
    this.addMindMapCommand("toggle-outline", this.t("toggleOutline"), (view) => view.toggleOutline());
    this.addMindMapCommand("copy-node-link", this.t("copyNodeLink"), (view) => void view.copySelectedNodeLink());
    this.addMindMapCommand("copy-branch-markdown", this.t("copyBranch"), (view) => void view.copySelectedBranchMarkdown());
    this.addMindMapCommand("paste-markdown-child", this.t("pasteChild"), (view) => void view.pasteMarkdownAsChild());
    this.addMindMapCommand("paste-markdown-sibling", this.t("pasteSibling"), (view) => void view.pasteMarkdownAsSibling());
    this.addMindMapCommand("export-svg", this.t("exportSvg"), (view) => void view.exportSvg());
    this.addMindMapCommand("export-png", this.t("exportPng"), (view) => void view.exportPng());
    this.addMindMapCommand("export-selected-svg", this.t("exportSelectedSvg"), (view) => void view.exportSelectedSvg());
    this.addMindMapCommand("export-selected-png", this.t("exportSelectedPng"), (view) => void view.exportSelectedPng());

    this.addSettingTab(new OneMindSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ONEMIND);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  t(key: I18nKey): string {
    return I18N[this.settings.language]?.[key] ?? I18N.en[key];
  }

  refreshOpenViews(): void {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_ONEMIND).forEach((leaf) => {
      const view = leaf.view;
      if (view instanceof OneMindView) view.applySettings();
    });
  }

  private addMindMapCommand(id: string, name: string, action: (view: OneMindView) => void): void {
    this.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(OneMindView);
        if (!view) return false;
        if (!checking) action(view);
        return true;
      }
    });
  }

  private getActiveMarkdownFile(): TFile | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view?.file ?? null;
  }

  private getActiveHeadingAnchor(): string | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return null;
    const cursor = view.editor.getCursor();
    for (let line = cursor.line; line >= 0; line -= 1) {
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(view.editor.getLine(line));
      if (match) return slugifyNodeText(match[2]);
    }
    return null;
  }

  async openMindMap(file = this.getActiveMarkdownFile(), heading: string | null = null): Promise<void> {
    if (!file) {
      new Notice(this.t("openMarkdownFirst"));
      return;
    }

    const leaf = this.app.workspace.getLeaf(false);
    await leaf.setViewState({
      type: VIEW_TYPE_ONEMIND,
      state: { file: file.path, heading: heading ?? undefined },
      active: true
    });
  }
}

class OneMindView extends ItemView {
  private plugin: OneMindPlugin;
  private file: TFile | null = null;
  private root: MindNode | null = null;
  private canvasEl!: HTMLDivElement;
  private sceneEl!: HTMLDivElement;
  private svgEl!: SVGSVGElement;
  private nodesEl!: HTMLDivElement;
  private outlineEl!: HTMLDivElement;
  private outlineListEl!: HTMLDivElement;
  private statusEl!: HTMLDivElement;
  private searchInputEl!: HTMLInputElement;
  private searchCountEl!: HTMLSpanElement;
  private selectedId: string | null = null;
  private selectedIds = new Set<string>();
  private positions: PositionedNode[] = [];
  private searchQuery = "";
  private searchMatches: string[] = [];
  private activeSearchIndex = -1;
  private saveTimer: number | null = null;
  private isSaving = false;
  private history: string[] = [];
  private future: string[] = [];
  private scale = 1;
  private panX = 80;
  private panY = 80;
  private panning: { x: number; y: number; panX: number; panY: number } | null = null;
  private dragState: DragState | null = null;
  private longPressTimer: number | null = null;
  private dropTarget: DropTarget | null = null;
  private dragMarkerEl: HTMLDivElement | null = null;
  private lastSavedMarkdown = "";
  private hasLocalUnsavedChange = false;
  private documentPrefix = "";
  private conflictModalOpen = false;
  private pendingFocus: { node?: string; heading?: string } | null = null;
  private outlineVisible = true;
  private tagFilter: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: OneMindPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_ONEMIND;
  }

  getDisplayText(): string {
    return this.file ? `OneMind: ${this.file.basename}` : "OneMind";
  }

  getIcon(): string {
    return "git-fork";
  }

  async setState(state: OneMindViewState, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);
    this.file = state.file ? this.app.vault.getAbstractFileByPath(state.file) as TFile : null;
    this.pendingFocus = { node: state.node, heading: state.heading };
    await this.loadFile();
  }

  getState(): OneMindViewState {
    return { file: this.file?.path ?? "", node: this.selectedId ?? undefined };
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("onemind-view");
    this.contentEl.toggleClass("is-animation-disabled", !this.plugin.settings.animations);

    const toolbar = this.contentEl.createDiv({ cls: "onemind-toolbar" });
    this.addIconButton(toolbar, "file-text", this.plugin.t("markdown"), () => void this.openMarkdown());
    this.addIconButton(toolbar, "plus", this.plugin.t("addChildShort"), () => this.addChildNode());
    this.addIconButton(toolbar, "corner-down-right", this.plugin.t("addSiblingShort"), () => this.addSiblingNode());
    this.addIconButton(toolbar, "copy-plus", this.plugin.t("duplicateShort"), () => this.duplicateSelectedNode());
    this.addIconButton(toolbar, "smile", this.plugin.t("setEmojiIcon"), () => this.openEmojiPicker());
    this.addIconButton(toolbar, "tag", this.plugin.t("addTagShort"), () => this.openTagModal());
    this.addIconButton(toolbar, "filter", this.plugin.t("filterByTag"), () => this.openTagFilterModal());
    this.addIconButton(toolbar, "trash-2", this.plugin.t("deleteShort"), () => this.deleteSelectedNode());
    this.addIconButton(toolbar, "unfold-vertical", this.plugin.t("expandAll"), () => this.expandAllNodes());
    this.addIconButton(toolbar, "fold-vertical", this.plugin.t("collapseAll"), () => this.collapseAllNodes());
    this.addIconButton(toolbar, "minimize", this.plugin.t("fitShort"), () => this.fitToView());
    this.addIconButton(toolbar, "download", this.plugin.t("exportSvgShort"), () => void this.exportSvg());
    this.addIconButton(toolbar, "image", this.plugin.t("exportPngShort"), () => void this.exportPng());
    this.addIconButton(toolbar, "link", this.plugin.t("copyLinkShort"), () => void this.copySelectedNodeLink());
    this.addIconButton(toolbar, "copy", this.plugin.t("copyBranch"), () => void this.copySelectedBranchMarkdown());
    this.addIconButton(toolbar, "list-tree", this.plugin.t("toggleOutline"), () => this.toggleOutline());
    this.addIconButton(toolbar, "search", this.plugin.t("searchNodes"), () => this.searchInputEl.focus());
    const searchWrap = toolbar.createDiv({ cls: "onemind-search" });
    this.searchInputEl = searchWrap.createEl("input", {
      cls: "onemind-search-input",
      attr: { type: "search", placeholder: this.plugin.t("searchNodes"), "aria-label": this.plugin.t("searchNodes") }
    });
    this.searchCountEl = searchWrap.createEl("span", { cls: "onemind-search-count" });
    this.searchInputEl.addEventListener("input", () => this.updateSearch(this.searchInputEl.value));
    this.searchInputEl.addEventListener("keydown", (event) => this.onSearchKeyDown(event));

    this.canvasEl = this.contentEl.createDiv({ cls: "onemind-canvas" });
    this.sceneEl = this.canvasEl.createDiv({ cls: "onemind-scene" });
    this.svgEl = createSvg("svg");
    this.svgEl.addClass("onemind-links");
    this.nodesEl = this.sceneEl.createDiv({ cls: "onemind-nodes" });
    this.sceneEl.prepend(this.svgEl);
    this.outlineEl = this.canvasEl.createDiv({ cls: "onemind-outline" });
    const outlineHeader = this.outlineEl.createDiv({ cls: "onemind-outline-header" });
    outlineHeader.createSpan({ text: this.plugin.t("outline") });
    this.addIconButton(outlineHeader, "x", this.plugin.t("hideOutline"), () => this.toggleOutline(false));
    this.outlineListEl = this.outlineEl.createDiv({ cls: "onemind-outline-list" });
    this.statusEl = this.canvasEl.createDiv({ cls: "onemind-status" });

    this.registerDomEvent(this.canvasEl, "wheel", (event) => this.onWheel(event));
    this.registerDomEvent(this.canvasEl, "pointerdown", (event) => this.onPointerDown(event));
    this.registerDomEvent(window, "pointermove", (event) => this.onPointerMove(event));
    this.registerDomEvent(window, "pointerup", (event) => this.onPointerUp(event));
    this.registerDomEvent(this.contentEl, "keydown", (event) => this.onKeyDown(event));

    this.registerEvent(this.app.vault.on("modify", async (file) => {
      if (!this.file || file.path !== this.file.path || this.isSaving) return;
      if (this.hasLocalUnsavedChange) {
        this.showConflictModal();
        return;
      }
      void this.loadFile();
    }));

    await this.loadFile();
  }

  async openMarkdown(): Promise<void> {
    if (!this.file) return;
    await this.leaf.setViewState({
      type: "markdown",
      state: { file: this.file.path },
      active: true
    });
  }

  applySettings(): void {
    this.contentEl.toggleClass("is-animation-disabled", !this.plugin.settings.animations);
    this.render();
  }

  private addIconButton(parent: HTMLElement, icon: string, title: string, action: () => void): void {
    const button = parent.createEl("button", { cls: "clickable-icon onemind-tool-button", attr: { "aria-label": title, title } });
    setIcon(button, icon);
    button.onClickEvent(action);
  }

  private async loadFile(): Promise<void> {
    if (!this.file || !(this.file instanceof TFile)) {
      this.renderEmpty(this.plugin.t("emptyView"));
      return;
    }

    const source = await this.app.vault.read(this.file);
    const document = parseMindDocument(source, this.file.basename);
    this.root = document.root;
    this.documentPrefix = document.prefix;
    applyDefaultExpandDepth(this.root, this.plugin.settings.defaultExpandDepth);
    this.lastSavedMarkdown = source;
    this.hasLocalUnsavedChange = false;
    this.history = [];
    this.future = [];
    this.selectedId = this.selectedId && findNode(this.root, this.selectedId) ? this.selectedId : this.root.id;
    this.selectedIds = new Set([this.selectedId]);
    this.render();
    this.applyPendingFocus();
  }

  private renderEmpty(message: string): void {
    this.root = null;
    this.nodesEl?.empty();
    this.svgEl?.empty();
    this.contentEl.createDiv({ cls: "onemind-empty", text: message });
  }

  private render(): void {
    if (!this.root) return;
    const visibleRoot = this.tagFilter ? filterTreeByTag(this.root, this.tagFilter) : this.root;
    this.positions = visibleRoot ? layoutTree(visibleRoot, this.plugin.settings.branchColors, this.plugin.settings.layoutDirection) : [];
    this.refreshSearchMatches();
    this.nodesEl.empty();
    this.svgEl.empty();
    this.dragMarkerEl = null;

    if (this.positions.length === 0) {
      this.renderOutline();
      this.applyTransform();
      return;
    }

    const bounds = getBounds(this.positions);
    this.svgEl.setAttrs({
      width: `${Math.max(1, bounds.width + 300)}`,
      height: `${Math.max(1, bounds.height + 180)}`,
      viewBox: `${bounds.minX - 80} ${bounds.minY - 80} ${bounds.width + 160} ${bounds.height + 160}`
    });

    for (const item of this.positions) {
      if (item.parent) this.drawLink(item);
    }

    if (this.plugin.settings.showAssociationLinks) {
      this.drawAssociationLinks();
    }

    for (const item of this.positions) {
      this.renderNode(item);
    }

    this.renderOutline();
    this.updateStatus();
    this.applyTransform();
  }

  private renderOutline(): void {
    if (!this.root || !this.outlineListEl) return;
    this.outlineEl.toggleClass("is-hidden", !this.outlineVisible);
    this.outlineListEl.empty();
    if (this.tagFilter) {
      const filterRow = this.outlineListEl.createDiv({ cls: "onemind-outline-filter" });
      filterRow.createSpan({ text: `${this.plugin.t("tagFilterActive")}: #${this.tagFilter}` });
      const clearButton = filterRow.createEl("button", { text: "x" });
      clearButton.onClickEvent(() => this.clearTagFilter());
    }

    const visit = (node: MindNode, depth: number): void => {
      if (this.tagFilter && !subtreeHasTag(node, this.tagFilter)) return;
      const row = this.outlineListEl.createDiv({ cls: "onemind-outline-row" });
      row.toggleClass("is-selected", this.selectedIds.has(node.id));
      row.style.paddingLeft = `${8 + depth * 14}px`;
      const parsed = parseNodeText(node.text);
      if (parsed.emoji) row.createSpan({ cls: "onemind-outline-emoji", text: parsed.emoji });
      row.createSpan({ cls: "onemind-outline-label", text: stripMarkdownFormatting(parsed.displayLabel) });
      if (node.collapsed && node.children.length > 0) row.createSpan({ cls: "onemind-outline-count", text: `${node.children.length}` });
      row.onClickEvent((event) => {
        event.stopPropagation();
        this.selectAndFocusNode(node.id);
      });
      if (!node.collapsed) {
        for (const child of node.children) visit(child, depth + 1);
      }
    };

    visit(this.root, 0);
  }

  private renderNode(item: PositionedNode): void {
    const el = this.nodesEl.createDiv({ cls: "onemind-node" });
    el.toggleClass("is-root", item.depth === 0);
    el.toggleClass("is-selected", this.selectedIds.has(item.node.id));
    el.toggleClass("is-primary-selected", item.node.id === this.selectedId);
    el.toggleClass("is-search-match", this.searchMatches.includes(item.node.id));
    el.toggleClass("is-active-search-match", this.activeSearchIndex >= 0 && this.searchMatches[this.activeSearchIndex] === item.node.id);
    el.toggleClass("is-collapsed", item.node.collapsed);
    el.setAttr("data-node-id", item.node.id);
    el.setAttr("data-node-anchor", slugifyNodeText(item.node.text));
    el.setAttr("tabindex", "0");
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.width = `${item.width}px`;
    el.style.borderColor = item.color;

    const parsedText = parseNodeText(item.node.text);
    if (parsedText.emoji) {
      el.createDiv({ cls: "onemind-node-emoji", text: parsedText.emoji });
      el.addClass("has-emoji");
    }

    const content = el.createDiv({ cls: "onemind-node-content" });
    renderInlineMarkdown(content, parsedText.displayLabel, this.app);

    if (parsedText.tags.length > 0) {
      const tagsEl = el.createDiv({ cls: "onemind-node-tags" });
      for (const tag of parsedText.tags) {
        const tagEl = tagsEl.createSpan({ cls: "onemind-node-tag", text: `#${tag}` });
        tagEl.toggleClass("is-active", this.tagFilter === tag);
        tagEl.onClickEvent((event) => {
          event.stopPropagation();
          this.setTagFilter(tag);
        });
      }
    }

    if (item.node.children.length > 0) {
      const toggle = el.createDiv({ cls: "onemind-collapse" });
      setIcon(toggle, item.node.collapsed ? "chevron-right" : "chevron-down");
      toggle.onClickEvent((event) => {
        event.stopPropagation();
        this.toggleCollapse(item.node.id);
      });
    }

    el.onClickEvent((event) => this.handleNodeClick(event, item.node.id));
    el.ondblclick = () => this.editNode(item.node.id);
    el.addEventListener("pointerdown", (event) => this.onNodePointerDown(event, item));
    el.addEventListener("pointermove", () => this.clearLongPressTimer());
    el.addEventListener("pointerleave", () => this.clearLongPressTimer());
    el.addEventListener("contextmenu", (event) => this.openNodeMenu(event, item.node.id));
  }

  private openNodeMenu(event: MouseEvent, id: string): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.selectedIds.has(id)) {
      this.selectedId = id;
      this.selectedIds = new Set([id]);
      this.render();
    }

    const menu = new Menu();
    menu.addItem((item) => item.setTitle(this.plugin.t("addChild")).setIcon("plus").onClick(() => this.addChildNode()));
    menu.addItem((item) => item.setTitle(this.plugin.t("addSibling")).setIcon("corner-down-right").onClick(() => this.addSiblingNode()));
    menu.addItem((item) => item.setTitle(this.plugin.t("editNode")).setIcon("pencil").onClick(() => this.editSelectedNode()));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle(this.plugin.t("duplicateNode")).setIcon("copy-plus").onClick(() => this.duplicateSelectedNode()));
    menu.addItem((item) => item.setTitle(this.plugin.t("copyBranch")).setIcon("copy").onClick(() => void this.copySelectedBranchMarkdown()));
    menu.addItem((item) => item.setTitle(this.plugin.t("copyNodeLink")).setIcon("link").onClick(() => void this.copySelectedNodeLink()));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle(this.plugin.t("setEmoji")).setIcon("smile").onClick(() => this.openEmojiPicker()));
    menu.addItem((item) => item.setTitle(this.plugin.t("addTag")).setIcon("tag").onClick(() => this.openTagModal()));
    menu.addItem((item) => item.setTitle(this.plugin.t("clearTags")).setIcon("tag").onClick(() => this.clearSelectedTags()));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle(this.plugin.t("exportSelectedSvg")).setIcon("download").onClick(() => void this.exportSelectedSvg()));
    menu.addItem((item) => item.setTitle(this.plugin.t("exportSelectedPng")).setIcon("image").onClick(() => void this.exportSelectedPng()));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle(this.plugin.t("deleteNode")).setIcon("trash-2").onClick(() => this.deleteSelectedNode()));
    menu.showAtMouseEvent(event);
  }

  private openNodeMenuAt(id: string, x: number, y: number): void {
    const event = new MouseEvent("contextmenu", { clientX: x, clientY: y, bubbles: true, cancelable: true });
    this.openNodeMenu(event, id);
  }

  private drawLink(item: PositionedNode): void {
    const parent = this.positions.find((candidate) => candidate.node === item.parent);
    if (!parent) return;
    const path = createSvg("path");
    const rightward = item.x >= parent.x;
    const x1 = rightward ? parent.x + parent.width : parent.x;
    const y1 = parent.y + NODE_HEIGHT / 2;
    const x2 = rightward ? item.x : item.x + item.width;
    const y2 = item.y + NODE_HEIGHT / 2;
    const handle = Math.max(60, Math.abs(x2 - x1) * 0.45) * (rightward ? 1 : -1);
    path.setAttrs({
      d: `M ${x1} ${y1} C ${x1 + handle} ${y1}, ${x2 - handle} ${y2}, ${x2} ${y2}`,
      stroke: item.color,
      fill: "none"
    });
    this.svgEl.appendChild(path);
  }

  private drawAssociationLinks(): void {
    const byAnchor = new Map<string, PositionedNode>();
    for (const item of this.positions) {
      byAnchor.set(slugifyNodeText(item.node.text), item);
    }

    const drawn = new Set<string>();
    for (const source of this.positions) {
      const anchors = extractLocalWikilinkAnchors(source.node.text, this.file);
      for (const anchor of anchors) {
        const target = byAnchor.get(anchor);
        if (!target || target.node.id === source.node.id) continue;
        const key = [source.node.id, target.node.id].sort().join(":");
        if (drawn.has(key)) continue;
        drawn.add(key);
        this.drawAssociationLink(source, target);
      }
    }
  }

  private drawAssociationLink(source: PositionedNode, target: PositionedNode): void {
    const path = createSvg("path");
    path.addClass("onemind-association-link");
    const x1 = source.x + source.width / 2;
    const y1 = source.y + NODE_HEIGHT / 2;
    const x2 = target.x + target.width / 2;
    const y2 = target.y + NODE_HEIGHT / 2;
    const midX = (x1 + x2) / 2;
    const lift = Math.max(80, Math.abs(y2 - y1) * 0.35);
    const midY = Math.min(y1, y2) - lift;
    path.setAttrs({
      d: `M ${x1} ${y1} Q ${midX} ${midY}, ${x2} ${y2}`,
      fill: "none"
    });
    this.svgEl.appendChild(path);
  }

  private selectNode(id: string): void {
    this.selectedId = id;
    this.selectedIds = new Set([id]);
    this.render();
  }

  private selectAndFocusNode(id: string): void {
    this.selectedId = id;
    this.selectedIds = new Set([id]);
    this.expandAncestors(id);
    this.render();
    this.focusSelected();
  }

  private applyPendingFocus(): void {
    if (!this.root || !this.pendingFocus) return;
    const target = this.resolveFocusTarget(this.pendingFocus);
    this.pendingFocus = null;
    if (!target) return;
    window.setTimeout(() => this.selectAndFocusNode(target.id), 0);
  }

  private resolveFocusTarget(target: { node?: string; heading?: string }): MindNode | null {
    if (!this.root) return null;
    if (target.node) {
      const byId = findNode(this.root, target.node);
      if (byId) return byId;
      const byNodeAnchor = findNodeByAnchor(this.root, target.node);
      if (byNodeAnchor) return byNodeAnchor;
    }
    if (target.heading) return findNodeByAnchor(this.root, target.heading);
    return null;
  }

  private handleNodeClick(event: MouseEvent, id: string): void {
    if (event.metaKey || event.ctrlKey) {
      this.toggleNodeSelection(id);
      return;
    }
    if (event.shiftKey && this.selectedId) {
      this.selectRange(this.selectedId, id);
      return;
    }
    this.selectNode(id);
  }

  private toggleNodeSelection(id: string): void {
    if (this.selectedIds.has(id) && this.selectedIds.size > 1) {
      this.selectedIds.delete(id);
      if (this.selectedId === id) this.selectedId = this.selectedIds.values().next().value ?? null;
    } else {
      this.selectedIds.add(id);
      this.selectedId = id;
    }
    this.render();
  }

  private selectRange(fromId: string, toId: string): void {
    const ordered = this.positions.map((item) => item.node.id);
    const from = ordered.indexOf(fromId);
    const to = ordered.indexOf(toId);
    if (from === -1 || to === -1) {
      this.selectNode(toId);
      return;
    }
    const [start, end] = from < to ? [from, to] : [to, from];
    this.selectedIds = new Set(ordered.slice(start, end + 1));
    this.selectedId = toId;
    this.render();
  }

  editSelectedNode(): void {
    if (this.selectedId) this.editNode(this.selectedId);
  }

  openEmojiPicker(): void {
    if (!this.root || !this.selectedId) return;
    new EmojiSuggestModal(this.app, this.plugin.t("chooseEmoji"), (emoji) => this.setSelectedEmoji(emoji)).open();
  }

  clearSelectedEmoji(): void {
    this.setSelectedEmoji(null);
  }

  openTagModal(): void {
    if (!this.root || this.selectedIds.size === 0) return;
    new TagInputModal(this.app, this.plugin.t("enterTag"), (tag) => this.addTagToSelected(tag)).open();
  }

  openTagFilterModal(): void {
    if (!this.root) return;
    new TagSuggestModal(this.app, this.getAllTags(), this.plugin.t("filterByTag"), (tag) => this.setTagFilter(tag)).open();
  }

  clearTagFilter(): void {
    this.tagFilter = null;
    this.render();
  }

  private setTagFilter(tag: string): void {
    const normalized = normalizeTag(tag);
    if (!normalized) return;
    this.tagFilter = normalized;
    this.render();
    const first = this.positions.find((item) => parseNodeText(item.node.text).tags.includes(normalized));
    if (first) this.selectAndFocusNode(first.node.id);
  }

  private getAllTags(): string[] {
    if (!this.root) return [];
    return [...new Set(flattenNodes(this.root).flatMap((node) => parseNodeText(node.text).tags))].sort();
  }

  clearSelectedTags(): void {
    if (!this.root) return;
    const nodes = this.getSelectedNodes();
    if (nodes.length === 0) return;
    this.pushHistory();
    for (const node of nodes) {
      node.text = removeNodeTags(node.text);
    }
    this.scheduleSave();
    this.render();
  }

  private addTagToSelected(tag: string): void {
    if (!this.root) return;
    const normalized = normalizeTag(tag);
    if (!normalized) return;
    const nodes = this.getSelectedNodes();
    if (nodes.length === 0) return;
    this.pushHistory();
    for (const node of nodes) {
      node.text = addTagToText(node.text, normalized);
    }
    this.scheduleSave();
    this.render();
  }

  private setSelectedEmoji(emoji: string | null): void {
    if (!this.root) return;
    const nodes = this.getSelectedNodes();
    if (nodes.length === 0) return;
    this.pushHistory();
    for (const node of nodes) {
      const parsed = parseEmojiText(node.text);
      node.text = emoji ? `${emoji} ${parsed.label}` : parsed.label;
    }
    this.scheduleSave();
    this.render();
  }

  private editNode(id: string): void {
    if (!this.root) return;
    const node = findNode(this.root, id);
    const card = this.nodesEl.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
    if (!node || !card) return;

    this.selectedId = id;
    card.empty();
    card.addClass("is-editing");
    const input = card.createEl("textarea", { cls: "onemind-editor" });
    input.value = node.text;
    input.focus();
    input.select();

    let committed = false;
    const commit = (): void => {
      if (committed) return;
      committed = true;
      const value = input.value.trim() || "Untitled";
      this.pushHistory();
      node.text = value;
      this.scheduleSave();
      this.render();
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        commit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        this.render();
      }
    });
    input.addEventListener("blur", commit, { once: true });
  }

  addChildNode(): void {
    if (!this.root) return;
    const parent = findNode(this.root, this.selectedId ?? this.root.id) ?? this.root;
    this.pushHistory();
    const child = createNode("New idea", nextKind(parent, getNodeDepth(this.root, parent.id)));
    parent.children.push(child);
    parent.collapsed = false;
    this.selectedId = child.id;
    this.scheduleSave();
    this.render();
    window.setTimeout(() => this.editNode(child.id), 20);
  }

  addSiblingNode(): void {
    if (!this.root || !this.selectedId || this.selectedId === this.root.id) {
      this.addChildNode();
      return;
    }
    const parent = findParent(this.root, this.selectedId);
    const selected = findNode(this.root, this.selectedId);
    if (!parent || !selected) return;
    this.pushHistory();
    const index = parent.children.findIndex((child) => child.id === selected.id);
    const sibling = createNode("New idea", selected.kind);
    parent.children.splice(index + 1, 0, sibling);
    this.selectedId = sibling.id;
    this.scheduleSave();
    this.render();
    window.setTimeout(() => this.editNode(sibling.id), 20);
  }

  duplicateSelectedNode(): void {
    if (!this.root || !this.selectedId || this.selectedId === this.root.id) return;
    const parent = findParent(this.root, this.selectedId);
    const selected = findNode(this.root, this.selectedId);
    if (!parent || !selected) return;
    this.pushHistory();
    const index = parent.children.findIndex((child) => child.id === selected.id);
    const duplicate = cloneNodeWithNewIds(selected);
    parent.children.splice(index + 1, 0, duplicate);
    this.selectedId = duplicate.id;
    this.selectedIds = new Set([duplicate.id]);
    this.scheduleSave();
    this.render();
    this.focusSelected();
  }

  moveSelectedNode(direction: "up" | "down" | "indent" | "outdent"): void {
    if (!this.root || !this.selectedId || this.selectedId === this.root.id) return;
    this.pushHistory();
    const moved = moveNodeByKeyboard(this.root, this.selectedId, direction);
    if (!moved) {
      this.history.pop();
      return;
    }
    this.scheduleSave();
    this.render();
    this.focusSelected();
  }

  deleteSelectedNode(): void {
    if (!this.root) return;
    const ids = this.getEditableSelectedIds();
    if (ids.length === 0) return;
    this.pushHistory();
    const fallbackParent = this.selectedId ? findParent(this.root, this.selectedId) : null;
    deleteNodes(this.root, new Set(ids));
    this.selectedId = fallbackParent?.id ?? this.root.id;
    this.selectedIds = new Set([this.selectedId]);
    this.scheduleSave();
    this.render();
  }

  private toggleCollapse(id: string): void {
    if (!this.root) return;
    const node = findNode(this.root, id);
    if (!node) return;
    node.collapsed = !node.collapsed;
    this.render();
  }

  toggleSelectedNode(): void {
    if (!this.root) return;
    const nodes = this.getSelectedNodes();
    if (nodes.length === 0) return;
    const shouldCollapse = nodes.some((node) => !node.collapsed && node.children.length > 0);
    for (const node of nodes) {
      if (node.children.length > 0) node.collapsed = shouldCollapse;
    }
    this.render();
  }

  expandAllNodes(): void {
    if (!this.root) return;
    setCollapsedRecursive(this.root, false);
    this.render();
  }

  collapseAllNodes(): void {
    if (!this.root) return;
    setCollapsedRecursive(this.root, true);
    this.root.collapsed = false;
    this.selectedId = this.root.id;
    this.render();
    this.focusSelected();
  }

  private scheduleSave(): void {
    if (!this.root || !this.file) return;
    this.hasLocalUnsavedChange = true;
    this.updateStatus();
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.saveNow(), this.plugin.settings.autoSaveDelay);
  }

  private showConflictModal(): void {
    if (this.conflictModalOpen) return;
    this.conflictModalOpen = true;
    new ConflictModal(
      this.app,
      {
        title: this.plugin.t("conflictTitle"),
        body: this.plugin.t("conflictBody"),
        reload: this.plugin.t("reloadMarkdown"),
        keep: this.plugin.t("keepEdits")
      },
      async () => {
        this.conflictModalOpen = false;
        await this.loadFile();
        new Notice(this.plugin.t("reloadedExternal"));
      },
      async () => {
        this.conflictModalOpen = false;
        await this.saveNow();
        new Notice(this.plugin.t("keptLocal"));
      },
      () => {
        this.conflictModalOpen = false;
      }
    ).open();
  }

  private async saveNow(): Promise<void> {
    if (!this.root || !this.file) return;
    const markdown = this.serializeCurrentMarkdown();
    this.isSaving = true;
    this.updateStatus();
    await this.app.vault.modify(this.file, markdown);
    this.lastSavedMarkdown = markdown;
    this.hasLocalUnsavedChange = false;
    this.isSaving = false;
    this.updateStatus();
  }

  private pushHistory(): void {
    if (!this.root) return;
    this.history.push(this.serializeCurrentMarkdown());
    if (this.history.length > 80) this.history.shift();
    this.future = [];
  }

  private undo(): void {
    if (!this.root || this.history.length === 0) return;
    this.future.push(this.serializeCurrentMarkdown());
    const previous = this.history.pop();
    if (!previous) return;
    const document = parseMindDocument(previous, this.file?.basename ?? "Mind map");
    this.root = document.root;
    this.documentPrefix = document.prefix;
    this.selectedId = this.root.id;
    this.selectedIds = new Set([this.root.id]);
    this.render();
    void this.saveNow();
  }

  private redo(): void {
    if (!this.root) return;
    const next = this.future.pop();
    if (!next) return;
    this.history.push(this.serializeCurrentMarkdown());
    const document = parseMindDocument(next, this.file?.basename ?? "Mind map");
    this.root = document.root;
    this.documentPrefix = document.prefix;
    this.selectedId = this.root.id;
    this.selectedIds = new Set([this.root.id]);
    this.render();
    void this.saveNow();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLTextAreaElement) return;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "z" && event.shiftKey) {
      event.preventDefault();
      this.redo();
      return;
    }
    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault();
      this.undo();
      return;
    }
    if (mod && event.key.toLowerCase() === "a") {
      event.preventDefault();
      this.selectAllNodes();
      return;
    }
    if (mod && event.key === "=") {
      event.preventDefault();
      this.zoomAtCenter(1.1);
      return;
    }
    if (mod && event.key === "-") {
      event.preventDefault();
      this.zoomAtCenter(0.9);
      return;
    }
    if (mod && event.shiftKey && event.key.toLowerCase() === "f") {
      event.preventDefault();
      this.fitToView();
      return;
    }
    if (mod && event.key.toLowerCase() === "f") {
      event.preventDefault();
      this.focusSelected();
      return;
    }
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      this.moveSelectedNode("up");
      return;
    }
    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      this.moveSelectedNode("down");
      return;
    }
    if (event.altKey && event.key === "ArrowRight") {
      event.preventDefault();
      this.moveSelectedNode("indent");
      return;
    }
    if (event.altKey && event.key === "ArrowLeft") {
      event.preventDefault();
      this.moveSelectedNode("outdent");
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      this.addChildNode();
    } else if (event.key === "/") {
      event.preventDefault();
      this.focusSearch();
    } else if (event.key === "Enter") {
      event.preventDefault();
      this.addSiblingNode();
    } else if (event.key === "F2") {
      event.preventDefault();
      if (this.selectedId) this.editNode(this.selectedId);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      this.deleteSelectedNode();
    } else if (event.key === " ") {
      event.preventDefault();
      if (this.selectedId) this.toggleCollapse(this.selectedId);
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      this.moveSelection(event.key);
    }
  }

  private onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.jumpSearch(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.searchInputEl.value = "";
      this.updateSearch("");
      this.contentEl.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.jumpSearch(event.key === "ArrowDown" ? 1 : -1);
    }
  }

  focusSearch(): void {
    this.searchInputEl.focus();
    this.searchInputEl.select();
  }

  toggleOutline(force?: boolean): void {
    this.outlineVisible = force ?? !this.outlineVisible;
    this.renderOutline();
  }

  selectAllNodes(): void {
    if (!this.root) return;
    this.selectedIds = new Set(flattenNodes(this.root).map((node) => node.id));
    this.selectedId = this.root.id;
    this.render();
  }

  async exportSvg(): Promise<void> {
    if (!this.root || !this.file || this.positions.length === 0) return;
    await this.exportSvgFromPositions(this.positions, this.file.basename, this.getExportPath("svg"));
  }

  async exportPng(): Promise<void> {
    if (!this.root || !this.file || this.positions.length === 0) return;
    await this.exportPngFromPositions(this.positions, this.file.basename, this.getExportPath("png"));
  }

  async exportSelectedSvg(): Promise<void> {
    const branch = this.getSelectedBranchExport();
    if (!branch) return;
    await this.exportSvgFromPositions(branch.positions, branch.title, this.getExportPath("svg", branch.slug));
  }

  async exportSelectedPng(): Promise<void> {
    const branch = this.getSelectedBranchExport();
    if (!branch) return;
    await this.exportPngFromPositions(branch.positions, branch.title, this.getExportPath("png", branch.slug));
  }

  private async exportSvgFromPositions(positions: PositionedNode[], title: string, path: string): Promise<void> {
    const svg = renderSvgDocument(positions, title, this.plugin.settings.showAssociationLinks);
    await this.writeTextFile(path, svg);
    new Notice(`${this.plugin.t("exported")} ${path}`);
  }

  private async exportPngFromPositions(positions: PositionedNode[], title: string, path: string): Promise<void> {
    const svg = renderSvgDocument(positions, title, this.plugin.settings.showAssociationLinks);
    const png = await svgToPng(svg, this.plugin.settings.exportScale, this.plugin.settings.exportTransparentBackground);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.app.vault.modifyBinary(existing, png);
    } else {
      await this.app.vault.createBinary(path, png);
    }
    new Notice(`${this.plugin.t("exported")} ${path}`);
  }

  private getSelectedBranchExport(): { positions: PositionedNode[]; title: string; slug: string } | null {
    if (!this.root || !this.selectedId) return null;
    const node = findNode(this.root, this.selectedId);
    if (!node) return null;
    const branchRoot = cloneNode(node);
    setCollapsedRecursive(branchRoot, false);
    const positions = layoutTree(branchRoot, this.plugin.settings.branchColors, this.plugin.settings.layoutDirection);
    const title = stripInlineMarkdown(node.text);
    return { positions, title, slug: slugifyNodeText(node.text) || "branch" };
  }

  async copySelectedNodeLink(): Promise<void> {
    if (!this.file || !this.root || !this.selectedId) return;
    const node = findNode(this.root, this.selectedId);
    if (!node) return;
    const vault = this.app.vault.getName();
    const file = this.file.path;
    const nodeAnchor = slugifyNodeText(node.text);
    const link = `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}#${encodeURIComponent(nodeAnchor)}`;
    await navigator.clipboard.writeText(link);
    new Notice(this.plugin.t("copiedLink"));
  }

  async copySelectedBranchMarkdown(): Promise<void> {
    if (!this.root || !this.selectedId) return;
    const node = findNode(this.root, this.selectedId);
    if (!node) return;
    await navigator.clipboard.writeText(serializeMarkdown(cloneNode(node)));
    new Notice(this.plugin.t("copiedBranch"));
  }

  async pasteMarkdownAsChild(): Promise<void> {
    if (!this.root) return;
    const parent = findNode(this.root, this.selectedId ?? this.root.id) ?? this.root;
    const nodes = await this.readClipboardNodes(parent.kind, getNodeDepth(this.root, parent.id) + 1);
    if (nodes.length === 0) return;
    this.pushHistory();
    parent.children.push(...nodes);
    parent.collapsed = false;
    this.selectedId = nodes[0].id;
    this.selectedIds = new Set([nodes[0].id]);
    this.scheduleSave();
    this.render();
    new Notice(this.plugin.t("pastedMarkdown"));
  }

  async pasteMarkdownAsSibling(): Promise<void> {
    if (!this.root || !this.selectedId || this.selectedId === this.root.id) {
      await this.pasteMarkdownAsChild();
      return;
    }
    const selected = findNode(this.root, this.selectedId);
    const parent = findParent(this.root, this.selectedId);
    if (!selected || !parent) return;
    const nodes = await this.readClipboardNodes(selected.kind, getNodeDepth(this.root, selected.id));
    if (nodes.length === 0) return;
    this.pushHistory();
    const index = parent.children.findIndex((child) => child.id === selected.id);
    parent.children.splice(index + 1, 0, ...nodes);
    this.selectedId = nodes[0].id;
    this.selectedIds = new Set([nodes[0].id]);
    this.scheduleSave();
    this.render();
    new Notice(this.plugin.t("pastedMarkdown"));
  }

  private async readClipboardNodes(kind: NodeKind, depth: number): Promise<MindNode[]> {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      new Notice(this.plugin.t("clipboardEmpty"));
      return [];
    }
    const document = parseMindDocument(text, "Clipboard");
    const nodes = document.root.text === "Clipboard" && document.root.children.length > 0 ? document.root.children : [document.root];
    const cloned = nodes.map((node) => cloneNode(node));
    for (const node of cloned) normalizePastedNodeKinds(node, kind, depth);
    if (cloned.length === 0) new Notice(this.plugin.t("clipboardEmpty"));
    return cloned;
  }

  private updateSearch(query: string): void {
    this.searchQuery = query.trim().toLowerCase();
    this.refreshSearchMatches();
    this.activeSearchIndex = this.searchMatches.length > 0 ? 0 : -1;
    if (this.activeSearchIndex >= 0) {
      const id = this.searchMatches[this.activeSearchIndex];
      if (id) this.selectAndFocusNode(id);
    } else {
      this.render();
    }
    this.updateSearchCount();
  }

  private refreshSearchMatches(): void {
    if (!this.root || this.searchQuery.length === 0) {
      this.searchMatches = [];
      this.activeSearchIndex = -1;
      this.updateSearchCount();
      return;
    }
    this.searchMatches = flattenNodes(this.root)
      .filter((node) => node.text.toLowerCase().includes(this.searchQuery))
      .map((node) => node.id);
    if (this.activeSearchIndex >= this.searchMatches.length) this.activeSearchIndex = this.searchMatches.length - 1;
    if (this.searchMatches.length === 0) this.activeSearchIndex = -1;
    this.updateSearchCount();
  }

  private updateSearchCount(): void {
    if (!this.searchCountEl) return;
    if (this.searchQuery.length === 0) {
      this.searchCountEl.setText("");
      return;
    }
    const active = this.activeSearchIndex >= 0 ? this.activeSearchIndex + 1 : 0;
    this.searchCountEl.setText(`${active}/${this.searchMatches.length}`);
  }

  private jumpSearch(direction: 1 | -1): void {
    if (this.searchMatches.length === 0) return;
    this.activeSearchIndex = (this.activeSearchIndex + direction + this.searchMatches.length) % this.searchMatches.length;
    const id = this.searchMatches[this.activeSearchIndex];
    if (id) this.selectAndFocusNode(id);
    this.updateSearchCount();
  }

  private moveSelection(key: string): void {
    if (!this.root || !this.selectedId) return;
    const current = findNode(this.root, this.selectedId);
    if (!current) return;

    if (key === "ArrowRight") {
      if (current.collapsed && current.children.length > 0) {
        this.toggleCollapse(current.id);
        return;
      }
      const child = current.children[0];
      if (child) this.selectAndFocusNode(child.id);
      return;
    }

    if (key === "ArrowLeft") {
      const parent = findParent(this.root, current.id);
      if (current.children.length > 0 && !current.collapsed) {
        this.toggleCollapse(current.id);
      } else if (parent) {
        this.selectAndFocusNode(parent.id);
      }
      return;
    }

    const visible = this.positions.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    const index = visible.findIndex((item) => item.node.id === current.id);
    const next = visible[index + (key === "ArrowDown" ? 1 : -1)];
    if (next) this.selectAndFocusNode(next.node.id);
  }

  private expandAncestors(id: string): void {
    if (!this.root) return;
    const path = findPath(this.root, id);
    for (const node of path.slice(0, -1)) node.collapsed = false;
  }

  private getSelectedNodes(): MindNode[] {
    if (!this.root) return [];
    return [...this.selectedIds]
      .map((id) => findNode(this.root as MindNode, id))
      .filter((node): node is MindNode => Boolean(node));
  }

  private getEditableSelectedNodes(): MindNode[] {
    if (!this.root) return [];
    return this.getSelectedNodes().filter((node) => node.id !== this.root?.id);
  }

  private getEditableSelectedIds(): string[] {
    return this.getEditableSelectedNodes().map((node) => node.id);
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    this.scale = clamp(this.scale * factor, 0.35, 2.2);
    this.applyTransform();
  }

  private onPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest(".onemind-node") || target.closest(".onemind-toolbar")) return;
    this.panning = { x: event.clientX, y: event.clientY, panX: this.panX, panY: this.panY };
    this.canvasEl.setPointerCapture(event.pointerId);
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.dragState) {
      this.onNodePointerMove(event);
      return;
    }
    if (!this.panning) return;
    this.panX = this.panning.panX + event.clientX - this.panning.x;
    this.panY = this.panning.panY + event.clientY - this.panning.y;
    this.applyTransform();
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.dragState) {
      this.finishNodeDrag(event);
      return;
    }
    this.stopPanning();
  }

  private stopPanning(): void {
    this.panning = null;
  }

  private onNodePointerDown(event: PointerEvent, item: PositionedNode): void {
    if (event.button !== 0 || item.node.id === this.root?.id || event.target instanceof HTMLTextAreaElement) return;
    const target = event.target as HTMLElement;
    if (target.closest(".onemind-collapse") || target.closest(".onemind-wikilink")) return;
    event.stopPropagation();
    this.selectedId = item.node.id;
    this.selectedIds = new Set([item.node.id]);
    this.nodesEl.querySelectorAll(".is-selected").forEach((nodeEl) => nodeEl.removeClass("is-selected"));
    (event.currentTarget as HTMLElement).addClass("is-selected");
    const point = this.toScenePoint(event.clientX, event.clientY);
    this.dragState = {
      nodeId: item.node.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      offsetX: point.x - item.x,
      offsetY: point.y - item.y,
      originalX: item.x,
      originalY: item.y,
      dragging: false,
      el: event.currentTarget as HTMLElement
    };
    this.dragState.el.setPointerCapture(event.pointerId);
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      this.longPressTimer = window.setTimeout(() => {
        this.dragState = null;
        this.openNodeMenuAt(item.node.id, event.clientX, event.clientY);
      }, 560);
    }
  }

  private onNodePointerMove(event: PointerEvent): void {
    if (!this.dragState) return;
    this.clearLongPressTimer();
    const dx = event.clientX - this.dragState.startClientX;
    const dy = event.clientY - this.dragState.startClientY;
    if (!this.dragState.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    this.dragState.dragging = true;
    this.dragState.el.addClass("is-dragging");
    const point = this.toScenePoint(event.clientX, event.clientY);
    const left = point.x - this.dragState.offsetX;
    const top = point.y - this.dragState.offsetY;
    this.dragState.el.style.left = `${left}px`;
    this.dragState.el.style.top = `${top}px`;
    this.dropTarget = this.getDropTarget(point.x, point.y, this.dragState.nodeId);
    this.renderDropTarget();
  }

  private finishNodeDrag(event: PointerEvent): void {
    if (!this.dragState || !this.root) return;
    this.clearLongPressTimer();
    const state = this.dragState;
    const didDrag = state.dragging;
    this.dragState = null;
    this.clearDropTarget();

    try {
      state.el.releasePointerCapture(state.pointerId);
    } catch {
      // Pointer capture may already be released by the host app.
    }

    if (!didDrag || !this.dropTarget) {
      state.el.style.left = `${state.originalX}px`;
      state.el.style.top = `${state.originalY}px`;
      state.el.removeClass("is-dragging");
      this.render();
      return;
    }

    event.preventDefault();
    this.pushHistory();
    const moved = moveNode(this.root, state.nodeId, this.dropTarget);
    if (moved) {
      this.selectedId = state.nodeId;
      this.scheduleSave();
    } else {
      this.history.pop();
    }
    this.dropTarget = null;
    this.render();
  }

  private getDropTarget(x: number, y: number, draggedId: string): DropTarget | null {
    if (!this.root) return null;
    const blocked = new Set(getDescendantIds(findNode(this.root, draggedId)));
    blocked.add(draggedId);
    const candidates = this.positions.filter((item) => !blocked.has(item.node.id));
    const childHit = candidates.find((item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height);
    if (childHit) {
      return { mode: "child", parentId: childHit.node.id, index: childHit.node.children.length, targetId: childHit.node.id };
    }

    let nearest: PositionedNode | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const item of candidates) {
      if (item.node.id === this.root.id) continue;
      const distance = Math.hypot(x - (item.x + item.width / 2), y - (item.y + item.height / 2));
      if (distance < nearestDistance) {
        nearest = item;
        nearestDistance = distance;
      }
    }
    if (!nearest || !nearest.parent) return { mode: "child", parentId: this.root.id, index: this.root.children.length, targetId: this.root.id };
    const siblings = nearest.parent.children;
    const nearestIndex = siblings.findIndex((child) => child.id === nearest.node.id);
    const index = y < nearest.y + nearest.height / 2 ? nearestIndex : nearestIndex + 1;
    return { mode: "sibling", parentId: nearest.parent.id, index, targetId: nearest.node.id };
  }

  private renderDropTarget(): void {
    this.clearDropTarget();
    if (!this.dropTarget) return;
    if (this.dropTarget.mode === "child") {
      const targetEl = this.nodesEl.querySelector<HTMLElement>(`[data-node-id="${this.dropTarget.targetId}"]`);
      targetEl?.addClass("is-drop-child");
      return;
    }

    const targetPosition = this.positions.find((item) => item.node.id === this.dropTarget?.targetId);
    if (!targetPosition) return;
    this.dragMarkerEl = this.nodesEl.createDiv({ cls: "onemind-drop-marker" });
    const before = this.dropTarget.index <= (findParent(this.root as MindNode, this.dropTarget.targetId)?.children.findIndex((child) => child.id === this.dropTarget?.targetId) ?? 0);
    this.dragMarkerEl.style.left = `${targetPosition.x - 10}px`;
    this.dragMarkerEl.style.top = `${before ? targetPosition.y - ROW_GAP / 2 : targetPosition.y + targetPosition.height + ROW_GAP / 2}px`;
    this.dragMarkerEl.style.width = `${targetPosition.width + 20}px`;
  }

  private clearDropTarget(): void {
    this.nodesEl.querySelectorAll(".is-drop-child").forEach((el) => el.removeClass("is-drop-child"));
    this.dragMarkerEl?.remove();
    this.dragMarkerEl = null;
  }

  private clearLongPressTimer(): void {
    if (!this.longPressTimer) return;
    window.clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  private toScenePoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvasEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.panX) / this.scale,
      y: (clientY - rect.top - this.panY) / this.scale
    };
  }

  private serializeCurrentMarkdown(): string {
    if (!this.root) return this.documentPrefix;
    return `${this.documentPrefix}${serializeMarkdown(this.root)}`;
  }

  private getExportPath(extension: "svg" | "png", suffix?: string): string {
    const folder = this.file?.parent?.path && this.file.parent.path !== "/" ? `${this.file.parent.path}/` : "";
    const extra = suffix ? `.${suffix}` : "";
    return `${folder}${this.file?.basename ?? "mind-map"}.onemind${extra}.${extension}`;
  }

  private async writeTextFile(path: string, content: string): Promise<void> {
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(path, content);
    }
  }

  private zoomAtCenter(factor: number): void {
    this.scale = clamp(this.scale * factor, 0.35, 2.2);
    this.applyTransform();
  }

  focusSelected(): void {
    const selected = this.positions.find((item) => item.node.id === this.selectedId);
    if (!selected) return;
    const rect = this.canvasEl.getBoundingClientRect();
    this.panX = rect.width / 2 - (selected.x + selected.width / 2) * this.scale;
    this.panY = rect.height / 2 - (selected.y + NODE_HEIGHT / 2) * this.scale;
    this.applyTransform();
  }

  fitToView(): void {
    if (this.positions.length === 0) return;
    const bounds = getBounds(this.positions);
    const rect = this.canvasEl.getBoundingClientRect();
    const sx = (rect.width - 120) / Math.max(bounds.width, 1);
    const sy = (rect.height - 120) / Math.max(bounds.height, 1);
    this.scale = clamp(Math.min(sx, sy), 0.35, 1.4);
    this.panX = rect.width / 2 - (bounds.minX + bounds.width / 2) * this.scale;
    this.panY = rect.height / 2 - (bounds.minY + bounds.height / 2) * this.scale;
    this.applyTransform();
  }

  private applyTransform(): void {
    if (!this.sceneEl) return;
    this.sceneEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    this.updateStatus();
  }

  private updateStatus(): void {
    if (!this.statusEl) return;
    const total = this.root ? flattenNodes(this.root).length : 0;
    const visible = this.positions.length;
    const saveState = this.isSaving ? this.plugin.t("saving") : this.hasLocalUnsavedChange ? this.plugin.t("unsaved") : this.plugin.t("saved");
    const filter = this.tagFilter ? `#${this.tagFilter}` : "";
    this.statusEl.setText([
      `${visible}/${total} ${this.plugin.t("nodesLabel")}`,
      `${this.selectedIds.size} ${this.plugin.t("selectedLabel")}`,
      `${this.plugin.t("zoomLabel")} ${Math.round(this.scale * 100)}%`,
      filter,
      saveState
    ].filter(Boolean).join(" · "));
  }
}

class OneMindSettingTab extends PluginSettingTab {
  plugin: OneMindPlugin;

  constructor(app: App, plugin: OneMindPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: this.plugin.t("settingsTitle") });

    new Setting(containerEl)
      .setName(this.plugin.t("language"))
      .setDesc(this.plugin.t("languageDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("zh", this.plugin.t("chinese"))
          .addOption("en", this.plugin.t("english"))
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as OneMindLanguage;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("autoSaveDelay"))
      .setDesc(this.plugin.t("autoSaveDelayDesc"))
      .addText((text) => {
        text
          .setPlaceholder("300")
          .setValue(String(this.plugin.settings.autoSaveDelay))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.autoSaveDelay = Number.isFinite(parsed) ? clamp(parsed, 0, 5000) : DEFAULT_SETTINGS.autoSaveDelay;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("defaultExpandDepth"))
      .setDesc(this.plugin.t("defaultExpandDepthDesc"))
      .addSlider((slider) => {
        slider
          .setLimits(1, 99, 1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.defaultExpandDepth)
          .onChange(async (value) => {
            this.plugin.settings.defaultExpandDepth = value;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("layoutDirection"))
      .setDesc(this.plugin.t("layoutDirectionDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("right", this.plugin.t("horizontalRight"))
          .addOption("balanced", this.plugin.t("balanced"))
          .setValue(this.plugin.settings.layoutDirection)
          .onChange(async (value) => {
            this.plugin.settings.layoutDirection = value as LayoutDirection;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("layoutAnimation"))
      .setDesc(this.plugin.t("layoutAnimationDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.animations)
          .onChange(async (value) => {
            this.plugin.settings.animations = value;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("showAssociationLinks"))
      .setDesc(this.plugin.t("showAssociationLinksDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showAssociationLinks)
          .onChange(async (value) => {
            this.plugin.settings.showAssociationLinks = value;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("branchColors"))
      .setDesc(this.plugin.t("branchColorsDesc"))
      .addTextArea((text) => {
        text
          .setValue(this.plugin.settings.branchColors.join(", "))
          .onChange(async (value) => {
            const colors = value.split(",").map((item) => item.trim()).filter(Boolean);
            this.plugin.settings.branchColors = colors.length > 0 ? colors : DEFAULT_SETTINGS.branchColors;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          });
        text.inputEl.rows = 2;
      });

    const paletteEl = containerEl.createDiv({ cls: "onemind-settings-palette" });
    this.plugin.settings.branchColors.forEach((color, index) => {
      new Setting(paletteEl)
        .setName(`${this.plugin.t("branchColors")} ${index + 1}`)
        .addColorPicker((picker) => {
          picker
            .setValue(color)
            .onChange(async (value) => {
              this.plugin.settings.branchColors[index] = value;
              await this.plugin.saveSettings();
              this.plugin.refreshOpenViews();
            });
        });
    });

    new Setting(containerEl)
      .setName(this.plugin.t("resetBranchColors"))
      .addButton((button) => {
        button
          .setButtonText(this.plugin.t("resetBranchColors"))
          .onClick(async () => {
            this.plugin.settings.branchColors = [...DEFAULT_SETTINGS.branchColors];
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("pngScale"))
      .setDesc(this.plugin.t("pngScaleDesc"))
      .addSlider((slider) => {
        slider
          .setLimits(1, 4, 1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.exportScale)
          .onChange(async (value) => {
            this.plugin.settings.exportScale = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("transparentPng"))
      .setDesc(this.plugin.t("transparentPngDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.exportTransparentBackground)
          .onChange(async (value) => {
            this.plugin.settings.exportTransparentBackground = value;
            await this.plugin.saveSettings();
          });
      });
  }
}

class EmojiSuggestModal extends SuggestModal<string> {
  private onChoose: (emoji: string) => void;

  constructor(app: App, placeholder: string, onChoose: (emoji: string) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder(placeholder);
  }

  getSuggestions(query: string): string[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return EMOJI_OPTIONS;
    return EMOJI_OPTIONS.filter((emoji) => emoji.includes(normalized));
  }

  renderSuggestion(emoji: string, el: HTMLElement): void {
    el.createSpan({ cls: "onemind-emoji-suggestion", text: emoji });
  }

  onChooseSuggestion(emoji: string): void {
    this.onChoose(emoji);
  }
}

class TagInputModal extends Modal {
  private placeholder: string;
  private onSubmit: (tag: string) => void;

  constructor(app: App, placeholder: string, onSubmit: (tag: string) => void) {
    super(app);
    this.placeholder = placeholder;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    this.contentEl.empty();
    const input = this.contentEl.createEl("input", {
      cls: "onemind-tag-input",
      attr: { type: "text", placeholder: this.placeholder }
    });
    input.focus();
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.onSubmit(input.value);
        this.close();
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class TagSuggestModal extends SuggestModal<string> {
  private tags: string[];
  private onChoose: (tag: string) => void;

  constructor(app: App, tags: string[], placeholder: string, onChoose: (tag: string) => void) {
    super(app);
    this.tags = tags;
    this.onChoose = onChoose;
    this.setPlaceholder(placeholder);
  }

  getSuggestions(query: string): string[] {
    const normalized = normalizeTag(query).toLowerCase();
    const matches = normalized ? this.tags.filter((tag) => tag.toLowerCase().includes(normalized)) : this.tags;
    if (normalized && !matches.includes(normalized)) return [normalized, ...matches];
    return matches;
  }

  renderSuggestion(tag: string, el: HTMLElement): void {
    el.createSpan({ cls: "onemind-tag-suggestion", text: `#${tag}` });
  }

  onChooseSuggestion(tag: string): void {
    this.onChoose(tag);
  }
}

class ConflictModal extends Modal {
  private labels: { title: string; body: string; reload: string; keep: string };
  private onReload: () => Promise<void>;
  private onKeep: () => Promise<void>;
  private onCloseCallback: () => void;

  constructor(app: App, labels: { title: string; body: string; reload: string; keep: string }, onReload: () => Promise<void>, onKeep: () => Promise<void>, onCloseCallback: () => void) {
    super(app);
    this.labels = labels;
    this.onReload = onReload;
    this.onKeep = onKeep;
    this.onCloseCallback = onCloseCallback;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.labels.title });
    contentEl.createEl("p", {
      text: this.labels.body
    });

    const actions = contentEl.createDiv({ cls: "onemind-modal-actions" });
    const reloadButton = actions.createEl("button", { text: this.labels.reload });
    reloadButton.onClickEvent(async () => {
      this.close();
      await this.onReload();
    });

    const keepButton = actions.createEl("button", { cls: "mod-cta", text: this.labels.keep });
    keepButton.onClickEvent(async () => {
      this.close();
      await this.onKeep();
    });
  }

  onClose(): void {
    this.contentEl.empty();
    this.onCloseCallback();
  }
}

function parseMindDocument(source: string, fallbackTitle: string): MindDocument {
  const lines = source.split(/\r?\n/);
  let start = 0;

  if (lines[0] === "---") {
    const end = lines.findIndex((line, index) => index > 0 && line === "---");
    if (end > 0) start = end + 1;
  }

  while (start < lines.length && lines[start].trim() === "") start += 1;

  const firstMapLine = lines.findIndex((line, index) => {
    if (index < start) return false;
    return /^(#{1,6})\s+(.+?)\s*$/.test(line) || /^(\s*)[-*+]\s+(.+?)\s*$/.test(line);
  });
  const mapStart = firstMapLine === -1 ? lines.length : firstMapLine;
  const prefix = mapStart > 0 ? `${lines.slice(0, mapStart).join("\n").replace(/\s*$/, "")}\n\n` : "";
  const mapSource = lines.slice(mapStart).join("\n");
  return { root: parseMarkdown(mapSource, fallbackTitle), prefix };
}

function parseMarkdown(source: string, fallbackTitle: string): MindNode {
  const lines = source.split(/\r?\n/);
  let root: MindNode | null = null;
  let currentHeadingDepth = 1;
  const stack: Array<{ depth: number; node: MindNode }> = [];

  const ensureRoot = (): MindNode => {
    if (!root) {
      root = createNode(fallbackTitle || "Center topic", "heading");
      stack.push({ depth: 1, node: root });
    }
    return root;
  };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const depth = heading[1].length;
      const node = createNode(heading[2], "heading");
      if (!root && depth === 1) {
        root = node;
        stack.length = 0;
        stack.push({ depth: 1, node });
      } else {
        ensureRoot();
        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
        const parent = stack[stack.length - 1]?.node ?? root;
        parent.children.push(node);
        stack.push({ depth, node });
      }
      currentHeadingDepth = depth;
      continue;
    }

    const list = /^(\s*)[-*+]\s+(.+?)\s*$/.exec(line);
    if (list) {
      ensureRoot();
      const indentDepth = Math.floor(list[1].replace(/\t/g, "  ").length / 2);
      const depth = currentHeadingDepth + indentDepth + 1;
      const node = createNode(list[2], "list");
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
      const parent = stack[stack.length - 1]?.node ?? root;
      parent.children.push(node);
      stack.push({ depth, node });
    }
  }

  return root ?? createNode(fallbackTitle || "Center topic", "heading");
}

function serializeMarkdown(root: MindNode): string {
  const lines: string[] = [];
  const visit = (node: MindNode, depth: number, insideList: boolean): void => {
    const asHeading = node.kind === "heading" && !insideList && depth <= 6;
    if (asHeading) {
      lines.push(`${"#".repeat(depth)} ${node.text}`);
    } else {
      lines.push(`${"  ".repeat(Math.max(0, depth - 2))}- ${node.text}`);
    }
    for (const child of node.children) visit(child, depth + 1, insideList || !asHeading);
  };
  visit(root, 1, false);
  return `${lines.join("\n")}\n`;
}

function renderSvgDocument(items: PositionedNode[], title: string, showAssociationLinks = true): string {
  const bounds = getBounds(items);
  const pad = 80;
  const width = Math.ceil(bounds.width + pad * 2);
  const height = Math.ceil(bounds.height + pad * 2);
  const minX = bounds.minX - pad;
  const minY = bounds.minY - pad;
  const links = items
    .filter((item) => item.parent)
    .map((item) => {
      const parent = items.find((candidate) => candidate.node === item.parent);
      if (!parent) return "";
      const rightward = item.x >= parent.x;
      const x1 = rightward ? parent.x + parent.width : parent.x;
      const y1 = parent.y + NODE_HEIGHT / 2;
      const x2 = rightward ? item.x : item.x + item.width;
      const y2 = item.y + NODE_HEIGHT / 2;
      const handle = Math.max(60, Math.abs(x2 - x1) * 0.45) * (rightward ? 1 : -1);
      return `<path d="M ${x1} ${y1} C ${x1 + handle} ${y1}, ${x2 - handle} ${y2}, ${x2} ${y2}" stroke="${escapeXml(item.color)}" fill="none" stroke-width="1.5" stroke-linecap="round" opacity="0.78"/>`;
    })
    .join("\n");

  const associationLinks = showAssociationLinks ? renderAssociationSvgLinks(items) : "";

  const nodes = items.map((item) => {
    const isRoot = item.depth === 0;
    const nodeWidth = item.width;
    const fontSize = isRoot ? 18 : 14;
    const fontWeight = isRoot ? 700 : 400;
    const parsedNode = parseNodeText(item.node.text);
    const exportLabel = [
      parsedNode.emoji ? `${parsedNode.emoji} ${stripMarkdownFormatting(parsedNode.displayLabel)}` : stripMarkdownFormatting(parsedNode.displayLabel),
      parsedNode.tags.map((tag) => `#${tag}`).join(" ")
    ].filter(Boolean).join(" ");
    const textLines = wrapSvgText(exportLabel, isRoot ? 20 : 22);
    const text = textLines.map((line, index) => {
      const dy = index === 0 ? 0 : fontSize + 3;
      return `<tspan x="${item.x + 14}" dy="${dy}">${escapeXml(line)}</tspan>`;
    }).join("");
    const nodeHeight = Math.max(NODE_HEIGHT, 24 + textLines.length * (fontSize + 3));
    return [
      `<rect x="${item.x}" y="${item.y}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="var(--onemind-node-bg, #ffffff)" stroke="${escapeXml(item.color)}" stroke-width="1.5"/>`,
      `<text x="${item.x + 14}" y="${item.y + 24}" font-size="${fontSize}" font-weight="${fontWeight}" fill="var(--onemind-text, #1f2937)" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${text}</text>`
    ].join("\n");
  }).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" role="img" aria-label="${escapeXml(title)}">`,
    `<style>:root{--onemind-node-bg:#fff;--onemind-text:#1f2937}@media(prefers-color-scheme:dark){:root{--onemind-node-bg:#1f1f1f;--onemind-text:#e5e7eb}} rect{filter:drop-shadow(0 6px 14px rgba(15,23,42,.10))}</style>`,
    links,
    associationLinks,
    nodes,
    `</svg>`
  ].join("\n");
}

function renderAssociationSvgLinks(items: PositionedNode[]): string {
  const byAnchor = new Map<string, PositionedNode>();
  for (const item of items) byAnchor.set(slugifyNodeText(item.node.text), item);

  const drawn = new Set<string>();
  return items.flatMap((source) => {
    return extractLocalWikilinkAnchors(source.node.text, null).map((anchor) => {
      const target = byAnchor.get(anchor);
      if (!target || target.node.id === source.node.id) return "";
      const key = [source.node.id, target.node.id].sort().join(":");
      if (drawn.has(key)) return "";
      drawn.add(key);
      const x1 = source.x + source.width / 2;
      const y1 = source.y + NODE_HEIGHT / 2;
      const x2 = target.x + target.width / 2;
      const y2 = target.y + NODE_HEIGHT / 2;
      const midX = (x1 + x2) / 2;
      const lift = Math.max(80, Math.abs(y2 - y1) * 0.35);
      const midY = Math.min(y1, y2) - lift;
      return `<path d="M ${x1} ${y1} Q ${midX} ${midY}, ${x2} ${y2}" stroke="var(--onemind-association, #94a3b8)" fill="none" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="5 5" opacity="0.72"/>`;
    });
  }).filter(Boolean).join("\n");
}

async function svgToPng(svg: string, scale: number, transparent: boolean): Promise<ArrayBuffer> {
  const width = Number(/width="(\d+)"/.exec(svg)?.[1] ?? 1200);
  const height = Number(/height="(\d+)"/.exec(svg)?.[1] ?? 800);
  const multiplier = clamp(Math.round(scale), 1, 4);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not render SVG export."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width * multiplier;
    canvas.height = height * multiplier;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    if (!transparent) {
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--background-primary").trim() || "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.scale(multiplier, multiplier);
    ctx.drawImage(image, 0, 0, width, height);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not encode PNG export.")), "image/png");
    });
    return await pngBlob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function layoutTree(root: MindNode, colors: string[], direction: LayoutDirection): PositionedNode[] {
  const result: PositionedNode[] = [];

  const visibleChildren = (node: MindNode): MindNode[] => node.collapsed ? [] : node.children;
  const measure = (node: MindNode): number => {
    const children = visibleChildren(node);
    if (children.length === 0) return NODE_HEIGHT;
    return Math.max(NODE_HEIGHT, children.reduce((sum, child) => sum + measure(child), 0) + ROW_GAP * (children.length - 1));
  };

  const place = (node: MindNode, parent: MindNode | null, depth: number, x: number, top: number, color: string, side: -1 | 1): void => {
    const subtreeHeight = measure(node);
    const y = top + subtreeHeight / 2 - NODE_HEIGHT / 2;
    const width = depth === 0 ? 200 : NODE_WIDTH;
    result.push({ node, parent, depth, x, y, width, height: NODE_HEIGHT, color, side });

    let childTop = top;
    const children = visibleChildren(node);
    children.forEach((child, index) => {
      const childColor = depth === 0 ? colors[index % colors.length] : color;
      place(child, node, depth + 1, x + side * LEVEL_GAP, childTop, childColor, side);
      childTop += measure(child) + ROW_GAP;
    });
  };

  if (direction === "balanced" && !root.collapsed && root.children.length > 1) {
    const children = visibleChildren(root);
    const left = children.filter((_, index) => index % 2 === 1);
    const right = children.filter((_, index) => index % 2 === 0);
    const heightOf = (nodes: MindNode[]): number => nodes.length === 0 ? NODE_HEIGHT : nodes.reduce((sum, child) => sum + measure(child), 0) + ROW_GAP * (nodes.length - 1);
    const leftHeight = heightOf(left);
    const rightHeight = heightOf(right);
    const totalHeight = Math.max(leftHeight, rightHeight, NODE_HEIGHT);
    result.push({ node: root, parent: null, depth: 0, x: 0, y: totalHeight / 2 - NODE_HEIGHT / 2, width: 200, height: NODE_HEIGHT, color: colors[0], side: 1 });

    let leftTop = totalHeight / 2 - leftHeight / 2;
    left.forEach((child, index) => {
      const originalIndex = children.findIndex((candidate) => candidate === child);
      place(child, root, 1, -LEVEL_GAP, leftTop, colors[originalIndex % colors.length], -1);
      leftTop += measure(child) + ROW_GAP;
    });

    let rightTop = totalHeight / 2 - rightHeight / 2;
    right.forEach((child) => {
      const originalIndex = children.findIndex((candidate) => candidate === child);
      place(child, root, 1, LEVEL_GAP, rightTop, colors[originalIndex % colors.length], 1);
      rightTop += measure(child) + ROW_GAP;
    });
  } else {
    place(root, null, 0, 0, 0, colors[0], 1);
  }
  return result;
}

function renderInlineMarkdown(container: HTMLElement, text: string, app: App): void {
  const pattern = /(\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) continue;
    if (match.index > last) container.appendText(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("[[")) {
      const target = token.slice(2, -2);
      const link = container.createEl("span", { cls: "onemind-wikilink", text: target });
      link.onClickEvent((event) => {
        event.stopPropagation();
        void app.workspace.openLinkText(target, "", false);
      });
    } else if (token.startsWith("`")) {
      container.createEl("code", { text: token.slice(1, -1) });
    } else {
      container.createEl("strong", { text: token.slice(2, -2) });
    }
    last = match.index + token.length;
  }
  if (last < text.length) container.appendText(text.slice(last));
}

function parseEmojiText(text: string): ParsedEmojiText {
  const trimmed = text.trimStart();
  const match = /^((?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)(?:\u200D(?:\p{Extended_Pictographic})(?:\uFE0F|\uFE0E)?)*)\s+(.+)$/u.exec(trimmed);
  if (!match) return { emoji: null, label: text };
  return { emoji: match[1], label: match[2].trimStart() || "Untitled" };
}

function parseNodeText(text: string): ParsedNodeText {
  const parsed = parseEmojiText(text);
  const tags: string[] = [];
  const displayLabel = parsed.label
    .replace(/(^|\s)#([\p{Letter}\p{Number}_/-]+)/gu, (_match, prefix: string, tag: string) => {
      tags.push(tag);
      return prefix;
    })
    .replace(/\s{2,}/g, " ")
    .trim() || parsed.label;
  return { ...parsed, tags, displayLabel };
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, "").replace(/[^\p{Letter}\p{Number}_/-]/gu, "");
}

function addTagToText(text: string, tag: string): string {
  const parsed = parseNodeText(text);
  if (parsed.tags.includes(tag)) return text;
  return `${text.trim()} #${tag}`;
}

function removeNodeTags(text: string): string {
  const parsed = parseNodeText(text);
  const prefix = parsed.emoji ? `${parsed.emoji} ` : "";
  return `${prefix}${parsed.displayLabel}`.trim() || "Untitled";
}

function stripInlineMarkdown(text: string): string {
  const parsed = parseNodeText(text);
  return stripMarkdownFormatting(`${parsed.emoji ? `${parsed.emoji} ` : ""}${parsed.displayLabel}${parsed.tags.length > 0 ? ` ${parsed.tags.map((tag) => `#${tag}`).join(" ")}` : ""}`);
}

function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, alias: string | undefined) => alias ?? target)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}

function extractLocalWikilinkAnchors(text: string, file: TFile | null): string[] {
  const anchors: string[] = [];
  const basename = file?.basename.toLowerCase();
  const pathBase = file?.path.replace(/\.md$/i, "").toLowerCase();
  const pattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  for (const match of text.matchAll(pattern)) {
    const raw = match[1].trim();
    if (!raw) continue;
    const [rawFile, rawHeading] = raw.includes("#") ? raw.split("#", 2) : ["", raw];
    const targetFile = rawFile.trim().replace(/\.md$/i, "").toLowerCase();
    if (targetFile && targetFile !== basename && targetFile !== pathBase) continue;
    anchors.push(slugifyNodeText(rawHeading));
  }
  return anchors.filter(Boolean);
}

function wrapSvgText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Untitled"];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > maxChars) {
      if (current) lines.push(current);
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      current = "";
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createNode(text: string, kind: NodeKind): MindNode {
  return {
    id: `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    text: text.trim() || "Untitled",
    kind,
    children: [],
    collapsed: false
  };
}

function cloneNode(node: MindNode): MindNode {
  return {
    id: node.id,
    text: node.text,
    kind: node.kind,
    collapsed: node.collapsed,
    children: node.children.map((child) => cloneNode(child))
  };
}

function cloneNodeWithNewIds(node: MindNode): MindNode {
  return {
    id: createNode(node.text, node.kind).id,
    text: node.text,
    kind: node.kind,
    collapsed: node.collapsed,
    children: node.children.map((child) => cloneNodeWithNewIds(child))
  };
}

function filterTreeByTag(root: MindNode, tag: string): MindNode | null {
  const children = root.children
    .map((child) => filterTreeByTag(child, tag))
    .filter((child): child is MindNode => Boolean(child));
  if (parseNodeText(root.text).tags.includes(tag) || children.length > 0) {
    return { ...root, collapsed: false, children };
  }
  return null;
}

function subtreeHasTag(root: MindNode, tag: string): boolean {
  return parseNodeText(root.text).tags.includes(tag) || root.children.some((child) => subtreeHasTag(child, tag));
}

function normalizePastedNodeKinds(node: MindNode, preferredKind: NodeKind, depth: number): void {
  node.id = createNode(node.text, node.kind).id;
  node.kind = preferredKind === "heading" && depth <= 5 ? "heading" : "list";
  for (const child of node.children) normalizePastedNodeKinds(child, node.kind, depth + 1);
}

function applyDefaultExpandDepth(root: MindNode, maxDepth: number, depth = 0): void {
  root.collapsed = depth >= maxDepth;
  for (const child of root.children) applyDefaultExpandDepth(child, maxDepth, depth + 1);
}

function setCollapsedRecursive(root: MindNode, collapsed: boolean): void {
  root.collapsed = collapsed;
  for (const child of root.children) setCollapsedRecursive(child, collapsed);
}

function nextKind(parent: MindNode, parentDepth: number): NodeKind {
  if (parent.kind === "heading" && parentDepth < 5) return "heading";
  return "list";
}

function findNode(root: MindNode, id: string): MindNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function findNodeByAnchor(root: MindNode, anchor: string): MindNode | null {
  const normalized = normalizeAnchor(anchor);
  if (slugifyNodeText(root.text) === normalized) return root;
  for (const child of root.children) {
    const found = findNodeByAnchor(child, normalized);
    if (found) return found;
  }
  return null;
}

function findParent(root: MindNode, id: string): MindNode | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

function deleteNodes(root: MindNode, ids: Set<string>): void {
  root.children = root.children.filter((child) => !ids.has(child.id));
  for (const child of root.children) deleteNodes(child, ids);
}

function flattenNodes(root: MindNode): MindNode[] {
  const nodes: MindNode[] = [];
  const visit = (node: MindNode): void => {
    nodes.push(node);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return nodes;
}

function findPath(root: MindNode, id: string): MindNode[] {
  if (root.id === id) return [root];
  for (const child of root.children) {
    const path = findPath(child, id);
    if (path.length > 0) return [root, ...path];
  }
  return [];
}

function getDescendantIds(node: MindNode | null): string[] {
  if (!node) return [];
  const ids: string[] = [];
  const visit = (current: MindNode): void => {
    for (const child of current.children) {
      ids.push(child.id);
      visit(child);
    }
  };
  visit(node);
  return ids;
}

function moveNode(root: MindNode, nodeId: string, target: DropTarget): boolean {
  if (nodeId === root.id || nodeId === target.parentId) return false;
  const oldParent = findParent(root, nodeId);
  const newParent = findNode(root, target.parentId);
  if (!oldParent || !newParent) return false;

  const movingIndex = oldParent.children.findIndex((child) => child.id === nodeId);
  if (movingIndex === -1) return false;
  const [moving] = oldParent.children.splice(movingIndex, 1);
  if (!moving) return false;

  let insertIndex = target.mode === "child" ? newParent.children.length : target.index;
  if (oldParent.id === newParent.id && movingIndex < insertIndex) insertIndex -= 1;
  insertIndex = clamp(insertIndex, 0, newParent.children.length);
  moving.kind = nextKind(newParent, getNodeDepth(root, newParent.id));
  newParent.children.splice(insertIndex, 0, moving);
  newParent.collapsed = false;
  return true;
}

function moveNodeByKeyboard(root: MindNode, nodeId: string, direction: "up" | "down" | "indent" | "outdent"): boolean {
  const parent = findParent(root, nodeId);
  const node = findNode(root, nodeId);
  if (!parent || !node) return false;
  const index = parent.children.findIndex((child) => child.id === nodeId);
  if (index === -1) return false;

  if (direction === "up") {
    if (index === 0) return false;
    [parent.children[index - 1], parent.children[index]] = [parent.children[index], parent.children[index - 1]];
    return true;
  }

  if (direction === "down") {
    if (index >= parent.children.length - 1) return false;
    [parent.children[index], parent.children[index + 1]] = [parent.children[index + 1], parent.children[index]];
    return true;
  }

  if (direction === "indent") {
    if (index === 0) return false;
    const newParent = parent.children[index - 1];
    parent.children.splice(index, 1);
    node.kind = nextKind(newParent, getNodeDepth(root, newParent.id));
    newParent.children.push(node);
    newParent.collapsed = false;
    return true;
  }

  const grandParent = findParent(root, parent.id);
  if (!grandParent) return false;
  parent.children.splice(index, 1);
  const parentIndex = grandParent.children.findIndex((child) => child.id === parent.id);
  node.kind = nextKind(grandParent, getNodeDepth(root, grandParent.id));
  grandParent.children.splice(parentIndex + 1, 0, node);
  return true;
}

function normalizeAnchor(anchor: string): string {
  return decodeURIComponent(anchor)
    .replace(/^#+/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function slugifyNodeText(text: string): string {
  return stripInlineMarkdown(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\p{Emoji_Presentation}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function getNodeDepth(root: MindNode, id: string, depth = 0): number {
  if (root.id === id) return depth;
  for (const child of root.children) {
    const found = getNodeDepth(child, id, depth + 1);
    if (found !== -1) return found;
  }
  return -1;
}

function getBounds(items: PositionedNode[]): { minX: number; minY: number; width: number; height: number } {
  const minX = Math.min(...items.map((item) => item.x));
  const minY = Math.min(...items.map((item) => item.y));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  const maxY = Math.max(...items.map((item) => item.y + item.height));
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createSvg<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}
