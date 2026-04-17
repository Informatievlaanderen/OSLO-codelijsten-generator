import { readMultipartFormData, createError, setResponseHeader } from 'h3'
import { promisify } from 'util'
import { execFile } from 'child_process'
import { writeFile, readFile, mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

const execFileAsync = promisify(execFile)
const CLI_BIN = resolve(process.cwd(), 'node_modules/.bin/oslo-codelist-generator')

async function runCli(inputPath: string, outputPath: string): Promise<void> {
  const { stdout, stderr } = await execFileAsync(
    CLI_BIN,
    ['--input', inputPath, '--output', outputPath, '--language', 'nl', '--silent'],
    { timeout: 30_000 },
  )
  if (stdout) console.log(`[oslo-cli stdout] ${inputPath}:\n${stdout}`)
  if (stderr) console.error(`[oslo-cli stderr] ${inputPath}:\n${stderr}`)
}

function parseWorkbook(data: Buffer): XLSX.WorkBook {
  const workbook = XLSX.read(data, { type: 'buffer' })
  if (!workbook.SheetNames.length) throw new Error('Het werkboek bevat geen tabbladen')
  return workbook
}

function sheetToCsv(workbook: XLSX.WorkBook, name: string): string {
  const raw = XLSX.utils.sheet_to_csv(workbook.Sheets[name])
  // If each row is a single quoted field (data pasted into one column),
  // unwrap so the CSV parser sees proper columns.
  const lines = raw.split('\n')
  if (lines[0]?.startsWith('"') && lines[0]?.endsWith('"')) {
    return lines.map((l) => l.replace(/^"|"$/g, '')).join('\n')
  }
  return raw
}

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const file = formData?.find((part) => part.name === 'file')
  if (!file?.data) {
    throw createError({ statusCode: 400, statusMessage: 'Geen bestand geüpload' })
  }

  let workbook: XLSX.WorkBook
  try {
    workbook = parseWorkbook(file.data)
  } catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: err.message })
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'oslo-codelist-'))

  try {
    const zip = new JSZip()
    const errors: { sheet: string; error: string }[] = []

    for (const sheetName of workbook.SheetNames) {
      const csv = sheetToCsv(workbook, sheetName)
      if (!csv.trim()) {
        errors.push({ sheet: sheetName, error: 'Tabblad is leeg' })
        continue
      }

      const safeName = sheetName.replace(/[^a-zA-Z0-9_-]/g, '_')
      const csvPath = join(tmpDir, `${safeName}.csv`)
      const ttlPath = join(tmpDir, `${safeName}.ttl`)

      await writeFile(csvPath, csv, 'utf-8')

      try {
        await runCli(csvPath, ttlPath)
        const ttlContent = await readFile(ttlPath, 'utf-8')
        if (!ttlContent.trim()) {
          errors.push({ sheet: sheetName, error: 'Conversie leverde geen resultaat op' })
        } else {
          zip.file(`${safeName}.ttl`, ttlContent)
        }
      } catch (err: any) {
        errors.push({ sheet: sheetName, error: err.message })
      }
    }

    if (!Object.keys(zip.files).length) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Geen enkel tabblad kon worden geconverteerd.',
        data: { errors },
      })
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    setResponseHeader(event, 'Content-Type', 'application/zip')
    setResponseHeader(event, 'Content-Disposition', 'attachment; filename="codelists.zip"')

    if (errors.length) {
      setResponseHeader(event, 'X-Conversion-Warnings', JSON.stringify(errors))
    }

    return zipBuffer
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
