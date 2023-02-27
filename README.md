# VirtualizedList

A simple Virtualized List using vanilla JS.

## How to install

Just install the package from npm:

```bash
npm install --save @bogdanbeniaminb/virtualized-list
```

## How to use

You will need:

- a container element with a **fixed** height
- a list of items
- an estimated height of the list items (optional)
- a renderer function, which accepts the item data and returns the HTML element

```javascript
import VirtualizedList from '@bogdanbeniaminb/virtualized-list';

const listItems = [
  {
    id: 1,
    title: 'First',
  },
  {
    id: 2,
    title: 'Second',
  },
];

// Make sure this element exists on the page and that it has a fixed height.
const wrapper = document.querySelector('.virtualized-list-wrapper');

const virtualizedList = new VirtualizedList({
  listElement: wrapper,
  itemHeight: 35, // optional
  items: listItems,
  itemRenderer: (item) => {
    const itemElement = document.createElement('div');
    itemElement.innerHTML = item.title;
    return itemElement;
  },
  itemKeyGetter: (item) => item.id, // optional
});
```

### Parameters

- `listElement` (HTMLElement, **required**) - the list container
- `itemHeight` (number, optional) - the estimated item height
- `items` (array of objects, **required**) - the items to display
- `itemRenderer` (function, **required**) - accepts 1 or 2 parameters, the first one being the current item, and should return a HTMLElement
- `itemKeyGetter` (function, optional) - a function which accepts the item and returns a **unique** ID. If not provided, the library will search for: 1) the `id` field of the item; 2) the `key` field of the item; 3) the actual index of the item in the array.

### Methods

- `updateItems(items: T[])` - update the whole array of items. Use this if you want to dynamically change the items. It will be similar to a reset.
