export const makeResponse = () => ({
  statusCode: 200,
  body: null as any,
  status(code: number) {
    this.statusCode = code
    return this
  },
  json(payload: any) {
    this.body = payload
    return this
  },
  ok(payload: any) {
    return this.status(200).json(payload)
  },
  unprocessableEntity(payload: any) {
    return this.status(422).json(payload)
  },
  internalServerError(payload: any) {
    return this.status(500).json(payload)
  },
})
