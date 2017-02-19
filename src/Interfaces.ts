/**
 * @license MIT
 */

export interface IBrowser {
  isNode: boolean;
  userAgent: string;
  platform: string;
  isFirefox: boolean;
  isMSIE: boolean;
  isMac: boolean;
  isIpad: boolean;
  isIphone: boolean;
  isMSWindows: boolean;
}

export interface ITerminal {
  element: HTMLElement;
  rowContainer: HTMLElement;
  textarea: HTMLTextAreaElement;
  ybase: number;
  ydisp: number;
  lines: ICircularList<string>;
  lineWrap: any; // TODO: fix this
  rows: number;
  cols: number;
  browser: IBrowser;
  writeBuffer: string[];
  children: HTMLElement[];
  cursorHidden: boolean;
  cursorState: number;
  x: number;
  y: number;
  defAttr: number;

  /**
   * Emit the 'data' event and populate the given data.
   * @param data The data to populate in the event.
   */
  handler(data: string);
  on(event: string, callback: () => void);
  scrollDisp(disp: number, suppressScrollEvent: boolean);
  cancel(ev: Event, force?: boolean);
  log(text: string): void;
  emit(event: string, data: any);
}

interface ICircularList<T> {
  length: number;
  maxLength: number;

  forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
  get(index: number): T;
  set(index: number, value: T): void;
  push(value: T): void;
  pop(): T;
  splice(start: number, deleteCount: number, ...items: T[]): void;
  trimStart(count: number): void;
  shiftElements(start: number, count: number, offset: number): void;
}

/**
 * Handles actions generated by the parser.
 */
export interface IInputHandler {
  addChar(char: string, code: number): void;

  /** C0 BEL */ bell(): void;
  /** C0 LF */ lineFeed(): void;
  /** C0 CR */ carriageReturn(): void;
  /** C0 BS */ backspace(): void;
  /** C0 HT */ tab(): void;
  /** C0 SO */ shiftOut(): void;
  /** C0 SI */ shiftIn(): void;

  /** CSI @ */ insertChars(params?: number[]): void;
  /** CSI A */ cursorUp(params?: number[]): void;
  /** CSI B */ cursorDown(params?: number[]): void;
  /** CSI C */ cursorForward(params?: number[]): void;
  /** CSI D */ cursorBackward(params?: number[]): void;
  /** CSI E */ cursorNextLine(params?: number[]): void;
  /** CSI F */ cursorPrecedingLine(params?: number[]): void;
  /** CSI G */ cursorCharAbsolute(params?: number[]): void;
  /** CSI H */ cursorPosition(params?: number[]): void;
  /** CSI I */ cursorForwardTab(params?: number[]): void;
  /** CSI J */ eraseInDisplay(params?: number[]): void;
  /** CSI K */ eraseInLine(params?: number[]): void;
  /** CSI L */ insertLines(params?: number[]): void;
  /** CSI M */ deleteLines(params?: number[]): void;
  /** CSI P */ deleteChars(params?: number[]): void;
  /** CSI S */ scrollUp(params?: number[]): void;
  /** CSI T */ scrollDown(params?: number[]): void;
  /** CSI X */ eraseChars(params?: number[]): void;
  /** CSI Z */ cursorBackwardTab(params?: number[]): void;
  /** CSI ` */ charPosAbsolute(params?: number[]): void;
  /** CSI a */ HPositionRelative(params?: number[]): void;
  /** CSI b */ repeatPrecedingCharacter(params?: number[]): void;
  /** CSI c */ sendDeviceAttributes(params?: number[]): void;
  /** CSI d */ linePosAbsolute(params?: number[]): void;
  /** CSI e */ VPositionRelative(params?: number[]): void;
  /** CSI f */ HVPosition(params?: number[]): void;
  /** CSI g */ tabClear(params?: number[]): void;
  /** CSI h */ setMode(params?: number[]): void;
  /** CSI l */ resetMode(params?: number[]): void;
  /** CSI m */ charAttributes(params?: number[]): void;
  /** CSI n */ deviceStatus(params?: number[]): void;
  /** CSI p */ softReset(params?: number[]): void;
  /** CSI q */ setCursorStyle(params?: number[]): void;
  /** CSI r */ setScrollRegion(params?: number[]): void;
  /** CSI s */ saveCursor(params?: number[]): void;
  /** CSI u */ restoreCursor(params?: number[]): void;
}
