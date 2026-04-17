import { setResponseHeader } from 'h3'
import { readFile } from 'fs/promises'
import { resolve } from 'path'

const TEMPLATE_PATH = resolve(process.cwd(), 'codelijst-template.xlsx')

export default defineEventHandler(async (event) => {
  const buffer = await readFile(TEMPLATE_PATH)

  setResponseHeader(
    event,
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  setResponseHeader(
    event,
    'Content-Disposition',
    'attachment; filename="codelijst-sjabloon.xlsx"',
  )

  return buffer
})
