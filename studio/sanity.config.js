import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {UploadIcon} from '@sanity/icons/Upload'
import {structure} from './src/structure'
import {BulkUpload} from './src/BulkUpload'

export default defineConfig({
  name: 'default',
  title: 'Trevor Cash',
  projectId: 'cmwk642f',
  dataset: 'production',
  plugins: [structureTool({structure}), visionTool()],
  schema: {types: schemaTypes},
  tools: [{name: 'bulk-upload', title: 'Bulk upload', icon: UploadIcon, component: BulkUpload}],
})
