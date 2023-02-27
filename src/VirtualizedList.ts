export type VirtualizedListItemElement = {
  itemKey: string;
  renderedItem: HTMLElement;
};

export type VirtualizedListOptions<T> = {
  listElement: HTMLElement;
  itemHeight: number;
  items: T[];
  itemRenderer: (item: T) => HTMLElement;
  itemKeyGetter?: (item: T, index: number) => string;
};

/**
 * Virtualized list for rendering large lists of items.
 * The list is rendered with a fixed height and only the visible items are rendered.
 *
 * Developed by Bogdan Barbu (bbarbu@smartimpact.fr), 2023.
 */
export default class VirtualizedList<T> {
  protected listElement: HTMLElement;
  protected wrapperElement: HTMLElement;
  protected itemHeight: number;
  protected items: T[];
  protected itemsMap: Map<string, T>;
  protected itemRenderer: (item: T) => HTMLElement;
  protected itemKeyGetter: (item: T, index: number) => string;

  protected listElementHeight: number;
  protected visibleItemsCount: number;
  protected visibleItems: T[];
  protected visibleItemElements: VirtualizedListItemElement[] = [];
  protected extraItemsBuffer: number = 5;
  protected start: number = 0;
  protected end: number = 0;
  protected cachedItemHeights: Record<string, number> = {};

  constructor({
    listElement,
    itemHeight,
    items,
    itemRenderer,
    itemKeyGetter = null,
  }: VirtualizedListOptions<T>) {
    this.listElement = listElement;
    this.listElement.style.overflowY = "auto";
    this.wrapperElement = document.createElement("div");
    this.wrapperElement.classList.add("virtualized-list-wrapper");
    this.listElement.appendChild(this.wrapperElement);
    this.itemHeight = itemHeight;

    this.itemRenderer = itemRenderer;
    this.itemKeyGetter = itemKeyGetter || this.defaultItemKeyGetter.bind(this);
    this.setItems(items);

    this.updateListElementHeight();
    this.render();
    this.listElement.addEventListener("scroll", this.onScroll.bind(this));
    window.addEventListener("resize", this.onResize.bind(this));
  }

  /**
   * If no item key getter is provided, try to use the id or key property of the item.
   * If none of these are present, use the index.
   */
  protected defaultItemKeyGetter(item: T, index: number): string | number {
    if (typeof item !== "object") {
      return index;
    }

    if (item.hasOwnProperty("id")) {
      return (item as any).id.toString();
    }

    if (item.hasOwnProperty("key")) {
      return (item as any).key.toString();
    }

    return index;
  }

  protected setItems(items: T[]) {
    const itemsMap = new Map();
    items.forEach((item, index) => {
      itemsMap.set(this.itemKeyGetter(item, index), item);
    });
    this.itemsMap = itemsMap;
    this.items = items;
  }

  updateItems(items: T[]) {
    this.setItems(items);
    this.listElement.scrollTop = 0;
    this.updateListElementHeight();
    this.render(true);
  }

  protected onScroll() {
    this.render();
  }

  protected onResize() {
    this.updateListElementHeight();
    this.cachedItemHeights = {};
    this.render();
  }

  protected updateListElementHeight() {
    this.listElementHeight = this.listElement.clientHeight;
  }

  protected calculateTotalHeight(): number {
    let height = 0;
    this.itemsMap.forEach((item, key) => {
      height += this.cachedItemHeights[key] || this.itemHeight;
    });
    return height;
  }

  protected calculateOffsetTop(): number {
    const scrollTop = this.listElement.scrollTop;
    const roughIndex = Math.floor(scrollTop / this.itemHeight);

    // Calculate the offset top by summing the heights of the items before the rough index
    let offsetTop = 0;
    for (let i = 0; i < roughIndex; i++) {
      offsetTop += this.cachedItemHeights[i] || this.itemHeight;
      if (offsetTop > scrollTop) {
        return i;
      }
    }

    return roughIndex;
  }

  protected calculatePaddingTop(): number {
    let paddingTop = 0;
    for (let i = 0; i < this.start; i++) {
      paddingTop += this.cachedItemHeights[i] || this.itemHeight;
    }
    return paddingTop;
  }

  protected calculatePaddingBottom(): number {
    let paddingBottom = 0;
    for (let i = this.end; i < this.itemsMap.size; i++) {
      paddingBottom += this.cachedItemHeights[i] || this.itemHeight;
    }
    return paddingBottom;
  }

  protected calculateOffsets() {
    const offset = this.calculateOffsetTop();
    const maxVisibleItemsCount = Math.ceil(
      this.listElementHeight / this.itemHeight
    );
    const start = Math.max(0, offset - this.extraItemsBuffer);
    const end = Math.min(
      offset + maxVisibleItemsCount + this.extraItemsBuffer,
      this.itemsMap.size
    );

    return { start, end };
  }

  protected render(force: boolean = false) {
    // Calculate the visible items.
    const { start, end } = this.calculateOffsets();

    // If the visible items haven't changed, don't do anything.
    if (!force && start === this.start && end === this.end) {
      return;
    }

    this.visibleItems = this.items.slice(start, end);
    this.visibleItemsCount = this.visibleItems.length;
    this.start = start;
    this.end = end;

    // Store the scroll position.
    const scrollTopPosition = this.listElement.scrollTop;

    // Render the visible items.
    const renderedItems: VirtualizedListItemElement[] = this.visibleItems.map(
      (item, index) => {
        const itemKey = this.itemKeyGetter(item, index + this.start);
        const existing = this.visibleItemElements.find(
          (element) => element.itemKey === itemKey
        );
        if (existing) {
          return existing;
        }

        // Render the item.
        const renderedItem = this.itemRenderer(item);
        return { itemKey, renderedItem };
      }
    );

    // Remove the items that are no longer visible.
    this.visibleItemElements.forEach((element) => {
      if (!renderedItems.find((item) => item.itemKey === element.itemKey)) {
        element.renderedItem.remove();
      }
    });

    // Update the list of visible items.
    this.visibleItemElements = renderedItems;

    // Update the scroll position.
    const paddingTop = this.calculatePaddingTop();
    const paddingBottom = this.calculatePaddingBottom();
    this.wrapperElement.style.paddingTop = `${paddingTop}px`;
    this.wrapperElement.style.paddingBottom = `${paddingBottom}px`;

    // Update the DOM.
    const newList = document.createDocumentFragment();
    renderedItems.forEach((element) => {
      newList.appendChild(element.renderedItem);
    });
    this.wrapperElement.appendChild(newList);

    // Restore the scroll position.
    this.listElement.scrollTop = scrollTopPosition;

    // Cache the item heights.
    renderedItems.forEach((element) => {
      this.cachedItemHeights[element.itemKey] ||=
        element.renderedItem.clientHeight;
    });

    // Update the item height, but only if it hasn't been set yet.
    if (!this.itemHeight) {
      this.itemHeight =
        this.visibleItemElements?.[0]?.renderedItem.clientHeight;
    }
  }
}
