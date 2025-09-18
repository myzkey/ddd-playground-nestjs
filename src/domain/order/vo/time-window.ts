export class TimeWindow {
  private readonly _startAt: Date | null
  private readonly _endAt: Date | null

  constructor(startAt: Date | null, endAt: Date | null) {
    if (startAt && endAt && startAt > endAt) {
      throw new Error('開始時間は終了時間より前である必要があります')
    }
    this._startAt = startAt
    this._endAt = endAt
  }

  get startAt(): Date | null {
    return this._startAt
  }

  get endAt(): Date | null {
    return this._endAt
  }

  isWithinWindow(time: Date): boolean {
    if (!this._startAt || !this._endAt) {
      return true
    }
    return time >= this._startAt && time <= this._endAt
  }
}
