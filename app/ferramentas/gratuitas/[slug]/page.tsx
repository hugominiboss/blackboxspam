import { notFound } from 'next/navigation'
import ToolRunner from '../_components/tool-runner'
import { getFerramentaMeta, getSlugsFerramentasGratuitas } from '../_lib/tools'

/** Pré-renderiza uma página estática por ferramenta em `next build`. */
export function generateStaticParams() {
  return getSlugsFerramentasGratuitas().map((slug) => ({ slug }))
}

/** Uma página por ferramenta gratuita: `/ferramentas/gratuitas/[slug]`. */
export default async function FerramentaGratuitaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ferramenta = getFerramentaMeta(slug)
  if (!ferramenta) notFound()

  return <ToolRunner ferramenta={ferramenta} />
}
