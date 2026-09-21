import { useParams } from 'react-router-dom'
import ImportedSnapshotPage from './ImportedSnapshotPage'

function toPascalCase(value = '') {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

export default function ImportedAnyPage() {
  const { slug = '' } = useParams()
  const componentName = `Imported${toPascalCase(slug) || 'Page'}Page`
  const editorFile = `src/pages/imported/generated/${componentName}.jsx`

  return <ImportedSnapshotPage slug={slug} editorFile={editorFile} />
}
