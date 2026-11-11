export const REMEDIATION: Record<string, { title: string; howToFix: string }> = {
  BROKEN_LINK: {
    title: "Link Quebrado",
    howToFix:
      "Atualize ou remova o link quebrado. Se a página de destino foi movida, substitua a URL pelo novo destino. Configure redirecionamentos 301 para páginas descontinuadas.",
  },
  MANAGED_INFRA: {
    title: "Endpoint de Infraestrutura Gerenciada",
    howToFix:
      "Esta URL pertence a um provedor de hospedagem ou CDN (ex: Cloudflare /cdn-cgi/). É gerenciada automaticamente e pode retornar status diferente de 200 ao ser acessada diretamente. Nenhuma ação é necessária.",
  },
  REDIRECT: {
    title: "Redirecionamento Detectado",
    howToFix:
      "Atualize os links internos para apontarem diretamente para a URL final em vez da URL que redireciona. Elimine cadeias de redirecionamento garantindo que cada redirecionamento ocorra em um único salto.",
  },
  MISSING_TITLE: {
    title: "Tag de Título Ausente",
    howToFix:
      "Adicione uma tag <title> exclusiva entre 15 e 65 caracteres que descreva com precisão o conteúdo da página e inclua a palavra-chave principal.",
  },
  MISSING_DESCRIPTION: {
    title: "Meta Descrição Ausente",
    howToFix:
      "Adicione uma tag <meta name=\"description\"> entre 50 e 160 caracteres que resuma a página e atraia cliques nos resultados de busca.",
  },
  DUPLICATE_TITLE: {
    title: "Tag de Título Duplicada",
    howToFix:
      "Escreva um título exclusivo para cada página. Se as páginas tiverem conteúdo similar, consolide-as com uma tag canonical ou una o conteúdo em uma única página principal.",
  },
  DUPLICATE_DESCRIPTION: {
    title: "Meta Descrição Duplicada",
    howToFix:
      "Escreva uma meta descrição exclusiva para cada página. Evite usar modelos automáticos que gerem descrições idênticas em várias páginas.",
  },
  MISSING_H1: {
    title: "Cabeçalho H1 Ausente",
    howToFix:
      "Adicione um único cabeçalho H1 que descreva claramente o tema principal da página. Posicione-o acima do conteúdo principal e inclua palavras-chave relevantes de forma natural.",
  },
  MULTIPLE_H1: {
    title: "Múltiplos Cabeçalhos H1",
    howToFix:
      "Mantenha apenas um cabeçalho H1 por página. Converta as tags H1 adicionais em H2 ou H3 para estabelecer uma hierarquia clara de títulos.",
  },
  MISSING_ALT: {
    title: "Imagens sem Texto Alternativo (Alt)",
    howToFix:
      "Adicione atributos alt descritivos a todas as tags <img>. Use um texto conciso que descreva o conteúdo da imagem. Para imagens decorativas, use alt=\"\".",
  },
  MISSING_CANONICAL: {
    title: "Tag Canonical Ausente",
    howToFix:
      "Adicione uma tag <link rel=\"canonical\" href=\"...\"> no <head> apontando para a URL preferencial desta página. Isso evita problemas de conteúdo duplicado.",
  },
  MISSING_ROBOTS: {
    title: "robots.txt Ausente",
    howToFix:
      "Crie um arquivo robots.txt na raiz do site. No mínimo, especifique as diretivas User-agent e Sitemap. Use regras Disallow para bloquear robôs em páginas administrativas ou duplicadas.",
  },
  MISSING_SITEMAP: {
    title: "Sitemap Ausente ou Incompleto",
    howToFix:
      "Crie um sitemap XML listando todas as páginas indexáveis e envie-o no Google Search Console. Certifique-se de que todas as páginas importantes estejam incluídas.",
  },
  SITEMAP_BLOCKED: {
    title: "Sitemap Bloqueado pelo robots.txt",
    howToFix:
      "Permita a URL do sitemap no robots.txt: remova ou restrinja a regra Disallow que a bloqueia. Se o próprio robots.txt não puder ser lido (429, 5xx, timeout), corrija isso primeiro e reenvie no Search Console.",
  },
  MISSING_SCHEMA: {
    title: "Sem Dados Estruturados",
    howToFix:
      "Adicione dados estruturados JSON-LD relevantes ao tipo de página (Artigo, Produto, FAQPage, etc.). Valide no teste de resultados avançados do Google antes de publicar.",
  },
  SLOW_PAGE: {
    title: "Resposta Lenta da Página",
    howToFix:
      "Reduza o tempo de resposta do servidor ativando cache, otimizando consultas ao banco de dados e usando um CDN. Busque tempo de resposta abaixo de 200ms e carregamento total abaixo de 3 segundos.",
  },
  MIXED_CONTENT: {
    title: "Conteúdo Misto (HTTP em HTTPS)",
    howToFix:
      "Atualize todos os recursos (imagens, scripts, folhas de estilo) para usar HTTPS. Imponha HTTPS por meio de cabeçalhos Content-Security-Policy.",
  },
  LARGE_PAGE: {
    title: "Página com Tamanho Excessivo",
    howToFix:
      "Reduza o tamanho do HTML removendo CSS/JS inline, adiando recursos não críticos, aplicando lazy-loading em imagens e minificando o HTML. Busque manter abaixo de 3 MB por página.",
  },
};
