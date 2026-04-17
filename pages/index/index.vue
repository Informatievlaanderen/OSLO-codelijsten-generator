<template>
  <vl-page>
    <content-header title="OSLO" subtitle="Codelijsten Generator" />
    <vl-main>
      <vl-region>
        <vl-layout>
          <vl-grid mod-v-center mod-center mod-stacked>
            <vl-column>
              <vl-typography>
                <h1>OSLO Codelijsten Generator</h1>
                <p>
                  Upload een Excel-bestand (.xlsx). Elk tabblad wordt omgezet
                  naar een SKOS Turtle-bestand (.ttl) en gebundeld in één zip.
                  Download het
                  <a href="/api/template" download="codelijst-sjabloon.xlsx"
                    >Excel-sjabloon</a
                  >
                  om te starten.
                </p>
              </vl-typography>
            </vl-column>

            <template v-if="state === 'idle'">
              <vl-column>
                <vl-upload
                  id="codelist-upload"
                  upload-label="Excel-bestand toevoegen"
                  upload-drag-text="Klik of sleep een Excel-bestand (.xlsx) naar hier om het toe te voegen."
                  allowed-file-types=".xlsx,.xls"
                  :max-files="1"
                  :auto-process="false"
                  limit-to-max-files
                  limit-to-allowed-file-types
                  @upload-file-added="onFileAdded"
                  @upload-removed-file="onFileRemoved"
                  url="/api/convert"
                />
              </vl-column>
              <vl-column>
                <vl-button
                  icon="synchronize"
                  :disabled="!selectedFile"
                  @click="generate"
                >
                  Genereer .ttl bestanden
                </vl-button>
              </vl-column>
            </template>

            <template v-else-if="state === 'loading'">
              <vl-column>
                <vl-loader message="Bezig met converteren..." />
              </vl-column>
            </template>

            <template v-else-if="state === 'success'">
              <vl-column>
                <vl-alert icon="check" title="Conversie voltooid!" mod-success>
                  Het zip-bestand is gedownload.
                </vl-alert>
              </vl-column>
              <vl-column v-if="warnings.length">
                <vl-alert
                  icon="alert-triangle"
                  title="Waarschuwingen"
                  mod-warning
                >
                  <span
                    >Sommige tabbladen konden niet worden geconverteerd:</span
                  >
                  <ul>
                    <li v-for="(w, i) in warnings" :key="i">
                      <strong>{{ w.sheet }}</strong
                      >: {{ w.error }}
                    </li>
                  </ul>
                </vl-alert>
              </vl-column>
              <vl-column>
                <vl-button icon="arrow-right-fat" @click="reset">
                  Opnieuw beginnen
                </vl-button>
              </vl-column>
            </template>

            <template v-else-if="state === 'error'">
              <vl-column>
                <vl-alert icon="alert-triangle" title="Fout" mod-error>
                  {{ errorMessage }}
                  <ul v-if="errorDetails.length">
                    <li v-for="(e, i) in errorDetails" :key="i">
                      <strong>{{ e.sheet }}</strong>: {{ e.error }}
                    </li>
                  </ul>
                </vl-alert>
              </vl-column>
              <vl-column>
                <vl-button icon="arrow-right-fat" @click="reset">
                  Opnieuw proberen
                </vl-button>
              </vl-column>
            </template>
          </vl-grid>
        </vl-layout>
      </vl-region>
    </vl-main>
    <content-footer />
  </vl-page>
</template>

<script setup lang="ts">
type State = 'idle' | 'loading' | 'success' | 'error'

const state = ref<State>('idle')
const selectedFile = ref<File | null>(null)
const errorMessage = ref('')
const errorDetails = ref<{ sheet: string; error: string }[]>([])
const warnings = ref<{ sheet: string; error: string }[]>([])

function onFileAdded(file: File) {
  selectedFile.value = file
}

function onFileRemoved() {
  selectedFile.value = null
}

async function generate() {
  if (!selectedFile.value) return

  state.value = 'loading'
  errorMessage.value = ''
  errorDetails.value = []
  warnings.value = []

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const text = await response.text()
      try {
        const json = JSON.parse(text)
        if (json.data?.errors) errorDetails.value = json.data.errors
        throw new Error(json.statusMessage || json.message || response.statusText)
      } catch (e) {
        if (e instanceof SyntaxError) throw new Error(text || response.statusText)
        throw e
      }
    }

    const warningHeader = response.headers.get('X-Conversion-Warnings')
    if (warningHeader) {
      try {
        warnings.value = JSON.parse(warningHeader)
      } catch {
        /* ignore parse error */
      }
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'codelists.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    state.value = 'success'
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Er ging iets mis bij het converteren'
    state.value = 'error'
  }
}

function reset() {
  state.value = 'idle'
  selectedFile.value = null
  errorMessage.value = ''
  errorDetails.value = []
  warnings.value = []
}
</script>
