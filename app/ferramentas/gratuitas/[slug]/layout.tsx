import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getFerramentaMeta } from '../_lib/tools'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const ferramenta = getFerramentaMeta(slug)
  if (!ferramenta) {
    return { title: 'Ferramenta não encontrada — BlackBox Vault' }
  }
  return {
    title: `${ferramenta.nome} — Ferramentas Gratuitas | BlackBox Vault`,
    description: ferramenta.desc,
  }
}

export default function FerramentaGratuitaLayout({ children }: { children: ReactNode }) {
  return children
}
