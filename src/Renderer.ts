/**
 * @license MIT
 */

import { ITerminal } from './Interfaces';

/**
 * The maximum number of refresh frames to skip when the write buffer is non-
 * empty. Note that these frames may be intermingled with frames that are
 * skipped via requestAnimationFrame's mechanism.
 */
const MAX_REFRESH_FRAME_SKIP = 5;

/**
 * Flags used to render terminal text properly.
 */
enum FLAGS {
  BOLD = 1,
  UNDERLINE = 2,
  BLINK = 4,
  INVERSE = 8,
  INVISIBLE = 16
};

let brokenBold: boolean = null;

/**
 * Strips trailing whitespace from line, down to a minimum length
 * Under the minimum length it will only strip default blank characters, in case they are part of
 * a coloured bg (ie vim)
 *
 * @param {array} line - A terminal line
 * @param {number} min - The minimum length to trim the line to
 * @param {number} blank - The code for a default blank character
 *
 * @return {array} - The trimmed terminal line
 */
const trimBlank = (line, min, blank) => {
  let i = line.length - 1;
  for (i; i >= 0; i--) {
    if (i >= min) {
      if (line[i][1] !== ' ') {
        break;
      }
    } else {
      if (line[i][1] !== ' ' || line[i][0] !== blank) {
        break;
      }
    }
  }

  if (i < min) {
    i = min;
  } else {
    // 2 extra blank chars allows for cursor and ensures at least one element is in array (in case
    // of intentional blank rows)
    i += 2;
  }

  return line.slice(0, i);
};

const chunkArray = (array, chunkSize) => {
  let temparray = [];
  let i = 0;
  let j = array.length;
  for (i; i < j; i += chunkSize) {
    temparray.push(array.slice(i, i + chunkSize));
  }

  return temparray;
};

export class Renderer {
  /** A queue of the rows to be refreshed */
  private _refreshRowsQueue: {start: number, end: number}[] = [];
  private _refreshFramesSkipped = 0;
  private _refreshAnimationFrame = null;

  constructor(private _terminal: ITerminal) {
    // Figure out whether boldness affects
    // the character width of monospace fonts.
    if (brokenBold === null) {
      brokenBold = checkBoldBroken((<any>this._terminal).document);
    }

    // TODO: Pull more DOM interactions into Renderer.constructor, element for
    // example should be owned by Renderer (and also exposed by Terminal due to
    // to established public API).
  }

  /**
   * Queues a refresh between two rows (inclusive), to be done on next animation
   * frame.
   * @param {number} start The start row.
   * @param {number} end The end row.
   */
  public queueRefresh(start: number, end: number): void {
    this._refreshRowsQueue.push({ start: start, end: end });
    if (!this._refreshAnimationFrame) {
      this._refreshAnimationFrame = window.requestAnimationFrame(this._refreshLoop.bind(this));
    }
  }

  /**
   * Performs the refresh loop callback, calling refresh only if a refresh is
   * necessary before queueing up the next one.
   */
  private _refreshLoop(): void {
    // Skip MAX_REFRESH_FRAME_SKIP frames if the writeBuffer is non-empty as it
    // will need to be immediately refreshed anyway. This saves a lot of
    // rendering time as the viewport DOM does not need to be refreshed, no
    // scroll events, no layouts, etc.
    const skipFrame = this._terminal.writeBuffer.length > 0 && this._refreshFramesSkipped++ <= MAX_REFRESH_FRAME_SKIP;
    if (skipFrame) {
      this._refreshAnimationFrame = window.requestAnimationFrame(this._refreshLoop.bind(this));
      return;
    }

    this._refreshFramesSkipped = 0;
    let start;
    let end;
    if (this._refreshRowsQueue.length > 4) {
      // Just do a full refresh when 5+ refreshes are queued
      start = 0;
      end = this._terminal.rows - 1;
    } else {
      // Get start and end rows that need refreshing
      start = this._refreshRowsQueue[0].start;
      end = this._refreshRowsQueue[0].end;
      for (let i = 1; i < this._refreshRowsQueue.length; i++) {
        if (this._refreshRowsQueue[i].start < start) {
          start = this._refreshRowsQueue[i].start;
        }
        if (this._refreshRowsQueue[i].end > end) {
          end = this._refreshRowsQueue[i].end;
        }
      }
    }
    this._refreshRowsQueue = [];
    this._refreshAnimationFrame = null;
    this._refresh(start, end);
  }

  /**
   * Refreshes (re-renders) terminal content within two rows (inclusive)
   *
   * Rendering Engine:
   *
   * In the screen buffer, each character is stored as a an array with a character
   * and a 32-bit integer:
   *   - First value: a utf-16 character.
   *   - Second value:
   *   - Next 9 bits: background color (0-511).
   *   - Next 9 bits: foreground color (0-511).
   *   - Next 14 bits: a mask for misc. flags:
   *     - 1=bold
   *     - 2=underline
   *     - 4=blink
   *     - 8=inverse
   *     - 16=invisible
   *
   * @param {number} start The row to start from (between 0 and terminal's height terminal - 1)
   * @param {number} end The row to end at (between fromRow and terminal's height terminal - 1)
   */
  private _refresh(start: number, end: number): void {
    let x, y, i, line, out, ch, ch_width, width, data, attr, bg, fg, flags, row, parent, focused = document.activeElement;

    // If this is a big refresh, remove the terminal rows from the DOM for faster calculations
    if (end - start >= this._terminal.rows / 2) {
      parent = this._terminal.element.parentNode;
      if (parent) {
        this._terminal.element.removeChild(this._terminal.rowContainer);
      }
    }

    width = this._terminal.cols;
    y = end + 1;

    if (end >= this._terminal.rows) {
      this._terminal.log('`end` is too large. Most likely a bad CSR.');
      end = this._terminal.rows - 1;
    }

    let overflowBuffer = [];
    let inOverflow = false;

    let renderCount = 0;
    let rowsToRender = end - start;
    while (renderCount <= rowsToRender) {

      if (overflowBuffer.length) {
        line = overflowBuffer.pop();
        inOverflow = true;
      } else {
        inOverflow = false;
        y--;
        row = y + this._terminal.ydisp;

        line = this._terminal.lines.get(row);
      }
      if (!line || !this._terminal.children[y]) {
        // Continue if the line is not available, this means a resize is currently in progress
        renderCount++;
        continue;
      }

      console.log(line);

      if (line.length > width) {
        overflowBuffer = chunkArray(trimBlank(line, width, this._terminal.defAttr), width);
        if (!overflowBuffer.length) {
          return;
        }
        line = overflowBuffer.pop();
      }

//      if (inOverflow && line.map(l => l[1]).join('').trim() === '') {
//        continue;
//      }

      out = '';

      if (this._terminal.y === y - (this._terminal.ybase - this._terminal.ydisp)
          && this._terminal.cursorState
          && !this._terminal.cursorHidden) {
        x = this._terminal.x;
      } else {
        x = -1;
      }

      attr = this._terminal.defAttr;
      i = 0;

      for (; i < width; i++) {
        if (!line[i]) {
          // Continue if the character is not available, this means a resize is currently in progress
          data = this._terminal.defAttr;
          ch = ' ';
          ch_width = 1;

        } else {
          data = line[i][0];
          ch = line[i][1];
          ch_width = line[i][2];
        }
        if (!ch_width)
          continue;

        if (i === x) data = -1;

        if (data !== attr) {
          if (attr !== this._terminal.defAttr) {
            out += '</span>';
          }
          if (data !== this._terminal.defAttr) {
            if (data === -1) {
              out += '<span class="reverse-video terminal-cursor">';
            } else {
              let classNames = [];

              bg = data & 0x1ff;
              fg = (data >> 9) & 0x1ff;
              flags = data >> 18;

              if (flags & FLAGS.BOLD) {
                if (!brokenBold) {
                  classNames.push('xterm-bold');
                }
                // See: XTerm*boldColors
                if (fg < 8) fg += 8;
              }

              if (flags & FLAGS.UNDERLINE) {
                classNames.push('xterm-underline');
              }

              if (flags & FLAGS.BLINK) {
                classNames.push('xterm-blink');
              }

              // If inverse flag is on, then swap the foreground and background variables.
              if (flags & FLAGS.INVERSE) {
                /* One-line variable swap in JavaScript: http://stackoverflow.com/a/16201730 */
                bg = [fg, fg = bg][0];
                // Should inverse just be before the
                // above boldColors effect instead?
                if ((flags & 1) && fg < 8) fg += 8;
              }

              if (flags & FLAGS.INVISIBLE) {
                classNames.push('xterm-hidden');
              }

              /**
               * Weird situation: Invert flag used black foreground and white background results
               * in invalid background color, positioned at the 256 index of the 256 terminal
               * color map. Pin the colors manually in such a case.
               *
               * Source: https://github.com/sourcelair/xterm.js/issues/57
               */
              if (flags & FLAGS.INVERSE) {
                if (bg === 257) {
                  bg = 15;
                }
                if (fg === 256) {
                  fg = 0;
                }
              }

              if (bg < 256) {
                classNames.push('xterm-bg-color-' + bg);
              }

              if (fg < 256) {
                classNames.push('xterm-color-' + fg);
              }

              out += '<span';
              if (classNames.length) {
                out += ' class="' + classNames.join(' ') + '"';
              }
              out += '>';
            }
          }
        }

        if (ch_width === 2) {
          out += '<span class="xterm-wide-char">';
        }
        switch (ch) {
          case '&':
            out += '&amp;';
            break;
          case '<':
            out += '&lt;';
            break;
          case '>':
            out += '&gt;';
            break;
          default:
            if (ch <= ' ') {
              out += '&nbsp;';
            } else {
              out += ch;
            }
            break;
        }
        if (ch_width === 2) {
          out += '</span>';
        }

        attr = data;
      }

      if (attr !== this._terminal.defAttr) {
        out += '</span>';
      }

      renderCount++;
      this._terminal.children[end + 1 - renderCount].innerHTML = out;
    }

    if (parent) {
      this._terminal.element.appendChild(this._terminal.rowContainer);
    }

    this._terminal.emit('refresh', {element: this._terminal.element, start: start, end: end});
  };
}


// if bold is broken, we can't
// use it in the terminal.
function checkBoldBroken(document) {
  const body = document.getElementsByTagName('body')[0];
  const el = document.createElement('span');
  el.innerHTML = 'hello world';
  body.appendChild(el);
  const w1 = el.scrollWidth;
  el.style.fontWeight = 'bold';
  const w2 = el.scrollWidth;
  body.removeChild(el);
  return w1 !== w2;
}
