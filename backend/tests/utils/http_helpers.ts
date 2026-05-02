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
    this.statusCode = 200
    this.body = payload
    return this
  },
  notFound(payload: any) {
    this.statusCode = 404
    this.body = payload
    return this
  },
  forbidden(payload: any) {
    this.statusCode = 403
    this.body = payload
    return this
  },
  internalServerError(payload: any) {
    this.statusCode = 500
    this.body = payload
    return this
  },
})
