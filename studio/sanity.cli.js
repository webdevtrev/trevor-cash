import {defineCliConfig} from 'sanity/cli'

// Keep in sync with /photos/config.js (the public site's copy of these values).
export default defineCliConfig({
  api: {
    projectId: 'cmwk642f',
    dataset: 'production',
  },
  studioHost: 'trevor-cash',
})
