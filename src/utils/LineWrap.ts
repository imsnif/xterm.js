/**
 * Stores multiple line indices to allow interpreting them as line wraps
 * @module xterm/utils/RowIndex
 * @license MIT
 */

import { RowIndex } from '../utils/RowIndex'
import { CircularList } from '../utils/CircularList.js';

interface IRowIndex {
  startIndex: number
  endIndex: number
  index: number
}
export class LineWrap<T> {
  private _rowIndices
  constructor(maxLength: number) {
    this._rowIndices = new CircularList<IRowIndex>(maxLength)
    for (let i = 0; i < maxLength; i++) {
      this._rowIndices.push(new RowIndex(i, i, i))
    }
  }
  public getRowIndex(index: number): number {
    const lineContainingRowIndex = this._rowIndices.filter(r => {
      return (
        r.startIndex <= index &&
        r.endIndex >= index
      )
    })[0]
    return lineContainingRowIndex;
  }
  public getRow(index: number): any {
    return this._rowIndices.get(index)
  }
  public changeLineLength (lines: any, length: number) {
    for (let i = 0; i < this._rowIndices.length; i++) {
      if (!lines.get(i)) continue
      const line = lines.get(i)
      const lineWithoutTrailingSpaces = line
        .map(c => c[1])
        .join('')
        .replace(/\s*$/, '') // TODO: don't create so many arrays
      const currentLength = lineWithoutTrailingSpaces.length
      if (length < currentLength) {
        const newRowCount = Math.ceil(currentLength / length)
        const startIndex = this._rowIndices.get(i).startIndex
        this._rowIndices.get(i).endIndex = startIndex + newRowCount - 1
      } else if (length > currentLength) {
        const startIndex = this._rowIndices.get(i).startIndex
        this._rowIndices.get(i).endIndex = startIndex
      }
      if (this._rowIndices.get(i + 1).startIndex > 0) { // next row does not circle back
        this._rowIndices.get(i + 1).startIndex = this._rowIndices.get(i).endIndex + 1
      }
    }
  }
//  public get rowCount(): number {
//    // TBD
//  }
  public lineIndex: number // the index of this.lines
  public startIndex: number // The start index in this.lines[lineIndex]
  public endIndex: number // The end index in this.lines[lineIndex]
}
