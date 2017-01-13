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
  }
  public getRowIndex(index: number): any {
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
  public relativeCharPosition(charIndex: number, lineIndex: number, width: number): any {
    const lineStats = this.getRowIndex(lineIndex)
    const charIndexDifference = (lineIndex - lineStats.startIndex) * width + charIndex
    return charIndexDifference
  }
  public push(value: T): void { // TODO: fix this
    const lineIndex = this._rowIndices.length
      ? this._rowIndices.get(this._rowIndices.length - 1).lineIndex + 1
      : 0
    const startIndex = this._rowIndices.length
      ? this._rowIndices.get(this._rowIndices.length - 1).endIndex + 1
      : 0
    const endIndex = startIndex
    this._rowIndices.push(new RowIndex(lineIndex, startIndex, endIndex))
  }
  public changeLineLength (lines: any, length: number) {
    for (let i = 0; i < this._rowIndices.length; i++) {
      if (!lines.get(i)) continue
      const line = lines.get(i)
      const lineWithoutTrailingSpaces = line
        .map(c => c[1])
        .join('')
        .replace(/\s\s+$/, ' ') // TODO: don't create so many arrays
        // .replace(/\s*$/, '') // TODO: don't create so many arrays
      const currentLength = lineWithoutTrailingSpaces.length
      if (length < currentLength) {
        const newRowCount = Math.ceil(currentLength / length)
        const startIndex = this._rowIndices.get(i).startIndex
        this._rowIndices.get(i).endIndex = startIndex + newRowCount - 1
      } else if (length > currentLength) {
        const startIndex = this._rowIndices.get(i).startIndex
        this._rowIndices.get(i).endIndex = startIndex
      }
      if (this._rowIndices.get(i + 1) && this._rowIndices.get(i + 1).startIndex > 0) { // next row does not circle back
        this._rowIndices.get(i + 1).startIndex = this._rowIndices.get(i).endIndex + 1
      }
    }
  }
  public get rowCount(): number {
    let count = 0
    for (let i = 0; i < this._rowIndices.length; i++) {
      const lineStats = this._rowIndices.get(i)
      const numRows = lineStats.endIndex - lineStats.startIndex + 1
      count += numRows
    }
    return count
  }
  public lineIndex: number // the index of this.lines
  public startIndex: number // The start index in this.lines[lineIndex]
  public endIndex: number // The end index in this.lines[lineIndex]
}
