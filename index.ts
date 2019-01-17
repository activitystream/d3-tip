import * as d3 from "d3"

interface TipOptions {
  /** elements to be blurred */
  blur?: string
  rootElement?: HTMLElement
}

// One of n(north), s(south), e(east), or w(west), nw(northwest),
//     sw(southwest), ne(northeast) or se(southeast)
type Direction = "n" | "e" | "s" | "w" | "nw" | "sw" | "ne" | "se"

type HtmlFunction<T> = (data: T, i: number) => string
type OffsetFunction<T> = (data: T, i: number) => [number, number]
type DirectionFunction<T> = (data: T, i: number) => Direction

export default function d3tip<T>(config: TipOptions = {}) {
  let direction: DirectionFunction<T> = d3_tip_direction
  let offset: OffsetFunction<T> = d3_tip_offset
  let html: HtmlFunction<T> = d3_tip_html
  let node = initNode()
  let rootElement = config.rootElement || document.body
  let svg: SVGSVGElement
  let point: DOMPoint
  let target: SVGElement

  function tip(vis: d3.Selection<T>) {
    const _svg = getSVGNode(vis)
    if (!_svg) {
      return
    }
    svg = _svg
    point = svg.createSVGPoint()
    if (!node) {
      return
    }
    rootElement.appendChild(node)
  }

  tip.rootElement = function(root?: HTMLElement) {
    if (root == null) return rootElement
    rootElement = root
    return tip
  }

  // Public - show the tooltip on the screen
  //
  // Returns a tip
  tip.show = function(data: T, idx: number | SVGElement) {
    let args: [T, number]
    if (idx instanceof SVGElement) {
      target = idx
      args = [data, 0]
    } else {
      args = [data, idx]
    }

    const content = html.apply(this, args)
    const poffset = offset.apply(this, args)
    const dir = direction.apply(this, args)
    const nodel = getNodeEl()
    let i = directions.length
    let coords
    const scrollTop =
      document.documentElement.scrollTop || rootElement.scrollTop
    const scrollLeft =
      document.documentElement.scrollLeft || rootElement.scrollLeft

    nodel
      .html(content + '<span class="d3-tip__pin"></span>')
      .style({ opacity: 1, "pointer-events": "all", display: "block" })
      .selectAll(config.blur || "")
      .classed("demo-blur", true)

    while (i--) nodel.classed(directions[i], false)
    coords = direction_callbacks.get(dir).apply(this)
    nodel.classed(dir, true).style({
      top: coords.top + poffset[0] + scrollTop + "px",
      left: coords.left + poffset[1] + scrollLeft + "px",
    })
    ;(tip as any).nodel = nodel

    return tip
  }

  // Public - hide the tooltip
  //
  // Returns a tip
  tip.hide = function() {
    var nodel = getNodeEl()
    nodel.style({ opacity: 0, "pointer-events": "none", display: "none" })
    return tip
  }

  // Public: Proxy attr calls to the d3 tip container.  Sets or gets attribute value.
  //
  // n - name of the attribute
  // v - value of the attribute
  //
  // Returns tip or attribute value
  tip.attr = function(n: string, v?: string | number) {
    if (v == null) {
      return getNodeEl().attr(n)
    } else {
      getNodeEl().attr(n, v)
    }

    return tip
  }

  // Public: Proxy style calls to the d3 tip container.  Sets or gets a style value.
  //
  // n - name of the property
  // v - value of the property
  //
  // Returns tip or style property value
  tip.style = function(n: string, v?: string) {
    if (v == null) {
      return getNodeEl().style(n)
    } else {
      getNodeEl().style(n, v)
    }

    return tip
  }

  // Public: Set or get the direction of the tooltip
  //
  // v - One of n(north), s(south), e(east), or w(west), nw(northwest),
  //     sw(southwest), ne(northeast) or se(southeast)
  //
  // Returns tip or direction
  tip.direction = function(v?: Direction | DirectionFunction<T>) {
    if (v == null) return direction
    direction = typeof v === "function" ? v : () => v

    return tip
  }

  // Public: Sets or gets the offset of the tip
  //
  // v - Array of [x, y] offset
  //
  // Returns offset or
  tip.offset = function(v?: [number, number] | OffsetFunction<T>) {
    if (v == null) return offset
    offset = typeof v === "function" ? v : () => v

    return tip
  }

  // Public: sets or gets the html value of the tooltip
  //
  // v - String value of the tip
  //
  // Returns html value or tip
  tip.html = function(v?: string | HtmlFunction<T>) {
    if (v == null) return html
    html = typeof v === "function" ? v : () => v

    return tip
  }

  // Public: destroys the tooltip and removes it from the DOM
  //
  // Returns a tip
  tip.destroy = function() {
    if (node) {
      getNodeEl().remove()
      // @ts-ignore: this enables garbage collection
      node = null
    }
    return tip
  }

  function d3_tip_direction(): Direction {
    return "n"
  }
  function d3_tip_offset(): [number, number] {
    return [0, 0]
  }
  function d3_tip_html() {
    return " "
  }

  var direction_callbacks = d3.map({
      n: direction_n,
      s: direction_s,
      e: direction_e,
      w: direction_w,
      nw: direction_nw,
      ne: direction_ne,
      sw: direction_sw,
      se: direction_se,
    }),
    directions = direction_callbacks.keys()

  function direction_n() {
    var bbox = getScreenBBox()
    // check if the tooltip will go overflow right side and left side of the page
    var screenRect = rootElement.getBoundingClientRect()
    if (bbox.n.x + node.offsetWidth / 2 > screenRect.width) {
      const diff = bbox.n.x + node.offsetWidth / 2 - screenRect.width
      ;(node.children[node.children.length - 1] as HTMLElement).style.left =
        node.offsetWidth / 2 + diff + "px"
      return {
        top: bbox.n.y - node.offsetHeight,
        left: bbox.n.x - node.offsetWidth / 2 - diff,
      }
    }
    if (bbox.n.x - node.offsetWidth / 2 < 0) {
      const diff = node.offsetWidth / 2 - bbox.n.x
      ;(node.children[node.children.length - 1] as HTMLElement).style.left =
        node.offsetWidth / 2 - diff + "px"
      return {
        top: bbox.n.y - node.offsetHeight,
        left: bbox.n.x - node.offsetWidth / 2 + diff,
      }
    }
    return {
      top: bbox.n.y - node.offsetHeight,
      left: bbox.n.x - node.offsetWidth / 2,
    }
  }

  function direction_s() {
    var bbox = getScreenBBox()
    return {
      top: bbox.s.y,
      left: bbox.s.x - node.offsetWidth / 2,
    }
  }

  function direction_e() {
    var bbox = getScreenBBox()
    return {
      top: bbox.e.y - node.offsetHeight / 2,
      left: bbox.e.x,
    }
  }

  function direction_w() {
    var bbox = getScreenBBox()
    return {
      top: bbox.w.y - node.offsetHeight / 2,
      left: bbox.w.x - node.offsetWidth,
    }
  }

  function direction_nw() {
    var bbox = getScreenBBox()
    return {
      top: bbox.nw.y - node.offsetHeight,
      left: bbox.nw.x - node.offsetWidth,
    }
  }

  function direction_ne() {
    var bbox = getScreenBBox()
    return {
      top: bbox.ne.y - node.offsetHeight,
      left: bbox.ne.x,
    }
  }

  function direction_sw() {
    var bbox = getScreenBBox()
    return {
      top: bbox.sw.y,
      left: bbox.sw.x - node.offsetWidth,
    }
  }

  function direction_se() {
    var bbox = getScreenBBox()
    return {
      top: bbox.se.y,
      left: bbox.e.x,
    }
  }

  function initNode() {
    var node = d3.select(document.createElement("div"))
    node.style({
      position: "absolute",
      top: 0,
      opacity: 0,
      "pointer-events": "none",
      "box-sizing": "border-box",
      display: "none",
    })

    return node.node() as HTMLElement
  }

  function getSVGNode(selection: d3.Selection<T>) {
    const el = selection.node() as SVGSVGElement
    if (!el) {
      return
    }
    if (el.tagName.toLowerCase() === "svg") return el

    return el.ownerSVGElement
  }

  function getNodeEl() {
    if (node === null) {
      node = initNode()
      // re-add node to DOM
      rootElement.appendChild(node)
    }
    return d3.select(node)
  }

  interface ScreenBBox {
    s: DOMPoint
    w: DOMPoint
    n: DOMPoint
    e: DOMPoint
    se: DOMPoint
    ne: DOMPoint
    sw: DOMPoint
    nw: DOMPoint
  }

  // Private - gets the screen coordinates of a shape
  //
  // Given a shape on the screen, will return an SVGPoint for the directions
  // n(north), s(south), e(east), w(west), ne(northeast), se(southeast), nw(northwest),
  // sw(southwest).
  //
  //    +-+-+
  //    |   |
  //    +   +
  //    |   |
  //    +-+-+
  //
  // Returns an Object {n, s, e, w, nw, sw, ne, se}
  function getScreenBBox() {
    const targetel: SVGGraphicsElement =
      (target as SVGGraphicsElement) ||
      ((d3.event as any).target as SVGGraphicsElement)

    const bbox: ScreenBBox = {} as ScreenBBox
    const matrix = targetel.getScreenCTM() as DOMMatrix
    const tbbox = targetel.getBBox()
    const width = tbbox.width
    const height = tbbox.height
    const x = tbbox.x
    const y = tbbox.y

    point.x = x
    point.y = y
    bbox.nw = point.matrixTransform(matrix)
    point.x += width
    bbox.ne = point.matrixTransform(matrix)
    point.y += height
    bbox.se = point.matrixTransform(matrix)
    point.x -= width
    bbox.sw = point.matrixTransform(matrix)
    point.y -= height / 2
    bbox.w = point.matrixTransform(matrix)
    point.x += width
    bbox.e = point.matrixTransform(matrix)
    point.x -= width / 2
    point.y -= height / 2
    bbox.n = point.matrixTransform(matrix)
    point.y += height
    bbox.s = point.matrixTransform(matrix)

    return bbox
  }

  return tip
}
