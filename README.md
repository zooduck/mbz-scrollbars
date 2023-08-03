# zooduck/mbz-scrollbars

An *experimental* web component for normalizing scrollbars across user agents and devices.

## Getting started

This component is hosted by the [jsdelivr](https://www.jsdelivr.com/) CDN.

Simply add the following module script to your document head:

```html
<script src="https://cdn.jsdelivr.net/gh/zooduck/mbz-scrollbars@latest/dist/index.module.js" type="module"></script>
```

Or import using a module file:

```javascript
import 'https://cdn.jsdelivr.net/gh/zooduck/mbz-scrollbars@latest/dist/index.module.js'
```

## Use

To replace user agent scrollbars with custom scrollbars, simply wrap any scrollable elements with an `<mbz-scrollbars>` element.

For example:

```html
<mbz-scrollbars>
  <section style="height: 100px; overflow: auto; width: 200px;"></section>
</mbz-scrollbars>
```

Scrollbar display is automatically adjusted based on the overflow settings of the scrollable element.

## Attributes

### always-on

By default, scrollbars only show when hovering an element. You can change this behavior by setting the `always-on` boolean content attribute:

```html
<mbz-scrollbars always-on>
  <!-- scrollable element here -->
</mbz-scrollbars>
```

Note: This does *not* intefere with or override `overflow` styles.

### scroll-tap-behavior

The default scroll tap behavior reflects that of most user agent scrollbars - each tap or click will scroll a fixed percentage of the scrollable area (8.75%).

But you can also opt to have the content scrolled relative to the position of the tap or click by setting the `scroll-tap-behavior` content attribute to `"relative"`:

```html
<mbz-scrollbars scroll-tap-behavior="relative">
  <!-- scrollable element here -->
</mbz-scrollbars>
```

In that case, a tap or click at say 90% of the scrollbars width or height would scroll the content by 90%. (This is similar to the scroll tap behavior in Visual Studio Code).
